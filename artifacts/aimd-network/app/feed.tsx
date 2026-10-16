import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
import { useAuth } from '@clerk/expo';
import {
  uploadStudioMedia,
  MAX_STUDIO_VIDEO_BYTES,
  MAX_STUDIO_AUDIO_BYTES,
  STUDIO_PORTRAIT_RATIO,
  type StudioMedia,
  type StudioUploadStatus,
} from '@/lib/studioMedia';
import { runExclusiveSubmission } from '@/lib/submissionLock';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListStudioPostsQueryKey,
  useListStudioPosts,
  useCreateStudioPost,
  useGetCurrentUser,
  type StudioPost,
} from '@workspace/api-client-react';
import PostCard from '@/components/PostCard';
import AudioTrackPlayer from '@/components/AudioTrackPlayer';
import FollowingFeedSuggestions from '@/components/FollowingFeedSuggestions';
import ComposerVideoPreview from '@/components/ComposerVideoPreview';
import FeedScopeTabs, { type FeedScope } from '@/components/FeedScopeTabs';
import FeedNavigation, { feedControlsInset } from '@/components/FeedNavigation';
import WorkshopsScreen from './(tabs)/workshops';
import ChallengesScreen from './(tabs)/challenges';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

const MAX_STUDIO_VIDEO_DURATION_MS = 60 * 1000;
const FEED_MUTED_PREFERENCE_KEY = 'aimd:feed-videos-muted';

