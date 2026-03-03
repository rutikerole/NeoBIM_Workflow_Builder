"use client";

import React, { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

const CATEGORY_COLORS: Record<string, string> = {
  input: "#3B82F6",
  transform: "#8B5CF6",
  generate: "#10B981",
  export: "#F59E0B",
  default: "#4F8AFF",
};

export const AnimatedEdge = memo(function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isFlowing = (data as Record<string, unknown>)?.isFlowing as boolean | undefined;
  const color = (data as Record<string, unknown>)?.color as string | undefined ?? CATEGORY_COLORS.default;

  return (
    <>
      {/* Base edge path - the track */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "#4F8AFF" : color,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeOpacity: selected ? 0.9 : 0.4,
          transition: "stroke 150ms ease, stroke-width 150ms ease",
          filter: selected ? "drop-shadow(0 0 4px rgba(79,138,255,0.5))" : undefined,
        }}
      />

      {/* Flowing data animation */}
      {isFlowing && (
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="8 12"
          strokeLinecap="round"
          style={{
            animation: "data-flow 1.2s linear infinite",
            filter: `drop-shadow(0 0 3px ${color})`,
            opacity: 0.9,
          }}
        />
      )}

      {/* Glowing line when selected */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#4F8AFF"
          strokeWidth={4}
          strokeOpacity={0.15}
        />
      )}

      <style>{`
        @keyframes data-flow {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </>
  );
});

AnimatedEdge.displayName = "AnimatedEdge";
