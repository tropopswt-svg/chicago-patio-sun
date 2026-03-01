// Video specs
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
export const DURATION_SECONDS = 20;
export const TOTAL_FRAMES = FPS * DURATION_SECONDS; // 600

// Scene timing (in frames)
export const SCENES = {
  hook: { start: 0, end: 90 }, // 0-3s
  dayMode: { start: 90, end: 240 }, // 3-8s
  timeScrub: { start: 240, end: 390 }, // 8-13s
  nightMode: { start: 390, end: 510 }, // 13-17s
  cta: { start: 510, end: 600 }, // 17-20s
} as const;

// Colors (from @/lib/constants)
export const SUNLIT_COLOR = "#FFB800";
export const SHADED_COLOR = "#9CA3AF";
export const GREEN_COLOR = "#22c55e";
export const DARK_BG = "rgb(18, 18, 38)";
export const DARK_BG_DEEPER = "rgb(10, 10, 25)";

// Neighborhood labels for fake map
export const NEIGHBORHOODS = [
  { name: "RIVER NORTH", x: 540, y: 820 },
  { name: "OLD TOWN", x: 480, y: 650 },
  { name: "GOLD COAST", x: 620, y: 740 },
  { name: "LINCOLN PARK", x: 400, y: 500 },
  { name: "LAKEVIEW", x: 350, y: 350 },
  { name: "WRIGLEYVILLE", x: 300, y: 280 },
  { name: "WEST LOOP", x: 380, y: 950 },
  { name: "WICKER PARK", x: 250, y: 700 },
  { name: "BUCKTOWN", x: 260, y: 560 },
  { name: "THE LOOP", x: 600, y: 1000 },
  { name: "STREETERVILLE", x: 720, y: 870 },
] as const;

// Seed positions for ~40 patio dots spread across the map area
// x, y are pixel positions within 1080x1920 viewport (map area ~y:200-1200)
function generateDots(seed: number): { x: number; y: number; delay: number }[] {
  const dots: { x: number; y: number; delay: number }[] = [];
  let s = seed;
  const next = () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < 42; i++) {
    dots.push({
      x: 80 + next() * 920,
      y: 250 + next() * 950,
      delay: Math.floor(next() * 20),
    });
  }
  return dots;
}

export const PATIO_DOTS = generateDots(42);
