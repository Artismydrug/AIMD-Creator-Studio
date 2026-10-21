import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  getGetUserProfileQueryKey,
  getListStudioPostsQueryKey,
  useCreateConversation,
  useFollowUser,
  useGetCurrentUser,
  useGetUserProfile,
  useListStudioPosts,
  useUnfollowUser,
  getBaseUrl,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import SafetyActions from '@/components/SafetyActions';
import StudioVideo from '@/components/StudioVideo';
import AudioTrackPlayer from '@/components/AudioTrackPlayer';
import PostOwnerActions from '@/components/PostOwnerActions';
import { openPortfolioLink, PortfolioStamp } from '@/components/PortfolioUI';

type WorkFilter = 'All work' | 'Images' | 'Video' | 'Audio';
const filters: WorkFilter[] = ['All work', 'Images', 'Video', 'Audio'];
const MAX_PROFILE_WORK = 24;

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getBaseUrl();
  return base ? `${base}${url}` : url;
}

function safeWebsite(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatCount(count: number | null | undefined) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(count ?? 0);
}

function profileShareUrl(userId: number) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/creator\/[^/]+\/?$/, `/creator/${userId}`);
    url.search = '';
    url.hash = '';
    return url.toString();
  }
  return Linking.createURL(`/creator/${userId}`);
}

