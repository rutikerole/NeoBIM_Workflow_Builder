"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  Globe,
  BookOpen,
  Settings,
  Zap,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/workflows",
    label: "My Workflows",
    icon: Workflow,
  },
  {
    href: "/dashboard/templates",
    label: "Templates",
    icon: BookOpen,
    badge: "10",
  },
  {
    href: "/dashboard/community",
    label: "Community",
    icon: Globe,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col h-full w-[220px] bg-[#0A0A0F] border-r border-[#1E1E2E]">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#1E1E2E]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#4F8AFF] to-[#8B5CF6] flex items-center justify-center">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="text-[15px] font-bold text-[#F0F0F5] tracking-tight">
            Neo<span className="text-[#4F8AFF]">BIM</span>
          </span>
        </Link>
      </div>

      {/* New Workflow Button */}
      <div className="px-3 pt-4">
        <Link
          href="/dashboard/workflows/new"
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            "bg-[#4F8AFF] text-white hover:bg-[#3D7AFF] active:bg-[#2B6AEF]",
            "shadow-sm"
          )}
        >
          <Plus size={14} />
          New Workflow
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-[#1A1A26] text-[#F0F0F5] border border-[#2A2A3E]"
                  : "text-[#8888A0] hover:text-[#F0F0F5] hover:bg-[#12121A]"
              )}
            >
              <Icon
                size={15}
                className={cn(
                  "shrink-0 transition-colors",
                  isActive ? "text-[#4F8AFF]" : "text-[#55556A] group-hover:text-[#8888A0]"
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2A2A3E] text-[#55556A]">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <ChevronRight size={12} className="text-[#4F8AFF] shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#1E1E2E]">
        <div className="rounded-lg bg-[#12121A] border border-[#1E1E2E] p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            <span className="text-[10px] font-medium text-[#10B981]">Free Plan</span>
          </div>
          <p className="text-[10px] text-[#55556A] leading-relaxed">
            Upgrade to Pro for unlimited executions and community publishing.
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-2 block text-[10px] font-medium text-[#4F8AFF] hover:text-[#3D7AFF] transition-colors"
          >
            Upgrade →
          </Link>
        </div>
      </div>
    </aside>
  );
}
