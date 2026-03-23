"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Copy, Gift, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ReferralStats {
  totalReferred: number;
  converted: number;
  bonusExecutions: number;
}

interface ReferralCardProps {
  compact?: boolean;
}

export function ReferralCard({ compact = false }: ReferralCardProps) {
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferred: 0,
    converted: 0,
    bonusExecutions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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
      toast.success("Referral link generated!");
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
      toast.success("Referral link copied to clipboard!");
      window.gtag?.("event", "referral_link_copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div
        className={`rounded-xl border ${compact ? "p-3" : "p-6"} animate-pulse`}
        style={{
          background: "rgba(12,13,16,0.95)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <div className={`${compact ? "h-4 w-32" : "h-6 w-48"} rounded bg-white/10`} />
        {!compact && <div className="mt-3 h-4 w-64 rounded bg-white/5" />}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${compact ? "p-3" : "p-6"}`}
      style={{
        background: "rgba(12,13,16,0.95)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className={`flex items-center gap-${compact ? "2" : "3"} mb-${compact ? "2" : "4"}`}>
        <div className={`flex ${compact ? "h-7 w-7" : "h-10 w-10"} items-center justify-center rounded-lg bg-emerald-500/10`}>
          <Gift className={`${compact ? "h-3.5 w-3.5" : "h-5 w-5"} text-emerald-400`} />
        </div>
        <div>
          <h3 className={`${compact ? "text-xs" : "text-sm"} font-semibold text-white`}>
            Invite a colleague
          </h3>
          {!compact && (
            <p className="text-xs text-white/50">
              Both get 5 free executions
            </p>
          )}
        </div>
      </div>

      {code && referralLink ? (
        <>
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${compact ? "mb-2" : "mb-4"}`}
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <span className="flex-1 truncate text-xs text-white/70 font-mono">
              {referralLink}
            </span>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>

          <div className={`flex items-center ${compact ? "gap-2 flex-wrap" : "gap-4"} text-xs text-white/40`}>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>
                {stats.totalReferred} invited
              </span>
            </div>
            <span className="text-white/10">·</span>
            <span>{stats.converted} converted</span>
            <span className="text-white/10">·</span>
            <span className="text-emerald-400/70">
              +{stats.bonusExecutions} bonus runs
            </span>
          </div>
        </>
      ) : (
        <button
          onClick={generateCode}
          disabled={generating}
          className="w-full rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Referral Link"}
        </button>
      )}
    </div>
  );
}

export default ReferralCard;
