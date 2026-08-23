import { describe, expect, it } from "vitest";
import {
  getEffectiveMembershipTier,
  highestMembershipTier,
  membershipTierMeetsRequirement,
  normalizeMembershipTier,
  resolveRevenueCatTier,
} from "./revenueCatMembership";

const entitlementIds = {
  academy: "entitlement-academy",
  pro: "entitlement-pro",
};

describe("RevenueCat membership tier resolution", () => {
  it("prefers Pro when both paid entitlements are active", () => {
    expect(resolveRevenueCatTier([
      { entitlement_id: entitlementIds.academy, expires_at: null },
      { entitlement_id: entitlementIds.pro, expires_at: null },
    ], entitlementIds)).toBe("pro");
  });

  it("ignores expired entitlements", () => {
    expect(resolveRevenueCatTier([
      { entitlement_id: entitlementIds.pro, expires_at: 999 },
    ], entitlementIds, 1_000)).toBe("free");
  });

  it("keeps access active through a future cancellation-period expiry", () => {
    expect(resolveRevenueCatTier([
      {
        entitlement_id: entitlementIds.academy,
        expires_at: "2026-08-23T00:00:00.000Z",
      },
    ], entitlementIds, Date.parse("2026-08-22T23:00:00.000Z"))).toBe("academy");
  });

  it("ignores expired or malformed ISO timestamps", () => {
    expect(resolveRevenueCatTier([
      {
        entitlement_id: entitlementIds.pro,
        expires_at: "2026-08-21T00:00:00.000Z",
      },
      {
        entitlement_id: entitlementIds.academy,
        expires_at: "not-a-date",
      },
    ], entitlementIds, Date.parse("2026-08-22T23:00:00.000Z"))).toBe("free");
  });

  it("preserves the highest access across local and RevenueCat tiers", () => {
    expect(highestMembershipTier("pro", "academy")).toBe("pro");
    expect(highestMembershipTier("free", "academy")).toBe("academy");
  });

  it("keeps legacy workshop access compatible with Academy", () => {
    expect(normalizeMembershipTier("workshop")).toBe("workshop");
    expect(membershipTierMeetsRequirement("workshop", "academy")).toBe(true);
  });

  it("does not require RevenueCat when a legacy tier already grants access", async () => {
    await expect(getEffectiveMembershipTier(
      "academy",
      "legacy-user-without-a-revenuecat-customer",
      "academy",
    )).resolves.toBe("academy");
  });
});