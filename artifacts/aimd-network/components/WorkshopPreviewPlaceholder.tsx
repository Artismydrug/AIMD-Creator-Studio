import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

function motifFor(category: string): { icon: FeatherName; side: FeatherName[] } {
  const c = category.toLowerCase();
  if (/(music|audio|sound|beat|produc|vocal)/.test(c)) return { icon: 'music', side: ['headphones', 'mic', 'sliders'] };
  if (/(photo|camera)/.test(c)) return { icon: 'camera', side: ['aperture', 'image', 'sun'] };
  if (/(film|video|direct|cinema|edit)/.test(c)) return { icon: 'film', side: ['video', 'scissors', 'monitor'] };
  if (/(dance|move|choreo)/.test(c)) return { icon: 'activity', side: ['zap', 'wind', 'repeat'] };
  if (/(design|art|visual|paint|draw|tattoo|ink)/.test(c)) return { icon: 'pen-tool', side: ['droplet', 'layers', 'feather'] };
  if (/(business|brand|market)/.test(c)) return { icon: 'trending-up', side: ['briefcase', 'target', 'bar-chart-2'] };
  if (/(writ|poet|story)/.test(c)) return { icon: 'edit-3', side: ['book-open', 'type', 'bookmark'] };
  return { icon: 'star', side: ['compass', 'layers', 'award'] };
}

export default function WorkshopPreviewPlaceholder({ category, title }: { category: string; title: string }) {
  const colors = useColors();
  const { icon, side } = motifFor(category || '');
  const fg = '#FAF8F5';
  return (
    <View
      style={st.content}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${title} preview coming soon. Still artwork, video not yet available.`}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[colors.ink, colors.electricMagenta, colors.sunsetCoral]}
        locations={[0.1, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[st.ring, { width: 220, height: 220, right: -50, top: -70, borderColor: 'rgba(250,248,245,0.14)' }]} />
      <View style={[st.ring, { width: 140, height: 140, right: -10, top: -30, borderColor: 'rgba(250,248,245,0.2)' }]} />
      <View style={[st.disc, { backgroundColor: colors.gold, left: -30, bottom: -40 }]} />
      <View style={st.badge}>
        <Feather name="clock" size={10} color={fg} />
        <Text style={st.badgeText}>PREVIEW COMING SOON</Text>
      </View>
      <View style={st.center}>
        <View style={st.tile}>
          <Feather name={icon} size={34} color={fg} />
        </View>
        <View style={st.sideRow}>
          {side.map((n) => <Feather key={n} name={n} size={14} color="rgba(250,248,245,0.6)" />)}
        </View>
      </View>
      <Text style={st.cat} numberOfLines={1}>{category}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  content: { ...StyleSheet.absoluteFillObject, padding: 14 },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1.5 },
  disc: { position: 'absolute', width: 110, height: 110, borderRadius: 999, opacity: 0.35 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  tile: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,19,23,0.35)', borderWidth: 1, borderColor: 'rgba(250,248,245,0.28)', transform: [{ rotate: '-6deg' }] },
  sideRow: { flexDirection: 'row', gap: 14 },
  badge: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(16,19,23,0.82)' },
  badgeText: { flexShrink: 1, fontFamily: 'DMSans_700Bold', fontSize: 9, color: '#FAF8F5', letterSpacing: 0.8 },
  cat: { alignSelf: 'flex-end', maxWidth: '100%', fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(250,248,245,0.85)' },
});
