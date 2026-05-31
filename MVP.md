# MVP

## Product Goal

Build the smallest possible implementation of the FocusTube Zero-Distraction Engine that demonstrates browser-level focus enforcement, backend session management, telemetry batching, and custom rate limiting.

## Primary Workflow

1. User opens a video session.
2. Video begins playback.
3. Browser focus state is monitored continuously.
4. If focus is lost, playback pauses immediately.
5. Events are batched and transmitted every 5 seconds.
6. Backend ingests telemetry through a protected endpoint.

## Included Features

- Secure video player
- Page Visibility API integration
- Intersection Observer integration
- Session metadata API
- Custom token bucket rate limiter
- Telemetry batching
- sendBeacon support
- Live deployment

## Explicit Exclusions

- Authentication
- User accounts
- Database persistence
- Analytics dashboard
- Subscription management
- Recommendation engine
- DRM implementation

## Technical Constraints

- Node.js backend
- In-memory state only
- Single-instance deployment assumption
- No third-party rate limiting middleware

## Acceptance Criteria

- Video pauses on tab switch
- Video pauses on minimize
- Video pauses below 90% visibility
- Telemetry batches every 5 seconds
- Token bucket limiter functions correctly
- Application deploys successfully
- Documentation explains tradeoffs