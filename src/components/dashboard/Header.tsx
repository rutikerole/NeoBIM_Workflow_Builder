"use client";

import { Bell, Search, User } from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[#1E1E2E] bg-[#0A0A0F]">
      <div>
        {title && (
          <h1 className="text-lg font-semibold text-[#F0F0F5]">{title}</h1>
        )}
        {subtitle && (
          <p className="text-xs text-[#55556A] mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="h-8 flex items-center gap-2 rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-xs text-[#55556A] hover:border-[#2A2A3E] hover:text-[#8888A0] transition-all">
          <Search size={12} />
          <span>Search...</span>
          <kbd className="ml-1 rounded bg-[#1A1A26] border border-[#2A2A3E] px-1 text-[9px] text-[#3A3A4E]">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#1E1E2E] bg-[#12121A] text-[#55556A] hover:text-[#F0F0F5] hover:border-[#2A2A3E] transition-all">
          <Bell size={13} />
        </button>

        {/* Avatar */}
        <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#1E1E2E] bg-[#1A1A26] text-[#55556A] hover:text-[#F0F0F5] hover:border-[#2A2A3E] transition-all">
          <User size={13} />
        </button>
      </div>
    </header>
  );
}
