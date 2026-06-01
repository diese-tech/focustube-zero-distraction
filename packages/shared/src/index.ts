export type HealthResponse = {
  status: "ok";
  service: "focustube-api";
  timestamp: string;
};

export type VideoSession = {
  sessionId: string;
  videoId: string;
  title: string;
  sourceUrl: string;
  createdAt: string;
  expiresAt: string;
};

export type CreateSessionRequest = {
  videoId: string;
};

export type SessionResponse = {
  session: VideoSession;
};

export type TelemetryEventType =
  | "play"
  | "pause"
  | "focus_lost"
  | "focus_restored"
  | "visibility_below_threshold"
  | "visibility_restored"
  | "heartbeat";

export type TelemetryEvent = {
  eventType: TelemetryEventType;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type TelemetryBatchRequest = {
  sessionId: string;
  events: TelemetryEvent[];
};

export type TelemetryAcceptedResponse = {
  accepted: true;
  acceptedCount: number;
};

export type ApiErrorResponse = {
  error: {
    code:
      | "INVALID_TELEMETRY"
      | "INVALID_VIDEO_ID"
      | "RATE_LIMITED"
      | "SESSION_NOT_FOUND";
    message: string;
  };
};
