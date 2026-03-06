"use client";

/**
 * Interactive input node shell + per-type input components.
 * All interactive elements use nodrag/nowheel/nopan class + stopPropagation
 * so React Flow doesn't interfere with typing/clicking.
 */

import React, { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/stores/workflow-store";
import type { WorkflowNodeData } from "@/types/nodes";

// ─── File store (module-level, not in Zustand — files can't serialize) ───────
export const inputFileStore = new Map<string, File>();

// ─── Shared stop-propagation handler ─────────────────────────────────────────
function stopAll(e: React.SyntheticEvent) {
  e.stopPropagation();
}

// ─── Text Prompt (IN-001) ────────────────────────────────────────────────────

export function TextPromptInput({ nodeId, data }: { nodeId: string; data: WorkflowNodeData }) {
  const updateNode = useWorkflowStore(s => s.updateNode);
  const value = (data.inputValue as string) ?? "";

  const onChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const currentNode = useWorkflowStore.getState().nodes.find(n => n.id === nodeId);
    if (!currentNode) return;
    updateNode(nodeId, { data: { ...currentNode.data, inputValue: e.target.value } });
  }, [nodeId, updateNode]);

  const isEmpty = !value.trim();

  return (
    <div className="nodrag nowheel nopan" onMouseDown={stopAll} onClick={stopAll} onKeyDown={stopAll}>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={"Describe your building project…\ne.g. A 5-story mixed-use building with\nground-floor retail. Modern Nordic style."}
        rows={3}
        className={cn(
          "w-full resize-none box-border mt-2 p-3 rounded-lg text-[#F0F0F5] text-[13px] leading-relaxed font-[inherit] outline-none transition-all duration-150",
          isEmpty
            ? "bg-[rgba(79,138,255,0.04)] border border-[rgba(79,138,255,0.3)] animate-[pulseInputBorder_2s_ease-in-out_infinite]"
            : "bg-black/30 border border-white/[0.08] animate-none",
        )}
      />
      <div className="text-right text-[9px] text-[#3A3A4E] mt-0.5">
        {value.length} / 2000
      </div>
    </div>
  );
}

// ─── File Upload (PDF, IFC, Image, DXF) ─────────────────────────────────────

interface FileUploadProps {
  nodeId: string;
  data: WorkflowNodeData;
  accept: string;
  label: string;
  maxMB?: number;
  showPreview?: boolean;
}

