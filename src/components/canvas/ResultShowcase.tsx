"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown, ChevronUp, Download, FileDown,
  Box, Maximize2, CheckCircle2, Zap, Building2, Ruler,
  Layers, MapPin, Compass, SquareStack, ArrowUpRight,
  Clock, Sparkles, Eye, Grid3x3, TrendingUp,
  Shield, Leaf, Move3d, RotateCcw,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useExecutionStore } from "@/stores/execution-store";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { ExecutionArtifact } from "@/types/execution";

const ArchitecturalViewer = dynamic(
  () => import("./artifacts/architectural-viewer/ArchitecturalViewer"),
  { ssr: false }
);

/* ═══════════════════════════════════════════════════════════════════════════
   MICRO-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function AnimNum({ value, dur = 1400, dec = 0 }: { value: number; dur?: number; dec?: number }) {
  const [d, setD] = useState(0);
  useEffect(() => {
    const s = Date.now();
    const t = setInterval(() => {
      const p = Math.min((Date.now() - s) / dur, 1);
      setD(value * (1 - Math.pow(1 - p, 3)));
      if (p >= 1) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [value, dur]);
  return <>{dec > 0 ? d.toFixed(dec) : Math.round(d).toLocaleString()}</>;
}

// Animated progress ring
function ProgressRing({ value, max, size = 52, color = "#00F5FF" }: {
  value: number; max: number; size?: number; color?: string;
}) {
  const [progress, setProgress] = useState(0);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  useEffect(() => {
    const timer = setTimeout(() => setProgress(Math.min(value / max, 1)), 300);
    return () => clearTimeout(timer);
  }, [value, max]);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.04)" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </svg>
  );
}

// Stagger-in wrapper
const stagger = (delay: number) => ({
  initial: { opacity: 0, y: 18 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
});

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function findArtifactByType(m: Map<string, ExecutionArtifact>, t: string) {
  for (const a of m.values()) if (a.type === t) return a;
  return undefined;
}
function findAllByType(m: Map<string, ExecutionArtifact>, t: string) {
  const r: ExecutionArtifact[] = [];
  for (const a of m.values()) if (a.type === t) r.push(a);
  return r;
}
function fmt(s: string | null) {
  if (!s || s === "none" || s === "generic" || s === "mixed") return null;
  return s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

interface ResultShowcaseProps { onClose: () => void; }

export function ResultShowcase({ onClose }: ResultShowcaseProps) {
  const artifacts = useExecutionStore(s => s.artifacts);
  const nodes = useWorkflowStore(s => s.nodes);
  const currentWorkflow = useWorkflowStore(s => s.currentWorkflow);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  // Parallax
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  // Extract artifacts
  const textArtifact = findArtifactByType(artifacts, "text");
  const imageArtifact = findArtifactByType(artifacts, "image");
  const kpiArtifacts = findAllByType(artifacts, "kpi");
  const svgArtifact = findArtifactByType(artifacts, "svg");
  const threeDArtifact = findArtifactByType(artifacts, "3d");
  const fileArtifacts = findAllByType(artifacts, "file");
  const tableArtifacts = findAllByType(artifacts, "table");

  const description = textArtifact
    ? ((textArtifact.data as Record<string, unknown>)?.content as string) ?? "" : "";
  const descLines = description.split("\n");
  const shortDesc = descLines.slice(0, 4).join("\n");

  const allMetrics: Array<{ label: string; value: string | number; unit?: string }> = [];
  kpiArtifacts.forEach(a => {
    const d = a.data as Record<string, unknown>;
    const metrics = (d?.metrics as Array<{ label: string; value: string | number; unit?: string }>) ?? [];
    allMetrics.push(...metrics);
  });

  const heroUrl = imageArtifact
    ? ((imageArtifact.data as Record<string, unknown>)?.url as string) : undefined;
  const imageStyle = imageArtifact
    ? ((imageArtifact.data as Record<string, unknown>)?.style as string) : undefined;

  const modelData = threeDArtifact || svgArtifact;
  const modelDataObj = modelData ? (modelData.data as Record<string, unknown>) : null;
  const hasModel = !!modelData;

  // Building data extraction
  const bldg = useMemo(() => {
    if (!modelDataObj) return null;
    const floors = (modelDataObj.floors as number) ?? 0;
    const height = (modelDataObj.height as number) ?? 0;
    const footprint = (modelDataObj.footprint as number) ?? 0;
    const gfa = (modelDataObj.gfa as number) ?? floors * footprint;
    const buildingType = (modelDataObj.buildingType as string) ?? "Mixed-Use";
    const style = modelDataObj.style as Record<string, unknown> | undefined;
    if (!floors && !height) return null;

    // Derived engineering metrics
    const floorToFloor = floors > 0 ? height / floors : 3.5;
    const far = footprint > 0 ? gfa / footprint : 0;
    const efficiency = floors > 0 && footprint > 0 ? (gfa / (floors * footprint)) * 100 : 95;
    const approxPerimeter = Math.sqrt(footprint) * 4;
    const wallToFloorRatio = footprint > 0 ? (approxPerimeter * height) / gfa : 0;
    const structuralGrid = Math.sqrt(footprint) > 30 ? "9.0 × 9.0m" : "6.0 × 6.0m";
    const coreArea = gfa * 0.18;
    const netLettable = gfa * (efficiency / 100) * 0.82;

    return {
      floors, height, footprint, gfa, buildingType, floorToFloor, far, efficiency,
      wallToFloorRatio, structuralGrid, coreArea, netLettable, approxPerimeter,
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

  // Build tags
  const tags = useMemo(() => {
    if (!bldg) return [];
    const t: string[] = [];
    if (bldg.buildingType) t.push(bldg.buildingType);
    const env = fmt(bldg.environment); if (env) t.push(env);
    const mat = fmt(bldg.exteriorMaterial); if (mat) t.push(mat);
    const fac = fmt(bldg.facadePattern); if (fac) t.push(fac);
    if (bldg.isModern) t.push("Contemporary");
    if (bldg.glassHeavy) t.push("Glass Facade");
    if (bldg.isTower) t.push("High-Rise");
    return t.slice(0, 6);
  }, [bldg]);

  const downloadFiles = fileArtifacts.map(a => {
    const d = a.data as Record<string, unknown>;
    return { name: (d?.name as string) ?? "file", size: (d?.size as number) ?? 0, type: (d?.type as string) ?? "" };
  });

  const projectTitle = currentWorkflow?.name ?? "Workflow Results";
  const successNodes = nodes.filter(n => n.data.status === "success").length;

  const handleGeneratePDF = useCallback(async () => {
    const { generatePDFReport } = await import("@/services/pdf-report");
    const labels = new Map<string, string>();
    nodes.forEach(n => labels.set(n.id, n.data.label));
    await generatePDFReport({ workflowName: projectTitle, artifacts, nodeLabels: labels });
  }, [artifacts, nodes, projectTitle]);

  /* ─── 3D VIEWER FULLSCREEN ─────────────────────────────────────────────── */
  if (show3DViewer && modelDataObj) {
    const floors = (modelDataObj.floors as number) ?? 5;
    const height = (modelDataObj.height as number) ?? 21;
    const footprint = (modelDataObj.footprint as number) ?? 500;
    const gfa = (modelDataObj.gfa as number) ?? floors * footprint;
    const buildingType = (modelDataObj.buildingType as string) ?? "Mixed-Use";
    const styleData = modelDataObj.style as Record<string, unknown> | undefined;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(4,4,8,0.98)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F5" }}>3D Architectural Walkthrough</span>
          <button onClick={() => setShow3DViewer(false)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#B0B0C5", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#F0F0F5"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#B0B0C5"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            Back to Results
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ArchitecturalViewer floors={floors} height={height} footprint={footprint} gfa={gfa} buildingType={buildingType}
            style={styleData ? {
              glassHeavy: !!styleData.glassHeavy, hasRiver: !!styleData.hasRiver, hasLake: !!styleData.hasLake,
              isModern: !!styleData.isModern, isTower: !!styleData.isTower,
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

  /* ═══════════════════════════════════════════════════════════════════════════
     MAIN RESULTS VIEW
     ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "absolute", inset: 0, background: "#050508", zIndex: 55 }}
    >
      {/* Blueprint grid BG */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `
          linear-gradient(rgba(0,245,255,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.018) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
      }} />

      {/* Scrollable content */}
      <div ref={scrollRef} style={{ position: "relative", zIndex: 1, height: "100%", overflow: "auto" }}>

        {/* ── STICKY TOP BAR ─────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(5,5,8,0.88)", backdropFilter: "blur(24px)",
        }}>
          <button onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#8888A0", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#E0E0F0"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#8888A0"; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            Back to Workflow
          </button>
          {/* Pipeline status pills */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StatusPill icon={<CheckCircle2 size={11} />} text={`${successNodes}/${nodes.length} Nodes`} color="#10B981" />
            <StatusPill icon={<Zap size={11} />} text={`${artifacts.size} Artifacts`} color="#FFBF00" />
            <StatusPill icon={<Clock size={11} />} text={new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} color="#6B7280" />
          </div>
        </div>

        {/* ── HERO SECTION ───────────────────────────────────────────── */}
        {heroUrl ? (
          <div style={{ position: "relative", width: "100%", height: 440, overflow: "hidden" }}>
            {/* Parallax image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroUrl} alt="Architectural concept"
              style={{
                width: "100%", height: "120%", objectFit: "cover", display: "block",
                transform: `translateY(${-scrollY * 0.15}px)`,
                willChange: "transform",
              }} />
            {/* Cinematic overlays */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, #050508 0%, rgba(5,5,8,0.2) 50%, rgba(5,5,8,0.4) 100%)" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(5,5,8,0.5) 0%, transparent 25%, transparent 75%, rgba(5,5,8,0.5) 100%)" }} />
            {/* Scanline texture */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
            }} />

            {/* Title overlay */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "60px 48px 36px" }}>
              <motion.div {...stagger(0.2)}>
                {/* Drawing number */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    padding: "3px 10px", borderRadius: 4,
                    background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
                    backdropFilter: "blur(10px)",
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#10B981", letterSpacing: "0.08em" }}>ANALYSIS COMPLETE</span>
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em" }}>
                    DWG-001 REV.A
                  </span>
                </div>
                <h1 style={{
                  fontSize: 38, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1,
                  margin: 0, letterSpacing: "-0.03em", maxWidth: 680,
                  textShadow: "0 4px 30px rgba(0,0,0,0.5)",
                }}>
                  {projectTitle}
                </h1>
                {imageStyle && (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 10, fontStyle: "italic", margin: "10px 0 0" }}>
                    {imageStyle}
                  </p>
                )}
              </motion.div>
            </div>

            {/* AI badge */}
            <motion.div {...stagger(0.5)} style={{
              position: "absolute", top: 16, right: 20,
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 11px", borderRadius: 5,
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <Sparkles size={9} style={{ color: "#B87333" }} />
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.45)", fontWeight: 700, letterSpacing: "0.1em" }}>AI CONCEPT RENDER</span>
            </motion.div>

            {/* North arrow */}
            <motion.div {...stagger(0.6)} style={{
              position: "absolute", top: 16, left: 20,
              width: 36, height: 36, borderRadius: 18,
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Compass size={16} style={{ color: "rgba(255,255,255,0.4)" }} />
            </motion.div>
          </div>
        ) : (
          /* No hero — simple title */
          <div style={{ padding: "48px 48px 16px", maxWidth: 960, margin: "0 auto" }}>
            <motion.div {...stagger(0.15)}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 4, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", marginBottom: 14 }}>
                <CheckCircle2 size={11} style={{ color: "#10B981" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#10B981", letterSpacing: "0.06em" }}>ANALYSIS COMPLETE</span>
              </div>
              <h1 style={{ fontSize: 34, fontWeight: 800, color: "#F0F0F5", lineHeight: 1.15, margin: 0, letterSpacing: "-0.02em" }}>
                {projectTitle}
              </h1>
            </motion.div>
          </div>
        )}

        {/* ── CONTENT ────────────────────────────────────────────────── */}
        <div style={{ padding: "28px 48px 60px", maxWidth: 960, margin: "0 auto" }}>

          {/* Tags */}
          {tags.length > 0 && (
            <motion.div {...stagger(0.3)} style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 32 }}>
              {tags.map((tag, i) => (
                <span key={i} style={{
                  padding: "4px 12px", borderRadius: 4,
                  background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.1)",
                  fontSize: 10, fontWeight: 600, color: "rgba(0,245,255,0.7)", letterSpacing: "0.03em",
                }}>
                  {tag}
                </span>
              ))}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════
             01  BUILDING DATA SHEET
             ═══════════════════════════════════════════════════════════ */}
          {bldg && bldg.floors > 0 && (
            <>
              <SectionHead num="01" title="Building Data Sheet" delay={0.3} />

              {/* Primary metrics — big cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
                <BigMetric icon={<Layers size={16} />} label="Stories Above Grade" value={bldg.floors} color="#00F5FF" delay={0.35} />
                <BigMetric icon={<Ruler size={16} />} label="Building Height" value={bldg.height} unit="m" color="#B87333" delay={0.4} />
                <BigMetric icon={<Grid3x3 size={16} />} label="Floor Plate" value={bldg.footprint} unit="m²" color="#FFBF00" delay={0.45} />
                <BigMetric icon={<SquareStack size={16} />} label="Gross Floor Area" value={bldg.gfa} unit="m²" color="#4FC3F7" delay={0.5} />
              </div>

              {/* Secondary derived metrics — compact row */}
              <motion.div {...stagger(0.55)} style={{
                display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 1,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 8, overflow: "hidden", marginBottom: 12,
              }}>
                <DerivedMetric label="Floor-to-Floor" value={`${bldg.floorToFloor.toFixed(1)}m`} />
                <DerivedMetric label="Plot Ratio (FAR)" value={bldg.far.toFixed(2)} />
                <DerivedMetric label="Net Lettable" value={`${Math.round(bldg.netLettable).toLocaleString()} m²`} />
                <DerivedMetric label="Core Area" value={`${Math.round(bldg.coreArea).toLocaleString()} m²`} />
                <DerivedMetric label="Struct. Grid" value={bldg.structuralGrid} />
                <DerivedMetric label="Wall:Floor" value={bldg.wallToFloorRatio.toFixed(2)} />
              </motion.div>

              {/* Efficiency + Type info card */}
              <motion.div {...stagger(0.6)} style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 36,
              }}>
                {/* Building identity */}
                <div style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 8, padding: "16px 18px",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12, fontFamily: "'Space Mono', monospace" }}>
                    Classification
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <InfoRow icon={<Building2 size={12} />} label="Type" value={bldg.buildingType} />
                    {bldg.usage && bldg.usage !== "mixed" && (
                      <InfoRow icon={<MapPin size={12} />} label="Programme" value={bldg.usage.charAt(0).toUpperCase() + bldg.usage.slice(1)} />
                    )}
                    {bldg.typology && bldg.typology !== "generic" && (
                      <InfoRow icon={<Building2 size={12} />} label="Typology" value={fmt(bldg.typology) ?? bldg.typology} />
                    )}
                    {bldg.environment && bldg.environment !== "suburban" && (
                      <InfoRow icon={<Leaf size={12} />} label="Context" value={fmt(bldg.environment) ?? bldg.environment} />
                    )}
                    <InfoRow icon={<Shield size={12} />} label="Perimeter" value={`~${Math.round(bldg.approxPerimeter)}m`} />
                  </div>
                </div>

                {/* Efficiency gauge */}
                <div style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 8, padding: "16px 18px",
                  display: "flex", alignItems: "center", gap: 20,
                }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <ProgressRing value={bldg.efficiency} max={100} size={72} color="#10B981" />
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 700, color: "#10B981", fontFamily: "'Space Mono', monospace",
                    }}>
                      {Math.round(bldg.efficiency)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8, fontFamily: "'Space Mono', monospace" }}>
                      Floor Plate Efficiency
                    </div>
                    <div style={{ fontSize: 11, color: "#8888A0", lineHeight: 1.6 }}>
                      Usable area ratio after deducting vertical circulation, MEP shafts, and structural cores.
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      <MiniStat label="GFA" value={`${bldg.gfa.toLocaleString()} m²`} />
                      <MiniStat label="NLA" value={`${Math.round(bldg.netLettable).toLocaleString()} m²`} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
             02  PERFORMANCE METRICS
             ═══════════════════════════════════════════════════════════ */}
          {allMetrics.length > 0 && (
            <>
              <SectionHead num="02" title="Performance Metrics" delay={0.5} />
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(allMetrics.length, 4)}, 1fr)`,
                gap: 10, marginBottom: 36,
              }}>
                {allMetrics.slice(0, 8).map((m, i) => {
                  const nv = typeof m.value === "number" ? m.value : parseFloat(String(m.value));
                  const isNum = !isNaN(nv);
                  const colors = ["#00F5FF", "#B87333", "#FFBF00", "#4FC3F7", "#10B981", "#A78BFA", "#F472B6", "#FB923C"];
                  return (
                    <motion.div key={i} {...stagger(0.55 + i * 0.05)}
                      style={{
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: 8, padding: "18px 14px 14px", textAlign: "center", position: "relative", overflow: "hidden",
                      }}>
                      <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 2, background: `linear-gradient(90deg, transparent, ${colors[i % 8]}30, transparent)` }} />
                      <div style={{ fontSize: 30, fontWeight: 700, color: "#F0F0F5", lineHeight: 1, marginBottom: 6, fontFamily: "'Space Mono', monospace" }}>
                        {isNum ? <AnimNum value={nv} dur={1200 + i * 200} /> : m.value}
                        {m.unit && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginLeft: 3, fontWeight: 500 }}>{m.unit}</span>}
                      </div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>{m.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
             03  PROJECT BRIEF
             ═══════════════════════════════════════════════════════════ */}
          {description && (
            <>
              <SectionHead num={bldg ? "03" : "02"} title="Project Brief" delay={0.6} />
              <motion.div {...stagger(0.65)} style={{
                padding: "20px 24px", marginBottom: 36,
                background: "rgba(255,255,255,0.015)", borderLeft: "3px solid rgba(0,245,255,0.15)",
                borderRadius: "0 8px 8px 0",
              }}>
                <div style={{ fontSize: 13, color: "#8888A0", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {descExpanded ? description : shortDesc}
                </div>
                {descLines.length > 4 && (
                  <button onClick={() => setDescExpanded(e => !e)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#00F5FF", fontSize: 11, fontWeight: 600, cursor: "pointer", marginTop: 10, padding: 0 }}>
                    {descExpanded ? "Collapse" : `Read full brief (+${descLines.length - 4} lines)`}
                    {descExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </motion.div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
             04  COST ESTIMATE
             ═══════════════════════════════════════════════════════════ */}
          {tableArtifacts.length > 0 && (
            <>
              <SectionHead num={nextNum([bldg, allMetrics.length, description])} title="Cost Estimate" delay={0.65} />
              {tableArtifacts.map((ta, idx) => {
                const td = ta.data as Record<string, unknown>;
                const headers = (td?.headers as string[]) ?? [];
                const rows = (td?.rows as (string | number)[][]) ?? [];
                const totalCost = td?._totalCost as number | undefined;
                const summary = td?.summary as { grandTotal?: number; currency?: string; note?: string } | undefined;
                const grandTotal = totalCost ?? summary?.grandTotal;
                const projectType = td?._projectType as string | undefined;

                return (
                  <motion.div key={idx} {...stagger(0.7 + idx * 0.08)} style={{
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 10, overflow: "hidden", marginBottom: 16,
                  }}>
                    {/* Table header */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 18px", background: "rgba(255,255,255,0.015)",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <TrendingUp size={13} style={{ color: "#FFBF00" }} />
                        {projectType && <span style={{ fontSize: 11, fontWeight: 700, color: "#FFBF00" }}>{projectType}</span>}
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{rows.length} items</span>
                      </div>
                      {grandTotal != null && (
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Est. Total</span>
                          <span style={{ fontSize: 20, fontWeight: 700, color: "#FFBF00", fontFamily: "'Space Mono', monospace" }}>
                            ${grandTotal.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ overflow: "auto", maxHeight: 280 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr>
                            {headers.map((h, i) => (
                              <th key={i} style={{
                                padding: "10px 14px", textAlign: i >= 3 ? "right" : "left",
                                fontWeight: 600, color: "rgba(255,255,255,0.35)",
                                borderBottom: "1px solid rgba(255,255,255,0.06)",
                                fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em",
                                position: "sticky", top: 0, background: "rgba(5,5,8,0.97)", zIndex: 1,
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 12).map((row, ri) => (
                            <tr key={ri}
                              style={{ transition: "background 0.1s" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                              {(row as (string | number)[]).map((cell, ci) => (
                                <td key={ci} style={{
                                  padding: "9px 14px", color: "#8888A0",
                                  borderBottom: "1px solid rgba(255,255,255,0.025)",
                                  textAlign: ci >= 3 ? "right" : "left",
                                  fontVariantNumeric: "tabular-nums",
                                }}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rows.length > 12 && (
                      <div style={{ padding: "8px 14px", fontSize: 10, color: "#00F5FF", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                        +{rows.length - 12} more rows
                      </div>
                    )}
                    <div style={{ padding: "8px 18px", fontSize: 9, color: "#3A3A50", borderTop: "1px solid rgba(255,255,255,0.03)", fontStyle: "italic", lineHeight: 1.5 }}>
                      AACE Class 4 estimate (&#xB1;15-20%). Based on regional unit rates. Valid 90 days. Not for contract.
                    </div>
                  </motion.div>
                );
              })}
              <div style={{ height: 16 }} />
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
             ★  3D MODEL — THE CENTERPIECE
             ═══════════════════════════════════════════════════════════ */}
          {hasModel && (
            <motion.div {...stagger(0.75)} style={{ marginBottom: 40 }}>
              {/* Section label */}
              <SectionHead num={nextNum([bldg, allMetrics.length, description, tableArtifacts.length])} title="Interactive 3D Model" delay={0.75} />

              <button onClick={() => setShow3DViewer(true)} style={{
                width: "100%", position: "relative", overflow: "hidden",
                borderRadius: 14,
                background: "linear-gradient(145deg, rgba(0,245,255,0.04) 0%, rgba(5,5,8,1) 40%, rgba(184,115,51,0.04) 100%)",
                border: "1px solid rgba(0,245,255,0.15)",
                cursor: "pointer", transition: "all 0.35s ease",
                padding: 0,
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "rgba(0,245,255,0.35)";
                  e.currentTarget.style.boxShadow = "0 0 60px rgba(0,245,255,0.06), 0 0 120px rgba(0,245,255,0.03)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(0,245,255,0.15)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Animated grid lines inside button */}
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  backgroundImage: `
                    linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: "40px 40px",
                  animation: "gridPulse 4s ease-in-out infinite",
                }} />

                {/* Shimmer sweep */}
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: "linear-gradient(105deg, transparent 35%, rgba(0,245,255,0.04) 50%, transparent 65%)",
                  animation: "shimmer 4s ease-in-out infinite",
                }} />

                {/* Corner accents */}
                <div style={{ position: "absolute", top: 0, left: 0, width: 32, height: 32, borderTop: "2px solid rgba(0,245,255,0.2)", borderLeft: "2px solid rgba(0,245,255,0.2)", borderRadius: "14px 0 0 0" }} />
                <div style={{ position: "absolute", top: 0, right: 0, width: 32, height: 32, borderTop: "2px solid rgba(0,245,255,0.2)", borderRight: "2px solid rgba(0,245,255,0.2)", borderRadius: "0 14px 0 0" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 32, height: 32, borderBottom: "2px solid rgba(0,245,255,0.2)", borderLeft: "2px solid rgba(0,245,255,0.2)", borderRadius: "0 0 0 14px" }} />
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderBottom: "2px solid rgba(0,245,255,0.2)", borderRight: "2px solid rgba(0,245,255,0.2)", borderRadius: "0 0 14px 0" }} />

                <div style={{ position: "relative", padding: "36px 24px 28px" }}>
                  {/* Big icon + title */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    {/* Glowing 3D icon */}
                    <div style={{
                      width: 68, height: 68, borderRadius: 16,
                      background: "rgba(0,245,255,0.06)",
                      border: "1px solid rgba(0,245,255,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 30px rgba(0,245,255,0.08)",
                    }}>
                      <Box size={28} style={{ color: "#00F5FF" }} />
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        fontSize: 20, fontWeight: 700, color: "#00F5FF",
                        letterSpacing: "-0.01em", marginBottom: 6,
                      }}>
                        View 3D Floor Plan
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", maxWidth: 400, lineHeight: 1.5 }}>
                        Explore the full procedural building with interactive walkthrough, day/night lighting, and section analysis
                      </div>
                    </div>

                    {/* Feature pills */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
                      <FeaturePill icon={<Move3d size={10} />} text="Orbit & Walk" />
                      <FeaturePill icon={<Eye size={10} />} text="Section Cuts" />
                      <FeaturePill icon={<Layers size={10} />} text="Exploded View" />
                      <FeaturePill icon={<RotateCcw size={10} />} text="X-Ray Mode" />
                      <FeaturePill icon={<Maximize2 size={10} />} text="Fullscreen" />
                    </div>
                  </div>

                  {/* Enter hint */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    marginTop: 20,
                  }}>
                    <div style={{
                      padding: "6px 18px", borderRadius: 6,
                      background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)",
                      fontSize: 11, fontWeight: 600, color: "#00F5FF",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <ArrowUpRight size={13} />
                      Launch Viewer
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════
             EXPORTS
             ═══════════════════════════════════════════════════════════ */}
          <SectionHead num={nextNum([bldg, allMetrics.length, description, tableArtifacts.length, hasModel])} title="Exports & Deliverables" delay={0.85} />
          <motion.div {...stagger(0.9)} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 40 }}>
            <DlCard icon={<FileDown size={15} />} label="PDF Report" sub="Full project summary" onClick={handleGeneratePDF} />
            {downloadFiles.map((f, i) => (
              <DlCard key={i} icon={<Download size={15} />} label={f.name}
                sub={f.type + (f.size > 0 ? ` · ${(f.size / 1024).toFixed(0)}KB` : "")} />
            ))}
          </motion.div>

          {/* ═══════════════════════════════════════════════════════════
             DRAWING TITLE BLOCK — like an architectural sheet
             ═══════════════════════════════════════════════════════════ */}
          <motion.div {...stagger(1.0)} style={{
            borderTop: "2px solid rgba(255,255,255,0.06)",
            paddingTop: 16,
            display: "grid", gridTemplateColumns: "1fr auto", gap: 20,
          }}>
            <div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
                Project
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>
                {projectTitle}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 4 }}>
                Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {artifacts.size} artifacts · {successNodes}/{nodes.length} pipeline stages
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
                Platform
              </div>
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 700,
                letterSpacing: "0.08em", fontFamily: "'Space Mono', monospace",
              }}>
                BUILDFLOW
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.1)", marginTop: 3 }}>
                DWG-001 · REV.A · Scale NTS
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-120%); }
          50% { transform: translateX(120%); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function nextNum(items: unknown[]): string {
  let n = 1;
  for (const item of items) {
    if (item && (typeof item !== "number" || item > 0) && (typeof item !== "boolean" || item)) n++;
  }
  return String(n).padStart(2, "0");
}

function StatusPill({ icon, text, color }: { icon: React.ReactNode; text: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ color, display: "flex" }}>{icon}</div>
      <span style={{ fontSize: 10, color, fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>{text}</span>
    </div>
  );
}

function SectionHead({ num, title, delay }: { num: string; title: string; delay: number }) {
  return (
    <motion.div {...stagger(delay)} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, marginTop: 4 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 5,
        background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color: "#00F5FF", fontFamily: "'Space Mono', monospace",
      }}>{num}</div>
      <span style={{
        fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)",
        textTransform: "uppercase", letterSpacing: "0.14em",
        fontFamily: "'Space Mono', monospace",
      }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(0,245,255,0.1), transparent)" }} />
    </motion.div>
  );
}

function BigMetric({ icon, label, value, unit, color, delay }: {
  icon: React.ReactNode; label: string; value: number; unit?: string; color: string; delay: number;
}) {
  return (
    <motion.div {...stagger(delay)} style={{
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 10, padding: "16px 14px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 50, height: 50, background: `radial-gradient(circle at top right, ${color}06, transparent)` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ color: `${color}66`, display: "flex" }}>{icon}</div>
        <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "'Space Mono', monospace" }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#F0F0F5", lineHeight: 1, fontFamily: "'Space Mono', monospace" }}>
        <AnimNum value={value} dur={1400 + delay * 600} />
        {unit && <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>{unit}</span>}
      </div>
    </motion.div>
  );
}

function DerivedMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "10px 12px", textAlign: "center",
      borderRight: "1px solid rgba(255,255,255,0.03)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#B0B0C5", fontFamily: "'Space Mono', monospace", marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'Space Mono', monospace" }}>{label}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ color: "rgba(255,255,255,0.2)", display: "flex" }}>{icon}</div>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", width: 75 }}>{label}</span>
      <span style={{ fontSize: 11, color: "#B0B0C5", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontSize: 11, color: "#B0B0C5", fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>{value}</div>
    </div>
  );
}

function FeaturePill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 4,
      background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.08)",
      fontSize: 10, color: "rgba(0,245,255,0.5)", fontWeight: 500,
    }}>
      {icon}{text}
    </div>
  );
}

function DlCard({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 18px", borderRadius: 10,
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
      cursor: "pointer", transition: "all 0.2s ease", textAlign: "left",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(0,245,255,0.15)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{
        width: 32, height: 32, borderRadius: 7,
        background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#00F5FF", flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#C0C0D0" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{sub}</div>}
      </div>
      <ArrowUpRight size={12} style={{ color: "rgba(255,255,255,0.1)", marginLeft: "auto" }} />
    </button>
  );
}
