import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateConversation,
  useFollowUser,
  useUnfollowUser,
  getBaseUrl,
} from '@workspace/api-client-react';
import type { StudioPost } from '@workspace/api-client-react';
import { useRouter } from 'expo-router';
import SafetyActions from '@/components/SafetyActions';
import StudioVideo from '@/components/StudioVideo';
import AudioTrackPlayer from '@/components/AudioTrackPlayer';
import TextPostBody from '@/components/TextPostBody';
import PostOwnerActions from '@/components/PostOwnerActions';
import { fitMediaFrame, portraitFrame, studioPhotoRatio, STUDIO_PORTRAIT_RATIO } from '@/lib/studioMedia';
import StudioImage from '@/components/StudioImage';

/** Resolve a relative imageUrl (e.g. /api/storage/objects/…) to an absolute URL for React Native. */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  url = url.trim();
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = getBaseUrl();
  return base ? `${base}${url}` : url;
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Avatar({ username, avatarUrl, size = 36 }: { username?: string; avatarUrl?: string | null; size?: number }) {
  const colors = useColors();
  const initials = (username ?? '?').slice(0, 2).toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.muted,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {resolveImageUrl(avatarUrl) ? (
        <Image source={{ uri: resolveImageUrl(avatarUrl)! }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: colors.primary, fontFamily: 'DMSans_600SemiBold', fontSize: size * 0.38 }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

interface PostCardProps {
  post: StudioPost;
  currentUserId?: number;
  onFollowChanged?: () => void;
  onRefresh?: () => void;
  immersive?: boolean;
  active?: boolean;
  preload?: boolean;
  contentTopInset?: number;
  reducedMotion?: boolean;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
}

function PostCard({
  post,
  currentUserId,
  onFollowChanged,
  onRefresh,
  immersive = false,
  active = false,
  preload = false,
  contentTopInset = 0,
  reducedMotion = false,
  muted = true,
  onMutedChange = () => undefined,
}: PostCardProps) {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [followedByMe, setFollowedByMe] = useState(post.followedByMe);
  const [followerCount, setFollowerCount] = useState(post.followerCount);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const window = useWindowDimensions();
  const [viewport, setViewport] = useState({ width: window.width, height: window.height });
  const [photoMetadata, setPhotoMetadata] = useState<{ uri: string; ratio: number } | null>(null);
  const [photoFooterHeight, setPhotoFooterHeight] = useState(150);
  const mediaUri = resolveImageUrl(post.imageUrl);
  const isPhoto = !!mediaUri && post.mediaType !== 'video' && post.mediaType !== 'audio';
  const photoRatio = photoMetadata?.uri === mediaUri ? photoMetadata.ratio : 4 / 5;
  const photoAreaHeight = Math.max(1, viewport.height - contentTopInset - photoFooterHeight - 40);
  const photoFrame = fitMediaFrame(viewport.width, photoAreaHeight, photoRatio);
  const handlePhotoDimensions = (width: number, height: number) => {
    const ratio = studioPhotoRatio(width, height);
    setPhotoMetadata(previous => previous?.uri === mediaUri && previous.ratio === ratio
      ? previous : { uri: mediaUri!, ratio });
  };
  const mediaFrame = portraitFrame(viewport.width, viewport.height);
  const frameColors = [colors.primary, colors.sunsetCoral, colors.cyan, colors.gold];
  const frameColor = frameColors[post.id % frameColors.length];
  const isTextOnly = !resolveImageUrl(post.imageUrl);

  const createConversation = useCreateConversation({
    mutation: {
      onSuccess: (conversation) => {
        router.push({
          pathname: '/conversation/[id]',
          params: { id: conversation.id, name: post.username ?? 'Messages' },
        });
      },
      onError: () => {
        Alert.alert('Could not start a message', 'Please try again in a moment.');
      },
    },
  });

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const isOwnPost = currentUserId === post.userId;
  const canMessageCreator = !!currentUserId && !isOwnPost;

  const handleMessage = () => {
    if (canMessageCreator && !createConversation.isPending) {
      createConversation.mutate({ data: { participantIds: [post.userId] } });
    }
  };

  const handleFollow = () => {
    const wasFollowing = followedByMe;
    setFollowedByMe(!wasFollowing);
    setFollowerCount((count) => Math.max(0, count + (wasFollowing ? -1 : 1)));
    const mutation = wasFollowing ? unfollowMutation : followMutation;
    mutation.mutate(
      { id: post.userId },
      {
        onSuccess: (relationship) => {
          setFollowedByMe(relationship.followedByMe);
          setFollowerCount(relationship.followerCount);
          queryClient.invalidateQueries({ queryKey: ['/api/studio-posts'] });
          onFollowChanged?.();
        },
        onError: () => {
          setFollowedByMe(wasFollowing);
          setFollowerCount((count) => Math.max(0, count + (wasFollowing ? 1 : -1)));
        },
      },
    );
  };

  const s = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.foreground,
      borderRadius: 24,
      padding: 14,
      marginHorizontal: 12,
      marginTop: 12,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    immersiveCard: {
      flex: 1,
      width: '100%',
      margin: 0,
      padding: 0,
      borderWidth: 0,
      borderRadius: 0,
      overflow: 'hidden',
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mediaSurface: {
      flex: 1,
      backgroundColor: colors.ink,
      overflow: 'hidden',
    },
    portraitSurface: {
      // CSS `flex: 0` uses a zero flex-basis on web and overrides the frame's
      // explicit height, clipping both the media and its creator controls.
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto',
    },
    immersiveImage: {
      ...StyleSheet.absoluteFillObject,
      width: undefined,
      height: undefined,
    },
    immersiveVideo: {
      ...StyleSheet.absoluteFillObject,
    },
    textPostSurface: { backgroundColor: colors.card },
    textPostFooter: {
      position: 'relative',
      left: 0,
      right: 0,
      bottom: 0,
      paddingLeft: 16,
      paddingRight: 84,
      paddingTop: 12,
      paddingBottom: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    audioSurface: {
      flex: 1,
      justifyContent: 'center',
      paddingLeft: 20,
      paddingRight: 80,
      paddingBottom: 140,
      gap: 18,
    },
    topGradient: {
      ...StyleSheet.absoluteFillObject,
      height: '42%',
      bottom: undefined,
    },
    bottomGradient: {
      ...StyleSheet.absoluteFillObject,
      height: '58%',
      top: undefined,
    },
    immersiveContent: {
      position: 'absolute',
      left: 16,
      right: 84,
      bottom: 28,
    },
    immersiveAuthorButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    immersiveAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    ownerActionsSurface: { borderRadius: 22, backgroundColor: 'rgba(23,52,58,0.72)' },
    immersiveAvatarFrame: {
      borderWidth: 2,
      borderColor: '#FFFFFF',
      borderRadius: 23,
    },
    immersiveUserInfo: {
      flex: 1,
      minWidth: 0,
    },
    immersiveUsername: {
      color: '#FFFFFF',
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
    },
    immersiveMeta: {
      color: 'rgba(255,255,255,0.78)',
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      marginTop: 2,
    },
    immersiveCaption: {
      color: '#FFFFFF',
      fontFamily: 'DMSans_500Medium',
      fontSize: 17,
      lineHeight: 23,
      marginBottom: 10,
    },
    immersiveTagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    immersiveTag: {
      color: '#FFFFFF',
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 11,
      backgroundColor: 'rgba(23,52,58,0.68)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 99,
    },
    immersiveActions: {
      position: 'absolute',
      right: 12,
      bottom: 28,
      alignItems: 'center',
      gap: 16,
    },
    immersiveAction: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      minWidth: 44,
    },
    immersiveActionIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(23,52,58,0.72)',
    },
    immersiveActionCount: {
      color: '#FFFFFF',
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 11,
    },
    immersiveFollow: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    immersiveFollowSelected: {
      backgroundColor: 'rgba(23,52,58,0.72)',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 10,
    },
    userInfo: { flex: 1 },
    username: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 14,
      color: colors.foreground,
    },
    time: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    authorButton: {
      alignItems: 'center',
      flexDirection: 'row',
      flex: 1,
      gap: 10,
    },
    socialMeta: {
      color: colors.mutedForeground,
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      marginTop: 1,
    },
    followButton: {
      borderColor: colors.primary,
      borderRadius: 99,
      borderWidth: 1,
      minWidth: 74,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    followButtonText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 12,
      textAlign: 'center',
    },
    caption: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 22,
      marginBottom: 12,
    },
    writingLabel: {
      fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.4,
      color: colors.primary, marginBottom: 10, textTransform: 'uppercase',
    },
    scriptBody: {
      backgroundColor: colors.coralWash, padding: 17, borderRadius: 18,
      borderWidth: 1.5, borderColor: colors.foreground, marginBottom: 12,
      shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 3 },
      shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    tag: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 11,
      color: colors.primary,
      backgroundColor: colors.magentaWash,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.foreground,
      borderRadius: 9,
    },
    imageFrame: {
      position: 'relative',
      borderRadius: colors.radius,
      borderWidth: 3,
      overflow: 'hidden',
      marginBottom: 12,
    },
    postImage: {
      width: '100%',
      aspectRatio: STUDIO_PORTRAIT_RATIO,
      backgroundColor: colors.muted,
    },
    postVideo: {
      width: '100%',
      aspectRatio: STUDIO_PORTRAIT_RATIO,
    },
    imageStamp: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    messageAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
    },
    messageActionText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 13,
      color: colors.primary,
    },
  }), [colors]);

  return (
    <>
      {immersive ? (
        <View style={s.immersiveCard} onLayout={({ nativeEvent: { layout } }) => {
          if (layout.width > 0 && layout.height > 0) {
            setViewport(previous => previous.width === layout.width && previous.height === layout.height
              ? previous : { width: layout.width, height: layout.height });
          }
        }} testID={`feed-post-${post.id}`}>
          <View
            testID={`feed-media-frame-${post.id}`}
            style={[s.mediaSurface,
              !isTextOnly && post.mediaType === 'video' ? [s.portraitSurface, mediaFrame] : { width: '100%' },
              (isTextOnly || post.mediaType === 'audio') && { paddingTop: contentTopInset },
              isTextOnly && s.textPostSurface]}
          >
            {resolveImageUrl(post.imageUrl) && post.mediaType === 'audio' ? (
              <View style={s.audioSurface}>
                <Feather name="music" size={50} color={colors.cyan} />
                <AudioTrackPlayer uri={resolveImageUrl(post.imageUrl)!} active={active && !ownerDialogOpen} />
              </View>
            ) : resolveImageUrl(post.imageUrl) && post.mediaType === 'video' ? (
              <StudioVideo
                uri={resolveImageUrl(post.imageUrl)!}
                active={active && !ownerDialogOpen}
                preload={preload && !ownerDialogOpen}
                reducedMotion={reducedMotion}
                muted={muted}
                onMutedChange={onMutedChange}
                style={s.immersiveVideo}
                controlsTopInset={Math.max(14, contentTopInset - (viewport.height - mediaFrame.height) / 2 + 8)}
              />
            ) : resolveImageUrl(post.imageUrl) ? (
              <StudioImage
                uri={resolveImageUrl(post.imageUrl)!}
                load={active || preload}
                onLoadDimensions={handlePhotoDimensions}
                style={{
                  position: 'absolute',
                  width: photoFrame.width,
                  height: photoFrame.height,
                  left: (viewport.width - photoFrame.width) / 2,
                  top: contentTopInset + (photoAreaHeight - photoFrame.height) / 2,
                }}
              />
            ) : (
              <TextPostBody postId={post.id} caption={post.caption} tags={post.tags} />
            )}

            {!isTextOnly && !isPhoto && (
            <>
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(23,52,58,0.78)', 'transparent']}
              style={s.topGradient}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', 'rgba(23,52,58,0.96)']}
              style={s.bottomGradient}
            />
            </>
            )}

            <View onLayout={isPhoto ? ({ nativeEvent: { layout } }) => {
              setPhotoFooterHeight(previous => Math.abs(previous - layout.height) > 1 ? layout.height : previous);
            } : undefined} style={[
              s.immersiveContent,
              isTextOnly && s.textPostFooter,
              isOwnPost && (isTextOnly ? { paddingRight: 16 } : { right: 16 }),
            ]}>
              <View style={s.immersiveAuthorRow}>
              <View style={[s.immersiveAuthorButton, { flex: 1, marginBottom: 0 }]}>
                <View style={[s.immersiveAvatarFrame, isTextOnly && { borderColor: colors.border }]}>
                  <Avatar username={post.username} avatarUrl={post.userAvatarUrl} size={42} />
                </View>
                <View style={s.immersiveUserInfo}>
                  <Text style={[s.immersiveUsername, isTextOnly && { color: colors.foreground }]} numberOfLines={1}>
                    {post.username ?? `User #${post.userId}`}
                  </Text>
                  <Text style={[s.immersiveMeta, isTextOnly && { color: colors.mutedForeground }]}>
                    {formatTime(post.createdAt)} · {followerCount} followers
                  </Text>
                </View>
              </View>
              {isOwnPost && (
                <View style={[s.ownerActionsSurface, isTextOnly && { backgroundColor: colors.muted }]}>
                  <PostOwnerActions
                    post={post}
                    currentUserId={currentUserId}
                    triggerColor={isTextOnly ? colors.foreground : '#FFFFFF'}
                    onVisibilityChange={setOwnerDialogOpen}
                  />
                </View>
              )}
              </View>

              {!isTextOnly && <Text style={s.immersiveCaption} numberOfLines={4}>{post.caption}</Text>}
              {!isTextOnly && post.tags && post.tags.length > 0 && (
                <View style={s.immersiveTagsRow}>
                  {post.tags.slice(0, 4).map((tag, i) => (
                    <Text key={i} style={s.immersiveTag}>#{tag}</Text>
                  ))}
                </View>
              )}
            </View>

            <View style={s.immersiveActions}>
              {!isOwnPost && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${followedByMe ? 'Unfollow' : 'Follow'} ${post.username ?? 'creator'}`}
                  accessibilityState={{
                    selected: followedByMe,
                    busy: followMutation.isPending || unfollowMutation.isPending,
                  }}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  onPress={handleFollow}
                  style={[
                    s.immersiveFollow,
                    followedByMe && s.immersiveFollowSelected,
                    isTextOnly && { borderColor: colors.border },
                    isTextOnly && followedByMe && { backgroundColor: colors.muted },
                  ]}
                  testID={`follow-user-${post.userId}`}
                >
                  <Feather
                    name={followedByMe ? 'check' : 'plus'}
                    size={22}
                    color={isTextOnly && followedByMe ? colors.foreground : '#FFFFFF'}
                  />
                </TouchableOpacity>
              )}

              {canMessageCreator && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Message ${post.username ?? 'creator'}`}
                accessibilityState={{ busy: createConversation.isPending }}
                disabled={createConversation.isPending}
                style={s.immersiveAction}
                onPress={handleMessage}
                testID={`message-creator-${post.userId}`}
              >
                <View style={[s.immersiveActionIcon, isTextOnly && { backgroundColor: colors.muted }]}>
                  <Feather name="message-circle" size={21} color={isTextOnly ? colors.foreground : '#FFFFFF'} />
                </View>
                <Text style={[s.immersiveActionCount, isTextOnly && { color: colors.foreground }]}>Message</Text>
              </TouchableOpacity>
              )}

              {!isOwnPost && (
                <SafetyActions
                  userId={post.userId}
                  username={post.username}
                  postId={post.id}
                  onBlocked={() => onRefresh?.()}
                  triggerColor={isTextOnly ? colors.foreground : '#FFFFFF'}
                />
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={[s.card, { borderTopColor: frameColor, borderTopWidth: 4 }]}>
          <View style={s.cardHeader}>
            <View style={s.authorButton}>
              <Avatar username={post.username} avatarUrl={post.userAvatarUrl} />
              <View style={s.userInfo}>
                <Text style={s.username}>{post.username ?? `User #${post.userId}`}</Text>
                <Text style={s.time}>{formatTime(post.createdAt)}</Text>
                <Text style={s.socialMeta}>{followerCount} followers · {post.followingCount} following</Text>
              </View>
            </View>
            {isOwnPost && (
              <PostOwnerActions post={post} currentUserId={currentUserId} onVisibilityChange={setOwnerDialogOpen} />
            )}
            {!isOwnPost && (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${followedByMe ? 'Unfollow' : 'Follow'} ${post.username ?? 'creator'}`}
                  accessibilityState={{ selected: followedByMe, busy: followMutation.isPending || unfollowMutation.isPending }}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  onPress={handleFollow}
                  style={[s.followButton, followedByMe && { backgroundColor: colors.primary }]}
                  testID={`follow-user-${post.userId}`}
                >
                  <Text style={[s.followButtonText, { color: followedByMe ? colors.primaryForeground : colors.primary }]}>
                    {followedByMe ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                <SafetyActions
                  userId={post.userId}
                  username={post.username}
                  postId={post.id}
                  onBlocked={() => onRefresh?.()}
                />
              </>
            )}
          </View>

          {isTextOnly ? (
            <View style={s.scriptBody} testID={`script-post-card-${post.id}`}>
              <Text style={s.writingLabel}>Script & writing</Text>
              <Text style={[s.caption, { marginBottom: 0 }]} selectable>{post.caption}</Text>
            </View>
          ) : <Text style={s.caption}>{post.caption}</Text>}

          {resolveImageUrl(post.imageUrl) && post.mediaType === 'audio' ? (
            <AudioTrackPlayer uri={resolveImageUrl(post.imageUrl)!} active={!ownerDialogOpen} />
          ) : resolveImageUrl(post.imageUrl) ? (
            <View style={[s.imageFrame, { borderColor: frameColor }]}>
              {post.mediaType === 'video' ? (
                <StudioVideo
                  uri={resolveImageUrl(post.imageUrl)!}
                  active={active && !ownerDialogOpen}
                  reducedMotion={reducedMotion}
                  muted={muted}
                  onMutedChange={onMutedChange}
                  style={s.postVideo}
                />
              ) : (
                <StudioImage
                  uri={resolveImageUrl(post.imageUrl)!}
                  style={[s.postImage, { aspectRatio: photoRatio }]}
                  onLoadDimensions={handlePhotoDimensions}
                />
              )}
              <View style={s.imageStamp}>
                <Feather
                  name={post.mediaType === 'video' ? 'film' : 'aperture'}
                  size={15}
                  color={frameColor}
                />
              </View>
            </View>
          ) : null}

          {post.tags && post.tags.length > 0 && (
            <View style={s.tagsRow}>
              {post.tags.map((tag, i) => (
                <Text key={i} style={s.tag}>#{tag}</Text>
              ))}
            </View>
          )}

          {canMessageCreator && (
            <View style={s.actions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Message ${post.username ?? 'creator'}`}
                accessibilityState={{ busy: createConversation.isPending }}
                disabled={createConversation.isPending}
                onPress={handleMessage}
                style={s.messageAction}
                testID={`message-creator-${post.userId}`}
              >
                <Feather name="message-circle" size={18} color={colors.primary} />
                <Text style={s.messageActionText}>
                  {createConversation.isPending ? 'Opening message…' : 'Message'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

    </>
  );
}

export default React.memo(PostCard);
