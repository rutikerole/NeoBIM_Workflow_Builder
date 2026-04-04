"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Workflow, ArrowRight, Trash2, ExternalLink, Clock, Sparkles, Box, Image as ImageIcon, Search, FileText, Layers, Zap, FolderOpen, ChevronRight } from "lucide-react";
import { api, type WorkflowSummary } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { STRIPE_PLANS } from "@/lib/stripe";
import { useLocale } from "@/hooks/useLocale";

// ─── Workflow type detection ─────────────────────────────────────────────────
type WfType = { key: string; color: string; icon: React.ReactNode; label: string };

function getWorkflowType(name: string, labels: Record<string, string>): WfType {
  const n = name.toLowerCase();
  if (n.includes("pdf") || n.includes("report") || n.includes("document"))
    return { key: "pdf", color: "#F59E0B", icon: <FileText size={13} color="#F59E0B" />, label: labels.pdf };
  if (n.includes("floor plan") || n.includes("2d") || n.includes("floorplan"))
    return { key: "floorplan", color: "#10B981", icon: <Layers size={13} color="#10B981" />, label: labels.floorplan };
  if (n.includes("render") || n.includes("concept") || n.includes("image"))
    return { key: "render", color: "#8B5CF6", icon: <ImageIcon size={13} color="#8B5CF6" />, label: labels.render };
  if (n.includes("full pipeline") || n.includes("complete"))
    return { key: "pipeline", color: "#EC4899", icon: <Sparkles size={13} color="#EC4899" />, label: labels.pipeline };
  if (n.includes("3d") || n.includes("massing") || n.includes("model"))
    return { key: "3d", color: "#06B6D4", icon: <Box size={13} color="#06B6D4" />, label: labels["3d"] };
  return { key: "custom", color: "#00F5FF", icon: <Zap size={13} color="#00F5FF" />, label: labels.custom };
}

// Group workflows: template types with 2+ workflows get sections, rest go flat
function groupWorkflows(wfs: WorkflowSummary[], labels: Record<string, string>): { grouped: { type: WfType; items: WorkflowSummary[] }[]; ungrouped: WorkflowSummary[] } {
  const byKey = new Map<string, { type: WfType; items: WorkflowSummary[] }>();
  for (const wf of wfs) {
    const wfType = getWorkflowType(wf.name, labels);
    if (!byKey.has(wfType.key)) byKey.set(wfType.key, { type: wfType, items: [] });
    byKey.get(wfType.key)!.items.push(wf);
  }
  const grouped: { type: WfType; items: WorkflowSummary[] }[] = [];
  const ungrouped: WorkflowSummary[] = [];
  for (const [, group] of byKey) {
    if (group.type.key === "custom" || group.items.length < 2) {
      ungrouped.push(...group.items);
    } else {
      grouped.push(group);
    }
  }
  return { grouped, ungrouped };
}

