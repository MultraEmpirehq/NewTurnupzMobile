import React, { memo } from "react";
import { Path, Svg } from "react-native-svg";
import { TSVGIconProp } from "./types";

const HomeFilledIcon: React.FC<TSVGIconProp> = ({
  size = 16,
  color = "#000000",
  ...props
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none" {...props}>
      <Path
        d="M5.33333 32.544C5.33333 26.44 5.33333 23.3893 6.72 20.8613C8.10133 18.3307 10.632 16.7627 15.6907 13.6213L21.024 10.312C26.3707 6.992 29.0453 5.33333 32 5.33333C34.9547 5.33333 37.6267 6.992 42.976 10.312L48.3093 13.6213C53.368 16.7627 55.8987 18.3307 57.2827 20.8613C58.6667 23.392 58.6667 26.44 58.6667 32.5413V36.6C58.6667 47 58.6667 52.2027 55.5413 55.4347C52.416 58.6667 47.3893 58.6667 37.3333 58.6667H26.6667C16.6107 58.6667 11.5813 58.6667 8.45867 55.4347C5.336 52.2027 5.33333 47.0027 5.33333 36.6V32.544Z"
        fill={color}
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </Svg>
  );
};

export default memo(HomeFilledIcon);
