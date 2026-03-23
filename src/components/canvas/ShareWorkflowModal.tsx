"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Twitter, Linkedin, Link2, Globe } from "lucide-react";
import { toast } from "sonner";
import {
  shareWorkflowToTwitter,
  shareWorkflowToLinkedIn,
} from "@/lib/share";

interface ShareWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
  workflowId?: string;
  isPublic?: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
}

const SITE_URL = "https://trybuildflow.in";

export function ShareWorkflowModal({
  isOpen,
  onClose,
  workflowName,
  workflowId,
  isPublic = false,
  onTogglePublic,
}: ShareWorkflowModalProps) {
  const [copied, setCopied] = useState(false);
  const [publicState, setPublicState] = useState(isPublic);

  useEffect(() => {
    setPublicState(isPublic);
  }, [isPublic]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const shareUrl = workflowId
    ? `${SITE_URL}/community/${workflowId}`
    : SITE_URL;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      window.gtag?.("event", "workflow_shared", { platform: "copy" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  function handleTwitter() {
    shareWorkflowToTwitter(workflowName);
    window.gtag?.("event", "workflow_shared", { platform: "twitter" });
  }

  function handleLinkedIn() {
    shareWorkflowToLinkedIn(shareUrl);
    window.gtag?.("event", "workflow_shared", { platform: "linkedin" });
  }

  function handleTogglePublic() {
    const newState = !publicState;
    setPublicState(newState);
    onTogglePublic?.(newState);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 440,
              maxWidth: "90vw",
              background: "rgba(12,13,16,0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 24,
              position: "relative",
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "transparent",
                border: "none",
                color: "#7A7A98",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600, color: "#F0F0F5" }}>
              Share &ldquo;{workflowName}&rdquo;
            </h3>

            {/* Public toggle */}
            {onTogglePublic && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Globe size={14} color="#9898B0" />
                  <span style={{ fontSize: 13, color: "#F0F0F5" }}>Make this workflow public</span>
                </div>
                <button
                  onClick={handleTogglePublic}
                  role="switch"
                  aria-checked={publicState}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    border: "none",
                    background: publicState
                      ? "linear-gradient(135deg, #4F46E5, #6366F1)"
                      : "rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: 3,
                      left: publicState ? 21 : 3,
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>
            )}

            {/* Shareable link */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <Link2 size={14} color="#9898B0" />
              <input
                readOnly
                value={shareUrl}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "#9898B0",
                  fontSize: 12,
                  outline: "none",
                  fontFamily: "monospace",
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                  color: copied ? "#10B981" : "#F0F0F5",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Social share buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleTwitter}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#F0F0F5",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <Twitter size={14} />
                Share on X
              </button>
              <button
                onClick={handleLinkedIn}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#F0F0F5",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <Linkedin size={14} />
                LinkedIn
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
