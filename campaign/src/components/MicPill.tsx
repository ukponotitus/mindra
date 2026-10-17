import { Check } from "lucide-react";
import { C } from "../theme";
import Waveform from "./Waveform";

/** Contents of the dark recording pill: a live waveform and its status. `done` crossfades to "Transcribed". */
export default function MicPill({ frame, done = 0 }: { frame: number; done?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 26, color: "#fff" }}>
      <Waveform frame={frame} count={9} barWidth={9} gap={7} height={62} color="#fff" energy={1 - 0.85 * done} />
      <div style={{ position: "relative", width: 290, height: 48, fontSize: 38, fontWeight: 500, letterSpacing: "-0.01em" }}>
        <span style={{ position: "absolute", left: 0, top: 0, opacity: 1 - done }}>Listening…</span>
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            opacity: done,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: C.green,
              display: "grid",
              placeItems: "center",
              transform: `scale(${0.6 + 0.4 * done})`,
            }}
          >
            <Check size={26} strokeWidth={3.4} color="#fff" />
          </span>
          Transcribed
        </span>
      </div>
    </div>
  );
}
