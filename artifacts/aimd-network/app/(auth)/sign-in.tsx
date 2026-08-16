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
import { useSignIn, useAuth, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { type Href, Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Handle any pending authentication sessions on Android
WebBrowser.maybeCompleteAuthSession();

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

  const handleSignIn = async () => {
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;

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
    } else if (signIn.status === 'needs_client_trust') {
      await signIn.mfa.sendEmailCode();
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code });
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
    }
  };

  const handleOAuth = useCallback(async (provider: 'oauth_google' | 'oauth_apple') => {
    const key = provider === 'oauth_google' ? 'google' : 'apple';
    try {
      setOauthLoading(key);
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: provider,
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => {
            router.replace(decorateUrl('/') as Href);
          },
        });
      }
    } catch (err) {
      console.error('OAuth error:', JSON.stringify(err, null, 2));
    } finally {
      setOauthLoading(null);
    }
  }, [startSSOFlow, router]);

  if (isSignedIn) return null;

  if (signIn.status === 'needs_client_trust') {
    return (
      <View style={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }]}>
        <Text style={s.title}>AIMD</Text>
        <Text style={s.subtitle}>Check your email for a verification code</Text>

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

        <Pressable
          style={({ pressed }) => [s.btn, (fetchStatus === 'fetching' || !code) && s.btnDisabled, pressed && s.btnPressed]}
          onPress={handleVerify}
          disabled={fetchStatus === 'fetching' || !code}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Verify</Text>}
        </Pressable>

        <Pressable onPress={() => signIn.mfa.sendEmailCode()} style={s.secondary}>
          <Text style={s.secondaryText}>Resend code</Text>
        </Pressable>
        <Pressable onPress={() => signIn.reset()} style={s.secondary}>
          <Text style={s.secondaryText}>Start over</Text>
        </Pressable>
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
        <Text style={s.title}>AIMD</Text>
        <Text style={s.subtitle}>Sign in to your creator account</Text>

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
        {errors.fields.identifier && <Text style={s.error}>{errors.fields.identifier.message}</Text>}

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
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Log In</Text>}
        </Pressable>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up">
            <Text style={s.footerLink}>Sign up</Text>
          </Link>
        </View>
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
    fontSize: 36,
    color: '#e8e3d5',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 4,
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
