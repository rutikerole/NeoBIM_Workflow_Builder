"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Copy, Check, Gift, Zap } from "lucide-react";
import { toast } from "sonner";

interface ReferralStats {
  totalReferred: number;
  converted: number;
  bonusEarned: number;
  bonusRemaining: number;
}

interface ReferralCardProps {
  compact?: boolean;
}

export function ReferralCard({ compact = false }: ReferralCardProps) {
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferred: 0,
    converted: 0,
    bonusEarned: 0,
    bonusRemaining: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralLink = code
    ? `https://trybuildflow.in/register?ref=${code}`
    : null;

  const fetchReferral = useCallback(async () => {
    try {
      const res = await fetch("/api/referral");
      if (!res.ok) return;
      const data = await res.json();
      setCode(data.code);
      setStats(data.stats);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferral();
  }, [fetchReferral]);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/referral", { method: "POST" });
      if (!res.ok) {
        toast.error("Failed to generate referral link");
        return;
      }
      const data = await res.json();
      setCode(data.code);
      toast.success("Referral link ready!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Link copied!");
      window.gtag?.("event", "referral_link_copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div
        className={`rounded-xl border ${compact ? "p-3" : "p-5"} animate-pulse`}
        style={{
          background: "rgba(12,13,16,0.95)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <div className={`${compact ? "h-4 w-32" : "h-6 w-48"} rounded bg-white/10`} />
      </div>
    );
  }

  // ── Compact mode (sidebar) ─────────────────────────────────────────────
  if (compact) {
    return (
      <div
        className="rounded-xl border p-3"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(12,13,16,0.95))",
          borderColor: "rgba(16,185,129,0.12)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
            <Gift className="h-3 w-3 text-emerald-400" />
          </div>
          <span className="text-[11px] font-semibold text-white/80">
            Refer & Earn
          </span>
          {stats.bonusRemaining > 0 && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
              <Zap className="h-2 w-2" />
              {stats.bonusRemaining}
            </span>
          )}
        </div>

        {code && referralLink ? (
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-all hover:bg-emerald-500/10"
            style={{
              borderColor: copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)",
              color: copied ? "#10B981" : "rgba(255,255,255,0.6)",
              background: copied ? "rgba(16,185,129,0.08)" : "transparent",
            }}
          >
            {copied ? (
              <>
                <Check className="h-2.5 w-2.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-2.5 w-2.5" />
                Copy Referral Link
              </>
            )}
          </button>
        ) : (
          <button
            onClick={generateCode}
            disabled={generating}
            className="w-full rounded-lg bg-emerald-500/10 px-2 py-1.5 text-[10px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {generating ? "..." : "Get Referral Link"}
          </button>
        )}
      </div>
    );
  }

  // ── Full mode ──────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(12,13,16,0.95))",
        borderColor: "rgba(16,185,129,0.15)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <Gift className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">
            Invite & Earn
          </h3>
          <p className="text-xs text-white/50">
            You and your friend each get 1 bonus execution
          </p>
        </div>
      </div>

      {code && referralLink ? (
        <>
          {/* Link + Copy */}
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2.5 mb-4"
            style={{
              borderColor: copied ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.08)",
              background: copied ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
              transition: "all 0.2s ease",
            }}
          >
            <span className="flex-1 truncate text-xs text-white/60 font-mono">
              {referralLink}
            </span>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: copied ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)",
                color: "#10B981",
              }}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-white/40">
              <Users className="h-3.5 w-3.5" />
              <span>{stats.totalReferred} referred</span>
            </div>
            <span className="text-white/10">|</span>
            <div className="flex items-center gap-1.5 text-emerald-400/70">
              <Zap className="h-3.5 w-3.5" />
              <span>
                {stats.bonusRemaining} bonus{stats.bonusRemaining !== 1 ? "es" : ""} remaining
              </span>
            </div>
          </div>
        </>
      ) : (
        <button
          onClick={generateCode}
          disabled={generating}
          className="w-full rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 hover:ring-1 hover:ring-emerald-500/20 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Referral Link"}
        </button>
      )}
    </div>
  );
}

export default ReferralCard;
