import React, { memo } from "react";
import { Path, Svg } from "react-native-svg";
import { TSVGIconProp } from "./types";

const LocationIcon: React.FC<TSVGIconProp> = ({
  size = 16,
  color = "#000000",
  ...props
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none" {...props}>
      <Path
        d="M11.7713 11.1046C11.1468 11.729 9.84106 13.0348 8.94255 13.9333C8.42185 14.454 7.57847 14.4543 7.05777 13.9336C6.17491 13.0507 4.89441 11.7702 4.22878 11.1046C2.14599 9.02177 2.14599 5.64489 4.22878 3.5621C6.31158 1.4793 9.68846 1.4793 11.7713 3.5621C13.8541 5.64489 13.8541 9.02177 11.7713 11.1046Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 7.33333C10 8.4379 9.10459 9.33333 8.00002 9.33333C6.89545 9.33333 6.00002 8.4379 6.00002 7.33333C6.00002 6.22876 6.89545 5.33333 8.00002 5.33333C9.10459 5.33333 10 6.22876 10 7.33333Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default memo(LocationIcon);
