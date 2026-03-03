"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Play,
  Square,
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Share2,
  Sparkles,
  Hand,
  MousePointer2,
  Layers,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreationMode } from "@/types/workflow";

interface CanvasToolbarProps {
  workflowName: string;
  creationMode: CreationMode;
  isExecuting: boolean;
  isDirty: boolean;
  isSaving: boolean;
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
}

const MODE_OPTIONS: { value: CreationMode; label: string; description: string }[] = [
  { value: "manual", label: "Manual", description: "Drag-and-drop nodes" },
  { value: "prompt", label: "AI Prompt", description: "Describe your workflow" },
  { value: "hybrid", label: "Hybrid", description: "AI + manual editing" },
];

export function CanvasToolbar({
  workflowName,
  creationMode,
  isExecuting,
  isDirty,
  isSaving,
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
}: CanvasToolbarProps) {
  const [showModeMenu, setShowModeMenu] = React.useState(false);
  const modeMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 border-b border-[#1E1E2E] bg-[#0A0A0F]/90 backdrop-blur-md">
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Mode selector */}
        <div className="relative" ref={modeMenuRef}>
          <button
            onClick={() => setShowModeMenu(!showModeMenu)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
              "border-[#2A2A3E] bg-[#12121A] text-[#F0F0F5]",
              "hover:border-[#3A3A4E] hover:bg-[#1A1A26]",
              showModeMenu && "border-[#4F8AFF] bg-[#1A1A26]"
            )}
          >
            <Layers size={12} className="text-[#4F8AFF]" />
            {MODE_OPTIONS.find((m) => m.value === creationMode)?.label}
            <ChevronDown size={10} className="text-[#55556A]" />
          </button>

          {showModeMenu && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full mt-1 left-0 w-44 rounded-xl border border-[#2A2A3E] bg-[#12121A] shadow-elevated z-50 overflow-hidden"
            >
              {MODE_OPTIONS.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => {
                    onModeChange(mode.value);
                    setShowModeMenu(false);
                    if (mode.value === "prompt") onPromptMode();
                  }}
                  className={cn(
                    "w-full flex flex-col px-3 py-2.5 text-left hover:bg-[#1A1A26] transition-colors",
                    creationMode === mode.value && "bg-[#1A1A26]"
                  )}
                >
                  <span className={cn("text-xs font-medium", creationMode === mode.value ? "text-[#4F8AFF]" : "text-[#F0F0F5]")}>
                    {mode.label}
                  </span>
                  <span className="text-[9px] text-[#55556A] mt-0.5">{mode.description}</span>
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-[#1E1E2E]" />

        {/* Edit actions */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={onUndo} icon={<Undo2 size={14} />} tooltip="Undo" />
          <ToolbarButton onClick={onRedo} icon={<Redo2 size={14} />} tooltip="Redo" />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-[#1E1E2E]" />

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton onClick={onZoomOut} icon={<ZoomOut size={14} />} tooltip="Zoom out" />
          <ToolbarButton onClick={onZoomIn} icon={<ZoomIn size={14} />} tooltip="Zoom in" />
          <ToolbarButton onClick={onFitView} icon={<Maximize2 size={14} />} tooltip="Fit to screen" />
        </div>
      </div>

      {/* Center — Workflow name */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="text-sm font-medium text-[#F0F0F5]">{workflowName}</span>
        {isDirty && (
          <div className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" title="Unsaved changes" />
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* AI Prompt button */}
        <button
          onClick={onPromptMode}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
            "border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.06)] text-[#8B5CF6]",
            "hover:border-[rgba(139,92,246,0.5)] hover:bg-[rgba(139,92,246,0.1)]"
          )}
        >
          <Sparkles size={12} />
          AI Prompt
        </button>

        {/* Share */}
        <ToolbarButton
          onClick={onShare}
          icon={<Share2 size={14} />}
          tooltip="Share workflow"
          variant="secondary"
        />

        {/* Save */}
        <button
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
            "border-[#2A2A3E] bg-[#12121A] text-[#8888A0]",
            isDirty && !isSaving && "border-[#3A3A4E] text-[#F0F0F5] hover:border-[#4F8AFF] hover:text-[#4F8AFF]",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          {isSaving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Save size={12} />
          )}
          {isSaving ? "Saving..." : "Save"}
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[#1E1E2E]" />

        {/* Run / Stop */}
        {isExecuting ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-lg bg-[#EF4444] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#DC2626] active:scale-95"
          >
            <Square size={12} fill="white" />
            Stop
          </button>
        ) : (
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 rounded-lg bg-[#4F8AFF] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#3D7AFF] active:scale-95 shadow-sm"
          >
            <Play size={12} fill="white" />
            Run
          </button>
        )}
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  tooltip: string;
  variant?: "default" | "secondary";
  disabled?: boolean;
}

function ToolbarButton({ onClick, icon, tooltip, variant = "default", disabled }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-lg transition-all",
        "text-[#55556A] hover:text-[#F0F0F5] hover:bg-[#1A1A26]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variant === "secondary" && "border border-[#2A2A3E] bg-[#12121A]"
      )}
    >
      {icon}
    </button>
  );
}
