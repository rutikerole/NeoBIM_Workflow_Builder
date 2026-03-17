import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession, unauthorizedResponse, logAudit } from "@/lib/admin-server";

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "users";

  let csv = "";

  switch (type) {
    case "users": {
      const users = await prisma.user.findMany({
        select: {
          id: true, name: true, email: true, role: true,
          xp: true, level: true, createdAt: true,
          stripeSubscriptionId: true, stripeCurrentPeriodEnd: true,
          _count: { select: { workflows: true, executions: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      csv = "ID,Name,Email,Role,XP,Level,Workflows,Executions,Subscription,Created\n";
      csv += users.map((u) =>
        [
          u.id,
          `"${(u.name || "").replace(/"/g, '""')}"`,
          u.email,
          u.role,
          u.xp,
          u.level,
          u._count.workflows,
          u._count.executions,
          u.stripeSubscriptionId ? "Active" : "None",
          u.createdAt.toISOString().split("T")[0],
        ].join(","),
      ).join("\n");
      break;
    }

    case "executions": {
      const executions = await prisma.execution.findMany({
        select: {
          id: true, status: true, createdAt: true, completedAt: true,
          user: { select: { email: true } },
          workflow: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10000,
      });
      csv = "ID,Status,User,Workflow,Started,Completed\n";
      csv += executions.map((e) =>
        [
          e.id,
          e.status,
          e.user?.email ?? "",
          `"${(e.workflow?.name || "").replace(/"/g, '""')}"`,
          e.createdAt.toISOString(),
          e.completedAt?.toISOString() ?? "",
        ].join(","),
      ).join("\n");
      break;
    }

    case "feedback": {
      const feedback = await prisma.feedback.findMany({
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
      });
      csv = "ID,Type,Status,Title,Category,User,Created,Updated\n";
      csv += feedback.map((f) =>
        [
          f.id,
          f.type,
          f.status,
          `"${f.title.replace(/"/g, '""')}"`,
          f.category ?? "",
          f.user?.email ?? "",
          f.createdAt.toISOString().split("T")[0],
          f.updatedAt.toISOString().split("T")[0],
        ].join(","),
      ).join("\n");
      break;
    }

    case "workflows": {
      const workflows = await prisma.workflow.findMany({
        select: {
          id: true, name: true, complexity: true, isPublished: true, isTemplate: true,
          createdAt: true, owner: { select: { email: true } },
          _count: { select: { executions: true, tiles: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      csv = "ID,Name,Owner,Complexity,Published,Template,Nodes,Executions,Created\n";
      csv += workflows.map((w) =>
        [
          w.id,
          `"${(w.name || "").replace(/"/g, '""')}"`,
          w.owner?.email ?? "",
          w.complexity,
          w.isPublished,
          w.isTemplate,
          w._count.tiles,
          w._count.executions,
          w.createdAt.toISOString().split("T")[0],
        ].join(","),
      ).join("\n");
      break;
    }

    default:
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  await logAudit(session.id, "DATA_EXPORTED", "system", null, { type, rows: csv.split("\n").length - 1 });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="buildflow-${type}-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
