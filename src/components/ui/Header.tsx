"use client";

import { Sun, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="glass-panel flex items-center justify-between px-4 py-3 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Sun className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white leading-tight">
            Golden Hour Chicago
          </h1>
          <p className="text-xs text-white/50">Patio Sunlight Tracker</p>
        </div>
      </div>

      <button
        onClick={onToggleSidebar}
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
          "hover:bg-white/10 text-white/70"
        )}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </header>
  );
}
