import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '@clerk/expo';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

const TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

export const ACADEMY_ENTITLEMENT = 'academy';
export const PRO_ENTITLEMENT = 'pro';

let isConfigured = false;
let initializationError: Error | null = null;

function getApiKey(): string {
  const isPreview =
    __DEV__ ||
    Platform.OS === 'web' ||
    Constants.executionEnvironment === 'storeClient';

  if (isPreview || Platform.OS !== 'ios') {
    if (!TEST_API_KEY) throw new Error('RevenueCat Test Store key is missing');
    return TEST_API_KEY;
  }

  if (!IOS_API_KEY) throw new Error('RevenueCat iOS key is missing');
  return IOS_API_KEY;
}

export function initializeRevenueCat(): void {
  if (isConfigured) return;

  try {
    Purchases.setLogLevel(
      __DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.WARN,
    );
    Purchases.configure({ apiKey: getApiKey() });
    isConfigured = true;
    initializationError = null;
  } catch (error) {
    initializationError =
      error instanceof Error ? error : new Error('RevenueCat could not be initialized');
    throw initializationError;
  }
}

type SubscriptionContextValue = {
  currentOffering: PurchasesOffering | null;
  packages: PurchasesPackage[];
  customerInfo: CustomerInfo | null;
  hasAcademyAccess: boolean;
  hasProAccess: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  errorMessage: string | null;
  purchase: (packageToPurchase: PurchasesPackage) => Promise<CustomerInfo>;
  restore: () => Promise<CustomerInfo>;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();
  const enabled = isConfigured && isLoaded && Boolean(userId);

  const identityQuery = useQuery({
    queryKey: ['revenuecat', 'identity', userId],
    enabled,
    retry: 1,
    queryFn: async () => {
      const result = await Purchases.logIn(userId!);
      return result.customerInfo;
    },
  });

  const customerInfoQuery = useQuery({
    queryKey: ['revenuecat', 'customer-info', userId],
    enabled: enabled && identityQuery.isSuccess,
    retry: 1,
    staleTime: 60_000,
    queryFn: () => Purchases.getCustomerInfo(),
  });

  const offeringsQuery = useQuery({
    queryKey: ['revenuecat', 'offerings'],
    enabled,
    retry: 1,
    staleTime: 5 * 60_000,
    queryFn: () => Purchases.getOfferings(),
  });

  useEffect(() => {
    if (!enabled) return;

    const listener = (info: CustomerInfo) => {
      queryClient.setQueryData(['revenuecat', 'customer-info', userId], info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [enabled, queryClient, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && enabled) {
        void customerInfoQuery.refetch();
        void offeringsQuery.refetch();
      }
    });
    return () => subscription.remove();
  }, [customerInfoQuery, enabled, offeringsQuery]);

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      const result = await Purchases.purchasePackage(packageToPurchase);
      return result.customerInfo;
    },
    onSuccess: (customerInfo) => {
      queryClient.setQueryData(['revenuecat', 'customer-info', userId], customerInfo);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => Purchases.restorePurchases(),
    onSuccess: (customerInfo) => {
      queryClient.setQueryData(['revenuecat', 'customer-info', userId], customerInfo);
    },
  });

  const customerInfo = customerInfoQuery.data ?? identityQuery.data ?? null;
  const activeEntitlements = customerInfo?.entitlements.active ?? {};
  const hasProAccess = Boolean(activeEntitlements[PRO_ENTITLEMENT]);
  const hasAcademyAccess =
    hasProAccess || Boolean(activeEntitlements[ACADEMY_ENTITLEMENT]);

  const firstError =
    initializationError ??
    identityQuery.error ??
    customerInfoQuery.error ??
    offeringsQuery.error;

  const value = useMemo<SubscriptionContextValue>(() => ({
    currentOffering: offeringsQuery.data?.current ?? null,
    packages: offeringsQuery.data?.current?.availablePackages ?? [],
    customerInfo,
    hasAcademyAccess,
    hasProAccess,
    isLoading:
      isLoaded &&
      Boolean(userId) &&
      (identityQuery.isLoading ||
        customerInfoQuery.isLoading ||
        offeringsQuery.isLoading),
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    errorMessage: firstError instanceof Error ? firstError.message : null,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    refresh: async () => {
      await Promise.all([
        customerInfoQuery.refetch(),
        offeringsQuery.refetch(),
      ]);
    },
  }), [
    customerInfo,
    customerInfoQuery,
    firstError,
    hasAcademyAccess,
    hasProAccess,
    identityQuery.isLoading,
    isLoaded,
    offeringsQuery,
    purchaseMutation.isPending,
    purchaseMutation.mutateAsync,
    restoreMutation.isPending,
    restoreMutation.mutateAsync,
    userId,
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}