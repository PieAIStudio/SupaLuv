import type { InkStorySnapshot } from "../story/inkStoryRunner";
import { BarcodeSweepInteraction } from "./BarcodeSweepInteraction";
import { EmotionCalibrationInteraction } from "./EmotionCalibrationInteraction";
import { HousingHotspotsInteraction } from "./HousingHotspotsInteraction";
import { MobileQuestionnaireInteraction } from "./MobileQuestionnaireInteraction";
import { ProtocolTestInteraction } from "./ProtocolTestInteraction";
import type { ActiveStoryInteraction } from "./types";

interface StoryInteractionHostProps {
  readonly active: ActiveStoryInteraction;
  readonly snapshot: InkStorySnapshot;
  readonly paused: boolean;
  readonly onChoose: (index: number) => void;
}

export function StoryInteractionHost({
  active,
  snapshot,
  paused,
  onChoose,
}: StoryInteractionHostProps) {
  const key = `${active.definition.id}-${active.stepIndex}`;
  switch (active.definition.type) {
    case "emotion-calibration":
      return (
        <EmotionCalibrationInteraction
          key={key}
          active={active}
          snapshot={snapshot}
          paused={paused}
          onChoose={onChoose}
        />
      );
    case "protocol-test":
      return (
        <ProtocolTestInteraction
          key={key}
          active={active}
          snapshot={snapshot}
          paused={paused}
          onChoose={onChoose}
        />
      );
    case "barcode-sweep":
      return (
        <BarcodeSweepInteraction
          key={key}
          active={active}
          snapshot={snapshot}
          paused={paused}
          onChoose={onChoose}
        />
      );
    case "housing-hotspots":
      return (
        <HousingHotspotsInteraction
          key={key}
          active={active}
          snapshot={snapshot}
          paused={paused}
          onChoose={onChoose}
        />
      );
    case "mobile-questionnaire":
      return (
        <MobileQuestionnaireInteraction
          key={key}
          active={active}
          snapshot={snapshot}
          paused={paused}
          onChoose={onChoose}
        />
      );
    default:
      return null;
  }
}
