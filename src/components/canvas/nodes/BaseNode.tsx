"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData, NodeCategory, NodeStatus } from "@/types/nodes";
import { CATEGORY_CONFIG } from "@/constants/node-catalogue";

// Icon resolver
function getIcon(name: string, size = 16): React.ReactNode {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>>;
  const IconComponent = icons[name];
  if (IconComponent) {
    return <IconComponent size={size} strokeWidth={1.5} />;
  }
  const FallbackIcon = LucideIcons.Box;
  return <FallbackIcon size={size} strokeWidth={1.5} />;
}

const CATEGORY_STYLES: Record<
  NodeCategory,
  { border: string; headerBg: string; accentBar: string; glowClass: string; handleColor: string }
> = {
  input: {
    border: "border-[rgba(59,130,246,0.3)]",
    headerBg: "bg-[rgba(59,130,246,0.08)]",
    accentBar: "bg-[#3B82F6]",
    glowClass: "hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]",
    handleColor: "#3B82F6",
  },
  transform: {
    border: "border-[rgba(139,92,246,0.3)]",
    headerBg: "bg-[rgba(139,92,246,0.08)]",
    accentBar: "bg-[#8B5CF6]",
    glowClass: "hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]",
    handleColor: "#8B5CF6",
  },
  generate: {
    border: "border-[rgba(16,185,129,0.3)]",
    headerBg: "bg-[rgba(16,185,129,0.08)]",
    accentBar: "bg-[#10B981]",
    glowClass: "hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    handleColor: "#10B981",
  },
  export: {
    border: "border-[rgba(245,158,11,0.3)]",
    headerBg: "bg-[rgba(245,158,11,0.08)]",
    accentBar: "bg-[#F59E0B]",
    glowClass: "hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    handleColor: "#F59E0B",
  },
};

const STATUS_STYLES: Record<NodeStatus, string> = {
  idle: "",
  running: "shadow-[0_0_20px_rgba(59,130,246,0.3)] border-[rgba(59,130,246,0.6)]",
  success: "shadow-[0_0_20px_rgba(16,185,129,0.2)] border-[rgba(16,185,129,0.5)]",
  error: "shadow-[0_0_20px_rgba(239,68,68,0.2)] border-[rgba(239,68,68,0.5)]",
};

const STATUS_INDICATOR: Record<NodeStatus, { color: string; label: string }> = {
  idle: { color: "#55556A", label: "Ready" },
  running: { color: "#3B82F6", label: "Running" },
  success: { color: "#10B981", label: "Done" },
  error: { color: "#EF4444", label: "Error" },
};

type BaseNodeProps = NodeProps & {
  data: WorkflowNodeData;
};

export const BaseNode = memo(function BaseNode({ data, selected }: BaseNodeProps) {
  const category = data.category as NodeCategory;
  const styles = CATEGORY_STYLES[category];
  const status = data.status as NodeStatus;
  const statusInfo = STATUS_INDICATOR[status];
  const config = CATEGORY_CONFIG[category];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "relative w-[200px] rounded-xl border bg-[#12121A]",
        "transition-all duration-150 cursor-pointer",
        "overflow-hidden",
        styles.border,
        styles.glowClass,
        STATUS_STYLES[status],
        selected && "shadow-[0_0_30px_rgba(79,138,255,0.2)] border-[rgba(79,138,255,0.6)] scale-[1.01]"
      )}
    >
      {/* Left accent bar */}
      <div
        className={cn("absolute left-0 top-0 bottom-0 w-[3px]", styles.accentBar)}
      />

      {/* Running animation overlay */}
      {status === "running" && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{
            boxShadow: [
              "inset 0 0 0 1px rgba(59,130,246,0.2)",
              "inset 0 0 0 1px rgba(59,130,246,0.5)",
              "inset 0 0 0 1px rgba(59,130,246,0.2)",
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3 pl-5 py-2.5", styles.headerBg)}>
        <div style={{ color: config.color }}>
          {getIcon(data.icon, 16)}
        </div>
        <span className="text-[13px] font-semibold text-[#F0F0F5] truncate flex-1">
          {data.label}
        </span>
        {/* Status dot */}
        <div className="flex items-center gap-1 shrink-0">
          {status === "running" ? (
            <motion.div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: statusInfo.color }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          ) : (
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: statusInfo.color }}
            />
          )}
        </div>
      </div>

      {/* Input/Output type labels */}
      <div className="px-3 pl-5 py-2 flex items-center justify-between border-t border-[#1E1E2E]">
        <div className="text-[10px] text-[#55556A] font-medium">
          {data.inputs.length > 0 ? (
            <span className="text-[#55556A]">
              ← {data.inputs.map((p) => p.label).join(", ")}
            </span>
          ) : (
            <span className="text-[#4F8AFF] text-[10px]">Trigger</span>
          )}
        </div>
        <div className="text-[10px] text-[#55556A] font-medium">
          {data.outputs.length > 0 ? (
            <span>{data.outputs.map((p) => p.label).join(", ")} →</span>
          ) : null}
        </div>
      </div>

      {/* Category label */}
      <div className="px-3 pl-5 pb-2">
        <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: config.color, opacity: 0.7 }}>
          {config.label}
        </span>
      </div>

      {/* Input handles */}
      {data.inputs.map((port, index) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{
            top: `${30 + (index * 20)}%`,
            left: -5,
            width: 10,
            height: 10,
            background: "#12121A",
            borderColor: styles.handleColor,
            borderWidth: 2,
          }}
        />
      ))}

      {/* Output handles */}
      {data.outputs.map((port, index) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{
            top: `${30 + (index * 20)}%`,
            right: -5,
            width: 10,
            height: 10,
            background: styles.handleColor,
            borderColor: styles.handleColor,
            borderWidth: 2,
          }}
        />
      ))}
    </motion.div>
  );
});

BaseNode.displayName = "BaseNode";
