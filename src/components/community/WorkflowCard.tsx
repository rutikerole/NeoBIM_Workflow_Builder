"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, GitFork, Clock, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { WorkflowTemplate } from "@/types/workflow";
import type { NodeCategory } from "@/types/nodes";

const COMPLEXITY_COLORS: Record<string, string> = {
  simple: "#10B981",
  intermediate: "#F59E0B",
  advanced: "#EF4444",
};

const CATEGORY_BADGE_VARIANTS: Record<string, "input" | "transform" | "generate" | "export" | "default"> = {
  "Concept Design": "input",
  "Visualization": "generate",
  "BIM Export": "export",
  "Cost Estimation": "transform",
  "Full Pipeline": "info" as "input",
  "Compliance": "error" as "input",
};

interface WorkflowCardProps {
  workflow: WorkflowTemplate;
  href?: string;
  onClone?: (id: string) => void;
  showCloneButton?: boolean;
  ratingAvg?: number;
  cloneCount?: number;
  index?: number;
}

export function WorkflowCard({
  workflow,
  href,
  onClone,
  showCloneButton = false,
  ratingAvg,
  cloneCount,
  index = 0,
}: WorkflowCardProps) {
  const nodeCount = workflow.tileGraph.nodes.length;
  const complexityColor = COMPLEXITY_COLORS[workflow.complexity] ?? "#55556A";
  const categoryBadgeVariant = CATEGORY_BADGE_VARIANTS[workflow.category ?? ""] ?? "default";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
      className={cn(
        "group relative rounded-xl border border-[#1E1E2E] bg-[#12121A] overflow-hidden",
        "transition-all duration-200",
        "hover:border-[#2A2A3E] hover:shadow-[0_4px_30px_rgba(0,0,0,0.4)]",
        href && "cursor-pointer"
      )}
    >
      {href ? (
        <Link href={href} className="block">
          <CardContent
            workflow={workflow}
            nodeCount={nodeCount}
            complexityColor={complexityColor}
            categoryBadgeVariant={categoryBadgeVariant}
            ratingAvg={ratingAvg}
            cloneCount={cloneCount}
          />
        </Link>
      ) : (
        <CardContent
          workflow={workflow}
          nodeCount={nodeCount}
          complexityColor={complexityColor}
          categoryBadgeVariant={categoryBadgeVariant}
          ratingAvg={ratingAvg}
          cloneCount={cloneCount}
        />
      )}

      {/* Clone button */}
      {showCloneButton && onClone && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault();
              onClone(workflow.id);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-[#4F8AFF] px-2.5 py-1.5 text-xs font-medium text-white shadow-md hover:bg-[#3D7AFF] transition-colors"
          >
            <GitFork size={10} />
            Clone
          </button>
        </div>
      )}
    </motion.div>
  );
}

function CardContent({
  workflow,
  nodeCount,
  complexityColor,
  categoryBadgeVariant,
  ratingAvg,
  cloneCount,
}: {
  workflow: WorkflowTemplate;
  nodeCount: number;
  complexityColor: string;
  categoryBadgeVariant: string;
  ratingAvg?: number;
  cloneCount?: number;
}) {
  return (
    <>
      {/* Thumbnail */}
      <div className="relative h-36 bg-[#0A0A0F] overflow-hidden">
        {workflow.thumbnail ? (
          <Image
            src={workflow.thumbnail}
            alt={workflow.name}
            fill
            className="object-cover opacity-70 group-hover:opacity-90 transition-opacity"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <WorkflowDiagram workflow={workflow} />
        )}

        {/* Category badge overlay */}
        <div className="absolute top-2 left-2">
          <Badge variant={categoryBadgeVariant as "default"} size="sm">
            {workflow.category}
          </Badge>
        </div>

        {/* Complexity indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-[rgba(0,0,0,0.7)] px-2 py-0.5">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: complexityColor }}
          />
          <span className="text-[9px] font-medium capitalize" style={{ color: complexityColor }}>
            {workflow.complexity}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="text-sm font-semibold text-[#F0F0F5] line-clamp-1 group-hover:text-[#4F8AFF] transition-colors">
          {workflow.name}
        </h3>
        <p className="text-[11px] text-[#55556A] mt-1 line-clamp-2 leading-relaxed">
          {workflow.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2.5">
          {workflow.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A1A26] border border-[#2A2A3E] text-[#55556A]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1E1E2E]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] text-[#55556A]">
              <Zap size={10} className="text-[#4F8AFF]" />
              {nodeCount} nodes
            </div>
            {workflow.estimatedRunTime && (
              <div className="flex items-center gap-1 text-[10px] text-[#55556A]">
                <Clock size={10} />
                {workflow.estimatedRunTime}
              </div>
            )}
          </div>

          {ratingAvg !== undefined && (
            <div className="flex items-center gap-1 text-[10px] text-[#55556A]">
              <Star size={10} className="text-[#F59E0B]" fill="#F59E0B" />
              {ratingAvg.toFixed(1)}
              {cloneCount !== undefined && (
                <span className="ml-1 flex items-center gap-0.5">
                  <GitFork size={9} />
                  {cloneCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Simplified workflow diagram for thumbnail
function WorkflowDiagram({ workflow }: { workflow: WorkflowTemplate }) {
  const CATEGORY_COLORS: Record<NodeCategory, string> = {
    input: "#3B82F6",
    transform: "#8B5CF6",
    generate: "#10B981",
    export: "#F59E0B",
  };

  return (
    <div className="h-full flex items-center justify-center px-4 gap-1.5 overflow-hidden">
      {workflow.tileGraph.nodes.map((node, i) => {
        const category = node.data.category as NodeCategory;
        const color = CATEGORY_COLORS[category] ?? "#4F8AFF";

        return (
          <React.Fragment key={node.id}>
            <div
              className="rounded-lg border px-2 py-1.5 bg-[#0A0A0F] shrink-0"
              style={{ borderColor: `${color}40` }}
            >
              <div className="h-1 w-8 rounded" style={{ backgroundColor: `${color}80` }} />
              <div className="h-0.5 w-6 rounded mt-1" style={{ backgroundColor: `${color}40` }} />
            </div>
            {i < workflow.tileGraph.nodes.length - 1 && (
              <div className="h-px w-3 bg-[#2A2A3E] shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
