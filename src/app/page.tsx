import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Layers,
  Sparkles,
  Globe,
  Box,
  FileText,
  Image as ImageIcon,
  Download,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F0F0F5]">
      {/* Nav */}
      <nav className="border-b border-[#1E1E2E] bg-[#0A0A0F]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#4F8AFF] to-[#8B5CF6] flex items-center justify-center">
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Neo<span className="text-[#4F8AFF]">BIM</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-[#2A2A3E] bg-[#12121A] px-4 py-2 text-sm font-medium text-[#F0F0F5] hover:border-[#3A3A4E] hover:bg-[#1A1A26] transition-all"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-[#4F8AFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3D7AFF] transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[#4F8AFF] opacity-[0.04] blur-3xl" />
          <div className="absolute top-1/3 right-1/4 h-[400px] w-[400px] rounded-full bg-[#8B5CF6] opacity-[0.03] blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2A2A3E] bg-[#12121A] px-4 py-1.5 text-xs text-[#8888A0] mb-8">
            <Sparkles size={11} className="text-[#8B5CF6]" />
            AI-powered workflow builder for AEC professionals
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Build generative{" "}
            <span className="text-gradient-blue">building workflows</span>
            <br />
            without writing code
          </h1>

          <p className="text-lg text-[#8888A0] max-w-2xl mx-auto mb-10 leading-relaxed">
            Drag-and-drop AEC nodes to create end-to-end AI pipelines. From PDF project
            brief to 3D massing to BIM export — in minutes, not weeks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl bg-[#4F8AFF] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#3D7AFF] transition-all shadow-lg shadow-[rgba(79,138,255,0.2)]"
            >
              Start Building Free
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/dashboard/templates"
              className="flex items-center gap-2 rounded-xl border border-[#2A2A3E] bg-[#12121A] px-6 py-3.5 text-base font-medium text-[#F0F0F5] hover:border-[#3A3A4E] hover:bg-[#1A1A26] transition-all"
            >
              Browse Templates
              <ChevronRight size={16} />
            </Link>
          </div>

          {/* Hero canvas preview */}
          <div className="relative rounded-2xl border border-[#2A2A3E] bg-[#0E0E16] overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-canvas-grid opacity-50" />
            <div className="relative p-8 flex items-center justify-center min-h-[300px]">
              {/* Workflow diagram */}
              <div className="flex items-center gap-4 overflow-x-auto">
                {[
                  { label: "PDF Upload", color: "#3B82F6", icon: FileText, category: "Input" },
                  { label: "Doc Parser", color: "#8B5CF6", icon: Sparkles, category: "AI" },
                  { label: "Requirements", color: "#8B5CF6", icon: Layers, category: "AI" },
                  { label: "Massing Gen", color: "#10B981", icon: Box, category: "Generate" },
                  { label: "Image Gen", color: "#10B981", icon: ImageIcon, category: "Generate" },
                  { label: "IFC Export", color: "#F59E0B", icon: Download, category: "Export" },
                ].map((node, i) => {
                  const Icon = node.icon;
                  return (
                    <div key={i} className="flex items-center gap-4 shrink-0">
                      <div
                        className="rounded-xl border w-[140px] bg-[#12121A] overflow-hidden"
                        style={{ borderColor: `${node.color}30` }}
                      >
                        <div
                          className="flex items-center gap-2 px-3 py-2.5"
                          style={{ backgroundColor: `${node.color}10` }}
                        >
                          <div style={{ color: node.color }}>
                            <Icon size={14} strokeWidth={1.5} />
                          </div>
                          <span className="text-xs font-semibold text-[#F0F0F5] truncate">
                            {node.label}
                          </span>
                        </div>
                        <div className="px-3 py-2 flex items-center justify-between border-t border-[#1E1E2E]">
                          <span
                            className="text-[9px] font-medium uppercase tracking-wider"
                            style={{ color: node.color, opacity: 0.7 }}
                          >
                            {node.category}
                          </span>
                          <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: node.color }}
                          />
                        </div>
                      </div>
                      {i < 5 && (
                        <div className="flex items-center gap-1">
                          <div className="h-px w-6 bg-[#4F8AFF] opacity-40" />
                          <div
                            className="h-0 w-0 border-l-[5px] border-y-[3px]"
                            style={{
                              borderLeftColor: "rgba(79,138,255,0.4)",
                              borderTopColor: "transparent",
                              borderBottomColor: "transparent",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Everything AEC needs. Nothing it doesn{"'"}t.</h2>
          <p className="text-[#8888A0] max-w-lg mx-auto">
            28 purpose-built nodes for the architecture, engineering, and construction workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              color: "#3B82F6",
              title: "7 Input Nodes",
              description: "PDF, IFC, images, CAD files, location data, and parameters",
              items: ["PDF Upload", "IFC Upload", "Location Input", "DXF/DWG"],
            },
            {
              color: "#8B5CF6",
              title: "12 AI Transform Nodes",
              description: "Document parsing, requirements extraction, compliance checking",
              items: ["Doc Parser", "Requirements AI", "Zoning Compliance", "BIM Query"],
            },
            {
              color: "#10B981",
              title: "6 Generation Nodes",
              description: "3D massing, image generation, floor plans, and façades",
              items: ["Massing Gen", "Image Gen", "Floor Plan Gen", "Variant Gen"],
            },
            {
              color: "#F59E0B",
              title: "6 Export Nodes",
              description: "IFC files, BOQ spreadsheets, PDF reports, and Speckle sharing",
              items: ["IFC Exporter", "BOQ XLSX", "PDF Report", "Speckle Publish"],
            },
          ].map((feat) => (
            <div
              key={feat.title}
              className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5 hover:border-[#2A2A3E] transition-colors"
            >
              <div
                className="h-8 w-8 rounded-lg mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${feat.color}15`, border: `1px solid ${feat.color}30` }}
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: feat.color }} />
              </div>
              <h3 className="text-sm font-bold text-[#F0F0F5] mb-1.5">{feat.title}</h3>
              <p className="text-[11px] text-[#55556A] leading-relaxed mb-3">
                {feat.description}
              </p>
              <ul className="space-y-1">
                {feat.items.map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-[11px] text-[#8888A0]">
                    <div className="h-1 w-1 rounded-full" style={{ backgroundColor: feat.color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-[#1E1E2E]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Start building in{" "}
            <span className="text-gradient-blue">60 seconds</span>
          </h2>
          <p className="text-[#8888A0] mb-8">
            No setup. No API keys. Just pick a prebuilt workflow and watch it run.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-[#4F8AFF] px-8 py-4 text-base font-semibold text-white hover:bg-[#3D7AFF] transition-all shadow-lg shadow-[rgba(79,138,255,0.2)]"
          >
            Open Dashboard
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E1E2E] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-[#4F8AFF] to-[#8B5CF6] flex items-center justify-center">
              <Zap size={11} className="text-white" fill="white" />
            </div>
            <span className="text-sm font-bold">
              Neo<span className="text-[#4F8AFF]">BIM</span>
            </span>
          </div>
          <p className="text-[11px] text-[#3A3A4E]">
            © 2026 NeoBIM. Built for the AEC industry.
          </p>
        </div>
      </footer>
    </div>
  );
}
