"use client";

import React from "react";
import { motion } from "framer-motion";
import { Download, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type {
  ExecutionArtifact,
  TextArtifactData,
  ImageArtifactData,
  KpiArtifactData,
  TableArtifactData,
  FileArtifactData,
  JsonArtifactData,
} from "@/types/execution";
import { formatBytes } from "@/lib/utils";

interface ArtifactCardProps {
  artifact: ExecutionArtifact;
  className?: string;
}

export function ArtifactCard({ artifact, className }: ArtifactCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "rounded-xl border border-[#2A2A3E] bg-[#12121A] overflow-hidden",
        "shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
        "max-w-[320px] min-w-[200px]",
        className
      )}
    >
      {artifact.type === "text" && <TextArtifact data={artifact.data as TextArtifactData} />}
      {artifact.type === "json" && <JsonArtifact data={artifact.data as JsonArtifactData} />}
      {artifact.type === "image" && <ImageArtifact data={artifact.data as ImageArtifactData} />}
      {artifact.type === "kpi" && <KpiArtifact data={artifact.data as KpiArtifactData} />}
      {artifact.type === "table" && <TableArtifact data={artifact.data as TableArtifactData} />}
      {artifact.type === "file" && <FileArtifact data={artifact.data as FileArtifactData} />}
    </motion.div>
  );
}

function CardHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-2 border-b border-[#1E1E2E]">
      <span className="text-[10px] font-medium text-[#55556A] uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function TextArtifact({ data }: { data: TextArtifactData }) {
  const [expanded, setExpanded] = React.useState(false);
  const text = data?.content ?? "";
  const isLong = text.length > 200;
  const displayText = isLong && !expanded ? text.slice(0, 200) + "..." : text;

  return (
    <>
      <CardHeader label={data?.label ?? "Text Output"} />
      <div className="p-3">
        <p className="text-xs text-[#8888A0] leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-[10px] text-[#4F8AFF] hover:text-[#3D7AFF] transition-colors"
          >
            {expanded ? (
              <><ChevronUp size={10} /> Show less</>
            ) : (
              <><ChevronDown size={10} /> Show more</>
            )}
          </button>
        )}
      </div>
    </>
  );
}

function JsonArtifact({ data }: { data: JsonArtifactData }) {
  return (
    <>
      <CardHeader label={data?.label ?? "JSON Output"} />
      <div className="p-3 max-h-[200px] overflow-auto">
        <pre className="text-[10px] text-[#10B981] font-mono leading-relaxed">
          {JSON.stringify(data?.json, null, 2)}
        </pre>
      </div>
    </>
  );
}

function ImageArtifact({ data }: { data: ImageArtifactData }) {
  return (
    <>
      <CardHeader label={data?.label ?? "Generated Image"} />
      <div className="relative">
        <div className="relative h-[180px] bg-[#0A0A0F]">
          {data?.url ? (
            <Image
              src={data.url}
              alt={data.label ?? "Generated architectural concept"}
              fill
              className="object-cover"
              sizes="320px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-xs text-[#55556A]">No preview available</span>
            </div>
          )}
        </div>
        {data?.style && (
          <div className="px-3 py-2 border-t border-[#1E1E2E]">
            <span className="text-[10px] text-[#8888A0]">{data.style}</span>
          </div>
        )}
      </div>
    </>
  );
}

function KpiArtifact({ data }: { data: KpiArtifactData }) {
  return (
    <>
      <CardHeader label="Building KPIs" />
      <div className="p-3 grid grid-cols-2 gap-2">
        {data?.metrics?.map((metric, i) => (
          <div key={i} className="rounded-lg bg-[#1A1A26] p-2.5">
            <div className="text-lg font-bold text-[#F0F0F5] leading-tight">
              {metric.value}
              {metric.unit && (
                <span className="text-xs font-normal text-[#55556A] ml-1">
                  {metric.unit}
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#55556A] mt-0.5">{metric.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function TableArtifact({ data }: { data: TableArtifactData }) {
  return (
    <>
      <CardHeader label={data?.label ?? "Quantity Table"} />
      <div className="overflow-auto max-h-[200px]">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#1E1E2E] bg-[#0A0A0F]">
              {data?.headers?.map((h, i) => (
                <th
                  key={i}
                  className="px-2.5 py-1.5 text-left font-medium text-[#55556A] whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.rows?.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[#1E1E2E] hover:bg-[#1A1A26] transition-colors"
              >
                {row.map((cell, j) => (
                  <td key={j} className="px-2.5 py-1.5 text-[#8888A0] whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FileArtifact({ data }: { data: FileArtifactData }) {
  return (
    <>
      <CardHeader label={data?.label ?? "Export File"} />
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-medium text-[#F0F0F5] truncate">
            {data?.name}
          </span>
          <span className="text-[10px] text-[#55556A]">
            {data?.type} · {formatBytes(data?.size ?? 0)}
          </span>
        </div>
        <a
          href={data?.downloadUrl}
          download={data?.name}
          className="flex items-center gap-1.5 rounded-lg bg-[#1A1A26] border border-[#2A2A3E] px-2.5 py-1.5 text-[10px] font-medium text-[#4F8AFF] hover:bg-[#242438] hover:border-[#4F8AFF] transition-all shrink-0"
        >
          <Download size={10} />
          Download
        </a>
      </div>
    </>
  );
}
