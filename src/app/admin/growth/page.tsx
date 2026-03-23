"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus,
  Users, Workflow, Zap, MessageSquare,
  ArrowUpRight, ArrowDownRight,
  RefreshCw, Calendar,
} from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import type { TranslationKey } from "@/lib/i18n";

// ─── Types ───────────────────────────────────────────────────────────────────
type ComparePeriod = "yesterday" | "lastWeek" | "lastMonth";

interface DeltaPeriod {
  today: number;
  yesterday: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
}

interface StatsResponse {
  users: { total: number; activeThisWeek: number; newThisMonth: number; dailySignups: { date: string; count: number }[] };
  workflows: { total: number; published: number; templates: number };
  executions: { total: number; successRate: number; byStatus: Record<string, number>; dailyExecutions: { date: string; total: number; success: number; failed: number }[] };
  feedback: { total: number };
  mrr: number;
  paidTotal: number;
  deltas: {
    users: DeltaPeriod;
    workflows: DeltaPeriod;
    executions: DeltaPeriod;
    feedback: DeltaPeriod;
  };
}

// ─── Design Tokens ───────────────────────────────────────────────────────────
const COLORS = {
  pageBg: "#070809",
  cardBg: "rgba(18,18,30,0.6)",
  cardBlur: "blur(16px) saturate(1.3)",
  cardBorder: "rgba(255,255,255,0.06)",
  cardBorderHover: "rgba(255,255,255,0.1)",
  textPrimary: "#F0F0F5",
  textSecondary: "#9898B0",
  textMuted: "#5C5C78",
  cyan: "#00F5FF",
  copper: "#B87333",
  amber: "#FFBF00",
  blue: "#4F8AFF",
  success: "#34D399",
  warning: "#FBBF24",
  error: "#F87171",
};

const CARD_SHADOW = "0 4px 24px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15)";
const smoothEase: [number, number, number, number] = [0.25, 0.4, 0.25, 1];
const monoFont = "var(--font-jetbrains), monospace";
const headingFont = "var(--font-dm-sans), sans-serif";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function getPeriodValues(dp: DeltaPeriod, period: ComparePeriod): { current: number; previous: number } {
  switch (period) {
    case "yesterday":  return { current: dp.today,    previous: dp.yesterday };
    case "lastWeek":   return { current: dp.thisWeek, previous: dp.lastWeek };
    case "lastMonth":  return { current: dp.thisMonth, previous: dp.lastMonth };
  }
}

// ─── Period Selector ─────────────────────────────────────────────────────────
function PeriodSelector({
  value,
  onChange,
  t,
}: {
  value: ComparePeriod;
  onChange: (v: ComparePeriod) => void;
  t: (key: TranslationKey) => string;
}) {
  const options: { key: ComparePeriod; labelKey: TranslationKey }[] = [
    { key: "yesterday", labelKey: "admin.growth.compareYesterday" },
    { key: "lastWeek",  labelKey: "admin.growth.compareLastWeek" },
    { key: "lastMonth", labelKey: "admin.growth.compareLastMonth" },
  ];

  return (
    <div style={{
      display: "inline-flex", borderRadius: 10, overflow: "hidden",
      border: `1px solid ${COLORS.cardBorder}`,
      background: "rgba(255,255,255,0.02)",
    }}>
      {options.map((opt) => {
        const isActive = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              padding: "7px 14px",
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              fontFamily: monoFont,
              letterSpacing: "0.02em",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: isActive ? `${COLORS.cyan}15` : "transparent",
              color: isActive ? COLORS.cyan : COLORS.textMuted,
              borderRight: `1px solid ${COLORS.cardBorder}`,
            }}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

// ─── Delta Chip ──────────────────────────────────────────────────────────────
function DeltaChip({ value, pct }: { value: number; pct: number | null }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const color = isNeutral ? COLORS.textMuted : isPositive ? COLORS.success : COLORS.error;
  const bg = isNeutral ? "rgba(255,255,255,0.03)" : isPositive ? `${COLORS.success}12` : `${COLORS.error}12`;
  const borderColor = isNeutral ? "rgba(255,255,255,0.06)" : isPositive ? `${COLORS.success}25` : `${COLORS.error}25`;
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 8,
      background: bg, border: `1px solid ${borderColor}`,
    }}>
      <Icon size={12} style={{ color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: monoFont, color }}>
        {isPositive ? "+" : ""}{value}
      </span>
      {pct !== null && pct !== 0 && (
        <span style={{ fontSize: 9, fontWeight: 600, fontFamily: monoFont, color, opacity: 0.7 }}>
          ({isPositive ? "+" : ""}{pct}%)
        </span>
      )}
    </div>
  );
}

