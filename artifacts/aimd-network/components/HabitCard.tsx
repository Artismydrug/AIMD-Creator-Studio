import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { customFetch, useLogHabitSession } from '@workspace/api-client-react';
import type { Habit } from '@workspace/api-client-react';
import * as ImagePicker from 'expo-image-picker';

const CATEGORY_COLORS: Record<string, string> = {
  drawing: '#33cc66',
  painting: '#a855f7',
  sculpture: '#f59e0b',
  photography: '#3b82f6',
  music: '#ec4899',
  writing: '#14b8a6',
};

interface HabitCardProps {
  habit: Habit;
  onLogged?: () => void;
}

export default function HabitCard({ habit, onLogged }: HabitCardProps) {
  const colors = useColors();
  const catColor = CATEGORY_COLORS[habit.category?.toLowerCase() ?? ''] ?? colors.mutedForeground;
  const [localDone, setLocalDone] = React.useState(habit.completedToday ?? false);
  const [proof, setProof] = React.useState<{ url: string; mediaType: 'image' | 'video' } | null>(null);
  const [uploadingProof, setUploadingProof] = React.useState(false);

  const logMutation = useLogHabitSession({
    mutation: {
      onSuccess: () => {
        setLocalDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onLogged?.();
      },
    },
  });

  const chooseProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Proof access needed', 'Choose a photo or video of this practice session before you log it.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mediaType = asset.type === 'video' ? 'video' : 'image';
    const contentType = asset.mimeType ?? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
    try {
      setUploadingProof(true);
      const file = await fetch(asset.uri);
      const bytes = await file.arrayBuffer();
      const uploaded = await customFetch<{ objectPath: string }>('/api/storage/uploads', {
        method: 'POST',
        headers: { 'Content-Type': contentType, 'X-AIMD-UPLOAD-PURPOSE': 'habit_proof' },
        body: bytes,
      });
      setProof({ url: `/api/storage${uploaded.objectPath}`, mediaType });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Could not upload proof', 'Try a smaller image or video, then try again.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleLog = () => {
    if (localDone) return;
    if (!proof) {
      chooseProof();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logMutation.mutate({
      id: habit.id,
      data: { minutesSpent: habit.targetMinutes, proofUrl: proof.url, proofMediaType: proof.mediaType },
    });
  };

  const s = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 10,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    body: { flex: 1 },
    name: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 15,
      color: colors.foreground,
      marginBottom: 4,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: colors.muted,
    },
    categoryText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    streak: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    streakText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    target: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    checkBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    proofButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 12,
    },
    proofText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      color: colors.mutedForeground,
    },
  }), [colors]);

  return (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.body}>
          <Text style={s.name}>{habit.name}</Text>
          <View style={s.meta}>
            <View style={s.categoryBadge}>
              <Text style={[s.categoryText, { color: catColor }]}>{habit.category}</Text>
            </View>
            <View style={s.streak}>
              <Feather name="zap" size={12} color={colors.primary} />
              <Text style={s.streakText}>{habit.currentStreak}d streak</Text>
            </View>
            <Text style={s.target}>{habit.targetMinutes}min</Text>
          </View>
        {!localDone && (
          <TouchableOpacity
            style={[s.proofButton, proof && { borderColor: colors.primary }]}
            onPress={chooseProof}
            disabled={uploadingProof}
            accessibilityLabel="Attach proof photo or video"
          >
            <Feather name={proof ? 'check-circle' : 'camera'} size={14} color={proof ? colors.primary : colors.mutedForeground} />
            <Text style={[s.proofText, proof && { color: colors.primary }]}>
              {uploadingProof ? 'Uploading proof…' : proof ? `${proof.mediaType === 'video' ? 'Video' : 'Photo'} proof ready` : 'Attach photo or video proof'}
            </Text>
          </TouchableOpacity>
        )}
        </View>

        <TouchableOpacity
          style={[s.checkBtn, {
            borderColor: localDone ? colors.primary : colors.border,
            backgroundColor: localDone ? colors.primary : 'transparent',
          }]}
          onPress={handleLog}
          disabled={localDone || logMutation.isPending}
          testID={`log-habit-${habit.id}`}
        >
          <Feather
            name="check"
            size={18}
            color={localDone ? colors.primaryForeground : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
