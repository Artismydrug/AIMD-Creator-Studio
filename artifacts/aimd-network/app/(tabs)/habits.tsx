import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getListHabitLogsQueryKey,
  useListHabits,
  useListHabitLogs,
  useCreateHabit,
  useGetDashboardSummary,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import HabitCard from '@/components/HabitCard';

const CATEGORIES = ['Drawing', 'Painting', 'Sculpture', 'Photography', 'Music', 'Writing', 'Other'];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function HabitsScreen({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [category, setCategory] = useState('Drawing');
  const [targetMinutes, setTargetMinutes] = useState('30');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: habitsResponse, isLoading, isError, refetch } = useListHabits();
  const { data: summary, refetch: refetchSummary } = useGetDashboardSummary();
  const habits = habitsResponse?.habits ?? [];
  const selectedHabit = habits.find((habit) => habit.id === selectedHabitId) ?? habits[0];
  const historyParams = { habitId: selectedHabit?.id ?? 0, days: 27 };
  const {
    data: historyLogs,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useListHabitLogs(
    historyParams,
    { query: { enabled: Boolean(selectedHabit), queryKey: getListHabitLogsQueryKey(historyParams) } },
  );
  const weeklyPractice = useMemo(() => {
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const completedDates = (historyLogs ?? [])
      .filter((log) => log.completed)
      .map((log) => log.date.slice(0, 10));

    return Array.from({ length: 4 }, (_, weeksAgo) => {
      const end = new Date(todayUtc - weeksAgo * SEVEN_DAYS_MS);
      const start = new Date(todayUtc - (weeksAgo * 7 + 6) * 24 * 60 * 60 * 1000);
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);
      const daysCompleted = new Set(
        completedDates.filter((date) => date >= startDate && date <= endDate),
      ).size;

      return {
        label: ['Past 7 days', 'Previous 7 days', '2 weeks ago', '3 weeks ago'][weeksAgo],
        daysCompleted,
      };
    });
  }, [historyLogs]);

  const createMutation = useCreateHabit({
    mutation: {
      onSuccess: () => {
        refetch();
        setAdding(false);
        setHabitName('');
        setCategory('Drawing');
        setTargetMinutes('30');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchHistory(), refetchSummary()]);
    setRefreshing(false);
  }, [refetch, refetchHistory, refetchSummary]);

  const handleHabitLogged = useCallback(() => {
    void refetch();
    void refetchSummary();
    void queryClient.invalidateQueries({ queryKey: getListHabitLogsQueryKey() });
  }, [queryClient, refetch, refetchSummary]);

  const handleCreate = () => {
    if (!habitName.trim()) return;
    const mins = parseInt(targetMinutes, 10);
    if (isNaN(mins) || mins < 1) return;
    createMutation.mutate({
      data: {
        name: habitName.trim(),
        category: category.toLowerCase(),
        targetMinutes: mins,
      },
    });
  };

  const topPad = embedded ? 16 : Platform.OS === 'web' ? 67 : insets.top + 8;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 26,
      color: colors.foreground,
      letterSpacing: -0.6,
    },
    addBtn: {
      width: 36,
      height: 36,
      backgroundColor: colors.ink,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tagline: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
      color: colors.sunsetCoral,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.card,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      overflow: 'hidden',
    },
    statNumber: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 22,
      color: colors.primary,
    },
    statLabel: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    progressPanel: {
      marginHorizontal: 16,
      marginBottom: 4,
      padding: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      gap: 10,
    },
    progressHeading: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      color: colors.foreground,
    },
    progressSubtitle: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 17,
    },
    habitSelector: { flexGrow: 0, marginHorizontal: -4 },
    habitSelectorContent: { paddingHorizontal: 4, gap: 7, alignItems: 'center' },
    habitChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: colors.radius,
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    habitChipText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      color: colors.mutedForeground,
      maxWidth: 150,
    },
    chart: {
      height: 128,
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'space-around',
      gap: 8,
      paddingTop: 8,
    },
    chartColumn: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
    chartValue: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 12,
      color: colors.foreground,
    },
    chartBarTrack: {
      height: 78,
      width: '100%',
      maxWidth: 38,
      justifyContent: 'flex-end',
      overflow: 'hidden',
      borderRadius: 7,
      backgroundColor: colors.muted,
    },
    chartBar: { width: '100%', borderRadius: 7, minHeight: 2 },
    chartLabel: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 9,
      lineHeight: 11,
      textAlign: 'center',
      color: colors.mutedForeground,
    },
    comparisonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    comparisonText: {
      flex: 1,
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      lineHeight: 17,
      color: colors.mutedForeground,
    },
    historyEmptyText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      lineHeight: 17,
      color: colors.mutedForeground,
    },
    listContent: {
      paddingTop: 12,
      paddingBottom: Platform.OS === 'web' ? 100 : 100,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 16,
      color: colors.foreground,
    },
    emptyText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.mutedForeground,
    },
    retryBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    retryText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 14,
      color: colors.foreground,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    sectionTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.75)',
    },
    sheet: {
      backgroundColor: colors.card,
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 24,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    sheetTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 16,
      color: colors.foreground,
    },
    createBtn: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
      color: colors.primary,
    },
    label: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 13,
      color: colors.mutedForeground,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.input,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
    },
    minutesInput: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.input,
      paddingHorizontal: 12,
      paddingVertical: 10,
      width: 80,
    },
    categoryScroll: { marginBottom: 16 },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderWidth: 1,
      marginRight: 8,
    },
    categoryChipText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 13,
    },
  }), [colors, insets, topPad]);

  const todayCount = habits?.filter((h) => h.completedToday).length ?? 0;
  const totalCount = habits?.length ?? 0;
  const weeklyChange = weeklyPractice[0].daysCompleted - weeklyPractice[1].daysCompleted;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Habits</Text>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => {
              setAdding(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            testID="add-habit-button"
            accessibilityLabel="Add habit"
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
        <Text style={s.tagline}>Discipline Eats Talent</Text>
        <View style={s.statsRow}>
          <View style={s.statBox} testID="habits-streak-stat">
            <Text style={s.statNumber}>{summary?.currentStreakDays ?? 0}</Text>
            <Text style={s.statLabel}>Day Streak</Text>
          </View>
          <View style={s.statBox} testID="habits-today-stat">
            <Text style={s.statNumber}>{todayCount}/{totalCount}</Text>
            <Text style={s.statLabel}>Done Today</Text>
          </View>
          <View style={s.statBox} testID="habits-rate-stat">
            <Text style={s.statNumber}>{Math.round(summary?.completionRate ?? 0)}%</Text>
            <Text style={s.statLabel}>Rate</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={s.centered}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>Failed to load habits</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
              <HabitCard habit={item} onLogged={handleHabitLogged} onDeleted={refetch} />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            habits && habits.length > 0 ? (
              <View>
                <View style={s.progressPanel} testID="habit-weekly-progress">
                  <View>
                    <Text style={s.progressHeading}>Practice over time</Text>
      <Text style={s.progressSubtitle}>Completed practice days for this habit across four rolling weeks.</Text>
                  </View>

                  {habits.length > 1 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={s.habitSelector}
                      contentContainerStyle={s.habitSelectorContent}
                      accessibilityRole="tablist"
                    >
                      {habits.map((habit) => {
                        const isSelected = selectedHabit?.id === habit.id;
                        return (
                          <TouchableOpacity
                            key={habit.id}
                            onPress={() => setSelectedHabitId(habit.id)}
                            style={[
                              s.habitChip,
                              isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ]}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={`${habit.name} practice history`}
                            testID={`habit-trend-${habit.id}`}
                          >
                            <Text
                              numberOfLines={1}
                              style={[s.habitChipText, isSelected && { color: colors.primaryForeground }]}
                            >
                              {habit.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {historyLoading ? (
                    <ActivityIndicator color={colors.primary} accessibilityLabel="Loading practice history" />
                  ) : historyError ? (
                    <TouchableOpacity onPress={() => { void refetchHistory(); }} accessibilityRole="button">
                      <Text style={s.historyEmptyText}>Couldn’t load history. Tap to retry.</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <View style={s.chart} testID="habit-weekly-chart">
                        {weeklyPractice.map((week, index) => {
                          const barHeight = week.daysCompleted === 0 ? 0 : Math.max(6, (week.daysCompleted / 7) * 78);
                          return (
                            <View
                              key={week.label}
                              style={s.chartColumn}
                              accessible
                              accessibilityRole="progressbar"
                            accessibilityLabel={`${week.label}: ${week.daysCompleted} completed practice days`}
                              accessibilityValue={{ min: 0, max: 7, now: week.daysCompleted }}
                            >
                              <Text style={s.chartValue}>{week.daysCompleted}</Text>
                              <View style={s.chartBarTrack}>
                                <View
                                  style={[
                                    s.chartBar,
                                    {
                                      height: barHeight,
                                      backgroundColor: index === 0 ? colors.primary : colors.cyan,
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={s.chartLabel}>{week.label}</Text>
                            </View>
                          );
                        })}
                      </View>
                      {historyLogs?.some((log) => log.completed) ? (
                        <View style={s.comparisonRow} accessibilityLiveRegion="polite">
                          <Feather
                            name={weeklyChange > 0 ? 'trending-up' : weeklyChange < 0 ? 'trending-down' : 'minus'}
                            size={15}
                            color={weeklyChange > 0 ? colors.primary : colors.mutedForeground}
                          />
                          <Text style={s.comparisonText}>
                            {weeklyChange === 0
                              ? 'Same number of target days as the previous 7 days.'
                              : `${Math.abs(weeklyChange)} ${Math.abs(weeklyChange) === 1 ? 'day' : 'days'} ${weeklyChange > 0 ? 'more' : 'fewer'} than the previous 7 days.`}
                          </Text>
                        </View>
                      ) : (
                        <Text style={s.historyEmptyText}>
                        No days marked complete in this four-week view yet.
                        </Text>
                      )}
                    </>
                  )}
                </View>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>Today's Practice</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <Feather name="activity" size={48} color={colors.muted} />
              <Text style={s.emptyTitle}>No habits yet</Text>
              <Text style={s.emptyText}>Build your creative practice</Text>
            </View>
          }
        />
      )}

      <Modal visible={adding} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <TouchableOpacity onPress={() => setAdding(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
              <Text style={s.sheetTitle}>New Habit</Text>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!habitName.trim() || createMutation.isPending}
              >
                <Text style={[s.createBtn, { opacity: habitName.trim() ? 1 : 0.35 }]}>
                  {createMutation.isPending ? '...' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              value={habitName}
              onChangeText={setHabitName}
              placeholder="e.g. Figure drawing"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />

            <Text style={s.label}>Discipline</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.categoryScroll}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    s.categoryChip,
                    {
                      borderColor: category === cat ? colors.primary : colors.border,
                      backgroundColor: category === cat ? colors.primary : 'transparent',
                    },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      s.categoryChipText,
                      { color: category === cat ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.label}>Daily Target (minutes)</Text>
            <TextInput
              style={s.minutesInput}
              value={targetMinutes}
              onChangeText={setTargetMinutes}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