// ─── Summary Card (dynamic) ─────────────────────────────────────────────────
function SummaryCard({
  icon, label, dp, period, periodLabel, accentColor, delay,
}: {
  icon: React.ReactNode;
  label: string;
  dp: DeltaPeriod;
  period: ComparePeriod;
  periodLabel: string;
  accentColor: string;
  delay: number;
}) {
  const { current: currentVal, previous: previousVal } = getPeriodValues(dp, period);
  const delta = currentVal - previousVal;
  const pct = getPctChange(currentVal, previousVal);
  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  const trendColor = isNeutral ? COLORS.textMuted : isPositive ? COLORS.success : COLORS.error;
  const TrendIcon = isNeutral ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: smoothEase }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", overflow: "hidden",
        background: COLORS.cardBg, backdropFilter: COLORS.cardBlur,
        border: `1px solid ${hovered ? COLORS.cardBorderHover : COLORS.cardBorder}`,
        borderRadius: 14, padding: "20px 22px",
        boxShadow: CARD_SHADOW,
        transition: "border-color 0.2s ease, transform 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44, transparent)`,
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ color: accentColor, opacity: 0.8 }}>{icon}</div>
        <span style={{
          fontSize: 9, color: COLORS.textMuted, textTransform: "uppercase",
          letterSpacing: "2.5px", fontWeight: 600, fontFamily: monoFont,
        }}>
          {label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: COLORS.textPrimary, fontFamily: monoFont, letterSpacing: "-0.03em" }}>
          {currentVal.toLocaleString()}
        </span>
        <span style={{ fontSize: 14, color: COLORS.textMuted, fontFamily: monoFont }}>
          vs {previousVal.toLocaleString()}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "3px 8px", borderRadius: 6,
          background: `${trendColor}12`, border: `1px solid ${trendColor}25`,
        }}>
          <TrendIcon size={12} style={{ color: trendColor }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: trendColor, fontFamily: monoFont }}>
            {isPositive ? "+" : ""}{delta}
          </span>
          {pct !== null && (
            <span style={{ fontSize: 9, color: trendColor, opacity: 0.7, fontFamily: monoFont }}>
              ({isPositive ? "+" : ""}{pct}%)
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: COLORS.textMuted }}>{periodLabel}</span>
      </div>
    </motion.div>
  );
}

