# Architecture

This document describes the planned implementation structure for the FocusTube Zero-Distraction Engine. It is intentionally scoped to the challenge version and does not claim these files exist yet.

## System Overview

The app is planned as a Next.js frontend with a small Node.js backend. The frontend owns playback UI, focus enforcement, visibility tracking, and telemetry batching. The backend owns session creation, telemetry ingestion, and a custom in-memory token bucket rate limiter.

```text
User Browser
  |
  | Next.js UI
  v
Secure Video Player
  |-- Page Visibility API
  |-- Intersection Observer API
  |-- Telemetry Batcher
  |
  | session + telemetry HTTP requests
  v
Node.js Backend
  |-- Session Wrapper API
  |-- Telemetry Ingestion API
  |-- Token Bucket Rate Limiter
```

## Planned Implementation Structure

| Area | Planned paths | Responsibility |
| --- | --- | --- |
| Frontend page | `src/app/page.tsx` | Entry point for the challenge experience. |
| Video player | `src/components/SecureVideoPlayer.tsx` | Playback UI and focus-state display. |
| Focus guard | `src/hooks/useFocusGuard.ts` | Page visibility and viewport visibility enforcement. |
| Telemetry batcher | `src/hooks/useTelemetryBatcher.ts` | Queue, batch, flush, and fallback behavior. |
| Telemetry client | `src/lib/telemetry.ts` | API calls and payload formatting. |
| Backend entry | `apps/api/src/index.ts` | HTTP server setup and route registration. |
| Sessions route | `apps/api/src/index.ts` | Create metadata-backed video sessions. |
| Telemetry route | `server/src/routes/telemetry.ts` | Receive engagement and distraction events. |
| Token bucket | `apps/api/src/rate-limit/TokenBucket.ts` | Custom rate limiter state and refill logic. |
| Rate middleware | `apps/api/src/middleware/rateLimit.ts` | Apply token bucket limits to API routes. |
| Shared types | `src/types/telemetry.ts` or `shared/types.ts` | Typed telemetry contracts shared across boundaries. |

## Frontend Responsibilities

- Render the secure video player interface.
- Start a backend-managed video session before playback.
- Pause video immediately when the document becomes hidden.
- Pause video when the browser window is minimized or otherwise loses visible page state.
- Pause video when the video element drops below 90% viewport visibility.
- Queue engagement and distraction telemetry events.
- Send telemetry batches about every 5 seconds.
- Attempt final telemetry flush with `navigator.sendBeacon` on refresh or close, with `fetch` fallback where appropriate.

## Backend Responsibilities

- Expose a session wrapper API for creating video metadata sessions.
- Normalize session response shape for frontend use.
- Expose telemetry ingestion endpoint.
- Validate event payload shape before accepting telemetry.
- Apply a custom in-memory token bucket rate limiter.
- Return clear status codes for accepted, rejected, and malformed requests.

## Session Lifecycle

1. User opens the challenge app.
2. Frontend requests a video session from the backend.
3. Backend creates an in-memory session object and returns safe metadata.
4. Frontend renders the video player using the session response.
5. Focus enforcement begins before or at playback start.
6. Telemetry events reference the active `sessionId`.
7. Session ends when the user stops playback, leaves the page, or the demo flow completes.

## Focus Enforcement Flow

```text
Playback starts
  |
  +-- document.visibilityState changes to hidden -> pause video -> queue distraction event
  |
  +-- window/page loses visible state -> pause video -> queue distraction event
  |
  +-- IntersectionObserver reports video < 90% visible -> pause video -> queue distraction event
  |
  +-- visibility restored and video >= 90% visible -> UI reports focus restored
```

The focus guard should favor immediate pause behavior over complex recovery logic. Resuming playback should be explicit or clearly indicated by the UI.

## Telemetry Flow

```text
Frontend event occurs
  |
  v
Queue event locally
  |
  | every ~5 seconds
  v
POST compressed JSON batch or regular JSON batch
  |
  v
Backend validates and accepts telemetry
```

On refresh or close, the frontend should attempt to flush pending events using `navigator.sendBeacon`. If `sendBeacon` is unavailable or inappropriate for the payload, normal `fetch` remains the fallback for active-page flushes.

## Rate Limiter Flow

```text
Incoming request
  |
  v
Resolve bucket key
  |
  v
Refill tokens based on elapsed time
  |
  +-- token available -> consume token -> continue
  |
  +-- no token available -> return 429
```

The token bucket should allow short bursts while still limiting sustained high-volume telemetry or session traffic.

Current implementation protects `POST /api/sessions` with a burst capacity of 5 and a refill rate of 1 token per second. `GET /api/health` and `GET /api/sessions/:sessionId` are intentionally unlimited for now.

## Data Contracts

### Session Request

```json
{
  "videoId": "demo-video-1"
}
```

### Session Response

```json
{
  "sessionId": "session_123",
  "videoId": "demo-video-1",
  "title": "FocusTube Demo Video",
  "createdAt": "2026-05-31T00:00:00.000Z"
}
```

### Telemetry Event

```json
{
  "sessionId": "session_123",
  "type": "visibility_hidden",
  "timestamp": "2026-05-31T00:00:05.000Z",
  "metadata": {
    "visibilityRatio": 0.82
  }
}
```

### Telemetry Batch

```json
{
  "sessionId": "session_123",
  "events": [
    {
      "type": "playback_started",
      "timestamp": "2026-05-31T00:00:00.000Z"
    }
  ]
}
```

## Failure Modes

| Failure | Planned behavior |
| --- | --- |
| Session API unavailable | Show an error state and do not start playback. |
| Telemetry request fails | Keep the current batch in memory for a later retry while the page is open. |
| Final unload telemetry fails | Do not block navigation; treat as best-effort delivery. |
| Rate limit exceeded | Return `429 Too Many Requests` with a small JSON error body. |
| Browser lacks required APIs | Disable playback or show a clear unsupported-browser state. |
| Intersection Observer reports unstable values | Pause on confirmed below-threshold visibility rather than guessing user intent. |

## Scalability Considerations

- In-memory rate limiting is acceptable for a single deployed instance.
- Multi-instance deployments would need shared limiter state, likely Redis or a managed edge rate limiter.
- Telemetry should eventually be persisted asynchronously if analytics become a product requirement.
- Session state should move to durable storage if sessions must survive restarts or be reviewed later.
- Compression should be measured before adding complexity beyond small JSON batches.

## Known Limitations

- No authentication in the challenge version.
- No database-backed session or telemetry history.
- No analytics dashboard.
- No DRM or provider-specific secure streaming integration.
- In-memory limiter state resets on deploy or process restart.
- `sendBeacon` delivery is best effort, not guaranteed.
