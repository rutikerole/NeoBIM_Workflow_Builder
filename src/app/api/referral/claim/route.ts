import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, UserErrors } from "@/lib/user-errors";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { trackEvent } from "@/lib/analytics";
import { Redis } from "@upstash/redis";

let redis: Redis;
try {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "https://placeholder.upstash.io",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "placeholder",
  });
} catch {
  redis = new Redis({
    url: "https://placeholder.upstash.io",
    token: "placeholder",
  });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP (no auth required — called during registration)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rl = await checkEndpointRateLimit(ip, "referral-claim", 10, "1 m");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code, userId } = body as { code: string; userId: string };

    if (!code || !userId) {
      return NextResponse.json(
        { error: "Missing code or userId" },
        { status: 400 }
      );
    }

    // Find the referral by code
    const referral = await prisma.referral.findFirst({
      where: { code: code.trim().toUpperCase() },
    });

    if (!referral) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 }
      );
    }

    // Verify it's still claimable
    if (referral.status !== "pending" || referral.referredId !== null) {
      return NextResponse.json(
        { error: "Referral code already used" },
        { status: 409 }
      );
    }

    // Prevent self-referral
    if (referral.referrerId === userId) {
      return NextResponse.json(
        { error: "Cannot refer yourself" },
        { status: 400 }
      );
    }

    // Update the referral record
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredId: userId,
        status: "completed",
        completedAt: new Date(),
        rewardGiven: true,
      },
    });

    // Grant both users +5 bonus executions in Redis
    try {
      await Promise.all([
        redis.incrby(`referral:bonus:${referral.referrerId}`, 5),
        redis.incrby(`referral:bonus:${userId}`, 5),
      ]);
    } catch (redisErr) {
      console.warn("[referral/claim] Redis bonus grant failed:", redisErr);
    }

    trackEvent({
      userId: referral.referrerId,
      eventName: "feature_used",
      properties: { feature: "referral_claimed", referredId: userId, code },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/referral/claim] POST error:", error);
    return NextResponse.json(
      formatErrorResponse(UserErrors.INTERNAL_ERROR),
      { status: 500 }
    );
  }
}