// ─── Comparison Row (dynamic) ────────────────────────────────────────────────
function ComparisonRow({
  icon, label, total, dp, period, currentLabel, previousLabel,
  accentColor, delay,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  dp: DeltaPeriod;
  period: ComparePeriod;
  currentLabel: string;
  previousLabel: string;
  accentColor: string;
  delay: number;
}) {
  const { current: currentVal, previous: previousVal } = getPeriodValues(dp, period);
  const delta = currentVal - previousVal;
  const pct = getPctChange(currentVal, previousVal);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.45, ease: smoothEase }}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(170px, 1.5fr) repeat(3, minmax(100px, 1fr))",
        gap: 0, alignItems: "center",
        padding: "14px 20px", minWidth: 560,
        borderBottom: "1px solid rgba(255,255,255,0.03)",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Metric name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${accentColor}12`, border: `1px solid ${accentColor}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accentColor, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, lineHeight: 1.3 }}>{label}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: monoFont }}>
            {total.toLocaleString()} total
          </div>
        </div>
      </div>

      {/* Current period */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, fontFamily: monoFont }}>
          {currentVal.toLocaleString()}
        </div>
        <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: monoFont, marginTop: 2 }}>
          {currentLabel}
        </div>
      </div>

      {/* Previous period */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textSecondary, fontFamily: monoFont }}>
          {previousVal.toLocaleString()}
        </div>
        <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: monoFont, marginTop: 2 }}>
          {previousLabel}
        </div>
      </div>

      {/* Delta */}
      <div style={{ textAlign: "center" }}>
        <DeltaChip value={delta} pct={pct} />
      </div>
    </motion.div>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const width = 120;
  const height = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${height} ${points} ${width},${height}`} fill={`${color}15`} stroke="none" />
    </svg>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────
function SkeletonPulse({ width, height, borderRadius = 6 }: { width: string | number; height: number; borderRadius?: number }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.8s ease-in-out infinite",
    }} />
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1360, margin: "0 auto" }}>
      <SkeletonPulse width={200} height={24} />
      <div style={{ marginTop: 8 }}><SkeletonPulse width={300} height={14} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 28 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ background: COLORS.cardBg, borderRadius: 14, padding: "20px 22px", border: `1px solid ${COLORS.cardBorder}` }}>
            <SkeletonPulse width={80} height={10} />
            <div style={{ marginTop: 16 }}><SkeletonPulse width={100} height={28} /></div>
            <div style={{ marginTop: 12 }}><SkeletonPulse width={140} height={14} /></div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28, background: COLORS.cardBg, borderRadius: 14, padding: 24, border: `1px solid ${COLORS.cardBorder}` }}>
        <SkeletonPulse width={200} height={16} />
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ marginTop: 16 }}><SkeletonPulse width="100%" height={48} /></div>
        ))}
      </div>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminGrowthPage() {
  const { t } = useLocale();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("");
  const [period, setPeriod] = useState<ComparePeriod>("yesterday");
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchStats = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    const id = setInterval(() => fetchStats(true), 30_000);
    return () => clearInterval(id);
  }, [fetchStats]);
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (lastUpdated) {
        const secs = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        setLastUpdatedLabel(secs < 5 ? "just now" : secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [lastUpdated]);

  if (loading) return <LoadingSkeleton />;
  if (error || !stats) return (
    <div style={{ padding: "24px 28px", maxWidth: 1360, margin: "0 auto", textAlign: "center", marginTop: 80 }}>
      <div style={{ fontSize: 14, color: COLORS.error, marginBottom: 12 }}>{error || "No data"}</div>
      <button onClick={() => fetchStats()} style={{
        padding: "8px 20px", borderRadius: 10, border: `1px solid ${COLORS.copper}44`,
        background: `${COLORS.copper}15`, color: COLORS.copper, fontSize: 12, fontWeight: 600, cursor: "pointer",
      }}>Retry</button>
    </div>
  );

  const d = stats.deltas;

  // Period labels
  const periodLabelMap: Record<ComparePeriod, string> = {
    yesterday: t("admin.growth.vsYesterday"),
    lastWeek:  t("admin.growth.vsLastWeek"),
    lastMonth: t("admin.growth.vsLastMonth"),
  };
  const currentLabelMap: Record<ComparePeriod, string> = {
    yesterday: t("admin.growth.today"),
    lastWeek:  t("admin.growth.thisWeek"),
    lastMonth: t("admin.growth.thisMonth"),
  };
  const previousLabelMap: Record<ComparePeriod, string> = {
    yesterday: t("admin.growth.yesterday"),
    lastWeek:  t("admin.growth.lastWeek"),
    lastMonth: t("admin.growth.lastMonth"),
  };

  const periodLabel = periodLabelMap[period];
  const currentLabel = currentLabelMap[period];
  const previousLabel = previousLabelMap[period];

  // Sparkline data
  const last7Signups = stats.users.dailySignups.slice(-7).map(s => s.count);
  const last7Execs = stats.executions.dailyExecutions.slice(-7).map(e => e.total);

  return (
    <div className="admin-growth-page" style={{ padding: "24px 28px 48px", maxWidth: 1360, margin: "0 auto" }}>
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
      >
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: COLORS.textPrimary, margin: 0,
            fontFamily: headingFont, letterSpacing: "-0.02em",
          }}>
            {t("admin.growth.title")}
          </h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: "6px 0 0" }}>
            {t("admin.growth.subtitle")}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Period selector */}
          <PeriodSelector value={period} onChange={setPeriod} t={t} />

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={12} style={{ color: COLORS.textMuted }} />
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: monoFont }}>
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: monoFont }}>
            {lastUpdatedLabel && `Updated ${lastUpdatedLabel}`}
          </span>
          <button
            onClick={() => fetchStats(true)}
            title="Refresh"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${COLORS.cardBorder}`, background: COLORS.cardBg,
              color: COLORS.textSecondary, cursor: "pointer", transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.cyan; e.currentTarget.style.borderColor = COLORS.cardBorderHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textSecondary; e.currentTarget.style.borderColor = COLORS.cardBorder; }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </motion.div>

      {/* ── Summary Cards (dynamic based on selected period) ─────────── */}
      <div className="growth-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <SummaryCard
          icon={<Users size={15} />}
          label={t("admin.growth.newUsers")}
          dp={d.users}
          period={period}
          periodLabel={periodLabel}
          accentColor={COLORS.cyan}
          delay={0.05}
        />
        <SummaryCard
          icon={<Workflow size={15} />}
          label={t("admin.growth.newWorkflows")}
          dp={d.workflows}
          period={period}
          periodLabel={periodLabel}
          accentColor={COLORS.amber}
          delay={0.1}
        />
        <SummaryCard
          icon={<Zap size={15} />}
          label={t("admin.growth.executions")}
          dp={d.executions}
          period={period}
          periodLabel={periodLabel}
          accentColor={COLORS.copper}
          delay={0.15}
        />
        <SummaryCard
          icon={<MessageSquare size={15} />}
          label={t("admin.growth.feedbackItems")}
          dp={d.feedback}
          period={period}
          periodLabel={periodLabel}
          accentColor={COLORS.blue}
          delay={0.2}
        />
      </div>

      {/* ── Comparison Table (dynamic) ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5, ease: smoothEase }}
        style={{
          background: COLORS.cardBg, backdropFilter: COLORS.cardBlur,
          border: `1px solid ${COLORS.cardBorder}`, borderRadius: 14,
          boxShadow: CARD_SHADOW, overflow: "hidden", marginBottom: 28,
        }}
      >
        <div style={{ padding: "18px 20px 0", position: "sticky", left: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS.textPrimary, margin: 0, fontFamily: headingFont }}>
            {t("admin.growth.comparisonTable")}
          </h2>
          <p style={{ fontSize: 11, color: COLORS.textMuted, margin: "4px 0 0", fontFamily: monoFont }}>
            {currentLabel} {periodLabel}
          </p>
        </div>

        <div style={{ overflowX: "auto", minWidth: 0 }}>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "minmax(170px, 1.5fr) repeat(3, minmax(100px, 1fr))",
            gap: 0, padding: "14px 20px 10px", minWidth: 560,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 600, fontFamily: monoFont, letterSpacing: "1.5px", textTransform: "uppercase" }}>
              {t("admin.growth.metric")}
            </div>
            <div style={{ fontSize: 9, color: COLORS.cyan, fontWeight: 600, fontFamily: monoFont, letterSpacing: "1.5px", textTransform: "uppercase", textAlign: "center" }}>
              {currentLabel}
            </div>
            <div style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 600, fontFamily: monoFont, letterSpacing: "1.5px", textTransform: "uppercase", textAlign: "center" }}>
              {previousLabel}
            </div>
            <div style={{ fontSize: 9, color: COLORS.amber, fontWeight: 600, fontFamily: monoFont, letterSpacing: "1.5px", textTransform: "uppercase", textAlign: "center" }}>
              {t("admin.growth.delta")}
            </div>
          </div>

          <ComparisonRow icon={<Users size={14} />} label={t("admin.growth.newUsers")} total={stats.users.total} dp={d.users} period={period} currentLabel={currentLabel} previousLabel={previousLabel} accentColor={COLORS.cyan} delay={0.3} />
          <ComparisonRow icon={<Workflow size={14} />} label={t("admin.growth.newWorkflows")} total={stats.workflows.total} dp={d.workflows} period={period} currentLabel={currentLabel} previousLabel={previousLabel} accentColor={COLORS.amber} delay={0.35} />
          <ComparisonRow icon={<Zap size={14} />} label={t("admin.growth.executions")} total={stats.executions.total} dp={d.executions} period={period} currentLabel={currentLabel} previousLabel={previousLabel} accentColor={COLORS.copper} delay={0.4} />
          <ComparisonRow icon={<MessageSquare size={14} />} label={t("admin.growth.feedbackItems")} total={stats.feedback.total} dp={d.feedback} period={period} currentLabel={currentLabel} previousLabel={previousLabel} accentColor={COLORS.blue} delay={0.45} />
        </div>
      </motion.div>

      {/* ── Trend Sparklines ─────────────────────────────────────────── */}
      <div className="growth-sparkline-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45, ease: smoothEase }}
          style={{
            background: COLORS.cardBg, backdropFilter: COLORS.cardBlur,
            border: `1px solid ${COLORS.cardBorder}`, borderRadius: 14,
            padding: "20px 24px", boxShadow: CARD_SHADOW,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textPrimary, fontFamily: headingFont }}>
                {t("admin.growth.signupTrend")}
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: monoFont, marginTop: 2 }}>
                {t("admin.growth.last7Days")}
              </div>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 6,
              background: `${COLORS.cyan}12`, border: `1px solid ${COLORS.cyan}20`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.cyan, fontFamily: monoFont }}>
                {last7Signups.reduce((a, b) => a + b, 0)}
              </span>
              <span style={{ fontSize: 9, color: COLORS.cyan, opacity: 0.7 }}>total</span>
            </div>
          </div>
          <MiniSparkline data={last7Signups} color={COLORS.cyan} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45, ease: smoothEase }}
          style={{
            background: COLORS.cardBg, backdropFilter: COLORS.cardBlur,
            border: `1px solid ${COLORS.cardBorder}`, borderRadius: 14,
            padding: "20px 24px", boxShadow: CARD_SHADOW,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textPrimary, fontFamily: headingFont }}>
                {t("admin.growth.execTrend")}
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: monoFont, marginTop: 2 }}>
                {t("admin.growth.last7Days")}
              </div>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 6,
              background: `${COLORS.amber}12`, border: `1px solid ${COLORS.amber}20`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.amber, fontFamily: monoFont }}>
                {last7Execs.reduce((a, b) => a + b, 0)}
              </span>
              <span style={{ fontSize: 9, color: COLORS.amber, opacity: 0.7 }}>total</span>
            </div>
          </div>
          <MiniSparkline data={last7Execs} color={COLORS.amber} />
        </motion.div>
      </div>

      {/* ── Responsive styles ────────────────────────────────────────── */}
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @media (max-width: 1024px) {
          .growth-summary-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .growth-sparkline-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .admin-growth-page { padding: 16px 14px 32px !important; }
          .growth-summary-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
