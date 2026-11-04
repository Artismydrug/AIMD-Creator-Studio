import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useColors } from '@/hooks/useColors';
import {
  BEAT_STEP_COUNT,
  BEAT_STEP_INTERVAL_MS,
  beatVoiceForStep,
  beatVoiceLabel,
} from '@/lib/beatPatternAudio';
import {
  CREATIVE_MEDIUM_CONFIG,
  FASHION_PALETTE,
  FASHION_SILHOUETTES,
  MOVEMENT_SEQUENCE,
  POETRY_WORD_BANK,
  type NonVisualMedium,
} from '@/lib/creativeMicroChallenges';

type ChallengeStatus = 'idle' | 'playing' | 'complete';

function feedback(): void {
  void Haptics.selectionAsync().catch(() => undefined);
}

export default function CreativeMicroChallenge({
  medium,
  status,
  roundId,
  completionReason,
  onComplete,
}: {
  medium: NonVisualMedium;
  status: ChallengeStatus;
  roundId: number;
  completionReason: 'early' | 'timeout' | null;
  onComplete: () => void;
}) {
  const colors = useColors();
  const [beatSteps, setBeatSteps] = useState<boolean[]>(() => Array(BEAT_STEP_COUNT).fill(false));
  const [silhouette, setSilhouette] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [poemWords, setPoemWords] = useState<string[]>([]);
  const [movesDone, setMovesDone] = useState<string[]>([]);
  const [audioModeReady, setAudioModeReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isBeatPlaying, setIsBeatPlaying] = useState(false);
  const [activeBeatStep, setActiveBeatStep] = useState<number | null>(null);
  const kickPlayer = useAudioPlayer(require('../assets/audio/kick.wav'));
  const snarePlayer = useAudioPlayer(require('../assets/audio/snare.wav'));
  const hatPlayer = useAudioPlayer(require('../assets/audio/hat.wav'));
  const kickStatus = useAudioPlayerStatus(kickPlayer);
  const snareStatus = useAudioPlayerStatus(snarePlayer);
  const hatStatus = useAudioPlayerStatus(hatPlayer);
  const playbackRef = useRef(false);
  const playbackRunRef = useRef(0);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = CREATIVE_MEDIUM_CONFIG[medium];
  const beatCount = beatSteps.filter(Boolean).length;
  const audioReady = audioModeReady && kickStatus.isLoaded && snareStatus.isLoaded && hatStatus.isLoaded;

  useEffect(() => {
    setBeatSteps(Array(BEAT_STEP_COUNT).fill(false));
    setSilhouette(null);
    setPalette([]);
    setPoemWords([]);
    setMovesDone([]);
  }, [medium, roundId]);

  const styles = useMemo(() => StyleSheet.create({
    panel: {
      gap: 14,
      padding: 16,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBadge: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.studioYellow,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
    },
    heading: { flex: 1, color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 17 },
    body: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19 },
    eyebrow: { color: colors.studioMuted, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.1 },
    progress: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    beatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    beatPad: {
      width: 44,
      height: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    beatPadOn: { backgroundColor: colors.studioOrange, transform: [{ translateY: -2 }] },
    beatPadPlaying: { borderColor: colors.primary, borderWidth: 3, transform: [{ scale: 1.06 }] },
    beatNumber: { color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    beatControls: { flexDirection: 'row', gap: 8 },
    beatControlButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioYellow,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
    },
    beatControlDisabled: { opacity: 0.48 },
    beatControlText: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    beatLegend: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 11, lineHeight: 16 },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    option: {
      minHeight: 42,
      paddingHorizontal: 13,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionSelected: { backgroundColor: colors.studioYellow },
    optionText: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
    paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    swatchButton: { minWidth: 54, alignItems: 'center', gap: 5 },
    swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: colors.studioInk },
    swatchSelected: { borderWidth: 4, borderColor: colors.primary },
    swatchLabel: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 10 },
    previewRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9 },
    previewLabel: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 12, flex: 1 },
    selectedWord: {
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 13,
      backgroundColor: colors.studioYellow,
      borderWidth: 1,
      borderColor: colors.studioInk,
    },
    selectedWordText: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    moveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    moveCopy: { flex: 1, gap: 3 },
    moveTitle: { color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
    moveDetail: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 11, lineHeight: 15 },
    moveDone: {
      minWidth: 70,
      minHeight: 40,
      paddingHorizontal: 9,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.studioInk,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    moveDoneSelected: { backgroundColor: colors.studioYellow },
    moveDoneText: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 11 },
    finishButton: {
      minHeight: 48,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.ink,
      backgroundColor: colors.studioOrange,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    finishText: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 13 },
    success: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    successText: { color: colors.primary, fontFamily: 'DMSans_700Bold', fontSize: 14 },
    hint: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 11, lineHeight: 16 },
  }), [colors]);

  const cancelBeatPlayback = useCallback(() => {
    playbackRef.current = false;
    playbackRunRef.current += 1;
    if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    playbackTimerRef.current = null;
  }, []);

  const stopBeatPlayback = useCallback(() => {
    cancelBeatPlayback();
    setIsBeatPlaying(false);
    setActiveBeatStep(null);
  }, [cancelBeatPlayback]);

  useEffect(() => {
    if (medium !== 'music' || status !== 'playing') {
      setAudioModeReady(false);
      stopBeatPlayback();
      return;
    }

    let active = true;
    cancelBeatPlayback();
    setIsBeatPlaying(false);
    setActiveBeatStep(null);
    setAudioModeReady(false);
    setAudioError(null);
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    })
      .then(() => {
        if (active) setAudioModeReady(true);
      })
      .catch(() => {
        if (active) setAudioError('Sound could not start. Check your device volume and try again.');
      });

    return () => {
      active = false;
      cancelBeatPlayback();
    };
  }, [cancelBeatPlayback, medium, roundId, status, stopBeatPlayback]);

  const playDrumHit = useCallback((index: number) => {
    const voice = beatVoiceForStep(index);
    const player = voice === 'kick' ? kickPlayer : voice === 'snare' ? snarePlayer : hatPlayer;
    if (!player.isLoaded) {
      setAudioError('Drum sounds are still loading. Try again in a moment.');
      return;
    }
    player.volume = 0.82;
    void player.seekTo(0)
      .then(() => player.play())
      .catch(() => setAudioError('Sound could not start. Check your device volume and try again.'));
  }, [hatPlayer, kickPlayer, snarePlayer]);

  const playBeatPreview = useCallback(() => {
    if (!audioReady) {
      setAudioError('Preparing the drum sounds…');
      return;
    }
    if (beatCount === 0) {
      setAudioError('Tap a step first to add a sound.');
      return;
    }

    setAudioError(null);
    cancelBeatPlayback();
    const runId = playbackRunRef.current;
    playbackRef.current = true;
    setIsBeatPlaying(true);
    let stepIndex = 0;
    const playNextStep = () => {
      if (!playbackRef.current || playbackRunRef.current !== runId) return;
      setActiveBeatStep(stepIndex);
      if (beatSteps[stepIndex]) playDrumHit(stepIndex);
      if (stepIndex === BEAT_STEP_COUNT - 1) {
        playbackTimerRef.current = setTimeout(stopBeatPlayback, BEAT_STEP_INTERVAL_MS);
        return;
      }
      stepIndex += 1;
      playbackTimerRef.current = setTimeout(playNextStep, BEAT_STEP_INTERVAL_MS);
    };
    playNextStep();
  }, [audioReady, beatCount, beatSteps, cancelBeatPlayback, playDrumHit, stopBeatPlayback]);

  const toggleBeat = useCallback((index: number) => {
    if (!audioReady || isBeatPlaying) return;
    feedback();
    if (!beatSteps[index]) playDrumHit(index);
    setBeatSteps((current) => current.map((step, stepIndex) => stepIndex === index ? !step : step));
  }, [audioReady, beatSteps, isBeatPlaying, playDrumHit]);

  const togglePaletteColor = useCallback((id: string) => {
    feedback();
    setPalette((current) => current.includes(id)
      ? current.filter((color) => color !== id)
      : current.length < 3 ? [...current, id] : current);
  }, []);

  const togglePoemWord = useCallback((word: string) => {
    feedback();
    setPoemWords((current) => current.includes(word)
      ? current.filter((item) => item !== word)
      : current.length < 3 ? [...current, word] : current);
  }, []);

  const markMoveDone = useCallback((id: string) => {
    feedback();
    setMovesDone((current) => current.includes(id) ? current : [...current, id]);
  }, []);

  if (status === 'complete') {
    return (
      <View style={styles.panel} testID={`micro-challenge-${medium}-complete`}>
        <View style={styles.success}>
          <Feather name={completionReason === 'timeout' ? 'clock' : 'check-circle'} size={20} color={colors.primary} />
          <Text style={styles.successText}>{completionReason === 'timeout' ? 'Time’s up' : 'Challenge complete'}</Text>
        </View>
        <Text style={styles.body}>
          {completionReason === 'timeout'
            ? 'Your round is over. Try another prompt whenever you’re ready.'
            : 'A quick creative reset. No points or habit streaks changed.'}
        </Text>
      </View>
    );
  }

  if (status === 'idle') {
    return (
      <View style={styles.panel} testID={`micro-challenge-${medium}-preview`}>
        <View style={styles.panelHeader}>
          <View style={styles.iconBadge}>
            <Feather name={config.icon} size={18} color={colors.ink} />
          </View>
          <Text style={styles.heading}>{config.title}</Text>
        </View>
        <Text style={styles.body}>{config.description}</Text>
        {medium === 'music' ? <Text style={styles.hint}>No microphone needed. Use the built-in kick, snare, and hi-hat sounds.</Text> : null}
        {medium === 'movement' ? <Text style={styles.hint}>Choose a comfortable seated or standing option. Skip any movement that doesn’t feel right.</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.panel} testID={`micro-challenge-${medium}-active`}>
      <View style={styles.panelHeader}>
        <View style={styles.iconBadge}>
          <Feather name={config.icon} size={18} color={colors.ink} />
        </View>
        <Text style={styles.heading}>{config.title}</Text>
        {medium === 'music' ? <Text style={styles.progress}>{beatCount}/8</Text> : null}
        {medium === 'fashion' ? <Text style={styles.progress}>{palette.length}/3</Text> : null}
        {medium === 'poetry' ? <Text style={styles.progress}>{poemWords.length}/3</Text> : null}
        {medium === 'movement' ? <Text style={styles.progress}>{movesDone.length}/3</Text> : null}
      </View>

      {medium === 'music' ? (
        <>
          <Text style={styles.eyebrow}>TAP TO ADD A BEAT</Text>
          <View style={styles.beatGrid}>
            {beatSteps.map((on, index) => (
              <Pressable
                key={index}
                onPress={() => toggleBeat(index)}
                disabled={!audioReady || isBeatPlaying}
                accessibilityRole="button"
                accessibilityLabel={`Step ${index + 1}, ${beatVoiceLabel(beatVoiceForStep(index))}, ${on ? 'on' : 'off'}`}
                accessibilityState={{ selected: on, disabled: !audioReady || isBeatPlaying }}
                style={[
                  styles.beatPad,
                  on && styles.beatPadOn,
                  activeBeatStep === index && styles.beatPadPlaying,
                  (!audioReady || isBeatPlaying) && { opacity: 0.68 },
                ]}
                testID={`micro-challenge-beat-${index + 1}`}
              >
                <Text style={styles.beatNumber}>{on ? '●' : index + 1}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.beatLegend}>1 & 5 kick · 3 & 7 snare · other steps hi-hat</Text>
          <Text style={styles.hint}>
            {audioError ?? (audioReady
              ? 'Tap a step to hear it. Play the loop to preview your rhythm.'
              : 'Preparing the drum sounds…')}
          </Text>
          <View style={styles.beatControls}>
            <Pressable
              disabled={!isBeatPlaying && (!audioReady || beatCount === 0)}
              onPress={isBeatPlaying ? stopBeatPlayback : playBeatPreview}
              accessibilityRole="button"
              accessibilityLabel={isBeatPlaying ? 'Stop beat preview' : 'Play beat preview'}
              accessibilityState={{ disabled: !isBeatPlaying && (!audioReady || beatCount === 0) }}
              style={[styles.beatControlButton, !isBeatPlaying && (!audioReady || beatCount === 0) && styles.beatControlDisabled]}
              testID="micro-challenge-music-play"
            >
              <Feather name={isBeatPlaying ? 'square' : 'play'} size={15} color={colors.ink} />
              <Text style={styles.beatControlText}>{isBeatPlaying ? 'Stop preview' : 'Play beat'}</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>Turn on at least three steps to lock in your loop.</Text>
          <Pressable
            disabled={beatCount < 3 || isBeatPlaying}
            onPress={onComplete}
            accessibilityRole="button"
            accessibilityLabel="Finish the beat challenge"
            accessibilityState={{ disabled: beatCount < 3 || isBeatPlaying }}
            style={[styles.finishButton, (beatCount < 3 || isBeatPlaying) && { opacity: 0.5 }]}
            testID="micro-challenge-music-finish"
          >
            <Feather name="check" size={16} color={colors.ink} />
            <Text style={styles.finishText}>Lock in this beat</Text>
          </Pressable>
        </>
      ) : null}

      {medium === 'fashion' ? (
        <>
          <Text style={styles.eyebrow}>1 · PICK A SILHOUETTE</Text>
          <View style={styles.optionRow}>
            {FASHION_SILHOUETTES.map((item) => (
              <Pressable
                key={item}
                onPress={() => { feedback(); setSilhouette(item); }}
                accessibilityRole="button"
                accessibilityState={{ selected: silhouette === item }}
                style={[styles.option, silhouette === item && styles.optionSelected]}
                testID={`micro-challenge-silhouette-${item.toLowerCase().replaceAll(' ', '-')}`}
              >
                <Text style={styles.optionText}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.eyebrow}>2 · CHOOSE THREE COLORS</Text>
          <View style={styles.paletteRow}>
            {FASHION_PALETTE.map((swatch) => {
              const selected = palette.includes(swatch.id);
              return (
                <Pressable
                  key={swatch.id}
                  onPress={() => togglePaletteColor(swatch.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${swatch.label}${selected ? ', selected' : ''}`}
                  accessibilityState={{ selected, disabled: !selected && palette.length >= 3 }}
                  style={styles.swatchButton}
                  testID={`micro-challenge-color-${swatch.id}`}
                >
                  <View style={[styles.swatch, { backgroundColor: swatch.color }, selected && styles.swatchSelected]}>
                    {selected ? <Feather name="check" size={14} color={swatch.color === '#282330' ? '#FFFFFF' : colors.ink} /> : null}
                  </View>
                  <Text style={styles.swatchLabel}>{swatch.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>{silhouette ?? 'Choose a silhouette'}</Text>
            {palette.map((id) => {
              const swatch = FASHION_PALETTE.find((item) => item.id === id);
              return swatch ? <View key={id} style={[styles.swatch, { width: 25, height: 25, backgroundColor: swatch.color }]} /> : null;
            })}
          </View>
          <Pressable
            disabled={!silhouette || palette.length !== 3}
            onPress={onComplete}
            accessibilityRole="button"
            accessibilityLabel="Finish the style challenge"
            accessibilityState={{ disabled: !silhouette || palette.length !== 3 }}
            style={[styles.finishButton, (!silhouette || palette.length !== 3) && { opacity: 0.5 }]}
            testID="micro-challenge-fashion-finish"
          >
            <Feather name="check" size={16} color={colors.ink} />
            <Text style={styles.finishText}>Finish this look</Text>
          </Pressable>
        </>
      ) : null}

      {medium === 'poetry' ? (
        <>
          <Text style={styles.eyebrow}>PICK THREE WORDS</Text>
          <View style={styles.optionRow}>
            {POETRY_WORD_BANK.map((word) => {
              const selected = poemWords.includes(word);
              return (
                <Pressable
                  key={word}
                  onPress={() => togglePoemWord(word)}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: !selected && poemWords.length >= 3 }}
                  style={[styles.option, selected && styles.optionSelected]}
                  testID={`micro-challenge-word-${word}`}
                >
                  <Text style={styles.optionText}>{word}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.previewRow}>
            {poemWords.length ? poemWords.map((word) => (
              <Pressable
                key={word}
                onPress={() => togglePoemWord(word)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${word}`}
                style={styles.selectedWord}
              >
                <Text style={styles.selectedWordText}>{word}</Text>
              </Pressable>
            )) : <Text style={styles.hint}>Your line will appear here.</Text>}
          </View>
          <Pressable
            disabled={poemWords.length !== 3}
            onPress={onComplete}
            accessibilityRole="button"
            accessibilityLabel="Finish your mini poem"
            accessibilityState={{ disabled: poemWords.length !== 3 }}
            style={[styles.finishButton, poemWords.length !== 3 && { opacity: 0.5 }]}
            testID="micro-challenge-poetry-finish"
          >
            <Feather name="check" size={16} color={colors.ink} />
            <Text style={styles.finishText}>Seal this line</Text>
          </Pressable>
        </>
      ) : null}

      {medium === 'movement' ? (
        <>
          <Text style={styles.eyebrow}>COMPLETE THREE COMFORTABLE MOVES</Text>
          {MOVEMENT_SEQUENCE.map((move) => {
            const done = movesDone.includes(move.id);
            return (
              <View key={move.id} style={styles.moveRow}>
                <View style={styles.moveCopy}>
                  <Text style={styles.moveTitle}>{move.label}</Text>
                  <Text style={styles.moveDetail}>{move.detail}</Text>
                </View>
                <Pressable
                  onPress={() => markMoveDone(move.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${done ? 'Completed' : 'Mark complete'}: ${move.label}`}
                  accessibilityState={{ selected: done }}
                  style={[styles.moveDone, done && styles.moveDoneSelected]}
                  testID={`micro-challenge-move-${move.id}`}
                >
                  <Text style={styles.moveDoneText}>{done ? 'Done ✓' : 'I tried it'}</Text>
                </Pressable>
              </View>
            );
          })}
          {movesDone.length === MOVEMENT_SEQUENCE.length ? (
            <Pressable
              onPress={onComplete}
              accessibilityRole="button"
              accessibilityLabel="Finish the movement challenge"
              style={styles.finishButton}
              testID="micro-challenge-movement-finish"
            >
              <Feather name="check" size={16} color={colors.ink} />
              <Text style={styles.finishText}>Finish movement mix</Text>
            </Pressable>
          ) : null}
          <Text style={styles.hint}>No camera or activity tracking. Your choices stay in this round.</Text>
        </>
      ) : null}
    </View>
  );
}
