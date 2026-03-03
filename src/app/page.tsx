"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, Zap, Sparkles, Users, LayoutGrid,
  PlayCircle, FileText, Box, Download, Play,
} from "lucide-react";
import { MiniWorkflowDiagram } from "@/components/shared/MiniWorkflowDiagram";
import { PREBUILT_WORKFLOWS } from "@/constants/prebuilt-workflows";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return "79, 138, 255";
  return `${parseInt(r[1], 16)}, ${parseInt(r[2], 16)}, ${parseInt(r[3], 16)}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  input: "#3B82F6", transform: "#8B5CF6", generate: "#10B981", export: "#F59E0B",
};

// Framer Motion helpers
const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

// ─── Sticky Nav ───────────────────────────────────────────────────────────────

function StickyNav() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 180);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -64 }}
      animate={{ y: visible ? 0 : -64 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9000,
        height: 56, display: "flex", alignItems: "center",
        padding: "0 40px",
        background: "rgba(10,10,15,0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(30,30,46,0.6)",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{
        display: "flex", alignItems: "center", gap: 8,
        textDecoration: "none", marginRight: "auto",
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, flexShrink: 0,
          background: "linear-gradient(135deg, #4F8AFF 0%, #8B5CF6 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Zap size={12} color="white" fill="white" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F5" }}>
          Neo<span style={{ color: "#4F8AFF" }}>BIM</span>
        </span>
      </Link>

      {/* Links */}
      {["Features", "Workflows", "Community"].map(l => (
        <a key={l} href={`#${l.toLowerCase()}`} style={{
          fontSize: 13, color: "#8888A0", textDecoration: "none",
          margin: "0 16px", transition: "color 0.1s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F0F0F5"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8888A0"; }}
        >
          {l}
        </a>
      ))}

      <div style={{ display: "flex", gap: 8, marginLeft: 24 }}>
        <Link href="/dashboard" style={{
          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          color: "#C0C0D0", border: "1px solid #2A2A3E", background: "transparent",
          textDecoration: "none", transition: "border-color 0.1s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#3A3A4E"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#2A2A3E"; }}
        >
          Sign In
        </Link>
        <Link href="/dashboard" style={{
          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          color: "white", background: "linear-gradient(135deg, #4F8AFF 0%, #6D6AF6 100%)",
          textDecoration: "none",
          boxShadow: "0 2px 8px rgba(79,138,255,0.3)",
        }}>
          Get Started Free
        </Link>
      </div>
    </motion.nav>
  );
}

// ─── Hero Animation ───────────────────────────────────────────────────────────

const HERO_NODES = [
  { label: "PDF Upload",  category: "input",     icon: <FileText size={12} /> },
  { label: "Doc Parser",  category: "transform", icon: <Sparkles size={12} /> },
  { label: "Massing Gen", category: "generate",  icon: <Box size={12} /> },
  { label: "Image Gen",   category: "generate",  icon: <Play size={12} /> },
  { label: "IFC Export",  category: "export",    icon: <Download size={12} /> },
];

function HeroEdge({ delay = 0 }: { delay?: number }) {
  return (
    <div style={{
      width: 28, height: 2, flexShrink: 0,
      background: "rgba(79,138,255,0.25)",
      position: "relative", overflow: "visible",
    }}>
      <motion.div
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay, repeatDelay: 0.6 }}
        style={{
          position: "absolute", top: "50%",
          transform: "translateY(-50%)",
          width: 7, height: 7, borderRadius: "50%",
          background: "#4F8AFF",
          boxShadow: "0 0 8px rgba(79,138,255,0.8)",
        }}
      />
    </div>
  );
}

