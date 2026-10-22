import React from 'react';
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
import { safeImpact } from '@/lib/haptics';
import { PRIMARY_TABS } from '@/lib/primaryNavigation';

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
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 8);

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingBottom: bottom,
          borderTopColor: colors.border,
          backgroundColor: colors.studioPaper,
          borderTopWidth: 1.5,
        },
      ]}
    >
      {PRIMARY_TABS.map((tab) => {
          const route = state.routes.find((candidate) => candidate.name === tab.name);
          if (!route) return null;
          const routeIndex = state.routes.indexOf(route);
          const { options } = descriptors[route.key];
          const focused = state.index === routeIndex;
          const selected = focused || (tab.name === 'profile-tab' && state.routes[state.index]?.name === 'dashboard');
          const label = tab.label;
          const color = selected ? colors.electricMagenta : colors.mutedForeground;
          const iconName = tab.icon;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title ?? label}
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
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            >
              <View
                style={[
                  styles.icon,
                  selected && { backgroundColor: colors.studioYellow, borderColor: colors.studioInk },
                ]}
              >
                <Feather name={iconName} size={22} color={selected ? colors.ink : color} />
              </View>
              <Text style={[styles.activeLabelText, { color: selected ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );

  return content;
}

const styles = StyleSheet.create({
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
  activeLabelText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    lineHeight: 15,
  },
  icon: {
    width: 42,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
});