"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown, ChevronUp, Download, FileDown,
  Box, Maximize2, CheckCircle2, Zap, Building2, Ruler,
  Layers, MapPin, Compass, SquareStack, ArrowUpRight,
  Clock, Sparkles, Eye,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useExecutionStore } from "@/stores/execution-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { ExecutionArtifact } from "@/types/execution";

const ArchitecturalViewer = dynamic(
  () => import("./artifacts/architectural-viewer/ArchitecturalViewer"),
  { ssr: false }
);

// ─── Animated Number ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 1500, decimals = 0 }: { value: number; duration?: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  if (decimals > 0) return <span>{display.toFixed(decimals)}</span>;
  return <span>{Math.round(display).toLocaleString()}</span>;
}

// ─── Animated line drawing (blueprint feel) ─────────────────────────────────

function BlueprintLine({ delay = 0, width = "100%" }: { delay?: number; width?: string }) {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{
        height: 1,
        width,
        background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.15), rgba(0,245,255,0.06), transparent)",
        transformOrigin: "left",
      }}
    />
  );
}

// ─── Section header with AEC drawing-style label ────────────────────────────

function SectionHeader({ number, title, delay = 0 }: { number: string; title: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 16, marginTop: 8,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: "rgba(0,245,255,0.08)",
        border: "1px solid rgba(0,245,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: "#00F5FF",
        fontFamily: "'Space Mono', monospace",
      }}>
        {number}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase", letterSpacing: "0.12em",
        fontFamily: "'Space Mono', monospace",
      }}>
        {title}
      </span>
      <div style={{
        flex: 1, height: 1,
        background: "linear-gradient(90deg, rgba(0,245,255,0.12), transparent)",
      }} />
    </motion.div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findArtifactByType(artifacts: Map<string, ExecutionArtifact>, type: string): ExecutionArtifact | undefined {
  for (const a of artifacts.values()) {
    if (a.type === type) return a;
  }
  return undefined;
}

function findAllArtifactsByType(artifacts: Map<string, ExecutionArtifact>, type: string): ExecutionArtifact[] {
  const result: ExecutionArtifact[] = [];
  for (const a of artifacts.values()) {
    if (a.type === type) result.push(a);
  }
  return result;
}

// ─── Spec card for building data ────────────────────────────────────────────

