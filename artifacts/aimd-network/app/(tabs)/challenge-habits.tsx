import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import ChallengesScreen from './challenges';
import HabitsScreen from './habits';

type Section = 'challenges' | 'habits';

export default function ChallengeHabitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>('challenges');
  const topPad = Platform.OS === 'web' ? 67 : insets.top + 8;
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 23, color: colors.foreground },
    subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.mutedForeground },
    switcher: { flexDirection: 'row', backgroundColor: colors.muted, borderRadius: colors.radius, padding: 3, gap: 3 },
    switchButton: { flex: 1, minHeight: 38, borderRadius: colors.radius - 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    active: { backgroundColor: colors.card, shadowColor: colors.foreground, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
    switchText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.mutedForeground },
    content: { flex: 1 },
  }), [colors, topPad]);
  return <View style={styles.container} testID="challenge-habits-screen">
    <View style={styles.header}>
      <View style={styles.titleRow}><Feather name="zap" size={20} color={colors.primary} /><View><Text style={styles.title}>Challenges & Habits</Text><Text style={styles.subtitle}>Build the practice. Share the work.</Text></View></View>
      <View style={styles.switcher} accessibilityRole="tablist">{(['challenges', 'habits'] as const).map(item => <TouchableOpacity key={item} style={[styles.switchButton, section === item && styles.active]} onPress={() => setSection(item)} accessibilityRole="tab" accessibilityState={{ selected: section === item }}><Feather name={item === 'challenges' ? 'award' : 'repeat'} size={15} color={section === item ? colors.primary : colors.mutedForeground} /><Text style={[styles.switchText, section === item && { color: colors.primary }]}>{item === 'challenges' ? 'Challenges' : 'Habits'}</Text></TouchableOpacity>)}</View>
    </View>
    <View style={styles.content}>{section === 'challenges' ? <ChallengesScreen embedded /> : <HabitsScreen embedded />}</View>
  </View>;
}