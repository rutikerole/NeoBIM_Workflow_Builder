'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLocale } from '@/hooks';

export default function NotFound() {
  const { t } = useLocale();
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", background: "#07070D", position: "relative", overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(79,138,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,138,255,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px", pointerEvents: "none",
        maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)",
      }} />

      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
        width: 600, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(79,138,255,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 480, width: "100%", textAlign: "center", position: "relative", zIndex: 1 }}
      >
        {/* Animated character */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          style={{ fontSize: 72, lineHeight: 1, marginBottom: 8 }}
        >
          🦉
        </motion.div>

        {/* Sparkles */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 24 }}>
          {["🔍", "📐", "🗺️"].map((s, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }}
              transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.4 }}
              style={{ fontSize: 18 }}
            >{s}</motion.span>
          ))}
        </div>

        {/* 404 text — subtle, not the focus */}
        <div style={{
          fontSize: 13, fontWeight: 700, color: "rgba(79,138,255,0.3)",
          letterSpacing: "6px", textTransform: "uppercase",
          fontFamily: "var(--font-jetbrains, monospace)", marginBottom: 12,
        }}>
          ERROR 404
        </div>

        <h1 style={{
          fontSize: 28, fontWeight: 800, color: "#F0F0F5",
          letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.3,
        }}>
          This blueprint doesn&apos;t exist
        </h1>
        <p style={{
          fontSize: 14, color: "#7C7C96", lineHeight: 1.7, marginBottom: 32,
          maxWidth: 380, marginLeft: "auto", marginRight: "auto",
        }}>
          Even the best architects sometimes draw a line to nowhere. Let&apos;s get you back on solid ground.
        </p>

        {/* CTA buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 24px", borderRadius: 14,
              background: "linear-gradient(135deg, #4F8AFF 0%, #6366F1 100%)",
              color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 6px 24px rgba(79,138,255,0.2)",
              transition: "all 0.2s ease",
            }}
          >
            {t('notFound.backToHome')}
          </Link>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 24px", borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#C0C0D8", fontSize: 14, fontWeight: 600, textDecoration: "none",
              transition: "all 0.2s ease",
            }}
          >
            {t('notFound.goToDashboard')}
          </Link>
        </div>

        {/* Fun footer note */}
        <p style={{
          fontSize: 11, color: "#33334A", marginTop: 40, lineHeight: 1.5,
          fontFamily: "var(--font-jetbrains, monospace)",
        }}>
          &quot;A good plan today is better than a perfect 404 tomorrow.&quot; — Nobody, ever
        </p>
      </motion.div>
    </div>
  );
}
