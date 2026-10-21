import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  getBaseUrl,
  getGetUserProfileQueryKey,
  getListDirectoryQueryKey,
  getListStudioPostsQueryKey,
  useFollowUser,
  useGetUserProfile,
  useListDirectory,
  useListStudioPosts,
  type PublicCreatorProfile,
  type StudioPost,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const FEATURED_HANDLE = 'ponchotheartist';
const handle = (username: string) => username.trim().replace(/^@/, '').toLowerCase();

type Suggestion = {
  id: number;
  username: string;
  avatarUrl?: string | null;
  discipline?: string | null;
};

export default function FollowingFeedSuggestions({ currentUserId }: { currentUserId?: number }) {
  const colors = useColors();
  const router = useRouter();
  const client = useQueryClient();
  const lock = useRef(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const enabled = currentUserId != null;
  const directory = useListDirectory({
    query: { queryKey: getListDirectoryQueryKey(), enabled, staleTime: 30_000, retry: 1 },
  });
  const allPosts = useListStudioPosts(
    { followingOnly: 'false' },
    { query: { queryKey: getListStudioPostsQueryKey({ followingOnly: 'false' }), enabled, staleTime: 30_000, retry: 1 } },
  );
  const featuredCreator = directory.data?.find(creator => handle(creator.username) === FEATURED_HANDLE);
  const featured = useGetUserProfile(featuredCreator?.id ?? 0, {
    query: {
      queryKey: getGetUserProfileQueryKey(featuredCreator?.id ?? 0),
      enabled: enabled && !!featuredCreator && featuredCreator.id !== currentUserId,
      staleTime: 30_000,
      retry: 1,
    },
  });
  const follow = useFollowUser();

  const suggestions = useMemo(() => {
    const result = new Map<number, Suggestion>();
    const profile = featured.data;
    if (profile && profile.id !== currentUserId && profile.postCount > 0 && !profile.followedByMe && !profile.blockedByMe) {
      result.set(profile.id, profile);
    }
    for (const post of allPosts.data ?? []) {
      if (post.userId === currentUserId || post.followedByMe || !post.username || result.has(post.userId)) continue;
      if (profile?.id === post.userId && (profile.followedByMe || profile.blockedByMe)) continue;
      const creator = directory.data?.find(item => item.id === post.userId);
      result.set(post.userId, {
        id: post.userId,
        username: post.username,
        avatarUrl: post.userAvatarUrl,
        discipline: creator?.discipline,
      });
    }
    return [...result.values()]
      .sort((a, b) => Number(handle(b.username) === FEATURED_HANDLE) - Number(handle(a.username) === FEATURED_HANDLE))
      .slice(0, 4);
  }, [allPosts.data, directory.data, featured.data, currentUserId]);

  const followCreator = (creator: Suggestion) => {
    if (lock.current || !enabled) return;
    lock.current = true;
    setFollowError(null);
    follow.mutate({ id: creator.id }, {
      onSuccess: relationship => {
        client.setQueriesData<StudioPost[]>({ queryKey: ['/api/studio-posts'] }, posts =>
          posts?.map(post => post.userId === creator.id
            ? { ...post, followedByMe: relationship.followedByMe, followerCount: relationship.followerCount }
            : post),
        );
        client.setQueryData<PublicCreatorProfile>(getGetUserProfileQueryKey(creator.id), profile =>
          profile ? { ...profile, followedByMe: relationship.followedByMe, followerCount: relationship.followerCount } : profile,
        );
        void client.invalidateQueries({ queryKey: ['/api/studio-posts'] });
        void client.invalidateQueries({ queryKey: getGetUserProfileQueryKey(creator.id) });
        if (currentUserId != null) {
          void client.invalidateQueries({ queryKey: getGetUserProfileQueryKey(currentUserId) });
        }
      },
      onError: () => setFollowError(`Couldn't follow @${handle(creator.username)}. Please try again.`),
      onSettled: () => { lock.current = false; },
    });
  };

  const loading = !enabled || allPosts.isLoading || directory.isLoading
    || (!!featuredCreator && featuredCreator.id !== currentUserId && featured.isLoading);
  const failed = allPosts.isError || directory.isError || featured.isError;
  const retry = () => {
    void allPosts.refetch();
    void directory.refetch();
    if (featuredCreator && featuredCreator.id !== currentUserId) void featured.refetch();
  };
  const s = useMemo(() => StyleSheet.create({
    container: { padding: 20, paddingTop: 28, gap: 16, backgroundColor: colors.background },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 22, lineHeight: 28, color: colors.foreground },
    description: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.mutedForeground, marginTop: 5 },
    label: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: colors.mutedForeground, letterSpacing: 0.6 },
    list: { gap: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    featuredRow: { borderColor: colors.primary },
    identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
    avatar: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
    avatarImage: { width: 42, height: 42 },
    initials: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: colors.primary },
    info: { flex: 1, minWidth: 0 },
    username: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: colors.foreground },
    meta: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.mutedForeground, marginTop: 3 },
    follow: { minHeight: 44, minWidth: 78, paddingHorizontal: 12, borderRadius: colors.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.primary },
    followText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: colors.primaryForeground },
    retry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    retryText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: colors.primary },
  }), [colors]);

  return (
    <View style={s.container} testID="following-feed-suggestions">
      <View>
        <Text style={s.title}>Build your following feed</Text>
        <Text style={s.description}>Follow a creator to see their studio posts here.</Text>
      </View>
      {suggestions.length > 0 && (
        <>
          <Text style={s.label}>CREATORS TO FOLLOW</Text>
          <View style={s.list}>
            {suggestions.map(creator => {
              const isFeatured = handle(creator.username) === FEATURED_HANDLE;
              const avatarUrl = creator.avatarUrl
                ? (/^https?:\/\//.test(creator.avatarUrl) ? creator.avatarUrl : `${getBaseUrl() ?? ''}${creator.avatarUrl}`)
                : null;
              const busy = follow.isPending && follow.variables?.id === creator.id;
              return (
                <View key={creator.id} style={[s.row, isFeatured && s.featuredRow]} testID={`suggested-creator-${creator.id}`}>
                  <TouchableOpacity
                    style={s.identity}
                    onPress={() => router.push({
                      pathname: '/creator/[creatorId]',
                      params: { creatorId: String(creator.id) },
                    })}
                    accessibilityRole="button"
                    accessibilityLabel={`Open @${handle(creator.username)}'s studio`}
                    testID={`open-suggested-profile-${creator.id}`}
                    activeOpacity={0.75}
                  >
                    <View style={s.avatar}>
                      {avatarUrl ? <Image source={{ uri: avatarUrl }} style={s.avatarImage} /> : (
                        <Text style={s.initials}>{creator.username.slice(0, 2).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={s.info}>
                      <Text style={s.username} numberOfLines={1}>@{handle(creator.username)}</Text>
                      <Text style={s.meta} numberOfLines={1}>
                        {isFeatured ? 'Featured creator' : creator.discipline || 'Sharing studio work'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.follow, follow.isPending && !busy && { opacity: 0.6 }]}
                    disabled={follow.isPending}
                    onPress={() => followCreator(creator)}
                    accessibilityRole="button"
                    accessibilityLabel={`Follow @${handle(creator.username)}`}
                    accessibilityState={{ disabled: follow.isPending, busy }}
                    testID={`suggestion-follow-${creator.id}`}
                  >
                    {busy ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : (
                      <>
                        <Feather name="user-plus" size={14} color={colors.primaryForeground} />
                        <Text style={s.followText}>Follow</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </>
      )}
      {followError && <Text style={s.description} accessibilityRole="alert">{followError}</Text>}
      {loading && !suggestions.length && <ActivityIndicator color={colors.primary} />}
      {!loading && !suggestions.length && (
        <View>
          <Text style={s.description}>
            {failed ? 'Could not load creator suggestions.' : 'More creators will appear here as they share work.'}
          </Text>
          {failed && (
            <TouchableOpacity style={s.retry} onPress={retry} accessibilityRole="button" testID="retry-follow-suggestions">
              <Text style={s.retryText}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
