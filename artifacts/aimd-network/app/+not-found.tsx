import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.foreground, shadowColor: colors.studioShadow }]}>
          <View style={[styles.mark, { backgroundColor: colors.studioYellow, borderColor: colors.foreground }]}>
            <Feather name="compass" size={24} color={colors.foreground} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.studioVioletText }]}>AIMD CREATOR STUDIO</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            This page is off the map.
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            The link may be outdated, but your studio is right where you left it.
          </Text>
          <Link href="/" style={[styles.link, { backgroundColor: colors.studioOrange, borderColor: colors.foreground, shadowColor: colors.studioShadow }]}>
            <Text style={[styles.linkText, { color: colors.ink }]}>Back to your studio</Text>
            <Feather name="arrow-up-right" size={17} color={colors.ink} />
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: 24,
    borderWidth: 1.5,
    borderRadius: 26,
    gap: 12,
    shadowOffset: { width: 4, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 3,
  },
  mark: {
    width: 58,
    height: 58,
    borderWidth: 1.5,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
  },
  eyebrow: {
    marginTop: 8,
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 26,
    lineHeight: 31,
    textAlign: 'center',
  },
  link: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    marginTop: 15,
    paddingVertical: 13,
    paddingHorizontal: 18,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 2,
  },
  linkText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
  },
});
