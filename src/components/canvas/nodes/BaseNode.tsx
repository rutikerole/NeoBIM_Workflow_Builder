"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData, NodeCategory, NodeStatus } from "@/types/nodes";
import { InputNodeContent } from "./InputNode";

const INPUT_NODE_IDS = new Set(["IN-001","IN-002","IN-003","IN-004","IN-005","IN-006","IN-007"]);

// ─── helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "79, 138, 255";
  return `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`;
}

function getIcon(name: string, size = 14): React.ReactNode {
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ size?: number; strokeWidth?: number }>
  >;
  const Icon = icons[name];
  if (Icon) return <Icon size={size} strokeWidth={1.5} />;
  const Fallback = LucideIcons.Box;
  return <Fallback size={size} strokeWidth={1.5} />;
}

function portPercent(index: number, total: number): number {
  if (total === 1) return 50;
  return ((index + 1) / (total + 1)) * 100;
}

// ─── category colours ────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<NodeCategory, string> = {
  input:     "#3B82F6",
  transform: "#8B5CF6",
  generate:  "#10B981",
  export:    "#F59E0B",
};

// ─── NodeHandle ──────────────────────────────────────────────────────────────

interface NodeHandleProps {
  port: { id: string; label: string; type: string };
  handleType: "source" | "target";
  position: Position;
  topPct: number;
  color: string;
}

function NodeHandle({ port, handleType, position, topPct, color }: NodeHandleProps) {
  const rgb = hexToRgb(color);

  return (
    <Handle
      type={handleType}
      position={position}
      id={port.id}
      title={`${handleType === "source" ? "Output" : "Input"}: ${port.label}`}
      className={cn(
        "!w-3 !h-3 !rounded-full !transition-all !duration-150 !cursor-crosshair !z-10",
        "hover:!w-3.5 hover:!h-3.5",
        "!bg-[#1a1a2e] hover:!bg-[var(--handle-color)]",
        "!border-2 !border-[var(--handle-border)] hover:!border-[var(--handle-color)]",
        "hover:!shadow-[0_0_12px_var(--handle-glow)]",
      )}
      style={{
        top: `${topPct}%`,
        '--handle-color': color,
        '--handle-border': `${color}66`,
        '--handle-glow': `rgba(${rgb}, 0.6)`,
      } as React.CSSProperties}
    />
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ status, color }: { status: NodeStatus; color: string }) {
  const rgb = hexToRgb(color);

  return (
    <div
      className="h-[3px] flex-1 bg-white/5 rounded-full overflow-hidden relative"
      style={{ '--shimmer-color': `rgba(${rgb}, 0.85)` } as React.CSSProperties}
    >
      {(status === "success" || status === "error") && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            "absolute left-0 top-0 bottom-0 rounded-full",
            status === "success" ? "bg-emerald-500" : "bg-red-500",
          )}
        />
      )}
      {status === "running" && (
        <div className="absolute left-0 top-0 bottom-0 w-1/2 rounded-full animate-[shimmer-node_1.8s_cubic-bezier(0.4,0,0.6,1)_infinite] bg-[linear-gradient(90deg,transparent,var(--shimmer-color),transparent)]" />
      )}
    </div>
  );
}

// ─── BaseNode ─────────────────────────────────────────────────────────────────

type BaseNodeProps = NodeProps & { data: WorkflowNodeData };

