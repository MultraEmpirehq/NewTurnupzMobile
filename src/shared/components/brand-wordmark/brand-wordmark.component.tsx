import React, { memo, useId } from "react";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import {
  LOGO_HEIGHT,
  LOGO_PATHS,
  LOGO_VIEWBOX,
  LOGO_WIDTH
} from "../brand-intro/logo-paths";
import { BLUE, BLUE_DEEP } from "../brand-intro/intro-timeline";

/**
 * The Turnupz wordmark, inked in the brand gradient as on the web; pass a colour
 * (e.g. white on the dark sign-in sky) to fill it flat instead.
 */
const BrandWordmark: React.FC<{ height?: number; color?: string }> = ({
  height = 30,
  color
}) => {
  const gradient = `wordmark-${useId().replace(/:/g, "")}`;
  return (
    <Svg
      width={(height * LOGO_WIDTH) / LOGO_HEIGHT}
      height={height}
      viewBox={LOGO_VIEWBOX}
      accessibilityLabel="Turnupz"
    >
      <Defs>
        <LinearGradient
          id={gradient}
          x1="0"
          y1="0"
          x2={LOGO_WIDTH}
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={BLUE} />
          <Stop offset="1" stopColor={BLUE_DEEP} />
        </LinearGradient>
      </Defs>
      {LOGO_PATHS.map((d) => (
        <Path key={d.slice(0, 16)} d={d} fill={color ?? `url(#${gradient})`} />
      ))}
    </Svg>
  );
};

export default memo(BrandWordmark);
