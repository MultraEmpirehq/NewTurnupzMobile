import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

const PlayMark = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M7 4l13 8-13 8z" fill="#fff" />
  </Svg>
);

/** A clip, until the app plays video: a dark tile with a play mark. */
export const ClipTile = ({ big = false }: { big?: boolean }) => (
  <View className="size-full items-center justify-center bg-zinc-900">
    <PlayMark size={big ? 40 : 18} />
  </View>
);

