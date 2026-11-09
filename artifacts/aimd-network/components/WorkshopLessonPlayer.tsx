import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '@/lib/telemetry';
import {
  ActivityIndicator,
  AppState,
  Animated,
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
import { useAuth } from '@clerk/expo';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBaseUrl, useCreateWorkshopLessonPlayback, useCreateWorkshopLessonWebPlayback } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import LessonReflectionForm from '@/components/LessonReflectionForm';
import InstructorAttribution from '@/components/InstructorAttribution';
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
  instructorName?: string | null;
  accessUnavailable?: boolean;
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

function NativeVideo({ uri, headers, resume, onFail, onPlay }: {
  uri: string;
  headers?: Record<string, string>;
  resume?: React.MutableRefObject<Resume>;
  onFail?: (time: number) => void;
  onPlay?: () => void;
}) {
  const player = useVideoPlayer(null, (p) => { p.loop = false; p.timeUpdateEventInterval = 1; });
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;
  const pause = useCallback(() => {
    try { player.pause(); } catch { /* A closed preview may already be released. */ }
  }, [player]);
  useFocusEffect(useCallback(() => () => pause(), [pause]));
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') pause(); });
    return () => { listener.remove(); pause(); };
  }, [pause]);
  useEffect(() => {
    const subscription = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) onPlayRef.current?.();
    });
    return () => subscription.remove();
  }, [player]);
  useEffect(() => {
    const subscription = player.addListener('timeUpdate', ({ currentTime }) => {
      if (resume) resume.current = { time: currentTime, playing: player.playing };
    });
    return () => subscription.remove();
  }, [player, resume]);
  useEffect(() => {
    const saved = resume?.current ?? null;
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') onFailRef.current?.(player.currentTime);
      if (status === 'readyToPlay' && saved) {
        player.currentTime = saved.time;
        if (saved.playing) player.play();
        if (resume) resume.current = null;
      }
    });
    let cancelled = false;
    player.replaceAsync(headers ? { uri, headers, contentType: 'progressive' } : uri)
      .catch(() => { if (!cancelled) onFailRef.current?.(0); });
    return () => { cancelled = true; sub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, uri, headers, resume]);
  return <VideoView player={player} style={styles.video} contentFit="contain" nativeControls testID="workshop-lesson-video" />;
}

export function TeaserVideo({ uri }: { uri: string }) {
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const viewed = useRef(false);
  useEffect(() => { viewed.current = false; setFailed(false); }, [uri]);
  const recordView = () => {
    if (viewed.current) return;
    viewed.current = true;
    trackEvent('workshop_preview_viewed');
  };
  const full = resolveMediaUrl(uri);
  if (failed) {
    return (
      <View style={{ padding: 20, gap: 12, alignItems: 'center' }} testID="workshop-preview-error">
        <Text style={{ color: colors.inkForeground, textAlign: 'center', fontFamily: 'DMSans_500Medium' }}>Preview unavailable. Check your connection and retry.</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry workshop preview"
          onPress={() => { setFailed(false); setAttempt(value => value + 1); }}
          style={{ padding: 12, backgroundColor: colors.gold, borderRadius: colors.radius }}>
          <Text style={{ color: colors.ink, fontFamily: 'DMSans_700Bold' }}>Retry preview</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return Platform.OS === 'web'
    ? <video key={`${uri}:${attempt}`} src={full} controls playsInline preload="metadata" onPlaying={recordView} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    : <NativeVideo key={`${uri}:${attempt}`} uri={full} onPlay={recordView} onFail={() => setFailed(true)} />;
}

function ViewerWatermark({ label }: { label: string }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 18_000, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 18_000, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [drift]);

  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-38, 38] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [24, -24] });
  return (
    <View pointerEvents="none" style={styles.watermarkLayer} testID="workshop-viewer-watermark">
      <Animated.View style={[styles.watermarkChip, { transform: [{ translateX }, { translateY }, { rotate: '-8deg' }] }]}>
        <Text numberOfLines={1} style={styles.watermarkText}>{label}</Text>
      </Animated.View>
    </View>
  );
}

