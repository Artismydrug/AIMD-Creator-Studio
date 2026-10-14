import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export type FeedScope = 'community' | 'masterclasses' | 'challenges';
const SCOPES = [
  { value: 'community', label: 'Community', icon: 'users' },
  { value: 'masterclasses', label: 'Masterclasses', icon: 'play-circle' },
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
          style={[styles.tab, { borderColor: scope === item.value ? colors.primary : colors.border,
            backgroundColor: scope === item.value ? colors.magentaWash : colors.card }]}>
          <Feather name={item.icon} size={15} color={scope === item.value ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.label, { color: scope === item.value ? colors.primary : colors.foreground }]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { minHeight: 44, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { fontFamily: 'DMSans_600SemiBold', fontSize: 12 },
});
