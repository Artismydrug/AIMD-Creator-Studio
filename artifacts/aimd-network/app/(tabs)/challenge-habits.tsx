import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { mainHeaderTopPadding } from '@/lib/safeArea';
import HabitsScreen from './habits';

export default function ChallengeHabitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = mainHeaderTopPadding(insets.top, Platform.OS === 'web');
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: topPad, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.studioPaper },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    titleMark: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.studioYellow, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }], shadowColor: colors.ink, shadowOffset: { width: 2, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
    titleCopy: { flex: 1, minWidth: 0 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 26, color: colors.foreground, letterSpacing: -0.9 },
    subtitle: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: colors.studioOrangeText, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 },
  }), [colors, topPad]);
  const sectionHeader = (
    <View style={styles.header} testID="challenge-habits-scroll-header">
      <View style={styles.titleRow}>
        <View style={styles.titleMark}><Feather name="zap" size={20} color={colors.ink} /></View>
        <View style={styles.titleCopy}>
          <Text style={styles.title} accessibilityRole="header">Habits</Text>
          <Text style={styles.subtitle}>Build the practice. Share the work.</Text>
        </View>
      </View>
    </View>
  );
  return <View style={styles.container} testID="challenge-habits-screen">
    <HabitsScreen embedded scrollHeader={sectionHeader} />
  </View>;
}