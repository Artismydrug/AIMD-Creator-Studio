import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
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
  useWindowDimensions,
  AccessibilityInfo,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import AudioTrackPlayer from '@/components/AudioTrackPlayer';

const MAX_STUDIO_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_STUDIO_VIDEO_DURATION_MS = 60 * 1000;
const MAX_STUDIO_AUDIO_BYTES = 25 * 1024 * 1024;
const FEED_MUTED_PREFERENCE_KEY = 'aimd:feed-videos-muted';

type SelectedMedia = {
  uri: string;
  contentType: string;
  fileName: string;
  fileSize?: number;
  duration?: number | null;
  mediaType: 'image' | 'video' | 'audio';
};

/** Upload creator media directly to the API server. Returns the objectPath. */
async function uploadMediaToServer(
  uri: string,
  contentType: string,
  mediaType: 'image' | 'video' | 'audio',
  onProgress: (progress: number) => void,
): Promise<string> {
  onProgress(0.1);
  const fileResponse = await fetch(uri);
  const arrayBuffer = await fileResponse.arrayBuffer();

  if (mediaType === 'video' && arrayBuffer.byteLength > MAX_STUDIO_VIDEO_BYTES) {
    throw new Error('Video must be 50 MB or smaller.');
  }
  if (mediaType === 'audio' && arrayBuffer.byteLength > MAX_STUDIO_AUDIO_BYTES) {
    throw new Error('Audio must be 25 MB or smaller.');
  }

  onProgress(0.35);
  const result = await customFetch<{ objectPath: string }>('/api/storage/uploads', {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'X-AIMD-UPLOAD-PURPOSE': 'studio_post',
    },
    body: arrayBuffer,
  });
  onProgress(1);
  return result.objectPath;
}

