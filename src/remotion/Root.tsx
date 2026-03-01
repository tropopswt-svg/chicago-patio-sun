import { Composition } from "remotion";
import { InstagramAd } from "./InstagramAd";
import { WIDTH, HEIGHT, FPS, TOTAL_FRAMES } from "./constants";

export const Root: React.FC = () => {
  return (
    <Composition
      id="InstagramAd"
      component={InstagramAd}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
