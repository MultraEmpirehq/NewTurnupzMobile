import React, { memo } from "react";
import { Circle, Path, Svg } from "react-native-svg";
import { TSVGIconProp } from "./types";

/** Share something. */
const ShareIcon: React.FC<TSVGIconProp> = ({ size = 16, color = "#000000", ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
    <Circle cx={18} cy={5} r={3} stroke={color} strokeWidth={2} />
    <Circle cx={6} cy={12} r={3} stroke={color} strokeWidth={2} />
    <Circle cx={18} cy={19} r={3} stroke={color} strokeWidth={2} />
    <Path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" stroke={color} strokeWidth={2} />
  </Svg>
);

export default memo(ShareIcon);