export default function FeedScreen({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { compose } = useLocalSearchParams<{ compose?: string }>();
  const queryClient = useQueryClient();
  const feedRef = useRef<FlatList<StudioPost>>(null);
  const [composing, setComposing] = useState(false);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [videosMuted, setVideosMuted] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const topPad = embedded ? 0 : Platform.OS === 'web' ? 67 : insets.top + 8;
  const pageHeight = pagerHeight || Math.max(480, windowHeight - topPad - 112);

  useEffect(() => {
    if (!embedded && compose === '1') {
      setComposing(true);
    }
  }, [compose, embedded]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    AsyncStorage.getItem(FEED_MUTED_PREFERENCE_KEY)
      .then((value) => {
        if (value !== null) setVideosMuted(value !== 'false');
      })
      .catch(() => undefined);
    return () => subscription.remove();
  }, []);

  const handleMutedChange = useCallback((muted: boolean) => {
    setVideosMuted(muted);
    AsyncStorage.setItem(FEED_MUTED_PREFERENCE_KEY, String(muted)).catch(
      () => undefined,
    );
  }, []);

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
        setActiveIndex(0);
        requestAnimationFrame(() => feedRef.current?.scrollToOffset({ offset: 0, animated: false }));
        queryClient.invalidateQueries({
          queryKey: ['/api/studio-posts'],
          refetchType: 'inactive',
        });
        setComposing(false);
        setCaption('');
        setTags('');
        setSelectedMedia(null);
        setUploadProgress(0);
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

  const usePickedMedia = (asset: ImagePicker.ImagePickerAsset) => {
    const mediaType = asset.type === 'video' ? 'video' : 'image';
    if (
      mediaType === 'video' &&
      asset.duration != null &&
      asset.duration > MAX_STUDIO_VIDEO_DURATION_MS
    ) {
      Alert.alert('Video is too long', 'Choose a video that is 60 seconds or shorter.');
      return;
    }
    if (
      mediaType === 'video' &&
      asset.fileSize != null &&
      asset.fileSize > MAX_STUDIO_VIDEO_BYTES
    ) {
      Alert.alert('Video is too large', 'Choose a video that is 50 MB or smaller.');
      return;
    }

    const ext = (
      asset.uri.split('.').pop() ?? (mediaType === 'video' ? 'mp4' : 'jpg')
    )
      .split('?')[0]
      .toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      webm: 'video/webm',
    };
    setSelectedMedia({
      uri: asset.uri,
      contentType:
        asset.mimeType ??
        mimeMap[ext] ??
        (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
      fileName: asset.fileName ?? `studio-media.${ext}`,
      fileSize: asset.fileSize,
      duration: asset.duration,
      mediaType,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      usePickedMedia(result.assets[0]);
    }
  };

  const handlePickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow access to your media library to choose a short video.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) usePickedMedia(result.assets[0]);
  };

  const handleRecordVideo = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera access needed',
        'Allow camera access to record a Studio video.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      videoMaxDuration: 60,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (!result.canceled && result.assets[0]) usePickedMedia(result.assets[0]);
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const extension = asset.name.split('.').pop()?.toLowerCase() ?? '';
      const formats: Record<string, string> = {
        mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav',
      };
      const contentType = formats[extension];
      if (!contentType) {
        Alert.alert('Unsupported audio format', 'Choose an MP3, M4A, AAC, or WAV file.');
        return;
      }
      if (asset.size != null && asset.size > MAX_STUDIO_AUDIO_BYTES) {
        Alert.alert('Audio is too large', 'Choose an audio track that is 25 MB or smaller.');
        return;
      }
      setSelectedMedia({
        uri: asset.uri, fileName: asset.name, fileSize: asset.size,
        contentType, mediaType: 'audio',
      });
    } catch {
      Alert.alert('Could not open audio files', 'Try again and choose a track saved in Files on your device.');
    }
  };

  const handleSubmit = async () => {
    if (!caption.trim()) return;
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (!selectedMedia) {
      createMutation.mutate({ data: { caption: caption.trim(), tags: tagList } });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const objectPath = await uploadMediaToServer(
        selectedMedia.uri,
        selectedMedia.contentType,
        selectedMedia.mediaType,
        setUploadProgress,
      );
      const imageUrl = `/api/storage${objectPath}`;
      createMutation.mutate({
        data: {
          caption: caption.trim(),
          tags: tagList,
          imageUrl,
          mediaType: selectedMedia.mediaType,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not upload this media. Try a smaller file.';
      Alert.alert('Upload failed', message);
    } finally {
      setUploading(false);
    }
  };

  const isPending = uploading || createMutation.isPending;

  const handleFeedModeChange = (mode: 'all' | 'following') => {
    setFeedMode(mode);
    setActiveIndex(0);
  };

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
        headerCopy: {
          flex: 1,
          minWidth: 0,
        },
        headerEyebrow: {
          fontFamily: 'DMSans_700Bold',
          fontSize: 10,
          color: colors.sunsetCoral,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          marginBottom: 2,
        },
        headerTitle: {
          fontFamily: 'DMSans_700Bold',
          fontSize: 21,
          color: colors.foreground,
          letterSpacing: -0.2,
        },
        headerHint: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: colors.mutedForeground,
          marginTop: 2,
        },
        composeBtn: {
          width: 42,
          height: 42,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 21,
          shadowColor: colors.primary,
          shadowOpacity: 0.22,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        },
        profileBtn: {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 20,
          backgroundColor: colors.card,
        },
        filterBar: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: colors.background,
        },
        filterGroup: {
          flexDirection: 'row',
          gap: 8,
          padding: 3,
          borderRadius: 99,
          backgroundColor: colors.muted,
        },
        filterButton: {
          borderRadius: 99,
          paddingVertical: 8,
          paddingHorizontal: 13,
        },
        filterText: {
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 12,
        },
        feedCount: {
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 11,
          color: colors.mutedForeground,
          letterSpacing: 0.5,
        },
        pagerViewport: {
          flex: 1,
          minHeight: 0,
        },
        pager: {
          flex: 1,
        },
        page: {
          width: '100%',
          flexGrow: 0,
          flexShrink: 0,
        },
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
          maxHeight: '92%',
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
        mediaActions: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        },
        mediaHint: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: colors.mutedForeground,
          marginTop: 8,
        },
        videoPreview: {
          width: 92,
          height: 72,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          backgroundColor: colors.ink,
          borderRadius: colors.radius,
        },
        videoPreviewText: {
          color: '#FFFFFF',
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 10,
        },
        selectedMediaName: {
          flex: 1,
          fontFamily: 'DMSans_500Medium',
          fontSize: 12,
          color: colors.mutedForeground,
        },
        uploadStatus: {
          marginTop: 12,
          gap: 6,
        },
        uploadTrack: {
          height: 5,
          overflow: 'hidden',
          backgroundColor: colors.muted,
          borderRadius: 99,
        },
        uploadFill: {
          height: '100%',
          backgroundColor: colors.primary,
          borderRadius: 99,
        },
        uploadText: {
          fontFamily: 'DMSans_500Medium',
          fontSize: 12,
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
        <View style={s.headerCopy}>
          <Text style={s.headerEyebrow}>Creator Studio</Text>
          <Text style={s.headerTitle}>Studio Feed</Text>
          <Text style={s.headerHint}>Swipe up to explore</Text>
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
          accessibilityRole="button"
          accessibilityLabel="Create a new studio post"
          style={s.composeBtn}
          onPress={() => {
            setComposing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          testID="create-studio-post"
        >
          <Feather name="edit-2" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
      <View style={s.filterBar}>
        <View style={s.filterGroup}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Show all posts"
            accessibilityState={{ selected: feedMode === 'all' }}
            onPress={() => handleFeedModeChange('all')}
            style={[s.filterButton, feedMode === 'all' && { backgroundColor: colors.primary }]}
            testID="feed-filter-all"
          >
            <Text style={[s.filterText, { color: feedMode === 'all' ? colors.primaryForeground : colors.foreground }]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Show posts from creators you follow"
            accessibilityState={{ selected: feedMode === 'following' }}
            onPress={() => handleFeedModeChange('following')}
            style={[s.filterButton, feedMode === 'following' && { backgroundColor: colors.primary }]}
            testID="feed-filter-following"
          >
            <Text style={[s.filterText, { color: feedMode === 'following' ? colors.primaryForeground : colors.foreground }]}>Following</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.feedCount}>
          {posts?.length ? `${Math.min(activeIndex + 1, posts.length)} / ${posts.length}` : 'Ready to create'}
        </Text>
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
        <View
          style={s.pagerViewport}
          onLayout={(event) => {
            const nextHeight = Math.round(event.nativeEvent.layout.height);
            if (nextHeight > 0 && nextHeight !== pagerHeight) {
              setPagerHeight(nextHeight);
            }
          }}
        >
          <FlatList
            ref={feedRef}
            key={feedMode}
            data={posts ?? []}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <View
                style={[
                  s.page,
                  {
                    height: pageHeight,
                    minHeight: pageHeight,
                    maxHeight: pageHeight,
                  },
                ]}
              >
                <PostCard
                  post={item}
                  currentUserId={me?.id}
                  onFollowChanged={refetch}
                  onRefresh={refetch}
                  immersive
                  active={!composing && index === activeIndex}
                  reducedMotion={reduceMotion}
                  muted={videosMuted}
                  onMutedChange={handleMutedChange}
                />
              </View>
            )}
            style={s.pager}
            showsVerticalScrollIndicator={false}
            pagingEnabled
            snapToInterval={pageHeight}
            snapToOffsets={(posts ?? []).map((_, index) => index * pageHeight)}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: pageHeight,
              offset: pageHeight * index,
              index,
            })}
            onScroll={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.y / pageHeight);
              const boundedIndex = Math.max(0, Math.min(nextIndex, (posts?.length ?? 1) - 1));
              if (boundedIndex !== activeIndex) {
                setActiveIndex(boundedIndex);
              }
            }}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.y / pageHeight);
              setActiveIndex(Math.max(0, Math.min(nextIndex, (posts?.length ?? 1) - 1)));
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={[s.centered, { height: pageHeight }]}>
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
        </View>
      )}

      <Modal visible={composing} animationType="slide" transparent
        onRequestClose={() => { if (!isPending) setComposing(false); }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <TouchableOpacity
                disabled={isPending}
                onPress={() => {
                  setComposing(false);
                  setSelectedMedia(null);
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

            <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flexShrink: 1 }}>
            <TextInput
              style={s.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="What are you working on?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              autoFocus
              editable={!isPending}
            />

            <View style={s.mediaActions}>
              <TouchableOpacity style={s.imagePickerBtn} onPress={handlePickImage} disabled={isPending}>
                <Feather name="image" size={16} color={colors.mutedForeground} />
                <Text style={s.imagePickerText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.imagePickerBtn} onPress={handlePickVideo} disabled={isPending}>
                <Feather name="film" size={16} color={colors.mutedForeground} />
                <Text style={s.imagePickerText}>Choose video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.imagePickerBtn} onPress={handleRecordVideo} disabled={isPending}>
                <Feather name="video" size={16} color={colors.mutedForeground} />
                <Text style={s.imagePickerText}>Record</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.imagePickerBtn} onPress={handlePickAudio} disabled={isPending}
                accessibilityRole="button" accessibilityLabel="Choose an audio track from Files" testID="compose-pick-audio">
                <Feather name="music" size={16} color={colors.mutedForeground} />
                <Text style={s.imagePickerText}>Audio</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.mediaHint}>Video: 60 sec / 50 MB. Audio: MP3, M4A, AAC, WAV · 10 min / 25 MB.</Text>

            {selectedMedia ? (
              <>
              {selectedMedia.mediaType === 'audio' && (
                <AudioTrackPlayer uri={selectedMedia.uri} title={selectedMedia.fileName} active={composing && !isPending} />
              )}
              <View style={s.imageRow}>
                {selectedMedia.mediaType === 'image' ? (
                  <Image
                    source={{ uri: selectedMedia.uri }}
                    style={s.previewThumb}
                    resizeMode="cover"
                  />
                ) : selectedMedia.mediaType === 'video' ? (
                  <View style={s.videoPreview}>
                    <Feather name="play-circle" size={24} color="#FFFFFF" />
                    <Text style={s.videoPreviewText}>
                      {selectedMedia.duration
                        ? `${Math.ceil(selectedMedia.duration / 1000)} sec`
                        : 'Video ready'}
                    </Text>
                  </View>
                ) : <Feather name="music" size={22} color={colors.primary} />}
                <Text style={s.selectedMediaName} numberOfLines={1}>
                  {selectedMedia.fileName}
                </Text>
                <TouchableOpacity
                  style={s.removeImgBtn}
                  disabled={isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Remove attached media"
                  onPress={() => setSelectedMedia(null)}
                >
                  <Feather name="x-circle" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              </>
            ) : null}

            {uploading ? (
              <View style={s.uploadStatus}>
                <View style={s.uploadTrack}>
                  <View
                    style={[
                      s.uploadFill,
                      { width: `${Math.max(8, Math.round(uploadProgress * 100))}%` },
                    ]}
                  />
                </View>
                <Text style={s.uploadText}>
                  {uploadProgress < 0.35 ? 'Preparing media…' : 'Uploading media…'}
                </Text>
              </View>
            ) : null}

            <TextInput
              style={s.tagsInput}
              value={tags}
              onChangeText={setTags}
              editable={!isPending}
              placeholder="Tags: painting, figure, composition"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
            />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
