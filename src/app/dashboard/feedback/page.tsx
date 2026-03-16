"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/Header";
import { PageBackground } from "@/components/dashboard/PageBackground";
import { useLocale } from "@/hooks/useLocale";
import {
  Bug,
  Lightbulb,
  Compass,
  X,
  Send,
  Loader2,
  CheckCircle2,
  ImagePlus,
  Clock,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  Building2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

type FeedbackType = "BUG" | "FEATURE" | "SUGGESTION";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  category: string | null;
  screenshotUrl: string | null;
  status: string;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const FEEDBACK_TYPES = [
  {
    id: "BUG" as FeedbackType,
    icon: Bug,
    color: "#EF4444",
    label: "Bug Report",
    labelDe: "Fehlermeldung",
    description: "Something isn't working correctly",
    descDe: "Etwas funktioniert nicht richtig",
  },
  {
    id: "FEATURE" as FeedbackType,
    icon: Lightbulb,
    color: "#F59E0B",
    label: "Feature Request",
    labelDe: "Funktionswunsch",
    description: "Suggest a new feature or improvement",
    descDe: "Neue Funktion oder Verbesserung vorschlagen",
  },
  {
    id: "SUGGESTION" as FeedbackType,
    icon: Compass,
    color: "#10B981",
    label: "AEC Industry Suggestion",
    labelDe: "AEC-Branchenvorschlag",
    description: "What does the AEC industry need?",
    descDe: "Was braucht die AEC-Branche?",
  },
];

const AEC_CATEGORIES = [
  "BIM / IFC",
  "3D Modeling",
  "Floor Plans",
  "Cost Estimation",
  "Rendering",
  "PDF Processing",
  "Collaboration",
  "Revit Integration",
  "Rhino / Grasshopper",
  "Site Analysis",
  "Sustainability",
  "Structural Analysis",
  "MEP Systems",
  "Construction Docs",
  "Other",
];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  NEW: { bg: "rgba(79,138,255,0.1)", text: "#4F8AFF", label: "New" },
  REVIEWING: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B", label: "Reviewing" },
  PLANNED: { bg: "rgba(139,92,246,0.1)", text: "#8B5CF6", label: "Planned" },
  IN_PROGRESS: { bg: "rgba(0,245,255,0.1)", text: "#00F5FF", label: "In Progress" },
  DONE: { bg: "rgba(16,185,129,0.1)", text: "#10B981", label: "Done" },
  DECLINED: { bg: "rgba(239,68,68,0.1)", text: "#EF4444", label: "Declined" },
};

const smoothEase: [number, number, number, number] = [0.25, 0.4, 0.25, 1];

