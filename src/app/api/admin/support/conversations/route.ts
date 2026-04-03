import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin-server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import type { Prisma } from "@prisma/client";

const VALID_STATUSES = new Set(["ACTIVE", "ESCALATED", "ADMIN_REPLIED", "RESOLVED", "CLOSED"]);
const VALID_CATEGORIES = new Set([
  "GENERAL", "WORKFLOW_HELP", "NODE_EXECUTION", "BILLING", "BUG_REPORT",
  "FEATURE_REQUEST", "IFC_PARSING", "COST_ESTIMATION", "THREE_D_GENERATION",
  "ACCOUNT", "TECHNICAL",
]);
const VALID_PRIORITIES = new Set([0, 1, 2]);

export async function GET(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin || admin.role === "VIEWER") return unauthorizedResponse();

    const rl = await checkEndpointRateLimit(`admin:${admin.id}`, "admin-support-list", 60, "1 m");
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const priority = url.searchParams.get("priority");
    const assignedTo = url.searchParams.get("assignedTo");
    const search = url.searchParams.get("search");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(url.searchParams.get("limit") || "20"));
    const sort = url.searchParams.get("sort") || "newest";

    const where: Prisma.SupportConversationWhereInput = {};

    if (status && VALID_STATUSES.has(status)) {
      where.status = status as Prisma.SupportConversationWhereInput["status"];
    }
    if (category && VALID_CATEGORIES.has(category)) {
      where.category = category as Prisma.SupportConversationWhereInput["category"];
    }
    if (priority) {
      const p = parseInt(priority);
      if (VALID_PRIORITIES.has(p)) where.priority = p;
    }
    if (assignedTo === "unassigned") {
      where.assignedTo = null;
    } else if (assignedTo) {
      where.assignedTo = assignedTo;
    }
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orderBy: Prisma.SupportConversationOrderByWithRelationInput =
      sort === "oldest" ? { createdAt: "asc" } :
      sort === "priority" ? { priority: "desc" } :
      sort === "lastMessage" ? { lastMessageAt: "desc" } :
      { createdAt: "desc" };

    const [conversations, total] = await Promise.all([
      prisma.supportConversation.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            where: { isInternal: false },
            select: { content: true },
          },
        },
      }),
      prisma.supportConversation.count({ where }),
    ]);

    const items = conversations.map((c) => ({
      id: c.id,
      status: c.status,
      category: c.category,
      subject: c.subject,
      summary: c.summary,
      priority: c.priority,
      escalatedAt: c.escalatedAt?.toISOString() || null,
      resolvedAt: c.resolvedAt?.toISOString() || null,
      assignedTo: c.assignedTo,
      satisfaction: c.satisfaction,
      messageCount: c.messageCount,
      lastMessageAt: c.lastMessageAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      lastMessagePreview: c.messages[0]?.content?.slice(0, 100) || null,
      user: {
        id: c.user.id,
        name: c.user.name,
        email: c.user.email,
        image: c.user.image,
        role: c.user.role,
      },
    }));

    return NextResponse.json({
      conversations: items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[admin/support/conversations] Error:", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}
