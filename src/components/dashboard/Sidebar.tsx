"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Workflow,
  Globe,
  BookOpen,
  Settings,
  Zap,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  LogOut,
  History,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { PREBUILT_WORKFLOWS } from "@/constants/prebuilt-workflows";

// ─── Nav items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",            label: "Dashboard",   icon: LayoutDashboard, exact: true },
  { href: "/dashboard/workflows",  label: "My Workflows",icon: Workflow },
  { href: "/dashboard/history",    label: "History",     icon: History },
  { href: "/dashboard/analytics",  label: "Analytics",   icon: BarChart3 },
  { href: "/dashboard/templates",  label: "Templates",   icon: BookOpen,  badge: String(PREBUILT_WORKFLOWS.length) },
  { href: "/dashboard/community",  label: "Community",   icon: Globe },
  { href: "/dashboard/billing",    label: "Billing",     icon: CreditCard },
  { href: "/dashboard/settings",   label: "Settings",    icon: Settings },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname    = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  // Delay label appearance on expand so the sidebar opens first
  const [showLabels, setShowLabels] = useState(true);
  useEffect(() => {
    if (!collapsed) {
      const t = setTimeout(() => setShowLabels(true), 130);
      return () => clearTimeout(t);
    }
  }, [collapsed]);

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 232 }}
      transition={{ type: "spring", stiffness: 360, damping: 34 }}
      className="flex flex-col h-full bg-[#06060c] border-r border-r-white/[0.06] overflow-hidden shrink-0 relative"
    >
      {/* Subtle atmospheric glow at top */}
      <div className="absolute top-0 left-0 right-0 h-[120px] bg-[radial-gradient(ellipse_at_50%_-20%,rgba(79,138,255,0.04),transparent_70%)] pointer-events-none" />

      {/* ── Logo row ─────────────────────────────────────────────────────── */}
      <div className={cn(
        "flex items-center border-b border-b-white/[0.04] min-h-[56px] shrink-0 relative",
        collapsed ? "justify-center py-3.5 px-0" : "justify-between pt-3.5 pr-[18px] pb-3.5 pl-5",
      )}>
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline overflow-hidden">
          {/* Logo icon */}
          <div className="w-[30px] h-[30px] rounded-[9px] shrink-0 bg-[linear-gradient(135deg,#4F8AFF_0%,#7C6FF7_50%,#A78BFA_100%)] flex items-center justify-center shadow-[0_2px_12px_rgba(79,138,255,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]">
            <Zap size={14} color="white" fill="white" />
          </div>

          {showLabels && (
            <span className="text-base font-bold text-[#F0F0F5] tracking-[-0.4px] whitespace-nowrap">
              Build<span className="text-[#4F8AFF]">Flow</span>
            </span>
          )}
        </Link>

        {/* Collapse button */}
        {showLabels && (
          <button
            onClick={() => { setCollapsed(true); setShowLabels(false); }}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="w-[22px] h-[22px] rounded-md border-none bg-transparent cursor-pointer shrink-0 flex items-center justify-center text-[#2E2E40] transition-all duration-150 hover:text-[#9898B0] hover:bg-white/[0.04]"
          >
            <ChevronLeft size={13} />
          </button>
        )}
      </div>

      {/* ── New Workflow button ───────────────────────────────────────────── */}
      <div className={cn("shrink-0", collapsed ? "p-[12px_10px]" : "p-3")}>
        <Link
          href="/dashboard/workflows/new"
          className={cn(
            "press-effect flex items-center justify-center gap-[7px] h-10 rounded-[10px]",
            "bg-[linear-gradient(to_right,#4F8AFF,#6366F1)] text-white font-semibold text-sm",
            "no-underline whitespace-nowrap transition-all duration-200",
            "shadow-[0_2px_16px_rgba(79,138,255,0.25)] hover:shadow-[0_4px_24px_rgba(79,138,255,0.4)] hover:brightness-110",
            collapsed ? "p-[9px]" : "p-0",
          )}
        >
          <Plus size={14} strokeWidth={2.5} className="shrink-0" />
          {showLabels && <span>New Workflow</span>}
        </Link>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav aria-label="Main navigation" className="flex-1 px-2 py-1.5 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              badge={item.badge}
              icon={<Icon size={18} strokeWidth={isActive ? 2 : 1.5} className={cn("shrink-0 transition-colors duration-[120ms]", isActive ? "text-[#4F8AFF]" : "text-[#5C5C78]")} />}
              isActive={isActive}
              collapsed={collapsed}
              showLabels={showLabels}
            />
          );
        })}
      </nav>

      {/* ── User info + sign out ─────────────────────────────────────────── */}
      {showLabels && (
        <div className="px-4 pt-3 pb-3.5 border-t border-t-white/[0.04] shrink-0">
          {session?.user ? (
            <div className="flex flex-col gap-2.5">
              {/* User row */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[9px] shrink-0 bg-[linear-gradient(135deg,#4F8AFF_0%,#8B5CF6_100%)] flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-[0_2px_8px_rgba(79,138,255,0.2)]">
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (session.user.name ?? session.user.email ?? "U")[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#F0F0F5] overflow-hidden text-ellipsis whitespace-nowrap">
                    {session.user.name ?? "User"}
                  </div>
                  <div className="text-[10px] text-[#5C5C78] overflow-hidden text-ellipsis whitespace-nowrap">
                    {session.user.email}
                  </div>
                </div>
              </div>

              {/* Upgrade + Sign out row */}
              <div className="flex items-center justify-between">
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center gap-[5px] text-[10.5px] font-semibold text-[#4F8AFF] no-underline px-2 py-[3px] rounded-md bg-[rgba(79,138,255,0.06)] border border-[rgba(79,138,255,0.12)] hover:bg-[rgba(79,138,255,0.12)] hover:border-[rgba(79,138,255,0.25)] transition-all duration-150"
                >
                  <TrendingUp size={10} />
                  Upgrade
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-1 text-[10.5px] text-[#55556A] bg-none border-none cursor-pointer px-1.5 py-[3px] rounded-md hover:text-red-500 hover:bg-red-500/[0.06] transition-all duration-150"
                >
                  <LogOut size={10} />
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="block text-center text-xs text-[#4F8AFF] no-underline p-1.5 rounded-lg"
            >
              Sign in
            </Link>
          )}
        </div>
      )}

      {/* ── Expand button (collapsed state footer) ───────────────────────── */}
      {collapsed && (
        <div className="p-2.5 border-t border-t-white/[0.06] shrink-0">
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="w-full flex items-center justify-center py-2 rounded-lg border-none bg-transparent cursor-pointer text-[#2E2E40] hover:text-[#9898B0] hover:bg-white/[0.04] transition-all duration-150"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </motion.aside>
  );
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  href: string;
  label: string;
  badge?: string;
  icon: React.ReactNode;
  isActive: boolean;
  collapsed: boolean;
  showLabels: boolean;
}

function NavItem({ href, label, badge, icon, isActive, collapsed, showLabels }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 h-[38px] rounded-lg no-underline transition-all duration-150 overflow-hidden relative",
        collapsed ? "py-2.5 px-0 justify-center" : "px-3 justify-start",
        isActive
          ? "bg-white/[0.06]"
          : "bg-transparent hover:bg-white/[0.04]",
      )}
    >
      {/* Active left bar indicator */}
      {isActive && !collapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#4F8AFF] rounded-r-full pointer-events-none" />
      )}

      <span className="relative flex">{icon}</span>

      {showLabels && (
        <>
          <span className={cn(
            "flex-1 text-[13px] whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-150 tracking-[-0.01em]",
            isActive
              ? "font-semibold text-[#F0F0F5]"
              : "font-normal text-[#5C5C78] hover:text-[#9898B0]",
          )}>
            {label}
          </span>

          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md shrink-0 bg-violet-500/15 text-violet-400 font-semibold">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
