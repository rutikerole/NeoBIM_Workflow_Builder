"use client";

import React, { useCallback, useRef, useState } from "react";
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
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Layers3, Sparkles, BookOpen, X, FileDown } from "lucide-react";

import dynamic from "next/dynamic";
import { BaseNode } from "./nodes/BaseNode";
import { AnimatedEdge } from "./edges/AnimatedEdge";
import { NodeLibraryPanel } from "./panels/NodeLibraryPanel";
import { CanvasToolbar } from "./toolbar/CanvasToolbar";
import { ArtifactCard } from "./artifacts/ArtifactCard";
import { ExecutionLog } from "./ExecutionLog";
import { OnboardingTour } from "./OnboardingTour";
import { AIChatPanel } from "./panels/AIChatPanel";
import type { ChatMessage } from "./panels/AIChatPanel";
import type { LogEntry } from "./ExecutionLog";
import type { ContextMenuState } from "./ContextMenu";
import { PromptInput } from "@/components/ai/PromptInput";

// ContextMenu is right-click only — load lazily
const ContextMenu = dynamic(
  () => import("./ContextMenu").then((m) => m.ContextMenu),
  { ssr: false }
);

import { useWorkflowStore } from "@/stores/workflow-store";
import { useExecutionStore } from "@/stores/execution-store";
import { useUIStore } from "@/stores/ui-store";
import { NODE_CATALOGUE_MAP, CATEGORY_CONFIG } from "@/constants/node-catalogue";
import type { WorkflowNodeData, NodeCategory } from "@/types/nodes";
import type { WorkflowNode, WorkflowEdge } from "@/types/nodes";
import { generateId } from "@/lib/utils";
import Link from "next/link";

// Register custom node and edge types (stable references outside component)
const nodeTypes = { workflowNode: BaseNode };
const edgeTypes = { animatedEdge: AnimatedEdge };

// ─── Mini workflow diagram for empty state ─────────────────────────────────

const DEMO_NODES = [
  { label: "PDF Upload",  color: "#3B82F6" },
  { label: "Doc Parser",  color: "#8B5CF6" },
  { label: "Massing Gen", color: "#10B981" },
  { label: "IFC Export",  color: "#F59E0B" },
];

