import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export default function YourCanvasCard({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  const styles = StyleSheet.create({
    card: {
      marginHorizontal: 18,
      marginTop: 4,
      marginBottom: 24,
      minHeight: 148,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioPaper,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    iconSticker: {
      width: 58,
      height: 58,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.studioInk,
      borderRadius: 19,
      backgroundColor: colors.studioYellow,
      transform: [{ rotate: '-5deg' }],
    },
    copy: { flex: 1, gap: 4 },
    eyebrow: {
      color: colors.studioVioletText,
      fontFamily: 'DMSans_700Bold',
      fontSize: 9,
      letterSpacing: 1.2,
    },
    title: {
      color: colors.studioInk,
      fontFamily: 'CormorantGaramond_700Bold',
      fontSize: 26,
      lineHeight: 28,
    },
    description: {
      color: colors.studioMuted,
      fontFamily: 'DMSans_500Medium',
      fontSize: 11,
      lineHeight: 15,
      marginBottom: 3,
    },
    action: {
      alignSelf: 'flex-start',
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 10,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      borderRadius: 13,
      backgroundColor: colors.studioOrange,
    },
    actionText: {
      color: colors.studioInk,
      fontFamily: 'DMSans_700Bold',
      fontSize: 10,
    },
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Open Your Canvas and start a 60-second Flash Sketch"
      testID="dashboard-your-canvas-card"
    >
      <View style={styles.iconSticker} accessible={false}>
        <Feather name="edit-3" size={25} color={colors.studioInk} />
      </View>
      <View style={styles.copy} pointerEvents="none">
        <Text style={styles.eyebrow}>ONE-MINUTE CREATIVE BREAK</Text>
        <Text style={styles.title}>Your Canvas</Text>
        <Text style={styles.description}>A fresh prompt is ready whenever you are.</Text>
        <View style={styles.action}>
          <Text style={styles.actionText}>Start Flash Sketch</Text>
          <Feather name="arrow-up-right" size={14} color={colors.studioInk} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
