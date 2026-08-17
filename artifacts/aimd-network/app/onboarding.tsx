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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUpdateCurrentUser } from '@workspace/api-client-react';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,28}$/;

function validateUsername(value: string): string | null {
  if (value.length < 3) return 'Must be at least 3 characters.';
  if (value.length > 28) return 'Must be 28 characters or fewer.';
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Only letters, numbers, and underscores allowed.';
  return null;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { mutate: updateUser, isPending } = useUpdateCurrentUser({
    mutation: {
      onSuccess: () => {
        router.replace('/(tabs)');
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          'Something went wrong. Please try again.';
        setServerError(msg);
      },
    },
  });

  const handleChangeText = (text: string) => {
    setUsername(text);
    setClientError(null);
    setServerError(null);
  };

  const handleSubmit = () => {
    const trimmed = username.trim();
    const validationError = validateUsername(trimmed);
    if (validationError) {
      setClientError(validationError);
      return;
    }
    updateUser({ data: { username: trimmed } });
  };

  const displayError = clientError || serverError;
  const isValid = USERNAME_REGEX.test(username.trim());

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.container,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.logo}>AIMD</Text>

        <Text style={s.heading}>Choose your username</Text>
        <Text style={s.subheading}>
          This is how other creators will find and know you. You can change it later.
        </Text>

        <Text style={s.label}>Username</Text>
        <View style={s.inputWrapper}>
          <Text style={s.prefix}>@</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={handleChangeText}
            placeholder="your_name"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            maxLength={28}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {displayError ? (
          <Text style={s.error}>{displayError}</Text>
        ) : username.length > 0 && isValid ? (
          <Text style={s.hint}>Looks good!</Text>
        ) : username.length > 0 ? (
          <Text style={s.hint}>3–28 chars • letters, numbers, underscores</Text>
        ) : (
          <Text style={s.hint}>3–28 chars • letters, numbers, underscores</Text>
        )}

        <Pressable
          style={({ pressed }) => [
            s.btn,
            (!isValid || isPending) && s.btnDisabled,
            pressed && s.btnPressed,
          ]}
          onPress={handleSubmit}
          disabled={!isValid || isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>Continue</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 28,
    gap: 10,
  },
  logo: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    color: '#e8e3d5',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 32,
  },
  heading: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    color: '#e8e3d5',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: '#aaa',
    marginBottom: 6,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  prefix: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#555',
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: '#e8e3d5',
  },
  error: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: '#e05c5c',
    marginTop: 2,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  btn: {
    backgroundColor: '#b8532d',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.8 },
  btnText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 1,
  },
});
