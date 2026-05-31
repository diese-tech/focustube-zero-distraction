# FocusTube Zero-Distraction Engine

Engineering challenge submission for FocusTube.

This repository is a 72-hour prototype for the FocusTube engineering sprint. The goal is to prove the core enforcement loop: controlled video playback, browser-level focus monitoring, lightweight telemetry, backend session management, and custom rate limiting.

## Live Demo

TBD

## Challenge Objective

Build a prototype application that loads a video, sanitizes the user interface, and enforces strict focus monitoring using low-level browser APIs and custom backend telemetry.

## Requirements Coverage

| Requirement | Planned Implementation | Status |
|---|---|---|
| Next.js frontend | App Router + TypeScript | Planned |
| Secure video player interface | Controlled HTML video interface, no unmonitored iframe embed | Planned |
| Page Visibility API | Pause when document is hidden or window is minimized | Planned |
| Intersection Observer API | Pause when video visibility falls below 90% of viewport | Planned |
| Backend | Node.js API for sessions and telemetry | Planned |
| Video metadata sessions | Session wrapper API for video metadata and lifecycle | Planned |
| Custom token bucket limiter | In-memory implementation without third-party rate limit middleware | Planned |
| Burst traffic handling | Token refill strategy with per-key buckets | Planned |
| Frontend telemetry | Engagement and distraction events queued client-side | Planned |
| 5-second telemetry batching | Batch dispatch interval with unload/visibility flush | Planned |
| sendBeacon / compressed JSON | Use sendBeacon where appropriate with fetch fallback | Planned |
| Public GitHub repository | This repository | Done |
| Clean commit history | Small, descriptive commits by feature area | In progress |
| Production-grade README | This document plus supporting docs | In progress |
| Live deployment | Vercel/Railway/Render target | Planned |

## Architecture Summary

```txt
Browser
  -> Secure Video Player
  -> Focus Enforcement Layer
  -> Telemetry Queue
  -> Backend Session API
  -> Custom Token Bucket Rate Limiter
```

The frontend owns immediate playback enforcement. The backend owns session metadata, telemetry ingestion, and request protection.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full architecture plan.

## Current Scope

Included:

- Controlled video player prototype
- Page Visibility API enforcement
- Intersection Observer enforcement at 90% visibility threshold
- Session metadata wrapper API
- Custom in-memory token bucket rate limiter
- Batched frontend telemetry
- Live deployment
- Challenge-focused documentation

Explicitly excluded:

- User accounts
- Authentication
- Database persistence
- Analytics dashboard
- Payments or subscriptions
- Recommendation system
- Full DRM implementation
- Browser extension behavior
- Multi-video content library

These exclusions are intentional. The challenge is testing the zero-distraction engine, not a complete SaaS platform.

## Planned API Shape

```txt
POST /api/sessions
GET  /api/sessions/:sessionId
POST /api/telemetry
GET  /api/health
```

Session payload shape:

```ts
type VideoSession = {
  sessionId: string;
  videoId: string;
  title: string;
  sourceUrl: string;
  createdAt: string;
  expiresAt: string;
};
```

Telemetry event shape:

```ts
type TelemetryEvent = {
  sessionId: string;
  eventType: 'play' | 'pause' | 'focus_lost' | 'focus_restored' | 'visibility_below_threshold' | 'visibility_restored' | 'heartbeat';
  occurredAt: string;
  metadata?: Record<string, unknown>;
};
```

## Local Development

Implementation commands will be finalized after the app scaffold is created.

Expected direction:

```bash
npm install
npm run dev
```

## Deployment

Deployment target is TBD during implementation.

Preferred path:

- Frontend: Vercel
- Backend: Railway or Render

If a single deploy target is chosen, this README will document the final deployment topology.

## Documentation

- [MVP.md](./MVP.md) — challenge scope and acceptance criteria
- [TASKS.md](./TASKS.md) — 72-hour execution tracker
- [DECISIONS.md](./DECISIONS.md) — architecture and product tradeoffs
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — system design
- [docs/QA_AND_OPERATIONS.md](./docs/QA_AND_OPERATIONS.md) — validation checklist and known limitations

## Tradeoff Philosophy

This prototype prioritizes the core FocusTube enforcement loop over broad SaaS surface area. Persistence, auth, dashboards, and advanced content management are intentionally deferred to keep the challenge focused, reviewable, and shippable within 72 hours.

## Operating Principle

Move fast, but move surgically. Build the smallest production-minded system that satisfies the challenge while remaining understandable, testable, and safe to extend.