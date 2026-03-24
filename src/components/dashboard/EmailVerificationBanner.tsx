"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export function EmailVerificationBanner() {
  const { data: session, update } = useSession();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  const emailVerified = (session?.user as { emailVerified?: boolean } | undefined)?.emailVerified;

  // Periodically refresh session to pick up verification (every 30s while banner is visible)
  const refreshSession = useCallback(() => { update(); }, [update]);
  useEffect(() => {
    if (emailVerified || !session?.user) return;
    const interval = setInterval(refreshSession, 30_000);
    return () => clearInterval(interval);
  }, [emailVerified, session?.user, refreshSession]);

  // Don't show if verified, no session, or dismissed
  if (!session?.user || emailVerified || dismissed) return null;

  const handleResend = () => {
    setError("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/send-verification", { method: "POST" });
        if (res.ok) {
          setSent(true);
        } else {
          const data = await res.json().catch(() => ({}));
          if (data.error?.includes("already verified")) {
            // User verified in another tab — refresh session
            await update();
            return;
          }
          setError(data.error || "Failed to send. Try again later.");
        }
      } catch {
        setError("Network error. Please try again.");
      }
    });
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))",
        border: "1px solid rgba(245,158,11,0.15)",
        borderRadius: 12,
        padding: "10px 16px",
        margin: "12px 12px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap" as const,
      }}
    >
      {/* Left: icon + text */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 16, flexShrink: 0, lineHeight: "20px" }}>&#9888;&#65039;</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#F59E0B", lineHeight: 1.4 }}>
            Verify your email to unlock full access
          </div>
          <div style={{ fontSize: 12, color: "#9898B0", lineHeight: 1.4, marginTop: 1 }}>
            Check your inbox for a verification link.
            {error && (
              <span style={{ color: "#EF4444", marginLeft: 6 }}>{error}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {sent ? (
          <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600, whiteSpace: "nowrap" }}>
            &#10003; Email sent!
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={isPending}
            style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              color: "#F59E0B",
              cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.6 : 1,
              transition: "opacity 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {isPending ? "Sending..." : "Resend email"}
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "none",
            border: "none",
            color: "#55556A",
            fontSize: 16,
            cursor: "pointer",
            padding: "2px 4px",
            lineHeight: 1,
          }}
          aria-label="Dismiss"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
