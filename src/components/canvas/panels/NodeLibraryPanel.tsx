"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Search, X, GripVertical, ChevronDown, ChevronLeft, ChevronRight, Plus, Clock, Tag,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";
import { useReactFlow } from "@xyflow/react";
import { NODE_CATALOGUE, NODES_BY_CATEGORY, CATEGORY_CONFIG } from "@/constants/node-catalogue";
import type { NodeCatalogueItem, NodeCategory, WorkflowNode, WorkflowNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/stores/workflow-store";
import { generateId } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "79, 138, 255";
  return `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`;
}

function getIcon(name: string, size = 13): React.ReactNode {
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ size?: number; strokeWidth?: number }>
  >;
  const Icon = icons[name];
  if (Icon) return <Icon size={size} strokeWidth={1.5} />;
  return <LucideIcons.Box size={size} strokeWidth={1.5} />;
}

// ─── Live vs Preview badge ───────────────────────────────────────────────────
const LIVE_NODE_IDS = new Set(["TR-003", "GN-003", "TR-008", "EX-002"]);

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTERS: { label: string; value: "all" | NodeCategory }[] = [
  { label: "All",      value: "all"       },
  { label: "Input",    value: "input"     },
  { label: "AI",       value: "transform" },
  { label: "Geometry", value: "generate"  },
  { label: "Export",   value: "export"    },
];

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function NodeTooltip({ node, anchorY, panelWidth }: { node: NodeCatalogueItem; anchorY: number; panelWidth: number }) {
  const cfg = CATEGORY_CONFIG[node.category];
  const rgb = hexToRgb(cfg.color);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.15 }}
      className="fixed w-[240px] bg-[rgba(14,14,22,0.97)] rounded-[10px] px-3.5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-[16px] z-[9999] pointer-events-none border border-[var(--tt-border)]"
      style={{
        left: panelWidth + 16,
        top: Math.max(8, Math.min(anchorY - 64, window.innerHeight - 260)),
        '--tt-border': `rgba(${rgb}, 0.25)`,
        '--tt-color': cfg.color,
        '--tt-rgb': rgb,
        '--tt-tag-bg': `rgba(${rgb}, 0.08)`,
        '--tt-tag-border': `rgba(${rgb}, 0.18)`,
      } as React.CSSProperties}
    >
      {/* Name + dot */}
      <div className="flex items-center gap-[7px] mb-1.5">
        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--tt-color)]" />
        <span className="text-xs font-semibold text-[#F0F0F5]">{node.name}</span>
      </div>

      {/* Description */}
      <p className="text-[11px] text-[#8888A0] leading-relaxed mb-2">
        {node.description}
      </p>

      {/* Meta */}
      <div className="flex gap-3.5 mb-2">
        <span className="flex items-center gap-1 text-[10px] text-[#5C5C78]">
          <Clock size={9} />
          {node.executionTime ?? "—"}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[#5C5C78]">
          <Tag size={9} />
          {node.id}
        </span>
      </div>

      {/* I/O */}
      {(node.inputs.length > 0 || node.outputs.length > 0) && (
        <div className="pt-2 border-t border-t-white/[0.06] flex gap-4 mb-2">
          {node.inputs.length > 0 && (
            <div>
              <div className="text-[9px] text-[#3A3A50] uppercase tracking-[0.5px] mb-[3px]">
                In
              </div>
              {node.inputs.map(p => (
                <div key={p.id} className="text-[10px] text-[#5C5C78]">{p.label}</div>
              ))}
            </div>
          )}
          {node.outputs.length > 0 && (
            <div>
              <div className="text-[9px] text-[#3A3A50] uppercase tracking-[0.5px] mb-[3px]">
                Out
              </div>
              {node.outputs.map(p => (
                <div key={p.id} className="text-[10px] text-[#5C5C78]">{p.label}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-[3px]">
        {node.tags.slice(0, 4).map(tag => (
          <span key={tag} className="px-1.5 py-px rounded text-[9px] bg-[var(--tt-tag-bg)] border border-[var(--tt-tag-border)] text-[var(--tt-color)]">
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Node Item ────────────────────────────────────────────────────────────────

interface NodeItemProps {
  node: NodeCatalogueItem;
  onDragStart: (e: React.DragEvent, nodeId: string) => void;
  onAddToCenter: (node: NodeCatalogueItem) => void;
  onTooltipShow: (node: NodeCatalogueItem, y: number) => void;
  onTooltipHide: () => void;
  searchQuery?: string;
}

function NodeItem({
  node, onDragStart, onAddToCenter, onTooltipShow, onTooltipHide, searchQuery,
}: NodeItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cfg = CATEGORY_CONFIG[node.category];
  const rgb = hexToRgb(cfg.color);

  const highlightText = (text: string): React.ReactNode => {
    const q = searchQuery?.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded-sm px-px bg-[var(--ni-highlight)] text-[var(--ni-color)]">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, node.id)}
      onMouseEnter={e => { setIsHovered(true); onTooltipShow(node, e.clientY); }}
      onMouseLeave={() => { setIsHovered(false); onTooltipHide(); }}
      className="relative flex items-center gap-3 px-3 py-2.5 cursor-grab rounded-xl overflow-hidden select-none transition-all duration-150 hover:bg-white/[0.05] active:scale-[0.98]"
      style={{
        '--ni-color': cfg.color,
        '--ni-rgb': rgb,
        '--ni-hover-bg': `rgba(${rgb}, 0.05)`,
        '--ni-highlight': `rgba(${rgb}, 0.2)`,
        '--ni-icon-bg': `${cfg.color}12`,
        '--ni-btn-bg': `rgba(${rgb}, 0.15)`,
        '--ni-btn-border': `rgba(${rgb}, 0.3)`,
      } as React.CSSProperties}
    >
      {/* Hover bg slides in from left */}
      <motion.div
        animate={{ scaleX: isHovered ? 1 : 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="absolute inset-0 bg-[var(--ni-hover-bg)] origin-left rounded-md pointer-events-none"
      />

      {/* Grip */}
      <GripVertical
        size={10}
        strokeWidth={1.5}
        className={cn("shrink-0 relative transition-colors", isHovered ? "text-[#3A3A50]" : "text-white/[0.06]")}
      />

      {/* Icon circle */}
      <div className="w-8 h-8 rounded-lg bg-[var(--ni-icon-bg)] flex items-center justify-center text-[var(--ni-color)] shrink-0 relative">
        {getIcon(node.icon, 14)}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-center gap-[5px]">
          <span className="text-[13px] font-medium text-[#e0e0ea] overflow-hidden text-ellipsis whitespace-nowrap leading-[1.2] flex-1 transition-colors duration-150">
            {highlightText(node.name)}
          </span>
          {LIVE_NODE_IDS.has(node.id) ? (
            <span className="text-[8px] font-bold text-emerald-500 px-1 py-px rounded-[3px] bg-emerald-500/10 border border-emerald-500/25 shrink-0">LIVE</span>
          ) : (
            <span className="text-[8px] font-semibold text-[#4a4a68] px-1.5 py-0.5 rounded bg-white/[0.06] shrink-0 tracking-[0.08em]">PREVIEW</span>
          )}
        </div>
        <div className="text-[10px] text-[#3a3a50] font-mono mt-0.5">
          {node.id} · {node.executionTime ?? "—"}
        </div>
      </div>

      {/* '+' add button */}
      <AnimatePresence>
        {isHovered && (
          <motion.button
            key="plus"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.1 }}
            onClick={e => { e.stopPropagation(); onAddToCenter(node); }}
            title="Add to canvas center"
            className="w-5 h-5 rounded-[5px] p-0 bg-[var(--ni-btn-bg)] border border-[var(--ni-btn-border)] flex items-center justify-center text-[var(--ni-color)] cursor-pointer shrink-0 relative"
          >
            <Plus size={10} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

interface CategorySectionProps {
  category: NodeCategory;
  nodes: NodeCatalogueItem[];
  isOpen: boolean;
  onToggle: () => void;
  onDragStart: (e: React.DragEvent, nodeId: string) => void;
  onAddToCenter: (node: NodeCatalogueItem) => void;
  onTooltipShow: (node: NodeCatalogueItem, y: number) => void;
  onTooltipHide: () => void;
}

function CategorySection({
  category, nodes, isOpen, onToggle,
  onDragStart, onAddToCenter, onTooltipShow, onTooltipHide,
}: CategorySectionProps) {
  const cfg = CATEGORY_CONFIG[category];
  const rgb = hexToRgb(cfg.color);

  return (
    <div
      className="mb-1"
      style={{
        '--cs-color': cfg.color,
        '--cs-rgb': rgb,
        '--cs-count-bg': `rgba(${rgb}, 0.1)`,
        '--cs-sep': `${cfg.color}15`,
        '--cs-chevron': `rgba(${rgb}, 0.5)`,
      } as React.CSSProperties}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 bg-transparent border-none cursor-pointer"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--cs-color)] shrink-0" />
        <span className="text-[10px] font-bold text-[var(--cs-color)] uppercase tracking-[0.15em] flex-1 text-left">
          {cfg.label}
        </span>
        <span className="px-[7px] py-px rounded-full bg-[var(--cs-count-bg)] text-[10px] font-semibold text-[var(--cs-color)]">
          {nodes.length}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="flex text-[var(--cs-chevron)]"
        >
          <ChevronDown size={12} strokeWidth={2} />
        </motion.div>
      </button>

      {/* Separator */}
      <div className="h-px bg-[var(--cs-sep)] mx-3" />

      {/* Nodes */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-2 pt-1 pb-1">
              {nodes.map(node => (
                <NodeItem
                  key={node.id}
                  node={node}
                  onDragStart={onDragStart}
                  onAddToCenter={onAddToCenter}
                  onTooltipShow={onTooltipShow}
                  onTooltipHide={onTooltipHide}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

const MIN_WIDTH = 240;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 280;

export function NodeLibraryPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [search, setSearch] = useState("");
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const [activeFilter, setActiveFilter] = useState<"all" | NodeCategory>("all");
  const [openCategories, setOpenCategories] = useState<Record<NodeCategory, boolean>>({
    input: true, transform: false, generate: false, export: false,
  });
  const [tooltip, setTooltip] = useState<{ node: NodeCatalogueItem; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { screenToFlowPosition } = useReactFlow();
  const { addNode } = useWorkflowStore();

  const handleAddToCenter = useCallback((item: NodeCatalogueItem) => {
    const pw = isCollapsed ? 48 : 280;
    const th = 52;
    const cx = pw + (window.innerWidth - pw) / 2;
    const cy = th + (window.innerHeight - th) / 2;
    const position = screenToFlowPosition({ x: cx, y: cy });
    const newNode: WorkflowNode = {
      id: `${item.id}-${generateId()}`,
      type: "workflowNode",
      position,
      data: {
        catalogueId: item.id,
        label: item.name,
        category: item.category,
        status: "idle",
        inputs: item.inputs,
        outputs: item.outputs,
        icon: item.icon,
        executionTime: item.executionTime,
      } satisfies WorkflowNodeData,
    };
    addNode(newNode);
    toast.success(`Added: ${item.name}`, { duration: 2000 });
  }, [isCollapsed, screenToFlowPosition, addNode]);

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData("application/reactflow-nodeid", nodeId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleTooltipShow = useCallback((node: NodeCatalogueItem, y: number) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltip({ node, y }), 500);
  }, []);

  const handleTooltipHide = useCallback(() => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(null);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = panelWidth;
  }, [panelWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartWidth.current + delta));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const toggleCategory = useCallback((cat: NodeCategory) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const isFiltering = search.trim() !== "" || activeFilter !== "all";

  const displayNodes = useMemo(() => {
    let nodes = NODE_CATALOGUE;
    if (activeFilter !== "all") nodes = nodes.filter(n => n.category === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      nodes = nodes.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.tags.some(t => t.includes(q)) ||
        n.id.toLowerCase().includes(q)
      );
    }
    return nodes;
  }, [search, activeFilter]);

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width: isCollapsed ? 48 : panelWidth }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="h-full bg-[#060610]/95 backdrop-blur-xl border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0"
    >
      {/* Resize handle */}
      {!isCollapsed && (
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            "absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize flex items-center justify-center z-[100] transition-opacity duration-150",
            isResizing
              ? "opacity-100 bg-[rgba(79,138,255,0.1)] border-r-2 border-r-[rgba(79,138,255,0.4)]"
              : "opacity-0 hover:opacity-100 bg-[rgba(79,138,255,0.1)]",
          )}
        >
          <div className={cn(
            "w-[3px] h-10 rounded-sm bg-[rgba(79,138,255,0.3)]",
            isResizing ? "block" : "hidden",
          )} />
        </div>
      )}

      {isCollapsed ? (
        // ── Icon-only strip ───────────────────────────────────────────────────
        <div className="w-12 h-full flex flex-col items-center pt-3 gap-2">
          {(["input", "transform", "generate", "export"] as NodeCategory[]).map(cat => {
            const cfg = CATEGORY_CONFIG[cat];
            const firstNode = NODES_BY_CATEGORY[cat][0];
            return (
              <div
                key={cat}
                title={cfg.label}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: `rgba(${hexToRgb(cfg.color)}, 0.1)`,
                  border: `1px solid rgba(${hexToRgb(cfg.color)}, 0.2)`,
                  color: cfg.color,
                }}
              >
                {getIcon(firstNode?.icon ?? "Box", 13)}
              </div>
            );
          })}
          <button
            onClick={() => setIsCollapsed(false)}
            title="Expand library"
            className="mt-auto mb-3 w-7 h-7 rounded-md bg-transparent border border-white/[0.08] flex items-center justify-center text-[#5C5C78] cursor-pointer hover:bg-white/[0.04] hover:text-[#F0F0F5] transition-all duration-150"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      ) : (
        // ── Full panel ────────────────────────────────────────────────────────
        <>
          {/* Header */}
          <div className="flex items-center justify-between pt-3 pr-2.5 pb-3 pl-3.5 border-b border-b-white/[0.06] shrink-0">
            <div>
              <div className="text-[13px] font-semibold text-[#F0F0F5]">Node Library</div>
              <div className="text-[10px] text-[#3A3A50] mt-0.5">
                {NODE_CATALOGUE.length} nodes · drag to canvas
              </div>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              title="Collapse panel"
              className="w-[26px] h-[26px] rounded-md shrink-0 bg-transparent border border-white/[0.06] flex items-center justify-center text-[#5C5C78] cursor-pointer transition-all duration-150 hover:bg-[#1A1A2A] hover:text-[#F0F0F5]"
            >
              <ChevronLeft size={12} />
            </button>
          </div>

          {/* Search */}
          <div className="px-2.5 pt-2.5 shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-[9px] top-1/2 -translate-y-1/2 text-[#5C5C78] pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search nodes..."
                className={cn(
                  "w-full h-9 bg-white/[0.03] border border-white/[0.07] rounded-xl pl-7 text-[13px] text-[#e8e8f0] placeholder-[#3a3a50] focus:border-[#4F8AFF]/30 focus:outline-none transition-all",
                  search ? "pr-7" : "pr-3",
                )}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#5C5C78] cursor-pointer flex items-center p-0"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-1 px-2.5 py-2 border-b border-b-white/[0.06] shrink-0">
            {FILTERS.map(f => {
              const active = activeFilter === f.value;
              const c = f.value === "all"
                ? "#4F8AFF"
                : CATEGORY_CONFIG[f.value as NodeCategory].color;
              const filterRgb = hexToRgb(c);
              return (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={cn(
                    "px-3 py-1 rounded-full whitespace-nowrap cursor-pointer text-xs font-medium transition-all duration-150",
                    active
                      ? "border"
                      : "bg-transparent border border-transparent text-[#5C5C78] hover:text-[#9898B0]",
                  )}
                  style={active ? {
                    background: `rgba(${filterRgb}, 0.15)`,
                    borderColor: `rgba(${filterRgb}, 0.2)`,
                    color: c,
                  } : undefined}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Node list */}
          <div className="flex-1 overflow-y-auto pt-1">
            {isFiltering ? (
              displayNodes.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-[#5C5C78]">No nodes found</p>
                  <p className="text-[11px] text-[#3A3A50] mt-1">Try a different search</p>
                </div>
              ) : (
                <div className="px-2 pb-2">
                  {displayNodes.map(node => (
                    <NodeItem
                      key={node.id}
                      node={node}
                      onDragStart={handleDragStart}
                      onAddToCenter={handleAddToCenter}
                      onTooltipShow={handleTooltipShow}
                      onTooltipHide={handleTooltipHide}
                      searchQuery={search}
                    />
                  ))}
                </div>
              )
            ) : (
              (["input", "transform", "generate", "export"] as NodeCategory[]).map(cat => (
                <CategorySection
                  key={cat}
                  category={cat}
                  nodes={NODES_BY_CATEGORY[cat]}
                  isOpen={openCategories[cat]}
                  onToggle={() => toggleCategory(cat)}
                  onDragStart={handleDragStart}
                  onAddToCenter={handleAddToCenter}
                  onTooltipShow={handleTooltipShow}
                  onTooltipHide={handleTooltipHide}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Floating tooltip — fixed positioned, renders outside scroll container */}
      <AnimatePresence>
        {tooltip && <NodeTooltip node={tooltip.node} anchorY={tooltip.y} panelWidth={panelWidth} />}
      </AnimatePresence>
    </motion.div>
  );
}
