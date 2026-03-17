import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, unauthorizedResponse, logAudit } from "@/lib/admin-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  const { id } = await params;
  const body = await req.json();

  // Get current feedback for audit log
  const currentFeedback = await prisma.feedback.findUnique({
    where: { id },
    select: { status: true, title: true },
  });

  const allowedUpdates: Record<string, unknown> = {};
  if (body.status && ["NEW", "REVIEWING", "PLANNED", "IN_PROGRESS", "DONE", "DECLINED"].includes(body.status)) {
    allowedUpdates.status = body.status;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const feedback = await prisma.feedback.update({
    where: { id },
    data: allowedUpdates,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await logAudit(session.id, "FEEDBACK_STATUS_CHANGED", "feedback", id, {
    title: currentFeedback?.title,
    oldStatus: currentFeedback?.status,
    newStatus: body.status,
  });

  return NextResponse.json({ success: true, feedback });
}
