import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBaseUrl, useCreateWorkshopLessonPlayback } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import LessonReflectionForm from '@/components/LessonReflectionForm';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

export type WorkshopLesson = {
  id: number;
  order: number;
  title: string;
  description?: string | null;
  previewVideoUrl?: string | null;
  hasVideo?: boolean;
  isLocked?: boolean;
  durationMinutes?: number | null;
  isCompleted?: boolean;
  drills?: Array<{
    id: number;
    prompt: string;
    maxDurationSeconds: number;
  }>;
};

type Props = {
  visible: boolean;
  lesson: WorkshopLesson | null;
  workshopTitle?: string;
  workshopId?: number | null;
  hasFullAccess?: boolean;
  isEnrolled?: boolean;
  onUpgrade?: () => void;
  onRefreshAccess?: () => void;
  onClose: () => void;
  onComplete: (lessonId: number) => void;
  onStartAssignment: (lessonId: number) => void;
  completing?: boolean;
};

export function resolveMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (Platform.OS === 'web') return url;
  return `${(getBaseUrl() ?? '').replace(/\/$/, '')}${url}`;
}

type Resume = { time: number; playing: boolean } | null;

function NativeVideo({ uri, resume, onFail }: { uri: string; resume?: React.MutableRefObject<Resume>; onFail?: (time: number) => void }) {
  const player = useVideoPlayer(null, (p) => { p.loop = false; });
  useEffect(() => {
    const saved = resume?.current ?? null;
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') onFail?.(player.currentTime);
      if (status === 'readyToPlay' && saved) {
        player.currentTime = saved.time;
        if (saved.playing) player.play();
        if (resume) resume.current = null;
      }
    });
    player.replaceAsync(uri).catch(() => onFail?.(0));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, uri, resume]);
  return <VideoView player={player} style={styles.video} contentFit="contain" nativeControls testID="workshop-lesson-video" />;
}

export function TeaserVideo({ uri }: { uri: string }) {
  const full = resolveMediaUrl(uri);
  return Platform.OS === 'web'
    ? <video src={full} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    : <NativeVideo uri={full} />;
}

