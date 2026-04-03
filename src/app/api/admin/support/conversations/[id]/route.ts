import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, unauthorizedResponse, logAudit } from "@/lib/admin-server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import type { AuditAction } from "@/lib/admin-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdminSession();
    if (!admin || admin.role === "VIEWER") return unauthorizedResponse();

    const rl = await checkEndpointRateLimit(`admin:${admin.id}`, "admin-support-detail", 60, "1 m");
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const { id } = await params;

    const conversation = await prisma.supportConversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            createdAt: true,
            _count: { select: { workflows: true, executions: true } },
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    logAudit(admin.id, "SUPPORT_VIEW" as AuditAction, "CONVERSATION", id).catch(() => {});

    return NextResponse.json({
      ...conversation,
      escalatedAt: conversation.escalatedAt?.toISOString() || null,
      resolvedAt: conversation.resolvedAt?.toISOString() || null,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        isInternal: m.isInternal,
        createdAt: m.createdAt.toISOString(),
      })),
      user: {
        ...conversation.user,
        createdAt: conversation.user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[admin/support/conversations/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}
