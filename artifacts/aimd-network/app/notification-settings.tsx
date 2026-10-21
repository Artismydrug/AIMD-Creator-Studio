import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetNotificationPreferencesQueryKey,
  useGetNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { getHabitRemindersEnabled, setHabitRemindersEnabled } from '@/lib/habitReminders';
import { enablePushDevice, nativeNotifications, pushProjectId, unregisterPushDevice } from '@/lib/pushNotifications';

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const client = useQueryClient();
  const preferences = useGetNotificationPreferences({ query: {
    queryKey: getGetNotificationPreferencesQueryKey(), enabled: !!userId,
  } });
  const update = useUpdateNotificationPreferences();
  const [habitEnabled, setHabitEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (userId) void getHabitRemindersEnabled(userId).then((value) => {
      if (active) setHabitEnabled(value);
    }).catch(() => { if (active) setError('Could not read the saved habit alert setting.'); });
    return () => { active = false; };
  }, [userId]);

  async function changePush(field: 'directMessages' | 'newFollowers', value: boolean) {
    if (!userId || busy) return;
    setBusy(true); setError(null);
    try {
      if (value) await enablePushDevice(userId, true);
      const saved = await update.mutateAsync({ data: { [field]: value } });
      client.setQueryData(getGetNotificationPreferencesQueryKey(), saved);
      if (!saved.directMessages && !saved.newFollowers) {
        // Preferences already prevent all pushes even if device cleanup fails.
        await unregisterPushDevice(userId).catch(() => undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the notification setting. Please try again.');
    } finally { setBusy(false); }
  }
  async function changeHabits(value: boolean) {
    if (!userId || busy) return;
    setBusy(true); setError(null);
    try {
      await setHabitRemindersEnabled(userId, value);
      setHabitEnabled(value);
    } catch (e) {
      setHabitEnabled(await getHabitRemindersEnabled(userId).catch(() => null));
      setError(e instanceof Error ? e.message : 'Could not change habit alerts.');
    } finally { setBusy(false); }
  }
  const switchRow = (label: string, hint: string, value: boolean, action: (next: boolean) => void, disabled = false) => (
    <View style={[s.row, { borderColor: colors.border }]}>
      <View style={s.rowText}>
        <Text style={[s.label, { color: colors.foreground }]}>{label}</Text>
        <Text style={[s.hint, { color: colors.mutedForeground }]}>{hint}</Text>
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={action}
        disabled={disabled || busy || !nativeNotifications}
        trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.card} />
    </View>
  );

  return (
    <View style={[s.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
       <View style={[s.header, { backgroundColor: colors.studioPaper, borderBottomColor: colors.studioInk }]}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back" accessibilityRole="button" style={s.back}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[s.title, { color: colors.foreground }]}>Notification settings</Text>
      </View>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>
        {!userId ? (
          <Text style={[s.hint, { color: colors.foreground }]}>Sign in to manage your notifications.</Text>
        ) : <>
          {!nativeNotifications && <Text style={[s.hint, { color: colors.mutedForeground }]}>Phone alerts are managed in the installed iOS or Android app.</Text>}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.section, { color: colors.foreground }]}>Habit reminders</Text>
            {switchRow('Daily habit alerts', 'Pause or resume your saved reminders on this device. Your reminder times are kept.', habitEnabled === true,
              (value) => { void changeHabits(value); }, habitEnabled === null)}
            <Pressable onPress={() => router.push('/(tabs)/habits')} accessibilityRole="button" style={s.link}>
              <Feather name="clock" size={18} color={colors.primary} />
              <Text style={[s.linkText, { color: colors.primary }]}>Set times on your habit cards</Text>
              <Feather name="chevron-right" size={18} color={colors.primary} />
            </Pressable>
          </View>
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.section, { color: colors.foreground }]}>Phone push alerts</Text>
            <Text style={[s.hint, { color: colors.mutedForeground }]}>Off until you choose to enable them. Push preferences apply to your account; each phone also needs permission.</Text>
            {preferences.isLoading ? <ActivityIndicator color={colors.primary} /> : preferences.isError ? (
              <Pressable onPress={() => { void preferences.refetch(); }} style={s.link} accessibilityRole="button">
                <Text style={[s.linkText, { color: colors.primary }]}>Couldn’t load preferences. Tap to retry.</Text>
              </Pressable>
            ) : <>
              {switchRow('Direct messages', 'A private alert when another creator messages you.', preferences.data?.directMessages ?? false,
                (value) => { void changePush('directMessages', value); })}
              {switchRow('New followers', 'An alert when a creator follows your profile.', preferences.data?.newFollowers ?? false,
                (value) => { void changePush('newFollowers', value); })}
            </>}
            {nativeNotifications && !pushProjectId() && <Text style={[s.hint, { color: colors.mutedForeground }]}>Phone push delivery still needs to be connected for this build. Habit reminders are available now.</Text>}
            <Text style={[s.hint, { color: colors.mutedForeground }]}>Your in-app inbox stays available when push is off. Event and workshop announcements aren’t connected to push alerts yet.</Text>
          </View>
          {error && <Text accessibilityRole="alert" style={[s.hint, { color: colors.destructive }]}>{error}</Text>}
          {busy && <ActivityIndicator color={colors.primary} />}
          {nativeNotifications && <Pressable accessibilityRole="button" onPress={() => {
            void Linking.openSettings().catch(() => setError('Open your phone’s Settings to change Creator Studio notification permissions.'));
          }} style={s.link}>
            <Feather name="settings" size={18} color={colors.primary} />
            <Text style={[s.linkText, { color: colors.primary }]}>Open device notification settings</Text>
          </Pressable>}
          <Text style={[s.hint, { color: colors.mutedForeground }]}>Your phone’s Focus, Do Not Disturb, and notification permissions can silence alerts.</Text>
        </>}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2 },
  back: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 21, flex: 1 },
  content: { padding: 20, gap: 18 },
  card: { borderWidth: 1.5, borderRadius: 20, padding: 16, gap: 12, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
  section: { fontFamily: 'DMSans_700Bold', fontSize: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: 5 },
  label: { fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
  hint: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  linkText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, flexShrink: 1 },
});
