import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@clerk/expo';
import FrostedTabBar from '@/components/FrostedTabBar';
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import { PRIMARY_LANDING_TAB } from '@/lib/primaryNavigation';

export const unstable_settings = { initialRouteName: 'challenge-habits' };

export default function TabLayout() {
  const colors = useColors();
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading spinner while Clerk initialises
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Redirect unauthenticated users to the sign-in screen
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      initialRouteName={PRIMARY_LANDING_TAB}
      backBehavior="history"
      screenLayout={({ children, route }) => <ScreenErrorBoundary key={route.key} routeName={route.name}>{children}</ScreenErrorBoundary>}
      tabBar={(props) => <FrostedTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        animation: 'none',
      }}
    >
      <Tabs.Screen
        name="challenge-habits"
        options={{
          title: 'Habits',
          tabBarIcon: ({ color, size }) => (
            <Feather name="zap" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workshops"
        options={{
          title: 'Workshops',
          tabBarIcon: ({ color, size }) => (
            <Feather name="play-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile-tab"
        options={{
          title: 'Your Studio',
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
      {/* Root opens daily practice; the older dashboard stays reachable from Studio. */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      {/* These screens remain deep-linkable, but are not bottom-navigation tabs. */}
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="habits" options={{ href: null }} />
      <Tabs.Screen name="challenges" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="hq" options={{ href: null }} />
    </Tabs>
  );
}
