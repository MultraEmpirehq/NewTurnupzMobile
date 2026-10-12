import { Easing } from "react-native-reanimated";
import { BRAND } from "@/shared/utils/brand-colors";

/**
 * The intro's score, shared by the logo and everything around it. One clock
 * (`t`, in ms, on the UI thread) drives every layer; each one just reads where
 * it is in the score.
 */

// Light and airy, so the intro hands over to the (white) app without a jolt.
// Strictly blue, black, white and grey (see shared/utils/brand-colors).
export const BASE = "#f7fbff";
export const INK = BRAND.ink;
export const BLUE = BRAND.blue;
export const BLUE_DEEP = BRAND.blueDeep;
export const BLUE_SOFT = BRAND.blueSoft;
export const BLUE_NAVY = BRAND.blueNavy;

export const DURATION = 5000;
export const REDUCED_DURATION = 1400;

export const T = {
  skyIn: [0, 600],
  write: [250, 1700],
  ink: [650, 1950],
  zDrop: [1650, 2200],
  beat: [2200, 2650],
  shine: [2550, 3250],
  ticketIn: [2450, 3050],
  flipHint: [3050, 3400],
  flip: [3400, 4150],
  exit: [4450, DURATION]
} as const;

export type TSpan = readonly [number, number];

/** How far through a stretch of the score `t` is, 0 to 1, eased. */
export const phase = (
  t: number,
  [start, end]: TSpan,
  easing: (value: number) => number = (value) => value
) => {
  "worklet";
  const progress = Math.min(1, Math.max(0, (t - start) / (end - start)));
  return easing(progress);
};

export const easeInOut = Easing.inOut(Easing.cubic);
export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
export const easeOutBack = Easing.out(Easing.back(1.8));

/**
 * Props for a layer that's drawn once and only ever moved or faded: the
 * platform caches it as a bitmap instead of redrawing its SVG every frame.
 */
export const RASTERIZE = {
  shouldRasterizeIOS: true,
  renderToHardwareTextureAndroid: true
} as const;
