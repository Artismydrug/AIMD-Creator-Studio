import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { customFetch } from '@workspace/api-client-react';
import { createReminderEngine, REMINDER_PREFIX, reminderKey, type HabitReminder, type ReminderInput } from './habitReminderEngine';
export type { HabitReminder } from './habitReminderEngine';

const native = Platform.OS === 'ios' || Platform.OS === 'android';
let account: string | null = null;
let pending: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const result = pending.then(fn);
  pending = result.catch(() => undefined);
  return result;
}
if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
    }),
  });
}
const engine = createReminderEngine({
  read: (key) => AsyncStorage.getItem(key),
  write: (key, value) => AsyncStorage.setItem(key, value),
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  schedule: async (id, reminder) => {
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    if (!requests.some((r) => r.identifier === id) && requests.length >= 60) {
      throw new Error('This device has too many scheduled alerts. Turn off another reminder first.');
    }
    return Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title: 'Creator Studio — daily practice', body: reminder.message, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour, minute: reminder.minute, channelId: 'habit-reminders',
      },
    });
  },
});
async function channel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('habit-reminders', {
    name: 'Daily habit reminders', importance: Notifications.AndroidImportance.DEFAULT,
  });
}
function assertAccount(owner: string) {
  if (!native) throw new Error('Habit notifications require the iOS or Android app.');
  if (!owner || owner !== account) throw new Error('Your account changed. Reopen the habit and try again.');
}
export const loadHabitReminders = (owner: string): Promise<HabitReminder[]> => engine.load(owner);
export function saveHabitReminder(owner: string, habitId: number, _habitName: string, input: ReminderInput) {
  return serialized(async () => {
    assertAccount(owner);
    await channel();
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    if (!permission.granted) throw new Error('Notification permission was denied. Enable notifications in device settings.');
    assertAccount(owner);
    return engine.save(owner, habitId, input);
  });
}
export function removeHabitReminder(owner: string, habitId: number) {
  if (!native) return Promise.resolve();
  return serialized(() => engine.remove(owner, habitId));
}
export function setHabitReminderAccount(owner: string | null) {
  // Change the guard synchronously, even when another operation is awaiting permission.
  account = owner;
  if (!native) return Promise.resolve();
  return serialized(async () => {
    if (account !== owner) return;
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    const ownPrefix = owner ? `${REMINDER_PREFIX}${encodeURIComponent(owner)}:` : null;
    for (const request of requests) {
      if (request.identifier.startsWith(REMINDER_PREFIX) && (!ownPrefix || !request.identifier.startsWith(ownPrefix))) {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      }
    }
    if (!owner || account !== owner || !(await Notifications.getPermissionsAsync()).granted) return;
    await channel();
    const saved = await engine.load(owner);
    for (const request of requests) {
      if (ownPrefix && request.identifier.startsWith(ownPrefix) &&
          !saved.some((r) => r.notificationId === request.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      }
    }
    if (!saved.length) return;
    // Keep valid local alerts running if this refresh cannot reach the API.
    const response = await customFetch<{ habits: { id: number }[] }>('/api/habits');
    if (account !== owner) return;
    for (const reminder of saved) {
      if (account !== owner) return;
      if (response.habits.some((h) => h.id === reminder.habitId)) {
        await engine.save(owner, reminder.habitId, reminder);
      } else {
        await engine.remove(owner, reminder.habitId);
      }
    }
  });
}
export function clearHabitReminders(owner: string) {
  return serialized(async () => {
    try {
      if (native) for (const request of await Notifications.getAllScheduledNotificationsAsync()) {
        if (request.identifier.startsWith(`${REMINDER_PREFIX}${encodeURIComponent(owner)}:`)) {
          await Notifications.cancelScheduledNotificationAsync(request.identifier);
        }
      }
    } finally {
      await AsyncStorage.removeItem(reminderKey(owner));
    }
  });
}
