import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin-server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) return unauthorizedResponse();

    const rl = await checkEndpointRateLimit(`admin:${admin.id}`, "admin-support-qr", 30, "1 m");
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const replies = await prisma.supportQuickReply.findMany({
      orderBy: { usageCount: "desc" },
    });

    return NextResponse.json({
      replies: replies.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[admin/support/quick-replies] Error:", error);
    return NextResponse.json({ error: "Failed to load quick replies" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin || admin.role === "VIEWER") return unauthorizedResponse();

    const rl = await checkEndpointRateLimit(`admin:${admin.id}`, "admin-support-qr", 30, "1 m");
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const body = await req.json();
    const { title, content, category } = body as {
      title?: string;
      content?: string;
      category?: string;
    };

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const reply = await prisma.supportQuickReply.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category: (category as never) || "GENERAL",
        createdBy: admin.id,
      },
    });

    return NextResponse.json({
      ...reply,
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[admin/support/quick-replies] Error:", error);
    return NextResponse.json({ error: "Failed to create quick reply" }, { status: 500 });
  }
}
