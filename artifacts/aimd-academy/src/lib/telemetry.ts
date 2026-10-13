import posthog from 'posthog-js';

type EventName = 'app_open' | 'daily_check_in_completed' | 'habit_logged' | 'point_reward_claimed' | 'workshop_preview_viewed';
let ready = false;
let started = false;
const reportedErrors = new WeakSet<object>();
const allowedEvents = new Set(['app_open', 'daily_check_in_completed', 'habit_logged', 'point_reward_claimed', 'workshop_preview_viewed', 'app_exception']);
let errorCount = 0;
let errorWindow = 0;
const allowedProperties = new Set([
  'distinct_id', '$device_id', '$session_id', '$lib', '$lib_version',
  '$geoip_disable', '$process_person_profile', '$is_identified',
  'platform', 'reward_type', 'points_awarded', 'error_type', 'source', 'handled',
]);

export function startTelemetry(): void {
  if (started) return;
  started = true;
  const token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
  if (import.meta.env.PROD && token) {
    try {
      posthog.init(token, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_exceptions: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_external_dependency_loading: true,
        advanced_disable_feature_flags: true,
        person_profiles: 'never',
        persistence: 'sessionStorage',
        ip: false,
        before_send: (event) => {
          if (!event || !allowedEvents.has(event.event)) return null;
          event.properties = Object.fromEntries(
            Object.entries(event.properties ?? {}).filter(([key]) => allowedProperties.has(key)),
          );
          event.properties.$process_person_profile = false;
          event.properties.$geoip_disable = true;
          return event;
        },
      });
      ready = true;
    } catch {
      console.warn('Creator Studio monitoring could not initialize.');
    }
  } else if (import.meta.env.PROD) {
    console.warn('Creator Studio monitoring is not configured: missing public PostHog project token.');
  }
  window.addEventListener('error', (event) => reportException(event.error, 'runtime', false));
  window.addEventListener('unhandledrejection', (event) => reportException(event.reason, 'unhandled_promise', false));
  trackEvent('app_open');
}

export function trackEvent(event: EventName, properties?: { reward_type?: 'daily_spin' | 'member_drop'; points_awarded?: number }): void {
  if (!ready) return;
  try { posthog.capture(event, { platform: 'web', ...properties }); }
  catch { /* Analytics must never break the app. */ }
}

export function reportException(error: unknown, source: 'render' | 'runtime' | 'unhandled_promise', handled = true): void {
  if (error && typeof error === 'object') {
    if (reportedErrors.has(error)) return;
    reportedErrors.add(error);
  }
  if (Date.now() - errorWindow > 60_000) { errorWindow = Date.now(); errorCount = 0; }
  if (++errorCount > 10) return;
  const knownTypes = ['TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'URIError', 'Error'];
  const errorType = error instanceof Error && knownTypes.includes(error.name) ? error.name : 'Error';
  console.error('Creator Studio exception', { errorType, source, handled });
  if (!ready) return;
  try {
    posthog.capture('app_exception', { platform: 'web', error_type: errorType, source, handled });
  } catch { /* Error reporting is best-effort. */ }
}
