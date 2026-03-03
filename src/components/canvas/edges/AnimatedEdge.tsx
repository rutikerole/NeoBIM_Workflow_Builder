"use client";

import React, { memo, useState } from "react";
import { getSmoothStepPath, type EdgeProps } from "@xyflow/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EdgeData {
  sourceColor?: string;
  targetColor?: string;
  isFlowing?: boolean;
}

// ─── AnimatedEdge ────────────────────────────────────────────────────────────

export const AnimatedEdge = memo(function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const edgeData = data as EdgeData | undefined;
  const sourceColor = edgeData?.sourceColor ?? "#4F8AFF";
  const targetColor = edgeData?.targetColor ?? "#4F8AFF";
  const isFlowing   = edgeData?.isFlowing   ?? false;

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  });

  // Unique IDs so multiple edges don't conflict
  const gradientId = `eg-${id}`;
  const glowId     = `ef-${id}`;
  const arrowId    = `ea-${id}`;

  // Visual states
  const active     = selected || isHovered;
  const strokeW    = isFlowing ? 2.5 : active ? 3 : 2;
  const strokeOp   = isFlowing ? 1   : active ? 0.85 : 0.4;
  const glowColor  = targetColor;

  return (
    <>
      <defs>
        {/* Directional gradient: source color → target color */}
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX} y1={sourceY}
          x2={targetX} y2={targetY}
        >
          <stop offset="0%"   stopColor={sourceColor} stopOpacity={0.9} />
          <stop offset="100%" stopColor={targetColor}  stopOpacity={0.9} />
        </linearGradient>

        {/* Glow filter for hover/selected */}
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Arrowhead marker — target color */}
        <marker
          id={arrowId}
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path
            d="M0,0.5 L7,4 L0,7.5 Z"
            fill={targetColor}
            opacity={strokeOp}
          />
        </marker>
      </defs>

      {/* Wide invisible hit area for easy hover/click */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Glow halo (behind main line, only when active) */}
      {active && (
        <path
          d={edgePath}
          fill="none"
          stroke={glowColor}
          strokeWidth={strokeW + 4}
          strokeOpacity={0.1}
          strokeLinecap="round"
        />
      )}

      {/* Main edge with gradient stroke */}
      <path
        d={edgePath}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeW}
        strokeOpacity={strokeOp}
        strokeLinecap="round"
        markerEnd={`url(#${arrowId})`}
        filter={active ? `url(#${glowId})` : undefined}
        style={{
          transition: "stroke-width 0.15s ease, stroke-opacity 0.15s ease",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Idle slow dash overlay — data-can-flow affordance */}
      {!isFlowing && (
        <path
          d={edgePath}
          fill="none"
          stroke={sourceColor}
          strokeWidth={1}
          strokeOpacity={active ? 0.4 : 0.15}
          strokeDasharray="5 18"
          strokeLinecap="round"
          className="edge-dash-idle"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Flowing: bright white dot travels the path */}
      {isFlowing && (
        <>
          {/* Bright pulsing track overlay */}
          <path
            d={edgePath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={2.5}
            strokeOpacity={0.9}
            strokeLinecap="round"
            style={{ pointerEvents: "none" }}
          />
          {/* Travelling dot */}
          <circle r="4.5" fill="white" opacity={0.95} style={{ filter: `drop-shadow(0 0 5px ${targetColor})` }}>
            <animateMotion
              dur="1.1s"
              repeatCount="indefinite"
              calcMode="linear"
              path={edgePath}
            />
          </circle>
        </>
      )}
    </>
  );
});

AnimatedEdge.displayName = "AnimatedEdge";
