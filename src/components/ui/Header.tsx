"use client";

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onTitleClick?: () => void;
}

export function Header({ sidebarOpen, onToggleSidebar, onTitleClick }: HeaderProps) {
  return (
    <header className="glass-panel flex items-center px-3 py-2.5 rounded-[20px]">
      <button className="flex items-center gap-2.5" onClick={onTitleClick}>
        <div className="sun-orb">
          <div className="sun-orb-core" />
          <div className="sun-orb-corona" />
        </div>
        <div className="text-left">
          <h1 className="text-sm font-semibold text-white/90 leading-tight tracking-tight">
            Chicago Booze Map
          </h1>
          <p className="text-xs text-white/40">Patio Sunlight Tracker</p>
        </div>
      </button>
    </header>
  );
}
