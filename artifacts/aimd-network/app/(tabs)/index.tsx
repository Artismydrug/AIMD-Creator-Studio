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
  KeyboardAvoidingView,
  Image,
  Alert,
  Linking,
  TextInput,
  Animated,
  Easing,
  AccessibilityInfo
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import ChallengeCameraCapture from '@/components/ChallengeCameraCapture';
import CreatorAppTour from '@/components/CreatorAppTour';
import VerificationStatusTag from '@/components/VerificationStatusTag';
import MonthlyMemberDrops from '@/components/MonthlyMemberDrops';
import {
  ChallengeProofAsset,
  fromImagePickerAsset,
  uploadChallengeProof,
} from '@/lib/challengeProof';
import {
  useGetProgress,
  getGetProgressQueryKey,
  getListBadgesQueryKey,
  useCheckInProgress,
  useSpinDailyReward,
  useGetCurrentChallenge,
  getGetCurrentChallengeQueryKey,
  useSubmitChallengeEntry,
  getGetUserProfileQueryKey,
  useGetUserProfile,
  getBaseUrl,
  DailySpinResult,
  useGetCurrentUser,
  useGetNotifications,
  getGetNotificationsQueryKey,
  getGetRewardsQueryKey,
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

  const {
    data: challengeData,
    isLoading: challengeLoading,
    isError: challengeIsError,
    refetch: refetchChallenge
  } = useGetCurrentChallenge();
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
        refetchChallenge(),
        refetchCurrentUser(),
        ...(profileUserId !== null ? [refetchProfileSnapshot()] : []),
        queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchProgress, refetchChallenge, refetchCurrentUser, refetchProfileSnapshot, profileUserId, queryClient]);

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

  // Challenge entry state
  const [composing, setComposing] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [finalProof, setFinalProof] = useState<ChallengeProofAsset | null>(null);
  const [processProof, setProcessProof] = useState<ChallengeProofAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  const submitMut = useSubmitChallengeEntry({
    mutation: {
      onSuccess: () => {
        setUploading(false);
        setComposing(false);
        setCaption('');
        setTags('');
        setFinalProof(null);
        setProcessProof(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetCurrentChallengeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
        void refetchCurrentUser();
      },
      onError: () => {
        setUploading(false);
        Alert.alert('Submission Failed', 'We could not submit your entry right now. Please try again.');
      }
    }
  });

  const handlePickProcessProof = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Mobile app required',
        'Process verification can be attached from the AIMD iOS or Android app.',
      );
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow photo library access to attach optional process verification.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      exif: true,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      setProcessProof(fromImagePickerAsset(result.assets[0]));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSubmitChallenge = async () => {
    if (!caption.trim() || !finalProof) return;
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    setUploading(true);
    try {
      const [finalUpload, processUpload] = await Promise.all([
        uploadChallengeProof(finalProof, 'challenge_final'),
        processProof
          ? uploadChallengeProof(processProof, 'challenge_process')
          : Promise.resolve(null),
      ]);
      submitMut.mutate({
        data: {
          caption: caption.trim(),
          tags: tagList,
          finalMedia: { objectPath: finalUpload.objectPath },
          processMedia: processUpload
            ? { objectPath: processUpload.objectPath }
            : null,
        },
      });
    } catch {
      setUploading(false);
      Alert.alert(
        'Upload failed',
        'Your proof could not be uploaded. Check your connection and try again.',
      );
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 8;
  const isSubmitting = uploading || submitMut.isPending;
  const isFreeCreator = currentUser?.tier === 'free';
  const unreadNotifications = notifications?.unreadCount ?? 0;
  const profileUsername = [profileSnapshot?.username, currentUser?.username]
    .find((value) => typeof value === 'string' && value.trim().length > 0);
  const profileInitials = typeof profileUsername === 'string' ? profileUsername.slice(0, 2).toUpperCase() : '?';
  const profileAvatar = resolveMediaUrl(profileSnapshot?.avatarUrl ?? currentUser?.avatarUrl);
  const recentBadges = Array.isArray(progress?.recentBadges)
    ? progress.recentBadges.filter((badge) => badge && typeof badge.name === 'string') : [];
  const submissions = Array.isArray(challengeData?.submissions)
    ? challengeData.submissions.filter((submission) => submission && typeof submission.id === 'number') : [];
  const nextBadge = progress?.nextBadge;
  const nextBadgePercent = typeof nextBadge?.progressPercent === 'number' && Number.isFinite(nextBadge.progressPercent)
    ? Math.max(0, Math.min(100, nextBadge.progressPercent)) : 0;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad,
      paddingHorizontal: 20,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    title: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 28,
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 10,
      color: colors.sunsetCoral,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    feedBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: colors.radius || 4,
    },
    feedBtnText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 13,
      color: colors.primaryForeground,
      textTransform: 'uppercase',
    },
    content: {
      paddingBottom: Platform.OS === 'web' ? 100 : 100,
    },
    offlineWarning: {
      backgroundColor: colors.muted,
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
      color: colors.mutedForeground,
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
      color: colors.foreground,
    },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius || 4,
    },
    retryBtnText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 14,
      color: colors.foreground,
    },
    loadingCard: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 18,
      minHeight: 86,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: colors.ink,
      borderRadius: colors.radius + 4,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    profileSnapshot: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    profileSnapshotCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderWidth: 2,
      borderColor: colors.cyan,
      borderRadius: colors.radius + 2,
      backgroundColor: colors.cyanWash,
    },
    profileSnapshotAvatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.muted,
      overflow: 'hidden',
    },
    profileSnapshotAvatarText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 18,
      color: colors.primary,
    },
    profileSnapshotContent: {
      flex: 1,
      minWidth: 0,
      gap: 5,
    },
    profileSnapshotEyebrow: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 10,
      color: colors.primary,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    profileSnapshotName: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 17,
      color: colors.foreground,
    },
    profileSnapshotStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    profileSnapshotStat: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    loadingText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 10,
      color: colors.cyan,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    progressBarContainer: {
      width: '100%',
      height: 6,
      backgroundColor: 'rgba(250,248,245,0.22)',
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.cyan,
    },
    // Stats grid
    statsGrid: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    statCell: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
    },
    statCellNoBorder: {
      borderWidth: 1,
    },
    statIcon: {
      marginBottom: 5,
    },
    statValue: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 22,
      color: colors.primary,
      marginBottom: 2,
    },
    statLabel: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
    },
    // Badges block
    badgesBlock: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius + 2,
      backgroundColor: colors.goldWash,
    },
    blockTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      color: colors.foreground,
    },
    blockTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 16,
    },
    nextBadgeBox: {
      backgroundColor: colors.muted,
      padding: 16,
      borderRadius: colors.radius || 4,
      marginBottom: 16,
    },
    nextBadgeName: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 15,
      color: colors.foreground,
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
      color: colors.mutedForeground,
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
      color: colors.foreground,
    },
    recentBadgeDate: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
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
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: colors.radius + 2,
    },
    actionBtnPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    actionBtnText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
      color: colors.foreground,
    },
    actionBtnTextPrimary: {
      color: colors.primaryForeground,
    },
    // Challenge block
    challengeBlock: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 20,
      borderWidth: 2,
      borderColor: colors.sunsetCoral,
      borderRadius: colors.radius + 4,
      backgroundColor: colors.coralWash,
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
      color: colors.foreground,
    },
    challengeTheme: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.primary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    challengePrompt: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 22,
      marginBottom: 16,
    },
    challengePrize: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 13,
      color: colors.foreground,
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
      color: colors.mutedForeground,
    },
    challengeSubmitted: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: colors.muted,
      borderRadius: colors.radius || 4,
      justifyContent: 'center',
    },
    challengeSubmittedText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 14,
      color: colors.foreground,
    },
    submissionsSection: {
      marginTop: 24,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 18,
      gap: 12,
    },
    submissionsHeading: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      color: colors.foreground,
    },
    submissionCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
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
      color: colors.foreground,
    },
    submissionMedia: {
      width: '100%',
      height: 190,
      backgroundColor: colors.muted,
    },
    submissionVideo: {
      height: 150,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.muted,
    },
    submissionVideoText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.mutedForeground,
    },
    submissionCaption: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 20,
      color: colors.foreground,
    },
    proofSection: {
      gap: 9,
      marginBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
      color: colors.foreground,
    },
    proofRequired: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 11,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    proofHint: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      lineHeight: 17,
      color: colors.mutedForeground,
    },
    proofAction: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    proofActionSecondary: {
      borderColor: colors.border,
    },
    proofActionText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.primary,
    },
    proofActionTextSecondary: {
      color: colors.mutedForeground,
    },
    proofPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.muted,
      padding: 10,
    },
    proofPreviewImage: {
      width: 64,
      height: 64,
      backgroundColor: colors.background,
    },
    proofPreviewIcon: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    proofPreviewCopy: { flex: 1, gap: 3 },
    proofPreviewTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.foreground,
    },
    proofPreviewMeta: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      color: colors.mutedForeground,
    },
    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
    modalOverlayCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 20 },
    sheet: { backgroundColor: colors.card, paddingTop: 16, paddingHorizontal: 16, paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 20 },
    sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    sheetTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 16, color: colors.foreground },
    postBtn: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: colors.primary },
    captionInput: { fontFamily: 'DMSans_400Regular', fontSize: 16, color: colors.foreground, minHeight: 100, textAlignVertical: 'top', marginBottom: 12 },
    tagsInput: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.foreground, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
    // Spin modal
    spinModalContent: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      gap: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    spinTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 24,
      color: colors.foreground,
    },
    spinPoints: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 48,
      color: colors.primary,
    },
    spinText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 16,
      color: colors.mutedForeground,
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
    (challengeIsError && !!challengeData) ||
    (profileIsError && !!profileSnapshot);

  return (
    <View style={s.container} testID="progress-screen">
      <View style={s.header}>
        {/* Title block — grows to fill available space */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title} numberOfLines={1}>Dashboard</Text>
          <Text style={s.tagline} numberOfLines={1}>Discipline Eats Talent</Text>
        </View>
        {/* Tier badge + profile link */}
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <TouchableOpacity
            style={{ alignItems: 'center', flexDirection: 'row', gap: 5, paddingVertical: 2 }}
            accessibilityRole="button"
            accessibilityLabel={isFreeCreator
              ? 'View membership options for your free Discovering Artist account'
              : 'View your profile'}
            onPress={() => router.push(isFreeCreator ? '/membership' : '/profile')}
            testID={isFreeCreator ? 'dashboard-membership-button' : 'dashboard-tier-button'}
          >
            <Feather name="shield" size={12} color={colors.cyan} />
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: colors.foreground, textTransform: 'uppercase' }}>
              {currentUser?.tier === 'pro' ? 'Pro' : currentUser?.tier === 'academy' || currentUser?.tier === 'workshop' ? 'Dedicated' : 'Free'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            onPress={() => router.push('/profile')}
            testID="dashboard-profile-button"
          >
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: colors.primary }}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={unreadNotifications ? `Open notifications, ${unreadNotifications} unread` : 'Open notifications'}
            onPress={() => router.push('/notifications')}
            testID="dashboard-notifications-button"
            style={{ position: 'relative', padding: 5 }}
          >
            <Feather name="bell" size={19} color={colors.foreground} />
            {unreadNotifications > 0 ? (
              <View style={{ alignItems: 'center', backgroundColor: colors.destructive, borderRadius: 10, justifyContent: 'center', minWidth: 18, paddingHorizontal: 4, position: 'absolute', right: -5, top: -3 }}>
                <Text style={{ color: colors.primaryForeground, fontFamily: 'DMSans_700Bold', fontSize: 10 }}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
        {/* Feed shortcut */}
        <TouchableOpacity style={s.feedBtn} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/feed');
        }} testID="dashboard-feed-button">
          <Feather name="image" size={14} color={colors.primaryForeground} />
          <Text style={s.feedBtnText}>Feed</Text>
        </TouchableOpacity>
      </View>

      {isOfflineMode && (
        <View style={s.offlineWarning}>
          <Feather name="wifi-off" size={14} color={colors.mutedForeground} />
          <Text style={s.offlineText}>Viewing offline cached data</Text>
        </View>
      )}

      {progressIsError && !progress ? (
        <View style={s.centered}>
          <Feather name="cloud-off" size={48} color={colors.mutedForeground} />
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          <CreatorAppTour />

          {progressLoading && !progress && (
            <View
              style={s.loadingCard}
              testID="dashboard-loading-state"
            >
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.loadingText}>Loading your dashboard…</Text>
            </View>
          )}

          {progress && (
            <>
              <View testID="dashboard-loaded-state" accessibilityLabel="Dashboard progress">

              {currentUser && (
                <View style={s.profileSnapshot}>
                  <TouchableOpacity
                    style={s.profileSnapshotCard}
                    onPress={() => router.push('/profile')}
                    testID="dashboard-profile-snapshot"
                    accessibilityRole="button"
                    accessibilityLabel={profileUsername ? `Open your profile, ${profileUsername}` : 'Open your profile'}
                  >
                    <View style={s.profileSnapshotAvatar}>
                      {profileAvatar ? (
                        <Image
                          source={{
                            uri: profileAvatar,
                          }}
                          style={{ width: 54, height: 54 }}
                        />
                      ) : (
                        <Text style={s.profileSnapshotAvatarText}>
                          {profileInitials}
                        </Text>
                      )}
                    </View>
                    <View style={s.profileSnapshotContent}>
                      <Text style={s.profileSnapshotEyebrow}>Your public profile</Text>
                      <Text style={s.profileSnapshotName} numberOfLines={1}>
                        {profileUsername ? `@${profileUsername}` : 'Your profile'}
                      </Text>
                      <View style={s.profileSnapshotStats}>
                        <Text style={s.profileSnapshotStat}>
                          {profileSnapshot?.followerCount ?? '—'} followers
                        </Text>
                        <Text style={s.profileSnapshotStat}>
                          {profileSnapshot?.followingCount ?? '—'} following
                        </Text>
                        <Text style={s.profileSnapshotStat}>
                          {profileSnapshot?.badgesEarned ?? '—'} badges
                        </Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={s.statsGrid}>
                <View style={s.statCell}>
                  <Feather name="zap" size={15} color={colors.cyan} style={s.statIcon} />
                  <Text style={s.statValue}>{displayCount(progress?.currentStreak)}</Text>
                  <Text style={s.statLabel}>Day Streak</Text>
                </View>
                <View style={s.statCell}>
                  <Feather name="check-circle" size={15} color={colors.cyan} style={s.statIcon} />
                  <Text style={s.statValue}>{displayCount(progress?.todayHabitsCompleted)}/{displayCount(progress?.totalHabits)}</Text>
                  <Text style={s.statLabel}>Habits Today</Text>
                </View>
                <View style={[s.statCell, s.statCellNoBorder]}>
                  <Feather name="award" size={15} color={colors.cyan} style={s.statIcon} />
                  <Text style={s.statValue}>{Array.isArray(progress?.recentBadges) ? recentBadges.length : '—'}</Text>
                  <Text style={s.statLabel}>Recent Badges</Text>
                </View>
              </View>

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
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <>
                        <Feather name="check-circle" size={18} color={colors.primaryForeground} />
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
                    <Feather name="gift" size={18} color={colors.primary} />
                    <Text style={s.actionBtnText}>Spin Daily Reward</Text>
                  </TouchableOpacity>
                )}
                {progress?.checkedInToday === true && progress?.spinAvailableToday === false && (
                  <View style={[s.actionBtn, { opacity: 0.5, borderColor: 'transparent' }]}>
                    <Feather name="check" size={18} color={colors.mutedForeground} />
                    <Text style={[s.actionBtnText, { color: colors.mutedForeground }]}>Checked in today</Text>
                  </View>
                )}
              </View>

              {(nextBadge || recentBadges.length > 0) && (
                <View style={s.badgesBlock}>
                  <View style={s.blockTitleRow}>
                    <Feather name="award" size={17} color={colors.primary} />
                    <Text style={s.blockTitle}>Milestones</Text>
                     <TouchableOpacity
                       accessibilityRole="button"
                       accessibilityLabel="View all past accomplishments"
                       testID="dashboard-accomplishments"
                       onPress={() => router.push('/accomplishments')}
                       style={{ marginLeft: 'auto', padding: 8 }}
                     >
                       <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: colors.foreground }}>View all</Text>
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
                            <Feather name="award" size={20} color={colors.primary} />
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

          {challengeLoading && !challengeData && (
            <View style={s.challengeBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {challengeIsError && !challengeData && (
            <View style={s.challengeBlock}>
              <Feather name="cloud-off" size={28} color={colors.mutedForeground} />
              <Text style={s.centeredTitle}>Could not load the featured challenge</Text>
              <TouchableOpacity
                style={s.retryBtn}
                onPress={() => refetchChallenge()}
                accessibilityRole="button"
                accessibilityLabel="Retry featured challenge"
              >
                <Text style={s.retryBtnText}>Retry Challenge</Text>
              </TouchableOpacity>
            </View>
          )}

          {challengeData && challengeData.challenge && (
            <View style={s.challengeBlock}>
              <View style={s.challengeHeader}>
                <Text style={s.challengeTitle}>Featured Challenge</Text>
                <Feather name="star" size={18} color={colors.primary} />
              </View>
              <Text style={s.challengeTheme}>{challengeData.challenge.theme}</Text>
              <Text style={s.challengePrompt}>{challengeData.challenge.prompt}</Text>
              <Text style={s.challengePrize}>Prize: {challengeData.challenge.prize}</Text>

              <View style={s.challengeMetaRow}>
                <Text style={s.challengeMetaText}>
                  Due: {new Date(challengeData.challenge.deadline).toLocaleDateString()}
                </Text>
                <Text style={s.challengeMetaText}>
                  {challengeData.challenge.totalSubmissions} submissions
                </Text>
              </View>

               {challengeData.hasSubmitted ? (
                <View style={s.challengeSubmitted}>
                  <Feather name="check-circle" size={16} color={colors.primary} />
                  <Text style={s.challengeSubmittedText}>Entry Submitted</Text>
                </View>
               ) : challengeData.challenge.status === 'active' ? (
                <TouchableOpacity
                  style={[s.actionBtn, { borderColor: colors.primary }]}
                  testID="challenge-submit-button"
                  accessibilityRole="button"
                  accessibilityLabel="Submit a featured challenge entry"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setComposing(true);
                  }}
                >
                  <Feather name="upload" size={18} color={colors.primary} />
                  <Text style={[s.actionBtnText, { color: colors.primary }]}>Submit Entry</Text>
                </TouchableOpacity>
               ) : (
                 <View style={s.challengeSubmitted}>
                   <Feather name="calendar" size={16} color={colors.primary} />
                   <Text style={s.challengeSubmittedText}>
                     {challengeData.challenge.status === 'upcoming'
                       ? `Opens ${new Date(challengeData.challenge.startsAt).toLocaleDateString()}`
                       : 'Challenge closed'}
                   </Text>
                 </View>
               )}

              {submissions.length > 0 && (
                <View style={s.submissionsSection}>
                  <Text style={s.submissionsHeading}>Community Submissions</Text>
                  {submissions.map((submission) => {
                    const mediaUrl = resolveMediaUrl(
                      submission.finalMedia?.mediaUrl ?? submission.imageUrl,
                    );
                    const isVideo =
                      submission.finalMedia?.mediaType === 'video';
                    return (
                      <View key={submission.id} style={s.submissionCard}>
                        <View style={s.submissionAuthorRow}>
                          <Text style={s.submissionAuthor}>
                            #{submission.rank} · {submission.username}
                          </Text>
                          <VerificationStatusTag
                            status={submission.verificationStatus}
                          />
                        </View>
                        {mediaUrl && !isVideo && (
                          <Image
                            source={{ uri: mediaUrl }}
                            style={s.submissionMedia}
                            resizeMode="cover"
                          />
                        )}
                        {mediaUrl && isVideo && (
                          <View style={s.submissionVideo}>
                            <Feather
                              name="video"
                              size={26}
                              color={colors.primary}
                            />
                            <Text style={s.submissionVideoText}>
                              Proof video captured in AIMD
                            </Text>
                          </View>
                        )}
                        <Text style={s.submissionCaption}>
                          {submission.caption}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

        </ScrollView>
      )}

      {/* Challenge Submission Modal */}
      <Modal visible={composing} animationType={reduceMotion ? 'none' : 'slide'} transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <TouchableOpacity
                onPress={() => {
                  setComposing(false);
                  setFinalProof(null);
                  setProcessProof(null);
                  setCaption('');
                  setTags('');
                }}
              >
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
              <Text style={s.sheetTitle}>Submit Challenge Entry</Text>
              <TouchableOpacity
                onPress={handleSubmitChallenge}
                disabled={!caption.trim() || !finalProof || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text
                    style={[
                      s.postBtn,
                      { opacity: caption.trim() && finalProof ? 1 : 0.35 },
                    ]}
                  >
                    Submit
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="Tell us about your entry..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              autoFocus
            />

            <View style={s.proofSection}>
              <View style={s.proofLabelRow}>
                <Text style={s.proofLabel}>Final proof</Text>
                <Text style={s.proofRequired}>Required · Live capture</Text>
              </View>
              <Text style={s.proofHint}>
                Take a new photo or video in AIMD. Existing library media cannot
                be used as the final submission.
              </Text>
              {finalProof ? (
                <View style={s.proofPreview}>
                  {finalProof.mediaType === 'image' ? (
                    <Image
                      source={{ uri: finalProof.uri }}
                      style={s.proofPreviewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={s.proofPreviewIcon}>
                      <Feather name="video" size={24} color={colors.primary} />
                    </View>
                  )}
                  <View style={s.proofPreviewCopy}>
                    <Text style={s.proofPreviewTitle}>
                      {finalProof.mediaType === 'image'
                        ? 'Live photo captured'
                        : 'Live video captured'}
                    </Text>
                    <Text style={s.proofPreviewMeta}>
                      {finalProof.capturedAt
                        ? new Date(finalProof.capturedAt).toLocaleString()
                        : 'Captured in AIMD'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setFinalProof(null)}
                    accessibilityLabel="Remove final proof"
                  >
                    <Feather
                      name="x-circle"
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.proofAction}
                  onPress={() => setCameraVisible(true)}
                  testID="challenge-open-camera"
                >
                  <Feather name="camera" size={18} color={colors.primary} />
                  <Text style={s.proofActionText}>
                    Capture final photo or video
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.proofSection}>
              <View style={s.proofLabelRow}>
                <Text style={s.proofLabel}>Process verification</Text>
                <Text style={s.proofHint}>Optional</Text>
              </View>
              <Text style={s.proofHint}>
                Add a progress photo or clip from your library to show how the
                work developed.
              </Text>
              {processProof ? (
                <View style={s.proofPreview}>
                  {processProof.mediaType === 'image' ? (
                    <Image
                      source={{ uri: processProof.uri }}
                      style={s.proofPreviewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={s.proofPreviewIcon}>
                      <Feather name="video" size={24} color={colors.primary} />
                    </View>
                  )}
                  <View style={s.proofPreviewCopy}>
                    <Text style={s.proofPreviewTitle}>
                      Process {processProof.mediaType}
                    </Text>
                    <Text style={s.proofPreviewMeta}>
                      {processProof.exifTimestamp
                        ? `EXIF: ${new Date(processProof.exifTimestamp).toLocaleString()}`
                        : 'Library origin recorded'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setProcessProof(null)}
                    accessibilityLabel="Remove process verification"
                  >
                    <Feather
                      name="x-circle"
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.proofAction, s.proofActionSecondary]}
                  onPress={handlePickProcessProof}
                >
                  <Feather
                    name="image"
                    size={18}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      s.proofActionText,
                      s.proofActionTextSecondary,
                    ]}
                  >
                    Add process photo or video
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={s.tagsInput}
              value={tags}
              onChangeText={setTags}
              placeholder="Tags: painting, study, challenge"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ChallengeCameraCapture
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCaptured={setFinalProof}
      />

      {/* Spin Result / Interaction Modal */}
      <Modal visible={spinModalVisible} animationType={reduceMotion ? 'none' : 'fade'} transparent>
        <View style={s.modalOverlayCenter}>
          <View style={s.spinModalContent}>
            {!spinResult ? (
              <>
                <Text style={s.spinTitle}>Daily Reward</Text>
                <View style={s.spinWheelContainer}>
                  {reduceMotion && spinMut.isPending ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <Animated.View style={{ transform: [{ rotate: reduceMotion ? '0deg' : spinRotation }] }}>
                      <Feather name="aperture" size={80} color={colors.primary} />
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
                    <Text style={{ fontFamily: 'DMSans_500Medium', color: colors.mutedForeground, fontSize: 14 }}>Close</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Feather name="gift" size={48} color={colors.primary} />
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