function MiniWorkflowDiagram() {
  return (
    <div className="flex items-center gap-0 mb-2">
      {DEMO_NODES.map((node, i) => (
        <React.Fragment key={node.label}>
          <div
            className="px-2.5 py-1 rounded-md border text-[10px] font-medium whitespace-nowrap"
            style={{
              background: `${node.color}18`,
              borderColor: `${node.color}40`,
              color: node.color,
            }}
          >
            {node.label}
          </div>
          {i < DEMO_NODES.length - 1 && (
            <div className="flex items-center mx-[3px]">
              <div className="w-3.5 h-px bg-[rgba(79,138,255,0.3)]" />
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: "4px solid rgba(79,138,255,0.3)",
                  borderTop: "3px solid transparent",
                  borderBottom: "3px solid transparent",
                }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Canvas Empty State ────────────────────────────────────────────────────

interface EmptyStateProps {
  onPromptMode: () => void;
}

function CanvasEmptyState({ onPromptMode }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]"
    >
      <div className="pointer-events-auto flex flex-col items-center text-center max-w-[440px]">
        {/* Mini diagram preview */}
        <div className="px-5 py-4 rounded-xl bg-[rgba(18,18,26,0.7)] border border-white/[0.06] backdrop-blur-[12px] mb-6">
          <MiniWorkflowDiagram />
          <div className="text-[9px] text-[#3A3A50] text-center mt-1">
            Example AEC Pipeline
          </div>
        </div>

        {/* Icon */}
        <div className="w-[52px] h-[52px] rounded-[14px] bg-[rgba(79,138,255,0.08)] border border-[rgba(79,138,255,0.2)] flex items-center justify-center mb-4">
          <Layers3 size={22} className="text-[#4F8AFF]" strokeWidth={1.5} />
        </div>

        {/* Headline */}
        <h2 className="text-xl font-semibold text-[#F0F0F5] mb-2 leading-snug">
          Build your first workflow
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-[#5C5C78] leading-relaxed mb-6 max-w-[320px]">
          Drag nodes from the library, or describe what you want with AI
        </p>

        {/* CTAs */}
        <div className="flex gap-2.5">
          <Link
            href="/dashboard/templates"
            className="flex items-center gap-[7px] px-[18px] py-[9px] rounded-lg border border-[rgba(79,138,255,0.35)] bg-[rgba(79,138,255,0.06)] text-[13px] font-medium text-[#4F8AFF] no-underline transition-all duration-150 hover:bg-[rgba(79,138,255,0.12)] hover:border-[rgba(79,138,255,0.6)]"
          >
            <BookOpen size={14} />
            Browse Templates
          </Link>
          <button
            onClick={onPromptMode}
            className="flex items-center gap-[7px] px-[18px] py-[9px] rounded-lg bg-[#4F8AFF] border-none text-[13px] font-semibold text-white cursor-pointer transition-all duration-150 hover:bg-[#3D7AFF]"
          >
            <Sparkles size={14} />
            Try AI Prompt
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Inner Canvas ──────────────────────────────────────────────────────────

interface WorkflowCanvasInnerProps {
  workflowId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function WorkflowCanvasInner({ workflowId: _workflowId }: WorkflowCanvasInnerProps) {
  const { fitView, screenToFlowPosition, zoomIn, zoomOut } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const {
    nodes: storeNodes,
    edges: storeEdges,
    currentWorkflow,
    creationMode,
    addNode,
    removeNode,
    updateNode,
    addEdge: addStoreEdge,
    resetCanvas,
    isDirty,
    isSaving,
    markDirty,
    setCreationMode,
    saveWorkflow,
  } = useWorkflowStore();

  const { artifacts, executionProgress, removeArtifact, clearArtifacts } = useExecutionStore();
  const { isNodeLibraryOpen, setPromptModeActive, isPromptModeActive, toggleNodeLibrary, isDemoMode } = useUIStore();

  // Chat / execution log state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const addLogEntry = useCallback((entry: LogEntry) => {
    setLogEntries(prev => [...prev, entry]);
    setShowLog(true);
  }, []);

  const { runWorkflow, isExecuting } = useExecution({ onLog: addLogEntry });

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges as Edge[]);

  React.useEffect(() => { setNodes(storeNodes as unknown as Node[]); }, [storeNodes, setNodes]);
  React.useEffect(() => { setEdges(storeEdges as Edge[]); }, [storeEdges, setEdges]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: "node", nodeId: node.id });
  }, []);

  const onPaneContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault();
    const evt = e as React.MouseEvent;
    setContextMenu({ x: evt.clientX, y: evt.clientY, type: "canvas" });
  }, []);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const node = storeNodes.find(n => n.id === nodeId);
    if (!node) return;
    const newNode: WorkflowNode = {
      ...node,
      id: `${node.data.catalogueId}-${generateId()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
    };
    addNode(newNode);
    toast.success(`Duplicated: ${node.data.label}`, { duration: 2000 });
  }, [storeNodes, addNode]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const node = storeNodes.find(n => n.id === nodeId);
    removeNode(nodeId);
    toast.success(`Deleted: ${node?.data.label ?? "Node"}`, { duration: 2000 });
  }, [storeNodes, removeNode]);

  const handleFitToNode = useCallback((nodeId: string) => {
    fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 400 });
  }, [fitView]);

  // Sync drag positions back to Zustand so store→ReactFlow effect doesn't reset them
  const onNodeDragStop = useCallback((_: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
    draggedNodes.forEach((n) => updateNode(n.id, { position: n.position }));
  }, [updateNode]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      // Derive gradient colors from source/target node categories
      const CAT_COLORS: Record<string, string> = {
        input: "#3B82F6", transform: "#8B5CF6", generate: "#10B981", export: "#F59E0B",
      };
      const srcNode = nodes.find(n => n.id === connection.source);
      const tgtNode = nodes.find(n => n.id === connection.target);
      const sourceColor = CAT_COLORS[(srcNode?.data as WorkflowNodeData)?.category ?? ""] ?? "#4F8AFF";
      const targetColor = CAT_COLORS[(tgtNode?.data as WorkflowNodeData)?.category ?? ""] ?? "#4F8AFF";
      const edgeData = { sourceColor, targetColor };

      const newEdge: WorkflowEdge = {
        id: `e${connection.source}-${connection.target}-${generateId()}`,
        source: connection.source ?? "",
        sourceHandle: connection.sourceHandle ?? "",
        target: connection.target ?? "",
        targetHandle: connection.targetHandle ?? "",
        type: "animatedEdge",
        data: edgeData,
      };
      setEdges((eds) => addEdge({ ...connection, type: "animatedEdge", data: edgeData }, eds));
      addStoreEdge(newEdge);
    },
    [nodes, setEdges, addStoreEdge]
  );

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      markDirty();
      // Sync keyboard/backspace deletions to Zustand store
      changes.forEach(change => {
        if (change.type === "remove") removeNode(change.id);
      });
    },
    [onNodesChange, markDirty, removeNode]
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => { onEdgesChange(changes); markDirty(); },
    [onEdgesChange, markDirty]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const nodeId = event.dataTransfer.getData("application/reactflow-nodeid");
      if (!nodeId) return;
      const catalogueItem = NODE_CATALOGUE_MAP.get(nodeId);
      if (!catalogueItem) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

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
          executionTime: catalogueItem.executionTime,
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

  const handleRun  = useCallback(async () => { await runWorkflow(); }, [runWorkflow]);
  const handleSave = useCallback(async () => {
    if (isDemoMode) {
      toast.info("Create a free account to save workflows", { duration: 3000 });
      return;
    }
    const id = await saveWorkflow();
    if (id) {
      toast.success("Workflow saved", { duration: 2000 });
    } else {
      toast.error("Save failed — check your connection");
    }
  }, [saveWorkflow, isDemoMode]);
  const handleShare = useCallback(() => { toast.info("Share feature coming soon", { duration: 2000 }); }, []);

  const workflowName = currentWorkflow?.name ?? "Untitled Workflow";

  return (
    <div className="relative flex h-full w-full">
      {/* Onboarding tour (fixed overlay, renders once) */}
      <OnboardingTour />

      {/* AI Prompt overlay */}
      <AnimatePresence>
        {isPromptModeActive && (
          <PromptInput onClose={() => setPromptModeActive(false)} />
        )}
      </AnimatePresence>

      {/* Node Library Panel */}
      <AnimatePresence>
        {isNodeLibraryOpen && <NodeLibraryPanel />}
      </AnimatePresence>

      {/* Canvas area */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 relative"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <CanvasToolbar
          workflowName={workflowName}
          creationMode={creationMode}
          isExecuting={isExecuting}
          isDirty={isDirty}
          isSaving={isSaving}
          isNodeLibraryOpen={isNodeLibraryOpen}
          onRun={handleRun}
          onStop={() => {}}
          onSave={handleSave}
          onUndo={() => {}}
          onRedo={() => {}}
          onZoomIn={() => zoomIn({ duration: 250 })}
          onZoomOut={() => zoomOut({ duration: 250 })}
          onFitView={() => fitView({ padding: 0.15, duration: 400 })}
          onShare={handleShare}
          onModeChange={setCreationMode}
          onPromptMode={() => setPromptModeActive(true)}
          onToggleLibrary={toggleNodeLibrary}
        />

        {/* Execution progress bar */}
        <AnimatePresence>
          {isExecuting && (
            <motion.div
              key="progress-bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { delay: 0.5 } }}
              className="absolute top-[52px] left-0 right-0 h-0.5 z-[11] bg-white/[0.04]"
            >
              <motion.div
                animate={{ width: `${executionProgress}%` }}
                transition={{ ease: "linear", duration: 0.4 }}
                className="h-full bg-gradient-to-r from-[#4F8AFF] to-[#8B5CF6] shadow-[0_0_8px_rgba(79,138,255,0.6)]"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* React Flow */}
        <div className="absolute inset-0 pt-13">
          {/* Atmospheric blue center glow — rendered before ReactFlow for depth */}
          <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(79,138,255,0.04)_0%,transparent_70%)]" />
          {/* Edge vignette — darkens corners for cinematic depth */}
          <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.5)_100%)]" />

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              type: "animatedEdge",
              style: { stroke: "#4F8AFF", strokeWidth: 2 },
            }}
            minZoom={0.15}
            maxZoom={2.5}
            snapToGrid
            snapGrid={[16, 16]}
            connectionLineStyle={{
              stroke: "#4F8AFF",
              strokeWidth: 2,
              strokeDasharray: "6 4",
              opacity: 0.7,
            }}
            style={{ background: "#07070D" }}
          >
            {/* Dot grid — refined spacing and brightness */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="rgba(255,255,255,0.035)"
            />

            {/* Styled controls — bottom-right, above minimap */}
            <Controls
              position="bottom-right"
              style={{ marginBottom: 124, marginRight: 16 }}
            />

            {/* Styled minimap */}
            <MiniMap
              position="bottom-right"
              nodeStrokeWidth={0}
              nodeColor={(n) => {
                const d = n.data as WorkflowNodeData;
                const cfg = CATEGORY_CONFIG[d?.category as NodeCategory];
                return cfg?.color ?? "rgba(255,255,255,0.08)";
              }}
              maskColor="rgba(10,10,15,0.65)"
              style={{
                width: 160,
                height: 100,
                backgroundColor: "rgba(18,18,26,0.92)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                marginBottom: 16,
                marginRight: 16,
              }}
            />
          </ReactFlow>

          {/* Atmospheric blue glow — enhanced */}
          <div className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(79,138,255,0.05)_0%,transparent_70%)]" />

          {/* Vignette overlay — deeper */}
          <div className="absolute inset-0 pointer-events-none z-[1] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />

          {/* Context menu */}
          <AnimatePresence>
            {contextMenu && (
              <ContextMenu
                menu={contextMenu}
                onClose={() => setContextMenu(null)}
                onFitView={() => fitView({ padding: 0.15, duration: 400 })}
                onClearCanvas={() => { resetCanvas(); clearArtifacts(); }}
                onDuplicateNode={handleDuplicateNode}
                onDeleteNode={handleDeleteNode}
                onFitToNode={handleFitToNode}
              />
            )}
          </AnimatePresence>

          {/* Empty state (outside ReactFlow for proper centering + AnimatePresence) */}
          <AnimatePresence>
            {nodes.length === 0 && (
              <CanvasEmptyState onPromptMode={() => setPromptModeActive(true)} />
            )}
          </AnimatePresence>

          {/* Execution log — slides up from bottom */}
          <AnimatePresence>
            {showLog && (
              <ExecutionLog
                entries={logEntries}
                isRunning={isExecuting}
                onClose={() => { setShowLog(false); setLogEntries([]); }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* AI Chat Panel — floats on right edge */}
        <AIChatPanel
          messages={chatMessages}
          onAddMessage={(msg) => setChatMessages(prev => [...prev, msg])}
          onClear={() => setChatMessages([])}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(o => !o)}
        />

        {/* Artifact results panel */}
        <AnimatePresence>
          {artifacts.size > 0 && (
            <motion.div
              key="artifact-panel"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="absolute bottom-4 right-4 z-20 w-80 max-h-[calc(100vh-100px)] flex flex-col bg-[rgba(8,8,16,0.92)] border border-white/[0.08] rounded-[14px] overflow-hidden backdrop-blur-[32px] backdrop-saturate-[1.3] shadow-[0_16px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              {/* Panel header */}
              <div className="flex items-center gap-[7px] px-3 py-2.5 border-b border-b-white/[0.06] shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-semibold text-[#F0F0F5] flex-1">
                  Execution Results
                </span>
                <span className="px-1.5 py-px rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-500">
                  {artifacts.size}
                </span>
                <button
                  onClick={async () => {
                    const { generatePDFReport } = await import("@/services/pdf-report");
                    const labels = new Map<string, string>();
                    storeNodes.forEach(n => labels.set(n.id, n.data.label));
                    await generatePDFReport({
                      workflowName: workflowName,
                      artifacts,
                      nodeLabels: labels,
                    });
                    toast.success("PDF report downloaded", { duration: 2000 });
                  }}
                  title="Download PDF report"
                  className="w-[22px] h-[22px] rounded-[5px] shrink-0 bg-transparent border-none flex items-center justify-center text-[#3A3A50] cursor-pointer transition-colors duration-100 hover:text-[#4F8AFF]"
                >
                  <FileDown size={12} />
                </button>
                <button
                  onClick={clearArtifacts}
                  title="Clear all results"
                  className="w-[22px] h-[22px] rounded-[5px] shrink-0 bg-transparent border-none flex items-center justify-center text-[#3A3A50] cursor-pointer transition-colors duration-100 hover:text-red-500"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Scrollable card list */}
              <div className="overflow-y-auto flex-1">
                <AnimatePresence initial={false}>
                  {Array.from(artifacts.entries()).map(([tileId, artifact]) => {
                    const node = storeNodes.find(n => n.id === tileId);
                    return (
                      <ArtifactCard
                        key={tileId}
                        artifact={artifact}
                        nodeLabel={node?.data.label}
                        nodeCategory={node?.data.category}
                        onDismiss={() => removeArtifact(tileId)}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Public export ─────────────────────────────────────────────────────────

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
