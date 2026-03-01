import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MapBackground } from "../components/MapBackground";
import { AnimatedDot } from "../components/AnimatedDot";
import { PATIO_DOTS, SUNLIT_COLOR } from "../constants";

export const DayModeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene is 150 frames (3-8s)
  // Dots appear staggered over the first 60 frames
  // Text appears after dots

  // Text spring entrance
  const textScale = spring({
    frame: frame - 70,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  const textOpacity = interpolate(frame, [70, 85], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Map fade-in
  const mapOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: mapOpacity }}>
      <MapBackground />

      {/* Patio dots - roughly 60% sunlit, 40% shaded */}
      {PATIO_DOTS.map((dot, i) => (
        <AnimatedDot
          key={i}
          x={dot.x}
          y={dot.y}
          mode={i % 5 < 3 ? "sunlit" : "shaded"}
          delay={dot.delay}
          enterFrame={10}
        />
      ))}

      {/* Caption text */}
      <div
        style={{
          position: "absolute",
          bottom: 400,
          left: 60,
          right: 60,
          textAlign: "center",
          opacity: textOpacity,
          transform: `scale(${textScale})`,
        }}
      >
        <div
          style={{
            fontSize: 46,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.3,
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}
        >
          See which patios are{" "}
          <span style={{ color: SUNLIT_COLOR }}>sunny</span> RIGHT NOW
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 320,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 40,
          opacity: textOpacity,
        }}
      >
        <LegendItem color={SUNLIT_COLOR} label="Sunny" />
        <LegendItem color="#9CA3AF" label="Shaded" />
      </div>
    </AbsoluteFill>
  );
};

const LegendItem: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 8px 4px ${color}40`,
      }}
    />
    <span
      style={{
        color: "rgba(255,255,255,0.7)",
        fontSize: 22,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {label}
    </span>
  </div>
);
