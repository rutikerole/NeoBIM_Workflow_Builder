"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Download, ChevronDown, X, FileText, Image as ImageIcon, Database, BarChart2, Table2, File, LayoutGrid, Box } from "lucide-react";
import DOMPurify from "dompurify";
import dynamic from "next/dynamic";

const MassingViewer = dynamic(() => import("./MassingViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] bg-[#0D0D1A] rounded-lg flex items-center justify-center">
      <span className="text-[11px] text-[#3A3A50]">Loading 3D viewer…</span>
    </div>
  ),
});

import { cn, formatBytes } from "@/lib/utils";
import type {
  ExecutionArtifact,
  ArtifactType,
  TextArtifactData,
  ImageArtifactData,
  KpiArtifactData,
  TableArtifactData,
  FileArtifactData,
  JsonArtifactData,
} from "@/types/execution";
import type { NodeCategory } from "@/types/nodes";

// ─── Category → color ────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<NodeCategory, string> = {
  input:     "#3B82F6",
  transform: "#8B5CF6",
  generate:  "#10B981",
  export:    "#F59E0B",
};

const TYPE_COLOR: Record<ArtifactType, string> = {
  text:  "#4F8AFF",
  json:  "#10B981",
  image: "#8B5CF6",
  kpi:   "#F59E0B",
  table: "#06B6D4",
  file:  "#F59E0B",
  "3d":  "#F59E0B",
  svg:   "#10B981",
};

