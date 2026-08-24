import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
import VerificationStatusTag from '@/components/VerificationStatusTag';
import ProEcosystemPortal from '@/components/ProEcosystemPortal';
import MoreFromAimd from '@/components/MoreFromAimd';
import {
  ChallengeProofAsset,
  fromImagePickerAsset,
  uploadChallengeProof,
} from '@/lib/challengeProof';
import {
  useGetProgress,
  getGetProgressQueryKey,
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
} from '@workspace/api-client-react';

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getBaseUrl();
  return base ? `${base}${url}` : url;
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

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressIsError,
    refetch: refetchProgress
  } = useGetProgress({ timezone });

  const {
    data: challengeData,
    isLoading: challengeLoading,
    isError: challengeIsError,
    refetch: refetchChallenge
  } = useGetCurrentChallenge();
  const { data: currentUser, refetch: refetchCurrentUser } = useGetCurrentUser();
  const {
    data: profileSnapshot,
    isError: profileIsError,
    refetch: refetchProfileSnapshot,
  } = useGetUserProfile(currentUser?.id ?? 0, {
    query: {
      enabled: !!currentUser,
      queryKey: currentUser ? getGetUserProfileQueryKey(currentUser.id) : [],
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProgress(),
        refetchChallenge(),
        refetchCurrentUser(),
        refetchProfileSnapshot(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchProgress, refetchChallenge, refetchCurrentUser, refetchProfileSnapshot]);

  // Mutations
  const checkInMut = useCheckInProgress({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey({ timezone }) });
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        spinAnim.stopAnimation();
        setSpinResult(data);
        queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey({ timezone }) });
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

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
    // Phase block
    phaseBlock: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    profileSnapshot: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    profileSnapshotCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius || 4,
      backgroundColor: colors.card,
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
    phaseLabel: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 8,
    },
    phaseName: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 32,
      color: colors.primary,
      letterSpacing: -1,
      marginBottom: 4,
    },
    pointsText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 16,
    },
    nextPhaseContext: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 8,
    },
    progressBarContainer: {
      width: '100%',
      height: 6,
      backgroundColor: colors.muted,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    // Stats grid
    statsGrid: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statCell: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    statCellNoBorder: {
      borderRightWidth: 0,
    },
    statValue: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 20,
      color: colors.foreground,
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
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    blockTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      color: colors.foreground,
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
      padding: 20,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      borderRadius: colors.radius || 4,
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
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
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

  if (progressLoading && !progress) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        <TouchableOpacity
          style={{ alignItems: 'flex-end', gap: 4 }}
          onPress={() => router.push('/profile')}
          testID="dashboard-profile-button"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Feather name="shield" size={12} color={colors.cyan} />
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: colors.foreground, textTransform: 'uppercase' }}>
              {currentUser?.tier === 'pro' ? 'Pro' : currentUser?.tier === 'academy' || currentUser?.tier === 'workshop' ? 'Dedicated' : 'Free'}
            </Text>
          </View>
          <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: colors.primary }}>My Profile</Text>
        </TouchableOpacity>
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
          {progress && (
            <>
              <View style={s.phaseBlock}>
                <Text style={s.phaseLabel}>Current Phase</Text>
                <Text style={s.phaseName}>{progress.phase?.phase ?? '—'}</Text>
                <Text style={s.pointsText}>{progress.points ?? 0} Points</Text>
                <View style={s.progressBarContainer}>
                  <View style={[s.progressBarFill, { width: `${Math.max(0, Math.min(100, progress.phase?.progressPercent ?? 0))}%` }]} />
                </View>
                {progress.phase?.nextPhase && (
                  <Text style={s.nextPhaseContext}>
                    {(progress.phase.nextPhasePoints ?? 0) - (progress.points ?? 0)} points to {progress.phase.nextPhase}
                  </Text>
                )}
              </View>

              {currentUser && (
                <View style={s.profileSnapshot}>
                  <TouchableOpacity
                    style={s.profileSnapshotCard}
                    onPress={() => router.push('/profile')}
                    testID="dashboard-profile-snapshot"
                    accessibilityRole="button"
                    accessibilityLabel={`Open your profile, ${currentUser.username}`}
                  >
                    <View style={s.profileSnapshotAvatar}>
                      {resolveMediaUrl(profileSnapshot?.avatarUrl ?? currentUser.avatarUrl) ? (
                        <Image
                          source={{
                            uri: resolveMediaUrl(profileSnapshot?.avatarUrl ?? currentUser.avatarUrl)!,
                          }}
                          style={{ width: 54, height: 54 }}
                        />
                      ) : (
                        <Text style={s.profileSnapshotAvatarText}>
                          {currentUser.username.slice(0, 2).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={s.profileSnapshotContent}>
                      <Text style={s.profileSnapshotEyebrow}>Your public profile</Text>
                      <Text style={s.profileSnapshotName} numberOfLines={1}>
                        @{profileSnapshot?.username ?? currentUser.username}
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
                  <Text style={s.statValue}>{progress.currentStreak}</Text>
                  <Text style={s.statLabel}>Day Streak</Text>
                </View>
                <View style={s.statCell}>
                  <Text style={s.statValue}>{progress.todayHabitsCompleted}/{progress.totalHabits}</Text>
                  <Text style={s.statLabel}>Habits Today</Text>
                </View>
                <View style={[s.statCell, s.statCellNoBorder]}>
                  <Text style={s.statValue}>{(progress.recentBadges ?? []).length}</Text>
                  <Text style={s.statLabel}>Recent Badges</Text>
                </View>
              </View>

              <View style={s.actionsBlock}>
                {!progress.checkedInToday && (
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
                {progress.spinAvailableToday && (
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
                {progress.checkedInToday && !progress.spinAvailableToday && (
                  <View style={[s.actionBtn, { opacity: 0.5, borderColor: 'transparent' }]}>
                    <Feather name="check" size={18} color={colors.mutedForeground} />
                    <Text style={[s.actionBtnText, { color: colors.mutedForeground }]}>All caught up for today</Text>
                  </View>
                )}
              </View>

              {((progress.nextBadge) || (progress.recentBadges && progress.recentBadges.length > 0)) && (
                <View style={s.badgesBlock}>
                  <Text style={s.blockTitle}>Milestones</Text>

                  {progress.nextBadge && (
                    <View style={s.nextBadgeBox}>
                      <Text style={s.nextBadgeName}>Next Badge: {progress.nextBadge.name}</Text>
                      <View style={s.progressBarContainer}>
                        <View style={[s.progressBarFill, { width: `${progress.nextBadge.progressPercent}%` }]} />
                      </View>
                      <View style={s.nextBadgeMeta}>
                        <Text style={s.nextBadgeText}>Streak progress</Text>
                        <Text style={s.nextBadgeText}>{progress.nextBadge.currentStreak} / {progress.nextBadge.requiredStreak} days</Text>
                      </View>
                    </View>
                  )}

                  {progress.recentBadges && progress.recentBadges.length > 0 && (
                    <View style={s.recentBadgesList}>
                      {progress.recentBadges.map((badge, idx) => (
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
            </>
          )}

          <ProEcosystemPortal user={currentUser} />
          <MoreFromAimd />

          {challengeLoading && !challengeData && (
            <View style={s.challengeBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {challengeIsError && !challengeData && (
            <View style={s.challengeBlock}>
              <Feather name="cloud-off" size={28} color={colors.mutedForeground} />
              <Text style={s.centeredTitle}>Could not load the weekly challenge</Text>
              <TouchableOpacity
                style={s.retryBtn}
                onPress={() => refetchChallenge()}
                accessibilityRole="button"
                accessibilityLabel="Retry weekly challenge"
              >
                <Text style={s.retryBtnText}>Retry Challenge</Text>
              </TouchableOpacity>
            </View>
          )}

          {challengeData && challengeData.challenge && (
            <View style={s.challengeBlock}>
              <View style={s.challengeHeader}>
                <Text style={s.challengeTitle}>Weekly Challenge</Text>
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
              ) : (
                <TouchableOpacity
                  style={[s.actionBtn, { borderColor: colors.primary }]}
                  testID="challenge-submit-button"
                  accessibilityRole="button"
                  accessibilityLabel="Submit a weekly challenge entry"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setComposing(true);
                  }}
                >
                  <Feather name="upload" size={18} color={colors.primary} />
                  <Text style={[s.actionBtnText, { color: colors.primary }]}>Submit Entry</Text>
                </TouchableOpacity>
              )}

              {challengeData.submissions.length > 0 && (
                <View style={s.submissionsSection}>
                  <Text style={s.submissionsHeading}>Community Submissions</Text>
                  {challengeData.submissions.map((submission) => {
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
