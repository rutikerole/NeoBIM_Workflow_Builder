"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown, Terminal, X } from "lucide-react";

export interface LogEntry {
  timestamp: Date;
  type: "start" | "running" | "success" | "error" | "info";
  message: string;
  detail?: string;
}

interface ExecutionLogProps {
  entries: LogEntry[];
  isRunning: boolean;
  onClose: () => void;
}

const TYPE_COLOR: Record<LogEntry["type"], string> = {
  start:   "#4F8AFF",
  running: "#F59E0B",
  success: "#10B981",
  error:   "#EF4444",
  info:    "#5C5C78",
};

const TYPE_SYMBOL: Record<LogEntry["type"], string> = {
  start:   "\u25B6",
  running: "\u25C9",
  success: "\u2713",
  error:   "\u2717",
  info:    "\u00B7",
};

function fmt(d: Date) {
  return d.toTimeString().slice(0, 8);
}

export function ExecutionLog({ entries, isRunning, onClose }: ExecutionLogProps) {
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, collapsed]);

  if (entries.length === 0 && !isRunning) return null;

  const statusColor = isRunning
    ? "#F59E0B"
    : entries[entries.length - 1]?.type === "error"
      ? "#EF4444"
      : "#10B981";

  return (
    <motion.div
      initial={{ y: 40, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 40, opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="absolute bottom-4 left-4 z-[25] max-w-[calc(100vw-360px)] rounded-xl overflow-hidden bg-[#04040a] border border-white/[0.06] backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] font-mono transition-[width] duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width: collapsed ? 220 : 420 }}
    >
      {/* Title bar */}
      <div
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          "flex items-center gap-2 px-3 py-[9px] cursor-pointer select-none",
          collapsed ? "" : "border-b border-b-white/[0.06]",
        )}
      >
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: statusColor,
            boxShadow: `0 0 8px ${statusColor}60`,
            animation: isRunning ? "logDotPulse 1.4s ease-in-out infinite" : "none",
          }}
        />
        <Terminal size={11} className="text-[#5C5C78] shrink-0" />
        <span className="text-xs text-[#5C5C78] font-medium flex-1">
          {isRunning ? "Executing\u2026" : "Execution Log"}
        </span>
        <span className="text-[9px] text-[#3A3A50] font-medium px-1.5 py-px rounded-lg bg-white/[0.04]">
          {entries.length}
        </span>
        <motion.div
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-[#3A3A50] flex shrink-0"
        >
          <ChevronDown size={12} />
        </motion.div>
        {!isRunning && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close log"
            className="bg-none border-none cursor-pointer text-[#3A3A50] p-0.5 rounded flex items-center justify-center shrink-0 hover:text-red-500 transition-colors duration-150"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Log body */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="max-h-[180px] overflow-y-auto px-3 py-2 flex flex-col gap-px">
              {entries.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.15,
                    delay: Math.min(i * 0.015, 0.3),
                  }}
                  className="flex gap-2 text-[11px] leading-relaxed py-0.5"
                >
                  <span className="text-[#2a2a3a] shrink-0 font-medium">
                    {fmt(entry.timestamp)}
                  </span>
                  <span
                    className="shrink-0 font-semibold w-2.5 text-center"
                    style={{ color: TYPE_COLOR[entry.type] }}
                  >
                    {TYPE_SYMBOL[entry.type]}
                  </span>
                  <span className={cn(
                    "flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
                    entry.type === "error" ? "text-red-400" :
                    entry.type === "success" ? "text-emerald-400" :
                    "text-[#5C5C78]",
                  )}>
                    {entry.message}
                    {entry.detail && (
                      <span className="text-[#5C5C78] ml-1.5">
                        {entry.detail}
                      </span>
                    )}
                  </span>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes logDotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </motion.div>
  );
}
