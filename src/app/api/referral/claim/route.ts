import { NextRequest, NextResponse } from "next/server";
import { formatErrorResponse, UserErrors } from "@/lib/user-errors";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { claimReferralCode } from "@/lib/referral";

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

    const result = await claimReferralCode(code, userId);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        "Invalid referral code": 404,
        "Cannot refer yourself": 400,
        "Already claimed": 409,
        "Missing code or userId": 400,
      };
      return NextResponse.json(
        { error: result.error },
        { status: statusMap[result.error ?? ""] ?? 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/referral/claim] POST error:", error);
    return NextResponse.json(
      formatErrorResponse(UserErrors.INTERNAL_ERROR),
      { status: 500 }
    );
  }
}