function SpecCard({ icon, label, value, unit, delay, color = "#00F5FF" }: {
  icon: React.ReactNode; label: string; value: string | number; unit?: string; delay: number; color?: string;
}) {
  const numericValue = typeof value === "number" ? value : parseFloat(String(value));
  const isNumeric = !isNaN(numericValue) && typeof value === "number";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "16px 14px 14px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle corner accent */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 40, height: 40,
        background: `linear-gradient(135deg, transparent 50%, ${color}08 100%)`,
        borderRadius: "0 10px 0 0",
      }} />
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginBottom: 10,
      }}>
        <div style={{ color: `${color}88`, display: "flex" }}>{icon}</div>
        <span style={{
          fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase", letterSpacing: "0.1em",
          fontFamily: "'Space Mono', monospace",
        }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: 26, fontWeight: 700, color: "#F0F0F5",
        lineHeight: 1, fontFamily: "'Space Mono', monospace",
      }}>
        {isNumeric ? <AnimatedNumber value={numericValue} duration={1400 + delay * 400} /> : value}
        {unit && (
          <span style={{
            fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.3)",
            marginLeft: 4,
          }}>
            {unit}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ResultShowcaseProps {
  onClose: () => void;
}

export function ResultShowcase({ onClose }: ResultShowcaseProps) {
  const artifacts = useExecutionStore(s => s.artifacts);
  const nodes = useWorkflowStore(s => s.nodes);
  const currentWorkflow = useWorkflowStore(s => s.currentWorkflow);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

  // Extract data from artifacts
  const textArtifact = findArtifactByType(artifacts, "text");
  const imageArtifact = findArtifactByType(artifacts, "image");
  const kpiArtifacts = findAllArtifactsByType(artifacts, "kpi");
  const svgArtifact = findArtifactByType(artifacts, "svg");
  const threeDArtifact = findArtifactByType(artifacts, "3d");
  const fileArtifacts = findAllArtifactsByType(artifacts, "file");
  const tableArtifacts = findAllArtifactsByType(artifacts, "table");

  // Get description text
  const description = textArtifact
    ? ((textArtifact.data as Record<string, unknown>)?.content as string) ?? ""
    : "";
  const descLines = description.split("\n");
  const shortDesc = descLines.slice(0, 4).join("\n");

  // Collect all KPI metrics
  const allMetrics: Array<{ label: string; value: string | number; unit?: string }> = [];
  kpiArtifacts.forEach(a => {
    const d = a.data as Record<string, unknown>;
    const metrics = (d?.metrics as Array<{ label: string; value: string | number; unit?: string }>) ?? [];
    allMetrics.push(...metrics);
  });

  // Get hero image
  const heroUrl = imageArtifact
    ? ((imageArtifact.data as Record<string, unknown>)?.url as string)
    : undefined;
  const imageStyle = imageArtifact
    ? ((imageArtifact.data as Record<string, unknown>)?.style as string)
    : undefined;

  // 3D model data
  const modelData = threeDArtifact || svgArtifact;
  const modelDataObj = modelData ? (modelData.data as Record<string, unknown>) : null;
  const hasModel = !!modelData;

  // Extract building specs from 3D data
  const buildingSpecs = useMemo(() => {
    if (!modelDataObj) return null;
    const floors = modelDataObj.floors as number | undefined;
    const height = modelDataObj.height as number | undefined;
    const footprint = modelDataObj.footprint as number | undefined;
    const gfa = modelDataObj.gfa as number | undefined;
    const buildingType = modelDataObj.buildingType as string | undefined;
    const style = modelDataObj.style as Record<string, unknown> | undefined;
    if (!floors && !height) return null;
    return {
      floors: floors ?? 0,
      height: height ?? 0,
      footprint: footprint ?? 0,
      gfa: gfa ?? (floors ?? 0) * (footprint ?? 0),
      buildingType: buildingType ?? "Mixed-Use",
      environment: (style?.environment as string) ?? null,
      usage: (style?.usage as string) ?? null,
      exteriorMaterial: (style?.exteriorMaterial as string) ?? null,
      typology: (style?.typology as string) ?? null,
      facadePattern: (style?.facadePattern as string) ?? null,
      isTower: !!style?.isTower,
      isModern: !!style?.isModern,
      glassHeavy: !!style?.glassHeavy,
    };
  }, [modelDataObj]);

  // File downloads
  const downloadFiles = fileArtifacts.map(a => {
    const d = a.data as Record<string, unknown>;
    return {
      name: (d?.name as string) ?? "file",
      size: (d?.size as number) ?? 0,
      type: (d?.type as string) ?? "",
    };
  });

  // Project title from workflow name
  const projectTitle = currentWorkflow?.name ?? "Workflow Results";
  const successNodes = nodes.filter(n => n.data.status === "success").length;
  const totalNodes = nodes.length;

  const handleGeneratePDF = useCallback(async () => {
    const { generatePDFReport } = await import("@/services/pdf-report");
    const labels = new Map<string, string>();
    nodes.forEach(n => labels.set(n.id, n.data.label));
    await generatePDFReport({
      workflowName: projectTitle,
      artifacts,
      nodeLabels: labels,
    });
  }, [artifacts, nodes, projectTitle]);

  // Format material/typology for display
  const formatLabel = (s: string | null) => {
    if (!s || s === "none" || s === "generic" || s === "mixed") return null;
    return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  // Compute building tags from style data
  const buildingTags = useMemo(() => {
    if (!buildingSpecs) return [];
    const tags: string[] = [];
    if (buildingSpecs.buildingType) tags.push(buildingSpecs.buildingType);
    const env = formatLabel(buildingSpecs.environment);
    if (env) tags.push(env);
    const mat = formatLabel(buildingSpecs.exteriorMaterial);
    if (mat) tags.push(mat);
    const facade = formatLabel(buildingSpecs.facadePattern);
    if (facade) tags.push(facade);
    if (buildingSpecs.isModern) tags.push("Modern");
    if (buildingSpecs.glassHeavy) tags.push("Glass Facade");
    if (buildingSpecs.isTower) tags.push("Tower");
    return tags.slice(0, 5);
  }, [buildingSpecs]);

  // ─── 3D Viewer fullscreen mode ──────────────────────────────────────────
  if (show3DViewer && modelDataObj) {
    const floors = (modelDataObj.floors as number) ?? 5;
    const height = (modelDataObj.height as number) ?? 21;
    const footprint = (modelDataObj.footprint as number) ?? 500;
    const gfa = (modelDataObj.gfa as number) ?? floors * footprint;
    const buildingType = (modelDataObj.buildingType as string) ?? "Mixed-Use";
    const styleData = modelDataObj.style as Record<string, unknown> | undefined;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "absolute", inset: 0, zIndex: 60,
          background: "rgba(4,4,8,0.98)",
          display: "flex", flexDirection: "column",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F5" }}>
            3D Architectural Walkthrough
          </span>
          <button
            onClick={() => setShow3DViewer(false)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 18px", borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#B0B0C5", fontSize: 13, fontWeight: 500,
              cursor: "pointer", transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#F0F0F5"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#B0B0C5"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            Back to Results
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ArchitecturalViewer
            floors={floors}
            height={height}
            footprint={footprint}
            gfa={gfa}
            buildingType={buildingType}
            style={styleData ? {
              glassHeavy: !!styleData.glassHeavy,
              hasRiver: !!styleData.hasRiver,
              hasLake: !!styleData.hasLake,
              isModern: !!styleData.isModern,
              isTower: !!styleData.isTower,
              exteriorMaterial: (styleData.exteriorMaterial as string) ?? "mixed",
              environment: (styleData.environment as string) ?? "suburban",
              usage: (styleData.usage as string) ?? "mixed",
              promptText: (styleData.promptText as string) ?? "",
              typology: (styleData.typology as string) ?? "generic",
              facadePattern: (styleData.facadePattern as string) ?? "none",
              floorHeightOverride: styleData.floorHeightOverride ? Number(styleData.floorHeightOverride) : undefined,
              maxFloorCap: Number(styleData.maxFloorCap ?? 30),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any : undefined}
          />
        </div>
      </motion.div>
    );
  }

  // ─── Main results view ──────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "absolute",
        inset: 0,
        background: "#060609",
        overflow: "auto",
        zIndex: 55,
      }}
    >
      {/* Blueprint grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        opacity: 0.6,
      }} />

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(6,6,9,0.92)",
        backdropFilter: "blur(20px)",
      }}>
        <button
          onClick={onClose}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#B0B0C5", fontSize: 13, fontWeight: 500,
            cursor: "pointer", transition: "all 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#F0F0F5"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#B0B0C5"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          Back to Workflow
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CheckCircle2 size={12} style={{ color: "#10B981" }} />
            <span style={{ fontSize: 11, color: "#10B981", fontWeight: 600 }}>{successNodes}/{totalNodes} nodes</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Zap size={12} style={{ color: "#FFBF00" }} />
            <span style={{ fontSize: 11, color: "#FFBF00", fontWeight: 600 }}>{artifacts.size} artifacts</span>
          </div>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ════════════════════════════════════════════════════════════════
            HERO SECTION — Full-width image with gradient overlay
           ════════════════════════════════════════════════════════════════ */}
        {heroUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            style={{
              position: "relative",
              width: "100%",
              height: 380,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroUrl}
              alt="Architectural concept render"
              onLoad={() => setHeroLoaded(true)}
              style={{
                width: "100%", height: "100%",
                objectFit: "cover", display: "block",
                filter: heroLoaded ? "none" : "blur(20px)",
                transition: "filter 0.5s ease",
              }}
            />
            {/* Gradient overlays */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(0deg, #060609 0%, rgba(6,6,9,0.4) 40%, rgba(6,6,9,0.1) 70%, rgba(6,6,9,0.3) 100%)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, rgba(6,6,9,0.6) 0%, transparent 30%, transparent 70%, rgba(6,6,9,0.6) 100%)",
            }} />

            {/* Title overlay on hero */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "40px 48px 32px",
            }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                {/* Status badge */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 14px", borderRadius: 20,
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  marginBottom: 14,
                  backdropFilter: "blur(10px)",
                }}>
                  <CheckCircle2 size={12} style={{ color: "#10B981" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#10B981" }}>
                    Analysis Complete
                  </span>
                </div>

                <h1 style={{
                  fontSize: 34, fontWeight: 700, color: "#FFFFFF",
                  lineHeight: 1.15, margin: 0, letterSpacing: "-0.02em",
                  textShadow: "0 2px 20px rgba(0,0,0,0.5)",
                  maxWidth: 700,
                }}>
                  {projectTitle}
                </h1>

                {imageStyle && (
                  <div style={{
                    fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 8,
                    fontStyle: "italic",
                  }}>
                    {imageStyle}
                  </div>
                )}
              </motion.div>
            </div>

            {/* AI Generated badge on image */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              style={{
                position: "absolute", top: 16, right: 20,
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 6,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Sparkles size={10} style={{ color: "#B87333" }} />
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.05em" }}>
                AI CONCEPT
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* No hero image — show title without image */}
        {!heroUrl && (
          <div style={{ padding: "48px 48px 0", maxWidth: 960, margin: "0 auto" }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 14px", borderRadius: 20,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.2)",
                marginBottom: 14,
              }}>
                <CheckCircle2 size={12} style={{ color: "#10B981" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#10B981" }}>
                  Analysis Complete
                </span>
              </div>
              <h1 style={{
                fontSize: 34, fontWeight: 700, color: "#F0F0F5",
                lineHeight: 1.15, margin: 0, letterSpacing: "-0.02em",
              }}>
                {projectTitle}
              </h1>
            </motion.div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            CONTENT AREA
           ════════════════════════════════════════════════════════════════ */}
        <div style={{ padding: "32px 48px 48px", maxWidth: 960, margin: "0 auto" }}>

          {/* Building type tags */}
          {buildingTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}
            >
              {buildingTags.map((tag, i) => (
                <span key={i} style={{
                  padding: "4px 12px", borderRadius: 4,
                  background: "rgba(0,245,255,0.06)",
                  border: "1px solid rgba(0,245,255,0.12)",
                  fontSize: 11, fontWeight: 500, color: "#00F5FF",
                  letterSpacing: "0.02em",
                }}>
                  {tag}
                </span>
              ))}
            </motion.div>
          )}

          {/* ─── 01 BUILDING SPECIFICATIONS ──────────────────────────── */}
          {buildingSpecs && buildingSpecs.floors > 0 && (
            <>
              <SectionHeader number="01" title="Building Specifications" delay={0.3} />
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
                marginBottom: 32,
              }}>
                <SpecCard
                  icon={<Layers size={14} />}
                  label="Stories"
                  value={buildingSpecs.floors}
                  delay={0.35}
                  color="#00F5FF"
                />
                <SpecCard
                  icon={<Ruler size={14} />}
                  label="Height"
                  value={buildingSpecs.height}
                  unit="m"
                  delay={0.4}
                  color="#B87333"
                />
                <SpecCard
                  icon={<Compass size={14} />}
                  label="Footprint"
                  value={buildingSpecs.footprint}
                  unit="m²"
                  delay={0.45}
                  color="#FFBF00"
                />
                <SpecCard
                  icon={<SquareStack size={14} />}
                  label="Gross Floor Area"
                  value={buildingSpecs.gfa}
                  unit="m²"
                  delay={0.5}
                  color="#4FC3F7"
                />
              </div>

              {/* Building quick facts row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                style={{
                  display: "flex", gap: 20, flexWrap: "wrap",
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  marginBottom: 32,
                }}
              >
                <QuickFact icon={<Building2 size={12} />} label="Type" value={buildingSpecs.buildingType} />
                {buildingSpecs.usage && buildingSpecs.usage !== "mixed" && (
                  <QuickFact icon={<MapPin size={12} />} label="Usage" value={buildingSpecs.usage.charAt(0).toUpperCase() + buildingSpecs.usage.slice(1)} />
                )}
                <QuickFact icon={<Ruler size={12} />} label="Floor-to-Floor" value={`${(buildingSpecs.height / buildingSpecs.floors).toFixed(1)}m`} />
                <QuickFact icon={<SquareStack size={12} />} label="Plot Ratio" value={`${(buildingSpecs.gfa / buildingSpecs.footprint).toFixed(2)} FAR`} />
                <QuickFact icon={<Layers size={12} />} label="Efficiency" value={`${Math.round((buildingSpecs.gfa / (buildingSpecs.floors * buildingSpecs.footprint)) * 100)}%`} />
              </motion.div>
            </>
          )}

          {/* ─── 02 PERFORMANCE METRICS ──────────────────────────────── */}
          {allMetrics.length > 0 && (
            <>
              <SectionHeader number="02" title="Performance Metrics" delay={0.45} />
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(allMetrics.length, 4)}, 1fr)`,
                gap: 10,
                marginBottom: 32,
              }}>
                {allMetrics.slice(0, 8).map((m, i) => {
                  const numericValue = typeof m.value === "number" ? m.value : parseFloat(String(m.value));
                  const isNumeric = !isNaN(numericValue);
                  const colors = ["#00F5FF", "#B87333", "#FFBF00", "#4FC3F7", "#10B981", "#A78BFA", "#F472B6", "#FB923C"];
                  const color = colors[i % colors.length];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 10,
                        padding: "18px 14px 14px",
                        textAlign: "center",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Top accent line */}
                      <div style={{
                        position: "absolute", top: 0, left: "20%", right: "20%",
                        height: 2,
                        background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
                        borderRadius: "0 0 2px 2px",
                      }} />
                      <div style={{
                        fontSize: 28, fontWeight: 700, color: "#F0F0F5",
                        lineHeight: 1.1, marginBottom: 6,
                        fontFamily: "'Space Mono', monospace",
                      }}>
                        {isNumeric ? <AnimatedNumber value={numericValue} duration={1200 + i * 200} /> : m.value}
                        {m.unit && (
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginLeft: 3, fontWeight: 500 }}>{m.unit}</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
                        letterSpacing: "0.08em", fontWeight: 600,
                        fontFamily: "'Space Mono', monospace",
                      }}>
                        {m.label}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {/* ─── 03 PROJECT BRIEF ────────────────────────────────────── */}
          {description && (
            <>
              <SectionHeader number={allMetrics.length > 0 ? "03" : "02"} title="Project Brief" delay={0.55} />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{
                  padding: "20px 24px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderLeft: "3px solid rgba(0,245,255,0.2)",
                  borderRadius: "0 8px 8px 0",
                  marginBottom: 32,
                }}
              >
                <div style={{
                  fontSize: 13, color: "#9898B0", lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                }}>
                  {descExpanded ? description : shortDesc}
                </div>
                {descLines.length > 4 && (
                  <button
                    onClick={() => setDescExpanded(e => !e)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: "none", border: "none",
                      color: "#00F5FF", fontSize: 12, fontWeight: 500,
                      cursor: "pointer", marginTop: 10, padding: 0,
                    }}
                  >
                    {descExpanded ? "Show less" : `Read more (+${descLines.length - 4} lines)`}
                    {descExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </motion.div>
            </>
          )}

          {/* ─── 04 COST ANALYSIS / TABLES ───────────────────────────── */}
          {tableArtifacts.length > 0 && (
            <>
              <SectionHeader
                number={buildingSpecs ? (allMetrics.length > 0 ? "04" : "03") : "02"}
                title="Cost Analysis"
                delay={0.6}
              />
              {tableArtifacts.map((ta, idx) => {
                const td = ta.data as Record<string, unknown>;
                const headers = (td?.headers as string[]) ?? [];
                const rows = (td?.rows as (string | number)[][]) ?? [];
                const totalCost = td?._totalCost as number | undefined;
                const summary = td?.summary as { grandTotal?: number; currency?: string; note?: string } | undefined;
                const grandTotal = totalCost ?? summary?.grandTotal;
                const projectType = td?._projectType as string | undefined;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 + idx * 0.1 }}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 10,
                      overflow: "hidden",
                      marginBottom: 16,
                    }}
                  >
                    {/* Table header bar */}
                    {(projectType || grandTotal != null) && (
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        background: "rgba(255,255,255,0.01)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {projectType && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, color: "#FFBF00",
                              textTransform: "uppercase", letterSpacing: "0.05em",
                            }}>
                              {projectType}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                            {rows.length} line items
                          </span>
                        </div>
                        {grandTotal != null && (
                          <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                          }}>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Total
                            </span>
                            <span style={{
                              fontSize: 16, fontWeight: 700, color: "#FFBF00",
                              fontFamily: "'Space Mono', monospace",
                            }}>
                              ${grandTotal.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ overflow: "auto", maxHeight: 260 }}>
                      <table style={{
                        width: "100%", borderCollapse: "collapse",
                        fontSize: 11, color: "#9898B0",
                      }}>
                        <thead>
                          <tr>
                            {headers.map((h, i) => (
                              <th key={i} style={{
                                padding: "10px 14px", textAlign: i >= 3 ? "right" : "left",
                                fontWeight: 600, color: "rgba(255,255,255,0.45)",
                                borderBottom: "1px solid rgba(255,255,255,0.06)",
                                fontSize: 10, textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                position: "sticky", top: 0, zIndex: 1,
                                background: "rgba(6,6,9,0.95)",
                              }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 10).map((row, ri) => (
                            <tr key={ri} style={{ transition: "background 0.1s ease" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                            >
                              {(row as (string | number)[]).map((cell, ci) => (
                                <td key={ci} style={{
                                  padding: "9px 14px",
                                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                                  textAlign: ci >= 3 ? "right" : "left",
                                  fontVariantNumeric: "tabular-nums",
                                }}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rows.length > 10 && (
                      <div style={{
                        padding: "8px 14px", fontSize: 10, color: "#00F5FF",
                        borderTop: "1px solid rgba(255,255,255,0.04)",
                      }}>
                        +{rows.length - 10} more rows
                      </div>
                    )}
                    <div style={{
                      padding: "8px 14px", fontSize: 9, color: "#4A4A62",
                      borderTop: "1px solid rgba(255,255,255,0.03)", fontStyle: "italic",
                    }}>
                      Preliminary estimate (&#xB1;15-20% accuracy). Not for contract pricing.
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}

          <BlueprintLine delay={0.7} />

          {/* ─── 3D MODEL BUTTON ─────────────────────────────────────── */}
          {hasModel && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.6 }}
              style={{ marginTop: 32, marginBottom: 32 }}
            >
              <button
                onClick={() => setShow3DViewer(true)}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
                  padding: "22px 20px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, rgba(0,245,255,0.06) 0%, rgba(184,115,51,0.06) 50%, rgba(0,245,255,0.06) 100%)",
                  border: "1px solid rgba(0,245,255,0.2)",
                  color: "#00F5FF",
                  fontSize: 16, fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,245,255,0.12) 0%, rgba(184,115,51,0.12) 50%, rgba(0,245,255,0.12) 100%)";
                  e.currentTarget.style.borderColor = "rgba(0,245,255,0.4)";
                  e.currentTarget.style.boxShadow = "0 0 40px rgba(0,245,255,0.08), inset 0 0 40px rgba(0,245,255,0.03)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,245,255,0.06) 0%, rgba(184,115,51,0.06) 50%, rgba(0,245,255,0.06) 100%)";
                  e.currentTarget.style.borderColor = "rgba(0,245,255,0.2)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Animated shimmer */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(105deg, transparent 40%, rgba(0,245,255,0.05) 50%, transparent 60%)",
                  animation: "shimmer 3s ease-in-out infinite",
                }} />
                <Box size={20} />
                <span style={{ position: "relative" }}>View 3D Floor Plan</span>
                <Maximize2 size={15} style={{ opacity: 0.5, position: "relative" }} />
              </button>
              <div style={{
                display: "flex", justifyContent: "center", gap: 20, marginTop: 10,
              }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Eye size={10} /> Interactive 3D walkthrough
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Compass size={10} /> Orbit & first-person
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Layers size={10} /> Exploded view & sections
                </span>
              </div>
            </motion.div>
          )}

          <BlueprintLine delay={0.85} />

          {/* ─── DOWNLOADS & EXPORTS ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            style={{ marginTop: 32, marginBottom: 20 }}
          >
            <SectionHeader
              number={(() => {
                let n = 2;
                if (buildingSpecs && buildingSpecs.floors > 0) n++;
                if (allMetrics.length > 0) n++;
                if (description) n++;
                if (tableArtifacts.length > 0) n++;
                return String(n).padStart(2, "0");
              })()}
              title="Exports & Downloads"
              delay={0.9}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <DownloadButton
                icon={<FileDown size={15} />}
                label="PDF Report"
                sublabel="Full project summary"
                onClick={handleGeneratePDF}
              />
              {downloadFiles.map((f, i) => (
                <DownloadButton
                  key={i}
                  icon={<Download size={15} />}
                  label={f.name}
                  sublabel={f.type + (f.size > 0 ? ` · ${(f.size / 1024).toFixed(0)}KB` : "")}
                />
              ))}
            </div>
          </motion.div>

          {/* ─── FOOTER ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            style={{
              marginTop: 40, paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              paddingBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={11} style={{ color: "rgba(255,255,255,0.2)" }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                Generated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <div style={{
              fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em",
              fontFamily: "'Space Mono', monospace",
              textTransform: "uppercase",
            }}>
              BuildFlow AEC Platform
            </div>
          </motion.div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </motion.div>
  );
}

// ─── Quick Fact Pill ──────────────────────────────────────────────────────────

function QuickFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ color: "rgba(255,255,255,0.25)", display: "flex" }}>{icon}</div>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{label}</span>
      <span style={{ fontSize: 11, color: "#B0B0C5", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─── Download Button ──────────────────────────────────────────────────────────

function DownloadButton({ icon, label, sublabel, onClick }: {
  icon: React.ReactNode; label: string; sublabel?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 20px", borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer", transition: "all 0.2s ease",
        textAlign: "left",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.borderColor = "rgba(0,245,255,0.2)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: "rgba(0,245,255,0.06)",
        border: "1px solid rgba(0,245,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#00F5FF", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#D0D0E0" }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
            {sublabel}
          </div>
        )}
      </div>
      <ArrowUpRight size={13} style={{ color: "rgba(255,255,255,0.15)", marginLeft: "auto" }} />
    </button>
  );
}
