import React, { memo } from "react";
import { Path, Svg } from "react-native-svg";
import { TSVGIconProp } from "./types";

const HeartOutlineIcon: React.FC<TSVGIconProp> = ({
  size = 16,
  color = "#000000",
  ...props
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" {...props}>
      <Path
        d="M44.5227 8C39.072 8 34.3653 11.192 32 15.848C29.6347 11.192 24.928 8 19.4773 8C11.664 8 5.33333 14.552 5.33333 22.616C5.33333 30.68 10.1787 38.072 16.44 44.144C22.7013 50.216 32 56 32 56C32 56 40.9973 50.312 47.56 44.144C54.56 37.568 58.6667 30.704 58.6667 22.616C58.6667 14.528 52.336 8 44.5227 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke={color}
        strokeWidth={3.5}
      />
    </Svg>
  );
};

export default memo(HeartOutlineIcon);
