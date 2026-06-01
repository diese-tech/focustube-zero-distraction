import express, { type ErrorRequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type {
  ApiErrorResponse,
  CreateSessionRequest,
  HealthResponse,
  SessionResponse,
  TelemetryAcceptedResponse,
  TelemetryBatchRequest,
  TelemetryEvent,
  TelemetryEventType,
  VideoSession
} from "@focustube/shared";
import { createTokenBucketRateLimiter } from "./middleware/rateLimit.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const sessionDurationMs = 30 * 60 * 1000;
const sessions = new Map<string, VideoSession>();
const sessionWriteRateLimit = createTokenBucketRateLimiter();
const telemetryWriteRateLimit = createTokenBucketRateLimiter();
const telemetryBatchMaxSize = 50;
const telemetryStoreMaxSize = 500;
const acceptedTelemetryEvents: StoredTelemetryEvent[] = [];

type StoredTelemetryEvent = TelemetryEvent & {
  sessionId: string;
  acceptedAt: string;
};

const demoVideos = {
  "demo-video-1": {
    title: "FocusTube Demo Video",
    sourceUrl: "/demo/focustube-demo.mp4"
  }
} as const;

app.use((request, response, next) => {
  if (request.headers.origin === "http://localhost:3000") {
    response.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Headers", "content-type");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  }

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

const jsonParseErrorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next
) => {
  if (error instanceof SyntaxError) {
    response.status(400).json(invalidVideoIdResponse());
    return;
  }

  next(error);
};

app.use(jsonParseErrorHandler);

function invalidVideoIdResponse(): ApiErrorResponse {
  return {
    error: {
      code: "INVALID_VIDEO_ID",
      message: "Unknown or invalid videoId."
    }
  };
}

function sessionNotFoundResponse(): ApiErrorResponse {
  return {
    error: {
      code: "SESSION_NOT_FOUND",
      message: "Session not found."
    }
  };
}

function invalidTelemetryResponse(): ApiErrorResponse {
  return {
    error: {
      code: "INVALID_TELEMETRY",
      message: "Invalid telemetry payload."
    }
  };
}

function isCreateSessionRequest(body: unknown): body is CreateSessionRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { videoId } = body as Partial<CreateSessionRequest>;
  return typeof videoId === "string" && videoId.trim().length > 0;
}

function isKnownVideoId(videoId: string): videoId is keyof typeof demoVideos {
  return videoId in demoVideos;
}

function isExpired(session: VideoSession, now = Date.now()) {
  return Date.parse(session.expiresAt) <= now;
}

const telemetryEventTypes = new Set<TelemetryEventType>([
  "play",
  "pause",
  "focus_lost",
  "focus_restored",
  "visibility_below_threshold",
  "visibility_restored",
  "heartbeat"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTelemetryEvent(value: unknown): value is TelemetryEvent {
  if (!isRecord(value)) {
    return false;
  }

  const eventType = value.eventType;
  const occurredAt = value.occurredAt;
  const metadata = value.metadata;

  if (typeof eventType !== "string" || !telemetryEventTypes.has(eventType as TelemetryEventType)) {
    return false;
  }

  if (typeof occurredAt !== "string" || Number.isNaN(Date.parse(occurredAt))) {
    return false;
  }

  return metadata === undefined || isRecord(metadata);
}

function isTelemetryBatchRequest(body: unknown): body is TelemetryBatchRequest {
  if (!isRecord(body)) {
    return false;
  }

  const { sessionId, events } = body;
  return (
    typeof sessionId === "string" &&
    sessionId.trim().length > 0 &&
    Array.isArray(events) &&
    events.length > 0 &&
    events.length <= telemetryBatchMaxSize &&
    events.every(isTelemetryEvent)
  );
}

function findActiveSession(sessionId: string) {
  const session = sessions.get(sessionId);

  if (!session) {
    return undefined;
  }

  if (isExpired(session)) {
    sessions.delete(session.sessionId);
    return undefined;
  }

  return session;
}

function storeTelemetryEvents(sessionId: string, events: TelemetryEvent[]) {
  const acceptedAt = new Date().toISOString();

  acceptedTelemetryEvents.push(
    ...events.map((event) => ({
      ...event,
      sessionId,
      acceptedAt
    }))
  );

  if (acceptedTelemetryEvents.length > telemetryStoreMaxSize) {
    acceptedTelemetryEvents.splice(
      0,
      acceptedTelemetryEvents.length - telemetryStoreMaxSize
    );
  }
}

app.get("/api/health", (_request, response) => {
  const body: HealthResponse = {
    status: "ok",
    service: "focustube-api",
    timestamp: new Date().toISOString()
  };

  response.json(body);
});

app.post("/api/telemetry", telemetryWriteRateLimit, (request, response) => {
  if (!isTelemetryBatchRequest(request.body)) {
    response.status(400).json(invalidTelemetryResponse());
    return;
  }

  const sessionId = request.body.sessionId.trim();
  const session = findActiveSession(sessionId);

  if (!session) {
    response.status(400).json(sessionNotFoundResponse());
    return;
  }

  storeTelemetryEvents(session.sessionId, request.body.events);

  const body: TelemetryAcceptedResponse = {
    accepted: true,
    acceptedCount: request.body.events.length
  };

  response.status(202).json(body);
});

app.post("/api/sessions", sessionWriteRateLimit, (request, response) => {
  if (!isCreateSessionRequest(request.body)) {
    response.status(400).json(invalidVideoIdResponse());
    return;
  }

  const videoId = request.body.videoId.trim();
  if (!isKnownVideoId(videoId)) {
    response.status(400).json(invalidVideoIdResponse());
    return;
  }

  const createdAtDate = new Date();
  const expiresAtDate = new Date(createdAtDate.getTime() + sessionDurationMs);
  const session: VideoSession = {
    sessionId: randomUUID(),
    videoId,
    title: demoVideos[videoId].title,
    sourceUrl: demoVideos[videoId].sourceUrl,
    createdAt: createdAtDate.toISOString(),
    expiresAt: expiresAtDate.toISOString()
  };

  sessions.set(session.sessionId, session);

  const body: SessionResponse = { session };
  response.status(201).json(body);
});

app.get("/api/sessions/:sessionId", (request, response) => {
  const session = sessions.get(request.params.sessionId);

  if (!session) {
    response.status(404).json(sessionNotFoundResponse());
    return;
  }

  if (isExpired(session)) {
    sessions.delete(session.sessionId);
    response.status(404).json(sessionNotFoundResponse());
    return;
  }

  const body: SessionResponse = { session };
  response.json(body);
});

app.listen(port, () => {
  console.log(`FocusTube API listening on http://localhost:${port}`);
});
