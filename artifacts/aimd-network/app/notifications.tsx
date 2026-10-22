import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View,
  type ImageStyle, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  getBaseUrl,
  getGetNotificationsQueryKey,
  useGetNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@workspace/api-client-react';
import type { Notification } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

function imageUrl(url: string | null | undefined) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  const base = getBaseUrl();
  return base ? `${base}${url}` : url;
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function notificationText(notification: Notification) {
  const actor = notification.actor?.username ?? 'Someone';
  switch (notification.type) {
    case 'commission_inquiry':
      return notification.inquirySummary ?? 'New commission inquiry for your studio';
    case 'direct_message': return `${actor} sent you a message`;
    case 'follow': return `${actor} started following you`;
    case 'like': return `${actor} liked your post`;
    case 'critique': return `${actor} left a critique on your post`;
    default: return `${actor} interacted with your work`;
  }
}

type NotificationStyles = {
  row: StyleProp<ViewStyle>;
  unread: StyleProp<ViewStyle>;
  avatar: StyleProp<ViewStyle>;
  inquiryAvatar: StyleProp<ViewStyle>;
  avatarImage: StyleProp<ImageStyle>;
  initials: StyleProp<TextStyle>;
  copy: StyleProp<ViewStyle>;
  body: StyleProp<TextStyle>;
  unreadText: StyleProp<TextStyle>;
  time: StyleProp<TextStyle>;
  dot: StyleProp<ViewStyle>;
};

