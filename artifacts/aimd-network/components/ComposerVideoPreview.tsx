import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useColors } from '@/hooks/useColors';

/** Local-only preview. Never autoplay or upload the selected asset. */
export default function ComposerVideoPreview({ uri, active }: { uri: string; active: boolean }) {
  const colors = useColors();
  const [failed, setFailed] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  useEffect(() => {
    const status = player.addListener('statusChange', ({ status }) => {
      setFailed(status === 'error');
    });
    const background = AppState.addEventListener('change', (state) => {
      if (state !== 'active') player.pause();
    });
    if (!active) player.pause();
    return () => {
      status.remove();
      background.remove();
    };
  }, [player, active]);

  return (
    <View style={[styles.frame, { backgroundColor: colors.muted }]}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
        accessibilityLabel="Selected video preview"
      />
      {failed && (
        <Text style={[styles.error, { color: colors.foreground, backgroundColor: colors.card }]}>
          This video could not be previewed. Try selecting another file.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 240, width: '100%', borderRadius: 12, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  error: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, fontSize: 14 },
});
