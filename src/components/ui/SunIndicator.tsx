"use client";

import { useEffect, useState } from "react";
import { getSunPosition, isSunUp } from "@/lib/suncalc-utils";

interface SunIndicatorProps {
  date: Date;
  mapBearing: number;
}

function getCardinalDirection(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function SunIndicator({ date, mapBearing }: SunIndicatorProps) {
  const [position, setPosition] = useState({ x: 0, y: 0, visible: false });
  const [sunInfo, setSunInfo] = useState({ azimuth: 0, altitude: 0, cardinal: "" });

  useEffect(() => {
    if (!isSunUp(date)) {
      setPosition((p) => ({ ...p, visible: false }));
      return;
    }

    const { azimuthDegrees, altitudeDegrees } = getSunPosition(date);
    const cardinal = getCardinalDirection(azimuthDegrees);
    setSunInfo({ azimuth: azimuthDegrees, altitude: altitudeDegrees, cardinal });

    // Position sun on viewport edge relative to map bearing
    const relativeAngle = azimuthDegrees - mapBearing;
    const rad = (relativeAngle * Math.PI) / 180;

    const w = typeof window !== "undefined" ? window.innerWidth : 1000;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const cx = w / 2;
    const cy = h / 2;

    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);

    // Find where the ray hits the screen edge
    let scale = Infinity;
    if (dx !== 0) scale = Math.min(scale, Math.abs((cx - 40) / dx));
    if (dy !== 0) scale = Math.min(scale, Math.abs((cy - 40) / dy));
    scale = Math.max(scale * 0.95, 100);

    setPosition({
      x: cx + dx * scale,
      y: cy + dy * scale,
      visible: true,
    });
  }, [date, mapBearing]);

  if (!position.visible) return null;

  // Ray lines from sun toward center
  const w = typeof window !== "undefined" ? window.innerWidth : 1000;
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  const cx = w / 2;
  const cy = h / 2;

  // Angle from sun to center
  const angle = Math.atan2(cy - position.y, cx - position.x);

  return (
    <>
      {/* Light rays SVG overlay */}
      <svg
        className="absolute inset-0 pointer-events-none z-[5]"
        width="100%"
        height="100%"
        style={{ mixBlendMode: "screen" }}
      >
        <defs>
          <linearGradient id="ray-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFB800" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFB800" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Fan of light rays */}
        {[-12, -6, 0, 6, 12].map((offset) => {
          const rayAngle = angle + (offset * Math.PI) / 180;
          const rayLen = Math.max(w, h) * 0.7;
          const x2 = position.x + Math.cos(rayAngle) * rayLen;
          const y2 = position.y + Math.sin(rayAngle) * rayLen;
          return (
            <line
              key={offset}
              x1={position.x}
              y1={position.y}
              x2={x2}
              y2={y2}
              stroke="#FFB800"
              strokeWidth={offset === 0 ? 2 : 1}
              strokeOpacity={offset === 0 ? 0.15 : 0.06}
            />
          );
        })}
      </svg>

      {/* Sun orb */}
      <div
        className="absolute z-[6] pointer-events-none"
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Outer glow */}
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            width: 80,
            height: 80,
            left: -40,
            top: -40,
            background: "radial-gradient(circle, rgba(255,184,0,0.3) 0%, rgba(255,184,0,0) 70%)",
          }}
        />
        {/* Inner orb */}
        <div
          className="relative rounded-full flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            left: -18,
            top: -18,
            background: "radial-gradient(circle, #FFD700 0%, #FFB800 60%, #FF8C00 100%)",
            boxShadow: "0 0 20px rgba(255,184,0,0.6), 0 0 60px rgba(255,184,0,0.2)",
          }}
        >
          <span className="text-xs font-bold text-black/80" style={{ textShadow: "none" }}>
            ☀
          </span>
        </div>
        {/* Direction label */}
        <div
          className="absolute whitespace-nowrap text-center"
          style={{
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <span className="text-xs font-semibold text-amber-400 drop-shadow-lg bg-black/40 px-2 py-0.5 rounded-full">
            {sunInfo.cardinal} · {Math.round(sunInfo.altitude)}°
          </span>
        </div>
      </div>
    </>
  );
}
