import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background scale
        "bg-primary": "#0A0A0F",
        "bg-secondary": "#12121A",
        "bg-canvas": "#0E0E16",
        "bg-elevated": "#1A1A26",

        // Border scale
        "border-subtle": "#1E1E2E",
        "border-default": "#2A2A3E",
        "border-focus": "#4F8AFF",

        // Text scale
        "text-primary": "#F0F0F5",
        "text-secondary": "#8888A0",
        "text-tertiary": "#55556A",

        // Node category colors
        "node-input": "#3B82F6",
        "node-input-bg": "rgba(59, 130, 246, 0.06)",
        "node-transform": "#8B5CF6",
        "node-transform-bg": "rgba(139, 92, 246, 0.06)",
        "node-generate": "#10B981",
        "node-generate-bg": "rgba(16, 185, 129, 0.06)",
        "node-export": "#F59E0B",
        "node-export-bg": "rgba(245, 158, 11, 0.06)",

        // Status colors
        "status-idle": "#55556A",
        "status-running": "#3B82F6",
        "status-success": "#10B981",
        "status-error": "#EF4444",

        // Accent
        "accent-primary": "#4F8AFF",
        "accent-glow": "rgba(79, 138, 255, 0.125)",
      },
      fontFamily: {
        display: ["var(--font-dm-sans)", "DM Sans", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "canvas-grid":
          "radial-gradient(circle, #1E1E2E 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      backgroundSize: {
        "canvas-grid": "20px 20px",
      },
      animation: {
        "pulse-node": "pulse-node 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "data-flow": "data-flow 1.5s linear infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        "pulse-node": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.02)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "data-flow": {
          "0%": { "stroke-dashoffset": "24" },
          "100%": { "stroke-dashoffset": "0" },
        },
      },
      boxShadow: {
        "node-idle": "0 0 0 1px rgba(42, 42, 62, 0.8)",
        "node-hover": "0 0 20px rgba(79, 138, 255, 0.1), 0 0 0 1px rgba(79, 138, 255, 0.3)",
        "node-selected": "0 0 30px rgba(79, 138, 255, 0.2), 0 0 0 2px rgba(79, 138, 255, 0.6)",
        "node-running": "0 0 20px rgba(59, 130, 246, 0.3)",
        "node-success": "0 0 20px rgba(16, 185, 129, 0.2)",
        "node-error": "0 0 20px rgba(239, 68, 68, 0.2)",
        "panel": "0 0 0 1px rgba(30, 30, 46, 0.8), 0 20px 60px rgba(0, 0, 0, 0.5)",
        "elevated": "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(42, 42, 62, 0.5)",
      },
      borderRadius: {
        "node": "12px",
        "card": "10px",
        "panel": "14px",
      },
    },
  },
  plugins: [],
};

export default config;
