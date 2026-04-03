import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const conversation = await prisma.supportConversation.findFirst({
      where: { id, userId: session.user.id },
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

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
    });
  } catch (error) {
    console.error("[support/conversations/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to load conversation" },
      { status: 500 },
    );
  }
}
