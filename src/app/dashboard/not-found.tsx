'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DashboardNotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", background: "#07070D", position: "relative", overflow: "hidden",
    }}>
      {/* Blueprint grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(6,182,212,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.025) 1px, transparent 1px)",
        backgroundSize: "48px 48px", pointerEvents: "none",
        maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 65%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 65%)",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 480, width: "100%", textAlign: "center", position: "relative", zIndex: 1 }}
      >
        {/* Animated character */}
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, -3, 0, 3, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          style={{ fontSize: 64, lineHeight: 1, marginBottom: 12 }}
        >
          👷
        </motion.div>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          {["🏗️", "🔧", "📋"].map((s, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
              style={{ fontSize: 16 }}
            >{s}</motion.span>
          ))}
        </div>

        <div style={{
          fontSize: 11, fontWeight: 700, color: "rgba(6,182,212,0.3)",
          letterSpacing: "5px", textTransform: "uppercase",
          fontFamily: "var(--font-jetbrains, monospace)", marginBottom: 12,
        }}>
          SECTOR NOT FOUND
        </div>

        <h1 style={{
          fontSize: 26, fontWeight: 800, color: "#F0F0F5",
          letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.3,
        }}>
          This room isn&apos;t on the floor plan
        </h1>
        <p style={{
          fontSize: 14, color: "#7C7C96", lineHeight: 1.7, marginBottom: 32,
          maxWidth: 360, marginLeft: "auto", marginRight: "auto",
        }}>
          Looks like someone forgot to draw this page. The construction crew has been notified.
        </p>

        <Link
          href="/dashboard"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: 14,
            background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
            color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 6px 24px rgba(6,182,212,0.2)",
            transition: "all 0.2s ease",
          }}
        >
          Back to Dashboard
        </Link>

        <p style={{
          fontSize: 11, color: "#2A2A3A", marginTop: 36,
          fontFamily: "var(--font-jetbrains, monospace)",
        }}>
          &quot;Every wall was once a missing wall.&quot; — Confucius (probably)
        </p>
      </motion.div>
    </div>
  );
}
