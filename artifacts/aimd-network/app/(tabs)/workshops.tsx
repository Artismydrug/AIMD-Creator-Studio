import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  useSubmitAssignment,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { safeImpact } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/lib/revenuecat';

const featuredTracks = [
  {
    icon: 'feather' as const,
    title: 'Visual Arts Foundations',
    instructor: 'Drawing, painting, and mixed media',
    accent: 'coral' as const,
  },
  {
    icon: 'edit-3' as const,
    title: 'Tattoo Apprenticeship Prep',
    instructor: 'Poncho The Artist',
    accent: 'magenta' as const,
  },
  {
    icon: 'headphones' as const,
    title: 'Audio Production',
    instructor: 'Beat-making and studio fundamentals',
    accent: 'cyan' as const,
  },
  {
    icon: 'scissors' as const,
    title: 'Garment Design',
    instructor: 'Pattern, construction, and finish',
    accent: 'coral' as const,
  },
  {
    icon: 'activity' as const,
    title: 'The Art of Basketball',
    instructor: 'David Singleton',
    accent: 'magenta' as const,
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
    refetch: refetchWorkshops,
  } = useListWorkshops(
    { tier: 'workshop' },
  );
  const workshopQueryId = selectedWorkshopId ?? 0;
  const { data: workshopDetail } = useGetWorkshop(workshopQueryId, {
    query: {
      enabled: selectedWorkshopId !== null && hasPhaseTwo,
      queryKey: getGetWorkshopQueryKey(workshopQueryId),
    },
  });
  const {
    data: assignments,
    refetch: refetchAssignments,
  } = useListAssignments();

  useEffect(() => {
    if (selectedWorkshopId === null && workshops?.[0]) {
      setSelectedWorkshopId(workshops[0].id);
    }
  }, [selectedWorkshopId, workshops]);

  useEffect(() => {
    if (workshopDetail?.modules[0] && selectedModuleId === null) {
      setSelectedModuleId(workshopDetail.modules[0].id);
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

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: Platform.OS === 'web' ? 120 : insets.bottom + 110 },
    header: { paddingTop: Platform.OS === 'web' ? 77 : insets.top + 16, paddingHorizontal: 20, paddingBottom: 22, gap: 6 },
    eyebrow: { fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.sunsetCoral },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 30, letterSpacing: -0.8, color: colors.foreground },
    intro: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.mutedForeground },
    section: { paddingHorizontal: 20, paddingVertical: 18, gap: 12 },
    sectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 19, color: colors.foreground },
    trackRow: { gap: 10 },
    track: { padding: 16, borderRadius: colors.radius, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
    trackIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    trackTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: colors.foreground },
    trackMeta: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.mutedForeground },
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
          <Text style={s.eyebrow}>Dedicated Artist · Workshops & Masterclasses</Text>
          <Text style={s.title}>Build mastery. Show the work.</Text>
          <Text style={s.intro}>Video-led instruction across visual arts, tattoo prep, audio production, garment design, and more — with direct instructor feedback.</Text>
        </View>

        {!hasPhaseTwo ? (
          <View style={s.locked}>
            <Feather name="lock" size={28} color={colors.gold} />
            <Text style={s.lockedTitle}>Dedicated Artist access required</Text>
            <Text style={s.lockedBody}>Upgrade to Dedicated Artist to unlock the full Workshops and Masterclasses library and assignment submission with direct instructor feedback.</Text>
            <TouchableOpacity
              style={s.upgrade}
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
          </View>
        ) : (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Featured masterclass tracks</Text>
              <View style={s.trackRow}>
                {featuredTracks.map((track) => {
                  const accent = track.accent === 'magenta' ? colors.electricMagenta : track.accent === 'cyan' ? colors.cyan : colors.sunsetCoral;
                  return (
                    <View key={track.title} style={s.track} testID={`track-${track.title.replace(/\s+/g, '-').toLowerCase()}`}>
                      <View style={[s.trackIcon, { backgroundColor: accent }]}><Feather name={track.icon} size={19} color={colors.primaryForeground} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.trackTitle}>{track.title}</Text>
                        <Text style={s.trackMeta}>{track.instructor}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Video Masterclasses</Text>
              {workshopsLoading ? <ActivityIndicator color={colors.primary} /> : workshops?.map((workshop) => (
                <TouchableOpacity
                  key={workshop.id}
                  style={[s.card, selectedWorkshopId === workshop.id && s.selectedCard]}
                  testID={`workshop-card-${workshop.id}`}
                  onPress={() => {
                    setSelectedWorkshopId(workshop.id);
                    setSelectedModuleId(null);
                    void safeImpact();
                  }}
                >
                  {workshop.thumbnailUrl ? <Image source={{ uri: workshop.thumbnailUrl }} style={{ width: '100%', height: 130, borderRadius: 8 }} /> : null}
                  <Text style={s.category}>{workshop.category}</Text>
                  <Text style={s.cardTitle}>{workshop.title}</Text>
                  <Text style={s.cardBody}>{workshop.description}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.meta}>{workshop.totalModules} modules</Text>
                    <Text style={s.meta}>{workshop.durationMinutes ?? 0} min</Text>
                    <Text style={s.meta}>{workshop.instructorName ?? 'AIMD Faculty'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.submissionHub} testID="assignment-hub">
              <Text style={s.submissionHubEyebrow}>Assignment Submission</Text>
              <Text style={s.submissionHubTitle}>Record and submit footage</Text>
              <Text style={s.submissionHubBody}>Select a module, record a short clip live in the app, and place it in the instructor review queue.</Text>
              <View style={s.selector}>
                {workshopDetail?.modules.map((module) => (
                  <TouchableOpacity
                    key={module.id}
                    style={[s.chip, selectedModuleId === module.id && s.chipActive]}
                    testID={`module-chip-${module.id}`}
                    onPress={() => setSelectedModuleId(module.id)}
                  >
                    <Text style={[s.chipText, selectedModuleId === module.id && s.chipTextActive]}>{module.order}. {module.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
                placeholderTextColor={colors.background}
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
          </>
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
    </View>
  );
}