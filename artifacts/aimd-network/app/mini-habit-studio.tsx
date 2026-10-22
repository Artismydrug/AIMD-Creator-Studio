import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { withLaunchFeature } from '@/components/LaunchFeatureScreen';
import {
  MAX_MINI_HABIT_SKETCHES,
  MINI_HABIT_SKETCHBOOK_FULL,
  type MiniHabitSketch,
} from '@/lib/miniHabitSketchbook';
import { miniHabitSketchbook } from '@/lib/miniHabitSketchbookStorage';
import {
  SIDE_QUEST_MEDIA,
  pickSideQuestPrompt,
  type SideQuestFilter,
} from '@/lib/sideQuestPrompts';

const GAME_SECONDS = 60;
const VIEWBOX_SIZE = 360;
const MAX_STROKES = 100;
const MAX_POINTS_PER_SKETCH = 1600;

type GameStatus = 'idle' | 'playing' | 'complete';

function createSketchId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sketchTime(createdAt: string): string {
  const date = new Date(createdAt);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Saved sketch';
}

function SketchThumbnail({
  sketch,
  color,
  backgroundColor,
}: {
  sketch: MiniHabitSketch;
  color: string;
  backgroundColor: string;
}) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      accessibilityLabel={`Saved sketch: ${sketch.prompt}`}
    >
      <Path d={`M0 0 H${VIEWBOX_SIZE} V${VIEWBOX_SIZE} H0 Z`} fill={backgroundColor} />
      {sketch.paths.map((path, index) => (
        <Path
          key={`${sketch.id}-${index}`}
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

function MiniHabitStudioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { isLoaded, userId } = useAuth();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRecorderState = useAudioRecorderState(audioRecorder);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const audioPlayer = useAudioPlayer(audioUri);
  const audioPlayerStatus = useAudioPlayerStatus(audioPlayer);
  const ownerId = isLoaded && typeof userId === 'string' && userId.trim() ? userId : null;
  const ownerIdRef = useRef<string | null>(ownerId);
  ownerIdRef.current = ownerId;
  const canvasSize = Math.max(250, Math.min(windowWidth - 40, 420));

  const [status, setStatus] = useState<GameStatus>('idle');
  const statusRef = useRef<GameStatus>('idle');
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const deadlineRef = useRef(0);
  const [mediumFilter, setMediumFilter] = useState<SideQuestFilter>('mixed');
  const [challenge, setChallenge] = useState(() => pickSideQuestPrompt('mixed'));
  const challengeIdRef = useRef(challenge.id);
  challengeIdRef.current = challenge.id;
  const recordingStartRef = useRef(false);
  const [poetryDraft, setPoetryDraft] = useState('');
  const [challengePhotoUri, setChallengePhotoUri] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [completionReason, setCompletionReason] = useState<'early' | 'timeout' | null>(null);
  const [strokes, setStrokes] = useState<string[]>([]);
  const [activePath, setActivePath] = useState('');
  const activePathRef = useRef('');
  const strokeCountRef = useRef(0);
  const pointCountRef = useRef(0);
  const lastPointAtRef = useRef(0);
  const [savedSketches, setSavedSketches] = useState<MiniHabitSketch[]>([]);
  const [sketchesLoading, setSketchesLoading] = useState(true);
  const [sketchbookError, setSketchbookError] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveInFlightRef = useRef<string | null>(null);
  const currentSketchIdRef = useRef('');
  const [savedCurrentSketch, setSavedCurrentSketch] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateStatus = useCallback((next: GameStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const finishSketch = useCallback((early = false) => {
    if (statusRef.current !== 'playing') return;
    const finalPath = activePathRef.current;
    if (finalPath && strokeCountRef.current < MAX_STROKES) {
      setStrokes((current) => [...current, finalPath]);
      strokeCountRef.current += 1;
    }
    activePathRef.current = '';
    setActivePath('');
    if (audioRecorder.getStatus().isRecording) {
      void audioRecorder.stop().then(() => {
        setAudioUri(audioRecorder.uri ?? null);
        return setAudioModeAsync({ allowsRecording: false });
      }).catch(() => setMediaError('The recording could not be saved on this device.'));
    }
    setCompletionReason(early ? 'early' : 'timeout');
    updateStatus('complete');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [audioRecorder, updateStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && statusRef.current === 'playing') finishSketch(true);
    });
    return () => subscription.remove();
  }, [finishSketch]);

  const loadSketchbook = useCallback(async () => {
    if (!ownerId) {
      setSavedSketches([]);
      setSketchesLoading(!isLoaded);
      setSketchbookError(isLoaded);
      return;
    }
    setSketchesLoading(true);
    setSketchbookError(false);
    try {
      const saved = await miniHabitSketchbook.load(ownerId);
      if (ownerIdRef.current === ownerId) setSavedSketches(saved);
    } catch {
      if (ownerIdRef.current === ownerId) setSketchbookError(true);
    } finally {
      if (ownerIdRef.current === ownerId) setSketchesLoading(false);
    }
  }, [isLoaded, ownerId]);

  useEffect(() => {
    void loadSketchbook();
  }, [loadSketchbook]);

  useEffect(() => {
    setSavedSketches([]);
    setStrokes([]);
    setActivePath('');
    activePathRef.current = '';
    strokeCountRef.current = 0;
    pointCountRef.current = 0;
    currentSketchIdRef.current = '';
    saveInFlightRef.current = null;
    setSaving(false);
    setSavedCurrentSketch(false);
    setSaveError(null);
    setCompletionReason(null);
    setPoetryDraft('');
    setChallengePhotoUri(null);
    setAudioUri(null);
    setMediaError(null);
    updateStatus('idle');
  }, [ownerId, updateStatus]);

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && statusRef.current === 'playing') {
        finishSketch();
      }
    }, 200);
    return () => clearInterval(timer);
  }, [finishSketch, status]);

  const drawingEnabledRef = useRef(false);
  drawingEnabledRef.current = statusRef.current === 'playing';
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => drawingEnabledRef.current,
    onMoveShouldSetPanResponderCapture: () => drawingEnabledRef.current,
    onStartShouldSetPanResponder: () => drawingEnabledRef.current,
    onMoveShouldSetPanResponder: () => drawingEnabledRef.current,
    onPanResponderGrant: (event) => {
      if (!drawingEnabledRef.current || strokeCountRef.current >= MAX_STROKES || pointCountRef.current >= MAX_POINTS_PER_SKETCH) return;
      const scale = VIEWBOX_SIZE / canvasSize;
      const x = Math.max(0, Math.min(VIEWBOX_SIZE, event.nativeEvent.locationX * scale));
      const y = Math.max(0, Math.min(VIEWBOX_SIZE, event.nativeEvent.locationY * scale));
      const value = `M${x.toFixed(1)} ${y.toFixed(1)} l0.2 0.2`;
      activePathRef.current = value;
      pointCountRef.current += 1;
      lastPointAtRef.current = Date.now();
      setActivePath(value);
    },
    onPanResponderMove: (event) => {
      if (!drawingEnabledRef.current || !activePathRef.current || pointCountRef.current >= MAX_POINTS_PER_SKETCH) return;
      const now = Date.now();
      if (now - lastPointAtRef.current < 25) return;
      const scale = VIEWBOX_SIZE / canvasSize;
      const x = Math.max(0, Math.min(VIEWBOX_SIZE, event.nativeEvent.locationX * scale));
      const y = Math.max(0, Math.min(VIEWBOX_SIZE, event.nativeEvent.locationY * scale));
      activePathRef.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      pointCountRef.current += 1;
      lastPointAtRef.current = now;
      setActivePath(activePathRef.current);
    },
    onPanResponderRelease: () => {
      const completedPath = activePathRef.current;
      if (completedPath && strokeCountRef.current < MAX_STROKES) {
        setStrokes((current) => [...current, completedPath]);
        strokeCountRef.current += 1;
      }
      activePathRef.current = '';
      setActivePath('');
    },
    onPanResponderTerminate: () => {
      const completedPath = activePathRef.current;
      if (completedPath && strokeCountRef.current < MAX_STROKES) {
        setStrokes((current) => [...current, completedPath]);
        strokeCountRef.current += 1;
      }
      activePathRef.current = '';
      setActivePath('');
    },
  }), [canvasSize]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollViewport: { flex: 1, overflow: 'hidden' },
    scroll: { flexGrow: 1, paddingBottom: insets.bottom + 28 },
    header: {
      paddingTop: Platform.OS === 'web' ? 67 : insets.top + 8,
      paddingHorizontal: 20,
      paddingBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
      zIndex: 1,
    },
    backButton: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
    headerTitle: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 20 },
    content: { padding: 20, gap: 18 },
    title: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 30, letterSpacing: -0.6 },
    promptCard: {
      padding: 16,
      gap: 7,
      borderRadius: 19,
      backgroundColor: colors.studioYellow,
      borderWidth: 1.5,
      borderColor: colors.ink,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    promptLabel: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.2 },
    prompt: { color: colors.ink, fontFamily: 'DMSans_600SemiBold', fontSize: 16, lineHeight: 23 },
    promptAction: { alignSelf: 'flex-start', minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6 },
    promptActionText: { color: colors.ink, fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
    mediumLabel: { color: colors.mutedForeground, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.1 },
    mediumRail: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
    mediumChip: {
      minHeight: 40,
      paddingHorizontal: 13,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    mediumChipActive: {
      backgroundColor: colors.studioViolet,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 1,
    },
    mediumChipText: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
    mediumChipTextActive: { color: colors.studioPaper, fontFamily: 'DMSans_700Bold' },
    timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    timerLabel: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 12 },
    timer: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 22, fontVariant: ['tabular-nums'] },
    inputCard: {
      padding: 14,
      gap: 11,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.card,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    inputHeading: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 14 },
    textInput: {
      minHeight: 145,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
      color: colors.foreground,
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      lineHeight: 22,
      textAlignVertical: 'top',
    },
    mediaAction: {
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    mediaActionText: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
    mediaPreview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, borderWidth: 1.5, borderColor: colors.studioInk, overflow: 'hidden' },
    mediaError: { color: colors.destructive, fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 18 },
    audioStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.studioLavender },
    canvas: {
      width: canvasSize,
      height: canvasSize,
      alignSelf: 'center',
      overflow: 'hidden',
      borderRadius: 23,
      borderWidth: 2,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 4, height: 5 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    canvasHint: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      pointerEvents: 'none',
    },
    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    toolButton: {
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderColor: colors.studioInk,
      borderWidth: 1.5,
      backgroundColor: colors.studioPaper,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    toolButtonText: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
    primaryButton: {
      minHeight: 48,
      paddingHorizontal: 18,
      borderRadius: 16,
      backgroundColor: colors.studioOrange,
      borderWidth: 1.5,
      borderColor: colors.ink,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    primaryButtonText: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 14 },
    secondaryButton: {
      minHeight: 48,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    secondaryButtonText: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionFlex: { flex: 1 },
    toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    savedBlock: { gap: 12 },
    savedMessage: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    note: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center' },
    feedback: { color: colors.primary, fontFamily: 'DMSans_600SemiBold', fontSize: 12, textAlign: 'center' },
    error: { color: colors.destructive, fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 18 },
    section: {
      marginTop: 6,
      paddingTop: 18,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { flex: 1, color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 19 },
    sectionMeta: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 11 },
    emptyState: {
      padding: 18,
      gap: 8,
      alignItems: 'center',
      borderRadius: colors.radius,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
    sketchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    sketchCard: {
      width: '48%',
      overflow: 'hidden',
      borderRadius: colors.radius,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    thumbnail: { width: '100%', aspectRatio: 1, overflow: 'hidden' },
    sketchInfo: { padding: 10, gap: 5 },
    sketchPrompt: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 11, lineHeight: 15, minHeight: 30 },
    sketchDate: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 10 },
    deleteButton: { alignSelf: 'flex-end', minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
    statusRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    statusText: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 12 },
  }), [colors, canvasSize, insets.bottom]);

  const resetForMedium = useCallback((nextMedium: SideQuestFilter) => {
    setMediumFilter(nextMedium);
    setChallenge(pickSideQuestPrompt(nextMedium));
    setStrokes([]);
    setActivePath('');
    activePathRef.current = '';
    strokeCountRef.current = 0;
    pointCountRef.current = 0;
    currentSketchIdRef.current = '';
    setSecondsLeft(GAME_SECONDS);
    setCompletionReason(null);
    setSavedCurrentSketch(false);
    setSaveError(null);
    setPoetryDraft('');
    setChallengePhotoUri(null);
    setAudioUri(null);
    setMediaError(null);
    updateStatus('idle');
  }, [updateStatus]);

  const chooseMedium = useCallback((nextMedium: SideQuestFilter) => {
    if (statusRef.current === 'playing') return;
    const apply = () => resetForMedium(nextMedium);
    if (
      statusRef.current === 'complete' &&
      challenge.input === 'canvas' &&
      strokes.length > 0 &&
      !savedCurrentSketch
    ) {
      const message = 'Your sketch has not been saved to this device.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (window.confirm(`Change the medium?\n\n${message}`)) apply();
        return;
      }
      Alert.alert('Change the medium?', message, [
        { text: 'Keep sketch', style: 'cancel' },
        { text: 'Discard and change', style: 'destructive', onPress: apply },
      ]);
      return;
    }
    apply();
  }, [challenge.input, resetForMedium, savedCurrentSketch, strokes.length]);

  const shufflePrompt = useCallback(() => {
    if (statusRef.current !== 'idle') return;
    setChallenge((current) => pickSideQuestPrompt(mediumFilter, current.id));
  }, [mediumFilter]);

  const selectChallengePhoto = useCallback(async () => {
    const identity = challengeIdRef.current;
    const owner = ownerIdRef.current;
    setMediaError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0] && challengeIdRef.current === identity && ownerIdRef.current === owner) {
        setChallengePhotoUri(result.assets[0].uri);
      }
    } catch {
      setMediaError('Could not open your photo library. Try again.');
    }
  }, []);

  const startAudioRecording = useCallback(async () => {
    if (statusRef.current !== 'playing' || audioRecorderState.isRecording || recordingStartRef.current) return;
    recordingStartRef.current = true;
    setMediaError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setMediaError('Microphone access is off. Allow it in Settings to record sound.');
        return;
      }
      if (statusRef.current !== 'playing') return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      if (statusRef.current !== 'playing') {
        await setAudioModeAsync({ allowsRecording: false });
        return;
      }
      audioRecorder.record();
    } catch {
      setMediaError('Could not start the microphone. Please try again.');
    } finally {
      recordingStartRef.current = false;
    }
  }, [audioRecorder, audioRecorderState.isRecording]);

  const stopAudioRecording = useCallback(async () => {
    if (!audioRecorder.getStatus().isRecording) return;
    try {
      await audioRecorder.stop();
      setAudioUri(audioRecorder.uri ?? null);
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      setMediaError('The recording could not be saved on this device.');
    }
  }, [audioRecorder]);

  const toggleAudioPlayback = useCallback(() => {
    if (audioPlayerStatus.playing) audioPlayer.pause();
    else audioPlayer.play();
  }, [audioPlayer, audioPlayerStatus.playing]);

  const startSketch = useCallback(() => {
    const wasStarted = statusRef.current !== 'idle';
    if (wasStarted) {
      setChallenge((current) => pickSideQuestPrompt(mediumFilter, current.id));
    }
    setStrokes([]);
    setActivePath('');
    activePathRef.current = '';
    strokeCountRef.current = 0;
    pointCountRef.current = 0;
    currentSketchIdRef.current = createSketchId();
    setSecondsLeft(GAME_SECONDS);
    setCompletionReason(null);
    setSavedCurrentSketch(false);
    setSaveError(null);
    setPoetryDraft('');
    setChallengePhotoUri(null);
    setAudioUri(null);
    setMediaError(null);
    deadlineRef.current = Date.now() + GAME_SECONDS * 1000;
    updateStatus('playing');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }, [mediumFilter, updateStatus]);

  const undoStroke = useCallback(() => {
    setStrokes((current) => {
      const next = current.slice(0, -1);
      strokeCountRef.current = next.length;
      return next;
    });
  }, []);

  const saveSketch = useCallback(async () => {
    const sketchId = currentSketchIdRef.current;
    if (!ownerId || !sketchId || statusRef.current !== 'complete' || saveInFlightRef.current || savedCurrentSketch) return;
    if (strokes.length === 0) {
      setSaveError('Add at least one mark before saving your sketch.');
      return;
    }
    const sketch: MiniHabitSketch = {
      id: sketchId,
      createdAt: new Date().toISOString(),
      prompt: challenge.prompt,
      paths: strokes,
    };
    const saveIdentity = `${ownerId}:${sketchId}`;
    saveInFlightRef.current = saveIdentity;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await miniHabitSketchbook.save(ownerId, sketch);
      if (ownerIdRef.current === ownerId && currentSketchIdRef.current === sketchId) {
        setSavedSketches(saved);
        setSketchbookError(false);
        setSavedCurrentSketch(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    } catch (error) {
      if (ownerIdRef.current === ownerId && currentSketchIdRef.current === sketchId) {
        setSaveError(error instanceof Error && error.message === MINI_HABIT_SKETCHBOOK_FULL
          ? `Your sketchbook holds up to ${MAX_MINI_HABIT_SKETCHES} sketches. Delete one before saving another.`
          : 'Could not save this sketch on your device. Your drawing is still here—please try again.');
      }
    } finally {
      if (saveInFlightRef.current === saveIdentity) {
        saveInFlightRef.current = null;
        if (ownerIdRef.current === ownerId) setSaving(false);
      }
    }
  }, [challenge.prompt, ownerId, savedCurrentSketch, strokes]);

  const requestRestart = useCallback(() => {
    if (saveInFlightRef.current) return;
    if (statusRef.current !== 'complete' || savedCurrentSketch || strokes.length === 0) {
      startSketch();
      return;
    }
    const restart = () => startSketch();
    const message = 'Your current sketch has not been saved to this device.';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Start a new sketch?\n\n${message}`)) restart();
      return;
    }
    Alert.alert('Start a new sketch?', message, [
      { text: 'Keep sketch', style: 'cancel' },
      { text: 'Discard and restart', style: 'destructive', onPress: restart },
    ]);
  }, [savedCurrentSketch, startSketch, strokes.length]);

  const deleteSketch = useCallback((sketchId: string) => {
    if (!ownerId) return;
    const remove = async () => {
      try {
        const remaining = await miniHabitSketchbook.remove(ownerId, sketchId);
        if (ownerIdRef.current === ownerId) {
          setSavedSketches(remaining);
          setSketchbookError(false);
        }
      } catch {
        if (ownerIdRef.current === ownerId) setSketchbookError(true);
      }
    };
    const message = 'This removes the sketch from this device.';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Delete this sketch?\n\n${message}`)) void remove();
      return;
    }
    Alert.alert('Delete this sketch?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void remove(); } },
    ]);
  }, [ownerId]);

  const backToDashboard = async () => {
    await stopAudioRecording();
    audioPlayer.pause();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const timerText = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const allPaths = activePath ? [...strokes, activePath] : strokes;
  const canSave = !!ownerId && challenge.input === 'canvas' && status === 'complete' && strokes.length > 0 && !saving && !savedCurrentSketch;
  const timerLabel = status === 'playing'
    ? 'Keep creating'
    : status === 'complete'
      ? completionReason === 'early' ? 'Finished early' : 'Time is up'
      : 'Ready when you are';

  return (
    <View style={styles.container} testID="side-quest-screen">
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { void backToDashboard(); }}
          accessibilityRole="button"
          accessibilityLabel="Back to Dashboard"
          style={styles.backButton}
          testID="mini-habit-studio-back"
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Side Quest</Text>
      </View>
      <ScrollView
        style={styles.scrollViewport}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Make something in a minute.</Text>

          <View>
            <Text style={styles.mediumLabel}>MEDIUM</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediumRail}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mediumFilter === 'mixed', disabled: status === 'playing' }}
                disabled={status === 'playing'}
                onPress={() => chooseMedium('mixed')}
                style={[styles.mediumChip, mediumFilter === 'mixed' && styles.mediumChipActive, status === 'playing' && { opacity: 0.55 }]}
              >
                <Feather name="shuffle" size={14} color={mediumFilter === 'mixed' ? colors.studioPaper : colors.foreground} />
                <Text style={[styles.mediumChipText, mediumFilter === 'mixed' && styles.mediumChipTextActive]}>Mixed</Text>
              </Pressable>
              {SIDE_QUEST_MEDIA.map((media) => {
                const selected = mediumFilter === media.id;
                return (
                  <Pressable
                    key={media.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: status === 'playing' }}
                    disabled={status === 'playing'}
                    onPress={() => chooseMedium(media.id)}
                    style={[styles.mediumChip, selected && styles.mediumChipActive, status === 'playing' && { opacity: 0.55 }]}
                  >
                    <Feather name={media.icon} size={14} color={selected ? colors.studioPaper : colors.foreground} />
                    <Text style={[styles.mediumChipText, selected && styles.mediumChipTextActive]}>{media.shortLabel}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.promptCard}>
            <Text style={styles.promptLabel}>{challenge.mediumLabel.toUpperCase()} · YOUR PROMPT</Text>
            <Text style={styles.prompt}>{challenge.prompt}</Text>
            {status === 'idle' && (
              <TouchableOpacity
                style={styles.promptAction}
                onPress={shufflePrompt}
                accessibilityRole="button"
                accessibilityLabel="Choose another creative prompt"
              >
                <Feather name="shuffle" size={14} color={colors.ink} />
                <Text style={styles.promptActionText}>Shuffle prompt</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.timerRow}>
            <Text style={styles.timerLabel}>{timerLabel}</Text>
            <Text
              style={styles.timer}
              accessibilityRole="timer"
              accessibilityLabel={completionReason === 'early'
                ? `${secondsLeft} seconds left on the timer`
                : completionReason === 'timeout' ? 'Time is up' : `${secondsLeft} seconds remaining`}
              testID="mini-habit-sketch-timer"
            >
              {timerText}
            </Text>
          </View>

          {challenge.input === 'canvas' ? <View
            style={styles.canvas}
            {...panResponder.panHandlers}
            accessible
            accessibilityRole="image"
            accessibilityLabel={status === 'playing' ? 'Sketching canvas. Draw with one finger.' : 'Sketch canvas'}
            testID="mini-habit-sketch-canvas"
          >
            <Svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}>
              <Path d={`M0 0 H${VIEWBOX_SIZE} V${VIEWBOX_SIZE} H0 Z`} fill={colors.card} />
              {allPaths.map((path, index) => (
                <Path
                  key={`current-${index}`}
                  d={path}
                  fill="none"
                  stroke={colors.foreground}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </Svg>
            {status !== 'playing' && allPaths.length === 0 && (
              <View style={styles.canvasHint} pointerEvents="none">
                <Feather name={status === 'complete' ? 'check-circle' : 'edit-3'} size={24} color={colors.mutedForeground} />
              </View>
            )}
          </View> : challenge.input === 'text' ? (
            <View style={styles.inputCard}>
              <Text style={styles.inputHeading}>Your words</Text>
              <TextInput
                value={poetryDraft}
                onChangeText={setPoetryDraft}
                multiline
                maxLength={2000}
                editable={status === 'playing'}
                placeholder="Write for one minute…"
                placeholderTextColor={colors.mutedForeground}
                style={styles.textInput}
                accessibilityLabel="Write your response"
              />
            </View>
          ) : challenge.input === 'audio' ? (
            <View style={styles.inputCard}>
              <View style={styles.audioStatus}>
                <Feather name="mic" size={24} color={colors.foreground} />
                <Text style={styles.inputHeading}>{audioRecorderState.isRecording ? 'Recording…' : audioUri ? 'Sound sketch ready' : 'Make a little noise.'}</Text>
              </View>
              {status === 'playing' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { void (audioRecorderState.isRecording ? stopAudioRecording() : startAudioRecording()); }}
                  style={styles.mediaAction}
                >
                  <Feather name={audioRecorderState.isRecording ? 'square' : 'mic'} size={18} color={colors.foreground} />
                  <Text style={styles.mediaActionText}>{audioRecorderState.isRecording ? 'Stop recording' : 'Record sound'}</Text>
                </Pressable>
              ) : null}
              {audioUri ? (
                <Pressable accessibilityRole="button" onPress={toggleAudioPlayback} style={styles.mediaAction}>
                  <Feather name={audioPlayerStatus.playing ? 'pause' : 'play'} size={18} color={colors.foreground} />
                  <Text style={styles.mediaActionText}>{audioPlayerStatus.playing ? 'Pause' : 'Listen back'}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.inputCard}>
              <Text style={styles.inputHeading}>Capture your idea</Text>
              {challengePhotoUri ? <Image source={{ uri: challengePhotoUri }} style={styles.mediaPreview} contentFit="contain" /> : null}
              {status === 'playing' ? (
                <Pressable accessibilityRole="button" onPress={() => { void selectChallengePhoto(); }} style={styles.mediaAction}>
                  <Feather name="image" size={18} color={colors.foreground} />
                  <Text style={styles.mediaActionText}>{challengePhotoUri ? 'Change photo' : 'Choose photo'}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          {challenge.input === 'canvas' && status === 'playing' ? (
            <Pressable accessibilityRole="button" onPress={() => { void selectChallengePhoto(); }} style={styles.mediaAction}>
              <Feather name="image" size={17} color={colors.foreground} />
              <Text style={styles.mediaActionText}>{challengePhotoUri ? 'Change reference photo' : 'Add a local reference photo'}</Text>
            </Pressable>
          ) : null}
          {challenge.input === 'canvas' && challengePhotoUri ? <Image source={{ uri: challengePhotoUri }} style={styles.mediaPreview} contentFit="contain" /> : null}
          {mediaError ? <Text style={styles.mediaError} accessibilityRole="alert">{mediaError}</Text> : null}

          {status === 'playing' ? (
            <View style={styles.toolbar}>
              <View style={styles.toolbarActions}>
                {challenge.input === 'canvas' ? <TouchableOpacity
                  style={styles.toolButton}
                  onPress={undoStroke}
                  disabled={strokes.length === 0}
                  accessibilityRole="button"
                  accessibilityLabel="Undo last mark"
                  testID="mini-habit-sketch-undo"
                >
                  <Feather name="corner-up-left" size={15} color={strokes.length ? colors.foreground : colors.mutedForeground} />
                  <Text style={[styles.toolButtonText, !strokes.length && { color: colors.mutedForeground }]}>Undo</Text>
                </TouchableOpacity> : null}
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => finishSketch(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Finish this challenge early"
                  testID="mini-habit-sketch-done"
                >
                  <Feather name="check" size={15} color={colors.ink} />
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : status === 'idle' ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={startSketch}
              accessibilityRole="button"
              accessibilityLabel="Start the 60-second Side Quest"
              testID="mini-habit-sketch-start"
            >
              <Feather name="play" size={17} color={colors.ink} />
              <Text style={styles.primaryButtonText}>Start my minute</Text>
            </TouchableOpacity>
          ) : savedCurrentSketch ? (
            <View style={styles.savedBlock}>
              <View style={styles.savedMessage}>
                <Feather name="check-circle" size={17} color={colors.primary} />
                <Text style={styles.feedback}>Saved to this device</Text>
              </View>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={startSketch}
                accessibilityRole="button"
                accessibilityLabel="Move to the next sketch idea"
                testID="mini-habit-sketch-again"
              >
                <Feather name="arrow-right" size={15} color={colors.foreground} />
                <Text style={styles.secondaryButtonText}>Next challenge</Text>
              </TouchableOpacity>
            </View>
          ) : challenge.input !== 'canvas' ? (
            <TouchableOpacity style={styles.primaryButton} onPress={startSketch} accessibilityRole="button" accessibilityLabel="Next challenge">
              <Text style={styles.primaryButtonText}>Next challenge</Text>
              <Feather name="arrow-right" size={17} color={colors.ink} />
            </TouchableOpacity>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.actionFlex, saving && { opacity: 0.55 }]}
                onPress={requestRestart}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Move to the next sketch idea"
                testID="mini-habit-sketch-next"
              >
                <Feather name="arrow-right" size={15} color={colors.foreground} />
                <Text style={styles.secondaryButtonText}>Next challenge</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, styles.actionFlex, !canSave && { opacity: 0.55 }]}
                onPress={() => { void saveSketch(); }}
                disabled={!canSave}
                accessibilityRole="button"
                accessibilityLabel="Save this sketch to this device"
                testID="mini-habit-sketch-save"
              >
                {saving ? <ActivityIndicator size="small" color={colors.ink} /> : <Feather name="bookmark" size={15} color={colors.ink} />}
                <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save sketch'}</Text>
              </TouchableOpacity>
            </View>
          )}
          {saveError ? <Text style={styles.error} accessibilityRole="alert">{saveError}</Text> : null}
          {!ownerId && isLoaded ? (
            <Text style={styles.error}>Sign in again to save sketches to your account’s on-device sketchbook.</Text>
          ) : null}
          <Text style={styles.note}>Private · No points or streaks · Sketches save on-device; photos and audio aren’t uploaded.</Text>

          <View style={styles.section} testID="mini-habit-sketchbook">
            <View style={styles.sectionHeader}>
              <Feather name="book-open" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Your sketchbook</Text>
              <Text style={styles.sectionMeta}>{savedSketches.length} / {MAX_MINI_HABIT_SKETCHES}</Text>
            </View>
            {sketchesLoading ? (
              <View style={styles.statusRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.statusText}>Opening your local sketchbook…</Text>
              </View>
            ) : sketchbookError ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Couldn’t load sketches saved on this device.</Text>
                <Pressable onPress={() => { void loadSketchbook(); }} accessibilityRole="button">
                  <Text style={styles.promptActionText}>Try again</Text>
                </Pressable>
              </View>
            ) : savedSketches.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="image" size={21} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>Your saved sketches will appear here. They remain on this device.</Text>
              </View>
            ) : (
              <View style={styles.sketchGrid}>
                {[...savedSketches].reverse().map((sketch) => (
                  <View key={sketch.id} style={styles.sketchCard}>
                    <View style={styles.thumbnail}>
                      <SketchThumbnail sketch={sketch} color={colors.foreground} backgroundColor={colors.card} />
                    </View>
                    <View style={styles.sketchInfo}>
                      <Text style={styles.sketchPrompt} numberOfLines={2}>{sketch.prompt}</Text>
                      <Text style={styles.sketchDate}>{sketchTime(sketch.createdAt)}</Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteSketch(sketch.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete sketch: ${sketch.prompt}`}
                        testID={`mini-habit-sketch-delete-${sketch.id}`}
                      >
                        <Feather name="trash-2" size={15} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default withLaunchFeature('sideQuest', MiniHabitStudioScreen);
