import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useListDirectory } from '@workspace/api-client-react';
import CreatorCard from '@/components/CreatorCard';

export default function DirectoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: creators, isLoading, isError, refetch } = useListDirectory();

  const filtered = useMemo(() => {
    if (!creators) return [];
    const q = search.trim().toLowerCase();
    if (!q) return creators;
    return creators.filter(
      (c) =>
        c.username.toLowerCase().includes(q) ||
        (c.discipline ?? '').toLowerCase().includes(q) ||
        (c.location ?? '').toLowerCase().includes(q)
    );
  }, [creators, search]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 8;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    headerTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 22,
      color: colors.foreground,
    },
    badge: {
      backgroundColor: colors.muted,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      backgroundColor: colors.input,
      paddingHorizontal: 10,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.foreground,
      paddingVertical: 9,
    },
    listContent: {
      paddingBottom: Platform.OS === 'web' ? 100 : 90,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 16,
      color: colors.foreground,
    },
    emptyText: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      color: colors.mutedForeground,
    },
    noResults: {
      paddingVertical: 32,
      alignItems: 'center',
      gap: 8,
    },
    noResultsText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 15,
      color: colors.mutedForeground,
    },
  }), [colors, topPad]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text style={s.headerTitle}>Creators</Text>
          {creators && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{creators.length} studio-ready</Text>
            </View>
          )}
        </View>
        <View style={s.searchRow}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, discipline, location"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            testID="directory-search"
          />
          {search.length > 0 && (
            <Feather
              name="x"
              size={16}
              color={colors.mutedForeground}
              onPress={() => setSearch('')}
            />
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={s.centered}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyTitle}>Failed to load directory</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <CreatorCard creator={item} />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            search ? (
              <View style={s.noResults}>
                <Text style={s.noResultsText}>No creators match "{search}"</Text>
              </View>
            ) : (
              <View style={s.centered}>
                <Feather name="users" size={48} color={colors.muted} />
                <Text style={s.emptyTitle}>No creators yet</Text>
                <Text style={s.emptyText}>Earn your Studio Ready badge to appear here</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}
