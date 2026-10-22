import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetUserProfileQueryKey,
  getListStudioPostsQueryKey,
  useCreateConversation,
  useFollowUser,
  useGetCurrentUser,
  useGetUserProfile,
  useListStudioPosts,
  useUnfollowUser,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import CreatorPortfolioView from '@/components/CreatorPortfolioView';
import { getStudioInquiryLink } from '@/lib/studioInquiry';

export default function CreatorProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ creatorId?: string | string[] }>();
  const rawId = Array.isArray(params.creatorId) ? params.creatorId[0] : params.creatorId;
  const creatorId = Number(rawId);
  const validCreatorId = Number.isInteger(creatorId) && creatorId > 0;
  const { data: me } = useGetCurrentUser();
  const {
    data: creator,
    isLoading: creatorLoading,
    isError: creatorError,
    refetch: refetchCreator,
  } = useGetUserProfile(validCreatorId ? creatorId : 0, {
    query: {
      enabled: validCreatorId,
      queryKey: validCreatorId ? getGetUserProfileQueryKey(creatorId) : [],
    },
  });
  const {
    data: posts,
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts,
  } = useListStudioPosts(
    { userId: validCreatorId ? creatorId : undefined, limit: 100 },
    { query: {
      enabled: validCreatorId,
      queryKey: getListStudioPostsQueryKey({ userId: validCreatorId ? creatorId : undefined, limit: 100 }),
    } },
  );
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();
  const createConversation = useCreateConversation();

  useEffect(() => {
    if (me && validCreatorId && me.id === creatorId) router.replace('/profile');
  }, [creatorId, me, router, validCreatorId]);

  const styles = StyleSheet.create({
    state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: colors.studioBackground },
    title: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 18, textAlign: 'center' },
    button: { minHeight: 44, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioYellow, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    buttonText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 13 },
  });

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/community');
  };
  const retry = () => {
    void refetchCreator();
    void refetchPosts();
  };

  if (!validCreatorId || creatorLoading || (me && me.id === creatorId)) {
    return (
      <View style={styles.state}>
        <Stack.Screen options={{ headerShown: false }} />
        {validCreatorId ? <ActivityIndicator color={colors.primary} /> : <Feather name="user-x" size={38} color={colors.studioMuted} />}
        <Text style={styles.title}>{validCreatorId ? 'Opening creator studio…' : 'Creator not found'}</Text>
      </View>
    );
  }

  if (creatorError || !creator) {
    return (
      <View style={styles.state}>
        <Stack.Screen options={{ headerShown: false }} />
        <Feather name="user-x" size={38} color={colors.studioMuted} />
        <Text style={styles.title}>This studio is unavailable</Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.button}>
          <Feather name="refresh-cw" size={15} color={colors.studioInk} />
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={back} style={styles.button}>
          <Text style={styles.buttonText}>Back to creators</Text>
        </Pressable>
      </View>
    );
  }

  const isPoncho = creator.username.replace(/^@/, '').toLowerCase() === 'ponchotheartist';
  const inquiryUrl = creator.bookingOpen && !isPoncho ? getStudioInquiryLink(creator) : null;

  const toggleFollow = () => {
    if (!me || follow.isPending || unfollow.isPending) return;
    const mutation = creator.followedByMe ? unfollow : follow;
    mutation.mutate(
      { id: creator.id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(creator.id) });
        },
        onError: () => Alert.alert('Could not update follow', 'Please try again.'),
      },
    );
  };

  const messageCreator = () => {
    if (!me || createConversation.isPending) return;
    createConversation.mutate(
      { data: { participantIds: [creator.id] } },
      {
        onSuccess: (conversation) => router.push({
          pathname: '/conversation/[id]',
          params: { id: conversation.id, name: creator.username },
        }),
        onError: () => Alert.alert('Could not start a message', 'Please try again in a moment.'),
      },
    );
  };

  const openInquiry = () => {
    if (!creator.bookingOpen) return;
    if (isPoncho) {
      router.push({
        pathname: '/commission-inquiry',
        params: { creatorName: creator.username },
      });
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
        isOwner={false}
        currentUserId={me?.id}
        isLoading={postsLoading}
        isError={postsError}
        onRetry={retry}
        onBack={back}
        onFollow={toggleFollow}
        followBusy={follow.isPending || unfollow.isPending}
        onMessage={messageCreator}
        messageBusy={createConversation.isPending}
        inquiryAvailable={!!creator.bookingOpen && (isPoncho || !!inquiryUrl)}
        onInquiry={openInquiry}
      />
    </View>
  );
}
