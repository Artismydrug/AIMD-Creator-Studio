import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  getGetPracticeMilestonesQueryKey,
  useGetPracticeMilestones,
  type PracticeMilestoneWeek,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const WEEK_GOAL = 5;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDay(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d) ? { y, m: m - 1, d } : null;
}

function formatRange(start: string, end: string) {
  const a = parseDay(start);
  const b = parseDay(end);
  if (!a || !b) return '';
  if (a.m === b.m && a.y === b.y) return `${MONTHS[a.m]} ${a.d}–${b.d}`;
  return `${MONTHS[a.m]} ${a.d} – ${MONTHS[b.m]} ${b.d}`;
}

const clampDays = (days: number) => Math.max(0, Math.min(WEEK_GOAL, Number.isFinite(days) ? Math.floor(days) : 0));

export default function HabitPracticeSummaryCard({ onOpenHabits, embedded = false }: {
  onOpenHabits: () => void;
  embedded?: boolean;
}) {
  const colors = useColors();
  const { data, isLoading, isError, refetch, isRefetching } = useGetPracticeMilestones({
    query: {
      queryKey: getGetPracticeMilestonesQueryKey(),
      refetchOnMount: 'always',
      staleTime: 30_000,
    },
  });

  useFocusEffect(useCallback(() => {
    void refetch({ cancelRefetch: false });
  }, [refetch]));

  const weeks: PracticeMilestoneWeek[] = useMemo(
    () => (Array.isArray(data?.weeks) ? data.weeks.filter(w => w && typeof w.start === 'string').slice(0, 4) : []),
    [data],
  );
  const invalid = data != null && (!Array.isArray(data.weeks) || typeof data.cycleStart !== 'string');
  const anyPractice = weeks.some(w => w.days > 0);
  const weeklyBonus = data?.weeklyBonus ?? 50;
  const monthlyBonus = data?.monthlyBonus ?? 200;

  const s = useMemo(() => StyleSheet.create({
    card: {
      marginHorizontal: embedded ? 0 : 16,
      marginTop: embedded ? 0 : 16,
      padding: 18,
      backgroundColor: colors.studioInk,
      borderColor: colors.studioViolet,
      borderWidth: 2,
      borderRadius: 28,
      gap: 14,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 5, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 4,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.studioYellow, borderWidth: 1.5, borderColor: colors.studioPaper, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
    titleCopy: { flex: 1, minWidth: 0 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 19, color: colors.studioPaper, letterSpacing: -0.4 },
    range: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.studioPaper, marginTop: 1 },
    viewAll: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 10, borderWidth: 1.5, borderColor: colors.studioViolet, borderRadius: 13, backgroundColor: colors.studioPaper },
    viewAllText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: colors.studioVioletText },
    rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    reward: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, borderWidth: 1.5, borderColor: colors.studioInk },
    rewardText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: colors.ink },
    rewardSub: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.ink },
    monthlyRewardText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: colors.studioInk },
    monthlyRewardSub: { fontFamily: 'DMSans_600SemiBold', fontSize: 11, color: colors.studioInk },
    weeks: { flexDirection: 'row', gap: 6 },
    week: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1.5, borderColor: colors.studioLine, backgroundColor: colors.studioPaperAlt },
    weekCurrent: { borderColor: colors.ink, backgroundColor: colors.studioYellow },
    weekLabel: { fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.studioInk },
    dots: { flexDirection: 'row', gap: 4 },
    dot: { width: 8, height: 8, borderRadius: 99, borderWidth: 1, borderColor: colors.studioLine, backgroundColor: 'transparent' },
    dotOn: { backgroundColor: colors.studioViolet, borderColor: colors.studioViolet },
    weekCount: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: colors.studioInk },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 17, color: colors.studioPaper },
    status: { minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: 8 },
    statusText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.studioPaper, textAlign: 'center' },
    statusBtn: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 99, borderWidth: 1.5, borderColor: colors.studioViolet, backgroundColor: colors.studioPaper },
    statusBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: colors.studioVioletText },
    skeleton: { flex: 1, height: 74, borderRadius: 14, backgroundColor: colors.studioPaperAlt, borderWidth: 1.5, borderColor: colors.studioPaper },
  }), [colors, embedded]);

  const currentDays = clampDays(data?.currentWeekDays ?? 0);
  const completedWeeks = Math.max(0, Math.min(4, data?.completedWeeks ?? 0));

  return (
    <View style={s.card} testID="dashboard-your-habits">
      <View style={s.header}>
        <View style={s.headerMark}><Feather name="zap" size={17} color={colors.ink} /></View>
        <View style={s.titleCopy}>
          <Text style={s.title} accessibilityRole="header">Monthly Streak</Text>
          {data && !invalid ? <Text style={s.range} numberOfLines={1}>{formatRange(data.cycleStart, data.cycleEnd)}</Text> : null}
        </View>
        {!embedded && <TouchableOpacity
          style={s.viewAll}
          onPress={onOpenHabits}
          accessibilityRole="button"
          accessibilityLabel="Open all your habits"
          testID="dashboard-your-habits-open"
        >
          <Text style={s.viewAllText}>Habits</Text>
          <Feather name="chevron-right" size={15} color={colors.studioViolet} />
        </TouchableOpacity>}
      </View>

      <View style={s.rewards}>
        <View style={[s.reward, { backgroundColor: colors.studioMint }]} accessibilityLabel={`${weeklyBonus} points for 5 practice days in a week`}>
          <Text style={s.rewardText}>+{weeklyBonus}</Text><Text style={s.rewardSub}>5 days / week</Text>
        </View>
        <View style={[s.reward, { backgroundColor: colors.studioLavender }]} accessibilityLabel={`${monthlyBonus} points for completing all 4 weeks`}>
          <Text style={s.monthlyRewardText}>+{monthlyBonus}</Text><Text style={s.monthlyRewardSub}>all 4 weeks</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={s.weeks} accessibilityLabel="Loading monthly streak">
          {[0, 1, 2, 3].map(i => <View key={i} style={s.skeleton} />)}
        </View>
      ) : isError || invalid || !data ? (
        <View style={s.status}>
          <Text style={s.statusText}>Couldn’t load your streak.</Text>
          <TouchableOpacity style={s.statusBtn} onPress={() => { void refetch(); }} disabled={isRefetching} accessibilityRole="button" testID="monthly-streak-retry">
            {isRefetching ? <ActivityIndicator color={colors.studioViolet} /> : <Text style={s.statusBtnText}>Try again</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={s.weeks} testID="dashboard-habit-weekly-chart">
            {weeks.map((week, index) => {
              const days = clampDays(week.days);
              return (
                <View
                  key={week.start}
                  style={[s.week, week.current && s.weekCurrent]}
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={`Week ${index + 1}${week.current ? ', this week' : ''}: ${days} of ${WEEK_GOAL} days${week.completed ? ', complete' : ''}`}
                  accessibilityValue={{ min: 0, max: WEEK_GOAL, now: days }}
                >
                  <Text style={[s.weekLabel, week.current && { color: colors.ink }]}>{week.current ? 'Now' : `Wk ${index + 1}`}</Text>
                  <View style={s.dots}>
                    {Array.from({ length: WEEK_GOAL }, (_, i) => (
                      <View key={i} style={[s.dot, i < days && s.dotOn]} />
                    ))}
                  </View>
                  {week.completed
                    ? <Feather name="check-circle" size={15} color={week.current ? colors.ink : colors.studioOrangeText} />
                    : <Text style={[s.weekCount, week.current && { color: colors.ink }]}>{days}/{WEEK_GOAL}</Text>}
                </View>
              );
            })}
          </View>
          <View style={s.footer} accessibilityLiveRegion="polite">
            <Feather name={anyPractice ? 'trending-up' : 'feather'} size={14} color={colors.studioPaper} />
            <Text style={s.footerText}>
              {anyPractice
                ? `${currentDays}/${WEEK_GOAL} days this week · ${completedWeeks}/4 weeks done`
                : 'Log any habit on 5 days to fill a week.'}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
