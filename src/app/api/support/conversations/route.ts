import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_STATUSES = new Set(["ACTIVE", "ESCALATED", "ADMIN_REPLIED", "RESOLVED", "CLOSED"]);

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    const cursor = url.searchParams.get("cursor") || undefined;
    const statusFilter = url.searchParams.get("status");

    const where: Record<string, unknown> = { userId: session.user.id };
    if (statusFilter) {
      const statuses = statusFilter.split(",").filter(Boolean);
      const validStatuses = statuses.filter((s) => VALID_STATUSES.has(s));
      if (validStatuses.length > 0) {
        where.status = { in: validStatuses };
      }
    }

    const conversations = await prisma.supportConversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        status: true,
        category: true,
        subject: true,
        priority: true,
        escalatedAt: true,
        resolvedAt: true,
        satisfaction: true,
        messageCount: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
        summary: true,
        assignedTo: true,
        feedbackNote: true,
        pageContext: true,
        userPlan: true,
        metadata: true,
        userId: true,
        resolvedBy: true,
      },
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        ...c,
        escalatedAt: c.escalatedAt?.toISOString() || null,
        resolvedAt: c.resolvedAt?.toISOString() || null,
        lastMessageAt: c.lastMessageAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[support/conversations] Error:", error);
    return NextResponse.json(
      { error: "Failed to load conversations" },
      { status: 500 },
    );
  }
}
