import { useCurrentFrame } from "remotion";
import { easeInOut, ramp } from "../anim";
import { RIBBON_COVERED, WIPE_COVERED } from "../timeline";

const PATH = "M -340 2280 C 260 1640, 980 1500, 760 940 S 980 120, 1460 -320";

/**
 * Thick ribbons sweep across the frame, then a final band in the next scene's colour covers it.
 * The cover is complete by RIBBON_COVERED; start the next scene just after that, under the cover.
 */
export function Ribbon({ colors, cover }: { colors: string[]; cover: string }) {
  const f = useCurrentFrame();
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {colors.map((color, i) => (
        <path
          key={i}
          d={PATH}
          pathLength={1}
          fill="none"
          stroke={color}
          strokeWidth={300}
          strokeLinecap="round"
          strokeDasharray={`${ramp(f, i * 4, 16, easeInOut)} 2`}
          transform={`translate(${(i - 1) * 200} ${(i - 1) * 70})`}
        />
      ))}
      <path
        d={PATH}
        pathLength={1}
        fill="none"
        stroke={cover}
        strokeWidth={4200}
        strokeDasharray={`${ramp(f, 13, RIBBON_COVERED - 13, easeInOut)} 2`}
      />
    </svg>
  );
}

/** A colour panel that rises from the bottom and covers the frame by WIPE_COVERED. */
export function Wipe({ color }: { color: string }) {
  const f = useCurrentFrame();
  const t = ramp(f, 0, WIPE_COVERED, easeInOut);
  const radius = (1 - t) * 420;
  return (
    <div
      style={{
        position: "absolute",
        left: -60,
        right: -60,
        top: 0,
        height: 2300,
        background: color,
        borderRadius: `${radius}px ${radius}px 0 0`,
        transform: `translateY(${(1 - t) * 2300}px)`,
      }}
    />
  );
}
