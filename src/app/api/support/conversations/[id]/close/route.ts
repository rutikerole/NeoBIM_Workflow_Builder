import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
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
    });
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (conversation.status === "CLOSED") {
      return NextResponse.json({ error: "Already closed" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.supportConversation.update({
        where: { id },
        data: {
          status: "CLOSED",
          resolvedAt: new Date(),
          messageCount: { increment: 1 },
        },
      }),
      prisma.supportMessage.create({
        data: {
          conversationId: id,
          role: "SYSTEM",
          content: "This conversation has been closed.",
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[support/close] Error:", error);
    return NextResponse.json(
      { error: "Failed to close conversation" },
      { status: 500 },
    );
  }
}
