import type PostHog from 'posthog-react-native';
import { Platform } from 'react-native';

type EventName = 'app_open' | 'daily_check_in_completed' | 'habit_logged' | 'point_reward_claimed' | 'workshop_preview_viewed' | 'app_exception';
type ErrorSource = 'render' | 'runtime' | 'unhandled_promise';
type GlobalErrorHandler = (error: Error, isFatal?: boolean) => void;

let client: PostHog | null = null;
let startPromise: Promise<void> | null = null;
const reportedErrors = new WeakSet<object>();
const allowedEvents = new Set(['app_open', 'daily_check_in_completed', 'habit_logged', 'point_reward_claimed', 'workshop_preview_viewed', 'app_exception']);
let errorCount = 0;
let errorWindow = 0;
const allowedProperties = new Set([
  'distinct_id', '$device_id', '$session_id', '$lib', '$lib_version',
  '$geoip_disable', '$process_person_profile', '$is_identified',
  'platform', 'reward_type', 'points_awarded', 'error_type', 'source', 'handled',
]);

/** Explicit events only: no account identification, recordings, URLs or user content. */
export function startTelemetry(): Promise<void> {
  if (startPromise) return startPromise;
  startPromise = initializeTelemetry().catch(() => {
    console.warn('Creator Studio monitoring could not initialize.');
  });
  return startPromise;
}

async function initializeTelemetry(): Promise<void> {
  // Install sanitized crash hooks independently from loading the optional SDK.
  // A PostHog import/constructor failure must never delay or crash app startup.
  // Preserve React Native's own crash behavior; reporting must not hide a fatal error.
  const runtime = globalThis as typeof globalThis & {
    ErrorUtils?: { getGlobalHandler(): GlobalErrorHandler; setGlobalHandler(handler: GlobalErrorHandler): void };
  };
  try {
    if (Platform.OS !== 'web' && runtime.ErrorUtils) {
      const previous = runtime.ErrorUtils.getGlobalHandler();
      runtime.ErrorUtils.setGlobalHandler((error, isFatal) => {
        try {
          reportException(error, 'runtime', !isFatal);
        } finally {
          previous(error, isFatal);
        }
      });
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('error', (event) => reportException(event.error, 'runtime', false));
      window.addEventListener('unhandledrejection', (event) => reportException(event.reason, 'unhandled_promise', false));
    }
  } catch {
    console.warn('Creator Studio error monitoring could not initialize.');
  }

  const token = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!__DEV__ && token) {
    try {
      const { default: PostHog } = await import('posthog-react-native');
      const candidate = new PostHog(token, {
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        captureAppLifecycleEvents: false,
        enableSessionReplay: false,
        preloadFeatureFlags: false,
        disableRemoteFeatureFlags: true,
        disableSurveys: true,
        disableGeoip: true,
        customAppProperties: () => ({}),
        errorTracking: { autocapture: false, exceptionSteps: { enabled: false } },
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
      await candidate.ready();
      client = candidate;
    } catch {
      console.warn('Creator Studio monitoring could not initialize.');
    }
  } else if (!__DEV__) {
    console.warn('Creator Studio monitoring is not configured: missing public PostHog project token.');
  }

  trackEvent('app_open');
}

export function trackEvent(event: EventName, properties?: { reward_type?: 'daily_spin' | 'member_drop'; points_awarded?: number }): void {
  try {
    client?.capture(event, { platform: Platform.OS, ...properties });
  } catch {
    // A monitoring failure must never affect practice, messages or purchases.
  }
}

export function reportException(error: unknown, source: ErrorSource, handled = true): void {
  if (error && typeof error === 'object') {
    if (reportedErrors.has(error)) return;
    reportedErrors.add(error);
  }
  if (Date.now() - errorWindow > 60_000) { errorWindow = Date.now(); errorCount = 0; }
  if (++errorCount > 10) return;
  const knownTypes = ['TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'URIError', 'Error'];
  const errorType = error instanceof Error && knownTypes.includes(error.name) ? error.name : 'Error';
  // Messages/stacks can contain tokens, API bodies or private content. Do not send them.
  console.error('Creator Studio exception', { errorType, source, handled });
  try {
    client?.capture('app_exception', { platform: Platform.OS, error_type: errorType, source, handled });
  } catch { /* Error reporting is best-effort. */ }
}
