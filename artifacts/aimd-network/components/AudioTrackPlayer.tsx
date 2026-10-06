import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';

// Only the track explicitly selected by the listener may play.
let stopCurrentTrack: (() => void) | null = null;

function timeLabel(seconds: number) {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function AudioTrackPlayer({
  uri,
  active = true,
  title = 'Audio track',
}: {
  uri: string;
  active?: boolean;
  title?: string;
}) {
  const colors = useColors();
  const source = useMemo(() => active ? { uri } : null, [uri, active]);
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [trackWidth, setTrackWidth] = useState(1);
  const pause = useCallback(() => {
    // The native hook can release an old player before navigation cleanup runs.
    try { player.pause(); } catch { /* Already released; no playback remains. */ }
    if (stopCurrentTrack === pause) stopCurrentTrack = null;
  }, [player]);

  useEffect(() => {
    if (!active) pause();
  }, [active, pause]);
  useFocusEffect(useCallback(() => () => pause(), [pause]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') pause();
    });
    return () => { subscription.remove(); pause(); };
  }, [pause]);
  useEffect(() => {
    if (!active) return;
    if (status.isLoaded) { setError(null); return; }
    const timeout = setTimeout(() => setError('Could not load this track. Tap Retry.'), 15_000);
    return () => clearTimeout(timeout);
  }, [active, status.isLoaded, attempt]);

  const seek = async (seconds: number) => {
    try {
      await player.seekTo(Math.max(0, Math.min(status.duration, seconds)));
    } catch {
      setError('Could not seek in this track. Tap Retry.');
    }
  };

  const toggle = async () => {
    try {
      if (status.playing) { pause(); return; }
      stopCurrentTrack?.();
      if (Platform.OS !== 'web') {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'doNotMix',
          allowsRecording: false,
          shouldRouteThroughEarpiece: false,
        });
      }
      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
        await player.seekTo(0);
      }
      stopCurrentTrack = pause;
      player.play();
    } catch {
      setError('Could not play this track. Tap Retry.');
    }
  };

  const progress = status.duration > 0
    ? Math.max(0, Math.min(100, status.currentTime / status.duration * 100))
    : 0;
  const styles = useMemo(() => StyleSheet.create({
    panel: { width: '100%', padding: 16, borderRadius: colors.radius, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 12 },
    heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, color: colors.foreground, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    play: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    timeline: { flex: 1, minWidth: 0 },
    seek: { height: 32, justifyContent: 'center' },
    track: { height: 5, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' },
    progress: { height: '100%', backgroundColor: colors.primary },
    times: { flexDirection: 'row', justifyContent: 'space-between' },
    time: { color: colors.mutedForeground, fontFamily: 'DMSans_500Medium', fontSize: 11 },
    error: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 12 },
    retry: { color: colors.primary, fontFamily: 'DMSans_700Bold', paddingVertical: 8 },
  }), [colors]);

  return (
    <View style={styles.panel}>
      <View style={styles.heading}>
        <Feather name="music" size={17} color={colors.primary} />
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {error ? (
        <View accessibilityLiveRegion="polite">
          <Text style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Retry loading audio" onPress={() => {
            pause();
            setError(null);
            setAttempt((value) => value + 1);
            player.replace({ uri });
          }}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.row}>
          <Pressable style={styles.play} disabled={!active || !status.isLoaded}
            accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause audio track' : 'Play audio track'}
            accessibilityState={{ disabled: !active || !status.isLoaded, busy: status.isBuffering }}
            onPress={() => { void toggle(); }} testID="audio-play-pause">
            {!status.isLoaded || status.isBuffering
              ? <ActivityIndicator color={colors.primaryForeground} />
              : <Feather name={status.playing ? 'pause' : 'play'} size={22} color={colors.primaryForeground} />}
          </Pressable>
          <View style={styles.timeline}>
            <Pressable style={styles.seek} accessibilityRole="adjustable" accessibilityLabel="Audio progress"
              accessibilityValue={{ min: 0, max: status.duration, now: status.currentTime, text: `${timeLabel(status.currentTime)} of ${timeLabel(status.duration)}` }}
              accessibilityActions={[{ name: 'increment', label: 'Forward ten seconds' }, { name: 'decrement', label: 'Back ten seconds' }]}
              onAccessibilityAction={(event) => { void seek(status.currentTime + (event.nativeEvent.actionName === 'increment' ? 10 : -10)); }}
              onLayout={(event) => setTrackWidth(Math.max(1, event.nativeEvent.layout.width))}
              disabled={!status.isLoaded}
              onPress={(event) => { void seek(event.nativeEvent.locationX / trackWidth * status.duration); }}>
              <View style={styles.track}><View style={[styles.progress, { width: `${progress}%` }]} /></View>
            </Pressable>
            <View style={styles.times}>
              <Text style={styles.time}>{timeLabel(status.currentTime)}</Text>
              <Text style={styles.time}>{timeLabel(status.duration)}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
