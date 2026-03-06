"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles, Send, X, MessageSquare, Trash2, Zap } from "lucide-react";
import { useWorkflowStore } from "@/stores/workflow-store";
import { NODE_CATALOGUE_MAP } from "@/constants/node-catalogue";
import type { WorkflowNodeData, NodeCategory } from "@/types/nodes";
import type { WorkflowNode } from "@/types/nodes";
import { generateId } from "@/lib/utils";
import { toast } from "sonner";
import { processWorkflowChat } from "@/services/ai-chat-service";
import type { ChatAction } from "@/services/ai-chat-service";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS: Record<NodeCategory, string> = {
  input: "#3B82F6", transform: "#8B5CF6", generate: "#10B981", export: "#F59E0B",
};

// ─── Node catalogue helpers (keyword fallback) ───────────────────────────────

function fuzzyFindNode(text: string) {
  const lower = text.toLowerCase();
  for (const [, node] of NODE_CATALOGUE_MAP) {
    if (lower.includes(node.name.toLowerCase()) || lower.includes(node.id.toLowerCase())) {
      return node;
    }
  }
  for (const [, node] of NODE_CATALOGUE_MAP) {
    const words = node.name.toLowerCase().split(" ");
    if (words.some(w => w.length > 3 && lower.includes(w))) {
      return node;
    }
  }
  return null;
}

function keywordFallback(
  message: string,
  nodes: WorkflowNode[],
  addNode: (n: WorkflowNode) => void,
  addEdge: ReturnType<typeof useWorkflowStore.getState>["addEdge"],
  removeNode: (id: string) => void,
): string {
  const lower = message.toLowerCase();

  if (/\b(add|include|insert|append|put)\b/.test(lower)) {
    const found = fuzzyFindNode(message);
    if (!found) return "I couldn't find that node. Try something like: \"Add IFC Exporter at the end\".";
    const lastNode = nodes[nodes.length - 1];
    const x = lastNode ? lastNode.position.x + 260 : 300;
    const y = lastNode ? lastNode.position.y : 200;
    const newNode: WorkflowNode = {
      id: `${found.id}-${generateId()}`, type: "workflowNode",
      position: { x, y },
      data: {
        catalogueId: found.id, label: found.name, category: found.category as NodeCategory,
        status: "idle", inputs: found.inputs, outputs: found.outputs,
        icon: found.icon, executionTime: found.executionTime,
      } satisfies WorkflowNodeData,
    };
    addNode(newNode);
    if (lastNode) {
      addEdge({
        id: `e${lastNode.id}-${newNode.id}`, source: lastNode.id,
        sourceHandle: lastNode.data.outputs[0]?.id ?? "output",
        target: newNode.id, targetHandle: newNode.data.inputs[0]?.id ?? "input",
        type: "animatedEdge",
        data: { sourceColor: COLORS[lastNode.data.category as NodeCategory] ?? "#4F8AFF", targetColor: COLORS[found.category as NodeCategory] ?? "#4F8AFF" },
      });
    }
    return `Added **${found.name}** to your workflow.`;
  }

  if (/\b(remove|delete|drop|take out)\b/.test(lower)) {
    const found = fuzzyFindNode(message);
    if (!found) return "I couldn't find that node to remove.";
    const nodeToRemove = nodes.find(n => n.data.catalogueId === found.id);
    if (!nodeToRemove) return `**${found.name}** is not on the canvas.`;
    removeNode(nodeToRemove.id);
    return `Removed **${found.name}** from your workflow.`;
  }

  if (/\b(explain|what does|how|describe)\b/.test(lower)) {
    if (nodes.length === 0) return "Your canvas is empty. Add some nodes first!";
    const lines = nodes.map(n => `• **${n.data.label}** — ${n.data.inputs.length > 0 ? n.data.inputs.map(i => i.label).join(", ") : "no input"} → ${n.data.outputs.length > 0 ? n.data.outputs.map(o => o.label).join(", ") : "no output"}`);
    return `Your workflow has ${nodes.length} nodes:\n${lines.join("\n")}`;
  }

  return "";
}

