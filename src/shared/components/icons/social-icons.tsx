import React, { memo } from "react";
import Svg, { Path } from "react-native-svg";

/**
 * The like, comment and share marks, drawn like the bottom bar's icons: a 24px
 * grid and 1.9 rounded strokes. A liked heart is filled rose.
 */

const STROKE = 1.9;
export const LIKED_COLOR = "#F43F5E";
const HEART = "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z";

export const HeartIcon = memo(({ size = 26, color, filled = false }: { size?: number; color: string; filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d={HEART} fill={filled ? LIKED_COLOR : "none"} stroke={filled ? LIKED_COLOR : color} strokeWidth={STROKE} strokeLinejoin="round" />
  </Svg>
));
HeartIcon.displayName = "HeartIcon";

/** The double-tap heart: solid, to pop over a photo. */
export const SolidHeartIcon = memo(({ size = 96, color = "#FFFFFF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d={HEART} fill={color} />
  </Svg>
));
SolidHeartIcon.displayName = "SolidHeartIcon";

/** The same speech bubble as the Messages tab. */
export const CommentIcon = memo(({ size = 26, color }: { size?: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M20.4 11.6c0 4.3-3.8 7.7-8.4 7.7-1.2 0-2.3-.2-3.3-.6l-4.3 1.5 1.3-3.6A7.4 7.4 0 0 1 3.6 11.6C3.6 7.3 7.4 3.9 12 3.9s8.4 3.4 8.4 7.7z"
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinejoin="round"
    />
  </Svg>
));
CommentIcon.displayName = "CommentIcon";

export const ShareIcon = memo(({ size = 25, color }: { size?: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" fill="none" stroke={color} strokeWidth={STROKE} strokeLinejoin="round" strokeLinecap="round" />
  </Svg>
));
ShareIcon.displayName = "ShareIcon";
