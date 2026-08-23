import React, { useMemo } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { safeImpact } from '@/lib/haptics';

const links = [
  {
    testID: 'more-aimd-membership',
    icon: 'award' as const,
    title: 'AIMD Membership',
    body: 'Unlock Mastery, feedback, and professional opportunities.',
    route: '/membership' as const,
  },
  {
    testID: 'more-aimd-shop',
    icon: 'shopping-bag' as const,
    title: 'Shop AIMD',
    body: 'Browse physical art, apparel, and releases.',
    url: 'https://artismydrug.com/gallery',
  },
  {
    testID: 'more-aimd-about',
    icon: 'heart' as const,
    title: 'About AIMD',
    body: 'Meet the mission, people, and creator ecosystem.',
    url: 'https://artismydrug.com/about',
  },
] as const;

export default function MoreFromAimd() {
  const colors = useColors();
  const router = useRouter();

  const styles = useMemo(() => StyleSheet.create({
    wrapper: {
      paddingHorizontal: 20,
      paddingVertical: 22,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    eyebrow: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
      letterSpacing: 1.7,
      color: colors.sunsetCoral,
      textTransform: 'uppercase',
    },
    title: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 22,
      color: colors.foreground,
    },
    grid: { gap: 10 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.muted,
    },
    copy: { flex: 1, gap: 2 },
    rowTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 14,
      color: colors.foreground,
    },
    rowBody: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      lineHeight: 17,
      color: colors.mutedForeground,
    },
  }), [colors]);

  const openExternal = async (url: string) => {
    void safeImpact();
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return;
    }
    Alert.alert('Link unavailable', 'This AIMD page could not be opened.');
  };

  return (
    <View style={styles.wrapper} testID="more-from-aimd">
      <Text style={styles.eyebrow}>More from AIMD</Text>
      <Text style={styles.title}>Keep creating beyond the app</Text>
      <View style={styles.grid}>
        {links.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={styles.row}
            testID={item.testID}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => {
              if ('route' in item) {
                void safeImpact();
                router.push(item.route);
              } else {
                void openExternal(item.url);
              }
            }}
          >
            <View style={styles.icon}>
              <Feather name={item.icon} size={18} color={colors.electricMagenta} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowBody}>{item.body}</Text>
            </View>
            <Feather
              name={'route' in item ? 'chevron-right' : 'arrow-up-right'}
              size={18}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}