export default function WorkflowsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { t } = useLocale();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);

  const typeLabels = useMemo(() => ({
    pdf: t('workflows.typePdfReports'),
    floorplan: t('workflows.typeFloorPlans'),
    render: t('workflows.typeRenders'),
    pipeline: t('workflows.typeFullPipeline'),
    "3d": t('workflows.type3dModels'),
    custom: t('workflows.typeMyWorkflows'),
  }), [t]);

  const userRole = (session?.user as { role?: string })?.role || "FREE";
  const planLimits = userRole === "TEAM_ADMIN" || userRole === "PLATFORM_ADMIN" ? STRIPE_PLANS.TEAM.limits : userRole === "PRO" ? STRIPE_PLANS.PRO.limits : userRole === "STARTER" ? STRIPE_PLANS.STARTER.limits : userRole === "MINI" ? STRIPE_PLANS.MINI.limits : STRIPE_PLANS.FREE.limits;
  const maxWorkflows = planLimits.maxWorkflows;
  const isAtLimit = (userRole === "FREE" || userRole === "MINI" || userRole === "STARTER") && maxWorkflows > 0 && workflows.length >= maxWorkflows;

  const handleNewWorkflow = useCallback(() => {
    if (isAtLimit) {
      setShowLimitModal(true);
      return;
    }
    router.push("/dashboard/workflows/new");
  }, [isAtLimit, router]);

  const load = useCallback(async () => {
    try {
      const { workflows } = await api.workflows.list();
      setWorkflows(workflows);
    } catch {
      // User not authenticated or server error — silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(t('workflows.confirmDelete').replace('{name}', name))) return;
    try {
      await api.workflows.delete(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      toast.success(t('workflows.deleted'));
    } catch {
      toast.error(t('workflows.deleteFailed'));
    }
  }

  const filteredWorkflows = workflows.filter(wf =>
    wf.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { grouped, ungrouped } = useMemo(() => groupWorkflows(filteredWorkflows, typeLabels), [filteredWorkflows, typeLabels]);

  // Render a single workflow card
  function renderCard(wf: WorkflowSummary, idx: number) {
    const wfType = getWorkflowType(wf.name, typeLabels);
    return (
      <motion.div
        key={wf.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(idx * 0.03, 0.5), duration: 0.3 }}
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12, padding: 16, cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex", flexDirection: "column", gap: 10,
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = `${wfType.color}25`;
          el.style.background = "rgba(255,255,255,0.04)";
          el.style.transform = "translateY(-1px)";
          el.style.boxShadow = `0 4px 20px rgba(0,0,0,0.25)`;
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "rgba(255,255,255,0.06)";
          el.style.background = "rgba(255,255,255,0.02)";
          el.style.transform = "translateY(0)";
          el.style.boxShadow = "none";
        }}
        onClick={() => router.push(`/dashboard/canvas?id=${wf.id}`)}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: `${wfType.color}12`,
              border: `1px solid ${wfType.color}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {wfType.icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: "#F0F0F5",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {wf.name}
              </div>
              {wf.description && (
                <div style={{
                  fontSize: 11, color: "#5C5C78", marginTop: 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {wf.description}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            <button
              onClick={e => { e.stopPropagation(); router.push(`/dashboard/canvas?id=${wf.id}`); }}
              style={{
                width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)",
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#5C5C78", transition: "all 0.15s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#00F5FF"; e.currentTarget.style.borderColor = "rgba(0,245,255,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#5C5C78"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
              title={t('workflows.openInCanvas')}
            >
              <ExternalLink size={11} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleDelete(wf.id, wf.name); }}
              style={{
                width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)",
                background: "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#5C5C78", transition: "all 0.15s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#5C5C78"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
              title={t('workflows.delete')}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#4A4A60" }}>
            <Clock size={9} />
            {formatRelativeTime(new Date(wf.updatedAt))}
          </div>
          <span style={{ color: "rgba(255,255,255,0.06)" }}>·</span>
          <div style={{ fontSize: 10, color: "#4A4A60" }}>
            {wf._count.executions} {wf._count.executions !== 1 ? t('workflows.runs') : t('workflows.run')}
          </div>
          {wf.isPublished && (
            <>
              <span style={{ color: "rgba(255,255,255,0.06)" }}>·</span>
              <div style={{ fontSize: 9, color: "#10B981", fontWeight: 600 }}>{t('workflows.published')}</div>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ position: "relative" }}>
      {/* Subtle ambient glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 60% 40% at 15% 5%, rgba(0,245,255,0.03) 0%, transparent 70%)",
      }} />

      <main className="flex-1 overflow-y-auto p-6" style={{ position: "relative", zIndex: 1 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 14 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: "2px solid rgba(0,245,255,0.12)",
                borderTopColor: "#00F5FF",
              }}
            />
            <div style={{ fontSize: 13, color: "#5C5C78" }}>{t('workflows.loading')}</div>
          </div>
        ) : workflows.length === 0 ? (
          /* ── Empty State — Creative ─────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              textAlign: "center", padding: "48px 32px",
              background: "rgba(12,12,22,0.5)",
              border: "1px solid rgba(255,255,255,0.04)",
              borderRadius: 24, position: "relative", overflow: "hidden",
            }}
          >
            {/* Background grid */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "linear-gradient(rgba(0,245,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.015) 1px, transparent 1px)",
              backgroundSize: "40px 40px", pointerEvents: "none",
              maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)",
            }} />

            {/* Animated mascot */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
              style={{ fontSize: 64, lineHeight: 1, marginBottom: 8, position: "relative", zIndex: 1 }}
            >
              🐹
            </motion.div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20, position: "relative", zIndex: 1 }}>
              {["🏗️", "✨", "📐", "✨", "🏗️"].map((s, i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.1, 0.9] }}
                  transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.3 }}
                  style={{ fontSize: 14 }}
                >{s}</motion.span>
              ))}
            </div>

            <h3 style={{
              fontSize: 22, fontWeight: 800, color: "#F0F0F5", marginBottom: 8,
              letterSpacing: "-0.03em", position: "relative", zIndex: 1,
            }}>
              Your canvas is suspiciously clean
            </h3>
            <p style={{
              fontSize: 14, color: "#7C7C96", maxWidth: 400, lineHeight: 1.7,
              marginBottom: 28, marginLeft: "auto", marginRight: "auto",
              position: "relative", zIndex: 1,
            }}>
              No workflows yet? That&apos;s like an architect with an empty desk. Let&apos;s fix that — start from scratch or grab a template.
            </p>

            <div className="flex items-center justify-center gap-3 mb-8" style={{ position: "relative", zIndex: 1 }}>
              <button
                onClick={handleNewWorkflow}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 14,
                  background: "linear-gradient(135deg, #00F5FF 0%, #0EA5E9 100%)",
                  color: "#0a0c10", fontSize: 14, fontWeight: 700,
                  border: "none", cursor: "pointer",
                  boxShadow: "0 6px 24px rgba(0,245,255,0.2)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 10px 32px rgba(0,245,255,0.35)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,245,255,0.2)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <Plus size={15} strokeWidth={2.5} />
                {t('workflows.newWorkflow')}
              </button>
              <Link
                href="/dashboard/templates"
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#F0F0F5", fontSize: 14, fontWeight: 600,
                  textDecoration: "none", transition: "all 0.2s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.2)"; e.currentTarget.style.background = "rgba(0,245,255,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              >
                {t('workflows.browseTemplates')}
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Quick-start template suggestions */}
            <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", position: "relative", zIndex: 1 }}>
              <p style={{
                fontSize: 10, color: "rgba(0,245,255,0.4)", textTransform: "uppercase",
                letterSpacing: "2px", fontWeight: 700, marginBottom: 14,
                fontFamily: "var(--font-jetbrains, monospace)",
              }}>
                {t('workflows.popularStartingPoints')}
              </p>
              <div className="workflows-page-templates" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: t('workflows.tplBrief3d'), desc: t('workflows.tplBrief3dDesc'), icon: <Box size={16} className="text-[#8B5CF6]" />, color: "#8B5CF6", rgb: "139,92,246", emoji: "🧊" },
                  { label: t('workflows.tplBriefRender'), desc: t('workflows.tplBriefRenderDesc'), icon: <ImageIcon size={16} className="text-[#10B981]" />, color: "#10B981", rgb: "16,185,129", emoji: "🎨" },
                  { label: t('workflows.tplBriefPipeline'), desc: t('workflows.tplBriefPipelineDesc'), icon: <Sparkles size={16} className="text-[#F59E0B]" />, color: "#F59E0B", rgb: "245,158,11", emoji: "⚡" },
                ].map((tpl, i) => (
                  <Link
                    key={i}
                    href="/dashboard/templates"
                    style={{
                      display: "block",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 14,
                      padding: "16px 14px",
                      textAlign: "left",
                      textDecoration: "none",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${tpl.rgb},0.3)`; e.currentTarget.style.background = `rgba(${tpl.rgb},0.04)`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{tpl.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#E0E0EA", marginBottom: 4 }}>{tpl.label}</div>
                    <div style={{ fontSize: 10, color: "#5C5C78", lineHeight: 1.5 }}>{tpl.desc}</div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Fun footer */}
            <p style={{
              fontSize: 11, color: "#2A2A3A", marginTop: 28, position: "relative", zIndex: 1,
              fontFamily: "var(--font-jetbrains, monospace)",
            }}>
              Every great building started with an empty canvas
            </p>
          </motion.div>
        ) : (
          /* ── Workflow List ────────────────────────────────────────────── */
          <div>
            {/* Header row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}
            >
              <div style={{ position: "relative", width: 280 }}>
                <Search size={13} style={{
                  position: "absolute", left: 11, top: "50%",
                  transform: "translateY(-50%)", color: "#55556A",
                  pointerEvents: "none",
                }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('workflows.searchPlaceholder')}
                  aria-label={t('workflows.searchAriaLabel')}
                  style={{
                    width: "100%", paddingLeft: 34, paddingRight: 12,
                    height: 36, borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.03)", color: "#F0F0F5",
                    fontSize: 12, outline: "none",
                    boxSizing: "border-box",
                    transition: "all 0.15s ease",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.25)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#5C5C78", whiteSpace: "nowrap" }}>
                  {filteredWorkflows.length} {filteredWorkflows.length !== 1 ? t('workflows.workflowsCount') : t('workflows.workflowCount')}
                </span>
                <button
                  onClick={handleNewWorkflow}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", borderRadius: 8,
                    background: "linear-gradient(135deg, #00F5FF 0%, #0EA5E9 100%)",
                    color: "#0a0c10", fontSize: 12, fontWeight: 700,
                    border: "none", cursor: "pointer",
                    boxShadow: "0 0 12px rgba(0,245,255,0.12)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(0,245,255,0.25)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 12px rgba(0,245,255,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <Plus size={12} strokeWidth={2.5} />
                  {t('workflows.newWorkflow')}
                </button>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
            {filteredWorkflows.length === 0 ? (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ padding: "60px 0", textAlign: "center" }}
              >
                <p style={{ fontSize: 14, color: "#3A3A50", marginBottom: 8 }}>
                  {t('workflows.noResultsPre')} &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    fontSize: 12, color: "#00F5FF", background: "none",
                    border: "none", cursor: "pointer", fontWeight: 600,
                  }}
                >
                  {t('workflows.clearSearch')}
                </button>
              </motion.div>
            ) : (
              <motion.div key="sections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Template-grouped sections */}
                {grouped.map((group, gi) => (
                  <div key={group.type.key} style={{ marginBottom: 28 }}>
                    {/* Section header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 12, paddingBottom: 8,
                      borderBottom: `1px solid ${group.type.color}12`,
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 7,
                        background: `${group.type.color}10`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {group.type.icon}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#E0E0EA" }}>
                        {group.type.label}
                      </span>
                      <span style={{
                        fontSize: 10, color: group.type.color, fontWeight: 600,
                        padding: "1px 6px", borderRadius: 4,
                        background: `${group.type.color}10`,
                      }}>
                        {group.items.length}
                      </span>
                      <ChevronRight size={12} style={{ color: "#3A3A50" }} />
                    </div>
                    {/* Cards grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                      {group.items.map((wf, i) => renderCard(wf, gi * 10 + i))}
                    </div>
                  </div>
                ))}

                {/* Ungrouped / custom workflows */}
                {ungrouped.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    {grouped.length > 0 && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        marginBottom: 12, paddingBottom: 8,
                        borderBottom: "1px solid rgba(0,245,255,0.08)",
                      }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 7,
                          background: "rgba(0,245,255,0.08)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <Workflow size={13} color="#00F5FF" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#E0E0EA" }}>
                          {t('workflows.myWorkflows')}
                        </span>
                        <span style={{
                          fontSize: 10, color: "#00F5FF", fontWeight: 600,
                          padding: "1px 6px", borderRadius: 4,
                          background: "rgba(0,245,255,0.08)",
                        }}>
                          {ungrouped.length}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                      {ungrouped.map((wf, i) => renderCard(wf, 100 + i))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ── Workflow Limit Modal — Creative ── */}
      <AnimatePresence>
        {showLimitModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLimitModal(false)}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(8px)",
                zIndex: 9990,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed", inset: 0, zIndex: 9991,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none", padding: 16,
              }}
            >
              <div style={{
                width: "100%", maxWidth: 460, borderRadius: 24, overflow: "hidden",
                background: "linear-gradient(180deg, #111125 0%, #0A0A18 100%)",
                border: "1px solid rgba(6,182,212,0.15)",
                boxShadow: "0 32px 100px rgba(0,0,0,0.7), 0 0 60px rgba(6,182,212,0.05)",
                pointerEvents: "auto",
              }}>
                {/* Top gradient bar */}
                <div style={{ height: 3, background: "linear-gradient(90deg, #06B6D4, #8B5CF6, #06B6D4)" }} />

                {/* Illustration area */}
                <div style={{
                  padding: "36px 32px 16px", textAlign: "center",
                  background: "radial-gradient(ellipse at 50% 80%, rgba(6,182,212,0.06) 0%, transparent 70%)",
                }}>
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    style={{ fontSize: 56, lineHeight: 1, marginBottom: 8 }}
                  >
                    🐙
                  </motion.div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
                    {["✨", "⭐", "💎", "⭐", "✨"].map((s, i) => (
                      <motion.span
                        key={i}
                        animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1.15, 0.8] }}
                        transition={{ repeat: Infinity, duration: 2, delay: i * 0.25 }}
                        style={{ fontSize: 12 }}
                      >{s}</motion.span>
                    ))}
                  </div>

                  <h2 style={{
                    fontSize: 22, fontWeight: 800, color: "#F0F2F8",
                    letterSpacing: "-0.03em", margin: "0 0 8px", lineHeight: 1.3,
                  }}>
                    {maxWorkflows} workflows? That&apos;s adorable!
                  </h2>
                  <p style={{
                    fontSize: 13, color: "#9898B0", lineHeight: 1.6, margin: 0,
                    maxWidth: 360, marginLeft: "auto", marginRight: "auto",
                  }}>
                    You&apos;ve filled up your {maxWorkflows} workflow slots on the{" "}
                    <strong style={{ color: "#06B6D4" }}>{userRole === "FREE" ? "Free" : userRole === "MINI" ? "Mini" : "Starter"}</strong> plan.
                    Time to level up and build without limits.
                  </p>
                </div>

                <div style={{ padding: "0 32px 24px" }}>
                  {/* What you get */}
                  <div style={{
                    background: "rgba(6,182,212,0.04)",
                    border: "1px solid rgba(6,182,212,0.1)",
                    borderRadius: 14, padding: "14px 18px",
                    margin: "16px 0 20px",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#06B6D4", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>
                      Upgrade perks
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { icon: "♾️", text: "Unlimited workflows (Pro)" },
                        { icon: "⚡", text: "Up to 100 runs per month" },
                        { icon: "🎬", text: "AI video walkthroughs" },
                        { icon: "🧊", text: "3D model generation" },
                      ].map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 15 }}>{f.icon}</span>
                          <span style={{ fontSize: 12.5, color: "#C0C0D8" }}>{f.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => { setShowLimitModal(false); router.push("/dashboard/billing"); }}
                    style={{
                      width: "100%", padding: "14px 24px", borderRadius: 14,
                      background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                      color: "#fff", fontSize: 15, fontWeight: 800, border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      boxShadow: "0 8px 32px rgba(6,182,212,0.25)",
                      transition: "all 0.2s ease", letterSpacing: "-0.01em",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(6,182,212,0.35)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(6,182,212,0.25)"; }}
                  >
                    <Zap size={18} />
                    Upgrade & Build Unlimited
                    <ArrowRight size={16} />
                  </button>

                  <button
                    onClick={() => setShowLimitModal(false)}
                    style={{
                      width: "100%", marginTop: 10, padding: "10px", borderRadius: 12,
                      background: "transparent", border: "none",
                      color: "#44445A", fontSize: 12, cursor: "pointer", transition: "color 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#9898B0"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#44445A"; }}
                  >
                    I&apos;ll manage with {maxWorkflows} for now
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