// ─── Apply AI actions to canvas ──────────────────────────────────────────────

function applyActions(
  actions: ChatAction[],
  nodes: WorkflowNode[],
  addNode: (n: WorkflowNode) => void,
  addEdge: ReturnType<typeof useWorkflowStore.getState>["addEdge"],
  removeNode: (id: string) => void,
) {
  let changeCount = 0;

  for (const action of actions) {
    if (action.type === "add" && action.nodeId) {
      const catalogueNode = NODE_CATALOGUE_MAP.get(action.nodeId);
      if (!catalogueNode) continue;

      const connectFrom = action.connectFrom
        ? nodes.find(n => n.data.catalogueId === action.connectFrom)
        : nodes[nodes.length - 1];

      const x = connectFrom ? connectFrom.position.x + 260 : 300;
      const y = connectFrom ? connectFrom.position.y : 200;

      const newNode: WorkflowNode = {
        id: `${catalogueNode.id}-${generateId()}`, type: "workflowNode",
        position: { x, y },
        data: {
          catalogueId: catalogueNode.id, label: catalogueNode.name,
          category: catalogueNode.category as NodeCategory, status: "idle",
          inputs: catalogueNode.inputs, outputs: catalogueNode.outputs,
          icon: catalogueNode.icon, executionTime: catalogueNode.executionTime,
        } satisfies WorkflowNodeData,
      };
      addNode(newNode);

      if (connectFrom) {
        addEdge({
          id: `e${connectFrom.id}-${newNode.id}`, source: connectFrom.id,
          sourceHandle: connectFrom.data.outputs[0]?.id ?? "output",
          target: newNode.id, targetHandle: newNode.data.inputs[0]?.id ?? "input",
          type: "animatedEdge",
          data: {
            sourceColor: COLORS[connectFrom.data.category as NodeCategory] ?? "#4F8AFF",
            targetColor: COLORS[catalogueNode.category as NodeCategory] ?? "#4F8AFF",
          },
        });
      }
      nodes = [...nodes, newNode];
      changeCount++;
    }

    if (action.type === "remove" && action.nodeId) {
      const target = nodes.find(n => n.data.catalogueId === action.nodeId);
      if (target) {
        removeNode(target.id);
        nodes = nodes.filter(n => n.id !== target.id);
        changeCount++;
      }
    }

    if (action.type === "replace" && action.oldNodeId && action.newNodeId) {
      const oldNode = nodes.find(n => n.data.catalogueId === action.oldNodeId);
      const newCat = NODE_CATALOGUE_MAP.get(action.newNodeId);
      if (oldNode && newCat) {
        const replacement: WorkflowNode = {
          id: `${newCat.id}-${generateId()}`, type: "workflowNode",
          position: { ...oldNode.position },
          data: {
            catalogueId: newCat.id, label: newCat.name,
            category: newCat.category as NodeCategory, status: "idle",
            inputs: newCat.inputs, outputs: newCat.outputs,
            icon: newCat.icon, executionTime: newCat.executionTime,
          } satisfies WorkflowNodeData,
        };
        addNode(replacement);
        removeNode(oldNode.id);
        nodes = [...nodes.filter(n => n.id !== oldNode.id), replacement];
        changeCount++;
      }
    }
  }

  return changeCount;
}

// ─── Markdown-ish renderer ───────────────────────────────────────────────────

function renderMessage(text: string) {
  return text.split("\n").map((line, i) => (
    <React.Fragment key={i}>
      {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={j} className="text-[#F0F0F5]">{part.slice(2, -2)}</strong>
          : part
      )}
      {i < text.split("\n").length - 1 && <br />}
    </React.Fragment>
  ));
}

