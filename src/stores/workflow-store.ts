"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { WorkflowNode, WorkflowEdge, NodeStatus } from "@/types/nodes";
import type { Workflow, WorkflowTemplate, CreationMode } from "@/types/workflow";
import { generateId } from "@/lib/utils";

interface WorkflowState {
  // Current workflow
  currentWorkflow: Workflow | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isDirty: boolean;
  isSaving: boolean;

  // Creation mode
  creationMode: CreationMode;

  // Actions
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  loadFromTemplate: (template: WorkflowTemplate) => void;
  setCreationMode: (mode: CreationMode) => void;

  // Node operations
  addNode: (node: WorkflowNode) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void;
  setNodes: (nodes: WorkflowNode[]) => void;

  // Edge operations
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (edgeId: string) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setEdgeFlowing: (sourceNodeId: string, flowing: boolean) => void;

  // Persistence
  markDirty: () => void;
  markClean: () => void;
  setSaving: (isSaving: boolean) => void;

  // Reset
  resetCanvas: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  subscribeWithSelector((set) => ({
    currentWorkflow: null,
    nodes: [],
    edges: [],
    isDirty: false,
    isSaving: false,
    creationMode: "manual",

    setCurrentWorkflow: (workflow) => {
      if (workflow) {
        set({
          currentWorkflow: workflow,
          nodes: workflow.tileGraph.nodes,
          edges: workflow.tileGraph.edges,
          isDirty: false,
        });
      } else {
        set({ currentWorkflow: null, nodes: [], edges: [], isDirty: false });
      }
    },

    loadFromTemplate: (template) => {
      const newWorkflow: Workflow = {
        id: generateId(),
        ownerId: "",
        name: `Copy of ${template.name}`,
        description: template.description,
        tags: [...template.tags],
        tileGraph: {
          nodes: template.tileGraph.nodes.map((n) => ({
            ...n,
            id: `${n.id}-${generateId()}`,
            data: { ...n.data, status: "idle" as NodeStatus },
          })),
          edges: template.tileGraph.edges.map((e) => ({
            ...e,
            id: `${e.id}-${generateId()}`,
          })),
        },
        version: 1,
        isPublished: false,
        isTemplate: false,
        category: template.category,
        complexity: template.complexity,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Remap edge source/target to new node ids
      const idMap = new Map<string, string>();
      template.tileGraph.nodes.forEach((origNode, i) => {
        idMap.set(origNode.id, newWorkflow.tileGraph.nodes[i].id);
      });

      newWorkflow.tileGraph.edges = newWorkflow.tileGraph.edges.map((e, i) => ({
        ...e,
        source: idMap.get(template.tileGraph.edges[i]?.source ?? "") ?? e.source,
        target: idMap.get(template.tileGraph.edges[i]?.target ?? "") ?? e.target,
      }));

      set({
        currentWorkflow: newWorkflow,
        nodes: newWorkflow.tileGraph.nodes,
        edges: newWorkflow.tileGraph.edges,
        isDirty: true,
      });
    },

    setCreationMode: (mode) => set({ creationMode: mode }),

    addNode: (node) =>
      set((state) => ({
        nodes: [...state.nodes, node],
        isDirty: true,
      })),

    removeNode: (nodeId) =>
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        ),
        isDirty: true,
      })),

    updateNode: (nodeId, updates) =>
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, ...updates } : n
        ),
        isDirty: true,
      })),

    updateNodeStatus: (nodeId, status) =>
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status } }
            : n
        ),
      })),

    setNodes: (nodes) => set({ nodes, isDirty: true }),

    addEdge: (edge) =>
      set((state) => ({
        edges: [...state.edges, edge],
        isDirty: true,
      })),

    removeEdge: (edgeId) =>
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== edgeId),
        isDirty: true,
      })),

    setEdges: (edges) => set({ edges, isDirty: true }),

    setEdgeFlowing: (sourceNodeId, flowing) =>
      set((state) => ({
        edges: state.edges.map((e) =>
          e.source === sourceNodeId
            ? { ...e, data: { ...e.data, isFlowing: flowing } }
            : e
        ),
      })),

    markDirty: () => set({ isDirty: true }),
    markClean: () => set({ isDirty: false }),
    setSaving: (isSaving) => set({ isSaving }),

    resetCanvas: () =>
      set({
        nodes: [],
        edges: [],
        isDirty: false,
        currentWorkflow: null,
      }),
  }))
);
