import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  useListStudioPosts,
  useCreateStudioPost,
  useGetCurrentUser,
} from '@workspace/api-client-react';
import PostCard from '@/components/PostCard';

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [composing, setComposing] = useState(false);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: posts, isLoading, isError, refetch } = useListStudioPosts();
  const { data: me } = useGetCurrentUser();

  const createMutation = useCreateStudioPost({
    mutation: {
      onSuccess: () => {
        refetch();
        setComposing(false);
        setCaption('');
        setTags('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSubmit = () => {
    if (!caption.trim()) return;
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    createMutation.mutate({ data: { caption: caption.trim(), tags: tagList } });
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 8;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: topPad,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 24,
      color: colors.primary,
      letterSpacing: 3,
    },
    greeting: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      color: colors.mutedForeground,
    },
    composeBtn: {
      width: 38,
      height: 38,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: { paddingBottom: Platform.OS === 'web' ? 100 : 100 },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 100,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 16,
      color: colors.foreground,
    },
    emptyText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.mutedForeground,
    },
    retryBtn: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    retryText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 14,
      color: colors.foreground,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.75)',
    },
    sheet: {
      backgroundColor: colors.card,
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 20,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    sheetTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 16,
      color: colors.foreground,
    },
    postBtn: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
      color: colors.primary,
    },
    captionInput: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 16,
      color: colors.foreground,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    tagsInput: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.foreground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
  }), [colors, insets, topPad]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>AIMD</Text>
          {me && <Text style={s.greeting}>@{me.username}</Text>}
        </View>
        <TouchableOpacity
          style={s.composeBtn}
          onPress={() => {
            setComposing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          testID="compose-button"
        >
          <Feather name="edit-2" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={s.centered}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>Couldn't load feed</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PostCard post={item} onRefresh={refetch} />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <Feather name="image" size={48} color={colors.muted} />
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptyText}>Share what you're creating</Text>
            </View>
          }
        />
      )}

      <Modal visible={composing} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <TouchableOpacity onPress={() => setComposing(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
              <Text style={s.sheetTitle}>Studio Post</Text>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!caption.trim() || createMutation.isPending}
              >
                <Text style={[s.postBtn, { opacity: caption.trim() ? 1 : 0.35 }]}>
                  {createMutation.isPending ? '...' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="What are you working on?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              autoFocus
            />
            <TextInput
              style={s.tagsInput}
              value={tags}
              onChangeText={setTags}
              placeholder="Tags: painting, figure, composition"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
