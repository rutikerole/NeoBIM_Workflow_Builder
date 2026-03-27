import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminUser } from "@/lib/rate-limit";

/**
 * POST /api/admin/cleanup — Reduce Neon DB data transfer by cleaning old data
 *
 * Actions:
 * - Delete executions older than N days (default 7)
 * - Delete orphaned artifacts
 * - Delete old workflow versions (keep last 3)
 * - Optionally: delete all demo/test workflows
 *
 * Body: { daysToKeep?: number, deleteTestWorkflows?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminUser(session.user.email ?? "")) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const daysToKeep = Number(body.daysToKeep ?? 7);
    const deleteTestWorkflows = body.deleteTestWorkflows === true;
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const results: Record<string, number> = {};

    // 1. Delete old artifacts (biggest data consumer — JSON blobs)
    const oldArtifacts = await prisma.artifact.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });
    results.artifactsDeleted = oldArtifacts.count;

    // 2. Delete old executions
    const oldExecutions = await prisma.execution.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });
    results.executionsDeleted = oldExecutions.count;

    // 3. Delete old workflow versions (keep last 3 per workflow)
    const allVersions = await prisma.workflowVersion.findMany({
      select: { id: true, workflowId: true, version: true },
      orderBy: { version: "desc" },
    });
    const versionsByWorkflow = new Map<string, string[]>();
    for (const v of allVersions) {
      const list = versionsByWorkflow.get(v.workflowId) ?? [];
      list.push(v.id);
      versionsByWorkflow.set(v.workflowId, list);
    }
    const versionIdsToDelete: string[] = [];
    for (const [, ids] of versionsByWorkflow) {
      if (ids.length > 3) versionIdsToDelete.push(...ids.slice(3));
    }
    if (versionIdsToDelete.length > 0) {
      const deleted = await prisma.workflowVersion.deleteMany({
        where: { id: { in: versionIdsToDelete } },
      });
      results.versionsDeleted = deleted.count;
    }

    // 4. Optionally delete test/demo workflows (named "Copy of ...")
    if (deleteTestWorkflows) {
      const testWf = await prisma.workflow.deleteMany({
        where: {
          name: { startsWith: "Copy of " },
          createdAt: { lt: cutoffDate },
        },
      });
      results.testWorkflowsDeleted = testWf.count;
    }

    // 5. Delete old quantity corrections (keep last 30 days)
    const oldCorrections = await prisma.quantityCorrection.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });
    results.correctionsDeleted = oldCorrections.count;

    console.log("[CLEANUP]", results);

    return NextResponse.json({
      success: true,
      message: `Cleaned data older than ${daysToKeep} days`,
      results,
    });
  } catch (error) {
    console.error("[CLEANUP] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/**
 * GET /api/admin/cleanup — Show DB usage stats
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !isAdminUser(session.user.email ?? "")) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const [artifactCount, executionCount, workflowCount, versionCount, userCount] = await Promise.all([
      prisma.artifact.count(),
      prisma.execution.count(),
      prisma.workflow.count(),
      prisma.workflowVersion.count(),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      counts: { artifacts: artifactCount, executions: executionCount, workflows: workflowCount, versions: versionCount, users: userCount },
      tip: "POST to this endpoint with { daysToKeep: 3, deleteTestWorkflows: true } to clean old data",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
