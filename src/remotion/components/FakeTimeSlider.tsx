import { interpolate, useCurrentFrame } from "remotion";
import { SUNLIT_COLOR } from "../constants";

interface FakeTimeSliderProps {
  /** 0 to 1: how far through the day the slider should be */
  progress: number;
}

export const FakeTimeSlider: React.FC<FakeTimeSliderProps> = ({ progress }) => {
  const frame = useCurrentFrame();

  const sliderWidth = 800;
  const sliderLeft = (1080 - sliderWidth) / 2;
  const thumbX = sliderLeft + progress * sliderWidth;

  // Time labels
  const hours = Math.round(interpolate(progress, [0, 1], [6, 21]));
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const timeLabel = `${displayHour}:00 ${ampm}`;

  // Subtle glow pulse on thumb
  const glowPulse = 1 + 0.2 * Math.sin(frame / 6);

  return (
    <div style={{ position: "absolute", bottom: 260, left: 0, right: 0 }}>
      {/* Time label above thumb */}
      <div
        style={{
          position: "absolute",
          left: thumbX,
          top: -50,
          transform: "translateX(-50%)",
          color: "#fff",
          fontSize: 28,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          textShadow: `0 0 10px ${SUNLIT_COLOR}80`,
        }}
      >
        {timeLabel}
      </div>

      {/* Track */}
      <div
        style={{
          position: "absolute",
          left: sliderLeft,
          top: 0,
          width: sliderWidth,
          height: 6,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.15)",
        }}
      />

      {/* Filled portion */}
      <div
        style={{
          position: "absolute",
          left: sliderLeft,
          top: 0,
          width: progress * sliderWidth,
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(90deg, ${SUNLIT_COLOR}, ${SUNLIT_COLOR}CC)`,
        }}
      />

      {/* Thumb */}
      <div
        style={{
          position: "absolute",
          left: thumbX,
          top: 3,
          transform: "translate(-50%, -50%)",
          width: 24,
          height: 24,
          borderRadius: "50%",
          backgroundColor: SUNLIT_COLOR,
          border: "3px solid #fff",
          boxShadow: `0 0 ${12 * glowPulse}px ${6 * glowPulse}px ${SUNLIT_COLOR}60`,
        }}
      />

      {/* Sunrise / Sunset labels */}
      <div
        style={{
          position: "absolute",
          left: sliderLeft,
          top: 18,
          color: "rgba(255,255,255,0.4)",
          fontSize: 18,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        6 AM
      </div>
      <div
        style={{
          position: "absolute",
          left: sliderLeft + sliderWidth,
          top: 18,
          transform: "translateX(-100%)",
          color: "rgba(255,255,255,0.4)",
          fontSize: 18,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        9 PM
      </div>
    </div>
  );
};
