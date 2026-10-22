import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  postCount?: number;
  followingCount?: number;
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
  onAddWork?: () => void;
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
  onMessage,
  messageBusy = false,
  inquiryAvailable = false,
  onInquiry,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [videosMuted, setVideosMuted] = useState(true);
  const [selectedPost, setSelectedPost] = useState<StudioPost | null>(null);
  const safeName = creator.username.replace(/^@/, '');
  const profileLabel = [creator.discipline?.trim(), creator.location?.trim()].filter(Boolean).join(' · ');
  const isPoncho = safeName.toLowerCase() === 'ponchotheartist';
  const topInsetFallback = Platform.OS === 'web' && windowWidth <= 500 ? 56 : 8;
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
    headerAddAction: {
      width: 44, height: 44, borderRadius: 99, borderWidth: 1.5,
      borderColor: colors.studioInk, backgroundColor: colors.studioOrange,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.studioInk, shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
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
    ownerLinkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    link: {
      minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7,
      borderRadius: 99, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper,
      shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    editProfileLink: {
      minWidth: 44, height: 44, paddingHorizontal: 12, justifyContent: 'center',
      backgroundColor: colors.studioYellow,
    },
    stats: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
      paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1,
      borderColor: colors.border,
    },
    statItem: { alignItems: 'center', gap: 2, minWidth: 70 },
    statValue: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 14 },
    statLabel: { color: colors.studioMuted, fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.5 },
    actions: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
    action: {
      minHeight: 44, paddingHorizontal: 12,
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7,
      borderWidth: 1.5, borderColor: colors.studioInk, borderRadius: 99,
      backgroundColor: colors.studioPaper, shadowColor: colors.studioInk,
      shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    actionText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    workSection: { borderTopWidth: 1.5, borderTopColor: colors.studioInk, paddingTop: 20, gap: 14 },
    retryText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 11, textAlign: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: gridGap },
    tile: {
      borderRadius: 15, borderWidth: 1.5, borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper, overflow: 'hidden',
      shadowColor: colors.studioShadow, shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    media: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.studioPaperAlt },
    featuredMedia: { aspectRatio: 4 / 3 },
    postCopy: { paddingHorizontal: 10, paddingVertical: 9, gap: 5 },
    caption: { color: colors.studioInk, fontFamily: 'DMSans_500Medium', fontSize: 12, lineHeight: 17 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    tag: { color: colors.studioOrangeText, fontFamily: 'DMSans_700Bold', fontSize: 10 },
    postActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 9, paddingBottom: 8 },
    date: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 10 },
    contact: {
      marginTop: 10, padding: 14, borderWidth: 1.5, borderColor: colors.studioInk,
      borderRadius: 18, backgroundColor: colors.studioMint, shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    contactButton: {
      minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.ink,
      borderRadius: 13, backgroundColor: colors.studioInquiry, shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    contactButtonText: { flexShrink: 1, textAlign: 'center', color: colors.studioInquiryForeground, fontFamily: 'DMSans_700Bold', fontSize: 13, lineHeight: 18 },
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
            accessibilityLabel="Add new work"
            onPress={onAddWork}
            style={styles.headerAddAction}
            testID="creator-profile-add-work"
          >
            <Feather name="plus" size={19} color={colors.studioInk} />
          </Pressable>
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
              <Text style={styles.name} accessibilityRole="header">{displayName}</Text>
              {!!profileLabel && <Text style={styles.eyebrow} testID="creator-profile-label">{profileLabel}</Text>}
              {creator.bio?.trim() ? <Text style={styles.bio}>{creator.bio.trim()}</Text> : null}
              {isOwner && (
                <View style={styles.ownerLinkRow} testID="creator-profile-owner-links">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile"
                    onPress={onEdit}
                    style={[styles.link, styles.editProfileLink]}
                    testID="edit-profile-navigation"
                  >
                    <Feather name="edit-2" size={13} color={colors.studioInk} />
                    <Text style={styles.actionText}>Edit Profile</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {!isOwner && (
            <View style={styles.actions}>
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
            <View style={styles.stats} testID="creator-profile-stats">
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{creator.postCount ?? posts.length}</Text>
                <Text style={styles.statLabel}>WORKS</Text>
              </View>
              <View style={styles.statItem} testID="creator-following-stat">
                <Text style={styles.statValue}>{creator.followingCount ?? 0}</Text>
                <Text style={styles.statLabel}>FOLLOWING</Text>
              </View>
            </View>

          {isLoading ? (
            <View style={styles.empty}><ActivityIndicator color={colors.primary} /><Text style={styles.emptyText}>Loading artwork…</Text></View>
          ) : isError ? (
            <View style={styles.empty}>
              <Feather name="wifi-off" size={25} color={colors.studioMuted} />
              <Text style={styles.emptyTitle}>Work could not load</Text>
              <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
            </View>
           ) : posts.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="image" size={25} color={colors.studioMuted} />
              <Text style={styles.emptyTitle}>{isOwner ? 'Your first piece is waiting.' : 'Work is coming soon.'}</Text>
              {isOwner ? <Text style={styles.emptyText}>Share a piece and it will live here.</Text> : null}
            </View>
          ) : (
            <View style={styles.grid} testID="creator-work-grid">
              {posts.map((post, index) => {
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
                      null
                    ) : (
                      <>
                        {post.caption && mediaUrl ? <View style={styles.postCopy}><Text style={styles.caption} numberOfLines={2}>{post.caption}</Text></View> : null}
                        {post.tags?.length ? <View style={[styles.tags, { paddingHorizontal: 10, paddingBottom: 8 }]}>{post.tags.slice(0, 2).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}
                        <View style={styles.postActions}>
                          <Text style={styles.date}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                          {isOwner && currentUserId ? (
                            <PostOwnerActions
                              post={post}
                              currentUserId={currentUserId}
                            />
                          ) : null}
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
              <Pressable accessibilityRole="button" onPress={onInquiry} style={styles.contactButton} testID="creator-profile-inquiry-bottom">
                <Text style={styles.contactButtonText}>{isPoncho ? 'Start a Commission Inquiry' : 'Start an inquiry'}</Text>
                <Feather name="arrow-up-right" size={17} color={colors.studioInquiryForeground} />
              </Pressable>
            </View>
          )}

        </View>
      </ScrollView>

      <Modal visible={selectedPost !== null} animationType="fade" onRequestClose={() => setSelectedPost(null)}>
        <View style={styles.lightbox} accessibilityViewIsModal testID="creator-artwork-preview">
          <View style={styles.lightboxHeader}>
            <Text style={styles.lightboxTitle} numberOfLines={1}>{displayName}</Text>
            {selectedPost && isOwner && currentUserId && (
              <PostOwnerActions
                post={selectedPost}
                currentUserId={currentUserId}
              />
            )}
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
