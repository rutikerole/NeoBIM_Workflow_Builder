"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Terminal, X, GripHorizontal } from "lucide-react";

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

const TYPE_COLOR = {
  start:   "#4F8AFF",
  running: "#F59E0B",
  success: "#10B981",
  error:   "#EF4444",
  info:    "#5C5C78",
};

const TYPE_SYMBOL = {
  start:   "▶",
  running: "◉",
  success: "✓",
  error:   "✗",
  info:    "·",
};

function fmt(d: Date) {
  return d.toTimeString().slice(0, 8);
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 500;
const DEFAULT_HEIGHT = 220;

export function ExecutionLog({ entries, isRunning, onClose }: ExecutionLogProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  // Auto-scroll to bottom as entries appear
  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, collapsed]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = resizeStartY.current - e.clientY;
      const newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStartHeight.current + delta));
      setHeight(newHeight);
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

  if (entries.length === 0 && !isRunning) return null;

  return (
    <motion.div
      initial={{ y: 200, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 200, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        zIndex: 30,
        background: "rgba(7, 7, 13, 0.98)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.3)",
        fontFamily: "'JetBrains Mono', 'Fira Mono', 'Menlo', monospace",
      }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 6,
          cursor: "ns-resize",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: isResizing ? 1 : 0,
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={e => { if (!isResizing) e.currentTarget.style.opacity = "0"; }}
      >
        <GripHorizontal size={16} style={{ color: "#3A3A50" }} />
      </div>

      {/* Title bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        height: 36, flexShrink: 0,
      }}>
        <Terminal size={12} style={{ color: "#4F8AFF" }} />
        <span style={{ fontSize: 11, color: "#F0F0F5", fontWeight: 600, flex: 1 }}>
          Execution Log
          {isRunning && (
            <span style={{ color: "#F59E0B", marginLeft: 10, animation: "logPulse 1.2s ease-in-out infinite" }}>
              ● running
            </span>
          )}
        </span>
        <span style={{ fontSize: 10, color: "#5C5C78" }}>
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Expand log" : "Collapse log"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#5C5C78", padding: 3, borderRadius: 4,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#1A1A26";
            e.currentTarget.style.color = "#F0F0F5";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#5C5C78";
          }}
        >
          {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {!isRunning && (
          <button
            onClick={onClose}
            title="Close log"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#5C5C78", padding: 3, borderRadius: 4,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#2A1A1A";
              e.currentTarget.style.color = "#EF4444";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#5C5C78";
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Log body */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height }}
            exit={{ height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              height: "100%", overflowY: "auto", padding: "10px 14px",
              display: "flex", flexDirection: "column", gap: 3,
            }}>
              {entries.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  style={{
                    display: "flex", gap: 10, fontSize: 11, lineHeight: 1.6,
                    padding: "4px 0",
                  }}
                >
                  <span style={{
                    color: "rgba(255,255,255,0.12)",
                    flexShrink: 0,
                    fontWeight: 500,
                  }}>
                    {fmt(entry.timestamp)}
                  </span>
                  <span style={{
                    color: TYPE_COLOR[entry.type],
                    flexShrink: 0,
                    fontWeight: 600,
                  }}>
                    {TYPE_SYMBOL[entry.type]}
                  </span>
                  <span style={{
                    color: entry.type === "error" ? "#F87171" : "#E0E0F0",
                    flex: 1,
                  }}>
                    {entry.message}
                    {entry.detail && (
                      <span style={{ color: "#7C7C90", marginLeft: 8 }}>
                        — {entry.detail}
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
        @keyframes logPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </motion.div>
  );
}
