import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  AppState,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useFocusEffect } from 'expo-router';

type StudioVideoProps = {
  uri: string;
  active: boolean;
  reducedMotion: boolean;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

export default function StudioVideo({
  uri,
  active,
  reducedMotion,
  muted,
  onMutedChange,
  style,
}: StudioVideoProps) {
  const [showPlayControl, setShowPlayControl] = useState(reducedMotion || !active);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer(active ? uri : null, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => {
      setFocused(false);
      try { player.pause(); } catch { /* Already released by navigation. */ }
    };
  }, [player]));
  useEffect(() => {
    const background = AppState.addEventListener('change', state => setForeground(state === 'active'));
    const status = player.addListener('statusChange', ({ status }) => setFailed(status === 'error'));
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
        accessibilityLabel="Studio post video"
      />
      {failed && (
        <View style={styles.failure} pointerEvents="none">
          <Text style={styles.failureText}>Video unavailable. Swipe to keep exploring.</Text>
        </View>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={showPlayControl ? 'Play video' : 'Pause video'}
        style={StyleSheet.absoluteFill}
        onPress={togglePlayback}
        disabled={failed}
      >
        {showPlayControl ? (
          <View style={styles.playButton}>
            <Feather name="play" size={28} color="#FFFFFF" />
          </View>
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Unmute videos' : 'Mute videos'}
        accessibilityState={{ checked: !muted }}
        style={styles.muteButton}
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
  failure: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  failureText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center', backgroundColor: 'rgba(23,52,58,0.9)', padding: 12, borderRadius: 8 },
});