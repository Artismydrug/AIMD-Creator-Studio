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
  useListHabits,
  useCreateHabit,
  useGetDashboardSummary,
} from '@workspace/api-client-react';
import HabitCard from '@/components/HabitCard';

const CATEGORIES = ['Drawing', 'Painting', 'Sculpture', 'Photography', 'Music', 'Writing', 'Other'];

export default function HabitsScreen({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [category, setCategory] = useState('Drawing');
  const [targetMinutes, setTargetMinutes] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  const { data: habitsResponse, isLoading, isError, refetch } = useListHabits();
  const { data: summary } = useGetDashboardSummary();
  const habits = habitsResponse?.habits ?? [];

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
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 22,
      color: colors.foreground,
    },
    addBtn: {
      width: 36,
      height: 36,
      backgroundColor: colors.primary,
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
            <HabitCard habit={item} onLogged={refetch} />
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
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Today's Practice</Text>
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
