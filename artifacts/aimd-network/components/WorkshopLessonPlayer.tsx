import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export type WorkshopLesson = {
  id: number;
  order: number;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
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
  onClose: () => void;
  onComplete: (lessonId: number) => void;
  onStartAssignment: (lessonId: number) => void;
  completing?: boolean;
};

function NativeLessonVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls
      testID="workshop-lesson-video"
    />
  );
}

export default function WorkshopLessonPlayer({
  visible,
  lesson,
  workshopTitle,
  onClose,
  onComplete,
  onStartAssignment,
  completing = false,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
          color: colors.background,
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={style.overlay} testID="workshop-lesson-player">
        <View style={style.header}>
          <TouchableOpacity style={style.back} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close lesson">
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={style.headerCopy}>
            <Text style={style.eyebrow}>{workshopTitle ?? 'Workshop lesson'}</Text>
            <Text style={style.title} numberOfLines={1}>{lesson.title}</Text>
          </View>
        </View>

        <View style={style.videoShell}>
          {lesson.videoUrl ? (
            Platform.OS === 'web' ? (
              // React Native Web passes this through to the browser's native player.
              <video src={lesson.videoUrl} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <NativeLessonVideo uri={lesson.videoUrl} />
            )
          ) : (
            <View style={style.mediaEmpty}>
              <Feather name="video-off" size={30} color={colors.gold} />
              <Text style={style.mediaTitle}>Lesson video is being prepared</Text>
              <Text style={style.mediaBody}>
                The lesson blueprint is ready. An instructor video will appear here when it is uploaded.
              </Text>
            </View>
          )}
        </View>

        <View style={[style.scroll, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={style.body}>
            <Text style={style.lessonNumber}>Module {lesson.order}</Text>
            <Text style={style.lessonTitle}>{lesson.title}</Text>
            <Text style={style.duration}>{lesson.durationMinutes ?? 0} minutes</Text>
            {!!lesson.description && <Text style={style.description}>{lesson.description}</Text>}
            <View style={style.note}>
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
            </View>
            {lesson.videoUrl ? (
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
            {lesson.videoUrl && (
              <TouchableOpacity
                style={style.secondary}
                onPress={() => onStartAssignment(lesson.id)}
                testID="workshop-lesson-assignment"
              >
                <Feather name="video" size={17} color={colors.electricMagenta} />
                <Text style={style.secondaryText}>Record assignment for this module</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  video: { width: '100%', height: '100%' },
});