import React, { useEffect, useMemo, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DrillCameraCapture from '@/components/DrillCameraCapture';
import {
  customFetch,
  getGetWorkshopQueryKey,
  getListAssignmentsQueryKey,
  useGetCurrentUser,
  useGetWorkshop,
  useListAssignments,
  useListWorkshops,
  useCompleteWorkshopModule,
  useSubmitAssignment,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { safeImpact } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/lib/revenuecat';
import WorkshopLessonPlayer, { type WorkshopLesson } from '@/components/WorkshopLessonPlayer';

const workshopPreviews = [
  {
    icon: 'scissors' as const,
    title: 'Fashion Workshop',
    eyebrow: '01 / Fashion',
    description: 'Design, sketching, garment construction',
    chips: ['8 focused modules', '30-min drills', 'Artist feedback'],
    accent: 'gold' as const,
    tier: 'FASHION DESIGN',
  },
  {
    icon: 'headphones' as const,
    title: 'Music Workshop',
    eyebrow: '02 / Music',
    description: 'Audio production, beat-making, mixing',
    chips: ['10 focused modules', '30-min drills', 'Artist feedback'],
    accent: 'cyan' as const,
    tier: 'MUSIC PRODUCTION',
  },
  {
    icon: 'activity' as const,
    title: 'Basketball Workshop',
    eyebrow: '03 / Basketball',
    description: 'Skills, IQ, physical fitness',
    chips: ['12 focused modules', '30-min drills', 'Artist feedback'],
    accent: 'coral' as const,
    tier: 'BASKETBALL',
  },
  {
    icon: 'feather' as const,
    title: 'Visual Arts Workshop',
    eyebrow: '04 / Visual Arts',
    description: 'Painting, illustration, mixed media',
    chips: ['10 focused modules', '30-min drills', 'Artist feedback'],
    accent: 'magenta' as const,
    tier: 'VISUAL ARTS',
  },
];

type CapturedVideo = {
  uri: string;
  contentType: string;
  fileName: string;
  durationSecs: number;
};

export default function WorkshopsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hasAcademyAccess, isLoading: membershipLoading } = useSubscription();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<WorkshopLesson | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<CapturedVideo | null>(null);
  const [drillCameraVisible, setDrillCameraVisible] = useState(false);
  const [submissionNote, setSubmissionNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: user, isLoading: userLoading, refetch: refetchUser } = useGetCurrentUser();
  const hasLocalPhaseTwo =
    user?.tier === 'workshop' ||
    user?.tier === 'academy' ||
    user?.tier === 'pro';
  const hasPhaseTwo = hasLocalPhaseTwo || hasAcademyAccess;
  const {
    data: workshops,
    isLoading: workshopsLoading,
    isError: workshopsError,
    refetch: refetchWorkshops,
  } = useListWorkshops(
    { tier: 'workshop' },
  );
  const previewWorkshops = useMemo(
    () => (workshops ?? []).filter((workshop) => {
      const searchable = `${workshop.title} ${workshop.instructorName ?? ''}`.toLowerCase();
      return searchable.includes('poncho') || searchable.includes('tattoo') || searchable.includes('fine art');
    }).slice(0, 1),
    [workshops],
  );
  const workshopQueryId = selectedWorkshopId ?? 0;
  const {
    data: workshopDetail,
    isError: workshopDetailError,
    refetch: refetchWorkshopDetail,
  } = useGetWorkshop(workshopQueryId, {
    query: {
      // Signed-in free members receive the server-enforced Module 1 preview.
      enabled: selectedWorkshopId !== null,
      queryKey: getGetWorkshopQueryKey(workshopQueryId),
    },
  });
  const {
    data: assignments,
    refetch: refetchAssignments,
  } = useListAssignments();
  const completeModule = useCompleteWorkshopModule({
    mutation: {
      onSuccess: () => {
        void safeImpact();
        queryClient.invalidateQueries({ queryKey: getGetWorkshopQueryKey(workshopQueryId) });
      },
      onError: () => Alert.alert('Could not update progress', 'Please check your connection and try again.'),
    },
  });

  useEffect(() => {
    if (selectedWorkshopId === null && previewWorkshops[0]) {
      setSelectedWorkshopId(previewWorkshops[0].id);
    }
  }, [selectedWorkshopId, previewWorkshops]);

  useEffect(() => {
    const firstModule = workshopDetail?.modules?.[0];
    if (firstModule && selectedModuleId === null) {
      setSelectedModuleId(firstModule.id);
    }
  }, [selectedModuleId, workshopDetail]);

  const submitAssignment = useSubmitAssignment({
    mutation: {
      onSuccess: () => {
        setUploading(false);
        setCapturedVideo(null);
        setSubmissionNote('');
        void safeImpact();
        queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
        Alert.alert('Footage received', 'Your assignment is now in the instructor review queue.');
      },
      onError: () => {
        setUploading(false);
        Alert.alert('Submission failed', 'Your footage could not be submitted. Check your connection and try again.');
      },
    },
  });

  const handleSubmit = async () => {
    if (!capturedVideo || !selectedWorkshopId || !selectedModuleId) return;
    setUploading(true);
    try {
      const response = await fetch(capturedVideo.uri);
      const body = await response.arrayBuffer();
      const uploaded = await customFetch<{
        objectPath: string;
        measuredDurationSeconds: number;
      }>('/api/storage/uploads', {
        method: 'POST',
        headers: {
          'Content-Type': capturedVideo.contentType,
          'X-AIMD-Upload-Purpose': 'assignment',
          'X-AIMD-Capture-Source': 'native_camera',
          'X-AIMD-Capture-Duration': String(capturedVideo.durationSecs),
        },
        body,
      });
      submitAssignment.mutate({
        data: {
          workshopId: selectedWorkshopId,
          moduleId: selectedModuleId,
          submissionUrl: `/api/storage${uploaded.objectPath}`,
          submissionNote: submissionNote.trim() || null,
        },
      });
    } catch {
      setUploading(false);
      Alert.alert('Upload failed', 'The footage upload was interrupted. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchUser(), refetchWorkshops(), refetchAssignments()]);
    } finally {
      setRefreshing(false);
    }
  };

  const openLesson = (module: WorkshopLesson) => {
    setSelectedModuleId(module.id);
    setSelectedLesson(module);
    void safeImpact();
  };

  const completeLesson = (moduleId: number) => {
    if (!selectedWorkshopId) return;
    completeModule.mutate({ id: selectedWorkshopId, moduleId }, {
      onSuccess: () => {
        setSelectedLesson((current) => current?.id === moduleId ? { ...current, isCompleted: true } : current);
      },
    });
  };

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: Platform.OS === 'web' ? 120 : insets.bottom + 110 },
    header: { paddingTop: Platform.OS === 'web' ? 77 : insets.top + 16, paddingHorizontal: 20, paddingBottom: 22, gap: 6 },
    eyebrow: { fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.sunsetCoral },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 30, letterSpacing: -0.8, color: colors.foreground },
    intro: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.mutedForeground },
    previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, paddingBottom: 10 },
    previewCard: { width: '48%', minHeight: 228, padding: 12, borderRadius: colors.radius, backgroundColor: colors.ink, borderWidth: 1, gap: 8 },
    previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    previewBadge: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 4 },
    previewBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 8, color: colors.background, letterSpacing: 0.7 },
    previewIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    previewEyebrow: { fontFamily: 'DMSans_700Bold', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase' },
    previewTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, lineHeight: 18, color: colors.background },
    previewBody: { fontFamily: 'DMSans_400Regular', fontSize: 11, lineHeight: 15, color: 'rgba(250,248,245,0.7)' },
    previewChips: { gap: 4, marginTop: 'auto' },
    previewChip: { fontFamily: 'DMSans_500Medium', fontSize: 9, color: colors.background },
    previewFooter: { borderTopWidth: 1, borderTopColor: 'rgba(250,248,245,0.16)', paddingTop: 7, marginTop: 3 },
    previewTier: { fontFamily: 'DMSans_700Bold', fontSize: 8, color: colors.cyan, letterSpacing: 0.5 },
    previewPrice: { fontFamily: 'DMSans_400Regular', fontSize: 9, lineHeight: 12, color: 'rgba(250,248,245,0.68)', marginTop: 2 },
    card: { padding: 16, borderRadius: colors.radius, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 8 },
    selectedCard: { borderColor: colors.electricMagenta, borderWidth: 2 },
    category: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: colors.sunsetCoral, textTransform: 'uppercase', letterSpacing: 1.2 },
    cardTitle: { fontFamily: 'DMSans_700Bold', fontSize: 17, color: colors.foreground },
    cardBody: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19, color: colors.mutedForeground },
    metaRow: { flexDirection: 'row', gap: 14 },
    meta: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.mutedForeground },
    submissionHub: { marginHorizontal: 20, marginTop: 4, padding: 18, borderRadius: colors.radius, backgroundColor: colors.foreground, gap: 14 },
    submissionHubEyebrow: { fontFamily: 'DMSans_700Bold', color: colors.cyan, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5 },
    submissionHubTitle: { fontFamily: 'DMSans_700Bold', color: colors.background, fontSize: 24 },
    submissionHubBody: { fontFamily: 'DMSans_400Regular', color: colors.background, opacity: 0.78, fontSize: 13, lineHeight: 19 },
    selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(250,248,245,0.25)' },
    chipActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
    chipText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: colors.background },
    chipTextActive: { color: colors.accentForeground },
     detailNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.09)' },
     detailNoticeText: { flex: 1, fontFamily: 'DMSans_400Regular', color: colors.background, opacity: 0.82, fontSize: 12, lineHeight: 18 },
     detailRetry: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 8, backgroundColor: colors.gold },
     detailRetryText: { fontFamily: 'DMSans_700Bold', color: colors.background, fontSize: 12 },
    picker: { padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gold, borderRadius: 10, alignItems: 'center', gap: 6 },
    pickerText: { fontFamily: 'DMSans_700Bold', color: colors.gold, fontSize: 13 },
    note: { minHeight: 80, padding: 12, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.09)', color: colors.background, fontFamily: 'DMSans_400Regular', textAlignVertical: 'top' },
    submit: { paddingVertical: 13, borderRadius: 9, backgroundColor: colors.electricMagenta, alignItems: 'center' },
    submitText: { fontFamily: 'DMSans_700Bold', color: colors.primaryForeground },
    assignment: { padding: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
    assignmentCopy: { flex: 1 },
    assignmentTitle: { fontFamily: 'DMSans_600SemiBold', color: colors.background, fontSize: 13 },
    assignmentMeta: { fontFamily: 'DMSans_400Regular', color: colors.background, opacity: 0.65, fontSize: 11 },
    locked: { margin: 20, padding: 22, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', gap: 10 },
    lockedTitle: { fontFamily: 'DMSans_700Bold', color: colors.foreground, fontSize: 21, textAlign: 'center' },
    lockedBody: { fontFamily: 'DMSans_400Regular', color: colors.mutedForeground, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    upgrade: { minHeight: 46, marginTop: 4, paddingHorizontal: 18, borderRadius: 10, backgroundColor: colors.electricMagenta, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    upgradeText: { fontFamily: 'DMSans_700Bold', color: colors.primaryForeground, fontSize: 14 },
    previewActions: { gap: 8, marginBottom: 8 },
  }), [colors, insets]);

  if (userLoading || (!hasLocalPhaseTwo && membershipLoading)) {
    return <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={s.container} testID="workshops-screen">
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          <Text style={s.eyebrow}>AIMD Workshop Preview</Text>
          <Text style={s.title}>One craft. One apprenticeship.</Text>
          <Text style={s.intro}>Choose your lane. Build the work.</Text>
        </View>

        <View style={s.previewGrid} testID="workshop-preview-grid">
          {workshopPreviews.map((preview) => {
            const accent = preview.accent === 'magenta'
              ? colors.electricMagenta
              : preview.accent === 'cyan'
                ? colors.cyan
                : preview.accent === 'gold'
                  ? colors.gold
                  : colors.sunsetCoral;
            return (
              <View key={preview.title} style={[s.previewCard, { borderColor: `${accent}66` }]}>
                <View style={s.previewTop}>
                  <View style={[s.previewBadge, { borderColor: `${accent}88`, backgroundColor: `${accent}22` }]}>
                    <Text style={s.previewBadgeText}>COMING SOON</Text>
                  </View>
                  <View style={[s.previewIcon, { backgroundColor: `${accent}26` }]}>
                    <Feather name={preview.icon} size={17} color={accent} />
                  </View>
                </View>
                <Text style={[s.previewEyebrow, { color: accent }]}>{preview.eyebrow}</Text>
                <Text style={s.previewTitle}>{preview.title}</Text>
                <Text style={s.previewBody}>{preview.description}</Text>
                <View style={s.previewChips}>
                  {preview.chips.map((chip) => (
                    <Text key={chip} style={s.previewChip}>· {chip}</Text>
                  ))}
                </View>
                <View style={s.previewFooter}>
                  <Text style={s.previewTier}>{preview.tier} · DEDICATED</Text>
                  <Text style={s.previewPrice}>Access begins at $39/month when it opens.</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={s.locked}>
          <Feather name="play-circle" size={28} color={colors.gold} />
          <Text style={s.lockedTitle}>
            {hasPhaseTwo ? 'Keep your practice moving' : 'Start with a real Module 1 preview'}
          </Text>
          <Text style={s.lockedBody}>
            {hasPhaseTwo
              ? 'Pick a module and make something.'
              : 'One focused lesson to get you moving. Unlock the full curriculum when it opens.'}
          </Text>
          <View style={{ alignSelf: 'stretch', gap: 8 }}>
            {workshopsLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : workshopsError ? (
              <View style={{ alignItems: 'center', paddingVertical: 16, gap: 10 }}>
                <Feather name="cloud-off" size={28} color={colors.mutedForeground} />
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>
                  Could not load the preview.
                </Text>
                <TouchableOpacity onPress={() => void refetchWorkshops()} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.foreground }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : !previewWorkshops.length ? (
              <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
                <Feather name="play-circle" size={28} color={colors.mutedForeground} />
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>
                  The preview is coming soon.
                </Text>
              </View>
            ) : previewWorkshops.map((workshop) => {
              const isSelected = selectedWorkshopId === workshop.id;
              return (
                <View key={workshop.id} style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={[s.card, isSelected && s.selectedCard]}
                    onPress={() => {
                      setSelectedWorkshopId(workshop.id);
                      setSelectedModuleId(null);
                    }}
                    testID={`workshop-preview-${workshop.id}`}
                  >
                    <Text style={s.cardTitle}>{workshop.title}</Text>
                    <Text style={s.cardBody}>Module 1 preview · {workshop.instructorName ?? 'AIMD Faculty'}</Text>
                  </TouchableOpacity>
                  {isSelected && workshopDetail?.modules[0] && (
                    <View style={s.previewActions}>
                      <TouchableOpacity
                        style={s.upgrade}
                        onPress={() => openLesson(workshopDetail.modules[0])}
                        testID="workshop-preview-open"
                      >
                        <Feather name="play" size={17} color={colors.primaryForeground} />
                        <Text style={s.upgradeText}>Open Module 1 preview</Text>
                      </TouchableOpacity>
                      {!hasPhaseTwo && (
                        <TouchableOpacity
                          style={[s.upgrade, { backgroundColor: colors.foreground }]}
                          testID="mastery-upgrade"
                          accessibilityRole="button"
                          accessibilityLabel="View AIMD membership options"
                          onPress={() => {
                            void safeImpact();
                            router.push('/membership');
                          }}
                        >
                          <Feather name="arrow-up-right" size={17} color={colors.primaryForeground} />
                          <Text style={s.upgradeText}>View membership options</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {hasPhaseTwo && (
          <View style={s.submissionHub} testID="assignment-hub">
              <Text style={s.submissionHubEyebrow}>Assignment Submission</Text>
              <Text style={s.submissionHubTitle}>Send a practice drill</Text>
              <Text style={s.submissionHubBody}>Record one focused drill for your instructor.</Text>
              {workshopDetailError ? (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Text style={[s.submissionHubBody, { textAlign: 'center' }]}>
                    We could not load the drills for this workshop.
                  </Text>
                  <TouchableOpacity
                    onPress={() => void refetchWorkshopDetail()}
                    style={s.detailRetry}
                    testID="workshop-detail-retry"
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading workshop drills"
                  >
                    <Feather name="refresh-cw" size={15} color={colors.background} />
                    <Text style={s.detailRetryText}>Retry loading drills</Text>
                  </TouchableOpacity>
                </View>
              ) : workshopDetail && workshopDetail.modules?.length === 0 ? (
                <View style={s.detailNotice} testID="workshop-empty-modules">
                  <Feather name="info" size={17} color={colors.gold} />
                  <Text style={s.detailNoticeText}>
                    Drills are temporarily unavailable for this workshop. Please check back soon.
                  </Text>
                </View>
              ) : (
                <View style={s.selector}>
                  {workshopDetail?.modules?.map((module) => (
                    <TouchableOpacity
                      key={module.id}
                      style={[s.chip, selectedModuleId === module.id && s.chipActive]}
                      testID={`module-chip-${module.id}`}
                      onPress={() => openLesson(module)}
                    >
                      <Text style={[s.chipText, selectedModuleId === module.id && s.chipTextActive]}>
                        {module.isCompleted ? '✓ ' : ''}{module.order}. {module.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={s.picker}
                onPress={() => setDrillCameraVisible(true)}
                testID="assignment-record-video"
                accessibilityRole="button"
                accessibilityLabel="Record assignment footage"
              >
                <Feather name={capturedVideo ? 'check-circle' : 'video'} size={24} color={colors.gold} />
                <Text style={s.pickerText}>
                  {capturedVideo
                    ? `Footage recorded — ${Math.round(capturedVideo.durationSecs)}s`
                    : 'Record assignment footage'}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={s.note}
                value={submissionNote}
                onChangeText={setSubmissionNote}
                placeholder="Add context for your instructor (optional)"
                placeholderTextColor="rgba(250,248,245,0.4)"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[s.submit, { opacity: capturedVideo && selectedModuleId ? 1 : 0.4 }]}
                disabled={!capturedVideo || !selectedModuleId || uploading || submitAssignment.isPending}
                onPress={handleSubmit}
                testID="assignment-submit"
              >
                {uploading || submitAssignment.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Text style={s.submitText}>Send to instructor review</Text>}
              </TouchableOpacity>

              {(assignments?.length ?? 0) > 0 && (
                <>
                  <Text style={s.submissionHubEyebrow}>Recent submissions</Text>
                  {assignments?.slice(0, 3).map((assignment) => (
                    <View key={assignment.id} style={s.assignment} testID={`assignment-item-${assignment.id}`}>
                      <Feather name={assignment.status === 'reviewed' ? 'check-circle' : 'clock'} size={18} color={assignment.status === 'reviewed' ? colors.cyan : colors.gold} />
                      <View style={s.assignmentCopy}>
                        <Text style={s.assignmentTitle}>{assignment.workshopTitle ?? 'Workshop assignment'}</Text>
                        <Text style={s.assignmentMeta}>{assignment.status === 'reviewed' ? 'Instructor feedback ready' : 'Pending instructor review'}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
        )}
      </ScrollView>

      <DrillCameraCapture
        visible={drillCameraVisible}
        onClose={() => setDrillCameraVisible(false)}
        onCaptured={(video) => {
          setCapturedVideo(video);
          setDrillCameraVisible(false);
          void safeImpact();
        }}
      />
      <WorkshopLessonPlayer
        visible={selectedLesson !== null}
        lesson={selectedLesson}
        workshopTitle={workshopDetail?.title}
        completing={completeModule.isPending}
        onClose={() => setSelectedLesson(null)}
        onComplete={completeLesson}
        onStartAssignment={(moduleId) => {
          setSelectedModuleId(moduleId);
          setSelectedLesson(null);
          setDrillCameraVisible(true);
        }}
      />
    </View>
  );
}