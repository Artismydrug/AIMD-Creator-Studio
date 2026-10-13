import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

const BOOKING_URL = 'https://www.artismydrug.com/tattoo';

export default function TattooBusResidencyCard() {
  const colors = useColors();
  const styles = StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    eyebrow: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 11,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    icon: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.muted,
    },
    titleCopy: { flex: 1, gap: 4 },
    title: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 17,
      lineHeight: 22,
      color: colors.foreground,
    },
    facts: { gap: 8 },
    factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    factText: {
      flex: 1,
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      lineHeight: 19,
      color: colors.mutedForeground,
    },
    description: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 21,
      color: colors.foreground,
    },
    bookButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
      backgroundColor: colors.primary,
    },
    bookButtonText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 14,
      color: colors.primaryForeground,
    },
  });

  const openBookingPage = () => {
    void Linking.openURL(BOOKING_URL).catch(() => {
      Alert.alert('Booking page unavailable', 'Please try again or visit artismydrug.com/tattoo.');
    });
  };

  return (
    <View style={styles.card} testID="los-feliz-flea-residency">
      <Text style={styles.eyebrow}>Weekly residency</Text>
      <View style={styles.titleRow}>
        <View style={styles.icon}>
          <Feather name="truck" size={20} color={colors.primary} />
        </View>
        <View style={styles.titleCopy}>
          <Text style={styles.title}>AIMD Tattoo Bus at Los Feliz Flea</Text>
        </View>
      </View>

      <View style={styles.facts}>
        <View style={styles.factRow}>
          <Feather name="calendar" size={15} color={colors.primary} />
          <Text style={styles.factText}>
            Every Saturday · 11:00 AM – 5:00 PM
            {'\n'}Starting November 7th
          </Text>
        </View>
        <View style={styles.factRow}>
          <Feather name="map-pin" size={15} color={colors.primary} />
          <Text style={styles.factText}>
            1st floor, 1030 Alpine St, Los Angeles, CA 90012 · Los Feliz Flea grounds
          </Text>
        </View>
      </View>

      <Text style={styles.description}>
        Walk-ins welcome or book ahead at artismydrug.com/tattoo. Featuring our mobile tattoo bus, live art, and pop-up experience.
      </Text>

      <TouchableOpacity
        style={styles.bookButton}
        onPress={openBookingPage}
        accessibilityRole="button"
        accessibilityLabel="Book ahead for the AIMD Tattoo Bus at Los Feliz Flea"
        testID="book-los-feliz-flea-tattoo"
      >
        <Feather name="external-link" size={16} color={colors.primaryForeground} />
        <Text style={styles.bookButtonText}>Book ahead</Text>
      </TouchableOpacity>
    </View>
  );
}
