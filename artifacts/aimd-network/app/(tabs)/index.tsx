import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/telemetry';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
  Alert,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import MonthlyMemberDrops from '@/components/MonthlyMemberDrops';
import HabitPracticeSummaryCard from '@/components/HabitPracticeSummaryCard';
import StickerJamPracticeCard from '@/components/StickerJamPracticeCard';
import {
  useGetProgress,
  getGetProgressQueryKey,
  getListBadgesQueryKey,
  useCheckInProgress,
  useSpinDailyReward,
  getGetUserProfileQueryKey,
  useGetUserProfile,
  getBaseUrl,
  DailySpinResult,
  useGetCurrentUser,
  useGetNotifications,
  getGetNotificationsQueryKey,
  getGetRewardsQueryKey,
  getListHabitsQueryKey,
  getListHabitLogsQueryKey,
} from '@workspace/api-client-react';

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getBaseUrl();
  return base ? `${base}${url}` : url;
}

function displayCount(value: number | null | undefined): number | string {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : '—';
}

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions()?.timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const timezone = deviceTimezone();

  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressIsError,
    refetch: refetchProgress
  } = useGetProgress(
    { timezone },
    {
      query: {
        queryKey: getGetProgressQueryKey({ timezone }),
        retry: 0,
      },
      request: { timeoutMs: 10_000 },
    },
  );

  const { data: currentUser, refetch: refetchCurrentUser } = useGetCurrentUser();
  const profileUserId = typeof currentUser?.id === 'number' && Number.isFinite(currentUser.id) && currentUser.id > 0
    ? currentUser.id : null;
  const { data: notifications } = useGetNotifications({
    query: { queryKey: getGetNotificationsQueryKey(), refetchInterval: 60_000 },
  });
  const {
    data: profileSnapshot,
    isError: profileIsError,
    refetch: refetchProfileSnapshot,
  } = useGetUserProfile(profileUserId ?? 0, {
    query: {
      enabled: profileUserId !== null,
      queryKey: profileUserId !== null ? getGetUserProfileQueryKey(profileUserId) : [],
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProgress(),
        refetchCurrentUser(),
        ...(profileUserId !== null ? [refetchProfileSnapshot()] : []),
        queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListHabitLogsQueryKey() }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchProgress, refetchCurrentUser, refetchProfileSnapshot, profileUserId, queryClient]);

  // Mutations
  const checkInMut = useCheckInProgress({
    mutation: {
      onSuccess: (data) => {
        if (!progress?.checkedInToday && data?.checkedInToday) trackEvent('daily_check_in_completed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey({ timezone }) });
        queryClient.invalidateQueries({ queryKey: getListBadgesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
        void refetchCurrentUser();
      },
      onError: () => {
        Alert.alert('Check-In Failed', 'We could not record your check-in right now. Please try again.');
      }
    }
  });

  const [spinModalVisible, setSpinModalVisible] = useState(false);
  const [spinResult, setSpinResult] = useState<DailySpinResult | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const spinMut = useSpinDailyReward({
    mutation: {
      onSuccess: (data) => {
        if (!data.alreadySpun) trackEvent('point_reward_claimed', { reward_type: 'daily_spin', points_awarded: data.pointsAwarded });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        spinAnim.stopAnimation();
        setSpinResult(data);
        queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey({ timezone }) });
        queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
        void refetchCurrentUser();
      },
      onError: () => {
        spinAnim.stopAnimation();
        setSpinModalVisible(false);
        Alert.alert('Spin Failed', 'We could not process your daily spin right now. Please check your connection and try again.');
      }
    }
  });

  const handleOpenSpin = () => {
    setSpinResult(null);
    setSpinModalVisible(true);
  };

  const handleStartSpin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!reduceMotion) {
      spinAnim.setValue(0);
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    }
    spinMut.mutate({ data: { timezone } });
  };

  const handleCloseSpin = () => {
    setSpinModalVisible(false);
    setSpinResult(null);
  };

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 8;
  const unreadNotifications = notifications?.unreadCount ?? 0;
  const profileUsername = [profileSnapshot?.username, currentUser?.username]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  const profileInitials = typeof profileUsername === 'string' ? profileUsername.slice(0, 2).toUpperCase() : '?';
  const profileAvatar = resolveMediaUrl(profileSnapshot?.avatarUrl ?? currentUser?.avatarUrl);
  const recentBadges = Array.isArray(progress?.recentBadges)
    ? progress.recentBadges.filter((badge) => badge && typeof badge.name === 'string') : [];
  const nextBadge = progress?.nextBadge;
  const nextBadgePercent = typeof nextBadge?.progressPercent === 'number' && Number.isFinite(nextBadge.progressPercent)
    ? Math.max(0, Math.min(100, nextBadge.progressPercent)) : 0;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.studioBackground },
    header: {
      paddingTop: topPad,
      paddingHorizontal: 18,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    compactHeader: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 8,
    },
    compactHeaderActions: {
      alignSelf: 'flex-end',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    titleMark: {
      width: 44,
      height: 44,
      borderRadius: 15,
      transform: [{ rotate: '-5deg' }],
      backgroundColor: colors.studioLavender,
      borderWidth: 2,
      borderColor: colors.studioInk,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    titleCopy: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 26,
      color: colors.studioInk,
      letterSpacing: -0.7,
    },
    tagline: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      color: colors.studioOrangeText,
      letterSpacing: 0.4,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 0,
      flexShrink: 0,
      transform: [{ translateY: -4 }],
    },
    memberProfileGroup: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0,
    },
    profileButton: {
      width: 44,
      height: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 1,
      borderWidth: 2,
      borderColor: colors.studioInk,
      borderRadius: 22,
      backgroundColor: colors.studioLavender,
      overflow: 'hidden',
    },
    profileButtonInitials: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 14,
      color: colors.studioInk,
    },
    profileButtonAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
    },
    notificationButton: {
      width: 42,
      height: 42,
      alignSelf: 'flex-start',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    content: {
      paddingBottom: Platform.OS === 'web' ? 100 : 100,
    },
    offlineWarning: {
      backgroundColor: colors.studioPaperAlt,
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    offlineText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      color: colors.studioMuted,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 12,
    },
    centeredTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 16,
      color: colors.studioInk,
    },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.studioInk,
      borderRadius: 16,
    },
    retryBtnText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 14,
      color: colors.studioInk,
    },
    loadingCard: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 18,
      minHeight: 86,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: colors.studioLavender,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: colors.studioInk,
      overflow: 'hidden',
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    loadingText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 10,
      color: colors.studioOrangeText,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    progressBarContainer: {
      width: '100%',
      height: 6,
      backgroundColor: colors.studioPaperAlt,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.studioOrange,
    },
    // Badges block
    badgesBlock: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 18,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      borderRadius: 22,
      backgroundColor: colors.studioLavender,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    blockTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      color: colors.studioInk,
    },
    blockTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 16,
    },
    nextBadgeBox: {
      backgroundColor: colors.studioPaper,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.studioLine,
      marginBottom: 16,
    },
    nextBadgeName: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 15,
      color: colors.studioInk,
      marginBottom: 8,
    },
    nextBadgeMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    nextBadgeText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.studioMuted,
    },
    recentBadgesList: {
      gap: 12,
    },
    recentBadgeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 4,
    },
    recentBadgeName: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 15,
      color: colors.studioInk,
    },
    recentBadgeDate: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.studioMuted,
      marginLeft: 'auto',
    },
    // Actions block
    actionsBlock: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 12,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 14,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
      borderRadius: 18,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    actionBtnPrimary: {
      backgroundColor: colors.studioOrange,
      borderColor: colors.studioInk,
    },
    actionBtnText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
      color: colors.studioInk,
    },
    actionBtnTextPrimary: {
      color: colors.studioInk,
    },
    // Challenge block
    challengeBlock: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 20,
      borderWidth: 2,
      borderColor: colors.studioInk,
      borderRadius: 24,
      backgroundColor: colors.studioOrange,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    challengeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    challengeTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 18,
      color: colors.studioInk,
    },
    challengeTheme: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.studioVioletText,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    challengePrompt: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.studioInk,
      lineHeight: 22,
      marginBottom: 16,
    },
    challengePrize: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 13,
      color: colors.studioInk,
      marginBottom: 8,
    },
    challengeMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
    },
    challengeMetaText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.studioMuted,
    },
    challengeSubmitted: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: colors.studioPaper,
      borderRadius: 15,
      justifyContent: 'center',
    },
    challengeSubmittedText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 14,
      color: colors.studioInk,
    },
    submissionsSection: {
      marginTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.studioLine,
      paddingTop: 18,
      gap: 12,
    },
    submissionsHeading: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      color: colors.studioInk,
    },
    submissionCard: {
      borderWidth: 1,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
      padding: 12,
      gap: 10,
    },
    submissionAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    submissionAuthor: {
      flex: 1,
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.studioInk,
    },
    submissionMedia: {
      width: '100%',
      height: 190,
      backgroundColor: colors.studioPaperAlt,
    },
    submissionVideo: {
      height: 150,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.studioPaperAlt,
    },
    submissionVideoText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.studioMuted,
    },
    submissionCaption: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 20,
      color: colors.studioInk,
    },
    proofSection: {
      gap: 9,
      marginBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.studioLine,
      paddingTop: 14,
    },
    proofLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    proofLabel: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 14,
      color: colors.studioInk,
    },
    proofRequired: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 11,
      color: colors.studioVioletText,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    proofHint: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      lineHeight: 17,
      color: colors.studioMuted,
    },
    proofAction: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.studioViolet,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    proofActionSecondary: {
      borderColor: colors.studioLine,
    },
    proofActionText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.studioViolet,
    },
    proofActionTextSecondary: {
      color: colors.studioMuted,
    },
    proofPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.studioPaperAlt,
      padding: 10,
    },
    proofPreviewImage: {
      width: 64,
      height: 64,
      backgroundColor: colors.studioPaper,
    },
    proofPreviewIcon: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.studioPaper,
    },
    proofPreviewCopy: { flex: 1, gap: 3 },
    proofPreviewTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.studioInk,
    },
    proofPreviewMeta: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      color: colors.studioMuted,
    },
    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
    modalOverlayCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 20 },
    sheet: { backgroundColor: colors.studioPaper, paddingTop: 16, paddingHorizontal: 16, paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 20 },
    sheetHandle: { width: 36, height: 4, backgroundColor: colors.studioLine, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    sheetTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: colors.studioInk },
    postBtn: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: colors.studioViolet },
    captionInput: { fontFamily: 'DMSans_400Regular', fontSize: 16, color: colors.studioInk, minHeight: 100, textAlignVertical: 'top', marginBottom: 12 },
    tagsInput: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.studioInk, borderTopWidth: 1, borderTopColor: colors.studioLine, paddingTop: 12 },
    // Spin modal
    spinModalContent: {
      width: '100%',
      backgroundColor: colors.studioPaper,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      gap: 24,
      borderWidth: 1,
      borderColor: colors.studioInk,
    },
    spinTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 24,
      color: colors.studioInk,
    },
    spinPoints: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 48,
      color: colors.studioOrangeText,
    },
    spinText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 16,
      color: colors.studioMuted,
      textAlign: 'center',
    },
    spinWheelContainer: {
      width: 120,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
    }
  }), [colors, insets, topPad]);

  const isOfflineMode =
    (progressIsError && !!progress) ||
    (profileIsError && !!profileSnapshot);

  return (
    <View style={s.container} testID="progress-screen">
      <View style={[s.header, windowWidth < 360 && s.compactHeader]}>
        <View style={s.titleRow}>
          <View style={s.titleMark}>
              <Feather name="aperture" size={19} color={colors.studioInk} />
          </View>
          <View style={s.titleCopy}>
            <Text style={s.title} numberOfLines={1}>Dashboard</Text>
            <Text style={s.tagline} numberOfLines={1}>Discipline Eats Talent</Text>
          </View>
        </View>
        <View style={[s.headerActions, windowWidth < 360 && s.compactHeaderActions]}>
          <View style={s.memberProfileGroup}>
            <TouchableOpacity
              style={s.profileButton}
              accessibilityRole="button"
              accessibilityLabel={profileUsername ? `Open your profile, @${profileUsername}` : 'Open your profile'}
              onPress={() => profileUserId ? router.push(`/creator/${profileUserId}`) : router.push('/profile')}
              testID="dashboard-profile-button"
            >
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={s.profileButtonAvatar} />
              ) : (
                <Text style={s.profileButtonInitials}>{profileInitials}</Text>
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={unreadNotifications ? `Open notifications, ${unreadNotifications} unread` : 'Open notifications'}
            onPress={() => router.push('/notifications')}
            testID="dashboard-notifications-button"
            style={s.notificationButton}
          >
            <Feather name="bell" size={19} color={colors.studioInk} />
            {unreadNotifications > 0 ? (
              <View style={{ alignItems: 'center', backgroundColor: colors.destructive, borderRadius: 10, justifyContent: 'center', minWidth: 18, paddingHorizontal: 4, position: 'absolute', right: -5, top: -3 }}>
                <Text style={{ color: colors.studioPaper, fontFamily: 'DMSans_700Bold', fontSize: 10 }}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {isOfflineMode && (
        <View style={s.offlineWarning}>
          <Feather name="wifi-off" size={14} color={colors.studioMuted} />
          <Text style={s.offlineText}>Viewing offline cached data</Text>
        </View>
      )}

      {progressIsError && !progress ? (
        <View style={s.centered}>
          <Feather name="cloud-off" size={48} color={colors.studioMuted} />
          <Text style={s.centeredTitle}>Could not load your progress</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => handleRefresh()}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.studioViolet} />
          }
        >
          <StickerJamPracticeCard
            streak={displayCount(progress?.currentStreak)}
            onStartSketch={() => router.push('/mini-habit-studio')}
            onOpenHabits={() => router.push('/(tabs)/challenge-habits')}
            onOpenFeed={() => router.push('/(tabs)/community')}
            onOpenWorkshops={() => router.push('/(tabs)/workshops')}
          />

          {progressLoading && !progress && (
            <View
              style={s.loadingCard}
              testID="dashboard-loading-state"
            >
              <ActivityIndicator size="large" color={colors.studioViolet} />
              <Text style={s.loadingText}>Loading your dashboard…</Text>
            </View>
          )}

          {progress && (
            <>
              <View testID="dashboard-loaded-state" accessibilityLabel="Dashboard progress">

              <View style={s.actionsBlock}>
                {progress?.checkedInToday === false && (
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnPrimary]}
                    testID="check-in-button"
                    accessibilityRole="button"
                    accessibilityLabel="Check in for today"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      checkInMut.mutate({ data: { timezone } });
                    }}
                    disabled={checkInMut.isPending}
                  >
                    {checkInMut.isPending ? (
                      <ActivityIndicator color={colors.studioPaper} />
                    ) : (
                      <>
                        <Feather name="check-circle" size={18} color={colors.studioPaper} />
                        <Text style={[s.actionBtnText, s.actionBtnTextPrimary]}>Check In Today</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {progress?.spinAvailableToday === true && (
                  <TouchableOpacity
                    style={s.actionBtn}
                    testID="spin-open-button"
                    accessibilityRole="button"
                    accessibilityLabel="Open the daily reward wheel"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleOpenSpin();
                    }}
                  >
                    <Feather name="gift" size={18} color={colors.studioViolet} />
                    <Text style={s.actionBtnText}>Spin Daily Reward</Text>
                  </TouchableOpacity>
                )}
                {progress?.checkedInToday === true && progress?.spinAvailableToday === false && (
                  <View style={[s.actionBtn, { opacity: 0.5, borderColor: 'transparent' }]}>
                    <Feather name="check" size={18} color={colors.studioMuted} />
                    <Text style={[s.actionBtnText, { color: colors.studioMuted }]}>Checked in today</Text>
                  </View>
                )}
              </View>

              {(nextBadge || recentBadges.length > 0) && (
                <View style={s.badgesBlock}>
                  <View style={s.blockTitleRow}>
                    <Feather name="award" size={17} color={colors.studioViolet} />
                    <Text style={s.blockTitle}>Milestones</Text>
                     <TouchableOpacity
                       accessibilityRole="button"
                       accessibilityLabel="View all past accomplishments"
                       testID="dashboard-accomplishments"
                       onPress={() => router.push('/accomplishments')}
                       style={{ marginLeft: 'auto', padding: 8 }}
                     >
                       <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: colors.studioInk }}>View all</Text>
                     </TouchableOpacity>
                  </View>

                  {nextBadge && (
                    <View style={s.nextBadgeBox}>
                      <Text style={s.nextBadgeName}>Next Badge: {nextBadge?.name ?? 'Upcoming milestone'}</Text>
                      <View style={s.progressBarContainer}>
                        <View style={[s.progressBarFill, { width: `${nextBadgePercent}%` }]} />
                      </View>
                      <View style={s.nextBadgeMeta}>
                        <Text style={s.nextBadgeText}>Streak progress</Text>
                        <Text style={s.nextBadgeText}>{displayCount(nextBadge?.currentStreak)} / {displayCount(nextBadge?.requiredStreak)} days</Text>
                      </View>
                    </View>
                  )}

                  {recentBadges.length > 0 && (
                    <View style={s.recentBadgesList}>
                      {recentBadges.map((badge, idx) => (
                        <View key={badge.id || idx} style={s.recentBadgeItem}>
                          {badge.imageUrl ? (
                            <Image source={{ uri: badge.imageUrl }} style={{ width: 24, height: 24 }} />
                          ) : (
                            <Feather name="award" size={20} color={colors.studioViolet} />
                          )}
                          <Text style={s.recentBadgeName}>{badge.name}</Text>
                          <Text style={s.recentBadgeDate}>
                            {new Date(badge.earnedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
              </View>
            </>
          )}

          <MonthlyMemberDrops compact />

          <HabitPracticeSummaryCard onOpenHabits={() => router.push('/(tabs)/challenge-habits')} />

        </ScrollView>
      )}

      {/* Spin Result / Interaction Modal */}
      <Modal visible={spinModalVisible} animationType={reduceMotion ? 'none' : 'fade'} transparent>
        <View style={s.modalOverlayCenter}>
          <View style={s.spinModalContent}>
            {!spinResult ? (
              <>
                <Text style={s.spinTitle}>Daily Reward</Text>
                <View style={s.spinWheelContainer}>
                  {reduceMotion && spinMut.isPending ? (
                    <ActivityIndicator size="large" color={colors.studioViolet} />
                  ) : (
                    <Animated.View style={{ transform: [{ rotate: reduceMotion ? '0deg' : spinRotation }] }}>
                      <Feather name="aperture" size={80} color={colors.studioViolet} />
                    </Animated.View>
                  )}
                </View>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnPrimary, { width: '100%', marginTop: 8 }]}
                  testID="spin-start-button"
                  accessibilityRole="button"
                  accessibilityLabel="Spin the daily reward wheel"
                  onPress={handleStartSpin}
                  disabled={spinMut.isPending}
                >
                  <Text style={[s.actionBtnText, s.actionBtnTextPrimary]}>
                    {spinMut.isPending ? 'Spinning...' : 'Tap to Spin'}
                  </Text>
                </TouchableOpacity>
                {!spinMut.isPending && (
                  <TouchableOpacity style={{ marginTop: 8 }} onPress={handleCloseSpin}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', color: colors.studioMuted, fontSize: 14 }}>Close</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Feather name="gift" size={48} color={colors.studioOrange} />
                <Text style={s.spinTitle}>You Won!</Text>
                <Text style={s.spinPoints}>+{spinResult.pointsAwarded}</Text>
                <Text style={s.spinText}>Your new balance is {spinResult.newBalance} points.</Text>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnPrimary, { width: '100%', marginTop: 16 }]}
                  onPress={handleCloseSpin}
                >
                  <Text style={[s.actionBtnText, s.actionBtnTextPrimary]}>Awesome!</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
