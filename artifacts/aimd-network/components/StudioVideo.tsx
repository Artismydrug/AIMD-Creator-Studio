import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  AppState,
  Text,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useFocusEffect } from 'expo-router';

type StudioVideoProps = {
  uri: string;
  active: boolean;
  preload?: boolean;
  controlsTopInset?: number;
  reducedMotion: boolean;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

export default function StudioVideo({
  uri,
  active,
  preload = false,
  controlsTopInset = 14,
  reducedMotion,
  muted,
  onMutedChange,
  style,
}: StudioVideoProps) {
  const [showPlayControl, setShowPlayControl] = useState(reducedMotion || !active);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const shouldLoad = (active || preload) && focused && foreground;
  const player = useVideoPlayer(shouldLoad ? { uri, useCaching: true } : null, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.bufferOptions = { preferredForwardBufferDuration: 3, minBufferForPlayback: 0.5, maxBufferBytes: 8 * 1024 * 1024 };
  });
  const playerRef = useRef(player);
  playerRef.current = player;
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => {
      setFocused(false);
      try { playerRef.current.pause(); } catch { /* Already released by navigation. */ }
    };
  }, []));
  useEffect(() => {
    const background = AppState.addEventListener('change', state => setForeground(state === 'active'));
    const status = player.addListener('statusChange', ({ status }) => {
      setFailed(status === 'error');
      setLoading(status === 'loading' || status === 'idle');
    });
    setLoading(player.status !== 'readyToPlay' && player.status !== 'error');
    setFailed(player.status === 'error');
    return () => { background.remove(); status.remove(); };
  }, [player]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    try {
      if (active && focused && foreground && !reducedMotion && !failed) {
        player.play();
        setShowPlayControl(false);
        return;
      }
      player.pause();
      setShowPlayControl(true);
    } catch {
      setFailed(true);
    }
  }, [active, player, reducedMotion, focused, foreground, failed]);

  const togglePlayback = () => {
    if (!active || !focused || !foreground) return;
    try {
    if (player.playing) {
      player.pause();
      setShowPlayControl(true);
    } else {
      player.play();
      setShowPlayControl(false);
    }
    } catch { setFailed(true); }
  };

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        startsPictureInPictureAutomatically={false}
        onFirstFrameRender={() => setLoading(false)}
        accessibilityLabel="Studio post video"
      />
      {active && loading && !failed && <View style={styles.failure} pointerEvents="none">
        <ActivityIndicator color="#FFFFFF" accessibilityLabel="Loading video" />
        <Text style={styles.failureText}>Loading video…</Text>
      </View>}
      {failed && (
        <View style={styles.failure}>
          <Text style={styles.failureText}>Video couldn’t load.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading video"
            style={styles.retryButton} onPress={() => {
              setFailed(false); setLoading(true);
              void player.replaceAsync({ uri, useCaching: true }).catch(() => { setFailed(true); setLoading(false); });
            }}>
            <Text style={styles.failureText}>Retry video</Text>
          </TouchableOpacity>
        </View>
      )}
      {!failed && <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={showPlayControl ? 'Play video' : 'Pause video'}
        style={StyleSheet.absoluteFill}
        onPress={togglePlayback}
        disabled={failed || loading}
      >
        {showPlayControl && !loading && !failed ? (
          <View style={styles.playButton}>
            <Feather name="play" size={28} color="#FFFFFF" />
          </View>
        ) : null}
      </TouchableOpacity>}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Unmute videos' : 'Mute videos'}
        accessibilityState={{ checked: !muted }}
        style={[styles.muteButton, { top: controlsTopInset }]}
        onPress={() => onMutedChange(!muted)}
      >
        <Feather name={muted ? 'volume-x' : 'volume-2'} size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#17343A',
  },
  playButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,52,58,0.76)',
  },
  muteButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,52,58,0.76)',
  },
  failure: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  retryButton: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF', borderRadius: 12 },
  failureText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center', backgroundColor: 'rgba(23,52,58,0.9)', padding: 12, borderRadius: 8 },
});