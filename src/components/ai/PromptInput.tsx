"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import { PREBUILT_WORKFLOWS } from "@/constants/prebuilt-workflows";
import { toast } from "sonner";
import type { WorkflowTemplate } from "@/types/workflow";

const EXAMPLE_PROMPTS = [
  "I have a PDF project brief and want to generate a 3D massing with concept renders",
  "Upload an IFC model, extract quantities, and export a BOQ spreadsheet",
  "Generate 3 massing variants from a text description with metrics comparison",
  "Analyze a reference image and create a concept building matching its style",
  "Upload a site location and generate a contextual building massing",
  "Create a complete pipeline from PDF brief to IFC export",
];

interface PromptInputProps {
  onClose?: () => void;
}

export function PromptInput({ onClose }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { loadFromTemplate } = useWorkflowStore();
  const { setPromptModeActive } = useUIStore();

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    toast.info("AI is building your workflow...", { duration: 2000 });

    // Simulate AI workflow generation delay
    await new Promise((r) => setTimeout(r, 2500));

    // Match prompt to closest prebuilt workflow (naive matching for demo)
    const promptLower = prompt.toLowerCase();
    let matchedWorkflow: WorkflowTemplate | undefined;

    if (promptLower.includes("pdf") && promptLower.includes("ifc")) {
      matchedWorkflow = PREBUILT_WORKFLOWS.find((w) => w.id === "wf-10");
    } else if (promptLower.includes("pdf") && promptLower.includes("mass")) {
      matchedWorkflow = PREBUILT_WORKFLOWS.find((w) => w.id === "wf-02");
    } else if (promptLower.includes("ifc") && (promptLower.includes("quantity") || promptLower.includes("boq"))) {
      matchedWorkflow = PREBUILT_WORKFLOWS.find((w) => w.id === "wf-09");
    } else if (promptLower.includes("variant") || promptLower.includes("options")) {
      matchedWorkflow = PREBUILT_WORKFLOWS.find((w) => w.id === "wf-07");
    } else if (promptLower.includes("image") && promptLower.includes("building")) {
      matchedWorkflow = PREBUILT_WORKFLOWS.find((w) => w.id === "wf-08");
    } else if (promptLower.includes("text") || promptLower.includes("brief") || promptLower.includes("concept")) {
      matchedWorkflow = PREBUILT_WORKFLOWS.find((w) => w.id === "wf-01");
    } else {
      matchedWorkflow = PREBUILT_WORKFLOWS[0];
    }

    if (matchedWorkflow) {
      loadFromTemplate(matchedWorkflow);
      toast.success(`Generated: "${matchedWorkflow.name}"`, {
        description: `${matchedWorkflow.tileGraph.nodes.length} nodes connected and ready to run`,
        duration: 4000,
      });
    }

    setIsGenerating(false);
    setPromptModeActive(false);
    onClose?.();
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0F]/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-2xl mx-4 rounded-2xl border border-[#2A2A3E] bg-[#12121A] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2E]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.25)] flex items-center justify-center">
              <Sparkles size={16} className="text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F0F0F5]">AI Workflow Generator</h2>
              <p className="text-[10px] text-[#55556A]">Describe your workflow in natural language</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-[#55556A] hover:text-[#F0F0F5] hover:bg-[#1A1A26] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Prompt input */}
        <div className="px-6 py-5">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your workflow... e.g. 'I have a PDF project brief and want to generate 3 massing variants with concept renders and export to IFC'"
              rows={4}
              autoFocus
              className={cn(
                "w-full rounded-xl border bg-[#0A0A0F] px-4 py-3 text-sm text-[#F0F0F5] placeholder:text-[#3A3A4E]",
                "border-[#2A2A3E] focus:border-[#8B5CF6] focus:outline-none focus:ring-1 focus:ring-[#8B5CF6]",
                "resize-none transition-colors leading-relaxed"
              )}
            />
            <div className="absolute bottom-3 right-3 text-[9px] text-[#2A2A3E]">
              ⌘↵ to generate
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className={cn(
              "mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
              "bg-gradient-to-r from-[#4F8AFF] to-[#8B5CF6] text-white",
              "hover:opacity-90 active:scale-[0.99]",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generating workflow...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate Workflow
              </>
            )}
          </button>
        </div>

        {/* Example prompts */}
        <div className="px-6 pb-5 border-t border-[#1E1E2E] pt-4">
          <p className="text-[10px] font-medium text-[#55556A] uppercase tracking-wider mb-3">
            Example prompts
          </p>
          <div className="space-y-1.5">
            {EXAMPLE_PROMPTS.slice(0, 4).map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="w-full flex items-center gap-2 rounded-lg border border-[#1E1E2E] bg-[#0A0A0F] px-3 py-2 text-left hover:border-[#2A2A3E] hover:bg-[#12121A] transition-all group"
              >
                <ChevronRight
                  size={11}
                  className="text-[#3A3A4E] group-hover:text-[#8B5CF6] transition-colors shrink-0"
                />
                <span className="text-[11px] text-[#8888A0] group-hover:text-[#F0F0F5] transition-colors line-clamp-1">
                  {example}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
