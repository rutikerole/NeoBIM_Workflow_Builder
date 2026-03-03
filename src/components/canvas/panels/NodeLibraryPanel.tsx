"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronRight, X, GripVertical } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_CATALOGUE, NODES_BY_CATEGORY, CATEGORY_CONFIG } from "@/constants/node-catalogue";
import type { NodeCatalogueItem, NodeCategory } from "@/types/nodes";

function getIcon(name: string, size = 14): React.ReactNode {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>>;
  const IconComponent = icons[name];
  if (IconComponent) return <IconComponent size={size} strokeWidth={1.5} />;
  const FallbackIcon = LucideIcons.Box;
  return <FallbackIcon size={size} strokeWidth={1.5} />;
}

interface DraggableNodeItemProps {
  node: NodeCatalogueItem;
  onDragStart: (event: React.DragEvent, nodeId: string) => void;
}

function DraggableNodeItem({ node, onDragStart }: DraggableNodeItemProps) {
  const config = CATEGORY_CONFIG[node.category];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, node.id)}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 cursor-grab active:cursor-grabbing",
        "transition-all duration-150 hover:scale-[1.01]",
        "bg-[#12121A] border-[#1E1E2E]",
        "hover:border-opacity-60 hover:shadow-sm"
      )}
      style={{
        borderColor: `${config.color}25`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${config.color}50`;
        (e.currentTarget as HTMLElement).style.background = config.bgColor;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${config.color}25`;
        (e.currentTarget as HTMLElement).style.background = "#12121A";
      }}
      title={node.description}
    >
      <GripVertical
        size={10}
        className="text-[#2A2A3E] group-hover:text-[#3A3A4E] shrink-0 transition-colors"
      />
      <div style={{ color: config.color }} className="shrink-0">
        {getIcon(node.icon, 14)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-[#F0F0F5] truncate leading-tight">
          {node.name}
        </div>
        <div className="text-[9px] text-[#55556A] truncate mt-0.5">
          {node.id} · {node.executionTime ?? "—"}
        </div>
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: NodeCategory;
  nodes: NodeCatalogueItem[];
  isOpen: boolean;
  onToggle: () => void;
  onDragStart: (event: React.DragEvent, nodeId: string) => void;
}

function CategorySection({
  category,
  nodes,
  isOpen,
  onToggle,
  onDragStart,
}: CategorySectionProps) {
  const config = CATEGORY_CONFIG[category];

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 hover:bg-[#1A1A26] rounded-lg transition-colors group"
      >
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: config.color }}>
            {config.label}
          </span>
          <span className="text-[9px] text-[#55556A] font-normal">({nodes.length})</span>
        </div>
        <div className="text-[#55556A] group-hover:text-[#8888A0] transition-colors">
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1">
              {nodes.map((node) => (
                <DraggableNodeItem
                  key={node.id}
                  node={node}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NodeLibraryPanelProps {
  onClose?: () => void;
  onDragStart?: (event: React.DragEvent, nodeId: string) => void;
}

export function NodeLibraryPanel({ onClose, onDragStart }: NodeLibraryPanelProps) {
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<NodeCategory, boolean>>({
    input: true,
    transform: true,
    generate: true,
    export: true,
  });

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return null;
    const query = search.toLowerCase();
    return NODE_CATALOGUE.filter(
      (n) =>
        n.name.toLowerCase().includes(query) ||
        n.description.toLowerCase().includes(query) ||
        n.tags.some((t) => t.includes(query)) ||
        n.id.toLowerCase().includes(query)
    );
  }, [search]);

  const toggleCategory = useCallback((category: NodeCategory) => {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  }, []);

  const handleDragStart = useCallback(
    (event: React.DragEvent, nodeId: string) => {
      event.dataTransfer.setData("application/reactflow-nodeid", nodeId);
      event.dataTransfer.effectAllowed = "move";
      onDragStart?.(event, nodeId);
    },
    [onDragStart]
  );

  return (
    <motion.div
      initial={{ x: -280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -280, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col h-full w-[260px] bg-[#0E0E16] border-r border-[#1E1E2E]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E]">
        <div>
          <h2 className="text-sm font-semibold text-[#F0F0F5]">Node Library</h2>
          <p className="text-[10px] text-[#55556A] mt-0.5">
            {NODE_CATALOGUE.length} tiles · Drag to canvas
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="h-6 w-6 flex items-center justify-center rounded-md text-[#55556A] hover:text-[#F0F0F5] hover:bg-[#1A1A26] transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[#1E1E2E]">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#55556A]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className={cn(
              "w-full h-7 rounded-lg bg-[#12121A] border border-[#2A2A3E]",
              "pl-7 pr-3 text-[11px] text-[#F0F0F5] placeholder:text-[#55556A]",
              "focus:outline-none focus:border-[#4F8AFF] focus:ring-1 focus:ring-[#4F8AFF]",
              "transition-colors"
            )}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#55556A] hover:text-[#F0F0F5]"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {filteredNodes ? (
          // Search results
          <div className="px-2 space-y-1">
            {filteredNodes.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-[#55556A]">No nodes found</p>
                <p className="text-[10px] text-[#3A3A4E] mt-1">Try a different search</p>
              </div>
            ) : (
              filteredNodes.map((node) => (
                <DraggableNodeItem
                  key={node.id}
                  node={node}
                  onDragStart={handleDragStart}
                />
              ))
            )}
          </div>
        ) : (
          // Categorized view
          (["input", "transform", "generate", "export"] as NodeCategory[]).map((category) => (
            <CategorySection
              key={category}
              category={category}
              nodes={NODES_BY_CATEGORY[category]}
              isOpen={openCategories[category]}
              onToggle={() => toggleCategory(category)}
              onDragStart={handleDragStart}
            />
          ))
        )}
      </div>

      {/* Footer tip */}
      <div className="px-4 py-3 border-t border-[#1E1E2E]">
        <p className="text-[9px] text-[#3A3A4E] leading-relaxed">
          Drag nodes onto the canvas to build your workflow. Connect output → input ports to link tiles.
        </p>
      </div>
    </motion.div>
  );
}
