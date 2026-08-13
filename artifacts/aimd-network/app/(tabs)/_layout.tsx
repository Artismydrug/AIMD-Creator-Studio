import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/lib/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function LoginPrompt() {
  const colors = useColors();
  const { login, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: insets.bottom + 40,
      gap: 24,
      paddingHorizontal: 32,
    },
    title: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 28,
      color: colors.primary,
      letterSpacing: 3,
    },
    subtitle: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    btn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 40,
      paddingVertical: 14,
      width: '100%',
      alignItems: 'center',
    },
    btnText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      color: colors.primaryForeground,
    },
  });

  if (isLoading) {
    return (
      <View style={s.container}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>AIMD</Text>
      <Text style={s.subtitle}>The network for independent music producers and sound designers.</Text>
      <TouchableOpacity style={s.btn} onPress={login}>
        <Text style={s.btnText}>Log In / Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const { isAuthenticated, isLoading } = useAuth();

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: Platform.OS === 'web' ? 60 : undefined,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarIcon: ({ color, size }) => (
            <Feather name="activity" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