function HeroNodeCard({ label, category, icon, delay }: { label: string; category: string; icon: React.ReactNode; delay: number }) {
  const color = CATEGORY_COLORS[category] ?? "#4F8AFF";
  const rgb   = hexToRgb(color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
      style={{
        width: 106, borderRadius: 8, overflow: "hidden",
        background: "rgba(18,18,26,0.9)",
        border: `1px solid rgba(${rgb}, 0.25)`,
        boxShadow: `0 0 16px rgba(${rgb}, 0.08)`,
        borderLeft: `3px solid ${color}`,
        flexShrink: 0,
      }}
    >
      <div style={{ padding: "7px 9px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <span style={{ color, display: "flex" }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#E0E0EA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </span>
        </div>
        <div style={{
          height: 3, borderRadius: 2,
          background: "rgba(88,88,112,0.2)", overflow: "hidden",
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: delay + 0.5, duration: 0.6, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 2, background: color }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function HeroAnimation() {
  return (
    <motion.div
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      style={{
        borderRadius: 16, overflow: "hidden",
        border: "1px solid #1E1E2E",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
        background: "#0C0C14",
      }}
    >
      {/* Toolbar mockup */}
      <div style={{
        borderBottom: "1px solid #1A1A26", padding: "8px 14px",
        display: "flex", alignItems: "center", gap: 7,
        background: "#0A0A0F",
      }}>
        {["#EF4444", "#F59E0B", "#10B981"].map(c => (
          <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.7 }} />
        ))}
        <span style={{ marginLeft: 8, fontSize: 10, color: "#3A3A50" }}>NeoBIM Canvas</span>
        <div style={{
          marginLeft: "auto", padding: "3px 9px", borderRadius: 6,
          background: "rgba(79,138,255,0.1)", border: "1px solid rgba(79,138,255,0.2)",
          fontSize: 9, color: "#4F8AFF", fontWeight: 600,
        }}>
          ▶ Run
        </div>
      </div>

      {/* Canvas area */}
      <div style={{
        padding: "28px 20px 20px",
        backgroundImage: "radial-gradient(circle, #1E1E2E 1px, transparent 1px)",
        backgroundSize: "18px 18px",
        backgroundColor: "#0C0C14",
        minHeight: 180,
      }}>
        {/* Nodes row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {HERO_NODES.map((n, i) => (
            <React.Fragment key={i}>
              <HeroNodeCard {...n} delay={i * 0.18} />
              {i < HERO_NODES.length - 1 && <HeroEdge delay={i * 0.4} />}
            </React.Fragment>
          ))}
        </div>

        {/* Artifact card peek */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.4 }}
          style={{ marginTop: 14, marginLeft: 128, width: 200 }}
        >
          <div style={{
            background: "rgba(10,10,15,0.95)",
            border: "1px solid #1E1E2E",
            borderLeft: "3px solid #10B981",
            borderRadius: 7, padding: "5px 10px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981" }} />
            <span style={{ fontSize: 10, color: "#10B981", fontWeight: 600 }}>Massing Model</span>
            <span style={{ fontSize: 9, color: "#4A4A60", marginLeft: "auto" }}>✓ Done</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Social proof avatars ─────────────────────────────────────────────────────

const AVATARS = [
  { name: "SC", color: "#3B82F6" },
  { name: "MR", color: "#8B5CF6" },
  { name: "PP", color: "#10B981" },
  { name: "JO", color: "#F59E0B" },
  { name: "AT", color: "#EF4444" },
];

function AvatarRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex" }}>
        {AVATARS.map((a, i) => (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `rgba(${hexToRgb(a.color)}, 0.2)`,
            border: `2px solid #0A0A0F`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, color: a.color,
            marginLeft: i > 0 ? -8 : 0,
          }}>
            {a.name}
          </div>
        ))}
      </div>
      <span style={{ fontSize: 12, color: "#8888A0" }}>
        Join <strong style={{ color: "#C0C0D0" }}>2,400+</strong> AEC professionals
      </span>
    </div>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <LayoutGrid size={20} />,
    color: "#3B82F6",
    title: "Visual Workflow Builder",
    description: "Drag and drop 31 purpose-built AEC nodes onto an infinite canvas. Connect them to create powerful pipelines — no code required.",
    bullets: ["Drag-and-drop canvas", "31 AEC-specific nodes", "Real-time execution"],
  },
  {
    icon: <Sparkles size={20} />,
    color: "#8B5CF6",
    title: "AI-Powered Generation",
    description: "Describe your workflow in plain English. Our AI understands AEC processes and builds the complete pipeline for you.",
    bullets: ["Natural language input", "Instant workflow generation", "Iterative refinement"],
  },
  {
    icon: <Users size={20} />,
    color: "#10B981",
    title: "Community Marketplace",
    description: "Share your workflows with the global AEC community. Clone, customize, and build on proven pipelines from peers.",
    bullets: ["Share and discover", "One-click cloning", "Ratings and reviews"],
  },
];

// ─── Companies ────────────────────────────────────────────────────────────────