// ─── Component ──────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { locale } = useLocale();
  const isDE = locale === "de";

  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load feedback history
  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((data) => {
        if (data.feedbacks) setHistory(data.feedbacks);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [submitted]);

  const handleScreenshot = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Screenshot must be under 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleScreenshot(file);
          break;
        }
      }
    },
    [handleScreenshot],
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !title.trim() || !description.trim()) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("type", selectedType);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      if (category) formData.append("category", category);
      if (screenshot) formData.append("screenshot", screenshot);
      formData.append("pageUrl", window.location.href);

      const res = await fetch("/api/feedback", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to submit feedback");
        return;
      }

      setSubmitted(true);
      toast.success(isDE ? "Feedback gesendet!" : "Feedback submitted!", {
        icon: <CheckCircle2 size={18} />,
      });
    } catch {
      toast.error(isDE ? "Fehler beim Senden" : "Failed to submit");
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSelectedType(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setScreenshot(null);
    setScreenshotPreview(null);
    setSubmitted(false);
  };

  const inputStyle = (field: string, isTextarea = false) => ({
    width: "100%",
    padding: "12px 16px",
    height: isTextarea ? 160 : 48,
    borderRadius: 12,
    border: `1px solid ${focusedField === field ? "rgba(79,138,255,0.4)" : "rgba(255,255,255,0.06)"}`,
    background: "rgba(8,8,15,0.6)",
    color: "#F0F0F5",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(79,138,255,0.08)" : "none",
    resize: "none" as const,
    fontFamily: "inherit",
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      <PageBackground />

      <Header
        title={isDE ? "Beta-Feedback" : "Beta Feedback"}
        subtitle={isDE ? "Helfen Sie uns, das beste AEC-Tool zu bauen" : "Help us build the best AEC workflow tool"}
      />

      <main className="flex-1 overflow-y-auto relative z-1">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 80px" }}>
          {/* ── Success State ────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: smoothEase }}
                style={{
                  textAlign: "center",
                  padding: "64px 24px",
                  borderRadius: 16,
                  border: "1px solid rgba(16,185,129,0.15)",
                  background: "rgba(16,185,129,0.03)",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                  }}
                >
                  <CheckCircle2 size={32} color="#10B981" />
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#F0F0F5", marginBottom: 10 }}>
                  {isDE ? "Vielen Dank!" : "Thank You!"}
                </h2>
                <p style={{ fontSize: 15, color: "#9898B0", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
                  {isDE
                    ? "Ihr Feedback wurde erfolgreich gesendet. Wir schauen es uns genau an und melden uns, wenn wir Fragen haben."
                    : "Your feedback has been submitted successfully. Our team reviews every submission and we'll follow up if we have questions."}
                </p>
                <button
                  onClick={resetForm}
                  style={{
                    padding: "12px 28px",
                    borderRadius: 12,
                    border: "1px solid rgba(79,138,255,0.2)",
                    background: "rgba(79,138,255,0.06)",
                    color: "#4F8AFF",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {isDE ? "Weiteres Feedback senden" : "Submit More Feedback"}
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* ── Step 1: Choose Type ─────────────────────── */}
                <div style={{ marginBottom: 28 }}>
                  <h3
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#7C7C96",
                      textTransform: "uppercase",
                      letterSpacing: "1.5px",
                      marginBottom: 14,
                      fontFamily: "var(--font-jetbrains), monospace",
                    }}
                  >
                    {isDE ? "1. Art des Feedbacks" : "1. Type of Feedback"}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                    {FEEDBACK_TYPES.map((ft) => {
                      const isSelected = selectedType === ft.id;
                      return (
                        <motion.button
                          key={ft.id}
                          onClick={() => setSelectedType(ft.id)}
                          whileHover={{ scale: 1.01, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 14,
                            padding: "18px 20px",
                            borderRadius: 14,
                            border: `1px solid ${isSelected ? `${ft.color}40` : "rgba(255,255,255,0.06)"}`,
                            background: isSelected ? `${ft.color}08` : "rgba(255,255,255,0.02)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          {isSelected && (
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: 3,
                                height: "100%",
                                background: ft.color,
                                borderRadius: "0 2px 2px 0",
                              }}
                            />
                          )}
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: `${ft.color}15`,
                              border: `1px solid ${ft.color}20`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <ft.icon size={18} color={ft.color} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? ft.color : "#E0E0F0", marginBottom: 3 }}>
                              {isDE ? ft.labelDe : ft.label}
                            </div>
                            <div style={{ fontSize: 12, color: "#7C7C96", lineHeight: 1.4 }}>
                              {isDE ? ft.descDe : ft.description}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Step 2: Details ─────────────────────────── */}
                <AnimatePresence>
                  {selectedType && (
                    <motion.form
                      onSubmit={handleSubmit}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: smoothEase }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        style={{
                          padding: "24px",
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.06)",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#7C7C96",
                            textTransform: "uppercase",
                            letterSpacing: "1.5px",
                            marginBottom: 18,
                            fontFamily: "var(--font-jetbrains), monospace",
                          }}
                        >
                          {isDE ? "2. Details" : "2. Details"}
                        </h3>

                        {/* Title */}
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#B0B0C8", marginBottom: 6 }}>
                            {isDE ? "Titel" : "Title"} <span style={{ color: "#EF4444" }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder={
                              selectedType === "BUG"
                                ? isDE ? "z.B. Workflow-Canvas friert ein beim Zoomen" : "e.g. Workflow canvas freezes when zooming"
                                : selectedType === "FEATURE"
                                  ? isDE ? "z.B. Revit-Export-Node hinzufuegen" : "e.g. Add Revit export node"
                                  : isDE ? "z.B. COBie-Datenextraktion aus IFC" : "e.g. COBie data extraction from IFC"
                            }
                            required
                            maxLength={200}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onFocus={() => setFocusedField("title")}
                            onBlur={() => setFocusedField(null)}
                            style={inputStyle("title")}
                          />
                          <div style={{ fontSize: 11, color: "#5C5C78", marginTop: 4, textAlign: "right" }}>{title.length}/200</div>
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#B0B0C8", marginBottom: 6 }}>
                            {isDE ? "Beschreibung" : "Description"} <span style={{ color: "#EF4444" }}>*</span>
                          </label>
                          <textarea
                            placeholder={
                              selectedType === "BUG"
                                ? isDE
                                  ? "Was ist passiert? Was haben Sie erwartet? Schritte zum Reproduzieren..."
                                  : "What happened? What did you expect? Steps to reproduce..."
                                : selectedType === "FEATURE"
                                  ? isDE
                                    ? "Beschreiben Sie die Funktion und wie sie Ihren Workflow verbessern wuerde..."
                                    : "Describe the feature and how it would improve your workflow..."
                                  : isDE
                                    ? "Was fehlt der AEC-Branche? Welche Prozesse koennten automatisiert werden?"
                                    : "What's missing in AEC? What processes could be automated?"
                            }
                            required
                            maxLength={5000}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onFocus={() => setFocusedField("description")}
                            onBlur={() => setFocusedField(null)}
                            style={inputStyle("description", true)}
                          />
                          <div style={{ fontSize: 11, color: "#5C5C78", marginTop: 4, textAlign: "right" }}>
                            {description.length}/5000
                          </div>
                        </div>

                        {/* Category Tags */}
                        <div style={{ marginBottom: 20 }}>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#B0B0C8", marginBottom: 8 }}>
                            {isDE ? "Kategorie (optional)" : "Category (optional)"}
                          </label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {AEC_CATEGORIES.map((cat) => {
                              const isSelected = category === cat;
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => setCategory(isSelected ? "" : cat)}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: 20,
                                    border: `1px solid ${isSelected ? "rgba(79,138,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                                    background: isSelected ? "rgba(79,138,255,0.1)" : "rgba(255,255,255,0.02)",
                                    color: isSelected ? "#4F8AFF" : "#9898B0",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                  }}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Screenshot Upload */}
                        <div style={{ marginBottom: 24 }}>
                          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#B0B0C8", marginBottom: 8 }}>
                            {isDE ? "Screenshot (optional)" : "Screenshot (optional)"}
                          </label>

                          {screenshotPreview ? (
                            <div style={{ position: "relative", display: "inline-block" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={screenshotPreview}
                                alt="Screenshot preview"
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: 200,
                                  borderRadius: 12,
                                  border: "1px solid rgba(255,255,255,0.08)",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setScreenshot(null);
                                  setScreenshotPreview(null);
                                }}
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  background: "rgba(0,0,0,0.7)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              style={{
                                width: "100%",
                                padding: "28px 20px",
                                borderRadius: 12,
                                border: "2px dashed rgba(255,255,255,0.08)",
                                background: "rgba(255,255,255,0.01)",
                                color: "#7C7C96",
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 8,
                                transition: "all 0.2s",
                              }}
                            >
                              <ImagePlus size={24} strokeWidth={1.5} />
                              <span style={{ fontSize: 13 }}>
                                {isDE ? "Bild hochladen oder einfuegen (Ctrl+V)" : "Upload or paste image (Ctrl+V)"}
                              </span>
                              <span style={{ fontSize: 11, color: "#5C5C78" }}>PNG, JPG, WebP - max 5MB</span>
                            </button>
                          )}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleScreenshot(file);
                            }}
                            style={{ display: "none" }}
                          />
                        </div>

                        {/* Submit */}
                        <motion.button
                          type="submit"
                          disabled={sending || !title.trim() || !description.trim()}
                          whileHover={{ scale: 1.005 }}
                          whileTap={{ scale: 0.995 }}
                          style={{
                            width: "100%",
                            padding: "14px 24px",
                            borderRadius: 12,
                            border: "none",
                            fontSize: 14,
                            fontWeight: 700,
                            color: "white",
                            background: "linear-gradient(135deg, #4F8AFF 0%, #6366F1 100%)",
                            boxShadow: "0 2px 16px rgba(79,138,255,0.3)",
                            cursor: sending || !title.trim() || !description.trim() ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            opacity: sending || !title.trim() || !description.trim() ? 0.5 : 1,
                            transition: "opacity 0.2s",
                          }}
                        >
                          {sending ? (
                            <>
                              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                              {isDE ? "Wird gesendet..." : "Submitting..."}
                            </>
                          ) : (
                            <>
                              <Send size={16} />
                              {isDE ? "Feedback senden" : "Submit Feedback"}
                            </>
                          )}
                        </motion.button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── My Feedback History ──────────────────────────── */}
          <div style={{ marginTop: 40 }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                color: "#7C7C96",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                fontFamily: "var(--font-jetbrains), monospace",
                cursor: "pointer",
                background: "none",
                border: "none",
                padding: "8px 0",
                width: "100%",
              }}
            >
              <Clock size={14} />
              {isDE ? "Meine Einreichungen" : "My Submissions"}
              {history.length > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: "rgba(79,138,255,0.1)",
                    color: "#4F8AFF",
                    fontWeight: 600,
                  }}
                >
                  {history.length}
                </span>
              )}
              <ChevronDown
                size={14}
                style={{
                  marginLeft: "auto",
                  transition: "transform 0.2s",
                  transform: showHistory ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: smoothEase }}
                  style={{ overflow: "hidden" }}
                >
                  {loadingHistory ? (
                    <div style={{ padding: "32px 0", textAlign: "center", color: "#7C7C96" }}>
                      <Loader2 size={20} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
                      {isDE ? "Laden..." : "Loading..."}
                    </div>
                  ) : history.length === 0 ? (
                    <div
                      style={{
                        padding: "40px 24px",
                        textAlign: "center",
                        color: "#5C5C78",
                        fontSize: 14,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.04)",
                        background: "rgba(255,255,255,0.01)",
                        marginTop: 12,
                      }}
                    >
                      {isDE ? "Noch kein Feedback eingereicht" : "No feedback submitted yet"}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                      {history.map((item) => {
                        const typeInfo = FEEDBACK_TYPES.find((ft) => ft.id === item.type);
                        const statusInfo = STATUS_COLORS[item.status] || STATUS_COLORS.NEW;
                        const TypeIcon = typeInfo?.icon || AlertTriangle;

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                              padding: "16px 20px",
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.06)",
                              background: "rgba(255,255,255,0.02)",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 14,
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: `${typeInfo?.color || "#666"}12`,
                                border: `1px solid ${typeInfo?.color || "#666"}20`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                marginTop: 2,
                              }}
                            >
                              <TypeIcon size={15} color={typeInfo?.color || "#666"} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: "#E0E0F0" }}>{item.title}</span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: "2px 8px",
                                    borderRadius: 10,
                                    background: statusInfo.bg,
                                    color: statusInfo.text,
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                  }}
                                >
                                  {statusInfo.label}
                                </span>
                                {item.category && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      padding: "2px 8px",
                                      borderRadius: 10,
                                      background: "rgba(255,255,255,0.04)",
                                      color: "#9898B0",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "#7C7C96",
                                  lineHeight: 1.5,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {item.description}
                              </p>
                              <div style={{ fontSize: 11, color: "#5C5C78", marginTop: 6 }}>
                                {new Date(item.createdAt).toLocaleDateString(isDE ? "de-DE" : "en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── What We're Looking For ───────────────────────── */}
          <div style={{ marginTop: 40 }}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#7C7C96",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                marginBottom: 14,
                fontFamily: "var(--font-jetbrains), monospace",
              }}
            >
              {isDE ? "Was uns besonders interessiert" : "What we're especially looking for"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
              {[
                {
                  icon: Building2,
                  color: "#4F8AFF",
                  title: isDE ? "AEC-Workflows" : "AEC Workflows",
                  desc: isDE
                    ? "Welche Prozesse in Ihrem Buero koennten automatisiert werden?"
                    : "What processes in your office could be automated?",
                },
                {
                  icon: Sparkles,
                  color: "#F59E0B",
                  title: isDE ? "KI-Integration" : "AI Integration",
                  desc: isDE
                    ? "Wo wuerde KI den groessten Unterschied machen?"
                    : "Where would AI make the biggest difference?",
                },
                {
                  icon: AlertTriangle,
                  color: "#EF4444",
                  title: isDE ? "Schmerzpunkte" : "Pain Points",
                  desc: isDE
                    ? "Was frustriert Sie am meisten an bestehenden Tools?"
                    : "What frustrates you most about existing tools?",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    padding: "20px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.04)",
                    background: "rgba(255,255,255,0.015)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${card.color}12`,
                      border: `1px solid ${card.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <card.icon size={16} color={card.color} />
                  </div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: "#E0E0F0", marginBottom: 4 }}>{card.title}</h4>
                  <p style={{ fontSize: 12, color: "#7C7C96", lineHeight: 1.5 }}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
