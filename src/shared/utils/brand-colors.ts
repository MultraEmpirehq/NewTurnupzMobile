/**
 * The brand palette: strictly blue, black, white and grey, from the original
 * Turnupz app (src/shared/utils/colors.ts there). Red and green are kept only
 * for status: errors and destructive actions, and success.
 */
export const BRAND = {
  /** The Turnupz blue (primary). */
  blue: "#00B2FF",
  /** Deeper blue: the far end of the brand gradient, and strong accents. */
  blueDeep: "#0577FA",
  /** Soft blue, for quiet accents. */
  blueSoft: "#6FB1FC",
  /** Navy blue, for dark accents. */
  blueNavy: "#006B99",
  /** Pale blue tints for chips and fills. */
  blueTint: "#E5F7FF",
  blueTintDeep: "#E6F1FE",
  /** Near-black text and dark surfaces. */
  ink: "#0B1D2A",
  black: "#000000",
  white: "#FFFFFF",
  /** Greys. */
  grey: "#71717A",
  greyLight: "#A1A1AA",
  greyLine: "#E4E4E7",
  /** Status only. */
  danger: "#DC2626",
  dangerTint: "#FEE2E2",
  success: "#15803D",
  successTint: "#E8F8EF"
} as const;

/** The brand gradient: Turnupz blue into deep blue. */
export const BRAND_GRADIENT = [BRAND.blue, BRAND.blueDeep] as const;