// NOTE: These are aspirational placeholder logos — replace with real client logos
const COMPANIES = ["Foster+Partners", "Arup", "SOM", "BIG", "Zaha Hadid Architects", "HOK"];

// ─── Showcase workflows ───────────────────────────────────────────────────────

const SHOWCASE = [
  { id: "wf-01", badge: null },
  { id: "wf-10", badge: "MOST POPULAR" },
  { id: "wf-09", badge: null },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", color: "#F0F0F5", overflowX: "hidden" }}>
      <StickyNav />

      {/* ── Static top nav (always visible) ────────────────────────────── */}
      <header>
      <nav style={{
        borderBottom: "1px solid #1A1A26",
        display: "flex", alignItems: "center",
        padding: "0 48px", height: 60,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", marginRight: "auto" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #4F8AFF 0%, #8B5CF6 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 10px rgba(79,138,255,0.3)",
          }}>
            <Zap size={15} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#F0F0F5", letterSpacing: "-0.3px" }}>
            Neo<span style={{ color: "#4F8AFF" }}>BIM</span>
          </span>
        </Link>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/dashboard" style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: "#C0C0D0", border: "1px solid #2A2A3E", background: "transparent",
            textDecoration: "none",
          }}>
            Sign In
          </Link>
          <Link href="/dashboard" style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: "white", background: "linear-gradient(135deg, #4F8AFF 0%, #6D6AF6 100%)",
            textDecoration: "none",
            boxShadow: "0 2px 10px rgba(79,138,255,0.3)",
          }}>
            Get Started Free
          </Link>
        </div>
      </nav>
      </header>

      <main>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex", alignItems: "center",
        maxWidth: 1200, margin: "0 auto",
        padding: "60px 48px",
        gap: 48, position: "relative",
      }}>
        {/* Background glows */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: "30%", left: "5%",
            width: 500, height: 500, borderRadius: "50%",
            background: "#4F8AFF", opacity: 0.04,
            filter: "blur(80px)",
          }} />
          <div style={{
            position: "absolute", top: "20%", right: "10%",
            width: 400, height: 400, borderRadius: "50%",
            background: "#8B5CF6", opacity: 0.04,
            filter: "blur(80px)",
          }} />
        </div>

        {/* Left text */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ flex: "0 0 52%", minWidth: 0 }}
        >
          <p style={{
            fontSize: 11, fontWeight: 700, color: "#4F8AFF",
            textTransform: "uppercase", letterSpacing: "2px", marginBottom: 18,
          }}>
            No-code workflow builder for AEC
          </p>

          <h1 style={{
            fontSize: 52, fontWeight: 800, lineHeight: 1.1,
            color: "#F0F0F5", marginBottom: 20,
            letterSpacing: "-1px",
          }}>
            Design buildings with<br />
            <span style={{
              background: "linear-gradient(135deg, #4F8AFF 0%, #8B5CF6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              AI-powered workflows
            </span>
          </h1>

          <p style={{
            fontSize: 18, color: "#8888A0", lineHeight: 1.65,
            maxWidth: 500, marginBottom: 32,
          }}>
            Drag, connect, and run visual pipelines that turn briefs into 3D models,
            renders, and BIM exports. Built for architects and engineers.
          </p>

          <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
            <Link href="/dashboard" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "13px 28px", borderRadius: 10,
              background: "linear-gradient(135deg, #4F8AFF 0%, #6D6AF6 100%)",
              color: "white", fontSize: 15, fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(79,138,255,0.4)",
              transition: "opacity 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.88"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              Start Building — Free
              <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard/templates" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "13px 24px", borderRadius: 10,
              border: "1px solid #2A2A3E", background: "rgba(255,255,255,0.03)",
              color: "#C0C0D0", fontSize: 14, fontWeight: 600,
              textDecoration: "none",
            }}>
              <PlayCircle size={15} style={{ color: "#4F8AFF" }} />
              See How It Works
            </Link>
          </div>

          <AvatarRow />
        </motion.div>

        {/* Right: Hero animation */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          style={{ flex: 1, minWidth: 0 }}
        >
          <HeroAnimation />
        </motion.div>
      </section>

      {/* ── Logo strip ──────────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid #1A1A26", borderBottom: "1px solid #1A1A26",
        padding: "20px 48px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 0,
      }}>
        <span style={{ fontSize: 11, color: "#3A3A50", marginRight: 32, whiteSpace: "nowrap" }}>
          Trusted by teams at
        </span>
        <div style={{ display: "flex", gap: 36, flexWrap: "wrap", justifyContent: "center" }}>
          {COMPANIES.map(c => (
            <span key={c} style={{
              fontSize: 12, fontWeight: 700, color: "#F0F0F5",
              opacity: 0.35, letterSpacing: "-0.3px",
              transition: "opacity 0.15s",
              cursor: "default",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.65"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.35"; }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "88px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp} transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 52 }}
        >
          <h2 style={{ fontSize: 32, fontWeight: 700, color: "#F0F0F5", marginBottom: 12 }}>
            Everything you need to automate AEC workflows
          </h2>
          <p style={{ fontSize: 15, color: "#8888A0", maxWidth: 520, margin: "0 auto" }}>
            Purpose-built for architects, engineers, and construction professionals.
          </p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
        >
          {FEATURES.map(f => {
            const rgb = hexToRgb(f.color);
            return (
              <motion.div key={f.title} variants={fadeUp} style={{
                background: "#12121A", borderRadius: 14,
                border: "1px solid #1E1E2E", padding: 28,
                transition: "border-color 0.15s, transform 0.15s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#2A2A3E";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#1E1E2E";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 52, height: 52, borderRadius: 14, marginBottom: 20,
                  background: `rgba(${rgb}, 0.1)`,
                  border: `1px solid rgba(${rgb}, 0.2)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: f.color,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#F0F0F5", marginBottom: 10 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: "#8888A0", lineHeight: 1.6, marginBottom: 16 }}>
                  {f.description}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {f.bullets.map(b => (
                    <li key={b} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 12, color: "#6B6B85", marginBottom: 6,
                    }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: f.color, flexShrink: 0,
                      }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Workflow showcase ────────────────────────────────────────────── */}
      <section id="workflows" style={{
        padding: "88px 48px",
        borderTop: "1px solid #1A1A26",
        background: "radial-gradient(ellipse at 50% 0%, rgba(79,138,255,0.04) 0%, transparent 60%)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp}
            style={{ textAlign: "center", marginBottom: 52 }}
          >
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "#F0F0F5", marginBottom: 12 }}>
              From brief to building in minutes
            </h2>
            <p style={{ fontSize: 15, color: "#8888A0" }}>
              See how NeoBIM workflows transform AEC processes
            </p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={stagger}
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
          >
            {SHOWCASE.map(({ id, badge }) => {
              const wf = PREBUILT_WORKFLOWS.find(w => w.id === id);
              if (!wf) return null;
              const nodes = wf.tileGraph.nodes.map(n => ({
                label: n.data.label, category: n.data.category as string,
              }));
              return (
                <motion.div key={id} variants={fadeUp} style={{
                  background: "#12121A", borderRadius: 14,
                  border: badge ? "1px solid rgba(245,158,11,0.3)" : "1px solid #1E1E2E",
                  overflow: "hidden",
                  transition: "border-color 0.15s",
                }}
                  onMouseEnter={e => {
                    if (!badge) (e.currentTarget as HTMLElement).style.borderColor = "#2A2A3E";
                  }}
                  onMouseLeave={e => {
                    if (!badge) (e.currentTarget as HTMLElement).style.borderColor = "#1E1E2E";
                  }}
                >
                  {/* Diagram */}
                  <div style={{
                    height: 120,
                    background: "#0C0C14",
                    borderBottom: "1px solid #1A1A26",
                    position: "relative",
                  }}>
                    {badge && (
                      <div style={{
                        position: "absolute", top: 8, right: 8,
                        fontSize: 9, padding: "2px 8px", borderRadius: 20,
                        background: "rgba(245,158,11,0.15)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        color: "#F59E0B", fontWeight: 700,
                      }}>
                        {badge}
                      </div>
                    )}
                    <MiniWorkflowDiagram nodes={nodes} size="md" animated />
                  </div>
                  {/* Content */}
                  <div style={{ padding: "16px 18px" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#E8E8F0", marginBottom: 6 }}>
                      {wf.name}
                    </h3>
                    <p style={{ fontSize: 12, color: "#55556A", lineHeight: 1.5, marginBottom: 12 }}>
                      {wf.tileGraph.nodes.length} nodes · {wf.estimatedRunTime}
                    </p>
                    <Link href="/dashboard/templates" style={{
                      fontSize: 12, fontWeight: 600, color: "#4F8AFF",
                      textDecoration: "none",
                    }}>
                      Try this workflow →
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="community" style={{ padding: "88px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp}
          style={{ textAlign: "center", marginBottom: 52 }}
        >
          <h2 style={{ fontSize: 32, fontWeight: 700, color: "#F0F0F5", marginBottom: 12 }}>
            Three ways to build
          </h2>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={stagger}
          style={{
            display: "grid", gridTemplateColumns: "1fr 40px 1fr 40px 1fr", gap: 0,
            alignItems: "center",
          }}
        >
          {[
            { num: "1", title: "Drag & Drop", desc: "Browse 31 nodes and drag them onto the canvas", icon: <LayoutGrid size={22} />, color: "#3B82F6" },
            { num: "2", title: "Connect",    desc: "Link nodes together to define your data flow",   icon: <Zap size={22} />,          color: "#8B5CF6" },
            { num: "3", title: "Run",        desc: "Execute and see results appear in real time",    icon: <Play size={22} />,         color: "#10B981" },
          ].map((step, i) => {
            const rgb = hexToRgb(step.color);
            return (
              <React.Fragment key={step.num}>
                <motion.div variants={fadeUp} style={{
                  background: "#12121A", borderRadius: 14,
                  border: "1px solid #1E1E2E", padding: "28px 24px",
                  textAlign: "center", position: "relative", overflow: "hidden",
                }}>
                  {/* Big number bg */}
                  <div style={{
                    position: "absolute", top: 8, right: 12,
                    fontSize: 64, fontWeight: 900, color: step.color,
                    opacity: 0.07, lineHeight: 1, userSelect: "none",
                  }}>
                    {step.num}
                  </div>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, margin: "0 auto 16px",
                    background: `rgba(${rgb}, 0.1)`,
                    border: `1px solid rgba(${rgb}, 0.2)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: step.color,
                  }}>
                    {step.icon}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#F0F0F5", marginBottom: 8 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 13, color: "#8888A0", lineHeight: 1.6 }}>
                    {step.desc}
                  </p>
                </motion.div>

                {i < 2 && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#2A2A3E",
                  }}>
                    <ArrowRight size={18} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </motion.div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section style={{
        padding: "88px 48px",
        background: "linear-gradient(180deg, #0A0A0F 0%, #0E0E18 50%, #0A0A0F 100%)",
        borderTop: "1px solid #1A1A26",
        textAlign: "center",
      }}>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp}
          style={{ maxWidth: 600, margin: "0 auto" }}
        >
          <h2 style={{ fontSize: 36, fontWeight: 800, color: "#F0F0F5", marginBottom: 14 }}>
            Ready to transform your<br />AEC workflow?
          </h2>
          <p style={{ fontSize: 16, color: "#8888A0", marginBottom: 32 }}>
            Free to start. No credit card required.
          </p>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "14px 36px", borderRadius: 12,
            background: "linear-gradient(135deg, #4F8AFF 0%, #6D6AF6 100%)",
            color: "white", fontSize: 16, fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 4px 24px rgba(79,138,255,0.4)",
            marginBottom: 16,
          }}>
            Create Your First Workflow
            <ArrowRight size={17} />
          </Link>
          <div>
            <Link href="/dashboard/community" style={{
              fontSize: 13, color: "#4F8AFF", textDecoration: "none",
            }}>
              Or explore community workflows →
            </Link>
          </div>
        </motion.div>
      </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid #1A1A26",
        padding: "20px 48px",
        display: "flex", alignItems: "center",
        maxWidth: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: "linear-gradient(135deg, #4F8AFF 0%, #8B5CF6 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Zap size={10} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 12, color: "#3A3A50", fontWeight: 600 }}>
            © 2026 NeoBIM
          </span>
        </div>
        <div style={{ margin: "0 auto", display: "flex", gap: 20 }}>
          {["Privacy", "Terms", "Contact"].map(l => (
            <a key={l} href="#" style={{ fontSize: 11, color: "#3A3A50", textDecoration: "none" }}>
              {l}
            </a>
          ))}
        </div>
        <span style={{ fontSize: 11, color: "#2A2A3E" }}>
          Built for the AEC community
        </span>
      </footer>
    </div>
  );
}
