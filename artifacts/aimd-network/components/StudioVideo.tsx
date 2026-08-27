import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

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
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (active && !reducedMotion) {
      player.play();
      setShowPlayControl(false);
      return;
    }

    player.pause();
    setShowPlayControl(true);
  }, [active, player, reducedMotion]);

  const togglePlayback = () => {
    if (player.playing) {
      player.pause();
      setShowPlayControl(true);
    } else {
      player.play();
      setShowPlayControl(false);
    }
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
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={showPlayControl ? 'Play video' : 'Pause video'}
        style={StyleSheet.absoluteFill}
        onPress={togglePlayback}
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
});