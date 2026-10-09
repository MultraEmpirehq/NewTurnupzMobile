import React, { memo, useEffect, useId } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  withSequence,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import Svg, {
  ClipPath,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop
} from "react-native-svg";
import TextComponent from "../text/text.component";
import {
  LOGO_HEIGHT,
  LOGO_PATHS,
  LOGO_PATH_LENGTHS,
  LOGO_VIEWBOX,
  LOGO_WIDTH
} from "../brand-intro/logo-paths";
import { BLUE, PINK } from "../brand-intro/intro-timeline";

/**
 * The web's brand loader (Re-TurnupWeb: components/ui/brand-loader), on the same
 * 3.6s loop: the wordmark's outline is traced, the brand gradient inks in from
 * left to right, it gives one heartbeat with a glow, then fades and writes
 * itself again. With reduced motion on, it just shows the logo.
 */

const LOOP_MS = 3600;
const ease = Easing.bezierFn(0.65, 0, 0.35, 1);

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** 0 → 1 across [from, to] of the loop (both as fractions), held after. */
const span = (value: number, from: number, to: number) => {
  "worklet";
  return Math.min(1, Math.max(0, (value - from) / (to - from)));
};

const Dot = ({ t, index }: { t: SharedValue<number>; index: number }) => {
  const style = useAnimatedStyle(() => {
    // Each dot pulses on its own 1.2s beat, offset like the web's.
    const local = ((t.value * LOOP_MS) / 1200 + 1 - index * 0.2) % 1;
    return { opacity: 0.25 + 0.75 * Math.sin(local * Math.PI) };
  });
  return (
    <Animated.Text style={[{ color: "#71717a", fontSize: 14 }, style]}>
      .
    </Animated.Text>
  );
};

type TBrandLoaderProps = {
  /** What's loading. Defaults to the brand's own "Turning up...". */
  label?: string;
  /** The wordmark's height in points. */
  height?: number;
  /** Hides the "Turning up..." line, e.g. in a pull-to-refresh. */
  hideLabel?: boolean;
  /**
   * Drives the drawing by hand (0 → 1), e.g. how far a list has been pulled:
   * the pen writes and the ink fills as it grows. Loops instead while `playing`.
   */
  progress?: SharedValue<number>;
  /** Plays the loop; on by default unless `progress` is driving it. */
  playing?: boolean;
};

/** How far into the loop the wordmark is fully written and inked. */
const INKED_AT = 0.4;

