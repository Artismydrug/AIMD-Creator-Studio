import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import ChallengeCameraCapture from '@/components/ChallengeCameraCapture';
import HabitCard, { HABIT_ACTION_HELP } from '@/components/HabitCard';
import { safeImpact } from '@/lib/haptics';
import {
  getGetCurrentChallengeQueryKey,
  getGetDashboardSummaryQueryKey,
  useGetCurrentChallenge,
  useListHabits,
  useGetDashboardSummary,
  useSubmitChallengeEntry,
} from '@workspace/api-client-react';
import {
  type ChallengeProofAsset,
  uploadChallengeProof,
} from '@/lib/challengeProof';

export default function ChallengesScreen({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [submitVisible, setSubmitVisible] = useState(false);
  const [caption, setCaption] = useState('');
  const [proof, setProof] = useState<ChallengeProofAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: challengeData,
    isLoading: challengeLoading,
    isError: challengeError,
    refetch: refetchChallenge,
  } = useGetCurrentChallenge();
  const { data: habitsResponse, refetch: refetchHabits } = useListHabits();
  const { data: summary } = useGetDashboardSummary();
  const habits = habitsResponse?.habits ?? [];
  const challenge = challengeData?.challenge;
  const topPad = embedded ? 16 : Platform.OS === 'web' ? 67 : insets.top + 8;

  const submitMutation = useSubmitChallengeEntry({
    mutation: {
      onSuccess: (result) => {
        setUploading(false);
        setSubmitVisible(false);
        setCaption('');
        setProof(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        void queryClient.invalidateQueries({ queryKey: getGetCurrentChallengeQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        Alert.alert(
          `+${result.pointsAwarded} AIMD points`,
          `Your original response was submitted. Your new balance is ${result.newBalance} points.`,
        );
      },
      onError: () => {
        setUploading(false);
        Alert.alert('Submission failed', 'Your proof could not be submitted. Please try again.');
      },
    },
  });

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchChallenge(), refetchHabits()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchChallenge, refetchHabits]);

  const openSubmission = () => {
    void safeImpact(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitVisible(true);
  };

  const submit = async () => {
    if (!caption.trim() || !proof || !challenge) return;
    setUploading(true);
    try {
      const uploaded = await uploadChallengeProof(proof, 'challenge_final');
      submitMutation.mutate({
        data: {
          caption: caption.trim(),
          tags: [],
          finalMedia: { objectPath: uploaded.objectPath },
          processMedia: null,
        },
      });
    } catch {
      setUploading(false);
      Alert.alert('Upload failed', 'Check your connection and capture the proof again.');
    }
  };

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: Platform.OS === 'web' ? 110 : insets.bottom + 110 },
    header: { paddingTop: topPad, paddingHorizontal: 20, paddingBottom: 18, gap: 5 },
    eyebrow: { alignSelf: 'flex-start', fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.7, color: colors.accentForeground, textTransform: 'uppercase', backgroundColor: colors.gold, borderRadius: 99, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 30, color: colors.foreground, letterSpacing: -0.9 },
    intro: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.mutedForeground },
    challengeCard: { marginHorizontal: 20, padding: 19, backgroundColor: colors.ink, borderRadius: colors.radius + 4, gap: 12, borderWidth: 2, borderColor: colors.primary },
    challengeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    challengeLabel: { fontFamily: 'DMSans_700Bold', color: colors.cyan, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
    challengeStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    challengeStatusText: { fontFamily: 'DMSans_600SemiBold', color: colors.primaryForeground, fontSize: 11 },
    challengeTitle: { fontFamily: 'DMSans_700Bold', color: colors.primaryForeground, fontSize: 24, letterSpacing: -0.5 },
    challengePrompt: { fontFamily: 'DMSans_400Regular', color: colors.primaryForeground, opacity: 0.82, fontSize: 14, lineHeight: 21 },
    challengeMeta: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
    meta: { fontFamily: 'DMSans_500Medium', color: colors.primaryForeground, opacity: 0.7, fontSize: 12 },
    primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: colors.electricMagenta, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    primaryButtonText: { fontFamily: 'DMSans_700Bold', color: colors.primaryForeground, fontSize: 14 },
    submitted: { minHeight: 46, borderWidth: 1, borderColor: colors.cyan, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    submittedText: { fontFamily: 'DMSans_700Bold', color: colors.cyan, fontSize: 14 },
    section: { paddingHorizontal: 20, paddingTop: 25, gap: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 19, color: colors.foreground },
    sectionHint: { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17, color: colors.mutedForeground },
    sectionLink: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: colors.primary },
    stats: { flexDirection: 'row', gap: 10 },
    stat: { flex: 1, padding: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, overflow: 'hidden' },
    statValue: { fontFamily: 'DMSans_700Bold', fontSize: 23, color: colors.primary },
    statLabel: { marginTop: 3, fontFamily: 'DMSans_500Medium', fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase' },
    empty: { padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card },
    emptyTitle: { fontFamily: 'DMSans_600SemiBold', fontSize: 15, color: colors.foreground },
    emptyBody: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.mutedForeground, textAlign: 'center' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
    sheet: { backgroundColor: colors.card, padding: 18, paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 18, gap: 14 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sheetTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.foreground },
    caption: { minHeight: 90, padding: 12, backgroundColor: colors.input, color: colors.foreground, fontFamily: 'DMSans_400Regular', fontSize: 15, textAlignVertical: 'top' },
    proofRow: { padding: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 10 },
    proofText: { flex: 1, fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.primary },
    hint: { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17, color: colors.mutedForeground },
  }), [colors, insets, topPad]);

  return (
    <View style={s.container} testID="challenges-habits-screen">
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {!embedded && (
          <View style={s.header}>
            <Text style={s.eyebrow}>Featured challenge</Text>
            <Text style={s.title}>Challenges & Habits</Text>
            <Text style={s.intro}>Make the work visible. Capture your challenge proof live, then keep your daily practice moving.</Text>
          </View>
        )}

        {challengeLoading ? (
          <View style={s.empty}><ActivityIndicator color={colors.primary} /></View>
        ) : challengeError || !challenge ? (
          <View style={[s.empty, { marginHorizontal: 20 }]}>
            <Feather name="calendar" size={28} color={colors.primary} />
            <Text style={s.emptyTitle}>No active challenge right now</Text>
            <Text style={s.emptyBody}>Your habit practice is still here. Check back when the next featured challenge unlocks.</Text>
          </View>
        ) : (
          <View style={s.challengeCard}>
            <View style={s.challengeTop}>
                <Text style={s.challengeLabel}>
                  {challenge.status === 'upcoming' ? 'Coming next' : challenge.status === 'active' ? 'Active challenge' : 'Challenge closed'}
                </Text>
              <View style={s.challengeStatus}>
                <Feather name="zap" size={13} color={colors.cyan} />
                <Text style={s.challengeStatusText}>+{challenge.submissionPoints} points</Text>
              </View>
            </View>
            <Text style={s.challengeTitle}>{challenge.theme}</Text>
            <Text style={s.challengePrompt}>{challenge.prompt}</Text>
            <View style={s.challengeMeta}>
              <Text style={s.meta}>
                {challenge.status === 'upcoming' ? 'Opens' : 'Due'}{' '}
                {new Date(challenge.status === 'upcoming' ? challenge.startsAt : challenge.deadline).toLocaleDateString()}
              </Text>
              <Text style={s.meta}>{challenge.totalSubmissions} submissions</Text>
            </View>
            {challengeData.hasSubmitted ? (
              <View style={s.submitted}>
                <Feather name="check-circle" size={17} color={colors.cyan} />
                <Text style={s.submittedText}>Entry submitted for review</Text>
              </View>
            ) : challenge.status === 'active' ? (
              <TouchableOpacity style={s.primaryButton} onPress={openSubmission} testID="challenges-submit-entry">
                <Feather name="camera" size={17} color={colors.primaryForeground} />
                <Text style={s.primaryButtonText}>Capture proof & submit</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.submitted}>
                <Feather name="calendar" size={17} color={colors.cyan} />
                <Text style={s.submittedText}>
                  {challenge.status === 'upcoming'
                    ? `Opens ${new Date(challenge.startsAt).toLocaleDateString()}`
                    : 'Submissions closed'}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Daily practice</Text>
            <TouchableOpacity onPress={() => { void safeImpact(); router.push('/habits'); }} testID="open-full-habits">
              <Text style={s.sectionLink}>Open full tracker</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.sectionHint} testID="habit-actions-help">{HABIT_ACTION_HELP}</Text>
          <View style={s.stats}>
            <View style={s.stat}><Text style={s.statValue}>{summary?.currentStreakDays ?? 0}</Text><Text style={s.statLabel}>Day streak</Text></View>
            <View style={s.stat}><Text style={s.statValue}>{habits.filter((habit) => habit.completedToday).length}</Text><Text style={s.statLabel}>Done today</Text></View>
            <View style={s.stat}><Text style={s.statValue}>{Math.round(summary?.completionRate ?? 0)}%</Text><Text style={s.statLabel}>Practice rate</Text></View>
          </View>
          {habits.length > 0 ? habits.slice(0, 3).map((habit) => (
            <HabitCard key={habit.id} habit={habit} onLogged={refetchHabits} onDeleted={refetchHabits} />
          )) : (
            <View style={s.empty}>
              <Feather name="activity" size={25} color={colors.primary} />
              <Text style={s.emptyTitle}>Start a creative habit</Text>
              <Text style={s.emptyBody}>Build a repeatable practice and track it here.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ChallengeCameraCapture
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCaptured={(asset) => {
          setProof(asset);
          setCameraVisible(false);
          void safeImpact(Haptics.ImpactFeedbackStyle.Medium);
        }}
      />

      <View>
        {submitVisible && (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
            <View style={s.modalOverlay}>
              <View style={s.sheet}>
                <View style={s.sheetHeader}>
                  <TouchableOpacity onPress={() => { setSubmitVisible(false); setProof(null); setCaption(''); }} accessibilityLabel="Close submission">
                    <Feather name="x" size={22} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <Text style={s.sheetTitle}>Submit challenge proof</Text>
                  <TouchableOpacity onPress={submit} disabled={!caption.trim() || !proof || uploading} testID="submit-challenge-proof">
                    {uploading ? <ActivityIndicator color={colors.primary} /> : <Text style={[s.sectionLink, { opacity: caption.trim() && proof ? 1 : 0.35 }]}>Submit</Text>}
                  </TouchableOpacity>
                </View>
                <Text style={s.hint}>Your final proof must be captured live in the AIMD camera. It is sent to human review with its capture metadata.</Text>
                <TextInput
                  style={s.caption}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="Tell us about your piece…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity style={s.proofRow} onPress={() => { setCameraVisible(true); void safeImpact(); }} testID="challenge-capture-proof">
                  <Feather name={proof ? 'check-circle' : 'camera'} size={21} color={colors.primary} />
                  <Text style={s.proofText}>{proof ? `Live ${proof.mediaType} captured` : 'Capture live photo or video proof'}</Text>
                  <Feather name="chevron-right" size={17} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}