// ─── Panel ───────────────────────────────────────────────────────────────────

interface AIChatPanelProps {
  messages: ChatMessage[];
  onAddMessage: (msg: ChatMessage) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function AIChatPanel({ messages, onAddMessage, onClear, isOpen, onToggle }: AIChatPanelProps) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [aiMode, setAiMode] = useState<"gpt" | "keyword">("gpt");

  const { nodes, edges, addNode, addEdge, removeNode } = useWorkflowStore();

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: generateId(), role: "user", content: text, timestamp: new Date(),
    };
    onAddMessage(userMsg);
    setInput("");
    setIsTyping(true);

    let replyText = "";

    if (aiMode === "gpt") {
      try {
        const nodeSummaries = nodes.map(n => ({
          instanceId: n.id,
          catalogueId: n.data.catalogueId,
          label: n.data.label,
        }));
        const edgeSummaries = edges.map(e => ({
          source: e.source,
          target: e.target,
        }));

        const response = await processWorkflowChat(text, nodeSummaries, edgeSummaries);
        replyText = response.message;

        if (response.actions.length > 0) {
          const count = applyActions(response.actions, [...nodes], addNode, addEdge, removeNode);
          if (count > 0) {
            toast.success(`Workflow updated (${count} change${count > 1 ? "s" : ""})`, { duration: 2000 });
          }
        }
      } catch {
        replyText = keywordFallback(text, nodes, addNode, addEdge, removeNode);
        if (!replyText) {
          replyText = "I had trouble connecting to the AI. Try again, or use simpler commands like \"Add BOQ Exporter\".";
        }
      }
    } else {
      replyText = keywordFallback(text, nodes, addNode, addEdge, removeNode);
      if (!replyText) {
        replyText = `I can **add**, **remove**, or **explain** nodes. Try:\n• "Add IFC Exporter at the end"\n• "Remove the Image Generator"\n• "Explain my workflow"`;
      }
    }

    const aiMsg: ChatMessage = {
      id: generateId(), role: "ai", content: replyText, timestamp: new Date(),
    };
    onAddMessage(aiMsg);
    setIsTyping(false);
  }, [input, isTyping, nodes, edges, addNode, addEdge, removeNode, onAddMessage, aiMode]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <>
      {/* Floating pill when closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={onToggle}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[25] px-2 py-2.5 bg-[#12121E] border border-white/[0.08] border-r-0 rounded-l-lg cursor-pointer text-[#8888A0] flex flex-col items-center gap-1 shadow-[-4px_0_16px_rgba(0,0,0,0.3)] hover:text-[#4F8AFF] transition-colors duration-150"
          >
            <Sparkles size={14} />
            <span className="text-[9px] font-semibold [writing-mode:vertical-rl] [text-orientation:mixed] tracking-[1px]">AI CHAT</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="absolute right-0 top-0 bottom-0 w-[380px] z-[25] bg-[#060610]/95 backdrop-blur-xl border-l border-white/[0.06] flex flex-col shadow-[-8px_0_32px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="h-12 px-4 border-b border-b-white/[0.06] flex items-center gap-2 shrink-0">
              <Sparkles size={14} className="text-[#4F8AFF]" />
              <span className="text-sm font-semibold text-[#F0F0F5] flex-1">
                AI Assistant
              </span>
              {/* GPT / Keyword toggle */}
              <button
                onClick={() => setAiMode(m => m === "gpt" ? "keyword" : "gpt")}
                title={aiMode === "gpt" ? "Using GPT-4o-mini (click for keyword mode)" : "Using keyword mode (click for GPT)"}
                className={cn(
                  "rounded-[5px] px-1.5 py-0.5 cursor-pointer flex items-center gap-[3px] text-[10px] font-semibold",
                  aiMode === "gpt"
                    ? "bg-[rgba(79,138,255,0.15)] border border-[rgba(79,138,255,0.3)] text-[#4F8AFF]"
                    : "bg-white/[0.04] border border-white/[0.06] text-[#5C5C78]",
                )}
              >
                <Zap size={10} />
                {aiMode === "gpt" ? "GPT" : "Basic"}
              </button>
              <button onClick={onClear} title="Clear chat"
                className="bg-none border-none cursor-pointer text-[#3A3A50] p-1 rounded hover:text-[#5C5C78] transition-colors duration-150">
                <Trash2 size={12} />
              </button>
              <button onClick={onToggle}
                className="bg-none border-none cursor-pointer text-[#3A3A50] p-1 rounded hover:text-[#8888A0] transition-colors duration-150">
                <X size={13} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-2.5">
              {messages.length === 0 && (
                <div className="text-center px-4 py-8 text-[#3A3A50] text-xs">
                  <MessageSquare size={28} className="mx-auto mb-2.5 opacity-30" />
                  <div className="font-semibold text-[#5C5C78] mb-1.5">
                    {aiMode === "gpt" ? "GPT-Powered Assistant" : "AI Workflow Assistant"}
                  </div>
                  <div className="leading-relaxed">
                    {aiMode === "gpt" ? (
                      <>
                        Ask me anything:<br />
                        • &ldquo;Add cost estimation to this workflow&rdquo;<br />
                        • &ldquo;What does this workflow do?&rdquo;<br />
                        • &ldquo;Replace the image generator with a floor plan&rdquo;<br />
                        • &ldquo;Suggest improvements&rdquo;
                      </>
                    ) : (
                      <>
                        Tell me what to change:<br />
                        • &ldquo;Add an IFC Exporter&rdquo;<br />
                        • &ldquo;Remove the Image Generator&rdquo;<br />
                        • &ldquo;Explain my workflow&rdquo;
                      </>
                    )}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={cn(
                  "flex flex-col gap-0.5",
                  msg.role === "user" ? "items-end" : "items-start",
                )}>
                  <div className={cn(
                    "max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed",
                    msg.role === "user"
                      ? "rounded-br-md bg-[rgba(79,138,255,0.15)] border border-[rgba(79,138,255,0.1)] text-[#F0F0F5]"
                      : "rounded-bl-md bg-[#12121e] border border-white/[0.04] text-[#9898B0]",
                  )}>
                    {renderMessage(msg.content)}
                  </div>
                  <span className="text-[9px] text-[#3A3A50]">
                    {msg.timestamp.toTimeString().slice(0, 5)}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-1 px-[11px] py-2 bg-white/[0.04] rounded-[10px] border border-white/[0.06] w-fit">
                  {[0, 1, 2].map(i => (
                    <div key={i}
                      className="w-[5px] h-[5px] rounded-full bg-[#5C5C78]"
                      style={{ animation: `dotPulse 1s ease-in-out ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-t-white/[0.06] shrink-0 flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); e.stopPropagation(); }}
                onKeyDown={onKeyDown}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
                placeholder="Ask anything about your workflow..."
                rows={2}
                className="flex-1 resize-none px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.04] text-[#F0F0F5] text-sm font-[inherit] outline-none leading-relaxed max-h-[80px] overflow-y-auto transition-all duration-150 focus:border-[rgba(79,138,255,0.3)] focus:bg-white/[0.06]"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className={cn(
                  "w-8 h-8 rounded-[7px] border-none flex items-center justify-center shrink-0 transition-all duration-150",
                  input.trim() && !isTyping
                    ? "bg-[#4F8AFF] text-white cursor-pointer hover:bg-[#3D7AFF]"
                    : "bg-white/[0.06] text-[#3A3A50] cursor-default",
                )}
              >
                <Send size={13} />
              </button>
            </div>
            <div className="px-3.5 pb-2 text-[9px] text-white/[0.08]">
              Enter to send · Shift+Enter for new line
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}

export type { ChatMessage };
