import { and, eq, inArray } from "drizzle-orm";
import {
  db, usersTable, userRolesTable, enrollmentsTable, workshopInstructorsTable, instructorProfilesTable,
} from "@workspace/db";
import { getRevenueCatTier, membershipTierMeetsRequirement } from "./revenueCatMembership";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "./logger";

export async function isWorkshopStaff(userId: number, workshopId: number): Promise<boolean> {
  const [user] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, userId));
  if (user?.isAdmin) return true;
  const [role] = await db.select({ role: userRolesTable.role }).from(userRolesTable).where(eq(userRolesTable.userId, userId));
  if (role?.role !== "instructor" && role?.role !== "admin") return false;
  const [assignment] = await db.select({ id: workshopInstructorsTable.id })
    .from(workshopInstructorsTable)
    .innerJoin(instructorProfilesTable, eq(instructorProfilesTable.id, workshopInstructorsTable.instructorId))
    .where(and(eq(workshopInstructorsTable.workshopId, workshopId), eq(instructorProfilesTable.userId, userId)));
  return !!assignment;
}

export type WorkshopLessonAccess = {
  hasFullAccess: boolean;
  isStaff: boolean;
  hasParticipantAccess: boolean;
  accessStatus: "granted" | "locked" | "unavailable";
};

/**
 * Lesson access deliberately does NOT trust users.tier. It can outlive a
 * cancelled payment or be manually assigned. Only live provider entitlements,
 * workshop-specific staff grants, and assigned teaching staff unlock lessons.
 */
export async function getWorkshopLessonAccess(
  userId: number | undefined,
  workshopId: number,
): Promise<WorkshopLessonAccess> {
  const locked: WorkshopLessonAccess = {
    hasFullAccess: false, isStaff: false, hasParticipantAccess: false, accessStatus: "locked",
  };
  if (!userId) return locked;
  if (await isWorkshopStaff(userId, workshopId)) {
    return { ...locked, hasFullAccess: true, isStaff: true, accessStatus: "granted" };
  }
  const [participant] = await db.select({ id: enrollmentsTable.id }).from(enrollmentsTable).where(and(
    eq(enrollmentsTable.userId, userId),
    eq(enrollmentsTable.workshopId, workshopId),
    eq(enrollmentsTable.accessSource, "participant"),
    inArray(enrollmentsTable.status, ["active", "completed"]),
  ));
  if (participant) return { ...locked, hasFullAccess: true, hasParticipantAccess: true, accessStatus: "granted" };

  const [user] = await db.select({
    stripeCustomerId: usersTable.stripeCustomerId, clerkId: usersTable.clerkId,
  }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return locked;
  let unavailable = false;
  if (user.stripeCustomerId) {
    try {
      const stripe = await getUncachableStripeClient();
      const subscriptions = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "active", limit: 100 });
      if (subscriptions.data.some((subscription) =>
        subscription.status === "active" &&
        (subscription.metadata?.tier === "academy" || subscription.metadata?.tier === "pro"))) {
        return { ...locked, hasFullAccess: true, accessStatus: "granted" };
      }
    } catch (error) {
      unavailable = true;
      logger.warn({ err: error, userId }, "Unable to verify Stripe lesson access");
    }
  }
  if (user.clerkId && process.env.REVENUECAT_PROJECT_ID &&
      process.env.REVENUECAT_ACADEMY_ENTITLEMENT_ID && process.env.REVENUECAT_PRO_ENTITLEMENT_ID) {
    try {
      if (membershipTierMeetsRequirement(await getRevenueCatTier(user.clerkId), "academy")) {
        return { ...locked, hasFullAccess: true, accessStatus: "granted" };
      }
    } catch (error) {
      unavailable = true;
      logger.warn({ err: error, userId }, "Unable to verify RevenueCat lesson access");
    }
  }
  return { ...locked, accessStatus: unavailable ? "unavailable" : "locked" };
}
