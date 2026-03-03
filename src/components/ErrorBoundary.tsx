"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 320,
          gap: 16,
          padding: 32,
          background: "#0A0A0F",
          color: "#F0F0F5",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#EF4444",
          }}
        >
          <AlertTriangle size={22} strokeWidth={1.5} />
        </div>

        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 13, color: "#55556A", lineHeight: 1.6, marginBottom: 4 }}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
        </div>

        <button
          onClick={this.reset}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 18px",
            borderRadius: 8,
            background: "rgba(79,138,255,0.1)",
            border: "1px solid rgba(79,138,255,0.3)",
            color: "#4F8AFF",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <RotateCcw size={13} strokeWidth={1.5} />
          Try again
        </button>
      </div>
    );
  }
}
