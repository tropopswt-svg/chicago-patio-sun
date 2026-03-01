import { interpolate, useCurrentFrame } from "remotion";
import { SUNLIT_COLOR } from "../constants";

interface SunArcProps {
  /** 0 to 1: progress of sun across the arc */
  progress: number;
}

export const SunArc: React.FC<SunArcProps> = ({ progress }) => {
  const frame = useCurrentFrame();

  // Arc path: sun travels in a parabolic arc across the top of the screen
  const arcX = interpolate(progress, [0, 1], [100, 980]);
  const arcY =
    interpolate(progress, [0, 0.5, 1], [600, 120, 600]);

  // Sun glow pulse
  const pulse = 1 + 0.1 * Math.sin(frame / 5);
  const sunSize = 40 * pulse;

  // Ray rotation
  const rayRotation = frame * 2;

  return (
    <>
      {/* Arc trail */}
      <svg
        style={{ position: "absolute", top: 0, left: 0 }}
        width={1080}
        height={700}
        viewBox="0 0 1080 700"
      >
        <path
          d={`M 100 600 Q 540 -160 980 600`}
          fill="none"
          stroke={`${SUNLIT_COLOR}20`}
          strokeWidth={2}
          strokeDasharray="8 6"
        />
      </svg>

      {/* Sun body */}
      <div
        style={{
          position: "absolute",
          left: arcX,
          top: arcY,
          transform: `translate(-50%, -50%)`,
          width: sunSize,
          height: sunSize,
          borderRadius: "50%",
          backgroundColor: SUNLIT_COLOR,
          boxShadow: `0 0 ${30 * pulse}px ${15 * pulse}px ${SUNLIT_COLOR}60, 0 0 ${60 * pulse}px ${30 * pulse}px ${SUNLIT_COLOR}30`,
        }}
      />

      {/* Radiating rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <div
          key={angle}
          style={{
            position: "absolute",
            left: arcX,
            top: arcY,
            width: 2,
            height: 18,
            backgroundColor: `${SUNLIT_COLOR}80`,
            transform: `translate(-50%, -50%) rotate(${angle + rayRotation}deg) translateY(-${sunSize / 2 + 10}px)`,
            borderRadius: 1,
          }}
        />
      ))}
    </>
  );
};