export default function CreatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();
  const { data: me } = useGetCurrentUser();
  const [filter, setFilter] = useState<WorkFilter>('All work');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCaption, setSelectedCaption] = useState('');
  const [videosMuted, setVideosMuted] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const creatorId = /^\d+$/.test(id ?? '') ? Number(id) : undefined;

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useGetUserProfile(creatorId ?? 0, {
    query: {
      enabled: creatorId !== undefined && creatorId > 0,
      queryKey: creatorId ? getGetUserProfileQueryKey(creatorId) : [],
    },
  });
  const {
    data: posts,
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts,
  } = useListStudioPosts(
    { userId: creatorId, limit: MAX_PROFILE_WORK },
    {
      query: {
        enabled: creatorId !== undefined && creatorId > 0,
        queryKey: creatorId ? getListStudioPostsQueryKey({ userId: creatorId, limit: MAX_PROFILE_WORK }) : [],
      },
      request: { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } },
    },
  );
  const refreshProfile = () => {
    void refetchProfile();
    void refetchPosts();
    if (profile) void queryClient.invalidateQueries({ queryKey: getListStudioPostsQueryKey({ userId: profile.id, limit: 10 }) });
  };
  const followMutation = useFollowUser({
    mutation: { onSuccess: refreshProfile },
  });
  const unfollowMutation = useUnfollowUser({
    mutation: { onSuccess: refreshProfile },
  });
  const createConversation = useCreateConversation({
    mutation: {
      onSuccess: (conversation) => {
        router.push({ pathname: '/conversation/[id]', params: { id: conversation.id, name: profile?.username ?? 'Messages' } });
      },
    },
  });

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.portfolioPaper },
    content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, gap: 23 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    top: { minHeight: 59, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 2, borderColor: colors.portfolioInk, paddingBottom: 12 },
    back: { width: 42, height: 44, justifyContent: 'center' },
    brand: { flex: 1, color: colors.portfolioInk, fontFamily: 'DMSans_700Bold', fontSize: 10, lineHeight: 14, letterSpacing: 1 },
    headerLink: { minHeight: 42, borderWidth: 1.5, borderColor: colors.portfolioInk, borderRadius: 30, backgroundColor: colors.studioOrange, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
    headerLinkText: { color: colors.portfolioInk, fontFamily: 'DMSans_700Bold', fontSize: 11 },
    profile: { flexDirection: 'row', alignItems: 'flex-start', gap: 15 },
    avatar: { width: 88, height: 88, borderRadius: 46, borderWidth: 2, borderColor: colors.portfolioInk, backgroundColor: colors.mediaPaper, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: colors.studioOrange, shadowOffset: { width: 4, height: 5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
    avatarImage: { width: '100%', height: '100%' },
    initials: { color: colors.portfolioInk, fontFamily: 'CormorantGaramond_700Bold', fontSize: 31 },
    identity: { flex: 1, minWidth: 0, gap: 9 },
    name: { color: colors.portfolioInk, fontFamily: 'CormorantGaramond_700Bold', fontSize: 34, lineHeight: 35 },
    bio: { color: colors.portfolioInk, fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 20 },
    small: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: 15, flexWrap: 'wrap' },
    stat: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
    statValue: { color: colors.portfolioInk, fontFamily: 'DMSans_700Bold', fontSize: 14 },
    statLabel: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 11 },
    tags: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    pill: { minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15, borderRadius: 25, borderWidth: 1.5, borderColor: colors.portfolioInk, backgroundColor: colors.portfolioPaper, shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
    selectedPill: { backgroundColor: colors.studioYellow },
    pillText: { color: colors.portfolioInk, fontFamily: 'DMSans_700Bold', fontSize: 11 },
    selectedText: { color: colors.ink },
    section: { borderTopWidth: 1.5, borderColor: colors.portfolioInk, paddingTop: 18, gap: 13 },
    sectionTitle: { color: colors.portfolioInk, fontFamily: 'CormorantGaramond_700Bold', fontSize: 32, lineHeight: 34 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { flexBasis: '47%', flexGrow: 1, aspectRatio: 4 / 5, borderWidth: 2, borderColor: colors.portfolioInk, borderRadius: 19, overflow: 'hidden', backgroundColor: colors.mediaPaper },
    wideTile: { flexBasis: '100%', aspectRatio: 4 / 3 },
    media: { width: '100%', flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: colors.mediaPaper },
    image: { width: '100%', height: '100%', backgroundColor: colors.mediaPaper },
    videoToggle: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 20, borderWidth: 1.5, borderColor: colors.portfolioInk, backgroundColor: colors.studioYellow, alignItems: 'center', justifyContent: 'center' },
    workCaption: { flexShrink: 0, paddingHorizontal: 9, paddingBottom: 7 },
    mediaFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.studioMint },
    fallbackText: { color: colors.portfolioInk, fontFamily: 'DMSans_700Bold', fontSize: 11, textAlign: 'center' },
    caption: { color: colors.portfolioInk, fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 18, paddingHorizontal: 3, paddingTop: 8 },
    tagsSmall: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 10, lineHeight: 14, paddingHorizontal: 3 },
    empty: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 19, padding: 20 },
    emptyText: { color: colors.mutedForeground, fontFamily: 'DMSans_400Regular', textAlign: 'center', fontSize: 13, lineHeight: 20 },
    follow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderWidth: 1.5, borderColor: colors.portfolioInk, borderRadius: 24, backgroundColor: colors.studioYellow, shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
    followText: { color: colors.portfolioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    message: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 15, borderWidth: 1.5, borderColor: colors.portfolioInk, borderRadius: 24, backgroundColor: colors.studioMint, shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
    error: { color: colors.destructive, fontFamily: 'DMSans_500Medium', fontSize: 12 },
    modal: { flex: 1, paddingHorizontal: 16, backgroundColor: colors.portfolioPaper },
    closeImage: { height: 44, width: 44, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center' },
    modalImage: { flex: 1, width: '100%', backgroundColor: colors.mediaPaper },
    bottom: { alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: colors.portfolioInk, paddingTop: 17 },
    footerLink: { color: colors.portfolioInk, textDecorationLine: 'underline', fontFamily: 'DMSans_700Bold', fontSize: 12 },
  }), [colors]);

  const isOwnProfile = !!me && me.id === profile?.id;
  const filterPosts = (posts ?? []).filter(post => {
    if (filter === 'Images') return post.mediaType === 'image' && !!post.imageUrl;
    if (filter === 'Video') return post.mediaType === 'video';
    if (filter === 'Audio') return post.mediaType === 'audio';
    return true;
  });
  const avatarUrl = resolveImageUrl(profile?.avatarUrl);
  const website = safeWebsite(profile?.portfolioUrl);

  async function shareProfile() {
    if (!profile) return;
    try {
      const url = profileShareUrl(profile.id);
      await Share.share({
        title: `${profile.username} · Creator Studio by AIMD`,
        message: `${profile.username}’s creative portfolio on Creator Studio by AIMD\n${url}`,
        url,
      });
    } catch {
      await openPortfolioLink(profileShareUrl(profile.id));
    }
  }

  async function showImage(url: string | null, caption: string) {
    if (!url) return;
    setSelectedCaption(caption);
    setSelectedImage(url);
  }

  const handleFollow = () => {
    if (!profile || isOwnProfile) return;
    if (profile.followedByMe) unfollowMutation.mutate({ id: profile.id });
    else followMutation.mutate({ id: profile.id });
  };
  const handleMessage = () => {
    if (!profile || isOwnProfile) return;
    createConversation.mutate({ data: { participantIds: [profile.id] } });
  };
  const openOwnProfileEditor = () => router.push('/profile');

  const returnToCommunity = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/community');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 8 : 0) + 9, paddingBottom: insets.bottom + 32 }]}
      >
        <View style={styles.top}>
          <Pressable testID="creator-back" onPress={returnToCommunity} accessibilityRole="button" accessibilityLabel="Back to Creators" style={styles.back}>
            <Feather name="arrow-left" size={21} color={colors.portfolioInk} />
          </Pressable>
          <Text style={styles.brand}>CREATOR STUDIO{'\n'}by AIMD</Text>
          {profile && (
            <Pressable testID={`creator-share-${profile.id}`} onPress={() => void shareProfile()} accessibilityRole="button" accessibilityLabel={`Share ${profile.username}'s profile`} style={styles.headerLink}>
              <Feather name="share-2" size={15} color={colors.portfolioInk} />
              <Text style={styles.headerLinkText}>Share</Text>
            </Pressable>
          )}
        </View>

        {profileLoading ? (
          <View style={styles.empty}><ActivityIndicator color={colors.portfolioInk} size="large" /><Text style={styles.emptyText}>Opening this creator’s studio…</Text></View>
        ) : profileError || !profile ? (
          <View style={styles.empty}>
            <Feather name="user-x" size={35} color={colors.mutedForeground} />
            <Text style={styles.sectionTitle}>Profile not found</Text>
            <Text style={styles.emptyText}>This creator may no longer be available.</Text>
          </View>
        ) : (
          <>
            <View style={styles.profile}>
              <View style={styles.avatar}>
                {avatarUrl ? <Image source={{ uri: avatarUrl }} accessibilityLabel={`${profile.username}'s profile photo`} style={styles.avatarImage} /> : <Text style={styles.initials}>{profile.username.slice(0, 2).toUpperCase()}</Text>}
              </View>
              <View style={styles.identity}>
                <Text accessibilityRole="header" style={styles.name}>{profile.username}</Text>
                {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : <Text style={styles.small}>Creator in the AIMD community.</Text>}
                {profile.location ? <View style={[styles.row, { flexWrap: 'nowrap' }]}><Feather name="map-pin" size={13} color={colors.mutedForeground} /><Text style={styles.small}>{profile.location}</Text></View> : null}
              </View>
            </View>

            {(profile.discipline || profile.bookingOpen || profile.studioReadyBadge) && (
              <View style={styles.tags}>
                {profile.discipline && <PortfolioStamp>{profile.discipline.toUpperCase()}</PortfolioStamp>}
                {profile.bookingOpen && <PortfolioStamp>OPEN FOR WORK</PortfolioStamp>}
                {profile.studioReadyBadge && <PortfolioStamp>STUDIO READY</PortfolioStamp>}
              </View>
            )}

            <View style={styles.row}>
              {!isOwnProfile ? (
                <>
                  {isSignedIn ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${profile.followedByMe ? 'Unfollow' : 'Follow'} ${profile.username}`}
                        accessibilityState={{ selected: profile.followedByMe, disabled: followMutation.isPending || unfollowMutation.isPending }}
                        disabled={followMutation.isPending || unfollowMutation.isPending}
                        onPress={handleFollow}
                        style={styles.follow}
                        testID={`creator-follow-${profile.id}`}
                      >
                        <Text style={styles.followText}>{profile.followedByMe ? 'Following' : 'Follow creator'}</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Message ${profile.username}`}
                        accessibilityState={{ disabled: createConversation.isPending }}
                        disabled={createConversation.isPending}
                        onPress={handleMessage}
                        style={styles.message}
                        testID={`creator-message-${profile.id}`}
                      >
                        <Feather name="message-circle" size={16} color={colors.portfolioInk} />
                        <Text style={styles.followText}>Message</Text>
                      </Pressable>
                      <SafetyActions
                        userId={profile.id}
                        username={profile.username}
                        blockedByMe={profile.blockedByMe}
                        onBlocked={refreshProfile}
                        triggerColor={colors.portfolioInk}
                      />
                    </>
                  ) : (
                    <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/sign-in')} style={styles.follow}>
                      <Text style={styles.followText}>Sign in to connect</Text>
                    </Pressable>
                  )}
                </>
              ) : (
                <Pressable testID="own-profile-edit" accessibilityRole="button" onPress={openOwnProfileEditor} style={styles.pill}>
                  <Text style={styles.pillText}>Edit your profile</Text>
                </Pressable>
              )}
              {website && (
                <Pressable accessibilityRole="link" accessibilityLabel={`Open ${profile.username}'s website`} onPress={() => void openPortfolioLink(website)} style={[styles.pill, { backgroundColor: colors.portfolioPaper }]}>
                  <View style={styles.row}><Feather name="external-link" size={14} color={colors.portfolioInk} /><Text style={styles.pillText}>Website</Text></View>
                </Pressable>
              )}
            </View>

            <View style={styles.statRow}>
              <View style={styles.stat}><Text style={styles.statValue}>{formatCount(profile.postCount)}</Text><Text style={styles.statLabel}>Works</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{formatCount(profile.followerCount)}</Text><Text style={styles.statLabel}>Followers</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{formatCount(profile.followingCount)}</Text><Text style={styles.statLabel}>Following</Text></View>
              {(profile.recentBadges ?? []).length > 0 && <View style={styles.stat}><Text style={styles.statValue}>{formatCount(profile.badgesEarned)}</Text><Text style={styles.statLabel}>Badges</Text></View>}
            </View>

            <View style={styles.section}>
              <PortfolioStamp>CREATIVE PORTFOLIO</PortfolioStamp>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Selected work.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
                {filters.map(item => (
                  <Pressable
                    key={item}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: filter === item }}
                    onPress={() => setFilter(item)}
                    style={[styles.pill, filter === item && styles.selectedPill]}
                    testID={`creator-work-${item.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Text style={[styles.pillText, filter === item && styles.selectedText]}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {postsLoading && !posts ? <View style={styles.empty}><ActivityIndicator color={colors.portfolioInk} /></View> :
              postsError && !posts ? (
                <Pressable onPress={() => void refetchPosts()} accessibilityRole="button" style={styles.empty}><Feather name="refresh-cw" size={22} color={colors.mutedForeground} /><Text style={styles.emptyText}>Couldn’t open this portfolio. Tap to retry.</Text></Pressable>
              ) : filterPosts.length === 0 ? (
                <View style={styles.empty}><Feather name="image" size={25} color={colors.mutedForeground} /><Text style={styles.emptyText}>{filter === 'All work' ? (isOwnProfile ? 'Your public posts will appear here.' : 'Work in progress.') : `No ${filter.toLowerCase()} yet.`}</Text>{isOwnProfile && filter === 'All work' && <Pressable onPress={() => router.push({ pathname: '/feed', params: { compose: '1' } })} accessibilityRole="button" style={styles.pill}><Text style={styles.pillText}>Share your first work</Text></Pressable>}</View>
              ) : (
                <View style={styles.grid}>
                  {filterPosts.map((post, index) => {
                    const imageUrl = resolveImageUrl(post.imageUrl);
                    const video = post.mediaType === 'video' && !!imageUrl;
                    const image = post.mediaType === 'image' && !!imageUrl;
                    const audio = post.mediaType === 'audio' && !!imageUrl;
                    const tags = (post.tags ?? []).filter(Boolean);
                    return (
                      <View key={post.id} style={[styles.tile, index % 3 === 2 && styles.wideTile]}>
                        {video ? (
                          <View style={styles.media}>
                            <StudioVideo
                              uri={imageUrl!}
                              active={activeVideoId === post.id}
                              reducedMotion
                              muted={videosMuted}
                              onMutedChange={setVideosMuted}
                              style={StyleSheet.absoluteFill}
                            />
                          </View>
                        ) : audio ? (
                          <View style={[styles.media, styles.mediaFallback]}><Feather name="music" size={28} color={colors.portfolioInk} /><AudioTrackPlayer uri={imageUrl!} /></View>
                        ) : image ? (
                          <Pressable testID={`creator-artwork-${post.id}`} accessibilityRole="button" accessibilityLabel={`Open artwork${post.caption ? `: ${post.caption}` : ''}`} onPress={() => void showImage(imageUrl, post.caption || '')} style={styles.media}>
                            <Image source={{ uri: imageUrl! }} style={styles.image} resizeMode="contain" accessibilityLabel={post.caption || 'Creator artwork'} />
                          </Pressable>
                        ) : (
                          <View style={[styles.media, styles.mediaFallback]}><Feather name={post.mediaType === 'video' ? 'video' : 'edit-3'} size={27} color={colors.portfolioInk} /><Text style={styles.fallbackText}>{post.mediaType === 'video' ? 'Video' : post.caption || 'Creative practice'}</Text></View>
                        )}
                        {video ? <Pressable accessibilityRole="button" accessibilityLabel={activeVideoId === post.id ? 'Pause video' : 'Play video'} onPress={() => setActiveVideoId(activeVideoId === post.id ? null : post.id)} style={styles.videoToggle}><Feather name={activeVideoId === post.id ? 'pause' : 'play'} size={15} color={colors.portfolioInk} /></Pressable> : null}
                        <View style={styles.workCaption}>
                          {post.caption ? <Text style={styles.caption} numberOfLines={4}>{post.caption}</Text> : null}
                          {tags.length > 0 ? <Text style={styles.tagsSmall} numberOfLines={2}>{tags.map(tag => `#${tag}`).join('  ')}</Text> : null}
                          {isOwnProfile && <View style={{ alignSelf: 'flex-end', padding: 5 }}><PostOwnerActions post={post} currentUserId={me?.id} /></View>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

            {(profile.recentBadges ?? []).length > 0 && (
              <View style={styles.section}>
                <PortfolioStamp>RECENT MILESTONES</PortfolioStamp>
                <View style={styles.tags}>
                  {profile.recentBadges.map((badge, index) => <View key={badge.id ?? `${badge.name}-${index}`} style={[styles.pill, { backgroundColor: colors.studioMint }]}>
                    <View style={styles.row}><Feather name="award" size={14} color={colors.portfolioInk} /><Text style={styles.pillText}>{badge.name || 'Studio badge'}</Text></View>
                  </View>)}
                </View>
              </View>
            )}

            <View style={styles.bottom}>
              <Text style={styles.small}>A creator in the AIMD community.</Text>
              {!isOwnProfile && <Pressable onPress={returnToCommunity} accessibilityRole="button"><Text style={styles.footerLink}>Discover more creators →</Text></Pressable>}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={selectedImage !== null} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={[styles.modal, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}>
          <Pressable testID="creator-close-artwork" onPress={() => setSelectedImage(null)} accessibilityRole="button" accessibilityLabel="Close artwork" style={styles.closeImage}>
            <Feather name="x" size={26} color={colors.portfolioInk} />
          </Pressable>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" accessibilityLabel={selectedCaption || 'Selected portfolio work'} />}
          {selectedCaption ? <Text style={styles.bio}>{selectedCaption}</Text> : null}
        </View>
      </Modal>
    </View>
  );
}
