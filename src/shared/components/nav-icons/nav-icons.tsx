import React, { memo } from "react";
import Svg, { Circle, Path } from "react-native-svg";

/**
 * The bottom bar's icons, drawn as one set: a 24px grid, 1.9 rounded strokes.
 * The tab you're on is filled; the others are outlines.
 */

export type TNavIconName = "home" | "explore" | "messages" | "notifications" | "profile";

type TProps = { name: TNavIconName; size?: number; color: string; active?: boolean };

const STROKE = 1.9;

const NavIcon = ({ name, size = 26, color, active = false }: TProps) => {
  const fill = active ? color : "none";
  const line = { stroke: color, strokeWidth: STROKE, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  // Cut-outs inside filled shapes are drawn in white.
  const cut = active ? "#FFFFFF" : color;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "home" && (
        <>
          <Path d="M3.5 10.2 12 3.6l8.5 6.6V19a1.6 1.6 0 0 1-1.6 1.6H5.1A1.6 1.6 0 0 1 3.5 19z" fill={fill} {...line} />
          <Path d="M9.6 20.6v-5a2.4 2.4 0 0 1 4.8 0v5" fill="none" {...line} stroke={cut} />
        </>
      )}
      {name === "explore" && (
        <>
          <Circle cx={12} cy={12} r={8.6} fill={fill} {...line} />
          <Path d="m15.4 8.6-2 4.8-4.8 2 2-4.8z" fill={active ? "#FFFFFF" : "none"} {...line} stroke={cut} />
        </>
      )}
      {name === "messages" && (
        <>
          <Path
            d="M20.4 11.6c0 4.3-3.8 7.7-8.4 7.7-1.2 0-2.3-.2-3.3-.6l-4.3 1.5 1.3-3.6A7.4 7.4 0 0 1 3.6 11.6C3.6 7.3 7.4 3.9 12 3.9s8.4 3.4 8.4 7.7z"
            fill={fill}
            {...line}
          />
          {active ? (
            <>
              <Circle cx={8.4} cy={11.6} r={1.05} fill="#FFFFFF" />
              <Circle cx={12} cy={11.6} r={1.05} fill="#FFFFFF" />
              <Circle cx={15.6} cy={11.6} r={1.05} fill="#FFFFFF" />
            </>
          ) : null}
        </>
      )}
      {name === "notifications" && (
        <>
          <Path
            d="M6.1 16.8V11a5.9 5.9 0 0 1 11.8 0v5.8l1.5 1.6H4.6z"
            fill={fill}
            {...line}
          />
          <Path d="M10 20.4a2.2 2.2 0 0 0 4 0" fill="none" {...line} />
        </>
      )}
      {name === "profile" && (
        <>
          <Circle cx={12} cy={8.2} r={4} fill={fill} {...line} />
          <Path d="M4.4 20.3c.8-3.6 3.9-6 7.6-6s6.8 2.4 7.6 6" fill={fill} {...line} />
        </>
      )}
    </Svg>
  );
};

export default memo(NavIcon);
