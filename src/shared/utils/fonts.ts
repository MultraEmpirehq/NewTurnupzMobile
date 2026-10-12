import { StyleProp, StyleSheet, TextStyle } from "react-native";
import {
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold
} from "@expo-google-fonts/plus-jakarta-sans";

/**
 * Plus Jakarta Sans, the brand typeface, in each weight the app uses.
 *
 * React Native picks a font by family name, not by weight, so each cut is
 * registered as its own family and text is given the family for its weight.
 */
export const BRAND_FONTS = {
  "PlusJakartaSans-Light": PlusJakartaSans_300Light,
  "PlusJakartaSans-Regular": PlusJakartaSans_400Regular,
  "PlusJakartaSans-Medium": PlusJakartaSans_500Medium,
  "PlusJakartaSans-SemiBold": PlusJakartaSans_600SemiBold,
  "PlusJakartaSans-Bold": PlusJakartaSans_700Bold,
  "PlusJakartaSans-ExtraBold": PlusJakartaSans_800ExtraBold
};

export type TBrandFont = keyof typeof BRAND_FONTS;

/** The brand cuts by role, for the few places that set a family directly. */
export const FONT = {
  light: "PlusJakartaSans-Light",
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
  extrabold: "PlusJakartaSans-ExtraBold"
} as const satisfies Record<string, TBrandFont>;

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
  if (weight <= 300) return FONT.light;
  if (weight < 500) return FONT.regular;
  if (weight < 600) return FONT.medium;
  if (weight < 700) return FONT.semibold;
  if (weight < 800) return FONT.bold;
  return FONT.extrabold;
};

const parseWeight = (weight: TextStyle["fontWeight"]) => {
  if (weight === "bold") return 700;
  if (weight === "normal") return 400;
  const value = Number(weight);
  return Number.isFinite(value) ? value : undefined;
};

/**
 * The style that puts text in the right Plus Jakarta Sans cut, read from its
 * `font-*` weight class or `fontWeight` style (the style wins, as it does on
 * screen). `fontWeight` is reset because the family already carries the
 * weight; leaving it on makes some platforms fake an extra bold on top.
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
