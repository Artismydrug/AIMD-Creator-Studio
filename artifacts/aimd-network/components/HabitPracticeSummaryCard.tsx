import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  getListHabitLogsQueryKey,
  useListHabitLogs,
  useListHabits,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import RisingPracticeFlame from '@/components/RisingPracticeFlame';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const WEEK_LABELS = ['Past 7 days', 'Prev. 7 days', '2 weeks', '3 weeks'];

export default function HabitPracticeSummaryCard({ onOpenHabits }: { onOpenHabits: () => void }) {
  const colors = useColors();
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const { data: habitsResponse, isLoading: habitsLoading, isError: habitsError } = useListHabits();
  const habits = Array.isArray(habitsResponse?.habits)
    ? habitsResponse.habits.filter(habit => habit && typeof habit.id === 'number')
    : [];
  const selectedHabit = habits.find(habit => habit.id === selectedHabitId) ?? habits[0] ?? null;
  const historyParams = { habitId: selectedHabit?.id ?? 0, days: 27 };
  const {
    data: historyResponse,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useListHabitLogs(historyParams, {
    query: {
      enabled: selectedHabit !== null,
      queryKey: getListHabitLogsQueryKey(historyParams),
    },
  });
  const historyInvalid = historyResponse != null && !Array.isArray(historyResponse);
  const historyLogs = Array.isArray(historyResponse)
    ? historyResponse.filter(log => log && log.completed && typeof log.date === 'string')
    : [];
  const weeklyPractice = useMemo(() => {
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const completedDates = historyLogs.map(log => log.date.slice(0, 10));
    return Array.from({ length: 4 }, (_, weeksAgo) => {
      const endDate = new Date(todayUtc - weeksAgo * SEVEN_DAYS_MS).toISOString().slice(0, 10);
      const startDate = new Date(todayUtc - (weeksAgo * 7 + 6) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const daysCompleted = new Set(completedDates.filter(date => date >= startDate && date <= endDate)).size;
      return { label: WEEK_LABELS[weeksAgo], daysCompleted };
    });
  }, [historyLogs]);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius + 2,
      gap: 14,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.foreground },
    viewAll: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 5 },
    viewAllText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: colors.primary },
    selector: { flexGrow: 0, marginHorizontal: -3 },
    selectorContent: { gap: 6, paddingHorizontal: 3 },
    habitChip: {
      minHeight: 32,
      maxWidth: 150,
      paddingHorizontal: 10,
      borderRadius: 99,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    habitChipText: { fontFamily: 'DMSans_600SemiBold', fontSize: 11 },
    chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 8 },
    column: { flex: 1, alignItems: 'center', gap: 5 },
    count: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: colors.primary },
    flameTrack: { width: '100%', alignItems: 'center' },
    weekLabel: { minHeight: 28, fontFamily: 'DMSans_500Medium', fontSize: 9, color: colors.mutedForeground, textAlign: 'center' },
    status: { minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 8 },
    statusText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.mutedForeground, textAlign: 'center' },
    retry: { fontFamily: 'DMSans_600SemiBold', color: colors.primary, fontSize: 13 },
  }), [colors]);

  return (
    <View style={styles.card} testID="dashboard-your-habits">
      <View style={styles.header}>
        <Feather name="activity" size={18} color={colors.primary} />
        <Text style={styles.title}>Your Habits</Text>
        <TouchableOpacity
          style={styles.viewAll}
          onPress={onOpenHabits}
          accessibilityRole="button"
          accessibilityLabel="Open all your habits"
          testID="dashboard-your-habits-open"
        >
          <Text style={styles.viewAllText}>View all</Text>
          <Feather name="chevron-right" size={15} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {habits.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.selector} contentContainerStyle={styles.selectorContent} accessibilityRole="tablist">
          {habits.map(habit => {
            const selected = habit.id === selectedHabit?.id;
            return (
              <TouchableOpacity
                key={habit.id}
                style={[styles.habitChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.background }]}
                onPress={() => setSelectedHabitId(habit.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${habit.name} practice history`}
                testID={`dashboard-habit-${habit.id}`}
              >
                <Text numberOfLines={1} style={[styles.habitChipText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{habit.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {habitsLoading || (!habitsError && habits.length > 0 && historyLoading) ? (
        <View style={styles.status}><ActivityIndicator color={colors.primary} /><Text style={styles.statusText}>Loading practice history</Text></View>
      ) : habitsError ? (
        <View style={styles.status}>
          <Text style={styles.statusText}>Couldn’t load your habits.</Text>
          <TouchableOpacity onPress={onOpenHabits}><Text style={styles.retry}>Open Habits</Text></TouchableOpacity>
        </View>
      ) : habits.length === 0 ? (
        <View style={styles.status}>
          <Text style={styles.statusText}>Start a habit to see your practice here.</Text>
          <TouchableOpacity onPress={onOpenHabits}><Text style={styles.retry}>Build your practice</Text></TouchableOpacity>
        </View>
      ) : historyError || historyInvalid ? (
        <View style={styles.status}>
          <Text style={styles.statusText}>Couldn’t load practice history.</Text>
          <TouchableOpacity onPress={() => { void refetchHistory(); }} accessibilityRole="button"><Text style={styles.retry}>Tap to retry</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={styles.chart} testID="dashboard-habit-weekly-chart">
          {weeklyPractice.map(week => (
            <View
              key={week.label}
              style={styles.column}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={`${week.label}: ${week.daysCompleted} completed practice days`}
              accessibilityValue={{ min: 0, max: 7, now: week.daysCompleted }}
            >
              <Text style={styles.count}>{week.daysCompleted}</Text>
              <View style={styles.flameTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <RisingPracticeFlame daysCompleted={week.daysCompleted} trackColor={colors.muted} railColor={colors.border} />
              </View>
              <Text style={styles.weekLabel}>{week.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
