import React, { useCallback, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import type { FeedScope } from '@/components/FeedScopeTabs';

export const feedControlsInset = (safeTop: number, web = false) => (web ? 12 : safeTop + 8) + 60;

type Props = {
  mode: 'all' | 'following';
  onModeChange: (mode: 'all' | 'following') => void;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onScopeChange: (scope: FeedScope) => void;
  onCommunitySectionChange?: (section: 'creators' | 'events') => void;
  onCompose: () => void;
  activeIndex: number;
  postCount: number;
  embedded: boolean;
};

/** One overlay row; the full section list is available only when requested. */
export default function FeedNavigation({
  mode, onModeChange, menuOpen, onMenuOpenChange, onScopeChange,
  onCommunitySectionChange, onCompose, activeIndex, postCount, embedded,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => {
      setFocused(false);
      onMenuOpenChange(false);
    };
  }, [onMenuOpenChange]));
  const top = Platform.OS === 'web' ? 12 : insets.top + 8;
  const close = () => onMenuOpenChange(false);
  const select = (action: () => void) => { close(); action(); };
  const openCommunitySection = (section: 'creators' | 'events') => {
    if (onCommunitySectionChange) onCommunitySectionChange(section);
    else router.push(section === 'creators' ? '/(tabs)/directory' : '/(tabs)/events');
  };
  const entries: { key: string; label: string; icon: React.ComponentProps<typeof Feather>['name']; action: () => void }[] = [
    ...(!embedded ? [{ key: 'back', label: 'Back to Community', icon: 'arrow-left' as const, action: () => router.canGoBack() ? router.back() : router.replace('/(tabs)/community') }] : []),
    { key: 'community', label: 'Studio Feed', icon: 'image', action: () => onScopeChange('community') },
    { key: 'creators', label: 'Creators', icon: 'users', action: () => openCommunitySection('creators') },
    { key: 'events', label: 'Events', icon: 'calendar', action: () => openCommunitySection('events') },
    { key: 'masterclasses', label: 'Masterclasses', icon: 'play-circle', action: () => onScopeChange('masterclasses') },
    { key: 'challenges', label: 'My challenges', icon: 'target', action: () => onScopeChange('challenges') },
    { key: 'profile', label: 'My profile', icon: 'user', action: () => router.push('/profile') },
  ];

  return (
    <>
      {focused && <StatusBar style="light" />}
      <View style={[styles.overlay, { paddingTop: top }]} pointerEvents="box-none" testID="feed-compact-navigation">
        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.78)', 'rgba(0,0,0,0)']} style={StyleSheet.absoluteFill} />
        <View style={styles.row} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Open community menu"
            accessibilityState={{ expanded: menuOpen }} onPress={() => onMenuOpenChange(true)}
            style={styles.iconButton} testID="feed-menu-toggle">
            <Feather name="menu" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.filters} accessibilityRole="tablist">
            {(['all', 'following'] as const).map(value => (
              <Pressable key={value} accessibilityRole="tab"
                accessibilityLabel={value === 'all' ? 'Show all posts' : 'Show posts from creators you follow'}
                accessibilityState={{ selected: mode === value }} onPress={() => onModeChange(value)}
                style={[styles.filter, mode === value && styles.selectedFilter]}
                testID={`feed-filter-${value}`}>
                <Text numberOfLines={1} style={[styles.filterText, mode !== value && styles.unselectedText]}>{value === 'all' ? 'All' : 'Following'}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Create a new studio post"
            onPress={onCompose} style={[styles.iconButton, { backgroundColor: colors.primary }]}
            testID="create-studio-post">
            <Feather name="plus" size={24} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
      <Modal visible={menuOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <View style={styles.modal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close community menu"
            onPress={close} style={StyleSheet.absoluteFill} testID="feed-menu-backdrop" />
          <View style={[styles.panel, {
            marginTop: top, backgroundColor: colors.card, borderColor: colors.border,
            maxHeight: Math.max(160, height - top - insets.bottom - 24),
          }]} accessibilityViewIsModal>
            <View style={styles.menuHeading}>
              <Text style={[styles.menuTitle, { color: colors.foreground }]}>Community</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close community menu"
                onPress={close} style={styles.close} testID="feed-menu-close">
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
              {entries.map(entry => (
                <Pressable key={entry.key} accessibilityRole="button" accessibilityLabel={entry.label}
                  testID={`feed-menu-${entry.key}`} onPress={() => select(entry.action)}
                  style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.muted }]}>
                  <Feather name={entry.icon} size={19} color={colors.primary} />
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{entry.label}</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {postCount ? `Post ${Math.min(activeIndex + 1, postCount)} of ${postCount} · Swipe up to explore` : 'Make · Share · Connect.'}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 12, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  filters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 0 },
  filter: { minHeight: 44, flexShrink: 1, minWidth: 0, paddingHorizontal: 12, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  selectedFilter: { borderBottomColor: '#FFFFFF' },
  filterText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#FFFFFF' },
  unselectedText: { opacity: 0.78 },
  modal: { flex: 1, paddingHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  panel: { alignSelf: 'center', width: '100%', maxWidth: 420, borderRadius: 20, borderWidth: 1, overflow: 'hidden', padding: 12 },
  menuHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12 },
  menuTitle: { fontFamily: 'DMSans_700Bold', fontSize: 21, flex: 1 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 },
  menuLabel: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 15 },
  count: { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
});