const NotificationRow = React.memo(function NotificationRow({
  item,
  styles,
  onOpen,
}: {
  item: Notification;
  styles: NotificationStyles;
  onOpen: (notification: Notification) => void;
}) {
  const colors = useColors();
  const avatar = imageUrl(item.actor?.avatarUrl);
  const inquiry = item.type === 'commission_inquiry';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={notificationText(item)}
      onPress={() => onOpen(item)}
      style={[styles.row, !item.readAt && styles.unread]}
      testID={`notification-${item.id}`}
    >
      <View style={[styles.avatar, inquiry && styles.inquiryAvatar]}>
        {inquiry
          ? <Feather name="file-text" size={19} color={colors.studioInk} />
          : avatar
            ? <Image source={{ uri: avatar }} style={styles.avatarImage} contentFit="cover" cachePolicy="memory-disk" recyclingKey={avatar} allowDownscaling priority="low" />
            : <Text style={styles.initials}>{item.actor?.username.slice(0, 2).toUpperCase() ?? 'A'}</Text>}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.body, !item.readAt && styles.unreadText]}>{notificationText(item)}</Text>
        <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
      </View>
      {!item.readAt ? <View style={styles.dot} /> : null}
    </Pressable>
  );
});

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'inquiries'>('all');
  const { data, isLoading, isError, refetch } = useGetNotifications({ query: { queryKey: getGetNotificationsQueryKey(), refetchInterval: 15_000 } });
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  const markRead = useMarkNotificationRead({ mutation: {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    onError: () => Alert.alert('Could not mark as read', 'The inquiry is still available. Pull down to refresh.'),
  } });
  const markAllRead = useMarkAllNotificationsRead({ mutation: {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    onError: () => Alert.alert('Could not mark as read', 'Please try again.'),
  } });
  const notifications = data?.notifications ?? [];
  const visibleNotifications = useMemo(() => notifications.filter((item) =>
    filter === 'unread' ? !item.readAt : filter === 'inquiries' ? item.type === 'commission_inquiry' : true), [filter, notifications]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);
  const openNotification = useCallback((notification: Notification) => {
    if (!notification.readAt) markRead.mutate({ id: notification.id });
    if (notification.conversationDestination?.conversationId) {
      router.push({ pathname: '/conversation/[id]', params: { id: notification.conversationDestination.conversationId } });
    } else if (notification.postDestination?.postId) {
      router.push({ pathname: '/feed', params: { postId: notification.postDestination.postId } });
    } else if (notification.inquiryDestination?.bookingId) {
      router.push({
        pathname: '/creator-inquiry/[bookingId]',
        params: { bookingId: notification.inquiryDestination.bookingId },
      });
    } else if (notification.actor?.id) {
      router.push({ pathname: '/creator/[creatorId]', params: { creatorId: notification.actor.id } });
    }
  }, [markRead.mutate, router]);
  const s = useMemo(() => StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    header: { alignItems: 'center', borderBottomColor: colors.foreground, borderBottomWidth: 2, flexDirection: 'row', paddingBottom: 12, paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8, backgroundColor: colors.studioPaper },
    title: { color: colors.foreground, flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 25, letterSpacing: -0.7 },
    back: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    count: { minWidth: 28, minHeight: 28, borderRadius: 10, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioYellow, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    countText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
    filter: { minHeight: 40, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: colors.studioInk, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    selectedFilter: { backgroundColor: colors.studioYellow, transform: [{ rotate: '-2deg' }] },
    filterText: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    markAll: { color: colors.primary, fontFamily: 'DMSans_600SemiBold', fontSize: 13, padding: 6 },
    row: { alignItems: 'center', borderColor: colors.foreground, borderWidth: 1.5, borderRadius: 17, flexDirection: 'row', gap: 12, padding: 13, marginHorizontal: 14, marginTop: 9, backgroundColor: colors.card, shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
    unread: { backgroundColor: colors.coralWash },
    avatar: { alignItems: 'center', backgroundColor: colors.studioLavender, borderWidth: 1.5, borderColor: colors.foreground, borderRadius: 16, height: 44, justifyContent: 'center', overflow: 'hidden', width: 44 },
    inquiryAvatar: { backgroundColor: colors.studioYellow },
    avatarImage: { height: 44, width: 44 },
    initials: { color: colors.primary, fontFamily: 'DMSans_700Bold', fontSize: 15 },
    copy: { flex: 1 },
    body: { color: colors.foreground, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
    unreadText: { fontFamily: 'DMSans_600SemiBold' },
    time: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 3 },
    dot: { backgroundColor: colors.primary, borderRadius: 4, height: 8, width: 8 },
    state: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center', padding: 28 },
    stateTitle: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 17 },
    stateText: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 14, textAlign: 'center' },
    retry: { borderColor: colors.primary, borderRadius: colors.radius, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 9 },
  }), [colors, insets.top]);
  const renderNotification = useCallback(({ item }: { item: Notification }) => (
    <NotificationRow item={item} onOpen={openNotification} styles={s} />
  ), [openNotification, s]);

  return <View style={s.screen} testID="notifications-screen">
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.back}><Feather name="arrow-left" color={colors.foreground} size={22} /></Pressable>
      <Text style={s.title}>Inbox</Text>
      {!!data?.unreadCount && <View style={s.count} accessibilityLabel={`${data.unreadCount} unread notifications`}><Text style={s.countText}>{data.unreadCount > 99 ? '99+' : data.unreadCount}</Text></View>}
      {notifications.some((item) => !item.readAt) ? <Pressable style={s.back} accessibilityRole="button" accessibilityLabel="Mark all notifications as read" disabled={markAllRead.isPending} onPress={() => markAllRead.mutate()} testID="mark-all-notifications-read"><Feather name="check-square" color={colors.foreground} size={21} /></Pressable> : null}
    </View>
    <View style={s.filters}>
      {(['all', 'unread', 'inquiries'] as const).map((value) => (
        <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[s.filter, filter === value && s.selectedFilter]}>
          <Text style={s.filterText}>{value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Inquiries'}</Text>
        </Pressable>
      ))}
    </View>
    {isLoading ? <View style={s.state}><ActivityIndicator color={colors.primary} size="large" /></View>
      : isError ? <View style={s.state}><Feather name="wifi-off" color={colors.mutedForeground} size={42} /><Text style={s.stateTitle}>Couldn’t load notifications</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry notifications" onPress={() => refetch()} style={s.retry}><Text style={[s.markAll, { padding: 0 }]}>Try again</Text></Pressable></View>
      : <FlatList
        data={visibleNotifications}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderNotification}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={40}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        ListEmptyComponent={<View style={s.state}><Feather name="bell-off" color={colors.mutedForeground} size={46} /><Text style={s.stateTitle}>You’re all caught up</Text><Text style={s.stateText}>{filter === 'inquiries' ? 'New project inquiries will show up here.' : 'New activity from creators will show up here.'}</Text></View>}
      />}
  </View>;
}