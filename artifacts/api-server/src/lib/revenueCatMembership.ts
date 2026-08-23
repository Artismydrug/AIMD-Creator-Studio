import { ReplitConnectors } from "@replit/connectors-sdk";

export type MembershipTier = "free" | "workshop" | "academy" | "pro";

type ActiveEntitlement = {
  entitlement_id?: string;
  expires_at?: number | string | null;
};

type ActiveEntitlementsResponse = {
  items?: ActiveEntitlement[];
};

type CacheEntry = {
  expiresAt: number;
  tier: MembershipTier;
};

const CACHE_TTL_MS = 30_000;
const tierCache = new Map<string, CacheEntry>();

const TIER_RANK: Record<MembershipTier, number> = {
  free: 0,
  workshop: 1,
  academy: 1,
  pro: 2,
};

export function normalizeMembershipTier(tier: string | null | undefined): MembershipTier {
  if (tier === "workshop" || tier === "academy" || tier === "pro") return tier;
  return "free";
}

export function highestMembershipTier(
  first: MembershipTier,
  second: MembershipTier,
): MembershipTier {
  return TIER_RANK[second] > TIER_RANK[first] ? second : first;
}

export function membershipTierMeetsRequirement(
  currentTier: MembershipTier,
  requiredTier: MembershipTier,
): boolean {
  return TIER_RANK[currentTier] >= TIER_RANK[requiredTier];
}

function expirationTime(expiresAt: ActiveEntitlement["expires_at"]): number | null {
  if (expiresAt === null || expiresAt === undefined) return null;
  if (typeof expiresAt === "number") {
    return Number.isFinite(expiresAt) ? expiresAt : Number.NaN;
  }
  const parsed = Date.parse(expiresAt);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function resolveRevenueCatTier(
  entitlements: ActiveEntitlement[],
  entitlementIds: { academy: string; pro: string },
  now = Date.now(),
): MembershipTier {
  const activeIds = new Set(
    entitlements
      .filter((entitlement) => {
        if (!entitlement.entitlement_id) return false;
        const expiresAt = expirationTime(entitlement.expires_at);
        return expiresAt === null || expiresAt > now;
      })
      .map((entitlement) => entitlement.entitlement_id),
  );

  if (activeIds.has(entitlementIds.pro)) return "pro";
  if (activeIds.has(entitlementIds.academy)) return "academy";
  return "free";
}

export async function getRevenueCatTier(appUserId: string): Promise<MembershipTier> {
  const cached = tierCache.get(appUserId);
  if (cached && cached.expiresAt > Date.now()) return cached.tier;

  const projectId = process.env.REVENUECAT_PROJECT_ID;
  const academyEntitlementId = process.env.REVENUECAT_ACADEMY_ENTITLEMENT_ID;
  const proEntitlementId = process.env.REVENUECAT_PRO_ENTITLEMENT_ID;

  if (!projectId || !academyEntitlementId || !proEntitlementId) {
    throw new Error("RevenueCat membership configuration is incomplete");
  }

  const connectors = new ReplitConnectors();
  const response = await connectors.proxy(
    "revenuecat",
    `/v2/projects/${projectId}/customers/${encodeURIComponent(appUserId)}/active_entitlements?limit=100`,
    { method: "GET" },
  );

  if (response.status === 404) {
    tierCache.set(appUserId, { tier: "free", expiresAt: Date.now() + CACHE_TTL_MS });
    return "free";
  }

  if (!response.ok) {
    throw new Error(`RevenueCat membership lookup failed with status ${response.status}`);
  }

  const body = await response.json() as ActiveEntitlementsResponse;
  const tier = resolveRevenueCatTier(body.items ?? [], {
    academy: academyEntitlementId,
    pro: proEntitlementId,
  });

  tierCache.set(appUserId, { tier, expiresAt: Date.now() + CACHE_TTL_MS });
  return tier;
}

export async function getEffectiveMembershipTier(
  localTier: string | null | undefined,
  appUserId: string | null | undefined,
  requiredTier?: MembershipTier,
): Promise<MembershipTier> {
  const normalizedLocalTier = normalizeMembershipTier(localTier);
  if (
    !appUserId ||
    normalizedLocalTier === "pro" ||
    (requiredTier &&
      membershipTierMeetsRequirement(normalizedLocalTier, requiredTier))
  ) {
    return normalizedLocalTier;
  }

  const revenueCatTier = await getRevenueCatTier(appUserId);
  return highestMembershipTier(normalizedLocalTier, revenueCatTier);
}

export function clearRevenueCatTierCache(): void {
  tierCache.clear();
}