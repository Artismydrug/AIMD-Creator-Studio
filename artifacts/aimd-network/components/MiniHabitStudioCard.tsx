import React, { useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export default function MiniHabitStudioCard({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 18,
      gap: 12,
      backgroundColor: colors.ink,
      borderColor: colors.cyan,
      borderWidth: 1,
      borderRadius: colors.radius + 4,
    },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyebrow: {
      flex: 1,
      color: colors.cyan,
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
      letterSpacing: 1.2,
    },
    duration: {
      color: colors.primaryForeground,
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 11,
    },
    title: {
      color: colors.primaryForeground,
      fontFamily: 'DMSans_700Bold',
      fontSize: 20,
      letterSpacing: -0.3,
    },
    description: {
      color: colors.primaryForeground,
      opacity: 0.82,
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      lineHeight: 19,
    },
    button: {
      minHeight: 46,
      paddingHorizontal: 16,
      borderRadius: colors.radius,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonText: {
      color: colors.primaryForeground,
      fontFamily: 'DMSans_700Bold',
      fontSize: 14,
    },
    privacyNote: {
      color: colors.primaryForeground,
      opacity: 0.68,
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      textAlign: 'center',
    },
  }), [colors]);

  return (
    <View style={styles.card} testID="dashboard-mini-habit-studio">
      <View style={styles.eyebrowRow}>
        <Feather name="edit-3" size={15} color={colors.cyan} />
        <Text style={styles.eyebrow}>CREATOR ARCADE</Text>
        <Text style={styles.duration}>60 SEC</Text>
      </View>
      <Text style={styles.title}>Flash Sketch</Text>
      <Text style={styles.description}>
        A short creative practice break. Pick a prompt and keep your hand moving for one minute.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Start a 60-second Flash Sketch"
        testID="dashboard-mini-habit-studio-open"
      >
        <Text style={styles.buttonText}>Start a sketch</Text>
        <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
      </TouchableOpacity>
      <Text style={styles.privacyNote}>Your sketches stay on this device.</Text>
    </View>
  );
}
