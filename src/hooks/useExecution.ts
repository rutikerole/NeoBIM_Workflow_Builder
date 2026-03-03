"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useExecutionStore } from "@/stores/execution-store";
import { executeNode } from "@/services/mock-executor";
import { generateId } from "@/lib/utils";
import type { Execution } from "@/types/execution";
import type { WorkflowNode } from "@/types/nodes";

const FLOW_DURATION_MS = 1600;

export function useExecution() {
  const { nodes, currentWorkflow, updateNodeStatus, setEdgeFlowing } = useWorkflowStore();
  const {
    startExecution,
    addTileResult,
    addArtifact,
    completeExecution,
    setProgress,
    isExecuting,
  } = useExecutionStore();

  const runWorkflow = useCallback(async () => {
    if (isExecuting) return;
    if (nodes.length === 0) {
      toast.error("Add some nodes to the canvas first");
      return;
    }

    const executionId = generateId();
    const execution: Execution = {
      id: executionId,
      workflowId: currentWorkflow?.id ?? "unsaved",
      userId: "demo",
      status: "running",
      startedAt: new Date(),
      tileResults: [],
      createdAt: new Date(),
    };

    startExecution(execution);
    toast.success("Workflow running…", { duration: 2000 });

    // Left-to-right topological order based on x position
    const orderedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);

    let hasError = false;

    for (let i = 0; i < orderedNodes.length; i++) {
      const node = orderedNodes[i] as WorkflowNode;
      setProgress(Math.round((i / orderedNodes.length) * 100));

      updateNodeStatus(node.id, "running");

      try {
        const artifact = await executeNode(node.data.catalogueId, executionId, node.id);

        addArtifact(node.id, artifact);
        addTileResult({
          tileInstanceId: node.id,
          catalogueId: node.data.catalogueId,
          status: "success",
          startedAt: new Date(),
          completedAt: new Date(),
          artifact,
        });

        updateNodeStatus(node.id, "success");

        // Animate outgoing edges as data flows to the next node
        setEdgeFlowing(node.id, true);
        setTimeout(() => setEdgeFlowing(node.id, false), FLOW_DURATION_MS);

      } catch (error) {
        hasError = true;
        updateNodeStatus(node.id, "error");
        addTileResult({
          tileInstanceId: node.id,
          catalogueId: node.data.catalogueId,
          status: "error",
          startedAt: new Date(),
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
        toast.error(`Node "${node.data.label}" failed`, { duration: 4000 });
        break;
      }
    }

    setProgress(100);
    completeExecution(hasError ? "partial" : "success");

    if (!hasError) {
      toast.success("Workflow completed", {
        description: `${orderedNodes.length} nodes executed`,
        duration: 4000,
      });
    }
  }, [
    nodes,
    currentWorkflow,
    isExecuting,
    startExecution,
    updateNodeStatus,
    setEdgeFlowing,
    addArtifact,
    addTileResult,
    completeExecution,
    setProgress,
  ]);

  const resetExecution = useCallback(() => {
    nodes.forEach((node) => updateNodeStatus(node.id, "idle"));
  }, [nodes, updateNodeStatus]);

  return { runWorkflow, resetExecution, isExecuting };
}
