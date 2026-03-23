"use client";

import { useState } from "react";
import { AlertTriangle, Crown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExportWatermarkNoticeProps {
  userTier: string;
  onProceed: () => void;
  onUpgrade: () => void;
  onClose: () => void;
}

export function ExportWatermarkNotice({
  userTier,
  onProceed,
  onUpgrade,
  onClose,
}: ExportWatermarkNoticeProps) {
  const showWatermark = userTier === "FREE" || userTier === "MINI";
  const [visible] = useState(true);

  if (!showWatermark) {
    // No watermark — proceed directly
    onProceed();
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
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
              width: 420,
              maxWidth: "90vw",
              background: "rgba(12,13,16,0.98)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 24,
              position: "relative",
            }}
          >
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

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(245,158,11,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={18} color="#F59E0B" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#F0F0F5" }}>
                  Export includes BuildFlow branding
                </h3>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "#9898B0", lineHeight: 1.6, margin: "0 0 16px" }}>
              Free exports include a small &quot;Built with BuildFlow&quot; footer on each page.
              Upgrade to Starter or Pro to remove branding from your exports.
            </p>

            {/* Watermark preview */}
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "#82879A", fontStyle: "italic" }}>
                Preview: &quot;Built with BuildFlow &middot; trybuildflow.in&quot;
              </span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.gtag?.("event", "export_with_watermark");
                  }
                  onProceed();
                }}
                style={{
                  flex: 1,
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
                Export with branding
              </button>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.gtag?.("event", "watermark_upgrade_clicked");
                  }
                  onUpgrade();
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #4F46E5, #6366F1)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Crown size={14} />
                Upgrade to remove
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
