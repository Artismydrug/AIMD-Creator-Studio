import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
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

const portfolioSerif = Platform.OS === 'web'
  ? 'Georgia, "Times New Roman", serif'
  : Platform.OS === 'android' ? 'serif' : 'Georgia';

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
  const [selectedPost, setSelectedPost] = useState<StudioPost | null>(null);
  const safeName = creator.username.replace(/^@/, '');
  const profileLabel = [creator.discipline?.trim().toUpperCase(), creator.location?.trim()].filter(Boolean).join(' · ');
  const isPoncho = safeName.toLowerCase() === 'ponchotheartist';
  const website = normalizeStudioLink(creator.portfolioUrl) || (isPoncho ? 'https://ponchotheartist.com' : null);
  const topInsetFallback = Platform.OS === 'web' && windowWidth <= 500 ? 56 : 8;
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
  const contentWidth = Math.min(windowWidth - 36, 680);
  const desktopGrid = contentWidth >= 600;
  const gridGap = desktopGrid ? 13 : 8;
  const columnCount = desktopGrid ? 3 : 2;
  const tileWidth = (contentWidth - gridGap * (columnCount - 1)) / columnCount;
  const topPadding = Math.max(insets.top, topInsetFallback) + 8;
  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.studioBackground },
    scroll: { alignItems: 'center', paddingBottom: Math.max(insets.bottom, 24) + 30 },
    content: { width: contentWidth, gap: 20 },
    header: {
      minHeight: 58,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.studioInk,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 18,
      paddingTop: topPadding,
      paddingBottom: 10,
      marginBottom: 0,
    },
    backButton: { width: 30, height: 44, alignItems: 'center', justifyContent: 'center' },
    mark: {
      width: 34, height: 34, borderRadius: 11, borderWidth: 1.5,
      borderColor: colors.studioInk, backgroundColor: colors.studioOrange,
      alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }],
    },
    headerBrand: { flex: 1, minWidth: 0 },
    headerLabel: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 0.7 },
    headerByline: { color: colors.studioMuted, fontFamily: 'DMSans_500Medium', fontSize: 9, marginTop: 3 },
    headerAction: {
      width: 44, minHeight: 44, borderRadius: 99, borderWidth: 1.5,
      borderColor: colors.studioInk, backgroundColor: colors.studioPaper,
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
      shadowColor: colors.studioInk, shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    headerActionText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 11 },
    inquiryPill: {
      minHeight: 44, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1.5,
      borderColor: colors.studioInk, backgroundColor: colors.studioInquiry,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
      shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    inquiryPillText: { color: colors.studioInquiryForeground, fontFamily: 'DMSans_700Bold', fontSize: 10 },
    hero: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', paddingTop: 30 },
    avatarFrame: {
      width: 90, height: 90, borderRadius: 45, borderWidth: 2,
      borderColor: colors.studioInk, backgroundColor: colors.studioPaperAlt,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      shadowColor: colors.studioOrange, shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    avatar: { width: 86, height: 86, borderRadius: 43 },
    initials: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 23 },
    heroCopy: { flex: 1, minWidth: 0, gap: 6 },
    eyebrow: {
      alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5,
      borderWidth: 1, borderColor: colors.studioInk, borderRadius: 99,
       backgroundColor: colors.studioMint, color: colors.ink,
       fontFamily: 'DMSans_700Bold', fontSize: 8, letterSpacing: 0.4,
    },
    name: { color: colors.studioInk, fontFamily: portfolioSerif, fontWeight: '700', fontSize: 27, lineHeight: 29, letterSpacing: -0.8 },
    bio: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 },
    linkRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
    link: {
      minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10,
      borderRadius: 99, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper,
      shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    linkText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 11 },
    stats: {
      flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, paddingBottom: 2,
    },
    statLabel: { color: colors.studioMuted, fontFamily: 'DMSans_500Medium', fontSize: 11 },
    actions: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
    action: {
      minHeight: 44, paddingHorizontal: 12,
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7,
      borderWidth: 1.5, borderColor: colors.studioInk, borderRadius: 99,
      backgroundColor: colors.studioPaper, shadowColor: colors.studioInk,
      shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    primaryAction: { backgroundColor: colors.primary },
    actionText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    primaryActionText: { color: colors.primaryForeground },
    workSection: { borderTopWidth: 1.5, borderTopColor: colors.studioInk, paddingTop: 20, gap: 14 },
    workToolbar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    addWorkTarget: { minHeight: 44, justifyContent: 'center', flexShrink: 0 },
    addWorkPill: {
      minHeight: 30, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
      borderRadius: 99, borderWidth: 1, borderColor: colors.studioInk, backgroundColor: colors.studioPaper,
    },
    addWorkText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 10 },
    categoryScroll: { flex: 1 },
    categoryRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 4, paddingBottom: 4, gap: 8 },
    category: {
      minHeight: 44, flexShrink: 0, justifyContent: 'center', borderRadius: 99,
      paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper,
    },
    categorySelected: {
      backgroundColor: colors.studioYellow, shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    categoryText: { color: colors.studioMuted, fontFamily: 'DMSans_700Bold', fontSize: 11, textAlign: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: gridGap },
    tile: {
      borderRadius: 15, borderWidth: 1.5, borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper, overflow: 'hidden',
      shadowColor: colors.studioShadow, shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    media: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.studioPaperAlt },
    featuredMedia: { aspectRatio: 4 / 3 },
    artworkMenu: { position: 'absolute', right: 5, top: 5, borderRadius: 99, backgroundColor: colors.studioPaper },
    postCopy: { paddingHorizontal: 10, paddingVertical: 9, gap: 5 },
    caption: { color: colors.studioInk, fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 17 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    tag: { color: colors.studioOrangeText, fontFamily: 'DMSans_700Bold', fontSize: 10 },
    postActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 9, paddingBottom: 8 },
    date: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 10 },
    contact: {
      marginTop: 10, padding: 20, gap: 12, borderWidth: 1.5, borderColor: colors.studioInk,
      borderRadius: 18, backgroundColor: colors.studioMint, shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    contactEyebrow: { backgroundColor: colors.studioYellow },
    contactTitle: { color: colors.ink, fontFamily: portfolioSerif, fontWeight: '700', fontSize: 27, lineHeight: 30, letterSpacing: -0.8 },
    contactButton: {
      minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      marginTop: 4, paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.ink,
      borderRadius: 13, backgroundColor: colors.studioInquiry, shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    contactButtonText: { color: colors.studioInquiryForeground, fontFamily: 'DMSans_700Bold', fontSize: 12, flexShrink: 1 },
    bookingLink: { minHeight: 44, justifyContent: 'center' },
    bookingText: { color: colors.ink, fontFamily: 'DMSans_500Medium', fontSize: 11, lineHeight: 17, textDecorationLine: 'underline' },
    lightbox: { flex: 1, backgroundColor: colors.studioBackground, paddingHorizontal: 18, paddingTop: topPadding, paddingBottom: Math.max(insets.bottom, 16), gap: 16 },
    lightboxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    lightboxTitle: { flex: 1, color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 14 },
    lightboxImage: { width: '100%', flex: 1 },
    lightboxCopy: { maxHeight: 180 },
    empty: { alignItems: 'center', gap: 8, padding: 28, borderRadius: 17, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper },
    emptyTitle: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 16 },
    emptyText: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
    retry: { minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioYellow, alignItems: 'center', justifyContent: 'center' },
    state: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  }), [colors, contentWidth, gridGap, insets.bottom, topPadding]);

  const displayName = isPoncho ? 'Edward ‘Poncho’ Davila' : safeName;
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

  const openLink = (url: string) => {
    void Linking.openURL(url).catch(() => Alert.alert('Could not open link', 'Please check the link and try again.'));
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
        <View style={styles.mark}><Feather name="aperture" size={19} color={colors.ink} /></View>
        <View style={styles.headerBrand}>
          <Text style={styles.headerLabel}>{isOwner ? 'YOUR STUDIO' : 'CREATOR STUDIO'}</Text>
          <Text style={styles.headerByline}>by AIMD</Text>
        </View>
        {isOwner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={onEdit}
            style={styles.headerAction}
            testID="edit-profile-navigation"
          >
            <Feather name="edit-2" size={14} color={colors.studioInk} />
          </Pressable>
        ) : (
          <SafetyActions userId={creator.id} username={creator.username} />
        )}
        {inquiryAvailable && (
          <Pressable accessibilityRole="button" accessibilityLabel="Open inquiry form" onPress={onInquiry} style={styles.inquiryPill} testID="creator-profile-inquiry">
            <Text style={styles.inquiryPillText}>Inquiry</Text>
            <Feather name="arrow-up-right" size={13} color={colors.studioInquiryForeground} />
          </Pressable>
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
              {!!profileLabel && <Text style={styles.eyebrow} testID="creator-profile-label">{profileLabel}</Text>}
              <Text style={styles.name} accessibilityRole="header">{displayName}</Text>
              {creator.bio?.trim() ? <Text style={styles.bio}>{creator.bio.trim()}</Text> : null}
              {(website || isPoncho) && (
                <View style={styles.linkRow}>
                  {website && (
                    <Pressable accessibilityRole="link" accessibilityLabel="Visit artist website" onPress={() => openLink(website)} style={styles.link} testID="creator-website-link">
                      <Text style={styles.linkText}>Website</Text>
                      <Feather name="arrow-up-right" size={13} color={colors.studioInk} />
                    </Pressable>
                  )}
                  {isPoncho && (
                    <Pressable accessibilityRole="link" accessibilityLabel="Visit Poncho on Instagram" onPress={() => openLink('https://www.instagram.com/ponchotheartist/')} style={styles.link} testID="creator-instagram-link">
                      <Feather name="instagram" size={13} color={colors.studioInk} />
                      <Text style={styles.linkText}>Instagram</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={styles.stats}>
            <Text style={styles.statLabel}>{creator.postCount ?? posts.length} works</Text>
            <Text style={styles.statLabel}>·</Text>
            <Text style={styles.statLabel}>{creator.followerCount ?? 0} followers</Text>
            <Text style={styles.statLabel}>·</Text>
            <Text style={styles.statLabel}>{creator.followingCount ?? 0} following</Text>
          </View>

          {!isOwner && (
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
            </View>
          )}

          <View style={styles.workSection}>
            <View style={styles.workToolbar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} testID="creator-work-tabs">
              <View style={styles.categoryRow}>
                {[{ value: 'all', label: 'All work' }, ...workCategories].map((category) => {
                  const selected = selectedCategory === category.value;
                  return (
                    <Pressable
                      key={category.value}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedCategory(category.value)}
                      style={[styles.category, selected && styles.categorySelected]}
                      testID={`creator-work-filter-${category.value}`}
                    >
                      <Text style={[styles.categoryText, selected && { color: colors.ink }]}>{category.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
              {isOwner && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add new work"
                  onPress={() => onAddWork?.(selectedCategory)}
                  style={styles.addWorkTarget}
                  testID="creator-profile-add-work"
                >
                  <View style={styles.addWorkPill}>
                    <Feather name="plus" size={12} color={colors.studioInk} />
                    <Text style={styles.addWorkText}>New work</Text>
                  </View>
                </Pressable>
              )}
            </View>

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
            </View>
          ) : (
            <View style={styles.grid} testID="creator-work-grid">
              {filteredPosts.map((post, index) => {
                const mediaUrl = resolveImageUrl(post.imageUrl);
                const featured = !desktopGrid && index % 3 === 2;
                const imagePost = !!mediaUrl && post.mediaType !== 'video' && post.mediaType !== 'audio';
                const mediaStyle = [styles.media, featured && styles.featuredMedia];
                return (
                  <View key={post.id} style={[styles.tile, { width: featured ? contentWidth : tileWidth }]} testID={`creator-work-${post.id}`}>
                    {mediaUrl && post.mediaType === 'audio' ? (
                      <AudioTrackPlayer uri={mediaUrl} />
                    ) : mediaUrl && post.mediaType === 'video' ? (
                      <StudioVideo uri={mediaUrl} active={false} reducedMotion muted={videosMuted} onMutedChange={setVideosMuted} style={mediaStyle} />
                    ) : mediaUrl ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={`View artwork: ${post.caption || 'Untitled work'}`} onPress={() => setSelectedPost(post)} testID={`creator-artwork-${post.id}`}>
                        <StudioImage uri={mediaUrl} style={mediaStyle} />
                      </Pressable>
                    ) : (
                      <View style={[...mediaStyle, { padding: 13, justifyContent: 'center' }]}>
                        <Text style={styles.caption} numberOfLines={7}>{post.caption || 'A work in progress'}</Text>
                      </View>
                    )}
                    {imagePost ? (
                      isOwner && currentUserId ? (
                        <View style={styles.artworkMenu}><PostOwnerActions post={post} currentUserId={currentUserId} /></View>
                      ) : null
                    ) : (
                      <>
                        {post.caption && mediaUrl ? <View style={styles.postCopy}><Text style={styles.caption} numberOfLines={2}>{post.caption}</Text></View> : null}
                        {post.tags?.length ? <View style={[styles.tags, { paddingHorizontal: 10, paddingBottom: 8 }]}>{post.tags.slice(0, 2).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}
                        <View style={styles.postActions}>
                          <Text style={styles.date}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                          {isOwner && currentUserId ? <PostOwnerActions post={post} currentUserId={currentUserId} /> : null}
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          </View>

          {inquiryAvailable && (
            <View style={styles.contact} testID="creator-contact-block">
              <Text style={[styles.eyebrow, styles.contactEyebrow]}>HAVE SOMETHING IN MIND?</Text>
              <Text style={styles.contactTitle} accessibilityRole="header">Let’s make it personal.</Text>
              <Pressable accessibilityRole="button" onPress={onInquiry} style={styles.contactButton} testID="creator-profile-inquiry-bottom">
                <Text style={styles.contactButtonText}>{isPoncho ? 'Start a Commission Inquiry' : 'Start an inquiry'}</Text>
                <Feather name="arrow-up-right" size={17} color={colors.studioInquiryForeground} />
              </Pressable>
              {isPoncho && (
                <Pressable accessibilityRole="link" accessibilityLabel="Visit Poncho's direct booking website" onPress={() => openLink('https://ponchotheartist.com/booking/')} style={styles.bookingLink} testID="creator-direct-booking">
                  <Text style={styles.bookingText}>Prefer to book a slot directly? Visit ponchotheartist.com/booking/.</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={selectedPost !== null} animationType="fade" onRequestClose={() => setSelectedPost(null)}>
        <View style={styles.lightbox} accessibilityViewIsModal testID="creator-artwork-preview">
          <View style={styles.lightboxHeader}>
            <Text style={styles.lightboxTitle} numberOfLines={1}>{displayName}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close artwork preview" onPress={() => setSelectedPost(null)} style={styles.headerAction} testID="creator-artwork-close">
              <Feather name="x" size={20} color={colors.studioInk} />
            </Pressable>
          </View>
          {selectedPost?.imageUrl && <StudioImage uri={resolveImageUrl(selectedPost.imageUrl)!} contentFit="contain" style={styles.lightboxImage} />}
          <ScrollView style={styles.lightboxCopy}>
            <Text style={styles.caption}>{selectedPost?.caption}</Text>
            <View style={styles.tags}>
              {selectedPost?.tags?.map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}
            </View>
            {selectedPost && <Text style={styles.date}>{new Date(selectedPost.createdAt).toLocaleDateString()}</Text>}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
