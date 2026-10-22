import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
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
  useGetWorkshop,
  useListAssignments,
  useListWorkshops,
  useCompleteWorkshopModule,
  useEnrollInWorkshop,
  getListEnrollmentsQueryKey,
  useSubmitAssignment,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { safeImpact } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import WorkshopLessonPlayer, { TeaserVideo, type WorkshopLesson } from '@/components/WorkshopLessonPlayer';
import WorkshopPreviewPlaceholder from '@/components/WorkshopPreviewPlaceholder';
import InstructorAttribution from '@/components/InstructorAttribution';
import { COMING_SOON_WORKSHOP_PREVIEWS } from '@/lib/workshopPreviews';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

type CapturedVideo = {
  uri: string;
  contentType: string;
  fileName: string;
  durationSecs: number;
};


export default function WorkshopsScreen({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const topPad = embedded ? 16 : Platform.OS === 'web' ? 67 : insets.top + 8;
  const scrollRef = useRef<ScrollView>(null);
  const pendingDetailsScroll = useRef(false);
  const detailsTopY = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<WorkshopLesson | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<CapturedVideo | null>(null);
  const [drillCameraVisible, setDrillCameraVisible] = useState(false);
  const [submissionNote, setSubmissionNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submissionReceived, setSubmissionReceived] = useState<{ workshopId: number; moduleId: number } | null>(null);

  useEffect(() => { setSubmissionReceived(null); }, [selectedWorkshopId, selectedModuleId]);

  const {
    data: workshopsResponse,
    isLoading: workshopsLoading,
    isError: workshopsError,
    refetch: refetchWorkshops,
  } = useListWorkshops({});
  const workshopsInvalid = workshopsResponse != null && !Array.isArray(workshopsResponse);
  const workshops = useMemo(() => Array.isArray(workshopsResponse) ? workshopsResponse.filter(workshop => workshop != null && typeof workshop.id === 'number') : [], [workshopsResponse]);
  const workshopQueryId = selectedWorkshopId ?? 0;
  const {
    data: workshopDetail,
    isError: workshopDetailError,
    refetch: refetchWorkshopDetail,
  } = useGetWorkshop(workshopQueryId, {
    query: {
      enabled: selectedWorkshopId !== null,
      queryKey: getGetWorkshopQueryKey(workshopQueryId),
    },
  });
  // Server-authoritative access only; never local tier or RevenueCat flags.
  const accessUnavailable = workshopDetail?.accessStatus === 'unavailable';
  const hasFullAccess = !!workshopDetail?.hasFullAccess && !accessUnavailable;
  const isEnrolled = !!workshopDetail?.isEnrolled;
  const enroll = useEnrollInWorkshop({
    mutation: {
      onSuccess: (en) => {
        queryClient.invalidateQueries({ queryKey: getGetWorkshopQueryKey(workshopQueryId) });
        queryClient.invalidateQueries({ queryKey: getListEnrollmentsQueryKey() });
        if (en?.status === 'paused') Alert.alert('Enrollment paused', 'Your enrollment is paused, so progress and assignments are unavailable until it is resumed.');
        else void safeImpact();
      },
      onError: () => Alert.alert('Could not start workshop', 'Please check your connection and try again.'),
    },
  });
  const {
    data: assignmentsResponse,
    refetch: refetchAssignments,
  } = useListAssignments();
  const assignments = Array.isArray(assignmentsResponse) ? assignmentsResponse.filter(assignment => assignment != null && typeof assignment.id === 'number') : [];
  const modulesInvalid = workshopDetail != null && !Array.isArray(workshopDetail.modules);
  const modules = Array.isArray(workshopDetail?.modules) ? workshopDetail.modules.filter(module => module != null && typeof module.id === 'number') : [];
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
    if (selectedWorkshopId === null && workshops?.[0]) {
      setSelectedWorkshopId(workshops[0].id);
    }
  }, [selectedWorkshopId, workshops]);

  useEffect(() => {
    const firstModule = workshopDetail?.modules?.[0];
    if (firstModule && selectedModuleId === null) {
      setSelectedModuleId(firstModule.id);
    }
  }, [selectedModuleId, workshopDetail]);

  const submitAssignment = useSubmitAssignment({
    mutation: {
      onSuccess: (_assignment, variables) => {
        setUploading(false);
        setCapturedVideo(null);
        setSubmissionNote('');
        setSubmissionReceived({ workshopId: variables.data.workshopId, moduleId: variables.data.moduleId });
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
    setSubmissionReceived(null);
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
      await Promise.all([refetchWorkshops(), refetchAssignments()]);
    } finally {
      setRefreshing(false);
    }
  };

  const openLesson = (module: WorkshopLesson) => {
    setSelectedModuleId(module.id);
    setSelectedLesson(module);
    void safeImpact();
  };

  const selectWorkshop = (workshopId: number) => {
    if (workshopId === selectedWorkshopId && detailsTopY.current !== null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, detailsTopY.current - 12), animated: true });
      return;
    }
    pendingDetailsScroll.current = true;
    setSelectedWorkshopId(workshopId);
    setSelectedModuleId(null);
  };

  const onWorkshopDetailsLayout = (event: LayoutChangeEvent) => {
    const y = event.nativeEvent.layout.y;
    detailsTopY.current = y;
    if (!pendingDetailsScroll.current) return;
    pendingDetailsScroll.current = false;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    });
  };

  const completeLesson = (moduleId: number) => {
    if (!selectedWorkshopId) return;
    if (!isEnrolled) { Alert.alert('Start the workshop first', 'Close the lesson and tap Start workshop to save progress.'); return; }
    completeModule.mutate({ id: selectedWorkshopId, moduleId }, {
      onSuccess: () => {
        setSelectedLesson((current) => current?.id === moduleId ? { ...current, isCompleted: true } : current);
      },
    });
  };

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: Platform.OS === 'web' ? 120 : insets.bottom + 110 },
    header: {
      paddingTop: topPad,
      paddingHorizontal: embedded ? 20 : 16,
      paddingBottom: embedded ? 22 : 16,
      gap: embedded ? 6 : 12,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
     titleMark: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.studioOrange, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }], shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
    titleCopy: { flex: 1, minWidth: 0 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 26, letterSpacing: -0.6, color: colors.foreground },
    embeddedTitle: { fontFamily: 'DMSans_700Bold', fontSize: 26, letterSpacing: -0.6, color: colors.foreground },
    intro: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.mutedForeground },
    previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, paddingBottom: 10 },
     previewCard: {
       width: '48%',
      minHeight: 228,
      padding: 12,
       borderRadius: 20,
       backgroundColor: colors.ink,
       borderWidth: 2,
       borderColor: colors.ink,
      gap: 8,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 3 },
       shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    previewBadge: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 4 },
    previewBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 8, color: colors.inkForeground, letterSpacing: 0.7 },
    previewIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    previewEyebrow: { fontFamily: 'DMSans_700Bold', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase' },
    previewTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, lineHeight: 18, color: colors.inkForeground },
    previewBody: { fontFamily: 'DMSans_400Regular', fontSize: 11, lineHeight: 15, color: 'rgba(250,248,245,0.7)' },
    previewChips: { gap: 4, marginTop: 'auto' },
    previewChip: { fontFamily: 'DMSans_500Medium', fontSize: 9, color: colors.inkForeground },
    previewFooter: { borderTopWidth: 1, borderTopColor: 'rgba(250,248,245,0.16)', paddingTop: 7, marginTop: 3 },
    previewTier: { fontFamily: 'DMSans_700Bold', fontSize: 8, color: colors.cyan, letterSpacing: 0.5 },
    previewPrice: { fontFamily: 'DMSans_400Regular', fontSize: 9, lineHeight: 12, color: 'rgba(250,248,245,0.68)', marginTop: 2 },
     card: { padding: 16, borderRadius: 18, backgroundColor: colors.studioPaper, borderWidth: 1.5, borderColor: colors.studioInk, gap: 8, shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
    selectedCard: { borderColor: colors.electricMagenta, borderWidth: 2 },
    category: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: colors.sunsetCoral, textTransform: 'uppercase', letterSpacing: 1.2 },
    cardTitle: { fontFamily: 'DMSans_700Bold', fontSize: 17, color: colors.foreground },
    cardBody: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19, color: colors.mutedForeground },
    metaRow: { flexDirection: 'row', gap: 14 },
    meta: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.mutedForeground },
     submissionHub: { marginHorizontal: 20, marginTop: 4, padding: 18, borderRadius: colors.radius, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 14 },
     submissionHubEyebrow: { fontFamily: 'DMSans_700Bold', color: colors.cyan, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5 },
     submissionHubTitle: { fontFamily: 'DMSans_700Bold', color: colors.foreground, fontSize: 24 },
     submissionHubBody: { fontFamily: 'DMSans_400Regular', color: colors.mutedForeground, fontSize: 13, lineHeight: 19 },
    selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
     chip: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
     chipText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: colors.foreground },
    chipTextActive: { color: colors.accentForeground },
      detailNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
      detailNoticeText: { flex: 1, fontFamily: 'DMSans_400Regular', color: colors.foreground, fontSize: 12, lineHeight: 18 },
     detailRetry: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 8, backgroundColor: colors.gold },
      detailRetryText: { fontFamily: 'DMSans_700Bold', color: colors.ink, fontSize: 12 },
    picker: { padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gold, borderRadius: 10, alignItems: 'center', gap: 6 },
     pickerText: { fontFamily: 'DMSans_700Bold', color: colors.sunsetCoral, fontSize: 13 },
     note: { minHeight: 80, padding: 12, borderRadius: 9, backgroundColor: colors.background, color: colors.foreground, fontFamily: 'DMSans_400Regular', textAlignVertical: 'top' },
    submit: { paddingVertical: 13, borderRadius: 9, backgroundColor: colors.electricMagenta, alignItems: 'center' },
    submitText: { fontFamily: 'DMSans_700Bold', color: colors.primaryForeground },
     assignment: { padding: 12, backgroundColor: colors.background, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
    assignmentCopy: { flex: 1 },
     assignmentTitle: { fontFamily: 'DMSans_600SemiBold', color: colors.foreground, fontSize: 13 },
     assignmentMeta: { fontFamily: 'DMSans_400Regular', color: colors.mutedForeground, fontSize: 11 },
     assignmentReflection: { fontFamily: 'DMSans_400Regular', color: colors.foreground, fontSize: 11, lineHeight: 16, marginTop: 4 },
    locked: { margin: 20, padding: 22, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', gap: 10 },
    lockedTitle: { fontFamily: 'DMSans_700Bold', color: colors.foreground, fontSize: 21, textAlign: 'center' },
    lockedBody: { fontFamily: 'DMSans_400Regular', color: colors.mutedForeground, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    upgrade: { minHeight: 46, marginTop: 4, paddingHorizontal: 18, borderRadius: 10, backgroundColor: colors.electricMagenta, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    upgradeText: { fontFamily: 'DMSans_700Bold', color: colors.primaryForeground, fontSize: 14 },
    previewActions: { gap: 8, marginBottom: 8 },
     workshopCard: { borderRadius: 22, backgroundColor: colors.studioPaper, borderWidth: 1.5, borderColor: colors.studioInk, overflow: 'hidden', shadowColor: colors.studioShadow, shadowOffset: { width: 3, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
    workshopPreview: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
     workshopPreviewBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1.5, borderColor: colors.ink, borderRadius: 10, backgroundColor: colors.studioYellow, transform: [{ rotate: '-3deg' }] },
     workshopPreviewBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: colors.ink, letterSpacing: 0.8 },
     workshopCardInfo: { padding: 17, gap: 9 },
    workshopOpenHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    workshopOpenHintText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: colors.primary },
    ...{},
  }), [colors, insets, embedded, topPad]);

  const upgrade = () => { void safeImpact(); router.push('/membership'); };
  const selectedWorkshop = workshops?.find((w) => w.id === selectedWorkshopId);

  return (
    <View style={s.container} testID="workshops-screen">
      <KeyboardAwareScrollViewCompat
        ref={scrollRef}
        contentContainerStyle={s.content}
        bottomOffset={60}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={s.header}>
          {embedded ? (
            <>
              <Text style={s.embeddedTitle}>Workshops</Text>
            </>
          ) : (
            <View style={s.titleRow} testID="workshops-page-heading">
              <View style={s.titleMark}>
                <Feather name="play-circle" size={19} color={colors.ink} />
              </View>
              <View style={s.titleCopy}>
                <Text style={s.title} numberOfLines={1}>Workshops</Text>
              </View>
            </View>
          )}
          <Text style={s.intro}>Full lessons require membership or instructor enrollment.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            testID="open-learning-portfolio"
            onPress={() => router.push('/learning-portfolio')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start' }}
          >
            <Feather name="book-open" size={17} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: 'DMSans_600SemiBold', fontSize: 14 }}>My learning portfolio</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {workshopsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : workshopsError || workshopsInvalid ? (
            <View style={{ alignItems: 'center', paddingVertical: 16, gap: 10 }}>
              <Feather name="cloud-off" size={28} color={colors.mutedForeground} />
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>Could not load workshops.</Text>
              <TouchableOpacity onPress={() => void refetchWorkshops()} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }} testID="workshops-retry">
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.foreground }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !workshops?.length ? (
            <View style={{ gap: 10 }} testID="workshops-coming-soon">
              <Text style={s.intro}>Video previews and full lessons aren’t available yet.</Text>
              {COMING_SOON_WORKSHOP_PREVIEWS.map((preview) => (
                <View key={preview.title} style={s.workshopCard}>
                  <View style={s.workshopPreview}>
                    <WorkshopPreviewPlaceholder category={preview.category} title={preview.title} />
                  </View>
                  <View style={s.workshopCardInfo}>
                    <Text style={s.category}>{preview.category}</Text>
                    <Text style={s.cardTitle}>{preview.title}</Text>
                    <Text style={s.cardBody}>{preview.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : workshops.slice(0, 4).map((workshop) => (
            <View
              key={workshop.id}
              style={[s.workshopCard, selectedWorkshopId === workshop.id && s.selectedCard]}
              testID={`workshop-card-container-${workshop.id}`}
            >
              <View style={s.workshopPreview}>
                {workshop.previewVideoUrl ? (
                  <TeaserVideo uri={workshop.previewVideoUrl} />
                ) : (
                  <WorkshopPreviewPlaceholder category={workshop.category} title={workshop.title} />
                )}
                {!!workshop.previewVideoUrl && (
                  <View pointerEvents="none" style={s.workshopPreviewBadge}>
                    <Text style={s.workshopPreviewBadgeText}>FREE PREVIEW</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={s.workshopCardInfo}
                onPress={() => selectWorkshop(workshop.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${workshop.title}`}
                accessibilityHint="Opens workshop details and the lesson list."
                testID={`workshop-card-${workshop.id}`}
              >
                <Text style={s.category}>{workshop.category}</Text>
                <Text style={s.cardTitle}>{workshop.title}</Text>
                <InstructorAttribution name={workshop.instructorName} />
                <Text style={s.cardBody} numberOfLines={3}>{workshop.description}</Text>
                <View style={s.metaRow}>
                  <Text style={s.meta}>{workshop.totalModules} modules</Text>
                </View>
                <View style={s.workshopOpenHint}>
                  <Text style={s.workshopOpenHintText}>View workshop</Text>
                  <Feather name="arrow-right" size={15} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {selectedWorkshop && (
          <View
            key={selectedWorkshop.id}
            style={s.locked}
            onLayout={onWorkshopDetailsLayout}
            testID="workshop-detail-panel"
          >
            {workshopDetail?.previewVideoUrl && (
              <View style={{ alignSelf: 'stretch', height: 200, backgroundColor: '#171311', borderRadius: 10, overflow: 'hidden' }}>
                <TeaserVideo uri={workshopDetail.previewVideoUrl} />
              </View>
            )}
            <Text style={s.lockedTitle}>{selectedWorkshop.title}</Text>
            <InstructorAttribution name={workshopDetail?.instructorName ?? selectedWorkshop.instructorName} />
            {workshopDetailError || modulesInvalid ? (
              <TouchableOpacity onPress={() => void refetchWorkshopDetail()} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.foreground }}>Could not load modules. Retry</Text>
              </TouchableOpacity>
            ) : !workshopDetail ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={{ alignSelf: 'stretch', gap: 8 }}>
                {accessUnavailable && (
                  <TouchableOpacity style={s.detailRetry} onPress={() => void refetchWorkshopDetail()} testID="access-retry">
                    <Feather name="refresh-cw" size={15} color={colors.ink} />
                    <Text style={s.detailRetryText}>Unable to verify your access. Retry</Text>
                  </TouchableOpacity>
                )}
                {!hasFullAccess && !accessUnavailable && (
                  <Text style={s.lockedBody}>
                    {workshopDetail.accessStatus === 'unavailable' ? 'This workshop is not available right now.' : 'Teasers are open. Full lessons need an active Dedicated Artist subscription ($39/month) or enrollment in this workshop.'}
                  </Text>
                )}
                {modules.length === 0 && <Text style={s.lockedBody}>No modules have been added yet.</Text>}
                {modules.map((module) => (
                  <TouchableOpacity key={module.id} style={s.card} onPress={() => openLesson(module)} testID={`module-row-${module.id}`}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Feather name={module.isLocked || !hasFullAccess ? 'lock' : 'play-circle'} size={18} color={colors.gold} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardTitle}>{module.order}. {module.title}</Text>
                        <Text style={s.meta}>{module.durationMinutes} min{module.previewVideoUrl ? ' · teaser' : ''}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {!hasFullAccess && !accessUnavailable && (
                  <TouchableOpacity style={[s.upgrade, { backgroundColor: colors.foreground }]} testID="mastery-upgrade" accessibilityRole="button" accessibilityLabel="Unlock Full Access" onPress={upgrade}>
                    <Feather name="arrow-up-right" size={17} color={colors.background} />
                    <Text style={[s.upgradeText, { color: colors.background }]}>Unlock Full Access</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {hasFullAccess && !isEnrolled && workshopDetail && (
          <View style={s.submissionHub} testID="start-workshop">
            <Text style={s.submissionHubTitle}>Start this workshop</Text>
            <Text style={s.submissionHubBody}>Start the workshop to save progress and submit assignments.</Text>
            <TouchableOpacity style={s.submit} disabled={enroll.isPending} onPress={() => enroll.mutate({ id: workshopQueryId })} testID="start-workshop-btn">
              {enroll.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={s.submitText}>Start workshop</Text>}
            </TouchableOpacity>
          </View>
        )}
        {hasFullAccess && isEnrolled && (
          <View style={s.submissionHub} testID="assignment-hub">
              <Text style={s.submissionHubEyebrow}>Private Workshop Portfolio</Text>
              <Text style={s.submissionHubTitle}>Share your practice & reflection</Text>
              <Text style={s.submissionHubBody}>
                Record a focused practice drill and reflect on the lesson. Your work is saved here and sent to the instructor reviewing this workshop; it is not posted to your public profile.
              </Text>
              {submissionReceived?.workshopId === selectedWorkshopId && submissionReceived?.moduleId === selectedModuleId && (
                <View testID="workshop-submission-received" accessibilityLiveRegion="polite" style={{ padding: 14, gap: 8, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Feather name="check-circle" size={20} color={colors.foreground} />
                    <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: colors.foreground }}>Submission received</Text>
                  </View>
                  <Text style={s.submissionHubBody}>Your practice and reflection were saved to your private learning portfolio and sent for instructor review.</Text>
                </View>
              )}
              {workshopDetailError || modulesInvalid ? (
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
                    <Feather name="refresh-cw" size={15} color={colors.primaryForeground} />
                    <Text style={s.detailRetryText}>Retry loading drills</Text>
                  </TouchableOpacity>
                </View>
              ) : workshopDetail && modules.length === 0 ? (
                <View style={s.detailNotice} testID="workshop-empty-modules">
                  <Feather name="info" size={17} color={colors.sunsetCoral} />
                  <Text style={s.detailNoticeText}>
                    Drills are temporarily unavailable for this workshop. Please check back soon.
                  </Text>
                </View>
              ) : (
                <View style={s.selector}>
                  {modules.map((module) => (
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
                onPress={() => { setSubmissionReceived(null); setDrillCameraVisible(true); }}
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
                onChangeText={(text) => { setSubmissionNote(text); setSubmissionReceived(null); }}
                editable={!uploading && !submitAssignment.isPending}
                placeholder="Reflection (optional): What did you try from this lesson, and what will you practice next?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={500}
                accessibilityLabel="Optional lesson reflection for your workshop portfolio"
                testID="workshop-reflection-input"
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
                  <Text style={s.submissionHubEyebrow}>Recent portfolio work</Text>
                  {assignments?.slice(0, 3).map((assignment) => (
                    <View key={assignment.id} style={s.assignment} testID={`assignment-item-${assignment.id}`}>
                      <Feather name={assignment.status === 'reviewed' ? 'check-circle' : 'clock'} size={18} color={assignment.status === 'reviewed' ? colors.cyan : colors.gold} />
                      <View style={s.assignmentCopy}>
                        <Text style={s.assignmentTitle}>{assignment.moduleTitle ?? assignment.workshopTitle ?? 'Workshop project'}</Text>
                        <Text style={s.assignmentMeta}>{assignment.status === 'pending' ? 'Pending instructor review' : assignment.status === 'revision_requested' ? 'Revision requested' : 'Instructor feedback ready'}</Text>
                        {!!assignment.submissionNote && (
                          <Text style={s.assignmentReflection} numberOfLines={2}>
                            Reflection: {assignment.submissionNote}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
        )}
      </KeyboardAwareScrollViewCompat>

      <DrillCameraCapture
        visible={drillCameraVisible}
        onClose={() => setDrillCameraVisible(false)}
        onCaptured={(video) => {
          setSubmissionReceived(null);
          setCapturedVideo(video);
          setDrillCameraVisible(false);
          void safeImpact();
        }}
      />
      <WorkshopLessonPlayer
        visible={selectedLesson !== null}
        lesson={selectedLesson}
        workshopId={selectedWorkshopId}
        hasFullAccess={hasFullAccess}
        accessUnavailable={accessUnavailable}
        instructorName={workshopDetail?.instructorName ?? selectedWorkshop?.instructorName}
        isEnrolled={isEnrolled}
        onRefreshAccess={() => void refetchWorkshopDetail()}
        onUpgrade={() => { setSelectedLesson(null); upgrade(); }}
        workshopTitle={workshopDetail?.title}
        completing={completeModule.isPending}
        onClose={() => setSelectedLesson(null)}
        onComplete={completeLesson}
        onStartAssignment={(moduleId) => {
          setSubmissionReceived(null);
          setSelectedModuleId(moduleId);
          setSelectedLesson(null);
          setDrillCameraVisible(true);
        }}
      />
    </View>
  );
}
