import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SUNLIT_COLOR, DARK_BG } from "../constants";

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene is 90 frames (17-20s)

  // Logo / title entrance
  const logoScale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 10, stiffness: 160 },
  });

  const logoOpacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // CTA text
  const ctaScale = spring({
    frame: frame - 25,
    fps,
    config: { damping: 12, stiffness: 140 },
  });

  const ctaOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateRight: "clamp",
  });

  // URL
  const urlOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateRight: "clamp",
  });

  const urlY = spring({
    frame: frame - 40,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  // Ambient pulsing glow
  const glowPulse = 0.3 + 0.2 * Math.sin(frame / 10);

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

      {/* Center glow */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${SUNLIT_COLOR}${Math.round(glowPulse * 255)
            .toString(16)
            .padStart(2, "0")} 0%, transparent 70%)`,
        }}
      />

      {/* Sun icon */}
      <div
        style={{
          position: "absolute",
          top: 650,
          left: "50%",
          transform: `translate(-50%, -50%) scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        <svg width={100} height={100} viewBox="0 0 100 100">
          {/* Sun circle */}
          <circle cx={50} cy={50} r={22} fill={SUNLIT_COLOR} />
          {/* Rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <line
              key={angle}
              x1={50 + 30 * Math.cos((angle * Math.PI) / 180)}
              y1={50 + 30 * Math.sin((angle * Math.PI) / 180)}
              x2={50 + 40 * Math.cos((angle * Math.PI) / 180)}
              y2={50 + 40 * Math.sin((angle * Math.PI) / 180)}
              stroke={SUNLIT_COLOR}
              strokeWidth={4}
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 740,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: -1,
          }}
        >
          Chicago Booze Map
        </div>
      </div>

      {/* CTA Button */}
      <div
        style={{
          position: "absolute",
          top: 920,
          left: "50%",
          transform: `translate(-50%, 0) scale(${ctaScale})`,
          opacity: ctaOpacity,
        }}
      >
        <div
          style={{
            padding: "24px 80px",
            borderRadius: 60,
            background: `linear-gradient(135deg, ${SUNLIT_COLOR}, #FF8C00)`,
            fontSize: 38,
            fontWeight: 800,
            color: "#000",
            fontFamily: "system-ui, sans-serif",
            boxShadow: `0 4px 30px ${SUNLIT_COLOR}60`,
          }}
        >
          Find your spot
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          position: "absolute",
          top: 1040,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: urlOpacity,
          transform: `translateY(${(1 - urlY) * 20}px)`,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 1,
          }}
        >
          chicagoboozemap.com
        </div>
      </div>

      {/* Bottom tagline */}
      <div
        style={{
          position: "absolute",
          bottom: 500,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: urlOpacity,
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 3,
          }}
        >
          SUN &bull; SHADE &bull; NIGHTLIFE
        </div>
      </div>
    </AbsoluteFill>
  );
};
