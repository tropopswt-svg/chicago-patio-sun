import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MapBackground } from "../components/MapBackground";
import { AnimatedDot } from "../components/AnimatedDot";
import { PATIO_DOTS, GREEN_COLOR } from "../constants";

export const NightModeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene is 120 frames (13-17s)
  // Background darkens, dots transition to green

  // Darkness transition
  const darkness = interpolate(frame, [0, 40], [0, 0.6], {
    extrapolateRight: "clamp",
  });

  // Dots stagger to green
  const getDotEnterFrame = (index: number) => {
    return 10 + (index % 15) * 2;
  };

  // Stars appear
  const starsOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Caption
  const textScale = spring({
    frame: frame - 50,
    fps,
    config: { damping: 12, stiffness: 140 },
  });

  const textOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Moon
  const moonY = interpolate(frame, [0, 60], [200, 120], {
    extrapolateRight: "clamp",
  });
  const moonOpacity = interpolate(frame, [10, 40], [0, 0.8], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <MapBackground darkness={darkness} showLabels showGrid />

      {/* Stars */}
      <div style={{ opacity: starsOpacity }}>
        {Array.from({ length: 20 }).map((_, i) => {
          const sx = 80 + ((i * 173) % 920);
          const sy = 50 + ((i * 137) % 200);
          const twinkle = 0.3 + 0.7 * Math.abs(Math.sin((frame + i * 20) / 15));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: sx,
                top: sy,
                width: 3,
                height: 3,
                borderRadius: "50%",
                backgroundColor: `rgba(255,255,255,${twinkle})`,
              }}
            />
          );
        })}
      </div>

      {/* Moon */}
      <div
        style={{
          position: "absolute",
          right: 120,
          top: moonY,
          width: 50,
          height: 50,
          borderRadius: "50%",
          backgroundColor: "#E8E8F0",
          opacity: moonOpacity,
          boxShadow: "0 0 20px 10px rgba(232, 232, 240, 0.2)",
        }}
      >
        {/* Moon crater */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 15,
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.06)",
          }}
        />
      </div>

      {/* Green dots */}
      {PATIO_DOTS.map((dot, i) => (
        <AnimatedDot
          key={i}
          x={dot.x}
          y={dot.y}
          mode="green"
          delay={getDotEnterFrame(i)}
          enterFrame={0}
        />
      ))}

      {/* Caption */}
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
          <span style={{ color: GREEN_COLOR }}>1,000+</span> bars & patios
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "rgba(255,255,255,0.8)",
            fontFamily: "system-ui, sans-serif",
            marginTop: 10,
          }}
        >
          open late
        </div>
      </div>
    </AbsoluteFill>
  );
};
