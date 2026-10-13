// Explicit, opt-in ingestion check. No credentials or response bodies are logged.
// This tests the configured project token/host, not native device crash delivery.
if (!process.argv.includes('--send-test-event')) {
  console.error('Pass --send-test-event to send one labeled monitoring_setup_check event.');
  process.exit(1);
}

const token = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = (process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');
if (!token) {
  console.error('The PostHog project capture token is not configured.');
  process.exit(1);
}
if (!['https://us.i.posthog.com', 'https://eu.i.posthog.com'].includes(host)) {
  console.error('Use a verified PostHog Cloud capture host before sending the project token.');
  process.exit(1);
}

try {
  const response = await fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      api_key: token,
      event: 'monitoring_setup_check',
      properties: {
        distinct_id: 'creator-studio-monitoring-check',
        $process_person_profile: false,
        $geoip_disable: true,
        platform: 'setup',
        monitoring_test: true,
      },
      timestamp: new Date().toISOString(),
    }),
  });
  const body = await response.json().catch(() => null);
  // PostHog capture endpoints use both scalar 1 and status-code/status-text
  // success responses. Keep recognition explicit without logging the body.
  const status = body?.status ?? body;
  const accepted = response.ok && [1, '1', 'Ok', 'OK', 'ok', 'success'].includes(status);
  console.log(JSON.stringify({ host, httpStatus: response.status, accepted }));
  if (!accepted) process.exitCode = 1;
} catch {
  console.error('PostHog ingestion could not be reached. No token or response data has been logged.');
  process.exitCode = 1;
}