const BrandLoader: React.FC<TBrandLoaderProps> = ({
  label,
  height = 52,
  hideLabel,
  progress,
  playing = !progress
}) => {
  const reducedMotion = useReducedMotion();
  const t = useSharedValue(reducedMotion ? 0.5 : 0);
  const width = (height * LOGO_WIDTH) / LOGO_HEIGHT;
  const text = (label ?? "Turning up...").replace(/(\.{3}|…)$/, "");
  // Own ids, so several loaders on screen don't share one gradient.
  const uid = useId().replace(/:/g, "");

  // Hand-driven: follow the pull until the loop takes over.
  useAnimatedReaction(
    () => (progress && !playing ? progress.value : null),
    (value) => {
      if (value !== null && !reducedMotion) {
        t.value = INKED_AT * Math.min(1, Math.max(0, value));
      }
    },
    [playing, reducedMotion]
  );

  useEffect(() => {
    if (reducedMotion || !playing) {
      cancelAnimation(t);
      return;
    }
    // Finish the current pass from wherever the pull left it, then loop.
    t.value = withSequence(
      withTiming(1, {
        duration: LOOP_MS * (1 - t.value),
        easing: Easing.linear
      }),
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: LOOP_MS, easing: Easing.linear })
        ),
        -1,
        false
      )
    );
  }, [playing, reducedMotion, t]);

  // Fade in fast, hold, fade out at the end of each loop.
  const fadeStyle = useAnimatedStyle(() => {
    const value = t.value;
    // Pulled by hand it stays solid; the loop fades in and out.
    const opacity =
      progress && !playing
        ? 1
        : value < 0.03
          ? value / 0.03
          : value > 0.92
            ? (1 - value) / 0.08
            : 1;
    // The heartbeat: 1 → 1.1 → 0.98 → 1 around 54–70%.
    let scale = 1;
    if (value > 0.54 && value < 0.6) scale = 1 + 0.1 * span(value, 0.54, 0.6);
    else if (value >= 0.6 && value < 0.65)
      scale = 1.1 - 0.12 * span(value, 0.6, 0.65);
    else if (value >= 0.65 && value < 0.7)
      scale = 0.98 + 0.02 * span(value, 0.65, 0.7);
    return { opacity: reducedMotion ? 1 : opacity, transform: [{ scale }] };
  });

  const glowStyle = useAnimatedStyle(() => {
    const value = t.value;
    const glow =
      value < 0.52 || value > 0.74
        ? 0
        : value < 0.6
          ? span(value, 0.52, 0.6)
          : 1 - span(value, 0.6, 0.74);
    return { opacity: reducedMotion ? 0 : glow };
  });

  // The pen, one stroke per path, drawn over the first third of the loop.
  const penOffset = (length: number) => {
    "worklet";
    return length * (reducedMotion ? 0 : 1 - ease(span(t.value, 0, 0.34)));
  };
  const writeWord = useAnimatedProps(() => ({
    strokeDashoffset: penOffset(LOGO_PATH_LENGTHS[0])
  }));
  const writeZ = useAnimatedProps(() => ({
    strokeDashoffset: penOffset(LOGO_PATH_LENGTHS[1])
  }));
  const writeProps = [writeWord, writeZ];

  const inkProps = useAnimatedProps(() => ({
    width: LOGO_WIDTH * (reducedMotion ? 1 : ease(span(t.value, 0.14, 0.4)))
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? "Turning up"}
      className="items-center gap-3"
    >
      <Animated.View style={fadeStyle}>
        {/* A soft halo that flares with each beat. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: -width * 0.25,
              top: -height * 1.2,
              width: width * 1.5,
              height: height * 3.4
            },
            glowStyle
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={PINK} stopOpacity="0.28" />
                <Stop offset="0.5" stopColor={BLUE} stopOpacity="0.14" />
                <Stop offset="1" stopColor={BLUE} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${uid}-glow)`} />
          </Svg>
        </Animated.View>

        <Svg width={width} height={height} viewBox={LOGO_VIEWBOX}>
          <Defs>
            <LinearGradient
              id={`${uid}-ink`}
              x1="0"
              y1="0"
              x2={LOGO_WIDTH}
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={BLUE} />
              <Stop offset="1" stopColor={PINK} />
            </LinearGradient>
            <ClipPath id={`${uid}-clip`}>
              <AnimatedRect
                x="0"
                y="0"
                height={LOGO_HEIGHT}
                animatedProps={inkProps}
              />
            </ClipPath>
          </Defs>
          {/* The pen: each outline traced once. */}
          {LOGO_PATHS.map((d, index) => (
            <AnimatedPath
              key={`line-${index}`}
              d={d}
              fill="none"
              stroke={`url(#${uid}-ink)`}
              strokeWidth={0.6}
              strokeLinejoin="round"
              strokeDasharray={[
                LOGO_PATH_LENGTHS[index],
                LOGO_PATH_LENGTHS[index]
              ]}
              animatedProps={writeProps[index]}
            />
          ))}
          {/* The ink, revealed left to right behind the pen. */}
          <Path
            d={LOGO_PATHS[0]}
            fill={`url(#${uid}-ink)`}
            clipPath={`url(#${uid}-clip)`}
          />
          <Path
            d={LOGO_PATHS[1]}
            fill={`url(#${uid}-ink)`}
            clipPath={`url(#${uid}-clip)`}
          />
        </Svg>
      </Animated.View>

      {/* The words, with their dots taking turns to light up. */}
      {!hideLabel && (
        <View className="flex-row">
          <TextComponent className="text-sm font-medium text-zinc-500">
            {text}
          </TextComponent>
          {[0, 1, 2].map((dot) => (
            <Dot key={dot} t={t} index={dot} />
          ))}
        </View>
      )}
    </View>
  );
};

export default memo(BrandLoader);
