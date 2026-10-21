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
  TouchableOpacity,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useListDirectory, useCreateConversation } from '@workspace/api-client-react';
import CreatorCard from '@/components/CreatorCard';
import { useRouter } from 'expo-router';

export default function DirectoryScreen({ embedded = false }: { embedded?: boolean }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [messagingId, setMessagingId] = useState<number | null>(null);

  const createConversation = useCreateConversation();

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

  const handleMessage = useCallback((creatorId: number, username: string) => {
    if (messagingId !== null) return;
    setMessagingId(creatorId);
    createConversation.mutate(
      { data: { participantIds: [creatorId] } },
      {
        onSuccess: (result) => {
          router.push({
            pathname: '/conversation/[id]',
            params: { id: result.id, name: username },
          });
        },
        onSettled: () => {
          setMessagingId(null);
        },
      }
    );
  }, [messagingId, createConversation, router]);

  const topPad = embedded ? 8 : Platform.OS === 'web' ? 67 : insets.top + 8;

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: topPad,
      paddingBottom: 12,
      backgroundColor: embedded ? colors.background : colors.studioPaper,
      borderBottomWidth: embedded ? 0 : 1.5,
      borderBottomColor: colors.studioInk,
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
      fontSize: embedded ? 18 : 25,
      color: colors.foreground,
      letterSpacing: -0.7,
    },
    badge: {
      backgroundColor: colors.studioYellow,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: colors.ink,
      borderRadius: 9,
    },
    badgeText: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 12,
      color: colors.ink,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      borderRadius: 99,
      minHeight: 48,
      paddingLeft: 14,
      paddingRight: 2,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontFamily: 'DMSans_400Regular',
      fontSize: 15,
      color: colors.foreground,
      paddingVertical: 10,
      minWidth: 0,
    },
    listContent: {
      paddingTop: 4,
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
    clearBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    retryBtn: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 99, borderWidth: 1.5, borderColor: colors.studioInk, backgroundColor: colors.studioYellow },
    retryText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: colors.ink },
  }), [colors, topPad, embedded]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.titleRow}>
              <Text style={s.headerTitle}>Members</Text>
          {creators && (
            <View style={s.badge}>
                  <Text style={s.badgeText}>{creators.length} {creators.length === 1 ? 'member' : 'members'}</Text>
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
            <TouchableOpacity style={s.clearBtn} onPress={() => setSearch('')}
              accessibilityRole="button" accessibilityLabel="Clear search">
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
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
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()} accessibilityRole="button">
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
              <CreatorCard
                creator={item}
                onPress={() => router.push(`/creator/${item.id}`)}
                onMessage={() => handleMessage(item.id, item.username)}
                messagingLoading={messagingId === item.id}
              />
            )}
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
                 <Text style={s.emptyTitle}>No members yet</Text>
                 <Text style={s.emptyText}>Complete your profile to help people find you</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}
