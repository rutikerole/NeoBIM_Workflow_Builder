import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { rating, note } = body as { rating?: number; note?: string };

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 },
      );
    }

    // Verify ownership
    const conversation = await prisma.supportConversation.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update rating + add system message atomically
    await prisma.$transaction([
      prisma.supportConversation.update({
        where: { id },
        data: {
          satisfaction: rating,
          feedbackNote: typeof note === "string" ? note.trim().slice(0, 500) : null,
          messageCount: { increment: 1 },
        },
      }),
      prisma.supportMessage.create({
        data: {
          conversationId: id,
          role: "SYSTEM",
          content: `User rated this conversation ${rating}/5 stars.${note ? ` Feedback: "${note.trim().slice(0, 200)}"` : ""}`,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[support/rate] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 },
    );
  }
}
