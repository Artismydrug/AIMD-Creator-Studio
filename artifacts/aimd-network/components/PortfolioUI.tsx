import React, { useMemo } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export async function openPortfolioLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open link', 'Please try again or open the website in your browser.');
  }
}

export function usePortfolioStyles() {
  const c = useColors();
  return useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.portfolioPaper },
    content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, gap: 26 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 2, borderColor: c.portfolioInk, paddingBottom: 18 },
    headerTitle: { color: c.portfolioInk, fontSize: 10, fontFamily: 'DMSans_700Bold', flex: 1, letterSpacing: 1 },
    back: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
    heading: { color: c.portfolioInk, fontFamily: 'CormorantGaramond_700Bold', fontSize: 43, lineHeight: 43 },
    name: { color: c.portfolioInk, fontFamily: 'CormorantGaramond_700Bold', fontSize: 34, lineHeight: 34 },
    text: { color: c.portfolioInk, fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 22 },
    small: { color: c.mutedForeground, fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 18 },
    label: { color: c.portfolioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    sticker: { backgroundColor: c.studioYellow, borderWidth: 1.5, borderColor: c.portfolioInk, borderRadius: 30, paddingHorizontal: 13, paddingVertical: 9, alignSelf: 'flex-start' },
    stickerText: { color: c.ink, fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 0.8 },
    pill: { borderWidth: 1.5, borderColor: c.portfolioInk, borderRadius: 30, paddingHorizontal: 17, minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: c.portfolioPaper, shadowColor: c.studioShadow, shadowOffset: { width: 2, height: 3 }, shadowRadius: 0, shadowOpacity: 1, elevation: 2 },
    pillText: { color: c.portfolioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    selected: { backgroundColor: c.studioYellow },
    selectedText: { color: c.ink },
    card: { borderWidth: 2, borderColor: c.portfolioInk, borderRadius: 24, padding: 20, gap: 18, backgroundColor: c.portfolioMint, shadowColor: c.studioShadow, shadowOffset: { width: 3, height: 4 }, shadowRadius: 0, shadowOpacity: 1, elevation: 3 },
    primary: { minHeight: 52, borderRadius: 16, borderColor: c.portfolioInk, borderWidth: 2, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.portfolioPink, shadowColor: c.studioShadow, shadowOffset: { width: 3, height: 4 }, shadowRadius: 0, shadowOpacity: 1, elevation: 3 },
    primaryText: { color: c.destructiveForeground, fontFamily: 'DMSans_700Bold', fontSize: 13, flexShrink: 1 },
    link: { color: c.portfolioInk, textDecorationLine: 'underline', fontFamily: 'DMSans_500Medium', fontSize: 13, lineHeight: 21 },
    section: { borderTopWidth: 1, borderColor: c.portfolioInk, paddingTop: 22, gap: 14 },
    input: { borderWidth: 1, borderColor: c.border, backgroundColor: c.card, color: c.portfolioInk, borderRadius: 13, minHeight: 48, padding: 13, fontFamily: 'DMSans_400Regular', fontSize: 14 },
    field: { gap: 8 },
    splitField: { flexGrow: 1, flexBasis: 150, gap: 8 },
    error: { color: c.destructive, fontSize: 13, lineHeight: 20, fontFamily: 'DMSans_500Medium' },
    disabled: { opacity: 0.55 },
    pressed: { opacity: 0.78, transform: [{ translateY: 1 }] },
    artwork: { width: '100%', height: '100%', backgroundColor: c.mediaPaper },
    lightbox: { flex: 1, backgroundColor: c.portfolioPaper, paddingHorizontal: 16 },
    lightboxImage: { flex: 1, width: '100%' },
    // Keep web focus rings from being clipped by decorative sticker shadows.
    scroll: Platform.OS === 'web' ? { overflow: 'visible' } : {},
  }), [c]);
}

export function PortfolioButton({ label, onPress, disabled = false, testID }: { label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  const s = usePortfolioStyles();
  const c = useColors();
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.primary, disabled && s.disabled, pressed && s.pressed]}>
    <Text style={s.primaryText}>{label}</Text><Feather name="arrow-up-right" color={c.destructiveForeground} size={18} />
  </Pressable>;
}

export function PortfolioStamp({ children }: { children: string }) {
  const s = usePortfolioStyles();
  return <View style={s.sticker}><Text style={s.stickerText}>{children}</Text></View>;
}
