import { prisma } from "@/lib/db";
import { isSubscriptionActive } from "@/lib/stripe";

export type SubscriptionStatus = {
  isPro: boolean;
  isActive: boolean;
  currentPeriodEnd: Date | null;
  plan: "FREE" | "PRO" | "TEAM";
};

/**
 * Get user's subscription status
 * @param userId - User ID
 * @returns Subscription status
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      stripeCurrentPeriodEnd: true,
      stripePriceId: true,
    },
  });

  if (!user) {
    return {
      isPro: false,
      isActive: false,
      currentPeriodEnd: null,
      plan: "FREE",
    };
  }

  const isActive = isSubscriptionActive(user.stripeCurrentPeriodEnd);
  const isPro = (user.role === "PRO" || user.role === "TEAM_ADMIN") && isActive;

  return {
    isPro,
    isActive,
    currentPeriodEnd: user.stripeCurrentPeriodEnd,
    plan: user.role as "FREE" | "PRO" | "TEAM",
  };
}

/**
 * Check if user has access to a feature based on their subscription
 * @param userId - User ID
 * @param feature - Feature to check
 * @returns true if user has access
 */
export async function hasFeatureAccess(
  userId: string,
  feature: "unlimited_runs" | "private_workflows" | "advanced_ai" | "export" | "team_collab"
): Promise<boolean> {
  const status = await getSubscriptionStatus(userId);

  // Free tier has no premium features
  if (!status.isPro) {
    return false;
  }

  // PRO and TEAM users have access to all features
  // (You can add more granular checks here if needed)
  return true;
}
