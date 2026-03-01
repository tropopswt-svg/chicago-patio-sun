import { AbsoluteFill, Sequence } from "remotion";
import { SCENES } from "./constants";
import { HookScene } from "./scenes/HookScene";
import { DayModeScene } from "./scenes/DayModeScene";
import { TimeScrubScene } from "./scenes/TimeScrubScene";
import { NightModeScene } from "./scenes/NightModeScene";
import { CTAScene } from "./scenes/CTAScene";

export const InstagramAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence from={SCENES.hook.start} durationInFrames={SCENES.hook.end - SCENES.hook.start}>
        <HookScene />
      </Sequence>

      <Sequence from={SCENES.dayMode.start} durationInFrames={SCENES.dayMode.end - SCENES.dayMode.start}>
        <DayModeScene />
      </Sequence>

      <Sequence from={SCENES.timeScrub.start} durationInFrames={SCENES.timeScrub.end - SCENES.timeScrub.start}>
        <TimeScrubScene />
      </Sequence>

      <Sequence from={SCENES.nightMode.start} durationInFrames={SCENES.nightMode.end - SCENES.nightMode.start}>
        <NightModeScene />
      </Sequence>

      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.end - SCENES.cta.start}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
