import React, { useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { mainHeaderTopPadding } from '@/lib/safeArea';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getGetPracticeMilestonesQueryKey,
  getListHabitLogsQueryKey,
  useListHabits,
  useCreateHabit,
  useGetDashboardSummary,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import HabitCard, { HABIT_ACTION_HELP } from '@/components/HabitCard';
import HabitPracticeSummaryCard from '@/components/HabitPracticeSummaryCard';
import HabitChallengeCard from '@/components/HabitChallengeCard';

const CATEGORIES = ['Drawing', 'Painting', 'Sculpture', 'Photography', 'Music', 'Writing', 'Other'];

export default function HabitsScreen({ embedded = false, scrollHeader }: {
  embedded?: boolean;
  scrollHeader?: ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [category, setCategory] = useState('Drawing');
  const [targetMinutes, setTargetMinutes] = useState('30');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: habitsResponse, isLoading, isError, refetch } = useListHabits();
  const { data: summary, refetch: refetchSummary } = useGetDashboardSummary();
   const habitsInvalid = habitsResponse != null && !Array.isArray(habitsResponse.habits);
   const habits = Array.isArray(habitsResponse?.habits) ? habitsResponse.habits.filter(habit => habit != null && typeof habit.id === 'number') : [];
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
      onError: () => Alert.alert('Habit not saved', 'Your draft is still here. Check your connection and try again.'),
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchSummary(), queryClient.invalidateQueries({ queryKey: getGetPracticeMilestonesQueryKey() })]);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, refetch, refetchSummary]);

  const handleHabitLogged = useCallback(() => {
    void refetch();
    void refetchSummary();
    void queryClient.invalidateQueries({ queryKey: getListHabitLogsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetPracticeMilestonesQueryKey() });
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

  const topPad = embedded ? 8 : mainHeaderTopPadding(insets.top, Platform.OS === 'web');

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad,
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.studioPaper,
      borderBottomWidth: 2,
      borderBottomColor: colors.studioInk,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    addBtn: {
      width: 46,
      height: 46,
      backgroundColor: colors.studioOrange,
      borderWidth: 2,
      borderColor: colors.ink,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    tagline: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
      color: colors.sunsetCoral,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    actionHelp: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      lineHeight: 17,
      color: colors.mutedForeground,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.studioPaper,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      borderRadius: 17,
      overflow: 'hidden',
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
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
    milestoneWrap: { marginHorizontal: 16, marginTop: 24, marginBottom: 4 },
    listContent: {
      paddingTop: embedded ? 0 : 12,
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 13,
    },
    sectionMark: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.studioOrange,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      transform: [{ rotate: '-5deg' }],
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    sectionTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 20,
      color: colors.studioInk,
      letterSpacing: -0.4,
    },
    sectionHint: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 11,
      color: colors.studioMuted,
    },
    todaySticker: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 11,
      backgroundColor: colors.studioYellow,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      transform: [{ rotate: '3deg' }],
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    todayStickerText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 9,
      color: colors.studioInk,
      letterSpacing: 0.5,
    },
    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
    sheet: {
      backgroundColor: colors.card,
      maxHeight: '92%',
      paddingTop: 12,
      paddingHorizontal: 18,
      paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 18,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderWidth: 1.5,
      borderBottomWidth: 0,
      borderColor: colors.studioInk,
    },
    sheetHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    sheetMark: { width: 40, height: 40, borderRadius: 13, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioMint, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
    sheetTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: colors.foreground },
    sheetHint: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.mutedForeground, marginTop: 1 },
    label: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: colors.foreground, marginTop: 14, marginBottom: 8 },
    input: {
      fontFamily: 'DMSans_400Regular', fontSize: 16, color: colors.foreground, backgroundColor: colors.input,
      minHeight: 48, paddingHorizontal: 16, borderRadius: 99, borderWidth: 1.5, borderColor: colors.border,
    },
    categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryChip: {
      minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 99,
      borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    },
    categoryChipText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
    minutesRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    minutesInput: {
      fontFamily: 'DMSans_700Bold', fontSize: 16, color: colors.foreground, backgroundColor: colors.input,
      minHeight: 48, width: 84, textAlign: 'center', borderRadius: 99, borderWidth: 1.5, borderColor: colors.border,
    },
    minutesSuffix: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.mutedForeground },
    sheetFooter: { flexDirection: 'row', gap: 10, paddingTop: 18 },
    sheetButton: {
      flex: 1, minHeight: 48, borderRadius: 99, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.card,
    },
    sheetPrimary: { flex: 1.6, backgroundColor: colors.primary },
    sheetButtonText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: colors.foreground },
  }), [colors, insets, topPad]);

  const todayCount = habits?.filter((h) => h.completedToday).length ?? 0;
  const totalCount = habits?.length ?? 0;

  return (
    <View style={s.container}>
      <FlatList
          data={isLoading || isError || habitsInvalid ? [] : habits}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
              <HabitCard habit={item} onLogged={handleHabitLogged} onDeleted={refetch} stickerJam />
          )}
          contentContainerStyle={s.listContent}
          testID="habits-scroll-list"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View>
              {scrollHeader}
              <View style={s.header} testID="habits-scroll-header">
                <View style={s.headerRow}>
                  <Text style={s.tagline}>Discipline Eats Talent</Text>
                  <TouchableOpacity
                    style={s.addBtn}
                    onPress={() => {
                      setAdding(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                    testID="add-habit-button"
                    accessibilityLabel="Add habit"
                  >
                    <Feather name="plus" size={20} color={colors.ink} />
                  </TouchableOpacity>
                </View>
                <Text style={s.actionHelp} testID="habit-actions-help">{HABIT_ACTION_HELP}</Text>
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
              {!isError && !habitsInvalid && habits.length > 0 ? <View>
                <View style={s.sectionHeader} testID="today-habit-header">
                  <View style={s.sectionMark}>
                    <Feather name="check-circle" size={17} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.sectionTitle} accessibilityRole="header" testID="today-habit-heading">Today's Habit</Text>
                    <Text style={s.sectionHint}>Small reps. Keep your rhythm.</Text>
                  </View>
                  <View style={s.todaySticker}><Text style={s.todayStickerText}>TODAY</Text></View>
                </View>
              </View> : null}
            </View>
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={s.centered}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : isError || habitsInvalid ? (
              <View style={s.centered}>
                <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
                <Text style={s.emptyTitle}>Failed to load habits</Text>
                <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
                  <Text style={s.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.centered}>
                <Feather name="activity" size={48} color={colors.muted} />
                <Text style={s.emptyTitle}>No habits yet</Text>
                <Text style={s.emptyText}>Build your creative practice</Text>
              </View>
            )
          }
          ListFooterComponent={
            !isError && !habitsInvalid ? (
              <View style={s.milestoneWrap}>
                <HabitPracticeSummaryCard embedded onOpenHabits={() => undefined} />
                <HabitChallengeCard />
              </View>
            ) : null
          }
        />

      <Modal visible={adding} animationType="slide" transparent onRequestClose={() => setAdding(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <View style={s.sheetMark}><Feather name="zap" size={18} color={colors.ink} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.sheetTitle} accessibilityRole="header">New habit</Text>
                <Text style={s.sheetHint} numberOfLines={1}>Small daily reps. Big creative range.</Text>
              </View>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
              <Text style={s.label}>Name</Text>
              <TextInput
                style={s.input}
                value={habitName}
                onChangeText={setHabitName}
                placeholder="e.g. Figure drawing"
                placeholderTextColor={colors.mutedForeground}
                accessibilityLabel="Habit name"
                returnKeyType="next"
                testID="habit-name-input"
                autoFocus
              />

              <Text style={s.label}>Discipline</Text>
              <View style={s.categoryWrap} accessibilityRole="radiogroup">
                {CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[s.categoryChip, active && { backgroundColor: colors.studioYellow, borderColor: colors.studioInk }]}
                      onPress={() => setCategory(cat)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[s.categoryChipText, { color: active ? colors.ink : colors.foreground }]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.label}>Daily target</Text>
              <View style={s.minutesRow}>
                <TextInput
                  style={s.minutesInput}
                  value={targetMinutes}
                  onChangeText={setTargetMinutes}
                  keyboardType="numeric"
                  maxLength={3}
                  accessibilityLabel="Daily target in minutes"
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                />
                <Text style={s.minutesSuffix}>minutes a day</Text>
              </View>
            </ScrollView>
            <View style={s.sheetFooter}>
              <TouchableOpacity style={s.sheetButton} onPress={() => setAdding(false)}
                accessibilityRole="button" testID="habit-cancel">
                <Text style={s.sheetButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sheetButton, s.sheetPrimary, { opacity: habitName.trim() && !createMutation.isPending ? 1 : 0.5 }]}
                onPress={handleCreate}
                disabled={!habitName.trim() || createMutation.isPending}
                accessibilityRole="button"
                accessibilityState={{ disabled: !habitName.trim() || createMutation.isPending }}
                testID="habit-create"
              >
                {createMutation.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Text style={[s.sheetButtonText, { color: colors.primaryForeground }]}>Add habit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
