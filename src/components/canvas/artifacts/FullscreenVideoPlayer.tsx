"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Download, Clock, Clapperboard, Film, DollarSign, SkipForward, Building2, DoorOpen } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useExecutionStore } from "@/stores/execution-store";
import type { VideoSegment } from "@/types/execution";

export function FullscreenVideoPlayer() {
  const nodeId = useUIStore(s => s.videoPlayerNodeId);
  const close = useUIStore(s => s.setVideoPlayerNodeId);
  const artifact = useExecutionStore(s => nodeId ? s.artifacts.get(nodeId) : undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const onTime = () => setCurrentTime(v.currentTime);
    const onMeta = () => setVideoDuration(v.duration);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, [nodeId, currentSegmentIndex]);

  if (!nodeId || !artifact || artifact.type !== "video") return null;

  const d = artifact.data as Record<string, unknown>;
  const segments = (d?.segments as VideoSegment[]) ?? [];
  const hasSegments = segments.length > 1;

  const currentSegment = hasSegments ? segments[currentSegmentIndex] : null;
  const videoUrl = hasSegments
    ? (currentSegment?.videoUrl ?? "")
    : ((d?.videoUrl as string) ?? (d?.downloadUrl as string) ?? "");
  const downloadUrl = (d?.downloadUrl as string) ?? (d?.videoUrl as string) ?? "";
  const fileName = (d?.name as string) ?? "walkthrough.mp4";
  const shotCount = (d?.shotCount as number) ?? (hasSegments ? segments.length : 1);
  const totalDurationSec = (d?.durationSeconds as number) ?? 15;
  const pipeline = (d?.pipeline as string) ?? "Kling 3.0";
  const costUsd = (d?.costUsd as number) ?? null;

  // Handle segment end — auto-advance
  const handleVideoEnded = () => {
    if (hasSegments && currentSegmentIndex < segments.length - 1) {
      setCurrentSegmentIndex(prev => prev + 1);
      setCurrentTime(0);
    } else {
      setCurrentSegmentIndex(0);
      setIsPlaying(false);
    }
  };

  // Auto-play on segment change
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (videoRef.current && hasSegments && isPlaying) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentSegmentIndex, hasSegments, isPlaying]);

  const skipToSegment = (index: number) => {
    setCurrentSegmentIndex(index);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Calculate cumulative time offset for segment timeline
  const segmentOffsets = hasSegments
    ? segments.reduce<number[]>((acc, seg, i) => {
        acc.push(i === 0 ? 0 : acc[i - 1] + segments[i - 1].durationSeconds);
        return acc;
      }, [])
    : [];

  const cumulativeTime = hasSegments
    ? segmentOffsets[currentSegmentIndex] + currentTime
    : currentTime;

  // Segment icons for AEC
  const segmentIcons = [
    <Building2 key="ext" size={12} />,
    <DoorOpen key="int" size={12} />,
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute", inset: 0, zIndex: 60,
        background: "rgba(4,4,8,0.98)",
        display: "flex", flexDirection: "column",
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F5" }}>
            AEC Cinematic Walkthrough
          </span>
          {hasSegments && (
            <span style={{
              padding: "2px 8px", borderRadius: 4,
              background: "rgba(0,245,255,0.1)",
              border: "1px solid rgba(0,245,255,0.2)",
              fontSize: 10, fontWeight: 600, color: "#00F5FF",
              fontFamily: "'Space Mono', monospace",
            }}>
              {totalDurationSec}s / {segments.length} segments
            </span>
          )}
        </div>
        <button
          onClick={() => close(null)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 8,
            background: "rgba(255,255,255,0.06)", border: "none",
            color: "#8888A0", fontSize: 12, fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <X size={12} /> Close
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", padding: "24px 24px",
        gap: 20,
      }}>
        {/* Video player */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            width: "100%", maxWidth: 900,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(0,245,255,0.08)",
            background: "#000",
            position: "relative",
          }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            crossOrigin="anonymous"
            playsInline
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={{
              width: "100%",
              display: "block",
              borderRadius: 12,
            }}
          />

          {/* Current segment label overlay */}
          {hasSegments && currentSegment && (
            <div style={{
              position: "absolute",
              top: 12,
              left: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(0,245,255,0.2)",
            }}>
              {segmentIcons[currentSegmentIndex] ?? <Film size={12} />}
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#00F5FF",
                fontFamily: "'Space Mono', monospace",
              }}>
                {currentSegment.label}
              </span>
              <span style={{
                fontSize: 10,
                color: "#5C5C78",
                fontFamily: "'Space Mono', monospace",
              }}>
                ({currentSegment.durationSeconds}s)
              </span>
            </div>
          )}
        </motion.div>

        {/* Segment timeline bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            width: "100%", maxWidth: 900,
            display: "flex", gap: 4,
          }}
        >
          {hasSegments ? (
            // Multi-segment timeline — each segment is a clickable block proportional to duration
            segments.map((seg, i) => {
              const isActive = i === currentSegmentIndex;
              const isPast = i < currentSegmentIndex;
              const segWidth = (seg.durationSeconds / totalDurationSec) * 100;

              // Progress within this segment
              const progress = isActive && videoDuration > 0
                ? Math.min((currentTime / videoDuration) * 100, 100)
                : isPast ? 100 : 0;

              return (
                <button
                  key={i}
                  onClick={() => skipToSegment(i)}
                  style={{
                    flex: `0 0 ${segWidth}%`,
                    height: 40,
                    borderRadius: 6,
                    background: isActive
                      ? "rgba(0,245,255,0.1)"
                      : isPast
                        ? "rgba(0,245,255,0.05)"
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isActive ? "rgba(0,245,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Progress fill */}
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${progress}%`,
                    background: isActive
                      ? "rgba(0,245,255,0.15)"
                      : "rgba(0,245,255,0.06)",
                    transition: "width 0.2s linear",
                  }} />
                  <span style={{ position: "relative", zIndex: 1, color: isActive ? "#00F5FF" : "#5C5C78" }}>
                    {segmentIcons[i] ?? <Film size={10} />}
                  </span>
                  <span style={{
                    position: "relative", zIndex: 1,
                    fontSize: 10, fontWeight: 600,
                    color: isActive ? "#00F5FF" : "#5C5C78",
                    fontFamily: "'Space Mono', monospace",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {seg.label ?? `Part ${i + 1}`}
                  </span>
                  <span style={{
                    position: "relative", zIndex: 1,
                    fontSize: 9, color: isActive ? "rgba(0,245,255,0.6)" : "#3C3C50",
                    fontFamily: "'Space Mono', monospace",
                  }}>
                    {seg.durationSeconds}s
                  </span>
                </button>
              );
            })
          ) : (
            // Single video — simple progress bar
            <div style={{
              flex: 1, height: 40, borderRadius: 6,
              background: "rgba(0,245,255,0.1)",
              border: "1px solid rgba(0,245,255,0.3)",
              position: "relative", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: videoDuration > 0 ? `${(currentTime / videoDuration) * 100}%` : "0%",
                background: "rgba(0,245,255,0.15)",
                transition: "width 0.2s linear",
              }} />
              <span style={{
                position: "relative", zIndex: 1,
                fontSize: 10, fontWeight: 600, color: "#00F5FF",
                fontFamily: "'Space Mono', monospace",
              }}>
                Walkthrough
              </span>
            </div>
          )}
        </motion.div>

        {/* Cumulative progress indicator for multi-segment */}
        {hasSegments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              width: "100%", maxWidth: 900,
              height: 3, borderRadius: 2,
              background: "rgba(255,255,255,0.05)",
              overflow: "hidden",
            }}
          >
            <div style={{
              height: "100%",
              width: `${(cumulativeTime / totalDurationSec) * 100}%`,
              background: "linear-gradient(90deg, #00F5FF, #8B5CF6)",
              borderRadius: 2,
              transition: "width 0.2s linear",
            }} />
          </motion.div>
        )}

        {/* Metadata grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            width: "100%", maxWidth: 900,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {[
            { label: "Total Duration", value: `${totalDurationSec}s`, icon: <Clock size={14} />, color: "#00F5FF" },
            { label: "Segments", value: String(shotCount), icon: <Clapperboard size={14} />, color: "#FFBF00" },
            { label: "Pipeline", value: pipeline.includes("Kling") ? "Kling 3.0" : pipeline, icon: <Film size={14} />, color: "#8B5CF6" },
            { label: "Cost", value: costUsd != null ? `$${costUsd.toFixed(2)}` : "--", icon: <DollarSign size={14} />, color: "#FFBF00" },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: "14px 16px",
                textAlign: "center",
              }}
            >
              <div style={{ color: card.color, marginBottom: 6, display: "flex", justifyContent: "center" }}>
                {card.icon}
              </div>
              <div style={{
                fontSize: 18, fontWeight: 700, color: "#F0F0F5",
                lineHeight: 1.1, marginBottom: 4,
                fontFamily: "'Space Mono', monospace",
              }}>
                {card.value}
              </div>
              <div style={{
                fontSize: 10, color: "#5C5C78", textTransform: "uppercase",
                letterSpacing: "0.05em", fontWeight: 500,
              }}>
                {card.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Segment download buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{
            display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
          }}
        >
          {hasSegments ? (
            segments.map((seg, i) => (
              <a
                key={i}
                href={seg.downloadUrl ?? seg.videoUrl}
                download={`walkthrough_part${i + 1}.mp4`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 8,
                  background: i === 0
                    ? "rgba(0,245,255,0.08)"
                    : "rgba(139,92,246,0.08)",
                  border: `1px solid ${i === 0 ? "rgba(0,245,255,0.25)" : "rgba(139,92,246,0.25)"}`,
                  color: i === 0 ? "#00F5FF" : "#8B5CF6",
                  fontSize: 12, fontWeight: 600,
                  textDecoration: "none", cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Download size={14} />
                {seg.label ?? `Part ${i + 1}`}
              </a>
            ))
          ) : (
            <a
              href={downloadUrl}
              download={fileName}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 28px", borderRadius: 8,
                background: "rgba(0,245,255,0.1)",
                border: "1px solid rgba(0,245,255,0.3)",
                color: "#00F5FF", fontSize: 14, fontWeight: 600,
                textDecoration: "none", cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Download size={16} />
              Download Video
            </a>
          )}
        </motion.div>

        {/* Pipeline info */}
        <div style={{ fontSize: 10, color: "#4A4A60", fontStyle: "italic" }}>
          {pipeline}
        </div>
      </div>
    </motion.div>
  );
}