export const BaseNode = memo(function BaseNode({ id, data, selected }: BaseNodeProps) {
  const prefersReduced = useReducedMotion();

  const category = data.category as NodeCategory;
  const status   = data.status   as NodeStatus;
  const color    = CATEGORY_COLOR[category];
  const rgb      = hexToRgb(color);
  const isInput  = INPUT_NODE_IDS.has(data.catalogueId);

  const inLabel  = data.inputs .map(p => p.label).join(", ");
  const outLabel = data.outputs.map(p => p.label).join(", ");
  const typeLabel =
    inLabel && outLabel ? `${inLabel} → ${outLabel}` :
    outLabel            ? `→ ${outLabel}` :
    inLabel             ? `${inLabel} →` :
    null;

  const errorMessage = (data as WorkflowNodeData & { errorMessage?: string })?.errorMessage;

  return (
    <>
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, scale: 0.88, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: prefersReduced ? 0 : 0.22, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "relative overflow-hidden cursor-pointer rounded-xl group",
          "bg-[#0c0c18]/90 backdrop-blur-xl",
          "transition-all duration-200 ease-out",
          isInput ? "w-[320px]" : "w-[220px]",
          // Border
          status === "error"
            ? "border border-red-400/50"
            : status === "success"
            ? "border border-emerald-400/50"
            : selected
            ? "border border-[rgba(var(--cat-rgb),0.6)]"
            : "border border-white/[0.08] hover:border-white/[0.16]",
          // Shadow
          status === "success"
            ? "shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04),0_0_30px_rgba(52,211,153,0.4)]"
            : status === "error"
            ? "shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04),0_0_30px_rgba(248,113,113,0.4)]"
            : "shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]",
          "hover:shadow-[0_16px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]",
          // Hover transform (only when not selected)
          !selected && "hover:-translate-y-1",
        )}
        style={{
          '--cat-color': color,
          '--cat-rgb': rgb,
          '--cat-bg': `${color}1A`,
          '--cat-bg-subtle': `${color}18`,
          '--cat-border': `${color}30`,
          '--cat-color-faded': `${color}AA`,
        } as React.CSSProperties}
      >
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[linear-gradient(180deg,var(--cat-color),var(--cat-color-faded))] shadow-[0_0_12px_rgba(var(--cat-rgb),0.4)]" />

        {/* Running border pulse */}
        {status === "running" && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            animate={{
              boxShadow: [
                `inset 0 0 0 1px rgba(${rgb}, 0.25)`,
                `inset 0 0 0 1px rgba(${rgb}, 0.65)`,
                `inset 0 0 0 1px rgba(${rgb}, 0.25)`,
              ],
            }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Success glow animation */}
        {status === "success" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute -inset-0.5 rounded-xl pointer-events-none bg-[radial-gradient(circle,rgba(52,211,153,0.3)_0%,transparent_70%)]"
          />
        )}

        {/* Error glow animation */}
        {status === "error" && (
          <motion.div
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-0.5 rounded-xl pointer-events-none bg-[radial-gradient(circle,rgba(248,113,113,0.25)_0%,transparent_70%)]"
          />
        )}

        {/* Content */}
        <div className="pt-[11px] pr-[13px] pb-[11px] pl-[17px]">

          {/* Row 1: icon + name + status + INPUT badge */}
          <div className="flex items-center gap-2 mb-px">
            <div className="w-[30px] h-[30px] rounded-lg bg-[var(--cat-bg)] text-[var(--cat-color)] flex items-center justify-center shrink-0">
              {getIcon(data.icon, 18)}
            </div>
            <span className="text-[13px] font-semibold text-[#e8e8f0] tracking-[-0.01em] flex-1 overflow-hidden text-ellipsis whitespace-nowrap leading-[1.3]">
              {data.label}
            </span>
            {isInput && (
              <span className="text-[9px] font-bold text-[var(--cat-color)] px-2 py-0.5 rounded-md bg-[var(--cat-bg-subtle)] border border-[var(--cat-border)] shrink-0 tracking-[0.08em] uppercase">
                INPUT
              </span>
            )}
            <AnimatePresence mode="wait">
              {status === "success" && (
                <motion.div key="s"
                  initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="text-emerald-500 shrink-0">
                  <CheckCircle2 size={13} />
                </motion.div>
              )}
              {status === "error" && (
                <motion.div key="e"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="text-red-500 shrink-0">
                  <AlertCircle size={13} />
                </motion.div>
              )}
              {status === "running" && (
                <motion.div key="r"
                  className="w-[7px] h-[7px] rounded-full shrink-0 bg-[var(--cat-color)]"
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Row 2: type label */}
          {typeLabel && (
            <div className="text-[11px] text-[#4a4a68] mt-1.5 leading-[1.4] overflow-hidden text-ellipsis whitespace-nowrap">
              {typeLabel}
            </div>
          )}

          {/* Row 2b: interactive input for all 7 input node types */}
          {isInput && <InputNodeContent nodeId={id} data={data} />}

          {/* Row 3: progress + time */}
          <div className="flex items-center gap-[7px] mt-2.5">
            <ProgressBar status={status} color={color} />
            <span className="text-[10px] text-[#8888A0] whitespace-nowrap shrink-0 font-medium">
              {data.executionTime ?? "< 2s"}
            </span>
          </div>
        </div>

        {/* Handles */}
        {data.inputs.map((port, i) => (
          <NodeHandle key={port.id} port={port} handleType="target"
            position={Position.Left} topPct={portPercent(i, data.inputs.length)} color={color} />
        ))}
        {data.outputs.map((port, i) => (
          <NodeHandle key={port.id} port={port} handleType="source"
            position={Position.Right} topPct={portPercent(i, data.outputs.length)} color={color} />
        ))}
      </motion.div>

      {/* Error message tooltip */}
      <AnimatePresence>
        {status === "error" && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded-lg bg-[rgba(30,10,10,0.95)] border border-red-400/40 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-xl max-w-[280px] z-[1000] pointer-events-none"
          >
            <div className="flex gap-2 items-start">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-px" />
              <div className="flex-1">
                <div className="text-[11px] font-semibold text-red-400 mb-[3px]">
                  Execution Error
                </div>
                <div className="text-[10px] text-[#E0B4B4] leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            </div>
            {/* Pointer triangle */}
            <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[5px] border-b-red-400/40" />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer-node {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </>
  );
});

BaseNode.displayName = "BaseNode";
