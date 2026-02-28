"use client";

import { Sun } from "lucide-react";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="glass-panel flex items-center px-3 py-2.5 rounded-[20px]">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Sun className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white/90 leading-tight tracking-tight">
            Chicago Booze Map
          </h1>
          <p className="text-[10px] text-white/40">Patio Sunlight Tracker</p>
        </div>
      </div>
    </header>
  );
}
