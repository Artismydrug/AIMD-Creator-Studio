import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLogHabitSession } from '@workspace/api-client-react';
import type { Habit } from '@workspace/api-client-react';

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

  const logMutation = useLogHabitSession({
    mutation: {
      onSuccess: () => {
        setLocalDone(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onLogged?.();
      },
    },
  });

  const handleLog = () => {
    if (localDone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    logMutation.mutate({ id: habit.id, data: { minutesSpent: habit.targetMinutes } });
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
