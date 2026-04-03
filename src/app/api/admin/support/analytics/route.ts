import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, unauthorizedResponse } from "@/lib/admin-server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return unauthorizedResponse();

    const rl = await checkEndpointRateLimit(`admin:${admin.id}`, "admin-support-analytics", 10, "1 m");
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "30d";
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const conversations = await prisma.supportConversation.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        status: true,
        category: true,
        escalatedAt: true,
        resolvedAt: true,
        satisfaction: true,
        messageCount: true,
        createdAt: true,
      },
    });

    const total = conversations.length;
    const escalated = conversations.filter((c) => c.escalatedAt).length;
    const resolved = conversations.filter((c) =>
      c.status === "RESOLVED" || c.status === "CLOSED",
    ).length;
    const aiResolved = conversations.filter((c) =>
      (c.status === "RESOLVED" || c.status === "CLOSED") && !c.escalatedAt,
    ).length;

    // Avg resolution time
    const resolutionTimes = conversations
      .filter((c) => c.escalatedAt && c.resolvedAt)
      .map((c) => c.resolvedAt!.getTime() - c.escalatedAt!.getTime());
    const avgResolutionMs = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    // Satisfaction
    const rated = conversations.filter((c) => c.satisfaction !== null);
    const avgSatisfaction = rated.length > 0
      ? rated.reduce((a, c) => a + (c.satisfaction ?? 0), 0) / rated.length
      : 0;

    // Category counts
    const categoryCounts: Record<string, number> = {};
    conversations.forEach((c) => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Volume by day
    const volumeMap: Record<string, number> = {};
    conversations.forEach((c) => {
      const date = c.createdAt.toISOString().split("T")[0];
      volumeMap[date] = (volumeMap[date] || 0) + 1;
    });
    const volumeByDay = Object.entries(volumeMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Satisfaction distribution
    const satDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rated.forEach((c) => {
      if (c.satisfaction) satDist[c.satisfaction] = (satDist[c.satisfaction] || 0) + 1;
    });
    const satisfactionDistribution = Object.entries(satDist).map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
    }));

    // Busiest hours
    const hourCounts: Record<number, number> = {};
    conversations.forEach((c) => {
      const hour = c.createdAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const busiestHours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourCounts[h] || 0,
    }));

    // Avg messages per conversation
    const avgMessages = total > 0
      ? conversations.reduce((a, c) => a + c.messageCount, 0) / total
      : 0;

    // Top first messages
    const firstMsgs = await prisma.supportMessage.findMany({
      where: {
        role: "USER",
        conversation: { createdAt: { gte: since } },
      },
      orderBy: { createdAt: "asc" },
      distinct: ["conversationId"],
      take: 200,
      select: { content: true },
    });
    const msgFreq: Record<string, number> = {};
    firstMsgs.forEach((m) => {
      const normalized = m.content.trim().toLowerCase().slice(0, 80);
      msgFreq[normalized] = (msgFreq[normalized] || 0) + 1;
    });
    const topFirstMessages = Object.entries(msgFreq)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      totalConversations: total,
      escalationRate: total > 0 ? Math.round((escalated / total) * 100) : 0,
      aiResolutionRate: resolved > 0 ? Math.round((aiResolved / resolved) * 100) : 0,
      avgResolutionTimeHours: Math.round((avgResolutionMs / (1000 * 60 * 60)) * 10) / 10,
      avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
      avgMessagesPerConversation: Math.round(avgMessages * 10) / 10,
      topCategories,
      volumeByDay,
      satisfactionDistribution,
      busiestHours,
      topFirstMessages,
    });
  } catch (error) {
    console.error("[admin/support/analytics] Error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
