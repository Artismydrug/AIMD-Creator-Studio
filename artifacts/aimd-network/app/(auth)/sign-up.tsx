import React, { useState } from 'react';
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
import { useSignUp, useAuth } from '@clerk/expo';
import { type Href, Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const handleSignUp = async () => {
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === 'complete') {
      await signUp.finalize({
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

  if (signUp.status === 'complete' || isSignedIn) return null;

  // Email verification step
  if (
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0
  ) {
    return (
      <View style={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }]}>
        <Text style={s.title}>AIMD</Text>
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

        <Pressable
          style={({ pressed }) => [s.btn, (fetchStatus === 'fetching' || !code) && s.btnDisabled, pressed && s.btnPressed]}
          onPress={handleVerify}
          disabled={fetchStatus === 'fetching' || !code}
        >
          {fetchStatus === 'fetching'
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Verify Email</Text>}
        </Pressable>

        <Pressable onPress={() => signUp.verifications.sendEmailCode()} style={s.secondary}>
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
        <Text style={s.title}>AIMD</Text>
        <Text style={s.subtitle}>Join the creator network — free forever</Text>

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
    marginBottom: 24,
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
