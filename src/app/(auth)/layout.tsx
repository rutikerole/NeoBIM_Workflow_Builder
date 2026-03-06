"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Users, Workflow, TrendingUp } from "lucide-react";
import { PREBUILT_WORKFLOWS } from "@/constants/prebuilt-workflows";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#07070D",
        overflow: "hidden",
      }}
    >
      {/* Left Sidebar (Social Proof) */}
      <div
        style={{
          flex: "0 0 45%",
          background: "linear-gradient(180deg, #0B0B15 0%, #09091A 50%, #07070D 100%)",
          borderRight: "1px solid rgba(255,255,255,0.04)",
          padding: "56px 56px 48px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
        className="auth-sidebar"
      >
        {/* Layered atmospheric effects */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "5%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(79, 138, 255, 0.1), transparent 65%)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.06), transparent 65%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        {/* Subtle grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            pointerEvents: "none",
            maskImage: "radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              marginBottom: 56,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "linear-gradient(135deg, #4F8AFF 0%, #7C6FF7 50%, #6366F1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(79,138,255,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <Zap size={16} color="white" fill="white" />
            </div>
            <span
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: "#F0F0F5",
                letterSpacing: "-0.4px",
              }}
            >
              Build<span style={{ color: "#4F8AFF" }}>Flow</span>
            </span>
          </Link>
        </motion.div>

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}
        >
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: "#F0F0F5",
              lineHeight: 1.15,
              marginBottom: 18,
              letterSpacing: "-0.03em",
            }}
          >
            From brief to building
            <br />
            <span style={{
              background: "linear-gradient(135deg, #4F8AFF, #A78BFA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              in minutes
            </span>
          </h1>

          <p
            style={{
              fontSize: 16,
              color: "#7C7C96",
              lineHeight: 1.65,
              marginBottom: 40,
              maxWidth: 420,
              letterSpacing: "-0.005em",
            }}
          >
            Join thousands of AEC professionals automating workflows with AI-powered visual pipelines.
          </p>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12,
              marginBottom: 40,
            }}
          >
            {[
              { icon: <Zap size={18} />, value: "31", label: "AEC Node Types", color: "#4F8AFF" },
              { icon: <Workflow size={18} />, value: String(PREBUILT_WORKFLOWS.length), label: "Ready-Made Templates", color: "#10B981" },
              { icon: <TrendingUp size={18} />, value: "Free", label: "To Start", color: "#F59E0B" },
              { icon: <Users size={18} />, value: "2-3 min", label: "Avg Generation", color: "#8B5CF6" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  background: "rgba(14,14,24,0.7)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 11,
                  padding: "14px 16px",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    marginBottom: 6,
                  }}
                >
                  <div style={{ color: stat.color, display: "flex", alignItems: "center", opacity: 0.85 }}>
                    {stat.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#F0F0F5",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {stat.value}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#5C5C78", letterSpacing: "-0.005em" }}>{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Product highlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "rgba(14,14,24,0.5)",
              border: "1px solid rgba(255,255,255,0.04)",
              borderLeft: "2px solid rgba(79,138,255,0.5)",
              borderRadius: 11,
              padding: "18px 22px",
              backdropFilter: "blur(8px)",
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: "#B0B0C8",
                lineHeight: 1.65,
                marginBottom: 12,
                letterSpacing: "-0.005em",
              }}
            >
              From PDF brief to 3D massing, concept renders, and BOQ exports — all in one visual pipeline. No code required.
            </p>
            <div style={{ fontSize: 11.5, color: "#5C5C78" }}>
              Built for architects, engineers, and BIM managers
            </div>
          </motion.div>
        </motion.div>

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          style={{
            fontSize: 11.5,
            color: "#4A4A64",
            marginTop: 36,
            letterSpacing: "-0.005em",
          }}
        >
          No credit card required &middot; Free tier forever
        </motion.div>
      </div>

      {/* Right Form Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          position: "relative",
          background: "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(79,138,255,0.06) 0%, transparent 70%), #07070D",
        }}
      >
        {/* Subtle top glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "60%",
            height: 300,
            background: "radial-gradient(ellipse at 50% 0%, rgba(79, 138, 255, 0.04), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>{children}</div>
      </div>

      {/* Mobile responsive styles */}
      <style jsx global>{`
        @media (max-width: 968px) {
          .auth-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
