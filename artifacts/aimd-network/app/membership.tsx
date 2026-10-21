import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { useColors } from '@/hooks/useColors';
import { safeImpact } from '@/lib/haptics';
import { useSubscription } from '@/lib/revenuecat';

type FeatherIcon = React.ComponentProps<typeof Feather>['name'];
type MembershipBenefit = { icon: FeatherIcon; label: string };

const discoveringBenefits: MembershipBenefit[] = [
  { icon: 'edit-3', label: 'Make & share' },
  { icon: 'activity', label: 'Daily practice' },
  { icon: 'users', label: 'Community & events' },
];

const dedicatedBenefits: MembershipBenefit[] = [
  { icon: 'play-circle', label: 'Masterclasses' },
  { icon: 'message-circle', label: 'Instructor feedback' },
  { icon: 'award', label: 'Badges & priority events' },
];

const proBenefits: MembershipBenefit[] = [
  { icon: 'compass', label: 'Monthly coaching' },
  { icon: 'briefcase', label: 'Creative opportunities' },
  { icon: 'link-2', label: 'Partner pipeline' },
];
function periodLabel(subscriptionPeriod: string | null | undefined): string {
  if (subscriptionPeriod === 'P1Y') return 'per year';
  if (subscriptionPeriod === 'P1M') return 'per month';
  return '';
}

function isUserCancelled(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'userCancelled' in error &&
    error.userCancelled,
  );
}

