import { Composition } from "remotion";
import MindraReel from "./MindraReel";
import { DURATION, FPS, H, W } from "./theme";

export default function Root() {
  return <Composition id="MindraReel" component={MindraReel} durationInFrames={DURATION} fps={FPS} width={W} height={H} />;
}
