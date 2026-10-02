import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBaseUrl, getListBadgesQueryKey, useGetProgress, useListBadges } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

function resolveImage(url: string) {
  return /^https?:\/\//i.test(url) ? url : `${getBaseUrl() ?? ''}${url}`;
}

export default function AccomplishmentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: badges, isLoading, isError, refetch } = useListBadges({
    query: { queryKey: getListBadgesQueryKey(), refetchOnMount: 'always', staleTime: 0 },
    request: { cache: 'no-store' },
  });
  const { data: progress, refetch: refetchProgress } = useGetProgress();
  const [refreshing, setRefreshing] = useState(false);
  const history = [...(badges ?? [])].sort((a, b) =>
    new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 : insets.top + 10, borderColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/profile')} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Accomplishments</Text>
      </View>
      <FlatList
        data={history}
        keyExtractor={(badge) => String(badge.id)}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 50 : insets.bottom + 24 }]}
        testID="accomplishments-history"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              try { await Promise.all([refetch(), refetchProgress()]); }
              finally { setRefreshing(false); }
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your earned milestones, from the first to the latest.</Text>
            <View style={[styles.summary, { backgroundColor: colors.goldWash, borderColor: colors.border }]}>
              <View style={styles.stat}>
                <Feather name="award" size={20} color={colors.gold} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{isLoading || isError ? '—' : history.length}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Earned badges</Text>
              </View>
              <View style={styles.stat}>
                <Feather name="zap" size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{progress?.longestStreak ?? '—'}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Best streak (days)</Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.badge, { backgroundColor: colors.card, borderColor: colors.border }]} testID={`earned-badge-${item.id}`}>
            <View style={[styles.badgeIcon, { backgroundColor: colors.magentaWash }]}>
              {item.imageUrl
                ? <Image source={{ uri: resolveImage(item.imageUrl) }} style={styles.image} resizeMode="contain" />
                : <Feather name="award" size={26} color={colors.primary} />}
            </View>
            <View style={styles.badgeCopy}>
              <Text style={[styles.badgeName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{item.description}</Text>
              {item.workshopTitle ? <Text style={[styles.description, { color: colors.foreground }]}>{item.workshopTitle}</Text> : null}
              <Text style={[styles.date, { color: colors.mutedForeground }]}>
                Earned {new Date(item.earnedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isLoading ? <ActivityIndicator color={colors.primary} size="large" /> : (
              <>
                <Feather name={isError ? 'wifi-off' : 'award'} size={36} color={colors.mutedForeground} />
                <Text style={[styles.badgeName, { color: colors.foreground }]}>
                  {isError ? 'Couldn’t load accomplishments' : 'Your history starts here'}
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {isError ? 'Please try again.' : 'Earned badges will stay here as your practice grows.'}
                </Text>
                {isError ? (
                  <Pressable accessibilityRole="button" onPress={() => refetch()} style={styles.retry}>
                    <Text style={[styles.badgeName, { color: colors.primary }]}>Retry</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 22 },
  content: { padding: 16, gap: 12 },
  intro: { gap: 16, marginBottom: 8 },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 20 },
  summary: { borderWidth: 1, borderRadius: 14, flexDirection: 'row', paddingVertical: 20 },
  stat: { flex: 1, alignItems: 'center', gap: 5 },
  statValue: { fontFamily: 'DMSans_700Bold', fontSize: 24 },
  statLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12 },
  badge: { flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1, borderRadius: 12 },
  badgeIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  image: { width: 36, height: 36 },
  badgeCopy: { flex: 1, gap: 5 },
  badgeName: { fontFamily: 'DMSans_600SemiBold', fontSize: 16 },
  description: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19 },
  date: { fontFamily: 'DMSans_500Medium', fontSize: 11, marginTop: 3 },
  empty: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: 'DMSans_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retry: { padding: 12 },
});