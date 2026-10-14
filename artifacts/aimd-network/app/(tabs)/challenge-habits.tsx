import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import ChallengesScreen from './challenges';
import HabitsScreen from './habits';

type Section = 'challenges' | 'habits';

export default function ChallengeHabitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>('habits');
  const topPad = Platform.OS === 'web' ? 67 : insets.top + 8;
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    titleMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
    titleCopy: { flex: 1, minWidth: 0 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 26, color: colors.foreground, letterSpacing: -0.6 },
    subtitle: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.sunsetCoral, letterSpacing: 0.4 },
    switcher: { flexDirection: 'row', backgroundColor: colors.muted, borderRadius: colors.radius + 2, padding: 4, gap: 3 },
    switchButton: { flex: 1, minHeight: 40, borderRadius: colors.radius - 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    active: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.gold },
    switchText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.mutedForeground },
    content: { flex: 1 },
  }), [colors, topPad]);
  return <View style={styles.container} testID="challenge-habits-screen">
    <View style={styles.header}>
      <View style={styles.titleRow}><View style={styles.titleMark}><Feather name="zap" size={19} color={colors.accentForeground} /></View><View style={styles.titleCopy}><Text style={styles.title}>Habits &amp; Challenges</Text><Text style={styles.subtitle}>Build the practice. Share the work.</Text></View></View>
      <View style={styles.switcher} accessibilityRole="tablist">{(['habits', 'challenges'] as const).map(item => <TouchableOpacity key={item} style={[styles.switchButton, section === item && styles.active]} onPress={() => { if (section !== item) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSection(item); } }} accessibilityRole="tab" accessibilityState={{ selected: section === item }}><Feather name={item === 'challenges' ? 'award' : 'repeat'} size={15} color={section === item ? colors.primary : colors.mutedForeground} /><Text style={[styles.switchText, section === item && { color: colors.primary }]}>{item === 'challenges' ? 'Challenges' : 'Habits'}</Text></TouchableOpacity>)}</View>
    </View>
    <View style={styles.content}>{section === 'challenges' ? <ChallengesScreen embedded /> : <HabitsScreen embedded />}</View>
  </View>;
}