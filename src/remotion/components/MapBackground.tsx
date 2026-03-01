import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { NEIGHBORHOODS, DARK_BG, DARK_BG_DEEPER } from "../constants";

interface MapBackgroundProps {
  darkness?: number; // 0 = normal, 1 = fully dark
  showLabels?: boolean;
  showGrid?: boolean;
}

export const MapBackground: React.FC<MapBackgroundProps> = ({
  darkness = 0,
  showLabels = true,
  showGrid = true,
}) => {
  const frame = useCurrentFrame();

  const bgOpacity = interpolate(darkness, [0, 1], [1, 0.3]);

  // Faint grid lines suggesting streets
  const gridLines: React.ReactNode[] = [];
  if (showGrid) {
    // Horizontal lines
    for (let y = 200; y <= 1200; y += 80) {
      gridLines.push(
        <div
          key={`h-${y}`}
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: y,
            height: 1,
            backgroundColor: `rgba(255, 255, 255, ${0.06 * bgOpacity})`,
          }}
        />
      );
    }
    // Vertical lines
    for (let x = 80; x <= 1000; x += 90) {
      gridLines.push(
        <div
          key={`v-${x}`}
          style={{
            position: "absolute",
            top: 200,
            bottom: 720,
            left: x,
            width: 1,
            backgroundColor: `rgba(255, 255, 255, ${0.06 * bgOpacity})`,
          }}
        />
      );
    }
  }

  // Subtle animated water shimmer on the right side (Lake Michigan)
  const shimmerOffset = Math.sin(frame / 30) * 5;

  return (
    <AbsoluteFill>
      {/* Base dark gradient */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(180deg, ${DARK_BG} 0%, ${DARK_BG_DEEPER} 60%, ${DARK_BG} 100%)`,
        }}
      />

      {/* Lake Michigan hint on right edge */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 150,
          width: 180,
          height: 1100,
          background: `linear-gradient(270deg, rgba(30, 60, 90, ${0.4 * bgOpacity}) 0%, transparent 100%)`,
          transform: `translateX(${shimmerOffset}px)`,
        }}
      />

      {/* Grid lines */}
      {gridLines}

      {/* Neighborhood labels */}
      {showLabels &&
        NEIGHBORHOODS.map((n) => (
          <div
            key={n.name}
            style={{
              position: "absolute",
              left: n.x,
              top: n.y,
              transform: "translate(-50%, -50%)",
              color: `rgba(255, 255, 255, ${0.18 * bgOpacity})`,
              fontSize: 14,
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
              letterSpacing: 2,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {n.name}
          </div>
        ))}
    </AbsoluteFill>
  );
};
