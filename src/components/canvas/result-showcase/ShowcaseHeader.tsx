"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Zap, ArrowLeft } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { COLORS } from "./constants";

interface ShowcaseHeaderProps {
  projectTitle: string;
  totalArtifacts: number;
  successNodes: number;
  totalNodes: number;
  onClose: () => void;
}

export function ShowcaseHeader({
  projectTitle,
  totalArtifacts,
  successNodes,
  totalNodes,
  onClose,
}: ShowcaseHeaderProps) {
  const { t } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        borderBottom: `1px solid ${COLORS.GLASS_BORDER}`,
        background: "rgba(10,12,16,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        flexShrink: 0,
        gap: 16,
      }}
    >
      {/* Left: back + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          }}
        >
          <ArrowLeft size={13} />
          {t('showcase.back')}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <h1 style={{
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.TEXT_PRIMARY,
            margin: 0,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {projectTitle}
          </h1>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 12,
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.15)",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={10} style={{ color: COLORS.EMERALD }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.EMERALD }}>
              {t('showcase.complete')}
            </span>
          </div>
        </div>
      </div>

      {/* Right: stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Zap size={11} style={{ color: COLORS.AMBER }} />
          <span style={{ fontSize: 11, color: COLORS.TEXT_MUTED }}>
            {totalArtifacts} {t('showcase.artifacts')}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <CheckCircle2 size={11} style={{ color: COLORS.EMERALD }} />
          <span style={{ fontSize: 11, color: COLORS.TEXT_MUTED }}>
            {successNodes}/{totalNodes} {t('showcase.nodes')}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
