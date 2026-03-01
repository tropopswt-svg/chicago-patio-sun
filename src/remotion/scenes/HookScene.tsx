import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SunArc } from "../components/SunArc";
import { SUNLIT_COLOR, DARK_BG } from "../constants";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sun rises from frame 0 to 90: progress 0 → 0.4
  const sunProgress = interpolate(frame, [0, 90], [0, 0.4], {
    extrapolateRight: "clamp",
  });

  // Chicago skyline silhouette opacity
  const skylineOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Title fade in with spring
  const titleScale = spring({
    frame: frame - 35,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const titleOpacity = interpolate(frame, [35, 50], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Subtitle slides up
  const subtitleY = spring({
    frame: frame - 55,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const subtitleOpacity = interpolate(frame, [55, 70], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Background warm glow as sun rises
  const warmth = interpolate(frame, [0, 60], [0, 0.15], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* Dark background */}
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: DARK_BG,
        }}
      />

      {/* Warm gradient from sun */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "60%",
          background: `radial-gradient(ellipse at 50% 40%, ${SUNLIT_COLOR}${Math.round(warmth * 255)
            .toString(16)
            .padStart(2, "0")} 0%, transparent 70%)`,
        }}
      />

      {/* Sun arc */}
      <SunArc progress={sunProgress} />

      {/* Chicago skyline silhouette */}
      <div
        style={{
          position: "absolute",
          bottom: 600,
          left: 0,
          right: 0,
          opacity: skylineOpacity,
        }}
      >
        <svg width={1080} height={300} viewBox="0 0 1080 300">
          {/* Simplified Chicago skyline */}
          <g fill="rgba(0,0,0,0.7)">
            {/* Willis Tower */}
            <rect x={200} y={40} width={60} height={260} />
            <rect x={210} y={20} width={18} height={280} />
            <rect x={232} y={30} width={18} height={270} />
            {/* Hancock */}
            <rect x={380} y={60} width={50} height={240} />
            <rect x={395} y={40} width={8} height={20} />
            <rect x={407} y={40} width={8} height={20} />
            {/* Trump Tower */}
            <rect x={500} y={50} width={45} height={250} />
            <rect x={515} y={30} width={15} height={20} />
            {/* Misc buildings */}
            <rect x={100} y={140} width={40} height={160} />
            <rect x={150} y={100} width={35} height={200} />
            <rect x={300} y={120} width={45} height={180} />
            <rect x={580} y={110} width={40} height={190} />
            <rect x={640} y={130} width={55} height={170} />
            <rect x={720} y={90} width={40} height={210} />
            <rect x={780} y={150} width={50} height={150} />
            <rect x={850} y={120} width={35} height={180} />
            <rect x={900} y={160} width={60} height={140} />
            {/* Ground line */}
            <rect x={0} y={295} width={1080} height={5} />
          </g>
        </svg>
      </div>

      {/* Title: Chicago Booze Map */}
      <div
        style={{
          position: "absolute",
          top: 1050,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: -1,
            textShadow: `0 0 30px ${SUNLIT_COLOR}40`,
          }}
        >
          Chicago Booze Map
        </div>
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          top: 1150,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: subtitleOpacity,
          transform: `translateY(${(1 - subtitleY) * 30}px)`,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: SUNLIT_COLOR,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 3,
          }}
        >
          THE PATIO SUNLIGHT TRACKER
        </div>
      </div>
    </AbsoluteFill>
  );
};
