import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSignIn, useAuth, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { type Href, Link, Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LegalHelpLinks from '@/components/LegalHelpLinks';
import { useColors } from '@/hooks/useColors';

// Handle any pending authentication sessions on Android
WebBrowser.maybeCompleteAuthSession();

type Step = 'sign_in' | 'forgot_email' | 'forgot_code';
const AUTH_SCHEME = 'aimd-network';

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  const colors = useColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  useWarmUpBrowser();

  const { signIn, errors, fetchStatus } = useSignIn();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [oauthError, setOauthError] = useState('');
  const [actionError, setActionError] = useState('');

  // Forgot-password flow
  const [step, setStep] = useState<Step>('sign_in');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleSignIn = async () => {
    setActionError('');
    try {
      const { error } = await signIn.password({ emailAddress: email.trim(), password });
      if (error) {
        setActionError(error.longMessage ?? error.message ?? 'Could not sign you in. Please try again.');
        return;
      }

      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl('/');
            if (!url.startsWith('http')) router.replace(url as Href);
          },
        });
      } else if (signIn.status === 'needs_client_trust') {
        await handleResendVerification();
      }
    } catch {
      setActionError('Could not sign you in. Check your connection and try again.');
    }
  };

  const handleVerify = async () => {
    setActionError('');
    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (error) {
        setActionError(error.longMessage ?? error.message ?? 'Could not verify your code. Please try again.');
        return;
      }
      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl('/');
            if (!url.startsWith('http')) router.replace(url as Href);
          },
        });
      }
    } catch {
      setActionError('Could not verify your code. Check your connection and try again.');
    }
  };

  const handleResendVerification = async () => {
    setActionError('');
    try {
      const { error } = await signIn.mfa.sendEmailCode();
      if (error) {
        setActionError(error.longMessage ?? error.message ?? 'Could not send your code. Please try again.');
      }
    } catch {
      setActionError('Could not send your code. Check your connection and try again.');
    }
  };

  const handleOAuth = useCallback(async (provider: 'oauth_google' | 'oauth_apple') => {
    const key = provider === 'oauth_google' ? 'google' : 'apple';
    const providerName = key === 'google' ? 'Google' : 'Apple';
    try {
      setOauthLoading(key);
      setOauthError('');
      const { createdSessionId, setActive, signUp: oauthSignUp } = await startSSOFlow({
        strategy: provider,
        redirectUrl: AuthSession.makeRedirectUri({
          scheme: AUTH_SCHEME,
          path: 'oauth-callback',
        }),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => {
            router.replace(decorateUrl('/') as Href);
          },
        });
      } else if (oauthSignUp?.status === 'missing_requirements') {
        setOauthError(`${providerName} sign-in needs one more step before your account can open. Please try again.`);
      } else {
        setOauthError(`${providerName} sign-in did not finish. Please try again.`);
      }
    } catch (err) {
      console.error('OAuth error:', JSON.stringify(err, null, 2));
      setOauthError(`${providerName} sign-in is temporarily unavailable. Please try again.`);
    } finally {
      setOauthLoading(null);
    }
  }, [startSSOFlow, router]);

  const handleSendResetCode = async () => {
    if (!resetEmail) return;
    setResetError('');
    setResetLoading(true);
    try {
      // Initialize sign-in with the user's identifier
      const { error: createError } = await signIn.create({ identifier: resetEmail.trim() });
      if (createError) {
        setResetError(createError.longMessage ?? createError.message ?? 'Something went wrong. Please try again.');
        return;
      }
      // Send the password-reset code to the user's email
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setResetError(sendError.longMessage ?? sendError.message ?? 'Could not send reset code. Please try again.');
        return;
      }
      setStep('forgot_code');
    } catch {
      setResetError('Could not send your reset code. Check your connection and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    setResetCode('');
    setResetError('');
    setResetLoading(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.sendCode();
      if (error) {
        setResetError(error.longMessage ?? error.message ?? 'Could not resend code. Please try again.');
      }
    } catch {
      setResetError('Could not resend your reset code. Check your connection and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode || !newPassword) return;
    setResetError('');
    setResetLoading(true);
    try {
      // Verify the code — on success status becomes 'needs_new_password'
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: resetCode.trim() });
      if (verifyError) {
        setResetError(verifyError.longMessage ?? verifyError.message ?? 'Invalid code. Please try again.');
        return;
      }
      // Submit the new password — on success status becomes 'complete'
      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword });
      if (submitError) {
        setResetError(submitError.longMessage ?? submitError.message ?? 'Could not set new password. Please try again.');
        return;
      }
      // Finalize the session so the user is signed in immediately
      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl('/');
            if (url.startsWith('http')) {
              // handled by Clerk
            } else {
              router.replace(url as Href);
            }
          },
        });
        setResetDone(true);
      }
    } catch {
      setResetError('Could not finish resetting your password. Check your connection and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const cancelReset = async () => {
    void signIn.reset();
    setStep('sign_in');
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setResetError('');
    setResetDone(false);
    setActionError('');
  };

  if (isSignedIn) return <Redirect href="/(tabs)" />;

  // ── Forgot password: enter email ──────────────────────────────────────────
  if (step === 'forgot_email') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.title}>Creator Studio</Text>
          <Text style={s.appSubtitle}>by AIMD</Text>
          <Text style={s.subtitle}>Enter your email to receive a reset code</Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={resetEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            onChangeText={setResetEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {!!resetError && <Text style={s.error}>{resetError}</Text>}

          <Pressable
            style={({ pressed }) => [
              s.btn,
              (!resetEmail || resetLoading) && s.btnDisabled,
              pressed && s.btnPressed,
            ]}
            onPress={handleSendResetCode}
            disabled={!resetEmail || resetLoading}
          >
            {resetLoading
              ? <ActivityIndicator color={colors.ink} />
              : <Text style={s.btnText}>Send Reset Code</Text>}
          </Pressable>

          <Pressable onPress={cancelReset} style={s.secondary}>
            <Text style={s.secondaryText}>Back to sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Forgot password: enter code + new password ────────────────────────────
  if (step === 'forgot_code') {
    if (resetDone) {
      return (
        <View style={[s.container, s.centeredContainer, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }]}>
          <Text style={s.title}>Creator Studio</Text>
          <Text style={s.appSubtitle}>by AIMD</Text>
          <Text style={[s.subtitle, { color: colors.foreground, marginTop: 24 }]}>
            Password updated! Signing you in…
          </Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.title}>Creator Studio</Text>
          <Text style={s.appSubtitle}>by AIMD</Text>
          <Text style={s.subtitle}>Enter the code from your email and choose a new password</Text>

          <Text style={s.label}>Reset Code</Text>
          <TextInput
            style={s.input}
            value={resetCode}
            placeholder="6-digit code"
            placeholderTextColor={colors.mutedForeground}
            onChangeText={setResetCode}
            keyboardType="numeric"
            autoFocus
          />

          <Text style={s.label}>New Password</Text>
          <TextInput
            style={s.input}
            value={newPassword}
            placeholder="New password"
            placeholderTextColor={colors.mutedForeground}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          {!!resetError && <Text style={s.error}>{resetError}</Text>}

          <Pressable
            style={({ pressed }) => [
              s.btn,
              (!resetCode || !newPassword || resetLoading) && s.btnDisabled,
              pressed && s.btnPressed,
            ]}
            onPress={handleResetPassword}
            disabled={!resetCode || !newPassword || resetLoading}
          >
            {resetLoading
              ? <ActivityIndicator color={colors.ink} />
              : <Text style={s.btnText}>Reset Password</Text>}
          </Pressable>

          <Pressable onPress={handleResendResetCode} style={s.secondary} disabled={resetLoading}>
            <Text style={s.secondaryText}>Resend code</Text>
          </Pressable>
          <Pressable onPress={cancelReset} style={s.secondary}>
            <Text style={s.secondaryText}>Back to sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── MFA verification ──────────────────────────────────────────────────────
  if (signIn.status === 'needs_client_trust') {
    return (
      <View style={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }]}>
        <Text style={s.title}>Creator Studio</Text>
        <Text style={s.appSubtitle}>by AIMD</Text>
        <Text style={s.subtitle}>Check your email for a verification code</Text>

        <TextInput
          style={s.input}
          value={code}
          placeholder="Verification code"
          placeholderTextColor={colors.mutedForeground}
          onChangeText={setCode}
          keyboardType="numeric"
          autoFocus
        />
        {errors.fields.code && <Text style={s.error}>{errors.fields.code.message}</Text>}
        {!!actionError && <Text style={s.error} accessibilityRole="alert" testID="sign-in-action-error">{actionError}</Text>}

        <Pressable
          style={({ pressed }) => [s.btn, (fetchStatus === 'fetching' || !code) && s.btnDisabled, pressed && s.btnPressed]}
          onPress={handleVerify}
          disabled={fetchStatus === 'fetching' || !code}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color={colors.ink} />
            : <Text style={s.btnText}>Verify</Text>}
        </Pressable>

        <Pressable onPress={handleResendVerification} style={s.secondary} disabled={fetchStatus === 'fetching'}>
          <Text style={s.secondaryText}>Resend code</Text>
        </Pressable>
        <Pressable onPress={() => { setActionError(''); void signIn.reset(); }} style={s.secondary}>
          <Text style={s.secondaryText}>Start over</Text>
        </Pressable>
      </View>
    );
  }

  // ── Normal sign-in ────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Creator Studio</Text>
        <Text style={s.appSubtitle}>by AIMD</Text>
        <Text style={s.tagline}>Discipline Eats Talent</Text>
        <Text style={s.subtitle}>Sign in to your creator account</Text>

        {/* OAuth buttons */}
        <Pressable
          style={({ pressed }) => [s.oauthBtn, pressed && s.btnPressed, oauthLoading === 'google' && s.btnDisabled]}
          onPress={() => handleOAuth('oauth_google')}
          disabled={oauthLoading !== null}
        >
          {oauthLoading === 'google'
            ? <ActivityIndicator color={colors.foreground} />
            : (
              <View style={s.oauthBtnInner}>
                <Text style={s.oauthIcon}>G</Text>
                <Text style={s.oauthBtnText}>Continue with Google</Text>
              </View>
            )}
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            style={({ pressed }) => [s.oauthBtn, pressed && s.btnPressed, oauthLoading === 'apple' && s.btnDisabled]}
            onPress={() => handleOAuth('oauth_apple')}
            disabled={oauthLoading !== null}
          >
            {oauthLoading === 'apple'
              ? <ActivityIndicator color={colors.foreground} />
              : (
                <View style={s.oauthBtnInner}>
                  <Text style={s.oauthIcon}></Text>
                  <Text style={s.oauthBtnText}>Continue with Apple</Text>
                </View>
              )}
          </Pressable>
        )}
        {!!oauthError && <Text style={s.oauthError} accessibilityRole="alert">{oauthError}</Text>}

        {/* Divider */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          placeholder="you@example.com"
          placeholderTextColor={colors.mutedForeground}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.fields.identifier && <Text style={s.error}>{errors.fields.identifier.message}</Text>}

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          value={password}
          placeholder="••••••••"
          placeholderTextColor={colors.mutedForeground}
          onChangeText={setPassword}
          secureTextEntry
        />
        {errors.fields.password && <Text style={s.error}>{errors.fields.password.message}</Text>}
        {!!actionError && <Text style={s.error} accessibilityRole="alert" testID="sign-in-action-error">{actionError}</Text>}

        {/* Forgot password link */}
        <Pressable onPress={() => { setResetEmail(email); setStep('forgot_email'); }} style={s.forgotRow}>
          <Text style={s.forgotText}>Forgot password?</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            s.btn,
            (!email || !password || fetchStatus === 'fetching') && s.btnDisabled,
            pressed && s.btnPressed,
          ]}
          onPress={handleSignIn}
          disabled={!email || !password || fetchStatus === 'fetching'}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color={colors.ink} />
            : <Text style={s.btnText}>Log In</Text>}
        </Pressable>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up">
            <Text style={s.footerLink}>Sign up</Text>
          </Link>
        </View>
        <LegalHelpLinks color={colors.mutedForeground} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.studioBackground,
    paddingHorizontal: 24,
    gap: 10,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 32,
    color: colors.foreground,
    letterSpacing: -1.2,
    textAlign: 'center',
    marginBottom: 2,
  },
  appSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 16,
  },
  oauthBtn: {
    backgroundColor: colors.studioPaper,
    borderWidth: 1.5,
    borderColor: colors.studioInk,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.studioShadow,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  oauthBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  oauthIcon: {
    fontSize: 16,
    color: colors.foreground,
    fontFamily: 'DMSans_700Bold',
    width: 20,
    textAlign: 'center',
  },
  oauthBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: colors.foreground,
  },
  oauthError: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.destructive,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.mutedForeground,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: colors.foreground,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.studioPaper,
    borderWidth: 1.5,
    borderColor: colors.studioInk,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: colors.foreground,
  },
  error: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.destructive,
    marginTop: 4,
  },
  btn: {
    backgroundColor: colors.studioOrange,
    borderWidth: 1.5,
    borderColor: colors.studioInk,
    borderRadius: 16,
    paddingVertical: 16,
    minHeight: 52,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: colors.studioShadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.8 },
  btnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: colors.ink,
    letterSpacing: 0.2,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.foreground,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.mutedForeground,
  },
  footerLink: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: colors.foreground,
    textDecorationLine: 'underline',
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  forgotText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.foreground,
    textDecorationLine: 'underline',
  },
});
