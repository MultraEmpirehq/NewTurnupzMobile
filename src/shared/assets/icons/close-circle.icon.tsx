import React, { memo } from "react";
import { Path, Svg } from "react-native-svg";
import { TSVGIconProp } from "./types";

const CloseCircle: React.FC<TSVGIconProp> = ({
  size = 16,
  color = "#000000",
  ...props
}) => {
  return (
    <Svg
      width={size}
      height={(size * 17) / 16}
      viewBox="0 0 16 17"
      fill="none"
      {...props}
    >
      <Path
        d="M8 14.5C11.3137 14.5 14 11.8137 14 8.5C14 5.18629 11.3137 2.5 8 2.5C4.68629 2.5 2 5.18629 2 8.5C2 11.8137 4.68629 14.5 8 14.5Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 6.5L6 10.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 10.5L6 6.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default memo(CloseCircle);
