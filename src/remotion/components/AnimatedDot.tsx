import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SUNLIT_COLOR, SHADED_COLOR, GREEN_COLOR } from "../constants";

type DotMode = "sunlit" | "shaded" | "green";

interface AnimatedDotProps {
  x: number;
  y: number;
  mode: DotMode;
  delay?: number; // frame delay for staggered entrance
  enterFrame?: number; // frame at which dot appears (relative to sequence)
}

const COLOR_MAP: Record<DotMode, string> = {
  sunlit: SUNLIT_COLOR,
  shaded: SHADED_COLOR,
  green: GREEN_COLOR,
};

export const AnimatedDot: React.FC<AnimatedDotProps> = ({
  x,
  y,
  mode,
  delay = 0,
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring entrance
  const appearFrame = enterFrame + delay;
  const scale = spring({
    frame: frame - appearFrame,
    fps,
    config: { damping: 12, stiffness: 180 },
  });

  if (frame < appearFrame) return null;

  const color = COLOR_MAP[mode];

  // Pulse animation for sunlit dots
  const pulseScale =
    mode === "sunlit"
      ? 1 + 0.15 * Math.sin((frame - delay) / 8)
      : mode === "green"
        ? 1 + 0.1 * Math.sin((frame - delay) / 10)
        : 1;

  const glowSize = mode === "sunlit" ? 12 : mode === "green" ? 10 : 4;
  const glowOpacity = interpolate(
    Math.sin((frame - delay) / 8),
    [-1, 1],
    [0.2, 0.5]
  );

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale * pulseScale})`,
        width: 14,
        height: 14,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 ${glowSize}px ${glowSize / 2}px ${color}${Math.round(glowOpacity * 255)
          .toString(16)
          .padStart(2, "0")}`,
      }}
    />
  );
};