export default function MembershipScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const {
    packages,
    hasAcademyAccess,
    hasProAccess,
    isLoading,
    isPurchasing,
    isRestoring,
    errorMessage,
    purchase,
    restore,
    refresh,
  } = useSubscription();
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const orderedPackages = useMemo(() => [...packages].sort((first, second) => {
    const order = [
      'dedicated_monthly',
      'dedicated_annual',
      'academy_monthly',
      'academy_annual',
      'pro_monthly',
      'pro_annual',
    ];
    const ai = order.indexOf(first.identifier);
    const bi = order.indexOf(second.identifier);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  }), [packages]);
  const currentPackages = useMemo(
    () => orderedPackages.filter((item) => {
      const isPro = item.identifier.startsWith('pro_');
      const isDedicated =
        item.identifier.startsWith('dedicated_') ||
        item.identifier.startsWith('academy_');
      return (isPro && hasProAccess) ||
        (isDedicated && !isPro && hasAcademyAccess);
    }),
    [orderedPackages, hasAcademyAccess, hasProAccess],
  );

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: Platform.OS === 'web' ? 76 : insets.top + 10,
      paddingBottom: Platform.OS === 'web' ? 50 : insets.bottom + 34,
      paddingHorizontal: 20,
      gap: 18,
    },
    header: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerLabel: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 12,
      letterSpacing: 1.4,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
    },
    hero: {
      padding: 22,
      borderRadius: colors.radius + 4,
      backgroundColor: colors.ink,
      gap: 10,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.cyan,
    },
    eyebrow: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 11,
      letterSpacing: 1.8,
      color: colors.cyan,
      textTransform: 'uppercase',
    },
    heroTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 31,
      lineHeight: 34,
      letterSpacing: -0.9,
      color: colors.inkForeground,
    },
    heroBody: {
      maxWidth: 440,
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 21,
      color: colors.inkForeground,
      opacity: 0.78,
    },
    status: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 4,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 99,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    statusText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 12,
      color: colors.gold,
    },
    sectionTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 20,
      color: colors.foreground,
    },
    plans: { gap: 12 },
    plan: {
      padding: 18,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 12,
    },
    planFeatured: {
      borderColor: colors.electricMagenta,
      borderWidth: 2,
    },
    planComingSoon: {
      borderWidth: 2,
      opacity: 0.92,
    },
    badge: {
      alignSelf: 'flex-start',
      paddingVertical: 5,
      paddingHorizontal: 9,
      borderRadius: 99,
      backgroundColor: colors.electricMagenta,
    },
    badgeText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 10,
      letterSpacing: 0.9,
      color: colors.primaryForeground,
      textTransform: 'uppercase',
    },
    comingSoonBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 9,
      borderRadius: 99,
      backgroundColor: colors.goldWash,
    },
    comingSoonBadgeText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 10,
      letterSpacing: 0.9,
      color: colors.foreground,
      textTransform: 'uppercase',
    },
    planTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 14,
    },
    planCopy: { flex: 1, gap: 4 },
    planTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 19,
      color: colors.foreground,
    },
    planDescription: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      lineHeight: 17,
      color: colors.mutedForeground,
    },
    price: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 22,
      color: colors.foreground,
      textAlign: 'right',
    },
    period: {
      fontFamily: 'DMSans_500Medium',
      fontSize: 10,
      color: colors.mutedForeground,
      textAlign: 'right',
    },
    benefits: { gap: 8 },
    benefit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    benefitIcon: {
      width: 26,
      height: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: colors.muted,
    },
    benefitText: {
      flex: 1,
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      lineHeight: 18,
      color: colors.foreground,
    },
    choose: {
      minHeight: 46,
      borderRadius: 10,
      backgroundColor: colors.foreground,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    chooseFeatured: { backgroundColor: colors.electricMagenta },
    chooseDisabled: { opacity: 0.45 },
    comingSoonAction: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.muted,
    },
    comingSoonActionText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 13,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    chooseText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 14,
      color: colors.primaryForeground,
    },
    centerCard: {
      padding: 24,
      borderRadius: colors.radius,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 10,
    },
    centerTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 17,
      color: colors.foreground,
      textAlign: 'center',
    },
    centerBody: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 13,
      lineHeight: 19,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    retry: { paddingVertical: 8, paddingHorizontal: 10 },
    retryText: {
      fontFamily: 'DMSans_700Bold',
      color: colors.electricMagenta,
    },
    restore: {
      alignSelf: 'center',
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },
    restoreText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
      color: colors.foreground,
    },
    legal: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 11,
      lineHeight: 16,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    legalLinks: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    legalLink: {
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    legalLinkText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 12,
      color: colors.electricMagenta,
      textDecorationLine: 'underline',
    },
    legalDivider: {
      fontFamily: 'DMSans_400Regular',
      color: colors.mutedForeground,
    },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(44,38,35,0.58)',
    },
    sheet: {
      paddingTop: 14,
      paddingHorizontal: 20,
      paddingBottom: Math.max(insets.bottom, 18) + 10,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: colors.card,
      gap: 14,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    sheetTitle: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 22,
      color: colors.foreground,
    },
    sheetBody: {
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 21,
      color: colors.mutedForeground,
    },
    confirm: {
      minHeight: 50,
      borderRadius: 10,
      backgroundColor: colors.electricMagenta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmText: {
      fontFamily: 'DMSans_700Bold',
      fontSize: 15,
      color: colors.primaryForeground,
    },
    cancel: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: {
      fontFamily: 'DMSans_600SemiBold',
      color: colors.mutedForeground,
    },
  }), [colors, insets]);

  if (isLoaded && !isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const activeLabel = hasProAccess
    ? 'Professional Artist plan active'
    : hasAcademyAccess
      ? 'Dedicated Artist plan active'
      : 'Discovering Artist — free access';

  const buySelectedPackage = async () => {
    if (!selectedPackage) return;
    try {
      await purchase(selectedPackage);
      setSelectedPackage(null);
      setNotice('Your AIMD membership is active on this account.');
      void safeImpact();
    } catch (error) {
      if (isUserCancelled(error)) {
        setSelectedPackage(null);
        return;
      }
      setSelectedPackage(null);
      setNotice('The purchase could not be completed. Please try again.');
    }
  };

  const restorePurchases = async () => {
    try {
      const info = await restore();
      const restored =
        Boolean(info.entitlements.active.academy) ||
        Boolean(info.entitlements.active.pro);
      setNotice(
        restored
          ? 'Your AIMD membership has been restored.'
          : 'No active AIMD membership was found for this Apple ID.',
      );
    } catch {
      setNotice('Purchases could not be restored. Please try again.');
    }
  };

  return (
    <View style={styles.screen} testID="membership-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            testID="membership-back"
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={23} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>Membership</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Build the whole creative life</Text>
          <Text style={styles.heroTitle}>Discipline Eats Talent</Text>
          <Text style={styles.heroBody}>
            Start free. Build the practice. More pathways are on the way.
          </Text>
          <View style={styles.status}>
            <Feather name="check-circle" size={15} color={colors.gold} />
            <Text style={styles.statusText}>{activeLabel}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Choose your path</Text>

        <View style={[styles.plan, { borderColor: colors.border }]} testID="membership-free-tier">
          <View style={styles.planTop}>
            <View style={styles.planCopy}>
              <Text style={styles.planTitle}>Discovering Artist</Text>
              <Text style={styles.planDescription}>Free forever — start here</Text>
            </View>
            <View>
              <Text style={styles.price}>Free</Text>
            </View>
          </View>
          <View style={styles.benefits}>
            {discoveringBenefits.map((benefit) => (
              <View key={benefit.label} style={styles.benefit}>
                <View style={styles.benefitIcon}>
                  <Feather name={benefit.icon} size={14} color={colors.sunsetCoral} />
                </View>
                <Text style={styles.benefitText}>{benefit.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {!hasAcademyAccess && (
          <View
            style={[styles.plan, styles.planComingSoon, { borderColor: colors.cyan, backgroundColor: colors.cyanWash }]}
            testID="membership-dedicated-coming-soon"
          >
            <View style={styles.comingSoonBadge}>
              <Feather name="clock" size={12} color={colors.foreground} />
              <Text style={styles.comingSoonBadgeText}>Coming soon</Text>
            </View>
            <View style={styles.planTop}>
              <View style={styles.planCopy}>
                <Text style={styles.planTitle}>Dedicated Artist</Text>
                <Text style={styles.planDescription}>Learn deeper. Get real feedback.</Text>
              </View>
              <Feather name="layers" size={25} color={colors.cyan} />
            </View>
            <View style={styles.benefits}>
              {dedicatedBenefits.map((benefit) => (
                <View key={benefit.label} style={styles.benefit}>
                  <View style={styles.benefitIcon}>
                    <Feather name={benefit.icon} size={14} color={colors.cyan} />
                  </View>
                  <Text style={styles.benefitText}>{benefit.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.comingSoonAction} accessibilityRole="text">
              <Feather name="clock" size={15} color={colors.mutedForeground} />
              <Text style={styles.comingSoonActionText}>Coming soon</Text>
            </View>
          </View>
        )}

        {!hasProAccess && (
          <View
            style={[styles.plan, styles.planComingSoon, { borderColor: colors.gold, backgroundColor: colors.goldWash }]}
            testID="membership-pro-coming-soon"
          >
            <View style={styles.comingSoonBadge}>
              <Feather name="clock" size={12} color={colors.foreground} />
              <Text style={styles.comingSoonBadgeText}>Coming soon</Text>
            </View>
            <View style={styles.planTop}>
              <View style={styles.planCopy}>
                <Text style={styles.planTitle}>Professional Artist</Text>
                <Text style={styles.planDescription}>Support for the work beyond the studio.</Text>
              </View>
              <Feather name="compass" size={25} color={colors.gold} />
            </View>
            <View style={styles.benefits}>
              {proBenefits.slice(0, 3).map((benefit) => (
                <View key={benefit.label} style={styles.benefit}>
                  <View style={styles.benefitIcon}>
                    <Feather name={benefit.icon} size={14} color={colors.gold} />
                  </View>
                  <Text style={styles.benefitText}>{benefit.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.comingSoonAction} accessibilityRole="text">
              <Feather name="clock" size={15} color={colors.mutedForeground} />
              <Text style={styles.comingSoonActionText}>Coming soon</Text>
            </View>
          </View>
        )}

        {(hasAcademyAccess || hasProAccess) && isLoading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={colors.electricMagenta} />
            <Text style={styles.centerBody}>Loading current App Store options…</Text>
          </View>
        ) : (hasAcademyAccess || hasProAccess) && (errorMessage || currentPackages.length === 0) ? (
          <View style={styles.centerCard}>
            <Feather name="wifi-off" size={24} color={colors.gold} />
            <Text style={styles.centerTitle}>Membership options are unavailable</Text>
            <Text style={styles.centerBody}>
              Check your connection and try again. Your existing access is not affected.
            </Text>
            <TouchableOpacity style={styles.retry} onPress={() => void refresh()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (hasAcademyAccess || hasProAccess) ? (
          <View style={styles.plans}>
            {currentPackages.map((item) => {
              const isPro = item.identifier.startsWith('pro_');
              const isDedicated =
                item.identifier.startsWith('dedicated_') ||
                item.identifier.startsWith('academy_');
              const isAnnual = item.identifier.includes('annual');
              const isCurrent =
                (isPro && hasProAccess) ||
                (isDedicated && !isPro && hasAcademyAccess);
              const benefits = isPro
                ? proBenefits
                : dedicatedBenefits;
              const displayTitle = isPro
                ? 'Professional Artist'
                : 'Dedicated Artist';
              const displayPriceHint = isPro
                ? (isAnnual ? '$999/yr' : '$99/mo')
                : (isAnnual ? '$399/yr' : '$39/mo');

              return (
                <View
                  key={item.identifier}
                  style={[styles.plan, isAnnual && styles.planFeatured]}
                  testID={`membership-package-${item.identifier}`}
                >
                  {isAnnual && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Best value</Text>
                    </View>
                  )}
                  <View style={styles.planTop}>
                    <View style={styles.planCopy}>
                      <Text style={styles.planTitle}>{displayTitle}</Text>
                      <Text style={styles.planDescription}>
                        {displayPriceHint} — {isAnnual ? 'billed annually' : 'billed monthly'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.price}>{item.product.priceString}</Text>
                      <Text style={styles.period}>
                        {periodLabel(item.product.subscriptionPeriod)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.benefits}>
                    {benefits.map((benefit) => (
                      <View key={benefit.label} style={styles.benefit}>
                        <View style={styles.benefitIcon}>
                          <Feather name={benefit.icon} size={14} color={colors.sunsetCoral} />
                        </View>
                        <Text style={styles.benefitText}>{benefit.label}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.choose,
                      isAnnual && styles.chooseFeatured,
                       isCurrent && styles.chooseDisabled,
                    ]}
                    disabled={isCurrent || isPurchasing}
                    testID={`choose-${item.identifier}`}
                    onPress={() => {
                      void safeImpact();
                      setSelectedPackage(item);
                    }}
                  >
                    <Text style={styles.chooseText}>
                      {isCurrent ? 'Your current plan' : `Choose ${displayTitle}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.restore}
          testID="restore-purchases"
          disabled={isRestoring}
          onPress={() => void restorePurchases()}
        >
          {isRestoring ? (
            <ActivityIndicator color={colors.foreground} />
          ) : (
            <Feather name="rotate-ccw" size={16} color={colors.foreground} />
          )}
          <Text style={styles.restoreText}>Restore purchases</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Subscriptions are charged to your Apple ID and renew automatically
          unless canceled at least 24 hours before the current period ends.
          Manage or cancel in Apple subscription settings.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity
            style={styles.legalLink}
            testID="membership-privacy-policy"
            accessibilityRole="link"
            onPress={() => void Linking.openURL('https://artismydrug.com/privacy')}
          >
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>•</Text>
          <TouchableOpacity
            style={styles.legalLink}
            testID="membership-terms"
            accessibilityRole="link"
            onPress={() => void Linking.openURL('https://artismydrug.com/terms')}
          >
            <Text style={styles.legalLinkText}>Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(selectedPackage)}
        onRequestClose={() => setSelectedPackage(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Confirm{' '}
              {selectedPackage?.identifier.startsWith('pro_')
                ? 'Professional Artist'
                : 'Dedicated Artist'}
            </Text>
            <Text style={styles.sheetBody}>
              Continue to Apple's purchase confirmation for{' '}
              {selectedPackage?.product.priceString}{' '}
              {periodLabel(selectedPackage?.product.subscriptionPeriod)}.
            </Text>
            <TouchableOpacity
              style={styles.confirm}
              testID="confirm-membership-purchase"
              disabled={isPurchasing}
              onPress={() => void buySelectedPackage()}
            >
              {isPurchasing ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.confirmText}>Continue with Apple</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancel}
              disabled={isPurchasing}
              onPress={() => setSelectedPackage(null)}
            >
              <Text style={styles.cancelText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(notice)}
        onRequestClose={() => setNotice(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Membership update</Text>
            <Text style={styles.sheetBody}>{notice}</Text>
            <TouchableOpacity
              style={styles.confirm}
              testID="dismiss-membership-notice"
              onPress={() => setNotice(null)}
            >
              <Text style={styles.confirmText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}