"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Play, Square, Save, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
  Share2, Sparkles, MousePointer2, Layers, Layers3, ChevronDown,
  Loader2, CheckCircle2, Pencil,
} from "lucide-react";
import type { CreationMode } from "@/types/workflow";
import { useWorkflowStore } from "@/stores/workflow-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CanvasToolbarProps {
  workflowName: string;
  creationMode: CreationMode;
  isExecuting: boolean;
  isDirty: boolean;
  isSaving: boolean;
  isNodeLibraryOpen: boolean;
  onRun: () => void;
  onStop: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onShare: () => void;
  onModeChange: (mode: CreationMode) => void;
  onPromptMode: () => void;
  onToggleLibrary: () => void;
  onNameChange?: (name: string) => void;
}

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<CreationMode, { label: string; icon: React.ReactNode; description: string }> = {
  manual: { label: "Manual",    icon: <MousePointer2 size={12} />, description: "Drag-and-drop nodes"      },
  prompt: { label: "AI Prompt", icon: <Sparkles size={12} />,      description: "Describe your workflow"  },
  hybrid: { label: "Hybrid",    icon: <Layers size={12} />,        description: "AI + manual editing"     },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Sep() {
  return (
    <div className="w-px h-[18px] bg-white/[0.04] mx-1.5 shrink-0" />
  );
}

interface TBBtnProps {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  disabled?: boolean;
}

function TBBtn({ onClick, icon, title, disabled }: TBBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none transition-all duration-150",
        disabled
          ? "text-[#5C5C78] opacity-40 cursor-not-allowed"
          : "text-[#5C5C78] cursor-pointer hover:bg-white/[0.06] hover:text-[#F0F0F5]",
      )}
    >
      {icon}
    </button>
  );
}

// ─── Main toolbar ─────────────────────────────────────────────────────────────

