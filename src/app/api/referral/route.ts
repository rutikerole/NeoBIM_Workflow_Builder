import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatErrorResponse, UserErrors } from "@/lib/user-errors";
import { trackEvent } from "@/lib/analytics";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        formatErrorResponse(UserErrors.UNAUTHORIZED),
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
    });

    const total = referrals.length;
    const completed = referrals.filter((r) => r.status === "completed").length;
    const bonusExecutions = completed * 5;

    // Find the user's referral code (from any referral they created)
    const existingReferral = referrals.length > 0 ? referrals[0] : null;

    return NextResponse.json({
      code: existingReferral?.code ?? null,
      stats: {
        totalReferred: total,
        converted: completed,
        bonusExecutions,
      },
    });
  } catch (error) {
    console.error("[api/referral] GET error:", error);
    return NextResponse.json(
      formatErrorResponse(UserErrors.INTERNAL_ERROR),
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        formatErrorResponse(UserErrors.UNAUTHORIZED),
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if user already has a referral code
    const existing = await prisma.referral.findFirst({
      where: { referrerId: userId },
    });

    if (existing) {
      return NextResponse.json({ code: existing.code });
    }

    // Generate unique code: first 4 chars of name + 4 random alphanumeric
    const name = session.user.name ?? "user";
    const prefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "USER";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `${prefix}${suffix}`;

    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        code,
        status: "pending",
      },
    });

    trackEvent({
      userId,
      eventName: "feature_used",
      properties: { feature: "referral_code_generated", code },
    }).catch(() => {});

    return NextResponse.json({ code: referral.code }, { status: 201 });
  } catch (error) {
    console.error("[api/referral] POST error:", error);
    return NextResponse.json(
      formatErrorResponse(UserErrors.INTERNAL_ERROR),
      { status: 500 }
    );
  }
}
