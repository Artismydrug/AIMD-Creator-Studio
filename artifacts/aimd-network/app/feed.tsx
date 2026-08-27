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
  Image,
  Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListStudioPostsQueryKey,
  useListStudioPosts,
  useCreateStudioPost,
  useGetCurrentUser,
  customFetch,
  type StudioPost,
} from '@workspace/api-client-react';
import PostCard from '@/components/PostCard';

/** Upload an image directly to the API server. Returns the objectPath. */
async function uploadImageToServer(
  uri: string,
  contentType: string,
): Promise<string> {
  const fileResponse = await fetch(uri);
  const arrayBuffer = await fileResponse.arrayBuffer();

  const result = await customFetch<{ objectPath: string }>('/api/storage/uploads', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: arrayBuffer,
  });
  return result.objectPath;
}

export default function FeedScreen({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [selectedImage, setSelectedImage] = useState<{
    uri: string;
    contentType: string;
    fileName: string;
    fileSize: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');

  const { data: posts, isLoading, isError, refetch } = useListStudioPosts(
    { followingOnly: feedMode === 'following' },
    {
      request: {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      },
    },
  );
  const { data: me } = useGetCurrentUser();

  const createMutation = useCreateStudioPost({
    mutation: {
      onSuccess: (createdPost) => {
        const allPostsQueryKey = getListStudioPostsQueryKey({
          followingOnly: false,
        });
        queryClient.setQueryData<StudioPost[]>(
          allPostsQueryKey,
          (currentPosts = []) => {
            if (currentPosts.some((post) => post.id === createdPost.id)) {
              return currentPosts;
            }
            return [createdPost, ...currentPosts];
          },
        );
        setFeedMode('all');
        queryClient.invalidateQueries({
          queryKey: ['/api/studio-posts'],
          refetchType: 'inactive',
        });
        setComposing(false);
        setCaption('');
        setTags('');
        setSelectedImage(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : 'Could not publish your post.';
        Alert.alert('Post failed', message);
      },
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow access to your photo library to attach images.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        heic: 'image/heic',
      };
      const contentType = mimeMap[ext] ?? 'image/jpeg';
      setSelectedImage({
        uri: asset.uri,
        contentType,
        fileName: asset.fileName ?? `photo.${ext}`,
        fileSize: asset.fileSize ?? 1,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSubmit = async () => {
    if (!caption.trim()) return;
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (!selectedImage) {
      createMutation.mutate({ data: { caption: caption.trim(), tags: tagList } });
      return;
    }

    setUploading(true);
    try {
      const objectPath = await uploadImageToServer(
        selectedImage.uri,
        selectedImage.contentType,
      );
      const imageUrl = `/api/storage${objectPath}`;
      createMutation.mutate({
        data: { caption: caption.trim(), tags: tagList, imageUrl },
      });
    } catch (err) {
      Alert.alert('Upload failed', 'Could not upload the image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const isPending = uploading || createMutation.isPending;
   const topPad = embedded ? 0 : Platform.OS === 'web' ? 67 : insets.top + 8;

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: topPad,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 16,
        },
        headerTitle: {
          fontFamily: 'DMSans_700Bold',
          fontSize: 20,
          color: colors.foreground,
          letterSpacing: 1,
        },
        composeBtn: {
          width: 38,
          height: 38,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: colors.radius || 0,
        },
        profileBtn: {
          width: 38,
          height: 38,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: colors.radius || 0,
        },
        filterBar: {
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        filterButton: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: colors.radius || 0,
          paddingVertical: 7,
          paddingHorizontal: 12,
        },
        filterText: {
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 13,
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
        imageRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 12,
        },
        imagePickerBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderWidth: 1,
          borderColor: colors.border,
        },
        imagePickerText: {
          fontFamily: 'DMSans_500Medium',
          fontSize: 13,
          color: colors.mutedForeground,
        },
        previewThumb: {
          width: 56,
          height: 56,
          borderRadius: 4,
        },
        removeImgBtn: {
          padding: 4,
        },
        tagsInput: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 14,
          color: colors.foreground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 12,
        },
      }),
    [colors, insets, topPad],
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
         {!embedded && (
           <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
             <Feather name="arrow-left" size={24} color={colors.foreground} />
           </TouchableOpacity>
         )}
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Studio Feed</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open your profile"
          onPress={() => router.push('/profile')}
          style={s.profileBtn}
          testID="open-profile"
        >
          <Feather name="user" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.composeBtn}
          onPress={() => {
            setComposing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <Feather name="edit-2" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
      <View style={s.filterBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Show all posts"
          accessibilityState={{ selected: feedMode === 'all' }}
          onPress={() => setFeedMode('all')}
          style={[s.filterButton, feedMode === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          testID="feed-filter-all"
        >
          <Text style={[s.filterText, { color: feedMode === 'all' ? colors.primaryForeground : colors.foreground }]}>All Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Show posts from creators you follow"
          accessibilityState={{ selected: feedMode === 'following' }}
          onPress={() => setFeedMode('following')}
          style={[s.filterButton, feedMode === 'following' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          testID="feed-filter-following"
        >
          <Text style={[s.filterText, { color: feedMode === 'following' ? colors.primaryForeground : colors.foreground }]}>Following Only</Text>
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
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={me?.id}
              onFollowChanged={refetch}
              onRefresh={refetch}
            />
          )}
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
              <Text style={s.emptyTitle}>{feedMode === 'following' ? 'Your following feed is quiet' : 'No posts yet'}</Text>
              <Text style={s.emptyText}>
                {feedMode === 'following'
                  ? 'Follow creators to see their studio posts here.'
                  : 'Share what you’re creating'}
              </Text>
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
              <TouchableOpacity
                onPress={() => {
                  setComposing(false);
                  setSelectedImage(null);
                  setCaption('');
                  setTags('');
                }}
              >
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
              <Text style={s.sheetTitle}>Studio Post</Text>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!caption.trim() || isPending}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[s.postBtn, { opacity: caption.trim() ? 1 : 0.35 }]}>
                    Share
                  </Text>
                )}
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

            <View style={s.imageRow}>
              <TouchableOpacity style={s.imagePickerBtn} onPress={handlePickImage}>
                <Feather name="image" size={16} color={colors.mutedForeground} />
                <Text style={s.imagePickerText}>
                  {selectedImage ? 'Change photo' : 'Add photo'}
                </Text>
              </TouchableOpacity>
              {selectedImage && (
                <>
                  <Image
                    source={{ uri: selectedImage.uri }}
                    style={s.previewThumb}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={s.removeImgBtn}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Feather name="x-circle" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </>
              )}
            </View>

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