export function CanvasToolbar({
  workflowName,
  creationMode,
  isExecuting,
  isDirty,
  isSaving,
  isNodeLibraryOpen,
  onRun,
  onStop,
  onSave,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onShare,
  onModeChange,
  onPromptMode,
  onToggleLibrary,
  onNameChange,
}: CanvasToolbarProps) {
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showRunMenu, setShowRunMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(workflowName);
  const [savedFlash, setSavedFlash] = useState(false);

  const modeMenuRef = useRef<HTMLDivElement>(null);
  const runMenuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    onSave();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }, [onSave]);

  // Keep keyboard handler up-to-date without re-registering the listener
  const kbRef = useRef<(e: KeyboardEvent) => void>(null!);
  useEffect(() => {
    kbRef.current = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "s") { e.preventDefault(); if (isDirty && !isSaving) handleSave(); }
      if (meta && e.key === "z" && !e.shiftKey) { e.preventDefault(); onUndo(); }
      if (meta && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); onRedo(); }
      if (meta && e.key === "Enter") { e.preventDefault(); if (!isExecuting) onRun(); }
      if (e.key === "Escape" && isExecuting) onStop();
    };
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => kbRef.current(e);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []); // intentionally empty — ref pattern keeps it fresh

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) setShowModeMenu(false);
      if (runMenuRef.current && !runMenuRef.current.contains(e.target as Node)) setShowRunMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commitName = useCallback(() => {
    setIsEditingName(false);
    const trimmed = nameValue.trim() || workflowName;
    if (trimmed !== workflowName) onNameChange?.(trimmed);
  }, [nameValue, workflowName, onNameChange]);

  const currentMode = MODE_CONFIG[creationMode];

  // Check if workflow is ready to run (has nodes)
  const { nodes } = useWorkflowStore();
  const isWorkflowReady = nodes.length > 0 && !isExecuting;

  return (
    <>
      {/* Desktop toolbar */}
      <div className="flex absolute top-0 left-0 right-0 z-[1000] h-12 items-center justify-between px-4 border-b border-white/[0.06] bg-[#08080f]/85 backdrop-blur-xl">
        {/* ── Left group ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0.5">

          {/* Library toggle */}
          <button
            onClick={onToggleLibrary}
            title="Toggle node library"
            aria-label="Toggle node library"
            aria-pressed={isNodeLibraryOpen}
            className={cn(
              "w-[30px] h-[30px] rounded-[7px] flex items-center justify-center cursor-pointer transition-all duration-150",
              isNodeLibraryOpen
                ? "bg-[rgba(79,138,255,0.12)] border border-[rgba(79,138,255,0.3)] text-[#4F8AFF]"
                : "bg-transparent border border-transparent text-[#55556A] hover:bg-[#1A1A26] hover:text-[#F0F0F5]",
            )}
          >
            <Layers3 size={14} />
          </button>

          <Sep />

          {/* Mode selector */}
          <div className="relative" ref={modeMenuRef}>
            <button
              onClick={() => setShowModeMenu(v => !v)}
              aria-label={`Creation mode: ${currentMode.label}`}
              aria-expanded={showModeMenu}
              aria-haspopup="menu"
              className={cn(
                "flex items-center gap-[5px] h-[30px] px-[9px] rounded-[7px] text-[#F0F0F5] cursor-pointer transition-all duration-150",
                showModeMenu
                  ? "bg-[#1A1A26] border border-[#3A3A4E]"
                  : "bg-transparent border border-transparent hover:bg-[#1A1A26]",
              )}
            >
              <span className="text-[#4F8AFF] flex">{currentMode.icon}</span>
              <span className="text-xs font-medium">{currentMode.label}</span>
              <ChevronDown size={9} className="text-[#55556A]" />
            </button>

            <AnimatePresence>
              {showModeMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-[calc(100%+4px)] left-0 w-[188px] rounded-[10px] overflow-hidden bg-[#12121A] border border-[#2A2A3E] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50"
                >
                  {(Object.entries(MODE_CONFIG) as [CreationMode, typeof MODE_CONFIG[CreationMode]][]).map(([value, cfg]) => {
                    const active = creationMode === value;
                    return (
                      <button
                        key={value}
                        onClick={() => {
                          onModeChange(value);
                          setShowModeMenu(false);
                          if (value === "prompt") onPromptMode();
                        }}
                        className={cn(
                          "w-full flex items-start gap-2.5 px-3 py-[9px] border-none cursor-pointer text-left transition-colors duration-100",
                          active ? "bg-[#1A1A26]" : "bg-transparent hover:bg-[#161620]",
                        )}
                      >
                        <span className={cn("mt-px flex", active ? "text-[#4F8AFF]" : "text-[#55556A]")}>
                          {cfg.icon}
                        </span>
                        <div>
                          <div className={cn("text-xs font-medium", active ? "text-[#4F8AFF]" : "text-[#F0F0F5]")}>
                            {cfg.label}
                          </div>
                          <div className="text-[10px] text-[#55556A] mt-px">
                            {cfg.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Sep />

          {/* Undo / Redo */}
          <TBBtn onClick={onUndo} icon={<Undo2 size={13} />} title="Undo (⌘Z)" />
          <TBBtn onClick={onRedo} icon={<Redo2 size={13} />} title="Redo (⌘⇧Z)" />
        </div>

        {/* ── Center — inline-editable name ───────────────────────────────── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-[5px] max-w-[300px] min-w-[80px]">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); commitName(); }
                if (e.key === "Escape") { setNameValue(workflowName); setIsEditingName(false); }
              }}
              maxLength={80}
              autoFocus
              className="bg-transparent border-none border-b border-b-[#4F8AFF] text-[#F0F0F5] text-[13px] font-medium outline-none text-center min-w-[100px] max-w-[260px] px-0.5 py-px"
            />
          ) : (
            <button
              onClick={() => {
                setNameValue(workflowName);
                setIsEditingName(true);
                setTimeout(() => nameInputRef.current?.select(), 0);
              }}
              title="Click to rename"
              className="flex items-center gap-[5px] bg-transparent border-none cursor-text px-1.5 py-[3px] rounded-[5px] max-w-[280px] transition-colors duration-100 hover:bg-[#1A1A26]"
            >
              <span className="text-[13px] font-medium text-[#F0F0F5] overflow-hidden text-ellipsis whitespace-nowrap">
                {workflowName}
              </span>
              <Pencil size={10} className="text-[#3A3A4E] shrink-0" />
              {isDirty && (
                <div
                  title="Unsaved changes"
                  className="w-[5px] h-[5px] rounded-full bg-amber-500 shrink-0"
                />
              )}
            </button>
          )}
        </div>

        {/* ── Right group ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0.5">

          {/* Zoom */}
          <TBBtn onClick={onZoomOut} icon={<ZoomOut size={13} />} title="Zoom out" />
          <TBBtn onClick={onZoomIn} icon={<ZoomIn size={13} />} title="Zoom in" />
          <TBBtn onClick={onFitView} icon={<Maximize2 size={13} />} title="Fit to screen" />

          <Sep />

          {/* AI Prompt */}
          <button
            onClick={onPromptMode}
            className="flex items-center gap-[5px] h-9 px-4 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#F0F0F5] text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-white/10"
          >
            <Sparkles size={11} />
            AI
          </button>

          {/* Share */}
          <TBBtn onClick={onShare} icon={<Share2 size={13} />} title="Share" />

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={(!isDirty && !savedFlash) || isSaving}
            title="Save (⌘S)"
            className={cn(
              "flex items-center gap-[5px] h-9 px-4 rounded-lg bg-transparent text-[13px] font-medium transition-all duration-150",
              savedFlash
                ? "border border-emerald-500/40 text-emerald-500 cursor-pointer"
                : isDirty
                ? "border border-white/[0.08] text-[#9898B0] cursor-pointer hover:bg-white/[0.06] hover:text-[#F0F0F5]"
                : "border border-transparent text-[#3A3A4E] cursor-default opacity-50",
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isSaving ? (
                <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex">
                  <Loader2 size={12} className="animate-spin" />
                </motion.span>
              ) : savedFlash ? (
                <motion.span key="saved" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }} className="flex">
                  <CheckCircle2 size={12} />
                </motion.span>
              ) : (
                <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex">
                  <Save size={12} />
                </motion.span>
              )}
            </AnimatePresence>
            {isSaving ? "Saving…" : savedFlash ? "Saved" : "Save"}
          </button>

          <Sep />

          {/* Run / Stop */}
          {isExecuting ? (
            <button
              onClick={onStop}
              title="Stop execution (Esc)"
              className="flex items-center gap-[7px] h-9 px-5 rounded-[10px] bg-red-500 border-none text-white text-[13px] font-semibold cursor-pointer transition-colors duration-150 shadow-[0_2px_16px_rgba(239,68,68,0.3)] hover:bg-red-600"
            >
              <Square size={14} fill="white" />
              Stop
            </button>
          ) : (
            <div className="flex relative" ref={runMenuRef}>
              <button
                onClick={onRun}
                title="Run workflow (⌘↵)"
                disabled={!isWorkflowReady}
                className={cn(
                  "flex items-center gap-2 h-9 pl-5 pr-4 rounded-l-[10px] border-none text-white text-sm font-semibold transition-all duration-200",
                  isWorkflowReady
                    ? "bg-gradient-to-r from-[#4F8AFF] to-[#6366F1] cursor-pointer shadow-[0_0_20px_rgba(79,138,255,0.3)] hover:brightness-110 active:scale-[0.96] animate-[glow-pulse_3s_ease-in-out_infinite]"
                    : "bg-[#2A2A3E] cursor-not-allowed opacity-50 shadow-none",
                )}
              >
                <Play size={16} fill="white" />
                Run Workflow
              </button>

              <button
                onClick={() => setShowRunMenu(v => !v)}
                aria-label="More run options"
                aria-expanded={showRunMenu}
                aria-haspopup="menu"
                disabled={!isWorkflowReady}
                className={cn(
                  "flex items-center justify-center w-[30px] h-9 p-0 rounded-r-[10px] border-none border-l border-l-white/[0.12] text-white/75 transition-colors duration-150",
                  isWorkflowReady
                    ? "bg-[rgba(79,138,255,0.85)] cursor-pointer hover:bg-[#3472EB]"
                    : "bg-[#25253A] cursor-not-allowed opacity-60",
                )}
              >
                <ChevronDown size={12} />
              </button>

              {/* Run dropdown */}
              <AnimatePresence>
                {showRunMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-[calc(100%+4px)] right-0 w-[190px] rounded-[10px] overflow-hidden bg-[#12121A] border border-[#2A2A3E] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50"
                  >
                    {[
                      { label: "Run All Nodes",       sub: "Execute the full workflow"  },
                      { label: "Run from Selection",  sub: "Start from selected node"   },
                      { label: "Step Through",        sub: "Execute one node at a time" },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => { onRun(); setShowRunMenu(false); }}
                        className="w-full flex flex-col gap-px px-3 py-2 bg-transparent border-none cursor-pointer text-left transition-colors duration-100 hover:bg-[#1A1A26]"
                      >
                        <span className="text-xs font-medium text-[#F0F0F5]">{item.label}</span>
                        <span className="text-[10px] text-[#55556A]">{item.sub}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <motion.div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-[rgba(7,7,13,0.95)] backdrop-blur-[16px] border-t border-t-white/[0.08] shadow-[0_-4px_24px_rgba(0,0,0,0.3)]"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Full-width Run button for mobile */}
        {isExecuting ? (
          <button
            onClick={onStop}
            className="w-full h-[60px] rounded-xl flex items-center justify-center gap-2 bg-red-500 border-none text-white text-base font-semibold cursor-pointer transition-colors duration-150 shadow-[0_0_24px_rgba(239,68,68,0.4)]"
          >
            <Square size={16} fill="white" />
            Stop Execution
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={!isWorkflowReady}
            className={cn(
              "w-full h-[60px] rounded-xl flex items-center justify-center gap-2 border-none text-white text-base font-semibold transition-all duration-150",
              isWorkflowReady
                ? "bg-[#4F8AFF] cursor-pointer"
                : "bg-[#3A3A50] cursor-not-allowed opacity-60",
            )}
          >
            {isExecuting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play size={18} fill="white" />
                Run Workflow
              </>
            )}
          </button>
        )}

        {/* Mobile utility bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-t-white/[0.06]">
          <button
            onClick={onToggleLibrary}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer",
              isNodeLibraryOpen
                ? "bg-[rgba(79,138,255,0.12)] border border-[rgba(79,138,255,0.3)] text-[#4F8AFF]"
                : "bg-transparent border border-white/[0.08] text-[#F0F0F5]",
            )}
          >
            <Layers3 size={14} />
            Nodes
          </button>

          <button
            onClick={handleSave}
            disabled={(!isDirty && !savedFlash) || isSaving}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium",
              savedFlash
                ? "bg-transparent border border-emerald-500/40 text-emerald-500 cursor-pointer"
                : isDirty
                ? "bg-transparent border border-white/[0.08] text-[#F0F0F5] cursor-pointer"
                : "bg-transparent border border-transparent text-[#3A3A4E] cursor-default opacity-50",
            )}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : savedFlash ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {isSaving ? "Saving" : savedFlash ? "Saved" : "Save"}
          </button>

          <button
            onClick={onPromptMode}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500/[0.08] border border-violet-500/20 text-violet-500 text-xs font-medium cursor-pointer"
          >
            <Sparkles size={14} />
            AI
          </button>
        </div>
      </motion.div>

      <style>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 2px 12px rgba(79, 138, 255, 0.25); }
          50% { box-shadow: 0 2px 20px rgba(79, 138, 255, 0.45); }
        }
      `}</style>
    </>
  );
}
