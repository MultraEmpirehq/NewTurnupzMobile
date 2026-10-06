import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle
} from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  RadialGradient,
  Rect,
  Stop
} from "react-native-svg";
import {
  BASE,
  DURATION,
  RASTERIZE,
  T,
  easeIn,
  easeOut,
  phase
} from "./intro-timeline";
import { Screen, TScreen } from "./intro-screens";

/**
 * The reel behind the logo: the app in use, like a launch video. Tilted columns
 * of screens glide past in opposite directions, each one somebody's booking,
 * somewhere: find an event, open it, pick tickets, pay, and walk in with the QR.
 *
 * Every screen is plain views drawn once; each column is cached as a single
 * bitmap (RASTERIZE) and only slides, on the UI thread, so the whole wall costs
 * about the same per frame as three moving pictures.
 */

// Event indexes refer to EVENTS in intro-screens.
const COLUMNS: { screens: TScreen[]; direction: 1 | -1; speed: number }[] = [
  {
    direction: -1,
    speed: 1,
    screens: [
      { kind: "feed", events: [0, 1] },
      { kind: "detail", event: 0 },
      { kind: "tickets", event: 0 },
      { kind: "paid", event: 0 },
      { kind: "pass", event: 0 }
    ]
  },
  {
    direction: 1,
    speed: 0.8,
    screens: [
      { kind: "pass", event: 2 },
      { kind: "detail", event: 4 },
      { kind: "feed", events: [2, 3] },
      { kind: "tickets", event: 4 },
      { kind: "paid", event: 4 }
    ]
  },
  {
    direction: -1,
    speed: 1.2,
    screens: [
      { kind: "detail", event: 5 },
      { kind: "tickets", event: 1 },
      { kind: "paid", event: 5 },
      { kind: "pass", event: 3 },
      { kind: "feed", events: [6, 5] }
    ]
  }
];

type TReelProps = {
  t: SharedValue<number>;
  width: number;
  height: number;
  /** The middle of the logo-and-ticket group, kept clear so it reads. */
  focusY: number;
  /** How tall that group is. */
  focusHeight: number;
};

const IntroReel: React.FC<TReelProps> = ({
  t,
  width,
  height,
  focusY,
  focusHeight
}) => {
  const columnWidth = Math.round(width * 0.42);
  const gap = Math.round(width * 0.07);
  const screenHeight = Math.round(columnWidth * 2.05);
  const wallWidth = COLUMNS.length * columnWidth + (COLUMNS.length - 1) * gap;
  const columnHeight = COLUMNS[0].screens.length * (screenHeight + gap);

  const wallStyle = useAnimatedStyle(() => ({
    // Kept quiet: a backdrop to the logo, not a second thing to read.
    opacity: 0.5 * phase(t.value, [0, 900], easeOut),
    transform: [
      { rotate: "-8deg" },
      { scale: 1.08 + 0.1 * phase(t.value, T.exit, easeIn) }
    ]
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.wall,
          {
            width: wallWidth,
            height: columnHeight,
            left: (width - wallWidth) / 2,
            top: (height - columnHeight) / 2
          },
          wallStyle
        ]}
      >
        {COLUMNS.map((column, index) => (
          <Column
            key={index}
            t={t}
            {...column}
            left={index * (columnWidth + gap)}
            width={columnWidth}
            screenHeight={screenHeight}
            gap={gap}
          />
        ))}
      </Animated.View>

      {/* A soft clearing behind the logo and ticket, and the reel fading off
          the edges. */}
      <View {...RASTERIZE} style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="clearing" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={BASE} stopOpacity="0.96" />
              <Stop offset="0.6" stopColor={BASE} stopOpacity="0.88" />
              <Stop offset="1" stopColor={BASE} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="edges" cx="50%" cy="50%" r="80%">
              <Stop offset="0.4" stopColor={BASE} stopOpacity="0" />
              <Stop offset="1" stopColor={BASE} stopOpacity="0.95" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#edges)" />
          {/* An ellipse, so the round gradient stretches into a wide oval. */}
          <Ellipse
            cx={width / 2}
            cy={focusY}
            rx={width * 0.9}
            ry={focusHeight * 0.95}
            fill="url(#clearing)"
          />
        </Svg>
      </View>
    </View>
  );
};

type TColumnProps = (typeof COLUMNS)[number] & {
  t: SharedValue<number>;
  left: number;
  width: number;
  screenHeight: number;
  gap: number;
};

const Column = memo(
  ({
    t,
    screens,
    direction,
    speed,
    left,
    width,
    screenHeight,
    gap
  }: TColumnProps) => {
    const travel = screenHeight * 0.5 * speed;
    const style = useAnimatedStyle(() => {
      // A slow, steady glide, and a rush on the way out.
      const glide = (t.value / DURATION) * travel;
      const rush = phase(t.value, T.exit, easeIn) * travel * 0.8;
      return {
        transform: [
          { translateY: direction * (glide + rush) - (direction * travel) / 2 }
        ]
      };
    });
    return (
      <Animated.View
        {...RASTERIZE}
        style={[styles.column, { left, width, gap }, style]}
      >
        {screens.map((screen, index) => (
          <Screen
            key={index}
            screen={screen}
            width={width}
            height={screenHeight}
          />
        ))}
      </Animated.View>
    );
  }
);
Column.displayName = "Column";

export default memo(IntroReel);

const styles = StyleSheet.create({
  wall: {
    position: "absolute"
  },
  column: {
    position: "absolute",
    top: 0
  }
});
