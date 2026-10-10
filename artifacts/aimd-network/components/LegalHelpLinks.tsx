import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

const LINKS = [
  { label: 'Privacy', url: 'https://artismydrug.com/privacy' },
  { label: 'Terms', url: 'https://artismydrug.com/terms' },
  { label: 'Help & support', url: 'https://artismydrug.com/support' },
];

export default function LegalHelpLinks({ color }: { color?: string }) {
  const colors = useColors();
  const open = (url: string) => {
    void Linking.openURL(url).catch(() => Alert.alert(
      'Could not open page',
      'Please try in your browser, or email info@artismydrug.com for help.',
    ));
  };
  return (
    <View style={styles.row}>
      {LINKS.map((link) => (
        <Pressable
          key={link.label}
          accessibilityRole="link"
          accessibilityLabel={`Open ${link.label}`}
          onPress={() => open(link.url)}
          style={styles.link}
        >
          <Text style={[styles.text, { color: color ?? colors.primary }]}>{link.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  text: { fontFamily: 'DMSans_500Medium', fontSize: 13, textDecorationLine: 'underline' },
});
