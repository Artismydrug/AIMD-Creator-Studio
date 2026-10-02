import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAppearance } from '@/lib/appearance';

const choices = [
  { value: 'system', label: 'System', icon: 'smartphone' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
] as const;

export default function AppearanceSettings() {
  const colors = useColors();
  const { mode, ready, setMode } = useAppearance();
  const [saving, setSaving] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Appearance</Text>
      <View style={styles.choices}>
        {choices.map((choice) => {
          const selected = mode === choice.value;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityLabel={`${choice.label} appearance`}
              accessibilityState={{ checked: selected, disabled: !ready || saving }}
              testID={`appearance-mode-${choice.value}`}
              disabled={!ready || saving}
              onPress={async () => {
                setSaving(true);
                try {
                  await setMode(choice.value);
                } catch {
                  Alert.alert('Could not save appearance', 'Please try again.');
                } finally {
                  setSaving(false);
                }
              }}
              style={[styles.choice, {
                backgroundColor: selected ? colors.magentaWash : colors.background,
                borderColor: selected ? colors.primary : colors.border,
              }]}
            >
              <Feather name={choice.icon} size={20} color={selected ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.label, { color: colors.foreground }]}>{choice.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        {mode === 'system' ? 'Follows your device’s appearance.' : 'Saved on this device.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  title: { fontFamily: 'DMSans_600SemiBold', fontSize: 16 },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 10, minHeight: 76 },
  label: { fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
  hint: { fontFamily: 'DMSans_400Regular', fontSize: 12 },
});