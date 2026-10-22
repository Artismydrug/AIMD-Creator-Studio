import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGetCurrentChallenge } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

export default function HabitChallengeCard() {
  const colors = useColors();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useGetCurrentChallenge();
  const challenge = data?.challenge;

  const s = useMemo(() => StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginTop: 14,
      padding: 18,
      gap: 12,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioYellow,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mark: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioOrange,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-5deg' }],
    },
    title: { flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 17, color: colors.studioInk },
    status: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 99,
      backgroundColor: colors.studioPaper,
      borderWidth: 1,
      borderColor: colors.studioInk,
    },
    statusText: { fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.6, color: colors.studioInk },
    theme: { fontFamily: 'DMSans_700Bold', fontSize: 20, lineHeight: 25, color: colors.studioInk },
    prompt: { fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 19, color: colors.studioInk },
    empty: { minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 7 },
    emptyText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.studioInk, textAlign: 'center' },
    action: {
      minHeight: 46,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    actionText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: colors.studioInk },
  }), [colors]);

  return (
    <View style={s.card} testID="habits-active-challenges-card">
      <View style={s.header}>
        <View style={s.mark}><Feather name="award" size={18} color={colors.studioInk} /></View>
        <Text style={s.title} accessibilityRole="header">Active Challenges</Text>
        {challenge ? (
          <View style={s.status}>
            <Text style={s.statusText}>
              {challenge.status === 'upcoming' ? 'COMING NEXT' : challenge.status === 'active' ? 'OPEN NOW' : 'CLOSED'}
            </Text>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View style={s.empty}><ActivityIndicator color={colors.studioInk} /></View>
      ) : isError ? (
        <>
          <Text style={s.emptyText}>Challenges couldn’t load.</Text>
          <TouchableOpacity style={s.action} onPress={() => { void refetch(); }} accessibilityRole="button" testID="habits-challenges-retry">
            <Text style={s.actionText}>Try again</Text>
          </TouchableOpacity>
        </>
      ) : challenge ? (
        <>
          <Text style={s.theme}>{challenge.theme}</Text>
          <Text style={s.prompt} numberOfLines={2}>{challenge.prompt}</Text>
          <TouchableOpacity
            style={s.action}
            onPress={() => router.push('/challenges')}
            accessibilityRole="button"
            accessibilityLabel="Open active challenge"
            testID="habits-open-challenges"
          >
            <Text style={s.actionText}>View challenge</Text>
            <Feather name="arrow-up-right" size={16} color={colors.studioInk} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={s.emptyText}>No active challenge right now.</Text>
          <TouchableOpacity
            style={s.action}
            onPress={() => router.push('/challenges')}
            accessibilityRole="button"
            accessibilityLabel="Explore challenges"
            testID="habits-open-challenges"
          >
            <Text style={s.actionText}>Explore challenges</Text>
            <Feather name="arrow-up-right" size={16} color={colors.studioInk} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
