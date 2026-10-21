import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';

/** A cached, center-cropped photo, with an explicit loading/error state. */
export default function StudioImage({ uri, load = true, style, onLoadDimensions }: {
  uri: string; load?: boolean; style?: StyleProp<ViewStyle>;
  onLoadDimensions?: (width: number, height: number) => void;
}) {
  const colors = useColors();
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const failed = failedUri === uri;
  return (
    <View style={[{ backgroundColor: colors.mediaPaper }, style]}>
      {load && <Image key={`${uri}:${attempt}`}
        source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover"
        cachePolicy="memory-disk" recyclingKey={uri} accessibilityLabel="Creator's studio photo"
        onLoad={({ source }) => {
          setLoadedUri(uri);
          setFailedUri(null);
          onLoadDimensions?.(source.width, source.height);
        }}
        onError={() => setFailedUri(uri)}
      />}
      {load && !failed && loadedUri !== uri && (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color={colors.mediaPaperForeground} accessibilityLabel="Loading photo" />
        </View>
      )}
      {load && failed && <View style={styles.center}>
        <Text style={[styles.label, { color: colors.mediaPaperForeground }]}>Photo couldn’t load.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry loading photo"
          onPress={() => { setFailedUri(null); setLoadedUri(null); setAttempt(value => value + 1); }}
          style={[styles.retry, { backgroundColor: colors.primary }]}>
          <Text style={[styles.label, { color: colors.primaryForeground }]}>Retry</Text>
        </Pressable>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  label: { fontSize: 14, fontFamily: 'DMSans_500Medium', textAlign: 'center' },
  retry: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },
});
