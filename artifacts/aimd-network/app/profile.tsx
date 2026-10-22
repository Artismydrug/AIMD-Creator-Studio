import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import {
  type StudioPost,
  getGetUserProfileQueryKey,
  getListStudioPostsQueryKey,
  useGetCurrentUser,
  useGetNotifications,
  getGetNotificationsQueryKey,
  useGetUserProfile,
  useListStudioPosts,
  useUpdatePortfolioCategories,
  useUpdateStudioPostCategory,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { LAUNCH_FEATURES } from '@/lib/launchFeatures';
import CreatorPortfolioView, { type CreatorPortfolioProfile } from '@/components/CreatorPortfolioView';

export default function ProfileScreen({ asTab = false }: { asTab?: boolean } = {}) {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isFocused, setIsFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setIsFocused(true);
    return () => setIsFocused(false);
  }, []));
  const { data: notifications } = useGetNotifications({
    query: { queryKey: getGetNotificationsQueryKey(), enabled: isFocused, refetchInterval: isFocused ? 15_000 : false },
  });
  const { data: me, isLoading: meLoading, isError: meError, refetch: refetchMe } = useGetCurrentUser();
  const { data: socialProfile } = useGetUserProfile(me?.id ?? 0, {
    query: { enabled: !!me, queryKey: me ? getGetUserProfileQueryKey(me.id) : [] },
  });
  const {
    data: posts,
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts,
  } = useListStudioPosts(
    { userId: me?.id, limit: 100 },
    { query: {
      enabled: !!me,
      queryKey: me ? getListStudioPostsQueryKey({ userId: me.id, limit: 100 }) : [],
    } },
  );
  const updateCategories = useUpdatePortfolioCategories();
  const updatePostCategory = useUpdateStudioPostCategory();

  const stateStyles = StyleSheet.create({
    screen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 13, backgroundColor: colors.studioBackground },
    title: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 18, textAlign: 'center' },
    button: { minHeight: 44, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioYellow, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    buttonText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  });

  if (meLoading) {
    return (
      <View style={stateStyles.screen} accessibilityLabel="Loading Your Studio">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.primary} />
        <Text style={stateStyles.title}>Opening your studio…</Text>
      </View>
    );
  }

  if (meError || !me) {
    return (
      <View style={stateStyles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Feather name="user-x" size={38} color={colors.studioMuted} />
        <Text style={stateStyles.title}>Couldn’t load Your Studio</Text>
        <Pressable accessibilityRole="button" onPress={() => void refetchMe()} style={stateStyles.button}>
          <Feather name="refresh-cw" size={15} color={colors.studioInk} />
          <Text style={stateStyles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const creator: CreatorPortfolioProfile = {
    id: me.id,
    username: me.username,
    avatarUrl: me.avatarUrl,
    bio: me.bio,
    discipline: me.discipline,
    location: me.location,
    portfolioUrl: me.portfolioUrl,
    instagramUrl: me.instagramUrl,
    tiktokUrl: me.tiktokUrl,
    profileAccentColor: me.profileAccentColor,
    bookingOpen: me.bookingOpen,
    followerCount: socialProfile?.followerCount ?? 0,
    followingCount: socialProfile?.followingCount ?? 0,
    followedByMe: false,
    postCount: socialProfile?.postCount ?? posts?.length ?? 0,
    ...(socialProfile ? { portfolioCategories: socialProfile.portfolioCategories } : {}),
  };
  const inquiryAvailable = !!me.bookingOpen;
  const onOpenInquiry = () => {
    if (!me.bookingOpen) return;
    router.push({
      pathname: '/commission-inquiry',
      params: { creatorId: me.id, creatorName: me.username },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <CreatorPortfolioView
        creator={creator}
        posts={posts ?? []}
        isOwner
        currentUserId={me.id}
        isLoading={postsLoading}
        isError={postsError}
        onRetry={() => void refetchPosts()}
        onEdit={() => router.push('/edit-profile')}
        hideBack={asTab && !LAUNCH_FEATURES.dashboard}
        onDashboard={asTab && LAUNCH_FEATURES.dashboard ? () => router.push('/(tabs)/dashboard') : undefined}
        onInbox={() => router.push('/notifications')}
        unreadCount={notifications?.unreadCount ?? 0}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }}
        onAddWork={(categoryId, legacyCategoryName) => router.push({
          pathname: '/feed',
          params: {
            compose: '1',
            returnTo: asTab ? 'studio-tab' : 'profile',
            ...(categoryId !== null ? { categoryId: String(categoryId) } : {}),
            ...(legacyCategoryName ? { categoryName: legacyCategoryName } : {}),
          },
        })}
        onSaveCategories={async (categories) => {
          const saved = await updateCategories.mutateAsync({ data: { categories } });
          await queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(me.id) });
          return saved;
        }}
        onAssignWorkCategory={async (postId, categoryId) => {
          await updatePostCategory.mutateAsync({
            id: postId,
            data: { portfolioCategoryId: categoryId },
          });
          queryClient.setQueriesData<StudioPost[]>(
            { queryKey: ['/api/studio-posts'] },
            (current) => current?.map((post) =>
              post.id === postId ? { ...post, portfolioCategoryId: categoryId } : post,
            ),
          );
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(me.id) }),
            queryClient.invalidateQueries({ queryKey: getListStudioPostsQueryKey({ userId: me.id, limit: 100 }) }),
          ]);
        }}
        inquiryAvailable={inquiryAvailable}
        onInquiry={onOpenInquiry}
      />
    </View>
  );
}
