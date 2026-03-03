"use client";

import React, { useCallback, useRef } from "react";
import { useExecution } from "@/hooks/useExecution";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type OnConnect,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { BaseNode } from "./nodes/BaseNode";
import { AnimatedEdge } from "./edges/AnimatedEdge";
import { NodeLibraryPanel } from "./panels/NodeLibraryPanel";
import { CanvasToolbar } from "./toolbar/CanvasToolbar";
import { ArtifactCard } from "./artifacts/ArtifactCard";
import { PromptInput } from "@/components/ai/PromptInput";

import { useWorkflowStore } from "@/stores/workflow-store";
import { useExecutionStore } from "@/stores/execution-store";
import { useUIStore } from "@/stores/ui-store";
import { NODE_CATALOGUE_MAP, CATEGORY_CONFIG } from "@/constants/node-catalogue";
import type { WorkflowNodeData, NodeCategory } from "@/types/nodes";
import type { WorkflowNode, WorkflowEdge } from "@/types/nodes";
import { generateId } from "@/lib/utils";

// Register custom node and edge types
const nodeTypes = {
  workflowNode: BaseNode,
};

const edgeTypes = {
  animatedEdge: AnimatedEdge,
};

interface WorkflowCanvasInnerProps {
  workflowId?: string;
}

function WorkflowCanvasInner({ workflowId }: WorkflowCanvasInnerProps) {
  const { fitView, screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Stores
  const {
    nodes: storeNodes,
    edges: storeEdges,
    currentWorkflow,
    creationMode,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    addNode,
    addEdge: addStoreEdge,
    isDirty,
    isSaving,
    markDirty,
    setCreationMode,
  } = useWorkflowStore();

  const { artifacts } = useExecutionStore();
  const { isNodeLibraryOpen, setPromptModeActive, isPromptModeActive } = useUIStore();
  const { runWorkflow, isExecuting } = useExecution();

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges as Edge[]);

  // Sync store → React Flow state when store updates
  React.useEffect(() => {
    setNodes(storeNodes as unknown as Node[]);
  }, [storeNodes, setNodes]);

  React.useEffect(() => {
    setEdges(storeEdges as Edge[]);
  }, [storeEdges, setEdges]);

  // Handle connections
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: WorkflowEdge = {
        id: `e${connection.source}-${connection.target}-${generateId()}`,
        source: connection.source ?? "",
        sourceHandle: connection.sourceHandle ?? "",
        target: connection.target ?? "",
        targetHandle: connection.targetHandle ?? "",
        type: "animatedEdge",
      };

      setEdges((eds) => addEdge({ ...connection, type: "animatedEdge" }, eds));
      addStoreEdge(newEdge);
    },
    [setEdges, addStoreEdge]
  );

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      markDirty();
    },
    [onNodesChange, markDirty]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      onEdgesChange(changes);
      markDirty();
    },
    [onEdgesChange, markDirty]
  );

  // Drop handler for new nodes from library
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeId = event.dataTransfer.getData("application/reactflow-nodeid");
      if (!nodeId) return;

      const catalogueItem = NODE_CATALOGUE_MAP.get(nodeId);
      if (!catalogueItem) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: WorkflowNode = {
        id: `${nodeId}-${generateId()}`,
        type: "workflowNode",
        position,
        data: {
          catalogueId: catalogueItem.id,
          label: catalogueItem.name,
          category: catalogueItem.category as NodeCategory,
          status: "idle",
          inputs: catalogueItem.inputs,
          outputs: catalogueItem.outputs,
          icon: catalogueItem.icon,
        } satisfies WorkflowNodeData,
      };

      addNode(newNode);
      toast.success(`Added: ${catalogueItem.name}`, { duration: 2000 });
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Run handler
  const handleRun = useCallback(async () => {
    await runWorkflow();
  }, [runWorkflow]);

  const handleSave = useCallback(() => {
    toast.success("Workflow saved", { duration: 2000 });
  }, []);

  const handleShare = useCallback(() => {
    toast.info("Share feature coming soon", { duration: 2000 });
  }, []);

  const workflowName = currentWorkflow?.name ?? "Untitled Workflow";

  return (
    <div className="relative flex h-full w-full">
      {/* AI Prompt overlay */}
      <AnimatePresence>
        {isPromptModeActive && (
          <PromptInput onClose={() => setPromptModeActive(false)} />
        )}
      </AnimatePresence>

      {/* Node Library Panel */}
      <AnimatePresence>
        {isNodeLibraryOpen && (
          <NodeLibraryPanel />
        )}
      </AnimatePresence>

      {/* Canvas */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 relative"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        {/* Toolbar */}
        <CanvasToolbar
          workflowName={workflowName}
          creationMode={creationMode}
          isExecuting={isExecuting}
          isDirty={isDirty}
          isSaving={isSaving}
          onRun={handleRun}
          onStop={() => {}}
          onSave={handleSave}
          onUndo={() => {}}
          onRedo={() => {}}
          onZoomIn={() => {}}
          onZoomOut={() => {}}
          onFitView={() => fitView({ padding: 0.1 })}
          onShare={handleShare}
          onModeChange={setCreationMode}
          onPromptMode={() => setPromptModeActive(true)}
        />

        {/* React Flow */}
        <div className="absolute inset-0 pt-[52px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            defaultEdgeOptions={{
              type: "animatedEdge",
              style: { stroke: "#4F8AFF", strokeWidth: 1.5 },
            }}
            minZoom={0.2}
            maxZoom={2.5}
            snapToGrid
            snapGrid={[16, 16]}
            connectionLineStyle={{
              stroke: "#4F8AFF",
              strokeWidth: 2,
              strokeDasharray: "6 4",
            }}
            style={{ background: "#0E0E16" }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#1E1E2E"
            />

            <Controls
              position="bottom-left"
              style={{ marginBottom: "12px", marginLeft: "12px" }}
            />

            <MiniMap
              position="bottom-right"
              nodeStrokeWidth={2}
              nodeColor={(n) => {
                const data = n.data as WorkflowNodeData;
                const config = CATEGORY_CONFIG[data?.category as NodeCategory];
                return config?.color ?? "#2A2A3E";
              }}
              style={{
                backgroundColor: "#12121A",
                border: "1px solid #1E1E2E",
                borderRadius: "10px",
              }}
            />

            {/* Empty state */}
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="mt-20 text-center pointer-events-none">
                  <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#2A2A3E] bg-[#0A0A0F]/80 backdrop-blur px-8 py-8">
                    <div className="h-12 w-12 rounded-xl bg-[#1A1A26] border border-[#2A2A3E] flex items-center justify-center">
                      <span className="text-2xl">⬡</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F0F0F5]">
                        Start building your workflow
                      </p>
                      <p className="text-xs text-[#55556A] mt-1 max-w-xs">
                        Drag nodes from the library panel on the left, or use AI Prompt mode to generate a workflow automatically
                      </p>
                    </div>
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Artifact Viewer - floating bottom panel when artifacts exist */}
        {artifacts.size > 0 && (
          <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            <div className="text-[10px] font-semibold text-[#55556A] uppercase tracking-wider mb-1 px-1">
              Execution Outputs
            </div>
            {Array.from(artifacts.entries()).map(([tileId, artifact]) => (
              <ArtifactCard
                key={tileId}
                artifact={artifact}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface WorkflowCanvasProps {
  workflowId?: string;
}

export function WorkflowCanvas({ workflowId }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner workflowId={workflowId} />
    </ReactFlowProvider>
  );
}
