import React from 'react';
import { Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

const BOOKING_URL = 'https://www.artismydrug.com/tattoo';

export default function TattooBusResidencyCard() {
  const colors = useColors();
  const styles = StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 14,
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
    posterRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    flyerFrame: {
      width: 108,
      aspectRatio: 1134 / 1542,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      borderRadius: 12,
      backgroundColor: colors.studioPaper,
      transform: [{ rotate: '-2deg' }],
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    flyerImage: { width: '100%', height: '100%' },
    posterCopy: { flex: 1, minWidth: 0, gap: 7 },
    title: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
      lineHeight: 20,
      color: colors.foreground,
    },
    walkInTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: colors.studioInk,
      borderRadius: 10,
      backgroundColor: colors.studioYellow,
    },
    walkInTagText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 9,
      letterSpacing: 0.5,
      color: colors.studioInk,
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
      <View style={styles.posterRow}>
        <View style={styles.flyerFrame}>
          <Image
            source={require('../assets/images/los-feliz-flea-flyer.jpg')}
            style={styles.flyerImage}
            resizeMode="contain"
            accessible
            accessibilityLabel="Art Is My Drug Tattoo Studio flyer for the Los Feliz Flea, every Saturday from 11 AM to 5 PM"
          />
        </View>
        <View style={styles.posterCopy}>
          <Text style={styles.title}>AIMD Tattoo Bus at Los Feliz Flea</Text>
          <View style={styles.walkInTag}>
            <Text style={styles.walkInTagText}>WALK-INS WELCOME</Text>
          </View>
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
