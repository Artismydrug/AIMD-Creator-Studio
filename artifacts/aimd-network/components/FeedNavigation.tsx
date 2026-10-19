import React, { useCallback, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAppearance } from '@/lib/appearance';
import type { FeedScope } from '@/components/FeedScopeTabs';

export const feedNavigationTopInset = (safeTop: number, web = false) => (web ? 67 : safeTop + 8);
export const feedControlsInset = (safeTop: number, web = false) => feedNavigationTopInset(safeTop, web) + 60;

export type FeedScrollDirectionTracker = {
  offset: number;
  direction: 'up' | 'down' | null;
  distance: number;
};

export function updateFeedHeaderFromScroll(
  tracker: FeedScrollDirectionTracker,
  nextOffset: number,
): boolean | null {
  if (!Number.isFinite(nextOffset)) return null;
  const offset = Math.max(0, nextOffset);
  const delta = offset - tracker.offset;
  tracker.offset = offset;
  if (Math.abs(delta) < 1) return null;

  const direction = delta > 0 ? 'down' : 'up';
  if (tracker.direction !== direction) {
    tracker.direction = direction;
    tracker.distance = 0;
  }
  tracker.distance += Math.abs(delta);
  if (tracker.distance < 24) return null;
  tracker.distance = 0;
  return direction === 'up';
}

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
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onControlsHeightChange?: (height: number) => void;
};

/** Restore the section tabs on entry; collapse to one overlay row while browsing. */
export default function FeedNavigation({
  mode, onModeChange, menuOpen, onMenuOpenChange, onScopeChange,
  onCommunitySectionChange, onCompose, activeIndex, postCount, embedded,
  expanded = false, onExpandedChange, onControlsHeightChange,
}: Props) {
  const colors = useColors();
  const { scheme } = useAppearance();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    if (embedded) onExpandedChange?.(true);
    return () => {
      setFocused(false);
      onMenuOpenChange(false);
    };
  }, [embedded, onExpandedChange, onMenuOpenChange]));
  const top = feedNavigationTopInset(insets.top, Platform.OS === 'web');
  const close = () => onMenuOpenChange(false);
  const select = (action: () => void) => { close(); action(); };
  const openCommunitySection = (section: 'creators' | 'events') => {
    if (onCommunitySectionChange) onCommunitySectionChange(section);
    else router.push(section === 'creators' ? '/(tabs)/directory' : '/(tabs)/events');
  };
  const entries: { key: string; label: string; icon: React.ComponentProps<typeof Feather>['name']; action: () => void }[] = [
    { key: 'community', label: 'Studio Feed', icon: 'image', action: () => onScopeChange('community') },
    { key: 'creators', label: 'Creators', icon: 'users', action: () => openCommunitySection('creators') },
    { key: 'events', label: 'Events', icon: 'calendar', action: () => openCommunitySection('events') },
  ];

  return (
    <>
      {focused && <StatusBar style={!expanded || scheme === 'dark' ? 'light' : 'dark'} />}
      <View
        style={[styles.overlay, { paddingTop: top }, expanded && { backgroundColor: colors.background }]}
        onLayout={(event) => onControlsHeightChange?.(event.nativeEvent.layout.height)}
        pointerEvents="box-none"
        testID="feed-navigation-overlay"
      >
        {!expanded && <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.78)', 'rgba(0,0,0,0)']} style={StyleSheet.absoluteFill} />}
        {expanded && (
          <View style={styles.expandedHeader} testID="feed-expanded-navigation">
            <View style={styles.headingRow}>
              <View style={[styles.titleMark, { backgroundColor: colors.primary }]}>
                <Feather name="users" size={19} color={colors.primaryForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.foreground }]}>Feed</Text>
                <Text style={[styles.subtitle, { color: colors.sunsetCoral }]}>Make · Share · Connect.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Hide Feed header and expand posts"
                testID="feed-header-collapse" onPress={() => onExpandedChange?.(false)}
                style={styles.close}>
                <Feather name="chevron-up" size={23} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={[styles.sectionTabs, { backgroundColor: colors.muted }]} accessibilityRole="tablist">
              {(['feed', 'creators', 'events'] as const).map(section => (
                <Pressable key={section} accessibilityRole="tab" accessibilityState={{ selected: section === 'feed' }}
                  testID={`community-${section}-tab`}
                  onPress={() => section === 'feed' ? onScopeChange('community') : openCommunitySection(section)}
                  style={[styles.sectionTab, section === 'feed' && { backgroundColor: colors.card, borderColor: colors.cyan }]}>
                  <Feather name={section === 'feed' ? 'image' : section === 'creators' ? 'users' : 'calendar'}
                    size={15} color={section === 'feed' ? colors.primary : colors.mutedForeground} />
                  <Text numberOfLines={1} style={[styles.sectionText, { color: section === 'feed' ? colors.primary : colors.mutedForeground }]}>
                    {section === 'feed' ? 'Feed' : section === 'creators' ? 'Creators' : 'Events'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        <View style={styles.row} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Open Feed menu"
            accessibilityState={{ expanded: menuOpen }} onPress={() => onMenuOpenChange(true)}
            style={[styles.iconButton, expanded && { backgroundColor: colors.muted }]} testID="feed-menu-toggle">
            <Feather name="menu" size={22} color={expanded ? colors.foreground : '#FFFFFF'} />
          </Pressable>
          <View style={styles.filters} accessibilityRole="tablist">
            {(['all', 'following'] as const).map(value => (
              <Pressable key={value} accessibilityRole="tab"
                accessibilityLabel={value === 'all' ? 'Show all posts' : 'Show posts from creators you follow'}
                accessibilityState={{ selected: mode === value }} onPress={() => onModeChange(value)}
                 style={[styles.filter, mode === value && styles.selectedFilter, expanded && mode === value && { borderBottomColor: colors.primary }]}
                testID={`feed-filter-${value}`}>
                <Text numberOfLines={1} style={[styles.filterText, mode !== value && styles.unselectedText, expanded && { color: colors.foreground }]}>{value === 'all' ? 'All' : 'Following'}</Text>
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
          <Pressable accessibilityRole="button" accessibilityLabel="Close Feed menu"
            onPress={close} style={StyleSheet.absoluteFill} testID="feed-menu-backdrop" />
          <View style={[styles.panel, {
            marginTop: top, backgroundColor: colors.card, borderColor: colors.border,
            maxHeight: Math.max(160, height - top - insets.bottom - 24),
          }]} accessibilityViewIsModal>
            <View style={styles.menuHeading}>
              <Text style={[styles.menuTitle, { color: colors.foreground }]}>Feed</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close Feed menu"
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
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 16, paddingBottom: 16 },
  expandedHeader: { gap: 12, paddingHorizontal: 0, paddingBottom: 8 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 26, letterSpacing: -0.6 },
  subtitle: { fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 },
  sectionTabs: { flexDirection: 'row', padding: 4, gap: 3, borderRadius: 14 },
  sectionTab: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'transparent', borderRadius: 10 },
  sectionText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
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
