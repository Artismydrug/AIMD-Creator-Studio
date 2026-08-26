import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { safeImpact } from '@/lib/haptics';
import FeedScreen from '../feed';
import EventsScreen from './events';

type CommunitySection = 'feed' | 'events';

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<CommunitySection>('feed');
  const topPad = Platform.OS === 'web' ? 67 : insets.top + 8;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad,
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    titleMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    titleCopy: { flex: 1, gap: 2 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 26, color: colors.foreground, letterSpacing: -0.6 },
     subtitle: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: colors.sunsetCoral, letterSpacing: 1.2, textTransform: 'uppercase' },
    studioRule: { height: 3, width: 56, borderRadius: 3, backgroundColor: colors.cyan },
    switcher: {
      flexDirection: 'row',
      backgroundColor: colors.muted,
      borderRadius: colors.radius + 2,
      padding: 4,
      gap: 3,
    },
     switchButton: {
      flex: 1,
       minHeight: 40,
      borderRadius: colors.radius - 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    activeSwitch: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cyan },
    switchText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.mutedForeground },
    activeSwitchText: { color: colors.primary },
    content: { flex: 1 },
  }), [colors, topPad]);

  const selectSection = (next: CommunitySection) => {
    if (next === section) return;
    setSection(next);
    void safeImpact();
  };

  return (
    <View style={s.container} testID="community-screen">
      <View style={s.header}>
        <View style={s.titleRow}>
          <View style={s.titleMark}>
            <Feather name="users" size={19} color={colors.primaryForeground} />
          </View>
          <View style={s.titleCopy}>
            <Text style={s.title}>Community</Text>
             <Text style={s.subtitle}>Make · Share · Connect.</Text>
          </View>
        </View>
        <View style={s.studioRule} />
         <View style={s.switcher} accessibilityRole="tablist">
          {(['feed', 'events'] as const).map((item) => {
            const active = section === item;
            return (
              <TouchableOpacity
                key={item}
                style={[s.switchButton, active && s.activeSwitch]}
                onPress={() => selectSection(item)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                testID={`community-${item}-tab`}
              >
                <Feather name={item === 'feed' ? 'image' : 'calendar'} size={15} color={active ? colors.primary : colors.mutedForeground} />
                <Text style={[s.switchText, active && s.activeSwitchText]}>
                  {item === 'feed' ? 'Feed' : 'Events'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={s.content}>
        {section === 'feed' ? <FeedScreen embedded /> : <EventsScreen embedded />}
      </View>
    </View>
  );
}