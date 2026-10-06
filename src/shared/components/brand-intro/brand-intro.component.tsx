import React, { memo, useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, {
  ClipPath,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop
} from "react-native-svg";
import {
  LOGO_HEIGHT,
  LOGO_PATHS,
  LOGO_PATH_LENGTHS,
  LOGO_VIEWBOX,
  LOGO_WIDTH,
  Z_BOX
} from "./logo-paths";
import {
  BASE,
  BLUE,
  DURATION,
  PINK,
  RASTERIZE,
  REDUCED_DURATION,
  T,
  easeIn,
  easeInOut,
  easeOut,
  easeOutBack,
  phase
} from "./intro-timeline";
import IntroStage from "./intro-stage.component";
import IntroReel from "./intro-reel.component";
import IntroTicket from "./intro-ticket.component";

/**
 * The opening act, five seconds, built on the web's brand loader. Behind it the
 * app plays like a launch video: columns of screens glide past, each one a
 * booking from discovery to the QR at the door. In front, the pen writes
 * "Turnup" in the brand colours and the ink floods in behind it, the "z" spins
 * down into place, and the wordmark gives the loader's heartbeat. Then the
 * web's closing-CTA ticket rises in under it, peeks, and flips over to its QR,
 * ready to scan, before the reel rushes on and opens into the app.
 *
 * One clock (`t`) on the UI thread drives every layer (see intro-timeline). With
 * reduced motion on, it shows the finished scene briefly and fades.
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type TBrandIntroProps = {
  /** Called once the intro has faded out and can be removed. */
  onFinish: () => void;
};

