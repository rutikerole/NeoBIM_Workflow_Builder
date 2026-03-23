import { prisma } from "@/lib/db";
import { redis } from "@/lib/rate-limit";
import { trackEvent } from "@/lib/analytics";

export const REFERRAL_BONUS_PER_CLAIM = 1;

/**
 * Claim a referral code for a newly registered user.
 * The original code record stays "pending" (reusable), and a new
 * "completed" record is created for each successful claim.
 *
 * Both the referrer and the referred user get +1 bonus execution.
 *
 * Returns { success, error? }
 */
export async function claimReferralCode(
  code: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!code || !userId) {
      return { success: false, error: "Missing code or userId" };
    }

    const normalizedCode = code.trim().toUpperCase();

    // Find the original referral code record (only "pending" = the reusable link)
    const referral = await prisma.referral.findFirst({
      where: { code: normalizedCode, status: "pending" },
    });

    if (!referral) {
      return { success: false, error: "Invalid referral code" };
    }

    // Prevent self-referral
    if (referral.referrerId === userId) {
      return { success: false, error: "Cannot refer yourself" };
    }

    // Check if this user was already referred by this referrer
    const alreadyClaimed = await prisma.referral.findFirst({
      where: {
        referrerId: referral.referrerId,
        referredId: userId,
        status: "completed",
      },
    });

    if (alreadyClaimed) {
      return { success: false, error: "Already claimed" };
    }

    // Create a new completed referral record (the original stays reusable)
    const claimCode = `${normalizedCode}-${Date.now().toString(36)}`;
    await prisma.referral.create({
      data: {
        referrerId: referral.referrerId,
        referredId: userId,
        code: claimCode,
        status: "completed",
        completedAt: new Date(),
        rewardGiven: true,
      },
    });

    // Grant both users bonus executions in Redis
    try {
      await Promise.all([
        redis.incrby(
          `referral:bonus:${referral.referrerId}`,
          REFERRAL_BONUS_PER_CLAIM
        ),
        redis.incrby(`referral:bonus:${userId}`, REFERRAL_BONUS_PER_CLAIM),
      ]);
    } catch (redisErr) {
      // If Redis fails, roll back the DB record so rewardGiven stays consistent
      console.error("[referral] Redis bonus grant failed:", redisErr);
      await prisma.referral
        .updateMany({
          where: { code: claimCode },
          data: { rewardGiven: false },
        })
        .catch(() => {});
    }

    trackEvent({
      userId: referral.referrerId,
      eventName: "feature_used",
      properties: {
        feature: "referral_claimed",
        referredId: userId,
        code: normalizedCode,
      },
    }).catch(() => {});

    return { success: true };
  } catch (error) {
    console.error("[referral] claimReferralCode error:", error);
    return { success: false, error: "Internal error" };
  }
}
