import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StudioPost } from '@workspace/api-client-react';
import { getBaseUrl } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { normalizeStudioLink } from '@/lib/studioInquiry';
import StudioImage from '@/components/StudioImage';
import StudioVideo from '@/components/StudioVideo';
import AudioTrackPlayer from '@/components/AudioTrackPlayer';
import PostOwnerActions from '@/components/PostOwnerActions';
import SafetyActions from '@/components/SafetyActions';

export type CreatorPortfolioProfile = {
  id: number;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  discipline?: string | null;
  location?: string | null;
  portfolioUrl?: string | null;
  bookingOpen?: boolean | null;
  followerCount?: number;
  followingCount?: number;
  followedByMe?: boolean;
  postCount?: number;
};

type Props = {
  creator: CreatorPortfolioProfile;
  posts: StudioPost[];
  isOwner: boolean;
  currentUserId?: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit?: () => void;
  onBack?: () => void;
  onAddWork?: (category: string) => void;
  onFollow?: () => void;
  followBusy?: boolean;
  onMessage?: () => void;
  messageBusy?: boolean;
  inquiryAvailable?: boolean;
  onInquiry?: () => void;
};

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = getBaseUrl();
  return base ? `${base}${url}` : url;
}

function avatarInitials(username: string) {
  return username.replace(/^@/, '').slice(0, 2).toUpperCase();
}

