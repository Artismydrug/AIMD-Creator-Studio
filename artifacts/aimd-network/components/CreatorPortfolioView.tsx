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
  TextInput,
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
  portfolioCategories?: CreatorPortfolioCategory[];
};

export type CreatorPortfolioCategory = {
  id: number | null;
  name: string;
  position: number;
};

export type CreatorPortfolioCategoryInput = {
  id?: number;
  legacyName?: string;
  name: string;
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
  onAddWork?: (categoryId: number | null, legacyCategoryName?: string) => void;
  onSaveCategories?: (categories: CreatorPortfolioCategoryInput[]) => Promise<CreatorPortfolioCategory[]>;
  onAssignWorkCategory?: (postId: number, categoryId: number | null) => Promise<void>;
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
  onSaveCategories,
  onAssignWorkCategory,
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
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [categoryDrafts, setCategoryDrafts] = useState<CreatorPortfolioCategoryInput[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryEditorBusy, setCategoryEditorBusy] = useState(false);
  const [categoryEditorError, setCategoryEditorError] = useState<string | null>(null);
  const [assigningPostId, setAssigningPostId] = useState<number | null>(null);
  const [categoryAssignmentBusy, setCategoryAssignmentBusy] = useState(false);
  const [categoryAssignmentError, setCategoryAssignmentError] = useState<string | null>(null);
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
    return [...tags].slice(0, 8);
  }, [posts]);
  const workCategories = useMemo<CreatorPortfolioCategory[]>(() => {
    if (creator.portfolioCategories !== undefined) {
      return [...creator.portfolioCategories].sort((a, b) => a.position - b.position);
    }
    if (!isPoncho) return categories.map((name, position) => ({ id: null, name, position }));
    const defaults = ['Tattoos', 'Painting', 'Murals'];
    const defaultKeys = new Set(defaults.map((name) => name.toLowerCase().replace(/s$/, '')));
    const additional = categories.filter((name) => !defaultKeys.has(name.toLowerCase().replace(/s$/, '')));
    return [
      ...defaults.map((name, position) => ({ id: null, name, position })),
      ...additional.map((name, index) => ({ id: null, name, position: defaults.length + index })),
    ];
  }, [categories, creator.portfolioCategories, isPoncho]);
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
    ownerLinkScroll: { width: '100%', flexGrow: 0, marginTop: 4 },
    ownerLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap', paddingRight: 2 },
    link: {
      minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7,
      borderRadius: 99, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper,
      shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    linkText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 11 },
    editProfileLink: {
      width: 44, height: 44, paddingHorizontal: 0, justifyContent: 'center',
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
    primaryAction: { backgroundColor: colors.primary },
    actionText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    primaryActionText: { color: colors.primaryForeground },
    workSection: { borderTopWidth: 1.5, borderTopColor: colors.studioInk, paddingTop: 20, gap: 14 },
    categoryScroll: { width: '100%' },
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
    categoryEditButton: {
      width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center',
      borderRadius: 99, borderWidth: 1.5, borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper, marginBottom: 4,
    },
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
    categoryOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.ink + 'BB' },
    categorySheet: {
      maxHeight: '88%', gap: 13, padding: 20,
      paddingBottom: Math.max(insets.bottom, 16) + 16,
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioPaper,
    },
    categorySheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    categorySheetTitle: { flex: 1, color: colors.studioInk, fontFamily: portfolioSerif, fontWeight: '700', fontSize: 24 },
    categorySheetNote: { color: colors.studioMuted, fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 },
    categoryDraftList: { gap: 8 },
    categoryDraftRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    categoryInput: {
      flex: 1, minWidth: 0, height: 44, paddingHorizontal: 12,
      borderRadius: 12, borderWidth: 1.5, borderColor: colors.studioInk,
      backgroundColor: colors.studioBackground, color: colors.studioInk,
      fontFamily: 'DMSans_500Medium', fontSize: 14,
    },
    categoryIconButton: {
      width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.studioPaper,
    },
    categoryAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    categoryAddButton: {
      minHeight: 44, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderWidth: 1.5, borderColor: colors.studioInk, borderRadius: 13,
      backgroundColor: colors.studioMint,
    },
    categoryAddText: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    categoryError: { color: colors.destructive, fontFamily: 'DMSans_500Medium', fontSize: 12 },
    categorySaveButton: {
      minHeight: 48, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: colors.studioInk, borderRadius: 13,
      backgroundColor: colors.studioOrange,
    },
    categorySaveText: { color: colors.ink, fontFamily: 'DMSans_700Bold', fontSize: 13 },
    categoryOption: {
      minHeight: 48, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10,
      borderWidth: 1.5, borderColor: colors.studioInk, borderRadius: 13, backgroundColor: colors.studioPaper,
    },
    categoryOptionSelected: { backgroundColor: colors.studioYellow },
    categoryOptionText: { flex: 1, color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 13 },
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
  const categoryKey = (category: CreatorPortfolioCategory) => category.id === null
    ? `legacy:${category.name.toLowerCase()}`
    : `id:${category.id}`;
  const activeCategory = selectedCategory === 'all'
    ? undefined
    : workCategories.find((category) => categoryKey(category) === selectedCategory);
  const filteredPosts = !activeCategory
    ? posts
    : posts.filter((post) => activeCategory.id !== null
      ? post.portfolioCategoryId === activeCategory.id
      : (post.tags ?? []).some((tag) => {
          const value = tag.trim().replace(/^#/, '').toLowerCase();
          const name = activeCategory.name.toLowerCase().replace(/s$/, '');
          if (name === 'tattoo') return value.includes('tattoo');
          if (name === 'painting') return value.includes('paint');
          if (name === 'mural') return value.includes('mural');
          return value === activeCategory.name.toLowerCase();
        }));

  const openCategoryEditor = () => {
    setCategoryDrafts(workCategories.map((category) => ({
      ...(category.id !== null ? { id: category.id } : {}),
      ...(category.id === null ? { legacyName: category.name } : {}),
      name: category.name,
    })));
    setNewCategoryName('');
    setCategoryEditorError(null);
    setCategoryEditorOpen(true);
  };
  const addCategoryDraft = () => {
    const name = newCategoryName.trim();
    if (!name || name.length > 32) {
      setCategoryEditorError('Use a category name with 1–32 characters.');
      return;
    }
    if (categoryDrafts.length >= 12) {
      setCategoryEditorError('You can create up to 12 categories.');
      return;
    }
    if (categoryDrafts.some((category) => category.name.trim().toLowerCase() === name.toLowerCase())) {
      setCategoryEditorError('That category already exists.');
      return;
    }
    setCategoryDrafts((current) => [...current, { name }]);
    setNewCategoryName('');
    setCategoryEditorError(null);
  };
  const updateCategoryDraft = (index: number, name: string) => {
    setCategoryDrafts((current) => current.map((category, i) => i === index ? { ...category, name } : category));
    setCategoryEditorError(null);
  };
  const removeCategoryDraft = (index: number) => {
    setCategoryDrafts((current) => current.filter((_, i) => i !== index));
  };
  const moveCategoryDraft = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= categoryDrafts.length) return;
    setCategoryDrafts((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const saveCategoryDrafts = async () => {
    if (!onSaveCategories || categoryEditorBusy) return;
    const cleanedNames = categoryDrafts.map((category) => category.name.trim().toLowerCase());
    if (
      categoryDrafts.some((category) => !category.name.trim()) ||
      new Set(cleanedNames).size !== cleanedNames.length
    ) {
      setCategoryEditorError('Add a name to every tab and use each name once.');
      return;
    }
    setCategoryEditorBusy(true);
    setCategoryEditorError(null);
    try {
      const saved = await onSaveCategories(categoryDrafts);
      const matchingSelection = activeCategory
        ? saved.find((category) => category.name.toLowerCase() === activeCategory.name.toLowerCase())
        : undefined;
      setSelectedCategory(matchingSelection ? categoryKey(matchingSelection) : 'all');
      setCategoryEditorOpen(false);
    } catch {
      setCategoryEditorError('Could not save categories. Your changes are still here; try again.');
    } finally {
      setCategoryEditorBusy(false);
    }
  };
  const assignCategory = async (postId: number, categoryId: number | null, legacyCategory?: CreatorPortfolioCategory) => {
    if (!onAssignWorkCategory || categoryAssignmentBusy) return;
    setCategoryAssignmentBusy(true);
    setCategoryAssignmentError(null);
    try {
      let assignedId = categoryId;
      if (legacyCategory && legacyCategory.id === null) {
        if (!onSaveCategories) throw new Error('Category editing is unavailable.');
        const saved = await onSaveCategories(workCategories.map((category) => ({
          ...(category.id !== null ? { id: category.id } : { legacyName: category.name }),
          name: category.name,
        })));
        const target = saved.find((category) => category.name === legacyCategory.name);
        if (target?.id == null) throw new Error('Category could not be saved.');
        assignedId = target.id;
      }
      await onAssignWorkCategory(postId, assignedId);
      setAssigningPostId(null);
    } catch {
      setCategoryAssignmentError('Could not update this work. Please try again.');
    } finally {
      setCategoryAssignmentBusy(false);
    }
  };

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
          <>
            {inquiryAvailable && (
              <Pressable accessibilityRole="button" accessibilityLabel="Open inquiry form" onPress={onInquiry} style={styles.inquiryPill} testID="creator-profile-inquiry">
                <Text style={styles.inquiryPillText}>Inquiry</Text>
                <Feather name="arrow-up-right" size={13} color={colors.studioInquiryForeground} />
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add new work"
              onPress={() => onAddWork?.(
                activeCategory?.id ?? null,
                activeCategory?.id === null ? activeCategory.name : undefined,
              )}
              style={styles.headerAddAction}
              testID="creator-profile-add-work"
            >
              <Feather name="plus" size={19} color={colors.studioInk} />
            </Pressable>
          </>
        ) : (
          <>
            <SafetyActions userId={creator.id} username={creator.username} />
            {inquiryAvailable && (
              <Pressable accessibilityRole="button" accessibilityLabel="Open inquiry form" onPress={onInquiry} style={styles.inquiryPill} testID="creator-profile-inquiry">
                <Text style={styles.inquiryPillText}>Inquiry</Text>
                <Feather name="arrow-up-right" size={13} color={colors.studioInquiryForeground} />
              </Pressable>
            )}
          </>
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
              {!isOwner && (website || isPoncho) && (
                <View style={styles.linkRow}>
                  {website && (
                    <Pressable accessibilityRole="link" accessibilityLabel="Visit artist website" onPress={() => openLink(website)} style={styles.link} testID="creator-website-link">
                      <Text style={styles.linkText}>Website</Text>
                      <Feather name="arrow-up-right" size={13} color={colors.studioInk} />
                    </Pressable>
                  )}
                  {isPoncho && !isOwner && (
                    <Pressable accessibilityRole="link" accessibilityLabel="Visit Poncho on Instagram" onPress={() => openLink('https://www.instagram.com/ponchotheartist/')} style={styles.link} testID="creator-instagram-link">
                      <Feather name="instagram" size={13} color={colors.studioInk} />
                      <Text style={styles.linkText}>Instagram</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {isOwner && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.ownerLinkScroll}
                  contentContainerStyle={styles.ownerLinkRow}
                  testID="creator-profile-owner-links"
                >
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
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile"
                    onPress={onEdit}
                    style={[styles.link, styles.editProfileLink]}
                    testID="edit-profile-navigation"
                  >
                    <Feather name="edit-2" size={13} color={colors.studioInk} />
                  </Pressable>
                </ScrollView>
              )}
            </View>
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
            <View style={styles.stats} testID="creator-profile-stats">
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{creator.postCount ?? posts.length}</Text>
                <Text style={styles.statLabel}>WORKS</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{creator.followerCount ?? 0}</Text>
                <Text style={styles.statLabel}>FOLLOWERS</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{creator.followingCount ?? 0}</Text>
                <Text style={styles.statLabel}>FOLLOWING</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} testID="creator-work-tabs">
              <View style={styles.categoryRow}>
                {workCategories.map((category) => {
                  const key = categoryKey(category);
                  const selected = selectedCategory === key;
                  const testKey = category.id === null
                    ? category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                    : String(category.id);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      accessibilityHint={selected ? 'Tap again to show every work.' : 'Show work in this category.'}
                      onPress={() => setSelectedCategory((current) => current === key ? 'all' : key)}
                      style={[styles.category, selected && styles.categorySelected]}
                      testID={`creator-work-filter-${testKey}`}
                    >
                      <Text style={[styles.categoryText, selected && { color: colors.ink }]}>{category.name}</Text>
                    </Pressable>
                  );
                })}
                {isOwner && onSaveCategories && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit work categories"
                    onPress={openCategoryEditor}
                    style={styles.categoryEditButton}
                    testID="creator-categories-edit"
                  >
                    <Feather name="edit-2" size={15} color={colors.studioInk} />
                  </Pressable>
                )}
              </View>
            </ScrollView>

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
                              onAssignCategory={onAssignWorkCategory ? () => {
                                setCategoryAssignmentError(null);
                                setAssigningPostId(post.id);
                              } : undefined}
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
            {selectedPost && isOwner && currentUserId && (
              <PostOwnerActions
                post={selectedPost}
                currentUserId={currentUserId}
                onAssignCategory={onAssignWorkCategory ? () => {
                  setCategoryAssignmentError(null);
                  setAssigningPostId(selectedPost.id);
                } : undefined}
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

      <Modal
        visible={categoryEditorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !categoryEditorBusy && setCategoryEditorOpen(false)}
      >
        <View style={styles.categoryOverlay}>
          <View style={styles.categorySheet} accessibilityViewIsModal testID="creator-category-editor">
            <View style={styles.categorySheetHeader}>
              <Text style={styles.categorySheetTitle} accessibilityRole="header">Work categories</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close category editor"
                disabled={categoryEditorBusy}
                onPress={() => setCategoryEditorOpen(false)}
                style={styles.headerAction}
                testID="creator-categories-close"
              >
                <Feather name="x" size={19} color={colors.studioInk} />
              </Pressable>
            </View>
            <Text style={styles.categorySheetNote}>
              Add, rename, reorder, or remove tabs. Removing a tab keeps its artwork in All work.
            </Text>
            <ScrollView style={{ flexGrow: 0, maxHeight: 300 }} contentContainerStyle={styles.categoryDraftList} keyboardShouldPersistTaps="handled">
              {categoryDrafts.map((category, index) => (
                <View key={category.id ?? `new-${index}`} style={styles.categoryDraftRow}>
                  <TextInput
                    accessibilityLabel={`Category ${index + 1} name`}
                    value={category.name}
                    onChangeText={(name) => updateCategoryDraft(index, name)}
                    maxLength={32}
                    autoCapitalize="words"
                    placeholder="Category name"
                    placeholderTextColor={colors.studioMuted}
                    style={styles.categoryInput}
                    testID={`creator-category-name-${index}`}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${category.name} up`}
                    disabled={index === 0}
                    onPress={() => moveCategoryDraft(index, -1)}
                    style={[styles.categoryIconButton, index === 0 && { opacity: 0.45 }]}
                  >
                    <Feather name="chevron-up" size={17} color={colors.studioInk} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${category.name} down`}
                    disabled={index === categoryDrafts.length - 1}
                    onPress={() => moveCategoryDraft(index, 1)}
                    style={[styles.categoryIconButton, index === categoryDrafts.length - 1 && { opacity: 0.45 }]}
                  >
                    <Feather name="chevron-down" size={17} color={colors.studioInk} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${category.name}`}
                    onPress={() => removeCategoryDraft(index)}
                    style={styles.categoryIconButton}
                    testID={`creator-category-remove-${index}`}
                  >
                    <Feather name="trash-2" size={15} color={colors.studioInk} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <View style={styles.categoryAddRow}>
              <TextInput
                accessibilityLabel="New category name"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                onSubmitEditing={addCategoryDraft}
                maxLength={32}
                autoCapitalize="words"
                placeholder="Add a category"
                placeholderTextColor={colors.studioMuted}
                style={styles.categoryInput}
                testID="creator-category-new-name"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add category"
                onPress={addCategoryDraft}
                style={styles.categoryAddButton}
                testID="creator-category-add"
              >
                <Feather name="plus" size={15} color={colors.ink} />
                <Text style={styles.categoryAddText}>Add</Text>
              </Pressable>
            </View>
            {categoryEditorError && <Text accessibilityRole="alert" style={styles.categoryError}>{categoryEditorError}</Text>}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: categoryEditorBusy }}
              disabled={categoryEditorBusy}
              onPress={() => void saveCategoryDrafts()}
              style={[styles.categorySaveButton, categoryEditorBusy && { opacity: 0.65 }]}
              testID="creator-categories-save"
            >
              {categoryEditorBusy
                ? <ActivityIndicator color={colors.ink} />
                : <Text style={styles.categorySaveText}>Save categories</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={assigningPostId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => !categoryAssignmentBusy && setAssigningPostId(null)}
      >
        <View style={styles.categoryOverlay}>
          <View style={styles.categorySheet} accessibilityViewIsModal testID="creator-work-category-picker">
            <View style={styles.categorySheetHeader}>
              <Text style={styles.categorySheetTitle} accessibilityRole="header">Place this work</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close category picker"
                disabled={categoryAssignmentBusy}
                onPress={() => setAssigningPostId(null)}
                style={styles.headerAction}
              >
                <Feather name="x" size={19} color={colors.studioInk} />
              </Pressable>
            </View>
            <Text style={styles.categorySheetNote}>Choose a tab for this piece, or leave it in All work.</Text>
            <ScrollView contentContainerStyle={styles.categoryDraftList}>
              <Pressable
                accessibilityRole="button"
                onPress={() => assigningPostId !== null && void assignCategory(assigningPostId, null)}
                disabled={categoryAssignmentBusy}
                style={styles.categoryOption}
                testID="creator-work-category-none"
              >
                <Feather name="grid" size={16} color={colors.studioInk} />
                <Text style={styles.categoryOptionText}>All work · no category</Text>
                {assigningPostId !== null && posts.find((post) => post.id === assigningPostId)?.portfolioCategoryId == null
                  ? <Feather name="check" size={16} color={colors.studioInk} />
                  : null}
              </Pressable>
              {workCategories.map((category) => {
                const currentPost = posts.find((post) => post.id === assigningPostId);
                return (
                  <Pressable
                    key={categoryKey(category)}
                    accessibilityRole="button"
                    onPress={() => assigningPostId !== null && void assignCategory(assigningPostId, category.id, category.id === null ? category : undefined)}
                    disabled={categoryAssignmentBusy}
                    style={[styles.categoryOption, currentPost?.portfolioCategoryId === category.id && styles.categoryOptionSelected]}
                    testID={`creator-work-category-option-${category.id}`}
                  >
                    <Feather name="tag" size={16} color={colors.studioInk} />
                    <Text style={styles.categoryOptionText}>{category.name}</Text>
                    {currentPost?.portfolioCategoryId === category.id ? <Feather name="check" size={16} color={colors.studioInk} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            {categoryAssignmentError && <Text accessibilityRole="alert" style={styles.categoryError}>{categoryAssignmentError}</Text>}
          </View>
        </View>
      </Modal>
    </View>
  );
}
