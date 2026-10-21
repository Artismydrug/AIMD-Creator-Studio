import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getListAssignmentsQueryKey, useListAssignments } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const STATUS_LABELS = {
  pending: 'Awaiting instructor review',
  reviewed: 'Instructor feedback ready',
  approved: 'Instructor approved',
  revision_requested: 'Revision requested',
};

export default function LearningPortfolioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { data: entriesResponse, isLoading, isError, isRefetching, refetch } = useListAssignments({
    query: { queryKey: getListAssignmentsQueryKey(), enabled: !!isSignedIn, staleTime: 15_000, refetchOnMount: 'always' },
  });
  const entriesInvalid = entriesResponse != null && !Array.isArray(entriesResponse);
  const entries = Array.isArray(entriesResponse) ? entriesResponse.filter(entry => entry != null && typeof entry.id === 'number') : [];
  if (!isLoaded) return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} color={colors.primary} />;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 24, paddingHorizontal: 20, paddingBottom: insets.bottom + 36, gap: 16 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.primary} />}
      testID="learning-portfolio"
    >
      <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.studioYellow, borderWidth: 1.5, borderColor: colors.ink, borderRadius: 9, transform: [{ rotate: '-2deg' }] }}>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.4, color: colors.ink }}>PRIVATE LEARNING PORTFOLIO</Text>
      </View>
      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 32, lineHeight: 36, color: colors.foreground, letterSpacing: -1 }}>Your learning, in progress.</Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.mutedForeground }}>
        Workshop reflections and practice work, linked to each lesson. This is not your public profile. Workshop instructors can review your submissions.
      </Text>
      {isLoading ? <ActivityIndicator color={colors.primary} /> : isError || entriesInvalid ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.foreground }}>Could not load your portfolio.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => void refetch()}><Text style={{ color: colors.primary }}>Retry</Text></TouchableOpacity>
        </View>
      ) : !entries?.length ? (
        <View style={{ padding: 20, gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }}>
          <Feather name="book-open" size={26} color={colors.primary} />
          <Text style={{ color: colors.foreground, fontFamily: 'DMSans_600SemiBold' }}>Your first reflection starts with a lesson.</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, lineHeight: 19 }}>Open a released workshop lesson, answer its reflection prompt, and save it here.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.replace('/(tabs)/workshops')}><Text style={{ color: colors.primary, fontFamily: 'DMSans_700Bold' }}>Explore workshops</Text></TouchableOpacity>
        </View>
      ) : entries.map((entry) => (
        <View key={entry.id} testID={`portfolio-entry-${entry.id}`} style={{ gap: 10, padding: 18, borderRadius: 21, borderWidth: 1.5, borderColor: colors.foreground, backgroundColor: colors.studioPaper, shadowColor: colors.studioShadow, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 }}>
          <Text style={{ fontSize: 11, color: colors.sunsetCoral, fontFamily: 'DMSans_700Bold' }}>{entry.submissionKind === 'lesson_reflection' ? 'LESSON REFLECTION' : 'PRACTICE WORK'}</Text>
          <Text style={{ color: colors.foreground, fontSize: 18, fontFamily: 'DMSans_700Bold' }}>{entry.moduleTitle ?? 'Workshop lesson'}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{entry.workshopTitle} · {new Date(entry.submittedAt).toLocaleDateString()}</Text>
          {!!entry.reflectionPrompt && <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19, fontFamily: 'DMSans_600SemiBold' }}>{entry.reflectionPrompt}</Text>}
          {!!entry.submissionNote && <Text selectable style={{ color: colors.foreground, fontSize: 14, lineHeight: 21 }}>{entry.submissionNote}</Text>}
          {!!entry.submissionUrl && <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Practice clip submitted with this work.</Text>}
          <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>{STATUS_LABELS[entry.status]}</Text>
          {!!entry.feedback && <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 }}>
            <Text style={{ color: colors.foreground, fontFamily: 'DMSans_700Bold', fontSize: 12 }}>Instructor feedback</Text>
            <Text selectable style={{ color: colors.foreground, fontSize: 14, lineHeight: 21 }}>{entry.feedback}</Text>
          </View>}
        </View>
      ))}
    </ScrollView>
  );
}
