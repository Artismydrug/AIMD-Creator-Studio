import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type Summary = {
  tiers: { free: number; dedicated: number; pro: number };
  streakSignals: number;
  mrrCents: number | null;
  nonprofitCents: number | null;
  events: number;
  pendingReviews: number;
};

const HQ_REQUEST_TIMEOUT_MS = 10_000;

const money = (cents: number | null) =>
  cents == null ? 'Unavailable' : `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

function Metric({ label, value, detail, accent }: { label: string; value: string | number; detail: string; accent: string }) {
  const colors = useColors();
  return (
    <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricDetail, { color: colors.mutedForeground }]}>{detail}</Text>
    </View>
  );
}

export default function HQScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const role = String(user?.publicMetadata?.role ?? user?.publicMetadata?.aimdRole ?? '');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!isSignedIn || (role !== 'admin' && role !== 'instructor')) return;
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);

    const request = (async (): Promise<{ kind: 'success'; summary: Summary } | { kind: 'denied' }> => {
      const token = await getToken();
      const response = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/hq/summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return { kind: 'denied' };
        }
        throw new Error(`HQ metrics request failed with status ${response.status}`);
      }
      return { kind: 'success', summary: await response.json() as Summary };
    })();

    let timeout: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error('HQ metrics request timed out.'));
      }, HQ_REQUEST_TIMEOUT_MS);
    });

    Promise.race([request, timeoutPromise])
      .then((result) => {
        if (cancelled) return;
        if (result.kind === 'denied') {
          setDenied(true);
        } else {
          setSummary(result.summary);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
      clearTimeout(timeout);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [getToken, isSignedIn, retryNonce, role]);

  if (!isLoaded) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (role !== 'admin' && role !== 'instructor') return <Redirect href="/(tabs)" />;
  if (denied) return <Redirect href="/(tabs)" />;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={[styles.kicker, { backgroundColor: colors.primary }]}><Text style={styles.kickerText}>AIMD · STAFF</Text></View>
        <Text style={[styles.title, { color: colors.foreground }]}>Creator App HQ</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>The mobile control room for keeping the creative community moving.</Text>
      </View>
      {!summary ? <View style={[styles.empty, { borderColor: colors.border }]}>
        {loading ? (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading verified HQ metrics…</Text>
          </>
        ) : (
          <>
            <Feather name="cloud-off" size={30} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {loadError ? 'Could not load HQ metrics.' : 'HQ metrics are unavailable.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRetryNonce((value) => value + 1)}
              style={[styles.retryButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
            </Pressable>
          </>
        )}
      </View> :
        <View style={styles.grid}>
          <Metric label="Free · Tier 1" value={summary.tiers.free} detail="Creator accounts" accent={colors.primary} />
          <Metric label="Dedicated · Tier 2" value={summary.tiers.dedicated} detail="Existing access" accent={colors.accent} />
          <Metric label="Pro · Tier 3" value={summary.tiers.pro} detail="Residency pathway" accent={colors.primary} />
          <Metric label="Active streaks" value={summary.streakSignals} detail="Creator signals" accent={colors.accent} />
          <Metric label="MRR" value={money(summary.mrrCents)} detail="Recorded revenue only" accent={colors.accent} />
          <Metric label="Nonprofit · 15%" value={money(summary.nonprofitCents)} detail="Net subscription profit" accent={colors.primary} />
          <Metric label="Upcoming events" value={summary.events} detail="Published events" accent={colors.accent} />
          <Metric label="Review queue" value={summary.pendingReviews} detail="Awaiting staff review" accent={colors.primary} />
        </View>
      }
      <View style={[styles.note, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="shield" size={18} color={colors.accent} />
        <Text style={[styles.noteText, { color: colors.mutedForeground }]}>Sensitive residency, financial, and partner controls remain available in the full HQ workspace on web.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 28, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 24 },
  kicker: { alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 12 },
  kickerText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', minHeight: 132, borderWidth: 1, borderRadius: 14, padding: 14 },
  accent: { width: 28, height: 4, borderRadius: 3, marginBottom: 14 },
  metricLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  metricValue: { fontSize: 23, fontWeight: '700', marginTop: 8 },
  metricDetail: { fontSize: 11, marginTop: 4, lineHeight: 15 },
  empty: { minHeight: 180, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 12 },
  retryButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { fontSize: 13, fontWeight: '700' },
  note: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 18, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});