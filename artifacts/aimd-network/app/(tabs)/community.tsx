import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { safeImpact } from '@/lib/haptics';
import FeedScreen from '../feed';
import MessagesScreen from './messages';

type CommunitySection = 'feed' | 'messages';

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
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 23, color: colors.foreground },
    subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.mutedForeground },
    switcher: {
      flexDirection: 'row',
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 3,
      gap: 3,
    },
    switchButton: {
      flex: 1,
      minHeight: 38,
      borderRadius: colors.radius - 3,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    activeSwitch: { backgroundColor: colors.card, shadowColor: colors.foreground, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
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
          <Feather name="users" size={20} color={colors.primary} />
          <View>
            <Text style={s.title}>Community</Text>
            <Text style={s.subtitle}>Share the work. Stay connected.</Text>
          </View>
        </View>
        <View style={s.switcher} accessibilityRole="tablist">
          {(['feed', 'messages'] as const).map((item) => {
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
                <Feather name={item === 'feed' ? 'image' : 'message-circle'} size={15} color={active ? colors.primary : colors.mutedForeground} />
                <Text style={[s.switchText, active && s.activeSwitchText]}>{item === 'feed' ? 'Feed' : 'Messages'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={s.content}>
        {section === 'feed' ? <FeedScreen embedded /> : <MessagesScreen embedded />}
      </View>
    </View>
  );
}