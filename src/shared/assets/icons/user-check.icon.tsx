import React, { memo } from "react";
import { Circle, Path, Svg } from "react-native-svg";
import { TSVGIconProp } from "./types";

/** Already following someone. */
const UserCheckIcon: React.FC<TSVGIconProp> = ({ size = 16, color = "#000000", ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
    <Path
      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 11l2 2 4-4"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={2} />
  </Svg>
);

export default memo(UserCheckIcon);
