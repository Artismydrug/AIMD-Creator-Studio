import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
  useLikeStudioPost,
  useListPostComments,
  getListPostCommentsQueryKey,
  useAddPostComment,
  useFollowUser,
  useUnfollowUser,
  getBaseUrl,
} from '@workspace/api-client-react';
import type { StudioPost } from '@workspace/api-client-react';
import { useRouter } from 'expo-router';
import SafetyActions from '@/components/SafetyActions';
import StudioVideo from '@/components/StudioVideo';

/** Resolve a relative imageUrl (e.g. /api/storage/objects/…) to an absolute URL for React Native. */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
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
  reducedMotion?: boolean;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
}

export default function PostCard({
  post,
  currentUserId,
  onFollowChanged,
  onRefresh,
  immersive = false,
  active = false,
  reducedMotion = false,
  muted = true,
  onMutedChange = () => undefined,
}: PostCardProps) {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [followedByMe, setFollowedByMe] = useState(post.followedByMe);
  const [followerCount, setFollowerCount] = useState(post.followerCount);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const frameColors = [colors.primary, colors.sunsetCoral, colors.cyan, colors.gold];
  const frameColor = frameColors[post.id % frameColors.length];

  const likeMutation = useLikeStudioPost({
    mutation: {
      onSuccess: (data) => {
        setLiked(data.likedByMe ?? !liked);
        setLikeCount(data.likes);
      },
    },
  });

  const { data: comments, isLoading: commentsLoading, refetch: refetchComments } = useListPostComments(
    post.id,
    { query: { queryKey: getListPostCommentsQueryKey(post.id), enabled: showComments } }
  );

  const addCommentMutation = useAddPostComment({
    mutation: {
      onSuccess: () => {
        setCommentText('');
        refetchComments();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const isOwnPost = currentUserId === post.userId;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
    likeMutation.mutate({ id: post.id });
  };

  const handleOpenComments = () => {
    setShowComments(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate({ id: post.id, data: { content: commentText.trim() } });
  };

  const s = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius + 2,
      padding: 14,
      marginHorizontal: 12,
      marginTop: 12,
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
    },
    mediaSurface: {
      flex: 1,
      backgroundColor: colors.ink,
      overflow: 'hidden',
    },
    immersiveImage: {
      ...StyleSheet.absoluteFillObject,
      width: undefined,
      height: undefined,
    },
    immersiveVideo: {
      ...StyleSheet.absoluteFillObject,
    },
    immersiveFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      backgroundColor: colors.ink,
    },
    fallbackMark: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      marginBottom: 18,
    },
    fallbackEyebrow: {
      color: colors.cyan,
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    fallbackCaption: {
      color: '#FFFFFF',
      fontFamily: 'DMSans_700Bold',
      fontSize: 26,
      lineHeight: 32,
      textAlign: 'center',
      marginTop: 10,
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
      borderRadius: 99,
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
      aspectRatio: 1,
      backgroundColor: colors.muted,
    },
    postVideo: {
      width: '100%',
      aspectRatio: 1,
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
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionCount: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 13,
      color: colors.mutedForeground,
    },
    // Comments modal
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    commentsSheet: {
      backgroundColor: colors.card,
      maxHeight: '70%',
      paddingTop: 12,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 12,
    },
    commentsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    commentsTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 16,
      color: colors.foreground,
    },
    commentItem: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: 'row',
      gap: 10,
    },
    commentContent: { flex: 1 },
    commentUsername: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.foreground,
      marginBottom: 2,
    },
    commentText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 10,
    },
    input: {
      flex: 1,
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.foreground,
      backgroundColor: colors.input,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    sendBtn: {
      padding: 6,
    },
    emptyComments: {
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.mutedForeground,
    },
  }), [colors]);

  return (
    <>
      {immersive ? (
        <View style={s.immersiveCard}>
          <View style={s.mediaSurface}>
            {resolveImageUrl(post.imageUrl) && post.mediaType === 'video' ? (
              <StudioVideo
                uri={resolveImageUrl(post.imageUrl)!}
                active={active}
                reducedMotion={reducedMotion}
                muted={muted}
                onMutedChange={onMutedChange}
                style={s.immersiveVideo}
              />
            ) : resolveImageUrl(post.imageUrl) ? (
              <Image
                source={{ uri: resolveImageUrl(post.imageUrl)! }}
                style={s.immersiveImage}
                resizeMode="cover"
              />
            ) : (
              <View style={s.immersiveFallback}>
                <View style={s.fallbackMark}>
                  <Feather
                    name={post.mediaType === 'video' ? 'play' : 'aperture'}
                    size={32}
                    color={colors.primaryForeground}
                  />
                </View>
                <Text style={s.fallbackEyebrow}>
                  {post.mediaType === 'video' ? 'Video post' : 'Creator in progress'}
                </Text>
              </View>
            )}

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

            <View style={s.immersiveContent}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Open ${post.username ?? 'creator'} profile`}
                onPress={() => router.push(`/creator/${post.userId}`)}
                style={s.immersiveAuthorButton}
              >
                <View style={s.immersiveAvatarFrame}>
                  <Avatar username={post.username} avatarUrl={post.userAvatarUrl} size={42} />
                </View>
                <View style={s.immersiveUserInfo}>
                  <Text style={s.immersiveUsername} numberOfLines={1}>
                    {post.username ?? `User #${post.userId}`}
                  </Text>
                  <Text style={s.immersiveMeta}>
                    {formatTime(post.createdAt)} · {followerCount} followers
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={s.immersiveCaption} numberOfLines={4}>{post.caption}</Text>
              {post.tags && post.tags.length > 0 && (
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
                  style={[s.immersiveFollow, followedByMe && s.immersiveFollowSelected]}
                  testID={`follow-user-${post.userId}`}
                >
                  <Feather
                    name={followedByMe ? 'check' : 'plus'}
                    size={22}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${liked ? 'Unlike' : 'Like'} post`}
                accessibilityState={{ selected: liked, busy: likeMutation.isPending }}
                style={s.immersiveAction}
                onPress={handleLike}
                testID={`like-post-${post.id}`}
              >
                <View style={s.immersiveActionIcon}>
                  <Feather name="heart" size={22} color={liked ? colors.primary : '#FFFFFF'} />
                </View>
                <Text style={s.immersiveActionCount}>{likeCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open critiques"
                style={s.immersiveAction}
                onPress={handleOpenComments}
                testID={`comment-post-${post.id}`}
              >
                <View style={s.immersiveActionIcon}>
                  <Feather name="message-circle" size={21} color="#FFFFFF" />
                </View>
                <Text style={s.immersiveActionCount}>Critique</Text>
              </TouchableOpacity>

              {!isOwnPost && (
                <SafetyActions
                  userId={post.userId}
                  username={post.username}
                  postId={post.id}
                  onBlocked={() => onRefresh?.()}
                  triggerColor="#FFFFFF"
                />
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={[s.card, { borderTopColor: frameColor, borderTopWidth: 4 }]}>
          <View style={s.cardHeader}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Open ${post.username ?? 'creator'} profile`}
              onPress={() => router.push(`/creator/${post.userId}`)}
              style={s.authorButton}
            >
              <Avatar username={post.username} avatarUrl={post.userAvatarUrl} />
              <View style={s.userInfo}>
                <Text style={s.username}>{post.username ?? `User #${post.userId}`}</Text>
                <Text style={s.time}>{formatTime(post.createdAt)}</Text>
                <Text style={s.socialMeta}>{followerCount} followers · {post.followingCount} following</Text>
              </View>
            </TouchableOpacity>
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

          <Text style={s.caption}>{post.caption}</Text>

          {resolveImageUrl(post.imageUrl) ? (
            <View style={[s.imageFrame, { borderColor: frameColor }]}>
              {post.mediaType === 'video' ? (
                <StudioVideo
                  uri={resolveImageUrl(post.imageUrl)!}
                  active={active}
                  reducedMotion={reducedMotion}
                  muted={muted}
                  onMutedChange={onMutedChange}
                  style={s.postVideo}
                />
              ) : (
                <Image
                  source={{ uri: resolveImageUrl(post.imageUrl)! }}
                  style={s.postImage}
                  resizeMode="cover"
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

          <View style={s.actions}>
            <TouchableOpacity accessibilityLabel="Like post" style={s.actionBtn} onPress={handleLike} testID={`like-post-${post.id}`}>
              <Feather
                name={liked ? 'heart' : 'heart'}
                size={18}
                color={liked ? colors.primary : colors.mutedForeground}
              />
              <Text style={[s.actionCount, liked && { color: colors.primary }]}>{likeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity accessibilityLabel="Open critiques" style={s.actionBtn} onPress={handleOpenComments} testID={`comment-post-${post.id}`}>
              <Feather name="message-circle" size={18} color={colors.mutedForeground} />
              <Text style={s.actionCount}>Critique</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showComments} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.commentsSheet}>
            <View style={s.sheetHandle} />
            <View style={s.commentsHeader}>
              <Text style={s.commentsTitle}>Critiques</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {commentsLoading ? (
              <View style={s.emptyComments}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={c => String(c.id)}
                renderItem={({ item }) => (
                  <View style={s.commentItem}>
                    <Avatar username={item.username} avatarUrl={item.avatarUrl} size={28} />
                    <View style={s.commentContent}>
                      <Text style={s.commentUsername}>{item.username}</Text>
                      <Text style={s.commentText}>{item.content}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={s.emptyComments}>
                    <Text style={s.emptyText}>No critiques yet — share your thoughts</Text>
                  </View>
                }
              />
            )}

            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a critique..."
                placeholderTextColor={colors.mutedForeground}
              />
              <TouchableOpacity
                style={s.sendBtn}
                onPress={handleSendComment}
                disabled={!commentText.trim() || addCommentMutation.isPending}
                testID="send-comment"
              >
                <Feather
                  name="send"
                  size={20}
                  color={commentText.trim() ? colors.primary : colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
