# FocusTube Zero-Distraction Engine

## Project Summary

FocusTube Zero-Distraction Engine is a planned 72-hour challenge submission focused on enforcing distraction-free video engagement. The core experience is a secure video player that pauses immediately when the user tabs away, minimizes the window, or scrolls the video below 90% viewport visibility.

The challenge version is intentionally narrow: prove the focus guard, session wrapper, telemetry batching, and custom token bucket rate limiter without adding unrelated product surface area.

## Links

| Item | Link |
| --- | --- |
| Live demo | TBD |
| GitHub repo | `https://github.com/diese-tech/focustube-zero-distraction` |

## Requirements Mapping

| Requirement | Planned approach |
| --- | --- |
| Next.js frontend | Use a TypeScript Next.js app for the video experience. |
| Secure video player interface | Build a focused player component with session-backed metadata. |
| Page Visibility API | Pause playback when the document becomes hidden. |
| Intersection Observer API | Pause playback when video visibility drops below 90%. |
| Backend API | Use a Node.js service for sessions and telemetry ingestion. |
| Metadata session wrapper | Create sessions through a backend wrapper endpoint. |
| Custom token bucket limiter | Implement in-memory token bucket logic without third-party rate limiting middleware. |
| Telemetry events | Capture engagement and distraction events from the frontend. |
| 5-second telemetry batching | Queue events and send batches roughly every 5 seconds. |
| sendBeacon or compressed payloads | Use `navigator.sendBeacon` for unload flushes, with `fetch` fallback. |

## Architecture Highlights

- Clear frontend/backend separation.
- Backend-managed session wrapper for video metadata.
- Immediate focus enforcement using browser-native APIs.
- Batched telemetry to reduce request noise.
- Custom token bucket limiter that supports bursts while controlling sustained traffic.
- Scope kept small so reviewers can inspect the important pieces quickly.

## Tradeoffs

- Node.js is chosen over Go to keep the stack TypeScript-first and fast to ship.
- In-memory limiter state is simple and reviewable, but not multi-instance safe.
- No database is included in the challenge version, so telemetry history is not persisted.
- `sendBeacon` improves unload delivery but remains best effort.

## Known Limitations

- No auth.
- No analytics dashboard.
- No database persistence.
- No DRM.
- No guaranteed telemetry delivery on page close.
- Multi-instance deployment would require shared session and limiter state.

## Future Work

- Persist sessions and telemetry to a database.
- Add an evaluator-facing analytics view.
- Add authenticated organization/team access.
- Add provider-specific video metadata integrations.
- Move rate limit state to Redis or equivalent shared storage.
- Add automated browser tests for focus enforcement.

## Suggested Review Path

1. `README.md`
2. `SUBMISSION.md`
3. `docs/ARCHITECTURE.md`
4. `DECISIONS.md`
5. `docs/QA_AND_OPERATIONS.md`
6. Source code once implemented
