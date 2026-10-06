import { StyleProp, StyleSheet, TextStyle } from "react-native";

/**
 * Avenir, the same files the web uses. There's no Medium or Semibold cut, so the
 * weights are spread the way the web spreads them: Book for body text, Roman for
 * medium, and Black for semibold and bold.
 *
 * React Native picks a font by family name, not by weight, so each cut is
 * registered as its own family and text is given the family for its weight.
 */
export const BRAND_FONTS = {
  "Avenir-Light": require("@/shared/assets/fonts/avenir/Avenir-Light.ttf"),
  "Avenir-Book": require("@/shared/assets/fonts/avenir/Avenir-Normal.otf"),
  "Avenir-Roman": require("@/shared/assets/fonts/avenir/Avenir-Regular.otf"),
  "Avenir-Black": require("@/shared/assets/fonts/avenir/Avenir-Bold.otf")
};

export type TBrandFont = keyof typeof BRAND_FONTS;

const WEIGHT_CLASSES: [RegExp, number][] = [
  [/(^|\s)font-thin(\s|$)/, 100],
  [/(^|\s)font-extralight(\s|$)/, 200],
  [/(^|\s)font-light(\s|$)/, 300],
  [/(^|\s)font-normal(\s|$)/, 400],
  [/(^|\s)font-medium(\s|$)/, 500],
  [/(^|\s)font-semibold(\s|$)/, 600],
  [/(^|\s)font-bold(\s|$)/, 700],
  [/(^|\s)font-extrabold(\s|$)/, 800],
  [/(^|\s)font-black(\s|$)/, 900]
];

export const brandFontForWeight = (weight: number): TBrandFont => {
  if (weight <= 300) return "Avenir-Light";
  if (weight < 500) return "Avenir-Book";
  if (weight < 600) return "Avenir-Roman";
  return "Avenir-Black";
};

const parseWeight = (weight: TextStyle["fontWeight"]) => {
  if (weight === "bold") return 700;
  if (weight === "normal") return 400;
  const value = Number(weight);
  return Number.isFinite(value) ? value : undefined;
};

/**
 * The style that puts text in the right Avenir cut, read from its `font-*`
 * weight class or `fontWeight` style (the style wins, as it does on screen).
 * `fontWeight` is reset because the family already carries the weight; leaving
 * it on makes some platforms fake an extra bold on top.
 */
export const brandFontStyle = (
  className?: string,
  style?: StyleProp<TextStyle>
): TextStyle => {
  const styleWeight = parseWeight(StyleSheet.flatten(style)?.fontWeight);
  let classWeight: number | undefined;
  for (const [pattern, weight] of WEIGHT_CLASSES) {
    if (className && pattern.test(className)) classWeight = weight;
  }
  return {
    fontFamily: brandFontForWeight(styleWeight ?? classWeight ?? 400),
    fontWeight: "normal"
  };
};
