import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { setHabitReminderAccount } from '@/lib/habitReminders';
import NotificationLifecycle from '@/components/NotificationLifecycle';
import NotificationStartupFallback from '@/components/NotificationStartupFallback';
import { setPushNotificationAccount } from '@/lib/pushNotifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Alert,
  AppState,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { reloadAppAsync } from 'expo';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import { startTelemetry } from '@/lib/telemetry';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { AppearanceProvider, useAppearance } from '@/lib/appearance';
import { useColors } from '@/hooks/useColors';
import { ClerkLoaded, ClerkLoading, ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  initializeRevenueCat,
  SubscriptionProvider,
} from '@/lib/revenuecat';

// Set API base URL before any component renders
const domain = process.env.EXPO_PUBLIC_DOMAIN;
const apiBaseUrl = domain ? `https://${domain}` : null;
if (apiBaseUrl) setBaseUrl(apiBaseUrl);

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

try {
  initializeRevenueCat();
} catch (error) {
  console.warn('RevenueCat initialization deferred', error);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const CLERK_STARTUP_TIMEOUT_MS = 10_000;
const TOKEN_ATTEMPTS = 6;
const TOKEN_RETRY_DELAY_MS = 500;
const TOKEN_TIMEOUT_MS = 4_000;
const TOKEN_BOOTSTRAP_LEASE_MS = 10_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function verifyAuthenticatedApiSession(token: string): Promise<boolean> {
  if (!apiBaseUrl) {
    throw new Error('The API address is unavailable.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (response.ok) return true;
    if (response.status === 401 || response.status === 403) return false;
    throw new Error(`Session verification failed with status ${response.status}.`);
  } finally {
    clearTimeout(timeout);
  }
}

function SessionPreparationScreen({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <View style={sessionStyles.container} testID="session-preparation-screen">
      {error ? (
        <>
          <Text style={sessionStyles.title}>Couldn’t finish signing you in</Text>
          <Text style={sessionStyles.body}>
            Your account is safe. Check your connection and try loading Creator Studio again.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry opening Creator Studio"
            onPress={onRetry}
            style={({ pressed }) => [
              sessionStyles.retryButton,
              pressed && sessionStyles.retryButtonPressed,
            ]}
            testID="session-preparation-retry"
          >
            <Text style={sessionStyles.retryText}>Try Again</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color="#B8532D" size="large" />
          <Text style={sessionStyles.title}>Opening Creator Studio…</Text>
          <Text style={sessionStyles.body}>Preparing your secure account session.</Text>
        </>
      )}
    </View>
  );
}

function ClerkStartupScreen() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(
      () => setTimedOut(true),
      CLERK_STARTUP_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, []);

  return (
    <SessionPreparationScreen
      error={timedOut ? 'Authentication services took too long to start.' : null}
      onRetry={() => {
        void reloadAppAsync();
      }}
    />
  );
}

function AuthSessionBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, userId } = useAuth();
  const getTokenRef = useRef(getToken);
  const previousUserId = useRef<string | null | undefined>(undefined);
  const preparedToken = useRef<{
    token: string;
    userId: string;
    usableUntil: number;
  } | null>(null);
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // Clerk may return a new getToken function identity while auth state settles.
  // Keep the shared API client's getter installed across those renders so the
  // first protected queries cannot slip through without an Authorization header.
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!isLoaded || !userId) {
      preparedToken.current = null;
      setAuthTokenGetter(null);
      return;
    }

    const activeUserId = userId;
    setAuthTokenGetter(async () => {
      const bootstrapToken = preparedToken.current;
      if (
        bootstrapToken?.userId === activeUserId &&
        bootstrapToken.usableUntil > Date.now()
      ) {
        return bootstrapToken.token;
      }

      const token = await withTimeout(
        getTokenRef.current(),
        TOKEN_TIMEOUT_MS,
        'Authentication token request timed out.',
      );
      if (!token) {
        throw new Error('Authentication token is unavailable.');
      }
      return token;
    });

    return () => {
      setAuthTokenGetter(null);
    };
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) return;

    const nextUserId = userId ?? null;
    setPushNotificationAccount(nextUserId);
    void setHabitReminderAccount(nextUserId).catch((error) => {
      console.warn('Habit reminder scheduling failed:', error instanceof Error ? error.message : 'Unknown error');
      Alert.alert('Habit alerts need attention', 'Saved habit alerts could not be restored or paused. Check your device notification settings and reopen Habits.');
    });
    if (
      previousUserId.current !== undefined &&
      previousUserId.current !== nextUserId
    ) {
      queryClient.clear();
    }
    previousUserId.current = nextUserId;
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void setHabitReminderAccount(userId ?? null).catch(() => {
        Alert.alert('Could not refresh habit alerts', 'Please check your connection and device notification settings.');
      });
    });
    return () => subscription.remove();
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      preparedToken.current = null;
      setReadyUserId(null);
      setPreparationError(null);
      return;
    }

    const authenticatedUserId = userId;
    let cancelled = false;
    setPreparationError(null);

    async function prepareAuthenticatedSession() {
      for (let attempt = 0; attempt < TOKEN_ATTEMPTS; attempt += 1) {
        try {
          const token = await withTimeout(
            getTokenRef.current({ skipCache: attempt > 0 }),
            TOKEN_TIMEOUT_MS,
            'Authentication token request timed out.',
          );
          if (token && await verifyAuthenticatedApiSession(token)) {
            if (!cancelled) {
              preparedToken.current = {
                token,
                userId: authenticatedUserId,
                usableUntil: Date.now() + TOKEN_BOOTSTRAP_LEASE_MS,
              };
              // Remove any signed-out or previous-account failures before the
              // dashboard mounts and starts its authenticated requests.
              queryClient.clear();
              setReadyUserId(authenticatedUserId);
            }
            return;
          }
        } catch (error) {
          console.warn('Authenticated API session is not ready yet', error);
        }

        if (attempt < TOKEN_ATTEMPTS - 1) {
          await wait(TOKEN_RETRY_DELAY_MS * (attempt + 1));
        }
      }

      if (!cancelled) {
        setPreparationError('The secure API session could not be verified.');
      }
    }

    void prepareAuthenticatedSession();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, retryNonce, userId]);

  if (userId && readyUserId !== userId) {
    return (
      <SessionPreparationScreen
        error={preparationError}
        onRetry={() => setRetryNonce((value) => value + 1)}
      />
    );
  }

  return children;
}

const sessionStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F1E7DA',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    color: '#2C2623',
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  body: {
    color: '#6E6660',
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 420,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#B8532D',
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
  },
});

function RootLayoutNav() {
  const colors = useColors();
  return (
    <>
    <TelemetryLifecycle />
    <ErrorBoundary diagnosticStage="NOTIFY" FallbackComponent={NotificationStartupFallback}>
      <NotificationLifecycle />
    </ErrorBoundary>
    <Stack
      screenLayout={({ children, route }) => <ScreenErrorBoundary key={route.key} routeName={route.name}>{children}</ScreenErrorBoundary>}
      screenOptions={{
        headerShown: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="feed" options={{ headerShown: false }} />
       <Stack.Screen name="profile" options={{ headerShown: false }} />
       <Stack.Screen name="accomplishments" options={{ headerShown: false }} />
       <Stack.Screen name="rewards" options={{ headerShown: false }} />
       <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
      <Stack.Screen name="membership" options={{ headerShown: false }} />
      <Stack.Screen
        name="learning-portfolio"
        options={{
          headerShown: true,
          title: 'Learning Portfolio',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: 'DMSans_600SemiBold' },
          headerBackTitle: '',
          headerShadowVisible: false,
        }}
      />
       <Stack.Screen
         name="notifications"
         options={{
           headerShown: false,
           presentation: 'card',
         }}
       />
      <Stack.Screen
        name="conversation/[id]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: 'DMSans_600SemiBold' },
          headerBackTitle: '',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="creator/[id]"
        options={{ headerShown: false }}
      />
    </Stack>
    </>
  );
}

/**
 * Start optional monitoring only after the navigation tree commits. Keep the
 * SDK import and initialization out of the cold root-layout render path.
 */
function TelemetryLifecycle() {
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void startTelemetry();
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  return null;
}

function ThemedApp() {
  const colors = useColors();
  const { scheme } = useAppearance();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch((error) => {
      console.warn('Could not update system background', error);
    });
  }, [colors.background]);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <ErrorBoundary diagnosticStage="NAVIGATION">
          <RootLayoutNav />
        </ErrorBoundary>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <ClerkLoading>
        <ClerkStartupScreen />
      </ClerkLoading>
      <ClerkLoaded>
        <AuthSessionBridge>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <AppearanceProvider>
                <ErrorBoundary diagnosticStage="MEMBERSHIP">
                <SubscriptionProvider>
                  <ErrorBoundary diagnosticStage="SHELL">
                    <ThemedApp />
                  </ErrorBoundary>
                </SubscriptionProvider>
                </ErrorBoundary>
              </AppearanceProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </AuthSessionBridge>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
