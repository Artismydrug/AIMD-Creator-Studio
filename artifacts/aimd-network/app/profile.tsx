import React from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  getGetUserProfileQueryKey,
  getListStudioPostsQueryKey,
  useGetCurrentUser,
  useGetUserProfile,
  useListStudioPosts,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import CreatorPortfolioView, { type CreatorPortfolioProfile } from '@/components/CreatorPortfolioView';
import { getStudioInquiryLink } from '@/lib/studioInquiry';

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
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
    bookingOpen: me.bookingOpen,
    followerCount: socialProfile?.followerCount ?? 0,
    followingCount: socialProfile?.followingCount ?? 0,
    followedByMe: false,
    postCount: socialProfile?.postCount ?? posts?.length ?? 0,
  };
  const isPoncho = me.username.replace(/^@/, '').toLowerCase() === 'ponchotheartist';
  const inquiryUrl = me.bookingOpen && !isPoncho ? getStudioInquiryLink(creator) : null;
  const inquiryAvailable = !!me.bookingOpen && (isPoncho || !!inquiryUrl);
  const onOpenInquiry = () => {
    if (!me.bookingOpen) return;
    if (isPoncho) {
      router.push('/commission-inquiry');
      return;
    }
    if (!inquiryUrl) return;
    void Linking.openURL(inquiryUrl).catch(() => Alert.alert('Could not open inquiry link', 'Please try again.'));
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
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }}
        onAddWork={(category) => router.push({
          pathname: '/feed',
          params: {
            compose: '1',
            returnTo: 'profile',
            ...(category && category !== 'all' ? { category } : {}),
          },
        })}
        inquiryAvailable={inquiryAvailable}
        onInquiry={onOpenInquiry}
      />
    </View>
  );
}
