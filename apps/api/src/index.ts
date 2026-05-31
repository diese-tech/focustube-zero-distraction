import express, { type ErrorRequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type {
  ApiErrorResponse,
  CreateSessionRequest,
  HealthResponse,
  SessionResponse,
  VideoSession
} from "@focustube/shared";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const sessionDurationMs = 30 * 60 * 1000;
const sessions = new Map<string, VideoSession>();

const demoVideos = {
  "demo-video-1": {
    title: "FocusTube Demo Video",
    sourceUrl: "/demo/focustube-demo.mp4"
  }
} as const;

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

app.get("/api/health", (_request, response) => {
  const body: HealthResponse = {
    status: "ok",
    service: "focustube-api",
    timestamp: new Date().toISOString()
  };

  response.json(body);
});

app.post("/api/sessions", (request, response) => {
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
