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
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
  useLikeStudioPost,
  useListPostComments,
  getListPostCommentsQueryKey,
  useAddPostComment,
} from '@workspace/api-client-react';
import type { StudioPost } from '@workspace/api-client-react';

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
    }}>
      <Text style={{ color: colors.primary, fontFamily: 'DMSans_600SemiBold', fontSize: size * 0.38 }}>
        {initials}
      </Text>
    </View>
  );
}

interface PostCardProps {
  post: StudioPost;
  onRefresh?: () => void;
}

export default function PostCard({ post, onRefresh }: PostCardProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

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

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate({ id: post.id, data: { content: commentText.trim() } });
  };

  const s = useMemo(() => StyleSheet.create({
    card: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 16,
      paddingHorizontal: 16,
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
    caption: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 22,
      marginBottom: 10,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    tag: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      color: colors.primary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
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
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Avatar username={post.username} avatarUrl={post.userAvatarUrl} />
        <View style={s.userInfo}>
          <Text style={s.username}>{post.username ?? `User #${post.userId}`}</Text>
          <Text style={s.time}>{formatTime(post.createdAt)}</Text>
        </View>
      </View>

      <Text style={s.caption}>{post.caption}</Text>

      {post.tags && post.tags.length > 0 && (
        <View style={s.tagsRow}>
          {post.tags.map((tag, i) => (
            <Text key={i} style={s.tag}>#{tag}</Text>
          ))}
        </View>
      )}

      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={handleLike} testID={`like-post-${post.id}`}>
          <Feather
            name={liked ? 'heart' : 'heart'}
            size={18}
            color={liked ? colors.primary : colors.mutedForeground}
          />
          <Text style={[s.actionCount, liked && { color: colors.primary }]}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={handleOpenComments} testID={`comment-post-${post.id}`}>
          <Feather name="message-circle" size={18} color={colors.mutedForeground} />
          <Text style={s.actionCount}>Critique</Text>
        </TouchableOpacity>
      </View>

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
    </View>
  );
}