export default function CreatorPortfolioView({
  creator,
  posts,
  isOwner,
  currentUserId,
  isLoading = false,
  isError = false,
  onRetry,
  onEdit,
  onBack,
  onAddWork,
  onFollow,
  followBusy = false,
  onMessage,
  messageBusy = false,
  inquiryAvailable = false,
  onInquiry,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [videosMuted, setVideosMuted] = useState(true);
  const safeName = creator.username.replace(/^@/, '');
  const website = normalizeStudioLink(creator.portfolioUrl);
  const categories = useMemo(() => {
    const tags = new Set<string>();
    posts.forEach((post) => {
      (post.tags ?? []).forEach((tag) => {
        const value = tag.trim().replace(/^#/, '');
        if (value) tags.add(value);
      });
    });
    return [...tags].slice(0, 5);
  }, [posts]);
  const visiblePosts = selectedCategory === 'all'
    ? posts
    : posts.filter((post) =>
        (post.tags ?? []).some((tag) => tag.trim().replace(/^#/, '').toLowerCase() === selectedCategory.toLowerCase()),
      );
  const contentWidth = Math.min(windowWidth - 32, 680);
  const tileWidth = Math.max(120, (contentWidth - 12) / 2);
  const topPadding = Math.max(insets.top, 8) + 8;
  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.studioBackground },
    scroll: { alignItems: 'center', paddingBottom: Math.max(insets.bottom, 24) + 30 },
    content: { width: contentWidth, gap: 22 },
    header: {
      minHeight: 58,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.studioInk,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: topPadding,
      paddingBottom: 10,
      marginBottom: 19,
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    mark: {
      width: 34, height: 34, borderRadius: 11, borderWidth: 1.5,
      borderColor: colors.studioInk, backgroundColor: colors.studioOrange,
      alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }],
    },
    headerLabel: { flex: 1, color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.1 },
    headerAction: {
      minHeight: 38, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1.5,
      borderColor: colors.studioInk, backgroundColor: colors.studioPaper,
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
      shadowColor: colors.studioInk, shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    headerActionText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 11 },
    hero: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    avatarFrame: {
      width: 88, height: 88, borderRadius: 44, borderWidth: 2,
      borderColor: colors.studioInk, backgroundColor: colors.studioPaperAlt,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      shadowColor: colors.studioOrange, shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    avatar: { width: 84, height: 84, borderRadius: 42 },
    initials: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 25 },
    heroCopy: { flex: 1, minWidth: 0, gap: 6 },
    eyebrow: {
      alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5,
      borderWidth: 1, borderColor: colors.studioInk, borderRadius: 99,
      backgroundColor: colors.studioYellow, color: colors.studioInk,
      fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.7,
    },
    name: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 24, lineHeight: 28 },
    bio: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 19 },
    details: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    detailChip: {
      backgroundColor: colors.studioPaper, borderColor: colors.studioInk,
      borderWidth: 1, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 5,
    },
    detailText: { color: colors.studioInk, fontFamily: 'DMSans_600SemiBold', fontSize: 10 },
    linkRow: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
    link: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 99, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper },
    linkText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 11 },
    stats: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
      borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.studioInk,
      paddingVertical: 12,
    },
    statValue: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 16, textAlign: 'center' },
    statLabel: { color: colors.studioMuted, fontFamily: 'DMSans_500Medium', fontSize: 10, textAlign: 'center', marginTop: 2 },
    actions: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
    action: {
      minHeight: 45, flexGrow: 1, flexBasis: '30%', paddingHorizontal: 12,
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7,
      borderWidth: 1.5, borderColor: colors.studioInk, borderRadius: 15,
      backgroundColor: colors.studioPaper, shadowColor: colors.studioInk,
      shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    primaryAction: { backgroundColor: colors.primary },
    actionText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    primaryActionText: { color: colors.primaryForeground },
    sectionHeader: { gap: 5 },
    sectionEyebrow: { color: colors.studioMuted, fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 1.1 },
    sectionTitle: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 22, lineHeight: 26 },
    categoryScroll: { marginTop: -10, marginHorizontal: -4 },
    categoryRow: { gap: 8, paddingHorizontal: 4, paddingVertical: 4 },
    category: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 99, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper },
    categorySelected: { backgroundColor: colors.studioYellow },
    categoryText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 11 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tile: {
      borderRadius: 17, borderWidth: 1.5, borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper, overflow: 'hidden',
      shadowColor: colors.studioInk, shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    media: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.studioPaperAlt },
    postCopy: { paddingHorizontal: 10, paddingVertical: 9, gap: 5 },
    caption: { color: colors.studioInk, fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 17 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    tag: { color: colors.studioOrangeText, fontFamily: 'DMSans_700Bold', fontSize: 10 },
    postActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 9, paddingBottom: 8 },
    date: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 10 },
    empty: { alignItems: 'center', gap: 8, padding: 28, borderRadius: 17, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper },
    emptyTitle: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 16 },
    emptyText: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
    retry: { minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioYellow, alignItems: 'center', justifyContent: 'center' },
    state: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  }), [colors, contentWidth, insets.bottom, topPadding]);

  const isPoncho = safeName.toLowerCase() === 'ponchotheartist';
  const workCategories = useMemo(() => {
    if (isPoncho) {
      return [
        { value: 'tattoo', label: 'Tattoos' },
        { value: 'painting', label: 'Painting' },
        { value: 'murals', label: 'Murals' },
      ];
    }
    return categories.map((tag) => ({ value: tag, label: tag }));
  }, [categories, isPoncho]);
  const matchesCategory = (tag: string) => {
    const value = tag.trim().replace(/^#/, '').toLowerCase();
    if (selectedCategory === 'tattoo') return value.includes('tattoo');
    if (selectedCategory === 'painting') return value.includes('paint');
    if (selectedCategory === 'mural' || selectedCategory === 'murals') return value.includes('mural');
    return value === selectedCategory.toLowerCase();
  };
  const filteredPosts = selectedCategory === 'all'
    ? posts
    : posts.filter((post) => (post.tags ?? []).some(matchesCategory));

  const openWebsite = () => {
    if (!website) return;
    void Linking.openURL(website).catch(() => Alert.alert('Could not open website', 'Please check the link and try again.'));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.backButton}
          testID="creator-profile-back"
        >
          <Feather name="arrow-left" size={20} color={colors.studioInk} />
        </Pressable>
        <Text style={styles.headerLabel}>{isOwner ? 'YOUR STUDIO' : 'CREATOR PROFILE'}  ·  AIMD</Text>
        {isOwner ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              onPress={onEdit}
              style={styles.headerAction}
              testID="edit-profile-navigation"
            >
              <Feather name="edit-2" size={13} color={colors.studioInk} />
              <Text style={styles.headerActionText}>Edit profile</Text>
            </Pressable>
          </View>
        ) : (
          <SafetyActions userId={creator.id} username={creator.username} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 30 }]}
      >
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.avatarFrame}>
              {resolveImageUrl(creator.avatarUrl) ? (
                <Image source={{ uri: resolveImageUrl(creator.avatarUrl)! }} style={styles.avatar} contentFit="cover" />
              ) : (
                <Text style={styles.initials}>{avatarInitials(safeName)}</Text>
              )}
            </View>
            <View style={styles.heroCopy}>
              {!!creator.discipline && <Text style={styles.eyebrow}>{creator.discipline.toUpperCase()}</Text>}
              <Text style={styles.name} accessibilityRole="header">{safeName}</Text>
              <Text style={styles.bio}>{creator.bio?.trim() || 'A creator making room for their next idea.'}</Text>
              {(creator.location || creator.discipline) && (
                <View style={styles.details}>
                  {creator.location ? <View style={styles.detailChip}><Text style={styles.detailText}>{creator.location}</Text></View> : null}
                </View>
              )}
            </View>
          </View>

          {website ? (
            <View style={styles.linkRow}>
              <Pressable accessibilityRole="link" onPress={openWebsite} style={styles.link} testID="creator-website-link">
                <Feather name="external-link" size={13} color={colors.studioInk} />
                <Text style={styles.linkText}>Website</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.stats}>
            <View><Text style={styles.statValue}>{creator.postCount ?? posts.length}</Text><Text style={styles.statLabel}>Works</Text></View>
            <View><Text style={styles.statValue}>{creator.followerCount ?? 0}</Text><Text style={styles.statLabel}>Followers</Text></View>
            <View><Text style={styles.statValue}>{creator.followingCount ?? 0}</Text><Text style={styles.statLabel}>Following</Text></View>
          </View>

          {isOwner ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onAddWork?.(selectedCategory)}
                style={[styles.action, styles.primaryAction]}
                testID="creator-profile-add-work"
              >
                <Feather name="plus" size={16} color={colors.primaryForeground} />
                <Text style={[styles.actionText, styles.primaryActionText]}>New work</Text>
              </Pressable>
              {inquiryAvailable ? (
                <Pressable accessibilityRole="button" onPress={onInquiry} style={styles.action} testID="creator-profile-inquiry">
                  <Feather name="send" size={15} color={colors.studioInk} />
                  <Text style={styles.actionText}>View inquiry</Text>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" onPress={onEdit} style={styles.action} testID="creator-profile-setup-inquiry">
                  <Feather name="plus" size={15} color={colors.studioInk} />
                  <Text style={styles.actionText}>Set up inquiries</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={creator.followedByMe ? `Unfollow ${safeName}` : `Follow ${safeName}`}
                accessibilityState={{ selected: !!creator.followedByMe, busy: followBusy }}
                disabled={followBusy}
                onPress={onFollow}
                style={[styles.action, styles.primaryAction, followBusy && { opacity: 0.6 }]}
                testID="creator-profile-follow"
              >
                {followBusy ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : (
                  <>
                    <Feather name={creator.followedByMe ? 'check' : 'plus'} size={16} color={colors.primaryForeground} />
                    <Text style={[styles.actionText, styles.primaryActionText]}>{creator.followedByMe ? 'Following' : 'Follow'}</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={messageBusy}
                onPress={onMessage}
                style={[styles.action, messageBusy && { opacity: 0.6 }]}
                testID="creator-profile-message"
              >
                {messageBusy ? <ActivityIndicator size="small" color={colors.studioInk} /> : <Feather name="message-circle" size={15} color={colors.studioInk} />}
                <Text style={styles.actionText}>Message</Text>
              </Pressable>
              {inquiryAvailable && (
                <Pressable accessibilityRole="link" onPress={onInquiry} style={styles.action} testID="creator-profile-inquiry">
                  <Feather name="arrow-up-right" size={15} color={colors.studioInk} />
                  <Text style={styles.actionText}>Inquire</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>THE WORK</Text>
            <Text style={styles.sectionTitle}>Selected work</Text>
          </View>

          {workCategories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <View style={styles.categoryRow}>
                {[{ value: 'all', label: 'All work' }, ...workCategories].map((category) => {
                  const selected = selectedCategory === category.value;
                  return (
                    <Pressable
                      key={category.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedCategory(category.value)}
                      style={[styles.category, selected && styles.categorySelected]}
                      testID={`creator-work-filter-${category.value}`}
                    >
                      <Text style={styles.categoryText}>{category.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {isLoading ? (
            <View style={styles.empty}><ActivityIndicator color={colors.primary} /><Text style={styles.emptyText}>Loading artwork…</Text></View>
          ) : isError ? (
            <View style={styles.empty}>
              <Feather name="wifi-off" size={25} color={colors.studioMuted} />
              <Text style={styles.emptyTitle}>Work could not load</Text>
              <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.categoryText}>Try again</Text></Pressable>
            </View>
          ) : filteredPosts.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="image" size={25} color={colors.studioMuted} />
              <Text style={styles.emptyTitle}>{isOwner ? 'Your first piece is waiting.' : 'Work is coming soon.'}</Text>
              {isOwner ? <Text style={styles.emptyText}>Share a piece and it will live here.</Text> : null}
              {isOwner ? (
                <Pressable accessibilityRole="button" onPress={() => onAddWork?.(selectedCategory)} style={styles.retry}>
                  <Text style={styles.categoryText}>Share work</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.grid} testID="creator-work-grid">
              {filteredPosts.map((post) => {
                const mediaUrl = resolveImageUrl(post.imageUrl);
                return (
                  <View key={post.id} style={[styles.tile, { width: tileWidth }]}>
                    {mediaUrl && post.mediaType === 'audio' ? (
                      <AudioTrackPlayer uri={mediaUrl} />
                    ) : mediaUrl && post.mediaType === 'video' ? (
                      <StudioVideo uri={mediaUrl} active={false} reducedMotion muted={videosMuted} onMutedChange={setVideosMuted} style={styles.media} />
                    ) : mediaUrl ? (
                      <StudioImage uri={mediaUrl} style={styles.media} />
                    ) : (
                      <View style={[styles.media, { padding: 13, justifyContent: 'center' }]}>
                        <Text style={styles.caption} numberOfLines={7}>{post.caption || 'A work in progress'}</Text>
                      </View>
                    )}
                    {post.caption && mediaUrl ? <View style={styles.postCopy}><Text style={styles.caption} numberOfLines={2}>{post.caption}</Text></View> : null}
                    {post.tags?.length ? <View style={[styles.tags, { paddingHorizontal: 10, paddingBottom: 8 }]}>{post.tags.slice(0, 2).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}
                    <View style={styles.postActions}>
                      <Text style={styles.date}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                      {isOwner && currentUserId ? <PostOwnerActions post={post} currentUserId={currentUserId} /> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
