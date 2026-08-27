import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  useGetUserProfile,
  getGetUserProfileQueryKey,
  useListStudioPosts,
  getListStudioPostsQueryKey,
  useFollowUser,
  useUnfollowUser,
  useGetCurrentUser,
  getBaseUrl,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import SafetyActions from '@/components/SafetyActions';

const TIER_COLORS: Record<string, string> = {
  pro: '#a855f7',
  workshop: '#f59e0b',
  free: '#6b7280',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getBaseUrl();
  return base ? `${base}${url}` : url;
}

export default function CreatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: me } = useGetCurrentUser();

  const creatorId = id ? Number(id) : undefined;

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useGetUserProfile(creatorId as number, {
    query: { enabled: creatorId != null, queryKey: creatorId != null ? getGetUserProfileQueryKey(creatorId) : [] },
  });

  const {
    data: posts,
    isLoading: postsLoading,
  } = useListStudioPosts(
    { userId: creatorId, limit: 10 },
    {
      query: {
        enabled: creatorId != null,
        queryKey: creatorId != null
          ? getListStudioPostsQueryKey({ userId: creatorId, limit: 10 })
          : [],
      },
      request: {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      },
    }
  );
  const followMutation = useFollowUser({
    mutation: {
      onSuccess: () => {
        refetchProfile();
        queryClient.invalidateQueries({ queryKey: ['/api/studio-posts'] });
      },
    },
  });
  const unfollowMutation = useUnfollowUser({
    mutation: {
      onSuccess: () => {
        refetchProfile();
        queryClient.invalidateQueries({ queryKey: ['/api/studio-posts'] });
      },
    },
  });

  const tierColor = profile ? (TIER_COLORS[profile.tier] ?? colors.mutedForeground) : colors.mutedForeground;
  const initials = profile ? profile.username.slice(0, 2).toUpperCase() : '??';

  const points = profile?.points ?? 0;
  let phase = 'Discovering';
  let nextPhase: string | null = 'Dedicated';
  let currentThreshold = 0;
  let nextThreshold: number | null = 250;

  if (points >= 1000) {
    phase = 'Professional';
    nextPhase = null;
    currentThreshold = 1000;
    nextThreshold = null;
  } else if (points >= 250) {
    phase = 'Dedicated';
    nextPhase = 'Professional';
    currentThreshold = 250;
    nextThreshold = 1000;
  }

  const phasePercent = nextThreshold ? ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100 : 100;

  const topPad = Platform.OS === 'web' ? 16 : insets.top + 8;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header / back nav
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: topPad,
      paddingBottom: 12,
      paddingHorizontal: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    navTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 17,
      color: colors.foreground,
      flex: 1,
    },

    // Hero
    hero: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 28,
      color: colors.primary,
    },
    avatarImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    followButton: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: colors.radius,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginTop: 2,
    },
    followButtonText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
    },
    usernameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    username: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 20,
      color: colors.foreground,
    },
    tierBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: colors.muted,
      borderRadius: 4,
    },
    tierText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    bookingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.muted,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    bookingDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    bookingText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      color: colors.primary,
    },
    progressText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 6,
    },
    progressBarContainer: {
      width: 200,
      height: 4,
      backgroundColor: colors.muted,
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 12,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    profileProgress: {
      alignItems: 'center',
    },
    bio: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.foreground,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 300,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      color: colors.mutedForeground,
    },

    // Stats strip
    statsRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
      gap: 2,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.border,
      alignSelf: 'stretch',
    },
    statValue: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 18,
      color: colors.foreground,
    },
    statLabel: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    // Section
    section: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 4,
    },
    sectionTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 14,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 12,
    },

    // Badges
    badgeList: {
      gap: 8,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 20,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    badgeName: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 14,
      color: colors.foreground,
    },

    // Posts
    postCard: {
      marginBottom: 12,
      padding: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    postCaption: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
      marginBottom: 8,
    },
    postMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    postMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    postMetaText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    tag: {
      backgroundColor: colors.muted,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    tagText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      color: colors.mutedForeground,
    },
    postListPad: {
      paddingHorizontal: 20,
      paddingBottom: Platform.OS === 'web' ? 80 : 60,
    },

    // States
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingTop: 80,
    },
    stateTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 16,
      color: colors.foreground,
    },
    stateText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.mutedForeground,
    },
    emptyPosts: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyPostsText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.mutedForeground,
    },
  }), [colors, topPad]);

  const isOwnProfile = !!me && me.id === profile?.id;
  const followPending = followMutation.isPending || unfollowMutation.isPending;
  const handleFollow = () => {
    if (!profile || isOwnProfile) return;
    if (profile.followedByMe) {
      unfollowMutation.mutate({ id: profile.id });
    } else {
      followMutation.mutate({ id: profile.id });
    }
  };

  return (
    <View style={s.container}>
      {/* Nav bar */}
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.navTitle} numberOfLines={1}>
          {profile ? profile.username : 'Profile'}
        </Text>
      </View>

      {profileLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : profileError || !profile ? (
        <View style={s.centered}>
          <Feather name="user-x" size={44} color={colors.mutedForeground} />
          <Text style={s.stateTitle}>Profile not found</Text>
          <Text style={s.stateText}>This creator may no longer be available.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={s.hero}>
            <View style={s.avatar}>
                {resolveImageUrl(profile.avatarUrl) ? (
                  <Image source={{ uri: resolveImageUrl(profile.avatarUrl)! }} style={s.avatarImage} />
                ) : (
                  <Text style={s.avatarText}>{initials}</Text>
                )}
            </View>

            <View style={s.usernameRow}>
              <Text style={s.username}>{profile.username}</Text>
              <View style={s.tierBadge}>
                <Text style={[s.tierText, { color: tierColor }]}>{profile.tier}</Text>
              </View>
              {!isOwnProfile && (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`${profile.followedByMe ? 'Unfollow' : 'Follow'} ${profile.username}`}
                    accessibilityState={{ selected: profile.followedByMe, busy: followPending }}
                    disabled={followPending}
                    onPress={handleFollow}
                    style={[s.followButton, profile.followedByMe && { backgroundColor: colors.primary }]}
                    testID={`creator-follow-${profile.id}`}
                  >
                    <Text style={[s.followButtonText, { color: profile.followedByMe ? colors.primaryForeground : colors.primary }]}>
                      {profile.followedByMe ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                  <SafetyActions
                    userId={profile.id}
                    username={profile.username}
                    blockedByMe={profile.blockedByMe}
                    onBlocked={() => {
                      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(profile.id) });
                      queryClient.invalidateQueries({ queryKey: getListStudioPostsQueryKey({ userId: profile.id, limit: 10 }) });
                      refetchProfile();
                    }}
                  />
                </>
              )}
              <View style={[s.tierBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[s.tierText, { color: colors.primary }]}>{phase}</Text>
              </View>
            </View>

            <View style={s.profileProgress}>
              <View style={s.progressBarContainer}>
                <View style={[s.progressBarFill, { width: `${Math.max(0, Math.min(100, phasePercent))}%`, backgroundColor: colors.primary }]} />
              </View>
              {nextPhase ? (
                <Text style={s.progressText}>{points} / {nextThreshold} pts to {nextPhase}</Text>
              ) : (
                <Text style={s.progressText}>{points} pts</Text>
              )}
            </View>

            {profile.bookingOpen && (
              <View style={s.bookingPill}>
                <View style={s.bookingDot} />
                <Text style={s.bookingText}>Open for bookings</Text>
              </View>
            )}

            {profile.bio ? (
              <Text style={s.bio}>{profile.bio}</Text>
            ) : null}

            <View style={s.metaRow}>
              {profile.discipline ? (
                <View style={s.metaItem}>
                  <Feather name="layers" size={13} color={colors.mutedForeground} />
                  <Text style={s.metaText}>{profile.discipline}</Text>
                </View>
              ) : null}
              {profile.location ? (
                <View style={s.metaItem}>
                  <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                  <Text style={s.metaText}>{profile.location}</Text>
                </View>
              ) : null}
              {profile.portfolioUrl ? (
                <View style={s.metaItem}>
                  <Feather name="link" size={13} color={colors.mutedForeground} />
                  <Text style={s.metaText} numberOfLines={1}>Portfolio</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Stats strip */}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statValue}>{profile.postCount ?? 0}</Text>
              <Text style={s.statLabel}>Posts</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
                <Text style={s.statValue}>{profile.followerCount ?? 0}</Text>
                <Text style={s.statLabel}>Followers</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
                <Text style={s.statValue}>{profile.followingCount ?? 0}</Text>
                <Text style={s.statLabel}>Following</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
                <Text style={s.statValue}>{profile?.currentStreak ?? 0}</Text>
                <Text style={s.statLabel}>Streak</Text>
            </View>
          </View>

          {/* Badges */}
          {(profile?.recentBadges ?? []).length > 0 && (
            <>
              <View style={s.section}>
                <Text style={s.sectionTitle}>Badges</Text>
              </View>
              <View style={s.badgeList}>
                {(profile.recentBadges ?? []).map((badge, i) => (
                  <View key={i} style={s.badgeRow}>
                    <Feather name="award" size={16} color={tierColor} />
                    <Text style={s.badgeName}>{badge.name || 'Badge'}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Recent posts */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Recent Posts</Text>
          </View>

          <View style={s.postListPad}>
            {postsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : (posts ?? []).length === 0 ? (
              <View style={s.emptyPosts}>
                <Text style={s.emptyPostsText}>No studio posts yet</Text>
              </View>
            ) : (
              (posts ?? []).map((post) => (
                <View key={post.id} style={s.postCard}>
                  {post.caption ? (
                    <Text style={s.postCaption} numberOfLines={4}>{post.caption}</Text>
                  ) : null}
                  {(post.tags ?? []).length > 0 && (
                    <View style={s.tagRow}>
                      {(post.tags ?? []).map((tag, i) => (
                        <View key={i} style={s.tag}>
                          <Text style={s.tagText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={s.postMeta}>
                    <View style={s.postMetaItem}>
                      <Feather name="heart" size={12} color={colors.mutedForeground} />
                      <Text style={s.postMetaText}>{post.likes ?? 0}</Text>
                    </View>
                    <Text style={s.postMetaText}>{formatDate(post.createdAt)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
