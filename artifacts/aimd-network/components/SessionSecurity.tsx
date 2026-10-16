import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '@clerk/expo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  BIOMETRIC_RESUME_GRACE_MS,
  isSessionInactiveExpired,
  SESSION_INACTIVITY_TIMEOUT_MS,
  sessionSecurityStore,
} from '@/lib/sessionSecurity';

type GatePhase = 'opening' | 'open' | 'locked' | 'expired' | 'error';
type GateState = { identity: string; phase: GatePhase; message?: string };
const SESSION_ACTIVITY_HEARTBEAT_MS = 5 * 60 * 1000;

async function hasEnrolledBiometrics(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

export function SessionSecurityGate({ children }: { children: ReactNode }) {
  const colors = useColors();
  const { userId, signOut } = useAuth();
  const identity = userId;
  const [gate, setGate] = useState<GateState | null>(null);
  const [unlockedIdentity, setUnlockedIdentity] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const runningAuth = useRef(false);
  const backgroundedAt = useRef<number | null>(null);
  const biometricEnabled = useRef(false);
  const identityRef = useRef<string | null>(identity);
  identityRef.current = identity;

  const openGate = useCallback((activeIdentity: string) => {
    setUnlockedIdentity(activeIdentity);
    setGate({ identity: activeIdentity, phase: 'open' });
  }, []);

  const lockWithBiometrics = useCallback(async (activeIdentity: string) => {
    if (runningAuth.current) return false;
    runningAuth.current = true;
    setGate({ identity: activeIdentity, phase: 'locked' });
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Creator Studio',
        promptSubtitle: 'Confirm it’s you to continue',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });
      if (identityRef.current !== activeIdentity) return false;
      if (result.success) {
        await sessionSecurityStore.recordActivity(activeIdentity);
        if (identityRef.current === activeIdentity) openGate(activeIdentity);
        return true;
      }
      setGate({
        identity: activeIdentity,
        phase: 'locked',
        message: 'Unlock was cancelled. Try again to open your account.',
      });
      return false;
    } catch {
      if (identityRef.current === activeIdentity) {
        setGate({
          identity: activeIdentity,
          phase: 'error',
          message: 'Secure unlock could not start. Check your device settings and retry.',
        });
      }
      return false;
    } finally {
      runningAuth.current = false;
    }
  }, [openGate]);

  const signOutExpiredSession = useCallback(async (activeIdentity: string) => {
    setGate({
      identity: activeIdentity,
      phase: 'expired',
      message: 'You’ve been away for 30 days. Sign in again to keep your account secure.',
    });
    try {
      await signOut();
      await sessionSecurityStore.clearLastActiveAt(activeIdentity);
    } catch {
      if (identityRef.current === activeIdentity) {
        setGate({
          identity: activeIdentity,
          phase: 'expired',
          message: 'Your sign-in has expired after 30 days without activity. Connect to the internet and tap below to sign in again.',
        });
      }
    }
  }, [signOut]);

  useEffect(() => {
    if (Platform.OS === 'web' || !userId) {
      biometricEnabled.current = false;
      setUnlockedIdentity(null);
      setGate(null);
      return;
    }

    const activeIdentity = userId;
    let cancelled = false;
    setGate({ identity: activeIdentity, phase: 'opening' });

    const prepare = async () => {
      const lastActiveAt = await sessionSecurityStore.getLastActiveAt(activeIdentity);
      if (cancelled) return;
      if (isSessionInactiveExpired(lastActiveAt)) {
        await signOutExpiredSession(activeIdentity);
        return;
      }

      const enabled = await sessionSecurityStore.getBiometricEnabled(activeIdentity);
      if (cancelled) return;
      biometricEnabled.current = enabled;
      if (!enabled) {
        await sessionSecurityStore.recordActivity(activeIdentity);
        if (cancelled) return;
        openGate(activeIdentity);
        return;
      }

      if (!cancelled) await lockWithBiometrics(activeIdentity);
    };

    void prepare().catch((error) => {
      if (!cancelled) {
        console.warn('Secure session preparation failed:', error instanceof Error ? error.message : 'Unknown error');
        setGate({
          identity: activeIdentity,
          phase: 'error',
          message: 'Could not read your secure sign-in settings. Try again.',
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [lockWithBiometrics, openGate, retryNonce, signOutExpiredSession, userId]);

  useEffect(() => sessionSecurityStore.subscribe((accountId, enabled) => {
    if (accountId === userId) biometricEnabled.current = enabled;
  }), [userId]);

  useEffect(() => {
    if (Platform.OS === 'web' || !userId || gate?.phase !== 'open') return;
    let cancelled = false;
    const failClosed = (message: string) => {
      if (!cancelled && identityRef.current === userId) {
        setGate({ identity: userId, phase: 'error', message });
      }
    };
    const recordActivity = async () => {
      try {
        await sessionSecurityStore.recordActivity(userId);
      } catch {
        failClosed('Secure activity could not be saved. Retry to protect your sign-in.');
      }
    };
    const heartbeat = setInterval(() => { void recordActivity(); }, SESSION_ACTIVITY_HEARTBEAT_MS);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        backgroundedAt.current = Date.now();
        void recordActivity();
      }
      if (nextState !== 'active' || backgroundedAt.current == null) return;

      const inactiveForMs = backgroundedAt.current == null ? 0 : Date.now() - backgroundedAt.current;
      backgroundedAt.current = null;
      const activeIdentity = userId;
      setGate({ identity: activeIdentity, phase: 'opening' });
      void (async () => {
        try {
          const lastActiveAt = await sessionSecurityStore.getLastActiveAt(activeIdentity);
          if (identityRef.current !== activeIdentity) return;
          if (isSessionInactiveExpired(lastActiveAt)) {
            await signOutExpiredSession(activeIdentity);
            return;
          }
          if (
            biometricEnabled.current &&
            inactiveForMs >= BIOMETRIC_RESUME_GRACE_MS
          ) {
            await lockWithBiometrics(activeIdentity);
            return;
          }
          await sessionSecurityStore.recordActivity(activeIdentity);
          if (identityRef.current === activeIdentity) openGate(activeIdentity);
        } catch {
          failClosed('Secure activity could not be checked. Retry to protect your sign-in.');
        }
      })();
    });
    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      subscription.remove();
    };
  }, [gate?.phase, lockWithBiometrics, openGate, signOutExpiredSession, userId]);

  if (Platform.OS === 'web' || !userId) return <>{children}</>;

  const activeIdentity = userId;
  const currentGate = gate?.identity === activeIdentity ? gate : null;
  const isOpen = currentGate?.phase === 'open';

  const title =
    currentGate?.phase === 'expired'
      ? 'Sign in again'
      : currentGate?.phase === 'locked'
      ? 'Welcome back'
      : currentGate?.phase === 'error'
        ? 'Secure sign-in required'
        : 'Securing your account…';
  const message =
    currentGate?.message ??
    (currentGate?.phase === 'expired'
      ? 'You’ve been away for 30 days. Sign in again to keep your account secure.'
      : currentGate?.phase === 'locked'
      ? 'Use Face ID, Touch ID, or your device passcode to continue.'
      : 'Checking your saved sign-in on this device.');

  return (
    <View style={styles.shell}>
      {(isOpen || unlockedIdentity === activeIdentity) && (
        <View
          style={[styles.shell, !isOpen && styles.hidden]}
          pointerEvents={isOpen ? 'auto' : 'none'}
          accessibilityElementsHidden={!isOpen}
          importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
        >
          {children}
        </View>
      )}
      {!isOpen && (
    <SafeAreaView style={[styles.gate, { backgroundColor: colors.background }]}>
      <View style={[styles.gateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconBadge, { backgroundColor: colors.magentaWash }]}>
          <Feather name="shield" size={24} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>{message}</Text>
        {currentGate?.phase === 'expired' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in again"
            onPress={() => void signOutExpiredSession(activeIdentity)}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
            testID="session-inactivity-sign-in"
          >
            <Feather name="log-in" size={18} color={colors.primaryForeground} />
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Sign in again</Text>
          </Pressable>
        ) : currentGate?.phase === 'locked' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unlock Creator Studio with biometrics"
            onPress={() => void lockWithBiometrics(activeIdentity)}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
            testID="session-biometric-retry"
          >
            <Feather name="unlock" size={18} color={colors.primaryForeground} />
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Unlock Creator Studio</Text>
          </Pressable>
        ) : currentGate?.phase === 'error' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryNonce((value) => value + 1)}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.primary },
              pressed && styles.pressed,
            ]}
            testID="session-security-retry"
          >
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Try Again</Text>
          </Pressable>
        ) : (
          <ActivityIndicator color={colors.primary} size="large" />
        )}
        {(currentGate?.phase === 'locked' || currentGate?.phase === 'error') && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void signOut().catch(() => {
                Alert.alert('Could not sign out', 'Connect to the internet and try again.');
              });
            }}
            style={styles.signOutButton}
            testID="session-security-sign-out"
          >
            <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>Sign out instead</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
      )}
    </View>
  );
}