const TYPE_ICON: Record<ArtifactType, React.ReactNode> = {
  text:  <FileText size={9} />,
  json:  <Database size={9} />,
  image: <ImageIcon size={9} />,
  kpi:   <BarChart2 size={9} />,
  table: <Table2 size={9} />,
  file:  <File size={9} />,
  "3d":  <Box size={9} />,
  svg:   <LayoutGrid size={9} />,
};

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "79, 138, 255";
  return `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ArtifactCardProps {
  artifact: ExecutionArtifact;
  nodeLabel?: string;
  nodeCategory?: NodeCategory;
  onDismiss?: () => void;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function ArtifactCard({ artifact, nodeLabel, nodeCategory, onDismiss }: ArtifactCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const prefersReduced = useReducedMotion();

  const accentColor = nodeCategory ? CATEGORY_COLOR[nodeCategory] : "#4F8AFF";
  const typeColor   = TYPE_COLOR[artifact.type] ?? "#4F8AFF";
  const rgb         = hexToRgb(accentColor);

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: prefersReduced ? 0 : 0.15 } }}
      transition={{ type: "spring", stiffness: 380, damping: 32, duration: prefersReduced ? 0 : undefined }}
      className={cn(
        "border-b border-b-white/[0.06] border-l-[3px]",
        "bg-[#0c0c18]/95 backdrop-blur-[32px] backdrop-saturate-[1.3]",
        "overflow-hidden",
        "shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]",
        !prefersReduced && "animate-slide-up",
      )}
      style={{
        '--accent-color': accentColor,
        '--type-color': typeColor,
        '--accent-rgb': rgb,
        borderLeftColor: accentColor,
      } as React.CSSProperties}
    >
      {/* Header */}
      <div
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-[7px] px-4 py-2.5 cursor-pointer select-none"
      >
        {/* Node name */}
        <span className="text-[11px] font-semibold text-[#E0E0EA] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {nodeLabel ?? "Node Output"}
        </span>

        {/* Type badge */}
        <span
          className="flex items-center gap-[3px] px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.05em] shrink-0"
          style={{ background: `${typeColor}15`, color: typeColor }}
        >
          {TYPE_ICON[artifact.type]}
          {artifact.type}
        </span>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-[#3A3A50] flex shrink-0"
        >
          <ChevronDown size={12} />
        </motion.div>

        {/* Dismiss */}
        {onDismiss && (
          <button
            onClick={e => { e.stopPropagation(); onDismiss(); }}
            aria-label="Dismiss"
            className="w-4 h-4 rounded-[3px] shrink-0 bg-transparent border-none flex items-center justify-center text-[#3A3A50] cursor-pointer transition-colors duration-100 hover:text-red-500"
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* Body (collapsible) */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <ArtifactErrorBoundary fallbackType={artifact.type}>
              {artifact.type === "text"  && <TextBody  data={artifact.data as TextArtifactData}  />}
              {artifact.type === "json"  && <JsonBody  data={artifact.data as JsonArtifactData}  />}
              {artifact.type === "image" && <ImageBody data={artifact.data as ImageArtifactData} />}
              {artifact.type === "kpi"   && <KpiBody   data={artifact.data as KpiArtifactData}   accentColor={accentColor} />}
              {artifact.type === "table" && <TableBody data={artifact.data as TableArtifactData} />}
              {artifact.type === "file"  && <FileBody  data={artifact.data as FileArtifactData}  />}
              {artifact.type === "svg"   && <SvgBody   data={artifact.data as SvgArtifactData}   />}
              {artifact.type === "3d"    && <Massing3dBody data={artifact.data as Massing3dData} />}
            </ArtifactErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Error boundary for class-based catch
class ArtifactErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackType: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallbackType: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-3.5 py-2 text-[11px] text-red-500">
          Unable to render {this.props.fallbackType} artifact
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Body renderers ───────────────────────────────────────────────────────────

function TextBody({ data }: { data: TextArtifactData }) {
  const [expanded, setExpanded] = useState(false);
  const text = data?.content ?? "";
  const isLong = text.length > 220;
  const display = isLong && !expanded ? text.slice(0, 220) + "…" : text;

  return (
    <div className="pr-3 pb-2.5 pl-3.5">
      <p className="text-[11px] text-[#8888A0] leading-relaxed whitespace-pre-wrap m-0">
        {display}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-1.5 bg-none border-none text-[10px] text-[#4F8AFF] cursor-pointer p-0"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function JsonBody({ data }: { data: JsonArtifactData }) {
  const json = JSON.stringify(data?.json, null, 2);
  return (
    <div className="mr-3 mb-2.5 ml-3.5 bg-black/30 rounded-md overflow-auto max-h-[180px] px-2.5 py-2">
      <pre className="text-[10px] text-emerald-500 m-0 font-mono leading-relaxed">
        {json}
      </pre>
    </div>
  );
}

function ImageBody({ data }: { data: ImageArtifactData }) {
  return (
    <div>
      <div className="relative h-40 bg-[#07070D]">
        {data?.url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={data.url}
            alt={data.label ?? "Artifact image"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-[11px] text-[#5C5C78]">No preview</span>
          </div>
        )}
      </div>
      {data?.style && (
        <div className="px-3.5 pt-1.5 pb-2.5 text-[10px] text-[#5C5C78]">
          {data.style}
        </div>
      )}
    </div>
  );
}

function KpiBody({ data, accentColor }: { data: KpiArtifactData; accentColor: string }) {
  const rgb = hexToRgb(accentColor);
  const metrics = data?.metrics ?? [];
  return (
    <div
      className={cn(
        "grid gap-1.5 pr-3 pb-2.5 pl-3.5",
        metrics.length > 2 ? "grid-cols-2" : "grid-cols-1",
      )}
    >
      {metrics.map((m, i) => (
        <div
          key={i}
          className="rounded-[7px] px-2.5 py-2"
          style={{
            background: `rgba(${rgb}, 0.06)`,
            border: `1px solid rgba(${rgb}, 0.12)`,
          }}
        >
          <div className="text-xl font-bold text-[#F0F0F5] leading-tight">
            {m.value}
            {m.unit && <span className="text-xs font-normal text-[#5C5C78] ml-1">{m.unit}</span>}
          </div>
          <div className="text-[10px] text-[#3a3a50] mt-1 uppercase tracking-[0.05em]">
            {m.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableBody({ data }: { data: TableArtifactData }) {
  const headers = data?.headers ?? [];
  const rows = data?.rows ?? [];
  const isWide = headers.length > 6;
  const summary = (data as unknown as Record<string, unknown>)?.summary as { grandTotal?: number; currency?: string; note?: string } | undefined;
  const content = (data as unknown as Record<string, unknown>)?.content as string | undefined;

  // For wide tables (BOQ), show simplified 5-column view
  const displayHeaders = isWide
    ? [headers[0], headers[2], headers[3], headers[4], headers[headers.length - 1]]
    : headers;
  const displayRows = isWide
    ? rows.map(row => [row[0], row[2], row[3], row[4], row[row.length - 1]])
    : rows;

  return (
    <div className="mb-2.5">
      <div className="overflow-auto max-h-[200px]">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr>
              {displayHeaders.map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-2.5 py-[5px] whitespace-nowrap font-semibold text-[#5C5C78]",
                    "border-b border-b-white/[0.06] bg-black/30 sticky top-0 z-[1]",
                    i >= 3 ? "text-right" : "text-left",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} className="border-b border-b-[rgba(30,30,46,0.5)]">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "px-2.5 py-[5px] text-[#8888A0] whitespace-nowrap tabular-nums",
                      j >= 3 ? "text-right" : "text-left",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(summary?.grandTotal != null || content) && (
        <div className="px-3.5 py-1.5 border-t border-t-white/[0.08] flex justify-between items-center text-[10px]">
          <span className="text-[#5C5C78]">
            {rows.length} line items{summary?.note ? ` · ${summary.note}` : ""}
          </span>
          {summary?.grandTotal != null && (
            <span className="text-emerald-500 font-bold">
              Grand Total: ${summary.grandTotal.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// SVG data shape from GN-004 floor plan generator
interface SvgArtifactData {
  svg: string;
  label?: string;
  roomList?: Array<{ name: string; area: number; unit: string }>;
  totalArea?: number;
  floors?: number;
}

function SvgBody({ data }: { data: SvgArtifactData }) {
  const svgHtml = data?.svg ?? "";
  const sanitizedSvg = useMemo(
    () => (typeof window !== "undefined" ? DOMPurify.sanitize(svgHtml, { USE_PROFILES: { svg: true, svgFilters: true } }) : ""),
    [svgHtml]
  );

  return (
    <div>
      <div
        className="bg-[#FAFAFA] overflow-auto max-h-[240px] p-1"
        dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
      />
      {data?.roomList && data.roomList.length > 0 && (
        <div className="px-3.5 pt-1.5 pb-2.5 text-[10px] text-[#5C5C78]">
          {data.roomList.length} rooms · {data.totalArea ?? "?"} m² total
          {data.floors ? ` · ${data.floors} floors` : ""}
        </div>
      )}
    </div>
  );
}

// 3D massing data shape from GN-001
interface Massing3dData {
  floors: number;
  height: number;
  footprint: number;
  gfa: number;
  buildingType?: string;
  metrics?: Array<{ label: string; value: string | number; unit?: string }>;
}

function Massing3dBody({ data }: { data: Massing3dData }) {
  if (!data?.floors || !data?.height) {
    return <div className="px-3.5 py-2 text-[11px] text-[#5C5C78]">No massing data</div>;
  }
  return (
    <div className="px-2 pb-2.5 pl-2.5">
      <MassingViewer
        floors={data.floors}
        height={data.height}
        footprint={data.footprint ?? 500}
        gfa={data.gfa ?? data.floors * (data.footprint ?? 500)}
        buildingType={data.buildingType}
      />
      {data.metrics && data.metrics.length > 0 && (
        <div className="grid grid-cols-3 gap-1 mt-1.5">
          {data.metrics.slice(0, 6).map((m, i) => (
            <div
              key={i}
              className="bg-[rgba(79,138,255,0.06)] border border-[rgba(79,138,255,0.1)] rounded-[5px] px-[7px] py-[5px] text-center"
            >
              <div className="text-[13px] font-bold text-[#F0F0F5] leading-tight">
                {m.value}
                {m.unit && <span className="text-[8px] font-normal text-[#5C5C78] ml-0.5">{m.unit}</span>}
              </div>
              <div className="text-[8px] text-[#5C5C78] mt-0.5 uppercase tracking-[0.3px]">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileBody({ data }: { data: FileArtifactData }) {
  return (
    <div className="flex items-center justify-between gap-2.5 pr-3 pb-2.5 pl-3.5">
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-[#F0F0F5] overflow-hidden text-ellipsis whitespace-nowrap">
          {data?.name}
        </div>
        <div className="text-[10px] text-[#5C5C78] mt-0.5">
          {data?.type} · {formatBytes(data?.size ?? 0)}
        </div>
      </div>
      <a
        href={data?.downloadUrl}
        download={data?.name}
        className="flex items-center gap-[5px] px-2.5 py-[5px] rounded-md bg-[rgba(79,138,255,0.08)] border border-[rgba(79,138,255,0.2)] text-[10px] font-medium text-[#4F8AFF] no-underline shrink-0 transition-all duration-150 hover:bg-[rgba(79,138,255,0.15)] hover:border-[rgba(79,138,255,0.4)]"
      >
        <Download size={10} />
        Download
      </a>
    </div>
  );
}
