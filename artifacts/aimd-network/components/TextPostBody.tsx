import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { shouldScrollTextPost } from '@/lib/textPostLayout';

interface TextPostBodyProps {
  postId: number;
  caption: string;
  tags?: string[] | null;
}

export default function TextPostBody({ postId, caption, tags }: TextPostBodyProps) {
  const colors = useColors();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const styles = useMemo(() => StyleSheet.create({
    body: { flex: 1 },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingTop: 28,
      paddingBottom: 28,
      paddingLeft: 20,
      paddingRight: 84,
    },
    writing: {
      color: colors.foreground,
      fontFamily: 'DMSans_500Medium',
      fontSize: 22,
      lineHeight: 32,
    },
    label: {
      alignSelf: 'flex-start', color: colors.primary, fontFamily: 'DMSans_700Bold',
      fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16,
      borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 6,
    },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 18 },
    tag: {
      color: colors.primary,
      backgroundColor: colors.muted,
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 99,
    },
  }), [colors]);

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.content}
      testID={`text-post-${postId}`}
      onLayout={({ nativeEvent }) => setViewportHeight(nativeEvent.layout.height)}
      onContentSizeChange={(_width, height) => setContentHeight(height)}
      scrollEnabled={shouldScrollTextPost(contentHeight, viewportHeight)}
      nestedScrollEnabled
      directionalLockEnabled
      bounces={false}
    >
      <Text style={styles.label}>Script & writing</Text>
      <Text style={styles.writing} selectable>{caption}</Text>
      {!!tags?.length && (
        <View style={styles.tags}>
          {tags.map((tag, index) => <Text key={`${tag}-${index}`} style={styles.tag}>#{tag}</Text>)}
        </View>
      )}
    </ScrollView>
  );
}
