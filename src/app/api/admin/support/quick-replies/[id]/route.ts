import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin-server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdminSession();
    if (!admin || admin.role === "VIEWER") return unauthorizedResponse();

    const rl = await checkEndpointRateLimit(`admin:${admin.id}`, "admin-support-qr", 30, "1 m");
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const { id } = await params;
    const body = await req.json();
    const { title, content, category } = body as {
      title?: string;
      content?: string;
      category?: string;
    };

    const existing = await prisma.supportQuickReply.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const reply = await prisma.supportQuickReply.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(content ? { content: content.trim() } : {}),
        ...(category ? { category: category as never } : {}),
      },
    });

    return NextResponse.json({
      ...reply,
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[admin/support/quick-replies/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update quick reply" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getAdminSession();
    if (!admin || admin.role === "VIEWER") return unauthorizedResponse();

    const rl = await checkEndpointRateLimit(`admin:${admin.id}`, "admin-support-qr", 30, "1 m");
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const { id } = await params;

    await prisma.supportQuickReply.delete({ where: { id } }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/support/quick-replies/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete quick reply" }, { status: 500 });
  }
}
