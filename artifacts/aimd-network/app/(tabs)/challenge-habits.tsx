import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import ChallengesScreen from './challenges';
import HabitsScreen from './habits';
import { LAUNCH_FEATURES } from '@/lib/launchFeatures';

type Section = 'challenges' | 'habits';

export default function ChallengeHabitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>('habits');
  const topPad = Platform.OS === 'web' ? 67 : insets.top + 8;
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 12, gap: 12, backgroundColor: colors.studioPaper, borderBottomWidth: 2, borderBottomColor: colors.studioInk },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    titleMark: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.studioYellow, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }], shadowColor: colors.ink, shadowOffset: { width: 2, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
    titleCopy: { flex: 1, minWidth: 0 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 26, color: colors.foreground, letterSpacing: -0.9 },
    switcher: { flexDirection: 'row', backgroundColor: colors.studioPaperAlt, borderWidth: 1.5, borderColor: colors.studioInk, borderRadius: 17, padding: 4, gap: 4 },
    switchButton: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    active: { backgroundColor: colors.studioYellow, borderColor: colors.ink, shadowColor: colors.ink, shadowOffset: { width: 1, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 1 },
    switchText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.mutedForeground },
    content: { flex: 1 },
  }), [colors, topPad]);
  const sectionHeader = (
    <View style={styles.header} testID="challenge-habits-scroll-header">
      <View style={styles.titleRow}><View style={styles.titleMark}><Feather name="zap" size={20} color={colors.ink} /></View><View style={styles.titleCopy}><Text style={styles.title} numberOfLines={1}>Daily check-in</Text></View></View>
      {LAUNCH_FEATURES.challenges && <View style={styles.switcher} accessibilityRole="tablist">{(['habits', 'challenges'] as const).map(item => <TouchableOpacity key={item} style={[styles.switchButton, section === item && styles.active]} onPress={() => { if (section !== item) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSection(item); } }} accessibilityRole="tab" accessibilityState={{ selected: section === item }}><Feather name={item === 'challenges' ? 'award' : 'repeat'} size={15} color={section === item ? colors.ink : colors.mutedForeground} /><Text style={[styles.switchText, section === item && { color: colors.ink, fontFamily: 'DMSans_700Bold' }]}>{item === 'challenges' ? 'Challenges' : 'Habits'}</Text></TouchableOpacity>)}</View>}
    </View>
  );
  return <View style={styles.container} testID="challenge-habits-screen">
    {!LAUNCH_FEATURES.challenges || section === 'habits' ? (
      <View style={styles.content}>
        <HabitsScreen embedded scrollHeader={sectionHeader} />
      </View>
    ) : (
      <>
        {sectionHeader}
        <View style={styles.content}><ChallengesScreen embedded /></View>
      </>
    )}
  </View>;
}