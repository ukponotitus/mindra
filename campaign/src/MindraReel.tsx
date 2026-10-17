import { AbsoluteFill, Html5Audio, Sequence, staticFile } from "remotion";
import { Grain } from "./components/Bits";
import { Ribbon, Wipe } from "./components/Transitions";
import S1Hook from "./scenes/S1Hook";
import S2Problem from "./scenes/S2Problem";
import S3Record from "./scenes/S3Record";
import S4Listens from "./scenes/S4Listens";
import S5MakeIt from "./scenes/S5MakeIt";
import S6Everywhere from "./scenes/S6Everywhere";
import S7Month from "./scenes/S7Month";
import S8Voice from "./scenes/S8Voice";
import S9End from "./scenes/S9End";
import { C, fontFamily } from "./theme";
import { END, RIBBON_COVERED, SCENE, WIPE_COVERED } from "./timeline";

/** Each scene runs until the next one starts. */
const SCENES = [
  { from: SCENE.hook, Scene: S1Hook },
  { from: SCENE.problem, Scene: S2Problem },
  { from: SCENE.record, Scene: S3Record },
  { from: SCENE.listens, Scene: S4Listens },
  { from: SCENE.makeIt, Scene: S5MakeIt },
  { from: SCENE.everywhere, Scene: S6Everywhere },
  { from: SCENE.month, Scene: S7Month },
  { from: SCENE.voice, Scene: S8Voice },
  { from: SCENE.end, Scene: S9End },
];

/** Mindra launch reel: 60 seconds, 1080x1920, for Facebook Reels. */
export default function MindraReel() {
  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily }}>
      {SCENES.map(({ from, Scene }, i) => (
        <Sequence key={from} from={from} durationInFrames={(SCENES[i + 1]?.from ?? END) - from}>
          <Scene />
        </Sequence>
      ))}

      {/* Transitions sit on top and finish covering just before the next scene starts */}
      <Sequence from={SCENE.month - RIBBON_COVERED - 2} durationInFrames={RIBBON_COVERED + 6}>
        <Ribbon colors={[C.lavender, C.purple, C.cyan]} cover={C.night} />
      </Sequence>
      <Sequence from={SCENE.voice - WIPE_COVERED - 2} durationInFrames={WIPE_COVERED + 6}>
        <Wipe color={C.mintPaper} />
      </Sequence>
      <Sequence from={SCENE.end - RIBBON_COVERED - 2} durationInFrames={RIBBON_COVERED + 6}>
        <Ribbon colors={[C.purple, C.cyan, C.ink]} cover={C.paper} />
      </Sequence>

      <Grain />

      {/* Sound effects over soft music, built by audio/build.mjs (npm run audio) */}
      <Html5Audio src={staticFile("audio/mindra-reel.wav")} />
    </AbsoluteFill>
  );
}
