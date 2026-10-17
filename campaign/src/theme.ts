import type { CSSProperties } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

/** Inter, the brand typeface (see ../src/index.css in the app), bundled so rendering never needs the network. */
export const fontFamily = "Inter";
const fontLoad = delayRender("Loading Inter");
new FontFace(fontFamily, `url(${staticFile("fonts/inter-latin-variable.woff2")}) format("woff2")`, { weight: "100 900" })
  .load()
  .then((font) => {
    document.fonts.add(font);
    continueRender(fontLoad);
  })
  .catch((error) => cancelRender(error));

/** Facebook Reels: 9:16 at 1080x1920, 30 fps, 60 seconds. */
export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const DURATION = 60 * FPS;

/** Mindra brand colours (from the app's theme), plus the warm paper the references are built on. */
export const C = {
  paper: "#F5F4F0",
  mintPaper: "#E7F3F1",
  ink: "#0B0B1A",
  inkSoft: "#3A3A48",
  muted: "#8C8B96",
  faint: "#CFCDC6",
  line: "#E4E2DB",
  night: "#0D0D14",
  purple: "#6D5EF5",
  violet: "#8B7CFF",
  cyan: "#3ECFCE",
  lavender: "#C9C1FF",
  periwinkle: "#93A8FF",
  mint: "#86E3E1",
  green: "#22C55E",
  /** The app's primary since the UI cleanup; the logo tile uses it (see ../src/components/BrandMark.tsx). */
  brand: "#5B4DE0",
  rec: "#FF3B30",
};

export const GRADIENT = `linear-gradient(90deg, ${C.purple} 0%, ${C.violet} 42%, ${C.cyan} 100%)`;
export const GRADIENT_SOFT = `linear-gradient(90deg, ${C.lavender} 0%, ${C.periwinkle} 50%, ${C.mint} 100%)`;
export const GRADIENT_TILE = `linear-gradient(135deg, ${C.purple} 0%, ${C.cyan} 100%)`;

/** Gradient-filled text. The side padding stops tight tracking from clipping the last glyph. */
export function gradientText(gradient = GRADIENT): CSSProperties {
  return {
    backgroundImage: gradient,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
    padding: "0 0.06em",
    margin: "0 -0.06em",
  };
}

/** Channel colours from the landing page's platform marquee. */
export const PLATFORMS = {
  instagram: { name: "Instagram", color: "#E1306C" },
  tiktok: { name: "TikTok", color: "#25F4EE" },
  shorts: { name: "YouTube Shorts", color: "#FF0033" },
  facebook: { name: "Facebook", color: "#1877F2" },
  whatsapp: { name: "WhatsApp", color: "#25D366" },
  linkedin: { name: "LinkedIn", color: "#0A66C2" },
  x: { name: "X", color: "#0B0B1A" },
  newsletter: { name: "Newsletter", color: "#A79BFF" },
  blog: { name: "Blog", color: "#5EEAD4" },
};
