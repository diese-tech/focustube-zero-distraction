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

export type ApiErrorResponse = {
  error: {
    code: "INVALID_VIDEO_ID" | "RATE_LIMITED" | "SESSION_NOT_FOUND";
    message: string;
  };
};
