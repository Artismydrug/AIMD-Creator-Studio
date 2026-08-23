import React, { useMemo } from 'react';
import { Alert, Linking, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getBaseUrl, type User } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { safeImpact } from '@/lib/haptics';
import { useSubscription } from '@/lib/revenuecat';

type Props = { user: User | undefined };

const opportunities = [
  {
    icon: 'truck' as const,
    title: 'AIMD Tattoo Bus',
    body: 'Apply for mobile studio sessions, pop-ups, and apprenticeship activations.',
    subject: 'AIMD Tattoo Bus studio access application',
  },
  {
    icon: 'home' as const,
    title: 'Open Creation Studios',
    body: 'Request production time in shared painting, music, and maker spaces.',
    subject: 'AIMD open studio access application',
  },
  {
    icon: 'star' as const,
    title: 'Resident Artist Priority',
    body: 'Submit priority interest for residencies and long-term studio placements.',
    subject: 'AIMD resident artist priority application',
  },
  {
    icon: 'briefcase' as const,
    title: 'Brand Partnerships',
    body: 'Pitch campaign, commission, and creator-collaboration opportunities.',
    subject: 'AIMD brand partnership application',
  },
];

export default function ProEcosystemPortal({ user }: Props) {
  const colors = useColors();
  const { hasProAccess } = useSubscription();
  const isPro = user?.tier === 'pro' || hasProAccess;
  const referralLink = useMemo(() => {
    const base = (getBaseUrl() ?? 'aimd-network://').replace(/\/$/, '');
    return `${base}/?ref=${encodeURIComponent(user?.username ?? 'creator')}`;
  }, [user?.username]);

  const s = useMemo(() => StyleSheet.create({
    wrapper: { padding: 20, gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    eyebrow: { fontFamily: 'DMSans_700Bold', fontSize: 11, letterSpacing: 1.7, color: colors.sunsetCoral, textTransform: 'uppercase' },
    title: { fontFamily: 'DMSans_700Bold', fontSize: 24, color: colors.foreground },
    body: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.mutedForeground },
    locked: { padding: 18, backgroundColor: colors.muted, borderRadius: colors.radius, gap: 8, borderWidth: 1, borderColor: colors.border },
    affiliate: { padding: 18, backgroundColor: colors.foreground, borderRadius: colors.radius, gap: 14 },
    affiliateTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.background },
    linkText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.cyan },
    metricRow: { flexDirection: 'row', gap: 8 },
    metric: { flex: 1, padding: 10, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 9 },
    metricValue: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: colors.gold },
    metricLabel: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: colors.background, opacity: 0.78 },
    share: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: colors.electricMagenta, borderRadius: 9 },
    shareText: { fontFamily: 'DMSans_700Bold', color: colors.primaryForeground },
    grid: { gap: 10 },
    opportunity: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: colors.radius },
    icon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted, borderRadius: 19 },
    opportunityCopy: { flex: 1, gap: 2 },
    opportunityTitle: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: colors.foreground },
    opportunityBody: { fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 17, color: colors.mutedForeground },
  }), [colors]);

  return (
    <View style={s.wrapper} testID="pro-ecosystem-portal">
      <Text style={s.eyebrow}>Professional Artist · Ecosystem Partner Pipeline</Text>
      <Text style={s.title}>{isPro ? 'Your professional runway' : 'Professional access, when you are ready'}</Text>
      {!isPro ? (
        <View style={s.locked}>
          <Feather name="lock" size={22} color={colors.gold} />
          <Text style={s.body}>
            Professional Artist unlocks monthly coaching sessions, the Ecosystem
            Partner and Affiliate Pipeline, priority affiliate tracking, studio
            applications, and resident opportunities.
          </Text>
        </View>
      ) : (
        <>
          <View style={s.affiliate}>
            <Text style={s.affiliateTitle}>Affiliate Program</Text>
            <Text selectable style={s.linkText}>{referralLink}</Text>
            <View style={s.metricRow}>
              <View style={s.metric}><Text style={s.metricValue}>0</Text><Text style={s.metricLabel}>Tracked referrals</Text></View>
              <View style={s.metric}><Text style={s.metricValue}>$0</Text><Text style={s.metricLabel}>Confirmed earnings</Text></View>
              <View style={s.metric}><Text style={s.metricValue}>—</Text><Text style={s.metricLabel}>Next payout</Text></View>
            </View>
            <TouchableOpacity
              style={s.share}
              testID="share-referral-link"
              onPress={async () => {
                void safeImpact();
                await Share.share({ message: `Create with AIMD: ${referralLink}` });
              }}
            >
              <Feather name="share-2" size={17} color={colors.primaryForeground} />
              <Text style={s.shareText}>Share referral link</Text>
            </TouchableOpacity>
          </View>

          <View style={s.grid}>
            {opportunities.map((item) => (
              <TouchableOpacity
                key={item.title}
                style={s.opportunity}
                onPress={async () => {
                  void safeImpact();
                  const url = `mailto:?subject=${encodeURIComponent(item.subject)}`;
                  if (await Linking.canOpenURL(url)) await Linking.openURL(url);
                  else Alert.alert('Email unavailable', 'Set up an email app to start this application.');
                }}
              >
                <View style={s.icon}><Feather name={item.icon} size={18} color={colors.sunsetCoral} /></View>
                <View style={s.opportunityCopy}>
                  <Text style={s.opportunityTitle}>{item.title}</Text>
                  <Text style={s.opportunityBody}>{item.body}</Text>
                </View>
                <Feather name="arrow-up-right" size={18} color={colors.electricMagenta} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}