import React, { useCallback, useEffect, useState } from 'react';
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
import { useSignUp, useAuth, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { type Href, Link, Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Handle any pending authentication sessions on Android
WebBrowser.maybeCompleteAuthSession();

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

export default function SignUpScreen() {
  useWarmUpBrowser();

  const { signUp, errors, fetchStatus } = useSignUp();
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

  const handleSignUp = async () => {
    setActionError('');
    try {
      const { error } = await signUp.password({ emailAddress: email.trim(), password });
      if (error) {
        setActionError(error.longMessage ?? error.message ?? 'Could not create your account. Please try again.');
        return;
      }
      await handleResendVerification();
    } catch {
      setActionError('Could not create your account. Check your connection and try again.');
    }
  };

  const handleVerify = async () => {
    setActionError('');
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (error) {
        setActionError(error.longMessage ?? error.message ?? 'Could not verify your email. Please try again.');
        return;
      }
      if (signUp.status === 'complete') {
        await signUp.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl('/');
            if (!url.startsWith('http')) {
              // Route new email sign-ups through the username onboarding step
              router.replace('/onboarding' as Href);
            }
          },
        });
      }
    } catch {
      setActionError('Could not verify your email. Check your connection and try again.');
    }
  };

  const handleResendVerification = async () => {
    setActionError('');
    try {
      const { error } = await signUp.verifications.sendEmailCode();
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
        setOauthError(`${providerName} sign-up needs one more step before your account can open. Please try again.`);
      } else {
        setOauthError(`${providerName} sign-up did not finish. Please try again.`);
      }
    } catch (err) {
      console.error('OAuth error:', JSON.stringify(err, null, 2));
      setOauthError(`${providerName} sign-up is temporarily unavailable. Please try again.`);
    } finally {
      setOauthLoading(null);
    }
  }, [startSSOFlow, router]);

  if (signUp.status === 'complete' || isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  // Email verification step
  if (
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0
  ) {
    return (
      <View style={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }]}>
        <Text style={s.title}>Creator Studio</Text>
        <Text style={s.appSubtitle}>by AIMD</Text>
        <Text style={s.subtitle}>Check your email for a code</Text>

        <TextInput
          style={s.input}
          value={code}
          placeholder="Verification code"
          placeholderTextColor="#555"
          onChangeText={setCode}
          keyboardType="numeric"
          autoFocus
        />
        {errors.fields.code && <Text style={s.error}>{errors.fields.code.message}</Text>}
        {!!actionError && <Text style={s.error} accessibilityRole="alert" testID="sign-up-action-error">{actionError}</Text>}

        <Pressable
          style={({ pressed }) => [s.btn, (fetchStatus === 'fetching' || !code) && s.btnDisabled, pressed && s.btnPressed]}
          onPress={handleVerify}
          disabled={fetchStatus === 'fetching' || !code}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Verify Email</Text>}
        </Pressable>

        <Pressable onPress={handleResendVerification} style={s.secondary} disabled={fetchStatus === 'fetching'}>
          <Text style={s.secondaryText}>Resend code</Text>
        </Pressable>

        {/* Required by Clerk for bot-protection */}
        <View nativeID="clerk-captcha" />
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
        <Text style={s.tagline}>Discipline Eats Talent</Text>
        <Text style={s.subtitle}>Start free — no credit card required</Text>

        {/* OAuth buttons */}
        <Pressable
          style={({ pressed }) => [s.oauthBtn, pressed && s.btnPressed, oauthLoading === 'google' && s.btnDisabled]}
          onPress={() => handleOAuth('oauth_google')}
          disabled={oauthLoading !== null}
        >
          {oauthLoading === 'google'
            ? <ActivityIndicator color="#e8e3d5" />
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
              ? <ActivityIndicator color="#e8e3d5" />
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
          placeholderTextColor="#555"
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.fields.emailAddress && <Text style={s.error}>{errors.fields.emailAddress.message}</Text>}

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          value={password}
          placeholder="••••••••"
          placeholderTextColor="#555"
          onChangeText={setPassword}
          secureTextEntry
        />
        {errors.fields.password && <Text style={s.error}>{errors.fields.password.message}</Text>}
        {!!actionError && <Text style={s.error} accessibilityRole="alert" testID="sign-up-action-error">{actionError}</Text>}

        <Pressable
          style={({ pressed }) => [
            s.btn,
            (!email || !password || fetchStatus === 'fetching') && s.btnDisabled,
            pressed && s.btnPressed,
          ]}
          onPress={handleSignUp}
          disabled={!email || !password || fetchStatus === 'fetching'}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Create Account</Text>}
        </Pressable>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text style={s.footerLink}>Sign in</Text>
          </Link>
        </View>

        {/* Required by Clerk for bot-protection */}
        <View nativeID="clerk-captcha" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 28,
    gap: 8,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 32,
    color: '#e8e3d5',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 2,
  },
  appSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#b8532d',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  oauthBtn: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  oauthBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  oauthIcon: {
    fontSize: 16,
    color: '#e8e3d5',
    fontFamily: 'DMSans_700Bold',
    width: 20,
    textAlign: 'center',
  },
  oauthBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: '#e8e3d5',
  },
  oauthError: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#e05c5c',
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
    backgroundColor: '#2a2a2a',
  },
  dividerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#555',
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: '#aaa',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: '#e8e3d5',
  },
  error: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#e05c5c',
    marginTop: 4,
  },
  btn: {
    backgroundColor: '#b8532d',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.8 },
  btnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 1,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#b8532d',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#888',
  },
  footerLink: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: '#b8532d',
  },
});
