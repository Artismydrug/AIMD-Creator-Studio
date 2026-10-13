import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { getGetRewardsQueryKey, useGetRewards, useRequestMonthlyDrop } from '@workspace/api-client-react';
import { trackEvent } from '@/lib/telemetry';
import { useColors } from '@/hooks/useColors';

const STATUS: Record<string, string> = {
  pending: 'Requested · Awaiting AIMD review',
  approved: 'Approved · Awaiting fulfillment',
  declined: 'Request not approved',
  fulfilled: 'Package fulfilled',
};

export default function MonthlyMemberDrops({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useGetRewards({
    query: { queryKey: getGetRewardsQueryKey(), staleTime: 30_000, retry: 1 },
    request: { timeoutMs: 10_000 },
  });
  const requestPackage = useRequestMonthlyDrop();
  const submitting = useRef(false);
  const [confirmation, setConfirmation] = useState<{ id: number; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  const s = useMemo(() => StyleSheet.create({
    card: { marginHorizontal: compact ? 20 : 0, marginTop: compact ? 20 : 0, padding: 20, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 19, lineHeight: 26, color: colors.foreground, flex: 1 },
    total: { fontFamily: 'DMSans_700Bold', fontSize: compact ? 28 : 38, color: colors.primary },
    compactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
    compactIcon: { width: 42, height: 42, borderRadius: colors.radius, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
    compactBody: { flex: 1, gap: 2 },
    compactTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, lineHeight: 20, color: colors.foreground },
    compactTotal: { fontFamily: 'DMSans_700Bold', fontSize: 23, lineHeight: 29, color: colors.primary },
    detail: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.mutedForeground },
    label: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 },
    link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    linkText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: colors.foreground },
    section: { paddingTop: 16, borderTopWidth: 1, borderColor: colors.border, gap: 12 },
    note: { padding: 14, borderRadius: colors.radius, backgroundColor: colors.secondary, gap: 6 },
    button: { minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center', borderRadius: colors.radius, backgroundColor: colors.primary },
    buttonText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: colors.primaryForeground },
    secondary: { backgroundColor: colors.secondary },
    overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000099' },
    dialog: { maxHeight: '90%', padding: 22, borderRadius: colors.radius, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    itemText: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 15, lineHeight: 22, color: colors.foreground },
  }), [colors, compact]);

  const submit = async () => {
    if (submitting.current || !confirmation) return;
    submitting.current = true;
    setError(null);
    try {
      await requestPackage.mutateAsync({ id: confirmation.id });
      trackEvent('point_reward_claimed', { reward_type: 'member_drop' });
      setConfirmation(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not confirm your request. Refresh and try again.');
    } finally {
      await queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
      submitting.current = false;
    }
  };
  const drop = data?.monthlyDrop;
  const canRequest = !!drop && drop.status === 'open' && drop.remaining > 0 && !drop.ownRequest;
  const history = (data?.recentRequests ?? []).filter(item => item.dropId !== drop?.id);
  const pointsLabel = data ? `${data.points.toLocaleString()} points` : '— points';

  if (compact) {
    return (
      <View testID="monthly-member-drops">
        <TouchableOpacity
          style={[s.card, s.compactCard]}
          onPress={() => router.push('/rewards')}
          accessibilityRole="button"
          accessibilityLabel={`Points & member drops, ${pointsLabel}`}
          accessibilityHint="Opens the full Member Drops page."
          testID="open-monthly-member-drops"
        >
          <View style={s.compactIcon}>
            <Feather name="gift" size={20} color={colors.primary} />
          </View>
          <View style={s.compactBody}>
            <Text style={s.compactTitle}>Points & member drops</Text>
            <Text style={s.compactTotal} testID="reward-points">{pointsLabel}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.card} testID="monthly-member-drops">
      <View style={s.header}>
        <Feather name="gift" size={20} color={colors.primary} />
        <Text style={s.title}>Points & member drops</Text>
      </View>
      {!data ? (
        isLoading ? <ActivityIndicator color={colors.primary} /> : (
          <>
            <Text style={s.detail}>Could not load your points and member drops.</Text>
            <TouchableOpacity style={[s.button, s.secondary]} onPress={() => void refetch()} accessibilityRole="button">
              <Text style={s.linkText}>Try again</Text>
            </TouchableOpacity>
          </>
        )
      ) : (
        <>
          <View>
            <Text style={s.total} testID="reward-points">{data.points.toLocaleString()} points</Text>
            <Text style={s.label}>Redeem for merch, events &amp; drops.</Text>
          </View>
          {isError && <Text style={s.detail}>Your balance may be out of date. Refresh to try again.</Text>}
          {compact ? (
            <>
              <Text style={s.detail}>{drop?.title ?? 'Monthly member packages are coming soon.'}</Text>
              <TouchableOpacity style={s.link} onPress={() => router.push('/rewards')} accessibilityRole="button" accessibilityLabel="View monthly member drops" testID="open-monthly-member-drops">
                <Text style={s.linkText}>View member drops</Text>
                <Feather name="arrow-right" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.section}>
                {drop ? (
                  <>
                    <Text style={s.label}>{drop.monthKey} member drop</Text>
                    <Text style={s.title}>{drop.title}</Text>
                    {!!drop.description && <Text style={s.detail}>{drop.description}</Text>}
                    {drop.items.map((item, i) => (
                      <View key={`${i}-${item}`} style={s.item}>
                        <Feather name="package" size={17} color={colors.primary} />
                        <Text style={s.itemText}>{item}</Text>
                      </View>
                    ))}
                    <Text style={s.detail}>{drop.remaining} of {drop.stock} packages available</Text>
                    {drop.ownRequest ? (
                      <View style={s.note} testID="monthly-drop-request-status">
                        <Text style={s.linkText}>{STATUS[drop.ownRequest.status]}</Text>
                        <Text style={s.detail}>Request #{drop.ownRequest.id} · Your points are untouched.</Text>
                      </View>
                    ) : canRequest ? (
                      <TouchableOpacity style={s.button} accessibilityRole="button" testID="request-monthly-package"
                        onPress={() => { setError(null); setConfirmation({ id: drop.id, title: drop.title }); }}>
                        <Text style={s.buttonText}>Request package</Text>
                      </TouchableOpacity>
                    ) : <Text style={s.detail}>{drop.status === 'closed' ? 'This month’s drop is closed.' : 'All available packages have been requested.'}</Text>}
                  </>
                ) : (
                  <>
                    <Text style={s.title}>No package published this month</Text>
                    <Text style={s.detail}>AIMD will announce each drop and its available items. Packages may include a shirt or art print, an event ticket, a workshop, or something new.</Text>
                  </>
                )}
              </View>
              {history.length > 0 && (
                <View style={s.section}>
                  <Text style={s.title}>Earlier requests</Text>
                  {history.map(item => (
                    <View key={item.id} style={s.note}>
                      <Text style={s.label}>{item.monthKey}</Text>
                      <Text style={s.linkText}>{item.title}</Text>
                      <Text style={s.detail}>{STATUS[item.status]} · Request #{item.id}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </>
      )}
      <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => { if (!submitting.current) setConfirmation(null); }}>
        <View style={s.overlay}>
          <View style={s.dialog} accessibilityViewIsModal>
            <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Text style={s.title}>Request {confirmation?.title}?</Text>
            <Text style={s.detail}>Send one request for this month’s package. AIMD will review it based on stock. No points will be spent and no payment is required.</Text>
            {error && <Text accessibilityRole="alert" style={s.detail}>{error}</Text>}
            <TouchableOpacity style={[s.button, s.secondary]} disabled={requestPackage.isPending} onPress={() => { if (!submitting.current) setConfirmation(null); }} accessibilityRole="button">
              <Text style={s.linkText}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.button} disabled={requestPackage.isPending} accessibilityRole="button" onPress={() => void submit()} testID="confirm-monthly-package-request">
              {requestPackage.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={s.buttonText}>{error ? 'Retry request' : 'Send request'}</Text>}
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
