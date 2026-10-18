import React, { memo } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import {
  BLUE,
  DURATION,
  BLUE_SOFT,
  BLUE_DEEP,
  RASTERIZE,
  T,
  BLUE_NAVY,
  easeIn,
  easeOut,
  phase
} from "./intro-timeline";

/**
 * The backdrop: a soft, living gradient of the brand colours, slowly drifting
 * like light through frosted glass.
 *
 * Built to stay smooth on a mid-range phone: each SVG is drawn once and cached
 * as a bitmap (RASTERIZE); the clock only moves, scales or fades those bitmaps,
 * on the UI thread. Nothing redraws per frame.
 */

type TStageProps = {
  t: SharedValue<number>;
  width: number;
  height: number;
};

const IntroStage: React.FC<TStageProps> = ({ t, width, height }) => {
  const stageStyle = useAnimatedStyle(() => ({
    opacity: phase(t.value, T.skyIn, easeOut),
    transform: [
      {
        scale:
          1 + 0.04 * (t.value / DURATION) + 0.1 * phase(t.value, T.exit, easeIn)
      }
    ]
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, stageStyle]}
    >
      {MESH.map((blob, index) => (
        <MeshBlob key={index} t={t} width={width} height={height} {...blob} />
      ))}
    </Animated.View>
  );
};

/* -------------------------------- Mesh -------------------------------- */

const MESH = [
  {
    color: BLUE_DEEP,
    x: 0.05,
    y: 0.08,
    size: 1.1,
    opacity: 0.32,
    speed: 1,
    offset: 0
  },
  {
    color: BLUE,
    x: 0.98,
    y: 0.3,
    size: 1.15,
    opacity: 0.32,
    speed: 0.85,
    offset: 2
  },
  {
    color: BLUE_SOFT,
    x: 0.12,
    y: 0.86,
    size: 1.05,
    opacity: 0.38,
    speed: 1.15,
    offset: 4
  },
  {
    color: BLUE_NAVY,
    x: 0.88,
    y: 0.95,
    size: 1.0,
    opacity: 0.22,
    speed: 0.95,
    offset: 5.5
  }
];

type TMeshProps = (typeof MESH)[number] & TStageProps;

const MeshBlob = memo(
  ({
    t,
    width,
    height,
    color,
    x,
    y,
    size,
    opacity,
    speed,
    offset
  }: TMeshProps) => {
    const diameter = Math.max(width, height) * size;
    const style = useAnimatedStyle(() => {
      const time = (t.value / 1000) * speed + offset;
      return {
        transform: [
          { translateX: Math.sin(time * 0.8) * width * 0.12 },
          { translateY: Math.cos(time * 0.6) * height * 0.06 },
          { scale: 1 + Math.sin(time * 1.1) * 0.1 }
        ]
      };
    });
    const id = `mesh-${color.slice(1)}`;
    return (
      <Animated.View
        {...RASTERIZE}
        style={[
          styles.absolute,
          {
            width: diameter,
            height: diameter,
            left: width * x - diameter / 2,
            top: height * y - diameter / 2
          },
          style
        ]}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={opacity} />
              <Stop
                offset="0.55"
                stopColor={color}
                stopOpacity={opacity * 0.35}
              />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    );
  }
);
MeshBlob.displayName = "MeshBlob";

export default memo(IntroStage);

const styles = StyleSheet.create({
  absolute: {
    position: "absolute"
  }
});
