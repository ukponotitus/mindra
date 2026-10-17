/** Scene start frames at 30 fps, shared by the video (MindraReel.tsx) and the sound design (sfx/build-sfx.mjs). */
export const SCENE = {
  hook: 0,
  problem: 165,
  record: 345,
  listens: 525,
  makeIt: 795,
  everywhere: 1125,
  month: 1305,
  voice: 1545,
  end: 1680,
};
export const END = 1800;

/** Frame (from its start) by which a Ribbon transition fully covers the screen. */
export const RIBBON_COVERED = 26;
/** Frames a Wipe transition takes to cover the screen. */
export const WIPE_COVERED = 16;
