# Decision Log

This log captures the planned challenge-version architecture. These are implementation decisions, not claims that the code already exists.

## 1. Node.js Backend Instead of Go

| Field | Notes |
| --- | --- |
| Decision | Build the backend with Node.js and TypeScript. |
| Reasoning | The frontend is planned in Next.js and TypeScript, so using the same language reduces context switching and keeps delivery speed high during a 72-hour challenge. |
| Benefits | Shared types, faster iteration, simpler onboarding, easier local development. |
| Tradeoffs | Go would offer stronger concurrency primitives and simpler binary deployment. |
| Alternatives considered | Go HTTP service, Next.js API routes only. |
| Revisit conditions | Revisit if sustained traffic, CPU-bound processing, or long-lived backend ownership makes Go's operational model more valuable. |

## 2. In-Memory Token Bucket Rate Limiter

| Field | Notes |
| --- | --- |
| Decision | Implement a custom in-memory token bucket rate limiter. |
| Reasoning | The challenge explicitly asks for a token bucket limiter without third-party rate limiting middleware. In-memory state is enough for a single-instance demo. |
| Benefits | Meets challenge requirements, handles bursts smoothly, keeps the implementation inspectable. |
| Tradeoffs | State resets on deploy and does not coordinate across multiple instances. |
| Implementation note | Implemented for `POST /api/sessions` with per-key in-memory buckets, burst capacity 5, and 1 token per second refill. |
| Alternatives considered | Fixed window limiter, sliding window limiter, Redis-backed limiter, third-party middleware. |
| Revisit conditions | Revisit before multi-instance deployment or when rate limit state must survive restarts. |

## 3. No Database Persistence for Challenge Version

| Field | Notes |
| --- | --- |
| Decision | Do not add database persistence for the initial challenge submission. |
| Reasoning | The required product behavior is focused on focus enforcement, session wrapping, telemetry ingestion, and rate limiting. A database would add setup and review overhead before it is needed. |
| Benefits | Smaller scope, faster setup, fewer deployment variables, clearer evaluator review. |
| Tradeoffs | Session and telemetry history are transient unless later connected to storage. |
| Alternatives considered | SQLite, Postgres, managed hosted database. |
| Revisit conditions | Revisit when analytics history, user accounts, audit trails, or multi-session reporting become product requirements. |

## 4. Session Wrapper API

| Field | Notes |
| --- | --- |
| Decision | Use a backend session wrapper API instead of having the frontend handle video metadata directly. |
| Reasoning | The backend should own session creation, metadata normalization, and request controls so the frontend can focus on playback and focus enforcement. |
| Benefits | Cleaner separation of concerns, easier telemetry correlation, safer future integration with provider APIs. |
| Tradeoffs | Adds a backend round trip before playback can begin. |
| Alternatives considered | Direct metadata handling in the frontend, fully static video configuration. |
| Revisit conditions | Revisit if the product becomes fully static or if provider APIs require a different security boundary. |

## 5. Telemetry Batching Every 5 Seconds

| Field | Notes |
| --- | --- |
| Decision | Batch engagement and distraction telemetry roughly every 5 seconds. |
| Reasoning | Five seconds is frequent enough for useful focus analytics while avoiding one request per event. |
| Benefits | Lower network overhead, smoother backend load, simple mental model for review. |
| Tradeoffs | Events may arrive slightly delayed and can be lost if the browser closes before flush succeeds. |
| Alternatives considered | Send every event immediately, send only on session end, longer batch windows. |
| Revisit conditions | Revisit if analytics need near real-time reporting or if mobile/network constraints require less frequent sends. |

## 6. sendBeacon With Fetch Fallback

| Field | Notes |
| --- | --- |
| Decision | Use `navigator.sendBeacon` for unload/close telemetry flushes, with `fetch` as a fallback during normal operation or unsupported cases. |
| Reasoning | `sendBeacon` is designed for low-friction background delivery when a page is unloading. `fetch` remains useful for regular batch sends and clearer error handling. |
| Benefits | Better chance of final telemetry delivery, simple browser-native approach, no extra dependency. |
| Tradeoffs | `sendBeacon` has limited response handling and payload constraints. |
| Alternatives considered | Fetch only, WebSocket streaming, local storage retry queue. |
| Revisit conditions | Revisit if guaranteed delivery, offline support, or large telemetry payloads become required. |

## 7. Scope Exclusions

| Field | Notes |
| --- | --- |
| Decision | Exclude auth, dashboards, database persistence, and DRM from the challenge version. |
| Reasoning | These features are not required to prove the Zero-Distraction Engine and would dilute focus from the core evaluation criteria. |
| Benefits | Keeps the submission tight, reviewable, and aligned with the 72-hour constraint. |
| Tradeoffs | The demo is not a complete commercial product. |
| Alternatives considered | Basic auth, analytics dashboard, persisted sessions, provider-specific DRM integration. |
| Revisit conditions | Revisit after the core focus guard, telemetry, and rate limiter are implemented and validated. |