export default function FeedScreen({ embedded = false, onCommunitySectionChange }: {
  embedded?: boolean;
  onCommunitySectionChange?: (section: 'creators' | 'events') => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { compose } = useLocalSearchParams<{ compose?: string }>();
  const queryClient = useQueryClient();
  const feedRef = useRef<FlatList<StudioPost>>(null);
  const [composing, setComposing] = useState(false);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<StudioMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const submittingRef = useRef(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<StudioUploadStatus | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [videosMuted, setVideosMuted] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedMode, setFeedMode] = useState<'all' | 'following'>('all');
  const [scope, setScope] = useState<FeedScope>('community');
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const pagerViewportRef = useRef<View>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const topPad = embedded ? 0 : Platform.OS === 'web' ? 67 : insets.top + 8;
  const pageHeight = pagerHeight || Math.max(480, windowHeight - topPad - 112);
  const previousPageHeight = useRef(pageHeight);
  const syncPagerHeight = useCallback((height: number) => {
    const nextHeight = Math.round(height);
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
    setPagerHeight((previous) => previous === nextHeight ? previous : nextHeight);
  }, []);

  useEffect(() => {
    // A safe-area/rotation/header resize must not leave the feed between rows.
    if (previousPageHeight.current === pageHeight) return;
    previousPageHeight.current = pageHeight;
    feedRef.current?.scrollToOffset({ offset: activeIndex * pageHeight, animated: false });
  }, [pageHeight, activeIndex]);

  useEffect(() => {
    if (!embedded && compose === '1') {
      setScope('community');
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

  const { data: postsResponse, isLoading, isError, refetch } = useListStudioPosts(
    { followingOnly: feedMode === 'following' ? 'true' : 'false' },
    {
      query: {
        queryKey: getListStudioPostsQueryKey({ followingOnly: feedMode === 'following' ? 'true' : 'false' }),
        enabled: scope === 'community',
      },
      request: {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      },
    },
  );
  const postsInvalid = postsResponse != null && !Array.isArray(postsResponse);
  const posts = useMemo(() => Array.isArray(postsResponse) ? postsResponse.filter(post => post != null && typeof post.id === 'number') : [], [postsResponse]);
  const { data: me } = useGetCurrentUser();

  useEffect(() => {
    if (posts && activeIndex >= posts.length && activeIndex > 0) {
      const next = Math.max(0, posts.length - 1);
      setActiveIndex(next);
      feedRef.current?.scrollToOffset({ offset: next * pageHeight, animated: false });
    }
  }, [posts?.length, activeIndex, pageHeight]);

  useEffect(() => {
    // Measure the actual scroll host after data mounts. A wrapper's onLayout
    // can be missed on web, leaving embedded rows at the full-screen estimate.
    const frame = requestAnimationFrame(() => {
      const onMeasured = (_x: number, _y: number, _width: number, height: number) => {
        syncPagerHeight(height);
      };
      const scrollHost = feedRef.current?.getNativeScrollRef();
      if (scrollHost && 'measure' in scrollHost) {
        scrollHost.measure(onMeasured);
      } else {
        pagerViewportRef.current?.measure(onMeasured);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isLoading, posts?.length, feedMode, windowHeight, windowWidth, syncPagerHeight]);

  const createMutation = useCreateStudioPost({
    mutation: {
      onSuccess: (createdPost) => {
        const allPostsQueryKey = getListStudioPostsQueryKey({
          followingOnly: 'false',
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
        Alert.alert(
          'Post failed',
          message.includes('timed out')
            ? 'The connection timed out. Your draft is still here. Check your feed before sharing again, in case the post was already received.'
            : message,
        );
      },
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
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
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      mediaType,
    });
    setComposing(true);
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
      videoMaxDuration: 60,
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
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
      setComposing(true);
    } catch {
      Alert.alert('Could not open audio files', 'Try again and choose a track saved in Files on your device.');
    }
  };

  const handleSubmit = async () => {
    if (!composing || !caption.trim()) return;
    await runExclusiveSubmission(submittingRef, async () => {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      let imageUrl: string | undefined;
      try {
        if (selectedMedia) {
          setUploading(true);
          setUploadProgress(0);
          try {
            const objectPath = await uploadStudioMedia(
              selectedMedia,
              getToken,
              (status) => {
                setUploadStatus(status);
                setUploadProgress(status.progress ?? 0);
              },
            );
            imageUrl = `/api/storage${objectPath}`;
            setUploadStatus(null);
            setUploadProgress(1);
          } catch (error) {
            Alert.alert(
              'Upload failed',
              error instanceof Error ? error.message : 'Could not upload this media. Try a smaller file.',
            );
            return;
          }
        }
        try {
          // Keep the lock through publishing, not just the media upload.
          await createMutation.mutateAsync({
            data: {
              caption: caption.trim(),
              tags: tagList,
              ...(selectedMedia ? { imageUrl, mediaType: selectedMedia.mediaType } : {}),
            },
          });
        } catch {
          // The mutation's onError shows the error; keep the draft for retry.
        }
      } finally {
        setUploading(false);
        setUploadStatus(null);
      }
    });
  };

  const isPending = uploading || createMutation.isPending;
  const cancelComposer = () => {
    if (submittingRef.current || isPending) return;
    setComposing(false);
    setSelectedMedia(null);
    setCaption('');
    setTags('');
    setUploadProgress(0);
  };

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
          backgroundColor: colors.background,
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
          maxHeight: Math.max(240, windowHeight - insets.top - 12),
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 20,
          borderTopLeftRadius: colors.radius,
          borderTopRightRadius: colors.radius,
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
        composerFooter: {
          flexDirection: 'row',
          gap: 12,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        composerButton: {
          flex: 1,
          minHeight: 48,
          padding: 12,
          borderRadius: colors.radius,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        },
        composerButtonText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: colors.foreground },
        mediaPreview: { width: '100%', aspectRatio: STUDIO_PORTRAIT_RATIO, borderRadius: colors.radius, backgroundColor: colors.muted },
        previewFrame: { width: '100%', maxWidth: Math.min(280, (windowHeight * 0.42) * STUDIO_PORTRAIT_RATIO), alignSelf: 'center' },
        inputLabel: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.foreground, marginVertical: 10 },
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
    [colors, insets, topPad, windowHeight],
  );

  return (
    <View style={[s.container, scope === 'community' && { backgroundColor: colors.ink }]}>
      {scope !== 'community' && <><View style={s.header}>
         {!embedded && (
           <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to community"
             onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/community')} hitSlop={12}>
             <Feather name="arrow-left" size={24} color={colors.foreground} />
           </TouchableOpacity>
         )}
        <View style={s.headerCopy}>
          {!embedded && <Text style={s.headerEyebrow}>Creator Studio</Text>}
          <Text style={s.headerTitle}>{scope === 'masterclasses' ? 'Masterclasses' : 'My challenges'}</Text>
          {!embedded && <Text style={s.headerHint}>{scope === 'masterclasses' ? 'Learn from working creators' : 'Your creative practice'}</Text>}
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
      </View>
      <FeedScopeTabs scope={scope} onChange={(next) => { setScope(next); setActiveIndex(0); }} /></>}
      {scope === 'masterclasses' ? <WorkshopsScreen embedded /> : scope === 'challenges' ? <ChallengesScreen embedded /> : <>
      <FeedNavigation mode={feedMode} onModeChange={handleFeedModeChange}
        menuOpen={navigationOpen} onMenuOpenChange={setNavigationOpen}
        onScopeChange={(next) => { setScope(next); setActiveIndex(0); }}
        onCommunitySectionChange={onCommunitySectionChange}
        onCompose={() => { setComposing(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
        activeIndex={activeIndex} postCount={posts.length} embedded={embedded} />

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError || postsInvalid ? (
        <View style={s.centered}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>Couldn't load feed</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          ref={pagerViewportRef}
          style={s.pagerViewport}
          onLayout={(event) => {
            syncPagerHeight(event.nativeEvent.layout.height);
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
                  active={!composing && !navigationOpen && index === activeIndex}
                  preload={!composing && !navigationOpen && !reduceMotion && index === activeIndex + 1}
                  contentTopInset={feedControlsInset(insets.top, Platform.OS === 'web')}
                  reducedMotion={reduceMotion}
                  muted={videosMuted}
                  onMutedChange={handleMutedChange}
                />
              </View>
            )}
            style={s.pager}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            onLayout={(event) => syncPagerHeight(event.nativeEvent.layout.height)}
            showsVerticalScrollIndicator={false}
            pagingEnabled={(posts?.length ?? 0) > 0}
            snapToInterval={posts?.length ? pageHeight : undefined}
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
              const visibleHeight = Math.round(event.nativeEvent.layoutMeasurement.height);
              syncPagerHeight(visibleHeight);
              const currentPageHeight = Number.isFinite(visibleHeight) && visibleHeight > 0 ? visibleHeight : pageHeight;
              const nextIndex = Math.round(event.nativeEvent.contentOffset.y / currentPageHeight);
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
              feedMode === 'following' ? (
                <View style={{ minHeight: pageHeight, paddingTop: feedControlsInset(insets.top, Platform.OS === 'web'), backgroundColor: colors.background }}>
                  <FollowingFeedSuggestions currentUserId={me?.id} />
                </View>
              ) : (
                <View style={[s.centered, { height: pageHeight }]}>
                  <Feather name="image" size={48} color={colors.muted} />
                  <Text style={s.emptyTitle}>No posts yet</Text>
                  <Text style={s.emptyText}>Share what you’re creating</Text>
                </View>
              )
            }
          />
        </View>
      )}
      </>}

      <Modal visible={composing} animationType="slide" transparent
        onRequestClose={cancelComposer}>
        <KeyboardAvoidingView
          behavior="padding"
          style={s.modalOverlay}
        >
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{selectedMedia ? 'Preview your post' : 'Studio Post'}</Text>
            </View>

            <KeyboardAwareScrollViewCompat bottomOffset={20} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flexShrink: 1 }}>
            {composing && selectedMedia && (
              <View testID="compose-media-preview" style={selectedMedia.mediaType !== 'audio' ? s.previewFrame : undefined}>
                {selectedMedia.mediaType === 'image' ? (
                  <Image source={{ uri: selectedMedia.uri }} style={s.mediaPreview} resizeMode="cover" accessibilityLabel="Selected photo in a centered 9 by 16 portrait frame" />
                ) : selectedMedia.mediaType === 'video' ? (
                  <ComposerVideoPreview key={selectedMedia.uri} uri={selectedMedia.uri} active={composing && !isPending} />
                ) : (
                  <AudioTrackPlayer key={selectedMedia.uri} uri={selectedMedia.uri} title={selectedMedia.fileName} active={composing && !isPending} />
                )}
              </View>
            )}
            {selectedMedia && selectedMedia.mediaType !== 'audio' && (
              <Text style={s.mediaHint}>9:16 portrait frame · centered crop. Review the framing before posting.</Text>
            )}
            <Text style={s.inputLabel}>Caption</Text>
            <TextInput
              style={s.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="What are you working on?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              accessibilityLabel="Post caption"
              testID="compose-caption"
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
              <View style={s.imageRow}>
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
                {uploadStatus?.progress != null && <View style={s.uploadTrack}>
                  <View
                    style={[
                      s.uploadFill,
                      { width: `${Math.round(uploadProgress * 100)}%` },
                    ]}
                  />
                </View>}
                <Text style={s.uploadText}>
                  {!uploadStatus && uploadProgress >= 1
                    ? 'Publishing post…'
                    : uploadStatus?.phase === 'preparing' ? 'Optimizing media…'
                      : uploadStatus?.phase === 'processing' ? 'Upload complete. Checking media…'
                        : uploadStatus?.progress != null ? `Uploading media… ${Math.round(uploadProgress * 100)}%` : 'Uploading media…'}
                </Text>
              </View>
            ) : null}

            <Text style={s.inputLabel}>Tags (comma-separated)</Text>
            <TextInput
              style={s.tagsInput}
              value={tags}
              onChangeText={setTags}
              editable={!isPending}
              placeholder="Tags: painting, figure, composition"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              accessibilityLabel="Post tags"
              testID="compose-tags"
            />
            </KeyboardAwareScrollViewCompat>
            <View style={s.composerFooter}>
              <TouchableOpacity style={s.composerButton} onPress={cancelComposer} disabled={isPending}
                accessibilityRole="button" testID="compose-cancel">
                <Text style={s.composerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.composerButton, { backgroundColor: colors.primary, opacity: !caption.trim() || isPending ? 0.5 : 1 }]}
                onPress={handleSubmit} disabled={!caption.trim() || isPending}
                accessibilityRole="button" testID="compose-confirm">
                {isPending ? <ActivityIndicator color={colors.primaryForeground} /> : (
                  <Text style={[s.composerButtonText, { color: colors.primaryForeground }]}>Confirm &amp; Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