/** Requests a protected 15-minute signed URL and renews it before expiry, preserving position. */
function ProtectedLesson({ workshopId, moduleId, onGate }: { workshopId: number; moduleId: number; onGate: () => void }) {
  const colors = useColors();
  const create = useCreateWorkshopLessonPlayback();
  const mutateRef = useRef(create.mutateAsync);
  mutateRef.current = create.mutateAsync;
  const gateRef = useRef(onGate);
  gateRef.current = onGate;
  const webRef = useRef<HTMLVideoElement | null>(null);
  const resume = useRef<Resume>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (renewing: boolean) => {
    if (renewing && Platform.OS === 'web' && webRef.current) {
      resume.current = { time: webRef.current.currentTime, playing: !webRef.current.paused };
    }
    if (!renewing) { setLoading(true); setError(null); }
    try {
      const res = await mutateRef.current({ id: workshopId, moduleId });
      setUrl(res.playbackUrl); setExpiresAt(res.expiresAt); setError(null);
    } catch (e: any) {
      if ([401, 402, 403].includes(e?.status)) gateRef.current();
      setError(e?.message || 'Could not start this lesson.');
      if (renewing) setUrl(null);
    } finally { setLoading(false); }
  }, [workshopId, moduleId]);

  useEffect(() => { setUrl(null); void load(false); }, [load]);
  useEffect(() => {
    if (!expiresAt) return;
    const wait = Math.max(5000, new Date(expiresAt).getTime() - Date.now() - 60_000);
    const t = setTimeout(() => void load(true), wait);
    return () => clearTimeout(t);
  }, [expiresAt, load]);

  if (error && !url) {
    return (
      <View style={{ alignItems: 'center', gap: 10, padding: 24 }} testID="lesson-playback-error">
        <Feather name="alert-triangle" size={28} color={colors.gold} />
        <Text style={{ color: colors.primaryForeground, fontFamily: 'DMSans_500Medium', textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity onPress={() => void load(false)} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.gold }} testID="lesson-playback-retry">
          <Text style={{ color: colors.primaryForeground, fontFamily: 'DMSans_700Bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (loading || !url) return <ActivityIndicator color={colors.gold} />;
  if (Platform.OS === 'web') {
    return (
      <video
        ref={webRef} src={url} controls playsInline
        onError={() => { if (webRef.current) resume.current = { time: webRef.current.currentTime, playing: false }; setUrl(null); setError('The video could not be played. The link may have expired.'); }}
        onLoadedMetadata={() => {
          const r = resume.current; const v = webRef.current;
          if (r && v) { v.currentTime = r.time; if (r.playing) void v.play().catch(() => undefined); resume.current = null; }
        }}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }
  return <NativeVideo uri={url} resume={resume} onFail={(t) => { resume.current = { time: t, playing: false }; setUrl(null); setError('The video could not be played. The link may have expired.'); }} />;
}

export default function WorkshopLessonPlayer({
  visible,
  lesson,
  workshopTitle,
  workshopId,
  hasFullAccess = false,
  isEnrolled = false,
  onUpgrade,
  onRefreshAccess,
  onClose,
  onComplete,
  onStartAssignment,
  completing = false,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [gated, setGated] = useState(false);
  const [reflectionDirty, setReflectionDirty] = useState(false);
  useEffect(() => { setGated(false); setReflectionDirty(false); }, [lesson?.id]);
  const leaveLesson = (next: () => void) => {
    if (!reflectionDirty) { next(); return; }
    if (Platform.OS === 'web') {
      if (window.confirm('Discard your unsaved reflection?')) { setReflectionDirty(false); next(); }
      return;
    }
    Alert.alert('Unsaved reflection', 'Save your response before leaving, or discard it.', [
      { text: 'Keep writing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { setReflectionDirty(false); next(); } },
    ]);
  };
  const style = useMemo(
    () =>
      StyleSheet.create({
        overlay: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingTop: Math.max(insets.top, 14),
          paddingHorizontal: 18,
          paddingBottom: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
        headerCopy: { flex: 1, gap: 2 },
        eyebrow: {
          color: colors.sunsetCoral,
          fontFamily: 'DMSans_700Bold',
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
        title: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 17 },
        scroll: { flex: 1 },
        videoShell: {
          height: 230,
          backgroundColor: '#171311',
          alignItems: 'center',
          justifyContent: 'center',
        },
        video: { width: '100%', height: '100%' },
        mediaEmpty: { alignItems: 'center', gap: 10, paddingHorizontal: 30 },
        mediaTitle: {
          color: colors.primaryForeground,
          fontFamily: 'DMSans_700Bold',
          fontSize: 16,
          textAlign: 'center',
        },
        mediaBody: {
          color: 'rgba(250,248,245,0.68)',
          fontFamily: 'DMSans_400Regular',
          fontSize: 13,
          lineHeight: 19,
          textAlign: 'center',
        },
        body: { padding: 20, gap: 16 },
        lessonNumber: {
          color: colors.sunsetCoral,
          fontFamily: 'DMSans_700Bold',
          fontSize: 11,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
        },
        lessonTitle: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 27, lineHeight: 32 },
        duration: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 12 },
        description: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 23 },
        note: {
          padding: 15,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: colors.radius,
          gap: 7,
        },
        noteTitle: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 13 },
        noteBody: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 },
        action: {
          minHeight: 48,
          borderRadius: 10,
          backgroundColor: colors.electricMagenta,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 15,
        },
        actionText: { color: colors.primaryForeground, fontFamily: 'DMSans_700Bold', fontSize: 14 },
        secondary: {
          minHeight: 46,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        },
        secondaryText: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
        drill: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 9,
          paddingTop: 9,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        drillText: { flex: 1, color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 },
        drillTime: { color: colors.electricMagenta, fontFamily: 'DMSans_700Bold', fontSize: 11 },
      }),
    [colors, insets],
  );

  if (!lesson) return null;
  const entitled = hasFullAccess && !lesson.isLocked && !gated && !!workshopId;
  const canPlayFull = entitled && !!lesson.hasVideo;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => leaveLesson(onClose)}>
      <View style={style.overlay} testID="workshop-lesson-player">
        <View style={style.header}>
          <TouchableOpacity style={style.back} onPress={() => leaveLesson(onClose)} accessibilityRole="button" accessibilityLabel="Close lesson">
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={style.headerCopy}>
            <Text style={style.eyebrow}>{workshopTitle ?? 'Workshop lesson'}</Text>
            <Text style={style.title} numberOfLines={1}>{lesson.title}</Text>
          </View>
        </View>

        <View style={style.videoShell}>
          {canPlayFull ? (
            <ProtectedLesson workshopId={workshopId as number} moduleId={lesson.id} onGate={() => { setGated(true); onRefreshAccess?.(); }} />
          ) : lesson.previewVideoUrl ? (
            <TeaserVideo uri={lesson.previewVideoUrl} />
          ) : (
            <View style={style.mediaEmpty}>
              <Feather name={entitled ? 'video-off' : 'lock'} size={30} color={colors.gold} />
              <Text style={style.mediaTitle}>{entitled ? 'Full video not released yet' : 'Full lesson locked'}</Text>
              <Text style={style.mediaBody}>{entitled ? 'The instructor has not uploaded this lesson yet.' : 'No teaser has been uploaded for this module.'}</Text>
            </View>
          )}
        </View>

        <KeyboardAwareScrollViewCompat
          style={style.scroll}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) }}
          showsVerticalScrollIndicator
          bottomOffset={60}
        >
          <View style={style.body}>
            <Text style={style.lessonNumber}>Module {lesson.order}</Text>
            <Text style={style.lessonTitle}>{lesson.title}</Text>
            <Text style={style.duration}>{lesson.durationMinutes ?? 0} minutes</Text>
            {!entitled && (
              <View style={style.note} testID="lesson-gate">
                <Text style={style.noteTitle}>{lesson.previewVideoUrl ? 'You are watching the teaser' : 'Full lesson locked'}</Text>
                <Text style={style.noteBody}>
                  Full lessons require an active Dedicated Artist subscription ($39/month) or enrollment in this workshop by the instructor. Check your membership options; membership availability may still be rolling out.
                </Text>
                {!!onUpgrade && (
                  <TouchableOpacity style={style.action} onPress={onUpgrade} testID="lesson-upgrade" accessibilityRole="button">
                    <Feather name="arrow-up-right" size={17} color={colors.primaryForeground} />
                    <Text style={style.actionText}>View membership options</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {entitled && !!lesson.description && <Text style={style.description}>{lesson.description}</Text>}
            {canPlayFull && isEnrolled && (
              <LessonReflectionForm key={`${workshopId}:${lesson.id}`} workshopId={workshopId as number} moduleId={lesson.id} onDirtyChange={setReflectionDirty} />
            )}
            {canPlayFull && !isEnrolled && <View style={style.note}>
              <Text style={style.noteTitle}>Save a lesson reflection</Text>
              <Text style={style.noteBody}>Start this workshop from its details screen to save reflections and practice work.</Text>
            </View>}
            {entitled && <View style={style.note}>
              <Text style={style.noteTitle}>How this module works</Text>
              <Text style={style.noteBody}>
                1. Read the objective and safety notes.  2. Watch the instructor demonstration when it is released.  3. Complete one focused practice drill.  4. Submit one clip of 30 seconds or less for critique.
              </Text>
            </View>}
            {entitled && <View style={style.note}>
              <Text style={style.noteTitle}>Practice checkpoint</Text>
              <Text style={style.noteBody}>
                Record one focused practice clip (30 seconds maximum) after the lesson. Your submission enters the master-instructor review queue for a video breakdown and critique.
              </Text>
              {(lesson.drills ?? []).map((drill) => (
                <View key={drill.id} style={style.drill}>
                  <Feather name="target" size={15} color={colors.cyan} />
                  <Text style={style.drillText}>{drill.prompt}</Text>
                  <Text style={style.drillTime}>≤{drill.maxDurationSeconds}s</Text>
                </View>
              ))}
            </View>}
            {!entitled ? null : lesson.hasVideo ? (
              <TouchableOpacity
                style={[style.action, lesson.isCompleted && { backgroundColor: colors.cyan }]}
                onPress={() => onComplete(lesson.id)}
                disabled={lesson.isCompleted || completing}
                testID="workshop-lesson-complete"
              >
                {completing ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name={lesson.isCompleted ? 'check-circle' : 'check'} size={17} color={colors.primaryForeground} />}
                <Text style={style.actionText}>{lesson.isCompleted ? 'Lesson completed' : 'Mark lesson complete'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={style.note}>
                <Text style={style.noteTitle}>Completion is not open yet</Text>
                <Text style={style.noteBody}>
                  This module is a published curriculum blueprint, not a completed lesson. Progress opens when its instructor media is available.
                </Text>
              </View>
            )}
            {canPlayFull && (
              <TouchableOpacity
                style={style.secondary}
                onPress={() => leaveLesson(() => onStartAssignment(lesson.id))}
                testID="workshop-lesson-assignment"
              >
                <Feather name="video" size={17} color={colors.electricMagenta} />
                <Text style={style.secondaryText}>Record assignment for this module</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  video: { width: '100%', height: '100%' },
});