/** Renews five-minute playback credentials and keeps the viewer watermark on screen. */
function ProtectedLesson({ workshopId, moduleId, onGate }: { workshopId: number; moduleId: number; onGate: () => void }) {
  const colors = useColors();
  const create = useCreateWorkshopLessonPlayback();
  const createWeb = useCreateWorkshopLessonWebPlayback();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const mutateRef = useRef(create.mutateAsync);
  mutateRef.current = create.mutateAsync;
  const webMutateRef = useRef(createWeb.mutateAsync);
  webMutateRef.current = createWeb.mutateAsync;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const authStateRef = useRef({ isLoaded, isSignedIn });
  authStateRef.current = { isLoaded, isSignedIn };
  const gateRef = useRef(onGate);
  gateRef.current = onGate;
  const webRef = useRef<HTMLVideoElement | null>(null);
  const resume = useRef<Resume>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [streamHeaders, setStreamHeaders] = useState<Record<string, string> | null>(null);
  const [watermarkLabel, setWatermarkLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (renewing: boolean) => {
    if (renewing && Platform.OS === 'web' && webRef.current) {
      resume.current = { time: webRef.current.currentTime, playing: !webRef.current.paused };
    }
    if (!renewing) { setLoading(true); setError(null); }
    try {
      if (!authStateRef.current.isLoaded || !authStateRef.current.isSignedIn) {
        const unauthenticated = new Error('Sign in again to continue this lesson.') as Error & { status: number };
        unauthenticated.status = 401;
        throw unauthenticated;
      }
      if (Platform.OS === 'web') {
        const res = await webMutateRef.current({ id: workshopId, moduleId });
        setUrl(res.playbackUrl);
        setStreamHeaders(null);
        setWatermarkLabel(res.watermarkLabel);
        setExpiresAt(res.expiresAt);
      } else {
        const res = await mutateRef.current({ id: workshopId, moduleId });
        const sessionToken = await getTokenRef.current();
        if (!sessionToken) {
          const unauthenticated = new Error('Sign in again to continue this lesson.') as Error & { status: number };
          unauthenticated.status = 401;
          throw unauthenticated;
        }
        setUrl(res.streamUrl);
        setStreamHeaders({
          Authorization: `Bearer ${sessionToken}`,
          'X-AIMD-Playback-Token': res.streamToken,
        });
        setWatermarkLabel(res.watermarkLabel);
        setExpiresAt(res.expiresAt);
      }
      setError(null);
    } catch (e: any) {
      if ([401, 402, 403].includes(e?.status)) gateRef.current();
      setError('Could not start this lesson. Check your connection and workshop access, then retry.');
      if (renewing) { setUrl(null); setStreamHeaders(null); }
    } finally { setLoading(false); }
  }, [workshopId, moduleId]);

  useEffect(() => { setUrl(null); void load(false); }, [load]);
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setUrl(null);
      setStreamHeaders(null);
      setWatermarkLabel('');
      setError('Sign in again to continue this lesson.');
    }
  }, [isLoaded, isSignedIn]);
  useEffect(() => {
    if (!expiresAt) return;
    const wait = Math.max(5000, new Date(expiresAt).getTime() - Date.now() - 60_000);
    const t = setTimeout(() => void load(true), wait);
    return () => clearTimeout(t);
  }, [expiresAt, load]);

  if (error && !url) {
    return (
      <View style={{ alignItems: 'center', gap: 10, padding: 24 }} testID="lesson-playback-error">
        <Feather name="alert-triangle" size={28} color={colors.sunsetCoral} />
        <Text style={{ color: colors.inkForeground, fontFamily: 'DMSans_500Medium', textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity onPress={() => void load(false)} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.gold }} testID="lesson-playback-retry">
          <Text style={{ color: colors.ink, fontFamily: 'DMSans_700Bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (loading || !url) return <ActivityIndicator color={colors.primary} />;
  if (Platform.OS === 'web') {
    return (
      <View style={styles.protectedVideoFrame}>
        <video
          ref={webRef} src={url} controls playsInline
          onError={() => {
            if (webRef.current) resume.current = { time: webRef.current.currentTime, playing: false };
            setUrl(null); setWatermarkLabel(''); setError('The video could not be played. The link may have expired.');
          }}
          onLoadedMetadata={() => {
            const r = resume.current; const v = webRef.current;
            if (r && v) { v.currentTime = r.time; if (r.playing) void v.play().catch(() => undefined); resume.current = null; }
          }}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {!!watermarkLabel && <ViewerWatermark label={watermarkLabel} />}
      </View>
    );
  }
  if (!streamHeaders) return <ActivityIndicator color={colors.primary} />;
  return (
    <View style={styles.protectedVideoFrame}>
      <NativeVideo
        key={streamHeaders['X-AIMD-Playback-Token']}
        uri={resolveMediaUrl(url)}
        headers={streamHeaders}
        resume={resume}
        onFail={(t) => {
          resume.current = { time: t, playing: false };
          setUrl(null); setStreamHeaders(null); setWatermarkLabel('');
          setError('The playback session expired or the video could not be played. Retry to reconnect.');
        }}
      />
      {!!watermarkLabel && <ViewerWatermark label={watermarkLabel} />}
    </View>
  );
}

export default function WorkshopLessonPlayer({
  visible,
  lesson,
  workshopTitle,
  instructorName,
  accessUnavailable = false,
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
          color: colors.inkForeground,
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
            <InstructorAttribution name={instructorName} />
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

        {!accessUnavailable && (!hasFullAccess || gated) && !!onUpgrade && (
          <TouchableOpacity
            style={[style.action, { backgroundColor: colors.foreground, marginHorizontal: 20, marginTop: 12, marginBottom: 8 }]}
            onPress={onUpgrade}
            testID="lesson-upgrade"
            accessibilityRole="button"
            accessibilityLabel="Unlock Full Access"
            accessibilityHint="Opens membership and upgrade options."
          >
            <Feather name="unlock" size={17} color={colors.background} />
            <Text style={[style.actionText, { color: colors.background }]}>Unlock Full Access</Text>
          </TouchableOpacity>
        )}

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
                <Text style={style.noteTitle}>{accessUnavailable ? 'Unable to verify access' : lesson.previewVideoUrl ? 'You are watching the teaser' : 'Full lesson locked'}</Text>
                <Text style={style.noteBody}>
                  {accessUnavailable
                    ? 'We could not confirm your workshop access. Retry before changing your membership.'
                    : 'Full lessons require an active Dedicated Artist subscription ($39/month) or enrollment in this workshop by the instructor. Membership availability may still be rolling out.'}
                </Text>
                {accessUnavailable && !!onRefreshAccess && (
                  <TouchableOpacity style={style.secondary} onPress={onRefreshAccess} testID="lesson-access-retry" accessibilityRole="button">
                    <Feather name="refresh-cw" size={17} color={colors.foreground} />
                    <Text style={style.secondaryText}>Retry access check</Text>
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
  protectedVideoFrame: { width: '100%', height: '100%', position: 'relative' },
  watermarkLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkChip: {
    maxWidth: '92%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 16, 26, 0.26)',
  },
  watermarkText: {
    color: 'rgba(255, 255, 255, 0.52)',
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});