const BrandIntro: React.FC<TBrandIntroProps> = ({ onFinish }) => {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const t = useSharedValue(0);

  const logoWidth = Math.min(width * 0.74, 330);
  const logoHeight = (logoWidth * LOGO_HEIGHT) / LOGO_WIDTH;
  // "Turnup" without the "z", which arrives on its own.
  const inkWidth = (Z_BOX.x / LOGO_WIDTH) * logoWidth;
  // The logo is written a touch above the middle, then lifts to make room
  // for the ticket rising in under it.
  const centerY = height * 0.45;
  const lift = height * 0.1;
  const ticketWidth = Math.min(width * 0.8, 320);
  const ticketTop = centerY - lift + logoHeight / 2 + 40;
  const groupTop = centerY - lift - logoHeight / 2;
  const groupBottom = ticketTop + ticketWidth / 2;

  useEffect(() => {
    if (reducedMotion) {
      // Jump to the finished scene and only play the fade out.
      t.value = T.exit[0] - (REDUCED_DURATION - (T.exit[1] - T.exit[0]));
    }
    t.value = withTiming(
      DURATION,
      {
        duration: reducedMotion ? REDUCED_DURATION : DURATION,
        easing: Easing.linear
      },
      (finished) => {
        if (finished) scheduleOnRN(onFinish);
      }
    );
  }, [reducedMotion, onFinish, t]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: 1 - phase(t.value, T.exit, Easing.in(Easing.quad))
  }));

  // The loader's heartbeat (1 → 1.1 → 0.98 → 1), then the rush out of frame.
  const logoStyle = useAnimatedStyle(() => {
    const beat = phase(t.value, T.beat);
    let scale = 1;
    if (beat > 0 && beat < 1) {
      if (beat < 0.4) scale = 1 + 0.1 * easeOut(beat / 0.4);
      else if (beat < 0.7) scale = 1.1 - 0.12 * easeInOut((beat - 0.4) / 0.3);
      else scale = 0.98 + 0.02 * easeInOut((beat - 0.7) / 0.3);
    }
    const exit = phase(t.value, T.exit, easeIn);
    return {
      transform: [{ scale: scale * (1 + exit * 1.6) }]
    };
  });

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift * phase(t.value, T.ticketIn, easeInOut) }]
  }));

  const ticketStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.25 * phase(t.value, T.exit, easeIn) }]
  }));

  // A halo behind the wordmark that flares on the beat.
  const glowStyle = useAnimatedStyle(() => {
    const beat = phase(t.value, [T.beat[0] - 100, T.beat[1] + 450]);
    const flare = Math.sin(beat * Math.PI);
    return {
      opacity: flare * 0.9 + 0.35 * phase(t.value, T.ink),
      transform: [{ scale: 0.8 + flare * 0.5 }]
    };
  });

  // The pen, tracing "Turnup". The only SVG prop animated per frame.
  const writeProps = useAnimatedProps(() => ({
    strokeDashoffset:
      LOGO_PATH_LENGTHS[0] * (1 - phase(t.value, T.write, easeInOut)),
    strokeOpacity: 1 - 0.7 * phase(t.value, [T.ink[1], T.ink[1] + 400])
  }));

  // The ink floods in left to right through a sliding window: the window moves
  // left by what's still hidden and the ink inside moves back by the same, so
  // only transforms change and the filled logo is never redrawn.
  const inkWindowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -inkWidth * (1 - phase(t.value, T.ink, easeInOut)) }
    ]
  }));
  const inkContentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: inkWidth * (1 - phase(t.value, T.ink, easeInOut)) }
    ]
  }));

  // The light sweeping across the finished wordmark (clipped to its letters).
  const shineProps = useAnimatedProps(() => ({
    x: -50 + (LOGO_WIDTH + 70) * phase(t.value, T.shine, easeInOut)
  }));

  // The "z": spins down from above and lands with a bounce.
  const zStyle = useAnimatedStyle(() => {
    const drop = phase(t.value, T.zDrop, easeOutBack);
    return {
      opacity: phase(t.value, [T.zDrop[0], T.zDrop[0] + 150]),
      transform: [
        { translateY: (1 - drop) * -logoHeight * 1.6 },
        { rotate: `${(1 - drop) * -270}deg` },
        { scale: 0.3 + 0.7 * drop }
      ]
    };
  });

  const zLeft = (Z_BOX.x / LOGO_WIDTH) * logoWidth;
  const zTop = (Z_BOX.y / LOGO_HEIGHT) * logoHeight;
  const zWidth = (Z_BOX.width / LOGO_WIDTH) * logoWidth;
  const zHeight = (Z_BOX.height / LOGO_HEIGHT) * logoHeight;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, screenStyle]}
      pointerEvents="auto"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Turnupz"
    >
      <StatusBar style="dark" />

      <IntroStage t={t} width={width} height={height} />

      <IntroReel
        t={t}
        width={width}
        height={height}
        focusY={(groupTop + groupBottom) / 2}
        focusHeight={groupBottom - groupTop}
      />

      <Animated.View
        style={[
          styles.stage,
          { top: centerY - logoHeight / 2, width, height: logoHeight },
          liftStyle
        ]}
      >
        <Animated.View
          {...RASTERIZE}
          pointerEvents="none"
          style={[
            styles.absolute,
            { width: logoWidth * 1.5, height: logoWidth * 1.5 },
            glowStyle
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={PINK} stopOpacity="0.22" />
                <Stop offset="0.45" stopColor={BLUE} stopOpacity="0.1" />
                <Stop offset="1" stopColor={BLUE} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#halo)" />
          </Svg>
        </Animated.View>

        <Animated.View
          style={[{ width: logoWidth, height: logoHeight }, logoStyle]}
        >
          {/* The ink, revealed through the sliding window. */}
          <Animated.View
            style={[
              styles.absolute,
              styles.inkWindow,
              { width: inkWidth, height: logoHeight },
              inkWindowStyle
            ]}
          >
            <Animated.View {...RASTERIZE} style={inkContentStyle}>
              <Svg width={logoWidth} height={logoHeight} viewBox={LOGO_VIEWBOX}>
                <BrandGradient id="ink" />
                <Path d={LOGO_PATHS[0]} fill="url(#ink)" />
              </Svg>
            </Animated.View>
          </Animated.View>

          {/* The pen's line and the shine, on top. */}
          <Svg
            width={logoWidth}
            height={logoHeight}
            viewBox={LOGO_VIEWBOX}
            style={styles.absolute}
          >
            <Defs>
              <LinearGradient
                id="pen"
                x1="0"
                y1="0"
                x2={LOGO_WIDTH}
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={BLUE} />
                <Stop offset="1" stopColor={PINK} />
              </LinearGradient>
              <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.85" />
                <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </LinearGradient>
              <ClipPath id="letters">
                <Path d={LOGO_PATHS[0]} />
                <Path d={LOGO_PATHS[1]} />
              </ClipPath>
            </Defs>
            <AnimatedPath
              d={LOGO_PATHS[0]}
              fill="none"
              stroke="url(#pen)"
              strokeWidth={0.7}
              strokeLinejoin="round"
              strokeDasharray={[LOGO_PATH_LENGTHS[0], LOGO_PATH_LENGTHS[0]]}
              animatedProps={writeProps}
            />
            <AnimatedRect
              y="0"
              width="40"
              height={LOGO_HEIGHT}
              fill="url(#shine)"
              clipPath="url(#letters)"
              animatedProps={shineProps}
            />
          </Svg>

          {/* The "z", in its own layer so it can spin around its centre. */}
          <Animated.View
            {...RASTERIZE}
            style={[
              styles.absolute,
              { left: zLeft, top: zTop, width: zWidth, height: zHeight },
              zStyle
            ]}
          >
            <Svg
              width={zWidth}
              height={zHeight}
              viewBox={`${Z_BOX.x} ${Z_BOX.y} ${Z_BOX.width} ${Z_BOX.height}`}
            >
              <BrandGradient id="ink-z" />
              <Path d={LOGO_PATHS[1]} fill="url(#ink-z)" />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          styles.ticket,
          { top: ticketTop, left: (width - ticketWidth) / 2 },
          ticketStyle
        ]}
      >
        <IntroTicket t={t} width={ticketWidth} />
      </Animated.View>
    </Animated.View>
  );
};

/** The web loader's ink: blue into pink across the whole wordmark. */
const BrandGradient = ({ id }: { id: string }) => (
  <Defs>
    <LinearGradient
      id={id}
      x1="0"
      y1="0"
      x2={LOGO_WIDTH}
      y2="0"
      gradientUnits="userSpaceOnUse"
    >
      <Stop offset="0" stopColor={BLUE} />
      <Stop offset="1" stopColor={PINK} />
    </LinearGradient>
  </Defs>
);

export default memo(BrandIntro);

const styles = StyleSheet.create({
  screen: {
    backgroundColor: BASE,
    zIndex: 1000,
    elevation: 1000
  },
  absolute: {
    position: "absolute"
  },
  stage: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  inkWindow: {
    left: 0,
    top: 0,
    overflow: "hidden"
  },
  ticket: {
    position: "absolute"
  }
});
