import React from 'react';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAppearance } from '@/lib/appearance';
import { safeImpact } from '@/lib/haptics';

// Only these four routes render as bottom tabs; everything else is hidden.
const VISIBLE_TABS = ['index', 'community', 'workshops', 'challenge-habits'] as const;
type VisibleTab = typeof VISIBLE_TABS[number];

const icons: Record<VisibleTab, keyof typeof Feather.glyphMap> = {
  index: 'grid',
  community: 'users',
  workshops: 'play-circle',
  'challenge-habits': 'zap',
};

type FrostedTabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors: Record<string, {
    options: {
      title?: string;
      tabBarLabel?: unknown;
      tabBarAccessibilityLabel?: string;
    };
  }>;
  navigation: any;
};

export default function FrostedTabBar({
  state,
  descriptors,
  navigation,
}: FrostedTabBarProps) {
  const colors = useColors();
  const { scheme } = useAppearance();
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 8);

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingBottom: bottom,
          borderTopColor: colors.border,
          backgroundColor:
            Platform.OS === 'ios' ? 'transparent' : colors.studioPaper,
          borderTopWidth: 1.5,
        },
      ]}
    >
      {state.routes
        .filter((route) => (VISIBLE_TABS as readonly string[]).includes(route.name))
        .map((route) => {
          const routeIndex = state.routes.indexOf(route);
          const { options } = descriptors[route.key];
          const focused = state.index === routeIndex;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name;
          const color = focused ? colors.electricMagenta : colors.mutedForeground;
          const iconName = icons[route.name as VisibleTab] ?? 'circle';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={`tab-${route.name}`}
              style={styles.item}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  void safeImpact();
                  navigation.navigate(route.name, route.params);
                }
              }}
            >
              {focused && (
                <View style={[styles.activeLabel, { backgroundColor: colors.studioYellow, borderColor: colors.foreground }]}>
                  <Text style={[styles.activeLabelText, { color: colors.ink }]}>
                    {label}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.indicator,
                  focused && { backgroundColor: colors.cyan },
                ]}
              />
              <Feather name={iconName} size={26} color={color} />
            </TouchableOpacity>
          );
        })}
    </View>
  );

  if (Platform.OS === 'web') return content;
  return (
    <BlurView intensity={82} tint={scheme} style={styles.blur}>
      {content}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    position: 'relative',
    left: 0,
    right: 0,
    bottom: 0,
  },
  row: {
    minHeight: 82,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    minWidth: 48,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeLabel: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderRadius: 10,
    maxWidth: '100%',
  },
  activeLabelText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 9,
    lineHeight: 12,
  },
  indicator: {
    width: 25,
    height: 5,
    borderRadius: 2,
    marginBottom: 1,
    backgroundColor: 'transparent',
  },
});