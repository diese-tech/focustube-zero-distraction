# QA and Operations

This checklist is for validating the planned challenge implementation before submission.

## Manual QA Checklist

| Area | Check | Expected result |
| --- | --- | --- |
| App load | Open the deployed app URL. | Page loads without console errors. |
| Session creation | Start the demo flow. | Frontend receives a session response before playback. |
| Playback | Start the video. | Video starts only after session setup succeeds. |
| Focus state | Keep the page active and video visible. | UI reports focused or ready state. |
| Error state | Stop or block the backend locally. | UI shows a clear failure state and does not start playback. |

## Browser Focus Tests

| Test | Steps | Expected result |
| --- | --- | --- |
| Tab switch pause | Start video, switch tabs, return to the app. | Video pauses immediately when the tab is hidden. |
| Minimize pause | Start video, minimize the window, restore it. | Video pauses when the window is minimized or the document becomes hidden. |
| Restore state | Restore visibility after a pause. | UI reports focus restored. Playback does not silently resume unless intentionally implemented. |
| Repeated focus changes | Switch away and back several times. | Each distraction event is recorded without duplicate runaway events. |

## Intersection Observer Tests

| Test | Steps | Expected result |
| --- | --- | --- |
| Below-threshold pause | Start video, scroll video below 90% visible. | Video pauses immediately. |
| Threshold boundary | Slowly scroll around the 90% visibility line. | Pause behavior is consistent and explainable. |
| Fully visible restore | Scroll the video back into view. | UI reports focus restored once the video is at least 90% visible. |
| Resize handling | Resize the browser while video is playing. | Visibility calculation updates and pauses when below threshold. |

## Telemetry Tests

| Test | Steps | Expected result |
| --- | --- | --- |
| Batch send cadence | Trigger multiple telemetry events. | Batch is sent about every 5 seconds. |
| Event shape | Inspect network payload. | Events include `sessionId`, `type`, `timestamp`, and relevant metadata. |
| Close flush | Refresh or close the page with pending telemetry. | Pending telemetry attempts to send with `navigator.sendBeacon`. |
| Fetch fallback | Test in a path where `sendBeacon` is unavailable or not used. | Telemetry still sends with `fetch` during normal page activity. |
| Backend validation | Send malformed telemetry manually. | Backend returns a client error and does not accept invalid payloads. |

## Rate Limiter Tests

| Test | Steps | Expected result |
| --- | --- | --- |
| Burst handling | Send a short burst of telemetry requests. | Initial burst is accepted within bucket capacity. |
| Limit enforcement | Continue sending requests beyond capacity. | Token bucket eventually returns `429 Too Many Requests`. |
| Refill behavior | Wait for the refill window, then send again. | Requests are accepted again after tokens refill. |
| Route coverage | Test session and telemetry endpoints. | Protected routes use the custom limiter consistently. |
| No middleware shortcut | Inspect implementation. | Limiter is custom code, not third-party rate limiting middleware. |

## Deployment Smoke Tests

| Check | Expected result |
| --- | --- |
| Live frontend URL opens | App is reachable from the submitted demo link. |
| Backend endpoint reachable | Session and telemetry endpoints respond from deployed environment. |
| CORS/configuration | Frontend can call backend without browser blocking. |
| Production build | Build completes without type errors. |
| Console and network | No unexplained runtime errors during normal demo flow. |

## Known Limitations

- Telemetry delivery during unload is best effort.
- In-memory rate limits reset on process restart.
- No auth, dashboard, database persistence, or DRM in the challenge version.
- Multi-instance deployments need shared rate limit and session state.
- Browser behavior for minimized windows may vary; Page Visibility API behavior should be the source of truth.

## Edge Cases

- User opens multiple tabs with the same video.
- User scrolls rapidly around the 90% visibility threshold.
- User closes the tab before the first 5-second telemetry flush.
- Backend returns `429` during telemetry flush.
- Browser blocks or limits background requests.
- Video metadata request succeeds but telemetry endpoint fails.

## Before Submission

- Confirm the live deployment link works in a clean browser session.
- Confirm the GitHub repo is public.
- Confirm README, MVP, TASKS, DECISIONS, architecture, QA, and submission docs are present.
- Confirm the implementation commit history is clean and descriptive.
- Run the browser focus tests manually.
- Run rate limiter tests against the deployed or local backend.
- Update `SUBMISSION.md` with the real live demo URL once available.
