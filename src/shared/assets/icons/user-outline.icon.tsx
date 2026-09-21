import React, { memo } from "react";
import { Path, Svg } from "react-native-svg";
import { TSVGIconProp } from "./types";

const UserOutlineIcon: React.FC<TSVGIconProp> = ({
  size = 16,
  color = "#000000",
  ...props
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" {...props}>
      <Path
        d="M32 26.6667C37.891 26.6667 42.6667 21.891 42.6667 16C42.6667 10.109 37.891 5.33333 32 5.33333C26.109 5.33333 21.3333 10.109 21.3333 16C21.3333 21.891 26.109 26.6667 32 26.6667Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke={color}
        strokeWidth={3.5}
      />
      <Path
        d="M53.3333 46.6667C53.3333 53.2933 53.3333 58.6667 32 58.6667C10.6667 58.6667 10.6667 53.2933 10.6667 46.6667C10.6667 40.04 20.2187 34.6667 32 34.6667C43.7813 34.6667 53.3333 40.04 53.3333 46.6667Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke={color}
        strokeWidth={3.5}
      />
    </Svg>
  );
};

export default memo(UserOutlineIcon);
