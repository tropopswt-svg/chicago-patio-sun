import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MapBackground } from "../components/MapBackground";
import { AnimatedDot } from "../components/AnimatedDot";
import { FakeTimeSlider } from "../components/FakeTimeSlider";
import { SunArc } from "../components/SunArc";
import { PATIO_DOTS, SUNLIT_COLOR } from "../constants";

export const TimeScrubScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene is 150 frames (8-13s)
  // Slider scrubs from sunrise to sunset over the full scene
  const sliderProgress = interpolate(frame, [0, 140], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Sun arc follows slider
  const sunProgress = interpolate(sliderProgress, [0, 1], [0.1, 0.9]);

  // Dots change between sunlit/shaded based on time
  // As time progresses, different dots become sunlit or shaded
  const getDotMode = (index: number): "sunlit" | "shaded" => {
    // Create wave pattern - dots flip as time progresses
    const dotPhase = (index * 0.15 + sliderProgress * 3) % 1;
    // At midday (progress ~0.5), most dots are sunlit
    // At morning/evening, fewer are sunlit
    const sunlitThreshold = interpolate(
      sliderProgress,
      [0, 0.3, 0.5, 0.7, 1],
      [0.3, 0.6, 0.8, 0.6, 0.2]
    );
    return dotPhase < sunlitThreshold ? "sunlit" : "shaded";
  };

  // Caption text
  const textScale = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const textOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <MapBackground />

      {/* Sun arc in background */}
      <div style={{ opacity: 0.4 }}>
        <SunArc progress={sunProgress} />
      </div>

      {/* Patio dots that change with time */}
      {PATIO_DOTS.map((dot, i) => (
        <AnimatedDot
          key={i}
          x={dot.x}
          y={dot.y}
          mode={getDotMode(i)}
          delay={0}
          enterFrame={0}
        />
      ))}

      {/* Time slider */}
      <FakeTimeSlider progress={sliderProgress} />

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          bottom: 160,
          left: 60,
          right: 60,
          textAlign: "center",
          opacity: textOpacity,
          transform: `scale(${textScale})`,
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.3,
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}
        >
          Drag through the{" "}
          <span style={{ color: SUNLIT_COLOR }}>day</span>
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 400,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "system-ui, sans-serif",
            marginTop: 10,
          }}
        >
          See when every patio gets sun
        </div>
      </div>
    </AbsoluteFill>
  );
};
