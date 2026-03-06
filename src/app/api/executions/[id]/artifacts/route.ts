import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// POST /api/executions/[id]/artifacts — append node artifact into tileResults JSON
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: executionId } = await params;

    // Verify ownership
    const execution = await prisma.execution.findFirst({
      where: { id: executionId, userId: session.user.id },
    });
    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    const { nodeId, nodeLabel, type, title, data } = await req.json();

    // Append artifact entry to tileResults JSON array
    const existing = Array.isArray(execution.tileResults) ? execution.tileResults : [];
    const updated = [
      ...existing,
      { nodeId, nodeLabel, type, title, data, createdAt: new Date().toISOString() },
    ];

    const updatedExecution = await prisma.execution.update({
      where: { id: executionId },
      data: { tileResults: updated },
    });

    return NextResponse.json({ execution: updatedExecution }, { status: 201 });
  } catch (error) {
    console.error("[executions/artifacts/POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