export function FileUploadInput({ nodeId, data, accept, label, maxMB = 20, showPreview }: FileUploadProps) {
  const updateNode = useWorkflowStore(s => s.updateNode);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileName = data.inputValue as string | undefined;
  const hasFile = !!fileName;

  const handleFile = useCallback((file: File) => {
    if (maxMB && file.size > maxMB * 1024 * 1024) {
      alert(`File too large. Max ${maxMB}MB.`);
      return;
    }
    inputFileStore.set(nodeId, file);
    const currentNode = useWorkflowStore.getState().nodes.find(n => n.id === nodeId);
    if (!currentNode) return;
    updateNode(nodeId, { data: { ...currentNode.data, inputValue: file.name, fileSize: file.size } });
  }, [nodeId, updateNode, maxMB]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const onRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    inputFileStore.delete(nodeId);
    const currentNode = useWorkflowStore.getState().nodes.find(n => n.id === nodeId);
    if (!currentNode) return;
    updateNode(nodeId, { data: { ...currentNode.data, inputValue: "", fileSize: undefined } });
    if (inputRef.current) inputRef.current.value = "";
  }, [nodeId, updateNode]);

  const fileObj = inputFileStore.get(nodeId);
  const isImage = showPreview && fileObj && fileObj.type.startsWith("image/");

  return (
    <div
      className="nodrag nowheel nopan"
      onMouseDown={stopAll} onClick={stopAll} onKeyDown={stopAll}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onFileChange}
        className="hidden"
      />
      {hasFile ? (
        <div className="mt-2 px-2 py-1.5 rounded-md bg-emerald-500/[0.06] border border-emerald-500/20 flex flex-col gap-1">
          {isImage && fileObj && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={URL.createObjectURL(fileObj)}
              alt="preview"
              className="w-full h-12 object-cover rounded mb-0.5"
            />
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[10px] text-emerald-500 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {fileName}
            </span>
            <button
              onClick={onRemove}
              className="text-[9px] text-[#55556A] bg-none border-none cursor-pointer p-0"
            >
              ✕
            </button>
          </div>
          {(data.fileSize as number | undefined) && (
            <span className="text-[9px] text-[#55556A]">
              {((data.fileSize as number) / 1024).toFixed(1)} KB
            </span>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="mt-2 px-2 py-2.5 rounded-md cursor-pointer border border-dashed border-[rgba(79,138,255,0.25)] bg-[rgba(79,138,255,0.03)] text-center transition-all duration-150 hover:border-[rgba(79,138,255,0.5)] hover:bg-[rgba(79,138,255,0.07)]"
        >
          <div className="text-[9px] text-[#55556A] leading-relaxed">
            Drop {label} here or <span className="text-[#4F8AFF]">click to browse</span>
          </div>
          <div className="text-[8px] text-[#3A3A4E] mt-0.5">
            {accept} · max {maxMB}MB
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Parameter Input (IN-005) ─────────────────────────────────────────────────

const STYLE_OPTIONS = ["Modern", "Nordic", "Classical", "Industrial", "Tropical", "Brutalist", "Minimalist"];

interface Params { floors: number; gfa: number; height: number; style: string }

const INPUT_CLS = "w-full box-border px-3 py-1.5 rounded-md border border-white/[0.08] bg-black/30 text-[#F0F0F5] text-[13px] outline-none font-[inherit] transition-all duration-150";

export function ParameterInput({ nodeId, data }: { nodeId: string; data: WorkflowNodeData }) {
  const updateNode = useWorkflowStore(s => s.updateNode);

  const params: Params = (() => {
    try {
      const raw = data.inputValue as string | undefined;
      if (!raw) return { floors: 5, gfa: 4800, height: 22, style: "Modern" };
      return JSON.parse(raw) as Params;
    } catch {
      return { floors: 5, gfa: 4800, height: 22, style: "Modern" };
    }
  })();

  const update = useCallback((key: keyof Params, val: string | number) => {
    const currentNode = useWorkflowStore.getState().nodes.find(n => n.id === nodeId);
    if (!currentNode) return;
    const currentParams: Params = (() => {
      try {
        const raw = currentNode.data.inputValue as string | undefined;
        if (!raw) return { floors: 5, gfa: 4800, height: 22, style: "Modern" };
        return JSON.parse(raw) as Params;
      } catch { return { floors: 5, gfa: 4800, height: 22, style: "Modern" }; }
    })();
    const next = { ...currentParams, [key]: val };
    updateNode(nodeId, { data: { ...currentNode.data, inputValue: JSON.stringify(next) } });
  }, [nodeId, updateNode]);

  const rows: Array<{ key: keyof Params; label: string; type: "number" | "select" }> = [
    { key: "floors", label: "Floors",     type: "number" },
    { key: "gfa",    label: "GFA (m²)",   type: "number" },
    { key: "height", label: "Height (m)", type: "number" },
    { key: "style",  label: "Style",      type: "select" },
  ];

  return (
    <div
      className="nodrag nowheel nopan mt-2 flex flex-col gap-[5px]"
      onMouseDown={stopAll} onClick={stopAll} onKeyDown={stopAll}
    >
      {rows.map(row => (
        <div key={row.key} className="flex items-center gap-1.5">
          <label className="text-[11px] text-[#5C5C78] font-medium w-[60px] shrink-0">
            {row.label}
          </label>
          {row.type === "number" ? (
            <input
              type="number"
              value={params[row.key] as number}
              onChange={e => update(row.key, parseFloat(e.target.value) || 0)}
              className={INPUT_CLS}
            />
          ) : (
            <select
              value={params[row.key] as string}
              onChange={e => update(row.key, e.target.value)}
              className={cn(INPUT_CLS, "cursor-pointer")}
            >
              {STYLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Location Input (IN-006) ─────────────────────────────────────────────────

export function LocationInput({ nodeId, data }: { nodeId: string; data: WorkflowNodeData }) {
  const updateNode = useWorkflowStore(s => s.updateNode);
  const value = (data.inputValue as string) ?? "";

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const currentNode = useWorkflowStore.getState().nodes.find(n => n.id === nodeId);
    if (!currentNode) return;
    updateNode(nodeId, { data: { ...currentNode.data, inputValue: e.target.value } });
  }, [nodeId, updateNode]);

  return (
    <div className="nodrag nowheel nopan" onMouseDown={stopAll} onClick={stopAll} onKeyDown={stopAll}>
      <div className="relative mt-2">
        <span className="absolute left-[7px] top-1/2 -translate-y-1/2 text-[10px] text-[#3A3A4E]">📍</span>
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="e.g. Alexanderplatz, Berlin"
          className="w-full box-border py-1.5 pr-2 pl-[22px] rounded-md border border-white/[0.07] bg-black/30 text-[#C0C0D0] text-[10px] outline-none font-[inherit]"
        />
      </div>
    </div>
  );
}

// ─── Selector: which component to render ─────────────────────────────────────

export function InputNodeContent({ nodeId, data }: { nodeId: string; data: WorkflowNodeData }) {
  switch (data.catalogueId) {
    case "IN-001":
      return <TextPromptInput nodeId={nodeId} data={data} />;
    case "IN-002":
      return <FileUploadInput nodeId={nodeId} data={data} accept=".pdf" label="a PDF" maxMB={20} />;
    case "IN-003":
      return <FileUploadInput nodeId={nodeId} data={data} accept=".png,.jpg,.jpeg,.webp" label="an image" maxMB={10} showPreview />;
    case "IN-004":
      return <FileUploadInput nodeId={nodeId} data={data} accept=".ifc" label="an IFC file" maxMB={50} />;
    case "IN-005":
      return <ParameterInput nodeId={nodeId} data={data} />;
    case "IN-006":
      return <LocationInput nodeId={nodeId} data={data} />;
    case "IN-007":
      return <FileUploadInput nodeId={nodeId} data={data} accept=".dxf,.dwg" label="a DXF/DWG file" maxMB={30} />;
    default:
      return null;
  }
}