export function BiometricUnlockSettings({ userId }: { userId: number | string | null | undefined }) {
  const colors = useColors();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(false);
  const accountId = userId == null ? null : String(userId);

  useEffect(() => {
    let cancelled = false;
    if (Platform.OS === 'web' || !accountId) {
      setLoading(false);
      setAvailable(false);
      return;
    }
    void Promise.all([
      sessionSecurityStore.getBiometricEnabled(accountId),
      hasEnrolledBiometrics(),
    ]).then(([storedEnabled, hasBiometrics]) => {
      if (cancelled) return;
      setAvailable(hasBiometrics);
      setEnabled(storedEnabled);
    }).catch(() => {
      if (!cancelled) Alert.alert('Could not load security settings', 'Please reopen your profile and try again.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const onToggle = async (nextEnabled: boolean) => {
    if (!accountId || saving) return;
    setSaving(true);
    try {
      if (nextEnabled) {
        if (!(await hasEnrolledBiometrics())) {
          setAvailable(false);
          Alert.alert(
            'Biometrics are not set up',
            'Set up Face ID, Touch ID, or device biometrics in your device settings first.',
          );
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm to enable secure unlock',
          cancelLabel: 'Cancel',
          fallbackLabel: 'Use Passcode',
          disableDeviceFallback: false,
        });
        if (!result.success) return;
      }
      await sessionSecurityStore.setBiometricEnabled(accountId, nextEnabled);
      setEnabled(nextEnabled);
    } catch {
      Alert.alert('Could not save security setting', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.settingsRow}>
        <View style={[styles.iconBadge, { backgroundColor: colors.magentaWash }]}>
          <Feather name="lock" size={20} color={colors.primary} />
        </View>
        <View style={styles.settingsCopy}>
          <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Biometric app unlock</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {Platform.OS === 'web'
              ? 'Available in the iPhone and Android app.'
                : available
                ? 'Unlock with Face ID, Touch ID, or device biometrics when you open the app or return after a minute away. Sign in again after 30 days without activity.'
                : 'Set up Face ID, Touch ID, or device biometrics on this device to enable this option.'}
          </Text>
        </View>
        <Switch
          accessibilityLabel="Biometric app unlock"
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled, disabled: loading || saving || (!available && !enabled) || Platform.OS === 'web' }}
          disabled={loading || saving || (!available && !enabled) || Platform.OS === 'web'}
          onValueChange={(value) => void onToggle(value)}
          testID="biometric-unlock-toggle"
          value={enabled}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
      <Text style={[styles.securityNote, { color: colors.mutedForeground }]}>
        Your sign-in stays stored securely by Clerk. Creator Studio never stores your password or biometric data.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  hidden: { display: 'none' },
  gate: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  gateCard: { alignItems: 'center', borderRadius: 18, borderWidth: 1, gap: 14, maxWidth: 420, padding: 24, width: '100%' },
  iconBadge: { alignItems: 'center', borderRadius: 99, height: 48, justifyContent: 'center', width: 48 },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 22, textAlign: 'center' },
  description: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  primaryButton: { alignItems: 'center', borderRadius: 10, flexDirection: 'row', gap: 9, justifyContent: 'center', marginTop: 4, minHeight: 48, paddingHorizontal: 18, width: '100%' },
  primaryButtonText: { fontFamily: 'DMSans_700Bold', fontSize: 15 },
  pressed: { opacity: 0.78 },
  signOutButton: { paddingHorizontal: 14, paddingVertical: 10 },
  signOutText: { fontFamily: 'DMSans_500Medium', fontSize: 13 },
  settingsCard: { borderRadius: 12, borderWidth: 1, gap: 12, padding: 16 },
  settingsRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  settingsCopy: { flex: 1, gap: 4 },
  settingsTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
  securityNote: { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 },
});
