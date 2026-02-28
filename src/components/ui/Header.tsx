"use client";

import { Sun, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="glass-panel flex items-center justify-between px-4 py-3 rounded-[20px]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Sun className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white/90 leading-tight tracking-tight">
            Golden Hour Chicago
          </h1>
          <p className="text-xs text-white/40">Patio Sunlight Tracker</p>
        </div>
      </div>

      <button
        onClick={onToggleSidebar}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center transition-all",
          sidebarOpen
            ? "bg-white/[0.15] text-white"
            : "hover:bg-white/[0.08] text-white/60"
        )}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </header>
  );
}
