"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useWorkflowStore } from "@/stores/workflow-store";
import { useExecutionStore } from "@/stores/execution-store";
import { executeNode } from "@/services/mock-executor";
import { generateId } from "@/lib/utils";
import type { Execution } from "@/types/execution";
import type { WorkflowNode } from "@/types/nodes";

export function useExecution() {
  const { nodes, edges, currentWorkflow } = useWorkflowStore();
  const { updateNodeStatus } = useWorkflowStore();
  const {
    startExecution,
    updateExecutionStatus,
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

    // Create execution record
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
    toast.success("Workflow running...", { duration: 2000 });

    // Topological sort — simple L-to-R order based on x position
    const orderedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);

    let hasError = false;

    for (let i = 0; i < orderedNodes.length; i++) {
      const node = orderedNodes[i] as WorkflowNode;
      const progress = Math.round(((i) / orderedNodes.length) * 100);
      setProgress(progress);

      // Set node to running
      updateNodeStatus(node.id, "running");

      try {
        const artifact = await executeNode(
          node.data.catalogueId,
          executionId,
          node.id
        );

        // Store artifact
        addArtifact(node.id, artifact);

        addTileResult({
          tileInstanceId: node.id,
          catalogueId: node.data.catalogueId,
          status: "success",
          startedAt: new Date(),
          completedAt: new Date(),
          artifact,
        });

        // Set node to success
        updateNodeStatus(node.id, "success");

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
        break; // Stop pipeline on error
      }
    }

    setProgress(100);
    const finalStatus = hasError ? "partial" : "success";
    completeExecution(finalStatus);

    if (!hasError) {
      toast.success("Workflow completed successfully!", {
        description: `${orderedNodes.length} nodes executed`,
        duration: 4000,
      });
    }
  }, [
    nodes,
    edges,
    currentWorkflow,
    isExecuting,
    startExecution,
    updateNodeStatus,
    addArtifact,
    addTileResult,
    completeExecution,
    setProgress,
    updateExecutionStatus,
  ]);

  const resetExecution = useCallback(() => {
    nodes.forEach((node) => {
      updateNodeStatus(node.id, "idle");
    });
  }, [nodes, updateNodeStatus]);

  return { runWorkflow, resetExecution, isExecuting };
}
