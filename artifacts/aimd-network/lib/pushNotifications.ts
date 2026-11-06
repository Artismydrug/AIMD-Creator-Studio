import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isAndroidExpoGo, supportsRemotePushNotifications } from './notificationCapabilities';
import {
  getNotificationPreferences,
  registerNotificationDevice,
  unregisterNotificationDevice,
} from '@workspace/api-client-react';

export const nativeNotifications = Platform.OS === 'ios' || Platform.OS === 'android';
const bindingKey = 'aimd:push-device-binding';
let activeAccount: string | null = null;
export function setPushNotificationAccount(owner: string | null) { activeAccount = owner; }
function assertAccount(owner: string) {
  if (!owner || activeAccount !== owner) throw new Error('Your account changed. Reopen Notification settings.');
}
type Binding = { owner: string; expoPushToken: string; platform: 'ios' | 'android' };
export function pushProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}
async function loadBinding(): Promise<Binding | null> {
  const raw = await AsyncStorage.getItem(bindingKey);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Binding;
  if (typeof parsed.owner !== 'string' || typeof parsed.expoPushToken !== 'string' ||
      !['ios', 'android'].includes(parsed.platform)) throw new Error('Saved push settings could not be read.');
  return parsed;
}

export async function enablePushDevice(owner: string, askPermission: boolean): Promise<boolean> {
  assertAccount(owner);
  if (!nativeNotifications) throw new Error('Phone push alerts are available in the installed iOS or Android app.');
  if (!supportsRemotePushNotifications) {
    throw new Error('Remote push alerts are unavailable in the Android Expo Go preview. The in-app inbox still works.');
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && !askPermission) return false;
  const projectId = pushProjectId();
  if (!projectId) throw new Error('Phone push setup has not been linked for this build yet. Habit reminders and the in-app inbox still work.');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('creator-studio-updates', {
      name: 'Messages and followers', importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  if (!permission.granted) throw new Error('Notifications are not allowed. Enable them in your device Settings.');
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let expoPushToken: string;
  try {
    expoPushToken = (await Promise.race([
      Notifications.getExpoPushTokenAsync({ projectId }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Push registration timed out.')), 15000); }),
    ])).data;
  } catch {
    throw new Error('Could not register phone push alerts. Check your connection and try the latest installed build.');
  } finally { if (timeout) clearTimeout(timeout); }
  assertAccount(owner);
  const platform = Platform.OS as 'ios' | 'android';
  await registerNotificationDevice({ expoPushToken, platform });
  assertAccount(owner);
  await AsyncStorage.setItem(bindingKey, JSON.stringify({ owner, expoPushToken, platform }));
  return true;
}

export async function unregisterPushDevice(owner: string) {
  assertAccount(owner);
  const binding = await loadBinding();
  if (!binding || binding.owner !== owner) return;
  assertAccount(owner);
  await unregisterNotificationDevice({ expoPushToken: binding.expoPushToken, platform: binding.platform });
  assertAccount(owner);
  await AsyncStorage.removeItem(bindingKey);
}

export async function syncPushDevice(owner: string) {
  if (!nativeNotifications || isAndroidExpoGo) return;
  assertAccount(owner);
  const preferences = await getNotificationPreferences();
  const binding = await loadBinding();
  assertAccount(owner);
  if (binding && binding.owner !== owner) {
    // Reassociate before removing so a shared phone cannot keep receiving the
    // previous account's pushes when the new account has push turned off.
    await registerNotificationDevice({ expoPushToken: binding.expoPushToken, platform: binding.platform });
    assertAccount(owner);
    await AsyncStorage.setItem(bindingKey, JSON.stringify({ ...binding, owner }));
  }
  if (preferences.directMessages || preferences.newFollowers) await enablePushDevice(owner, false);
}
