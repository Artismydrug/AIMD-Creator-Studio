import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export type FeedScope = 'community' | 'workshops' | 'challenges';
const SCOPES = [
  { value: 'community', label: 'Feed', icon: 'users' },
  { value: 'workshops', label: 'Workshops', icon: 'play-circle' },
  { value: 'challenges', label: 'My challenges', icon: 'target' },
] as const;

export default function FeedScopeTabs({ scope, onChange }: {
  scope: FeedScope; onChange: (scope: FeedScope) => void;
}) {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }} contentContainerStyle={styles.row}>
      {SCOPES.map(item => (
        <TouchableOpacity key={item.value} accessibilityRole="tab"
          accessibilityState={{ selected: scope === item.value }}
          testID={`feed-scope-${item.value}`} onPress={() => onChange(item.value)}
          style={[styles.tab, scope === item.value && { backgroundColor: colors.studioYellow, borderColor: colors.studioInk }]}>
          <Feather name={item.icon} size={15} color={scope === item.value ? colors.ink : colors.mutedForeground} />
          <Text style={[styles.label, { color: scope === item.value ? colors.ink : colors.mutedForeground }]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { minHeight: 44, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1.5, borderColor: 'transparent',
    flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
});
