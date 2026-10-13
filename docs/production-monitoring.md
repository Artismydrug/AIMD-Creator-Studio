# Creator Studio monitoring

## Configure event delivery

- `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN`: PostHog **project API key** for event capture. It is intended to be bundled in clients. Never substitute the personal/private API key.
- `EXPO_PUBLIC_POSTHOG_HOST`: capture host for the project's region: `https://us.i.posthog.com` for US, or `https://eu.i.posthog.com` for EU. US is the default.
- The web build maps these same variables into its Vite public settings.
- The attached PostHog connector's personal API key is separate: it permits querying reports and managing dashboards, not client event capture.

These values must be present when production bundles are built. Publishing the backend alone does not update an installed iOS binary. Rebuild the mobile app to include the monitoring code and public configuration.

Tracking is disabled in development previews. Missing configuration produces a warning, not a broken app. Configuration and successful compilation do not establish that PostHog received events; verify delivery from a production-configured build.

## Explicit events

| Event | Trigger |
| --- | --- |
| `app_open` | Client startup; once per native process or web page load. |
| `daily_check_in_completed` | Successful check-in when the displayed progress was not already checked in. |
| `habit_logged` | Successful practice-session save. |
| `point_reward_claimed` | Daily spin that awards points, or accepted member-drop request. The `reward_type` distinguishes these. A drop request does **not** mean physical fulfillment or delivery. |
| `workshop_preview_viewed` | First actual teaser playback for a mounted player/source, not opening a placeholder or card. |
| `app_exception` | Sanitized frontend exception category/source; best-effort reporting. |

Counts represent pseudonymous devices or sessions, not verified unique people. Web identifiers use session storage; they do not establish cross-session retention. No account identification is sent.

## Error handling and privacy

- Web and mobile render boundaries report exception categories while retaining their existing recovery UI.
- Web runtime errors and unhandled promise rejections are observed. React Native runtime reporting delegates to the existing global error handler; it does not hide fatal errors.
- Reports omit exception messages/stacks, private content, URLs, account information and media. Explicit outgoing event/property allowlists reject unrelated SDK events.
- No automatic UI tracking, session replay, surveys, or geolocation enrichment. Exception reporting is deduplicated and capped at ten reports per minute.
- API request errors retain structured Pino logging and generic client responses. Process-level fatal exceptions are observed without overriding Node's shutdown behavior.
- Backend errors appear in server logs, not in PostHog's frontend event stream. `app_exception` is a custom event, not a symbolicated native crash report or a complete Sentry-style error tracker.
- Feedback is available from the mobile profile's Help links and the web profile's Help & feedback link to `/support`.

Review the App Store privacy disclosures before submitting a build with newly enabled usage/diagnostic collection.

## Local verification

`pnpm --filter @workspace/aimd-network run smoke:telemetry` checks both clients using mocked SDKs: initialization, privacy filtering, duplicate/error limits, runtime handlers, missing configuration and failure isolation. It makes no real analytics requests.
