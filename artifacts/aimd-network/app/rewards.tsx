import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { getGetRewardsQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import MonthlyMemberDrops from '@/components/MonthlyMemberDrops';

export default function RewardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
    back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontFamily: 'DMSans_700Bold', color: colors.foreground },
    subtitle: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: colors.mutedForeground, marginTop: 3 },
    content: { paddingHorizontal: 20, paddingBottom: insets.bottom + 28 },
  }), [colors, insets.top, insets.bottom]);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.back} accessibilityRole="button" accessibilityLabel="Back to dashboard"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Member drops</Text>
          <Text style={s.subtitle}>Keep collecting. Stay connected.</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
      >
        <MonthlyMemberDrops />
      </ScrollView>
    </View>
  );
}
