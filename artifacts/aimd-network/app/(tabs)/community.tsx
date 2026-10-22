import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { safeImpact } from '@/lib/haptics';
import FeedScreen from '../feed';
import EventsScreen from './events';
import DirectoryScreen from './directory';

type CommunitySection = 'feed' | 'creators' | 'events';

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
      paddingBottom: 10,
      gap: 10,
      backgroundColor: colors.studioPaper,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.studioInk,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    titleMark: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.studioOrange, borderWidth: 2, borderColor: colors.ink, transform: [{ rotate: '-5deg' }], shadowColor: colors.studioShadow, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
    titleCopy: { flex: 1, gap: 2 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 26, color: colors.foreground, letterSpacing: -0.6 },
     subtitle: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: colors.sunsetCoral, letterSpacing: 1.2, textTransform: 'uppercase' },
    switcher: { flexDirection: 'row', gap: 6 },
     switchButton: {
      flex: 1,
       minHeight: 44,
      borderRadius: 99,
      borderWidth: 1.5,
      borderColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    activeSwitch: { backgroundColor: colors.studioYellow, borderColor: colors.studioInk },
    switchText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: colors.mutedForeground },
    activeSwitchText: { color: colors.ink },
    content: { flex: 1 },
  }), [colors, topPad]);

  const selectSection = (next: CommunitySection) => {
    if (next === section) return;
    setSection(next);
    void safeImpact();
  };

  if (section === 'feed') {
    return (
      <View style={s.container} testID="community-screen">
        <FeedScreen embedded onCommunitySectionChange={selectSection} />
      </View>
    );
  }

  return (
    <View style={s.container} testID="community-screen">
      <View style={s.header}>
        <View style={s.titleRow}>
          <View style={s.titleMark}>
            <Feather name="users" size={19} color={colors.ink} />
          </View>
          <View style={s.titleCopy}>
            <Text style={s.title}>Feed</Text>
             <Text style={s.subtitle}>Make · Share · Connect.</Text>
          </View>
        </View>
         <View style={s.switcher} accessibilityRole="tablist">
           {(['feed', 'creators', 'events'] as const).map((item) => {
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
                 <Feather
                   name={item === 'feed' ? 'image' : item === 'creators' ? 'users' : 'calendar'}
                   size={15}
                   color={active ? colors.ink : colors.mutedForeground}
                 />
                <Text style={[s.switchText, active && s.activeSwitchText]}>
                   {item === 'feed' ? 'Feed' : item === 'creators' ? 'Creators' : 'Events'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={s.content}>
         {section === 'creators' ? (
           <DirectoryScreen embedded />
         ) : (
           <EventsScreen embedded />
         )}
      </View>
    </View>
  );
}