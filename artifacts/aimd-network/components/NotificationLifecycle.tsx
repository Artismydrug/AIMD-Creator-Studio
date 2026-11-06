import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { getGetCurrentUserQueryKey, useGetCurrentUser } from '@workspace/api-client-react';
import { isAndroidExpoGo } from '@/lib/notificationCapabilities';
import { nativeNotifications, syncPushDevice } from '@/lib/pushNotifications';

export default function NotificationLifecycle() {
  const { userId } = useAuth();
  const router = useRouter();
  const { data: me } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), enabled: !!userId } });
  useEffect(() => {
    if (!nativeNotifications || isAndroidExpoGo || !userId) return;
    let cancelled = false;
    const sync = () => {
      if (!cancelled) void syncPushDevice(userId).catch(() => {
        console.warn('Phone push registration needs attention in Notification settings.');
      });
    };
    sync();
    const state = AppState.addEventListener('change', (value) => { if (value === 'active') sync(); });
    const tokens = Notifications.addPushTokenListener(sync);
    return () => { cancelled = true; state.remove(); tokens.remove(); };
  }, [userId]);

  useEffect(() => {
    if (!nativeNotifications || isAndroidExpoGo || !userId || !me) return;
    const open = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      // A notification left over from a different signed-in account must not
      // take this account into that account's conversation.
      if (data.recipientUserId !== undefined && data.recipientUserId !== me.id) return;
      if (data.type === 'direct_message' && Number.isSafeInteger(data.conversationId) && Number(data.conversationId) > 0) {
        router.push({ pathname: '/conversation/[id]', params: { id: String(data.conversationId) } });
      } else if (data.type === 'habit_reminder') {
        router.push('/(tabs)/habits');
      } else {
        router.push('/notifications');
      }
      void Notifications.clearLastNotificationResponseAsync();
    };
    const listener = Notifications.addNotificationResponseReceivedListener(open);
    let active = true;
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (active && response) open(response); }).catch(() => undefined);
    return () => { active = false; listener.remove(); };
  }, [userId, me?.id, router]);
  return null;
}
