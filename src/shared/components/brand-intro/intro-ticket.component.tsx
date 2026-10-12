import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle
} from "react-native-reanimated";
import Svg, {
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Stop
} from "react-native-svg";
import {
  BASE,
  BLUE,
  BLUE_DEEP,
  RASTERIZE,
  T,
  easeOut,
  phase
} from "./intro-timeline";
import {
  LOGO_HEIGHT,
  LOGO_PATHS,
  LOGO_VIEWBOX,
  LOGO_WIDTH
} from "./logo-paths";

/**
 * The web's closing-CTA ticket (Re-TurnupWeb: home/landing/flip-ticket.tsx),
 * as the intro's last beat: it rises in, peeks at its back the way the web's
 * does to hint that it turns, then flips over to the QR, ready to scan. The end
 * of every booking in the reel behind it.
 *
 * Two faces turned in 3D, with each hidden once it faces away; a soft shadow
 * underneath narrows as the ticket turns edge-on. The faces aren't cached as
 * bitmaps (unlike the rest of the intro): iOS smears rasterized layers while
 * they turn in 3D.
 */

// The web ticket's 7×7 code.
const CODE = Array.from({ length: 49 }, (_, index) =>
  (index * 5 + Math.floor(index / 7) * 3) % 4 < 2 ? 1 : 0
);

const NAVY = "#00121a";
const easeFlip = Easing.bezierFn(0.22, 1, 0.36, 1);

type TTicketProps = {
  t: SharedValue<number>;
  width: number;
};

const IntroTicket: React.FC<TTicketProps> = ({ t, width }) => {
  const height = width / 2;
  const k = width / 300; // the web ticket is 300 × 150
  const stub = 78 * k;

  /** The ticket's turn, in degrees: the peek, then the flip. */
  const angle = (value: number) => {
    "worklet";
    const hint = phase(value, T.flipHint);
    const peek = -22 * Math.sin(hint * Math.PI);
    return peek + 180 * easeFlip(phase(value, T.flip));
  };

  const holderStyle = useAnimatedStyle(() => {
    const rise = phase(t.value, T.ticketIn, easeOut);
    return {
      opacity: rise,
      transform: [
        { perspective: 900 },
        { translateY: (1 - rise) * 70 },
        // Lands flat from a tilt, then breathes a little, like it's held.
        { rotateX: `${(1 - rise) * 40 + Math.sin(t.value / 700) * 3}deg` },
        { scale: 0.88 + 0.12 * rise }
      ]
    };
  });

  const frontStyle = useAnimatedStyle(() => {
    const turn = angle(t.value);
    return {
      opacity: Math.cos((turn * Math.PI) / 180) > 0 ? 1 : 0,
      transform: [{ perspective: 900 }, { rotateY: `${turn}deg` }]
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const turn = angle(t.value) + 180;
    return {
      opacity: Math.cos((turn * Math.PI) / 180) > 0 ? 1 : 0,
      transform: [{ perspective: 900 }, { rotateY: `${turn}deg` }]
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const edgeOn = Math.abs(Math.cos((angle(t.value) * Math.PI) / 180));
    return {
      opacity: phase(t.value, T.ticketIn, easeOut),
      transform: [{ scaleX: 0.25 + 0.75 * edgeOn }]
    };
  });

  return (
    <Animated.View style={[{ width, height }, holderStyle]}>
      <Animated.View
        {...RASTERIZE}
        style={[
          styles.shadow,
          {
            width: width * 1.1,
            height: 60 * k,
            left: -width * 0.05,
            top: height - 22 * k
          },
          shadowStyle
        ]}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="ticket-shadow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={BLUE_DEEP} stopOpacity="0.32" />
              <Stop offset="1" stopColor={BLUE_DEEP} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
            fill="url(#ticket-shadow)"
          />
        </Svg>
      </Animated.View>

      {/* Front: the brand gradient, the logo, and the stub. */}
      <Animated.View
        style={[styles.face, { borderRadius: 22 * k }, frontStyle]}
      >
        <LinearGradient
          colors={[BLUE, BLUE, BLUE_DEEP]}
          locations={[0, 0.3, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.front, { borderRadius: 22 * k }]}
        >
          <View style={[styles.frontMain, { padding: 20 * k }]}>
            <Svg
              width={(24 * k * LOGO_WIDTH) / LOGO_HEIGHT}
              height={24 * k}
              viewBox={LOGO_VIEWBOX}
            >
              {LOGO_PATHS.map((d) => (
                <Path key={d.slice(0, 12)} d={d} fill="#ffffff" />
              ))}
            </Svg>
            <View>
              <Text style={[styles.eyebrow, { fontSize: 11 * k }]}>
                ADMIT ONE
              </Text>
              <Text style={[styles.headline, { fontSize: 18 * k }]}>
                Your next turn-up
              </Text>
            </View>
          </View>
          <View style={[styles.stub, { width: stub, borderLeftWidth: 2 * k }]}>
            <View
              style={[
                styles.hole,
                { top: -12 * k, left: -12 * k, width: 24 * k, height: 24 * k }
              ]}
            />
            <View
              style={[
                styles.hole,
                {
                  bottom: -12 * k,
                  left: -12 * k,
                  width: 24 * k,
                  height: 24 * k
                }
              ]}
            />
            <Text
              style={[
                styles.serial,
                { fontSize: 11 * k, width: height, letterSpacing: 3 * k }
              ]}
            >
              NO. 0001
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Back: the code, ready at the door. */}
      <Animated.View
        style={[
          styles.face,
          styles.back,
          { borderRadius: 22 * k, padding: 20 * k, gap: 20 * k },
          backStyle
        ]}
      >
        <View
          style={[
            styles.code,
            { padding: 10 * k, gap: 3 * k, borderRadius: 12 * k }
          ]}
        >
          {Array.from({ length: 7 }, (_, row) => (
            <View key={row} style={[styles.codeRow, { gap: 3 * k }]}>
              {CODE.slice(row * 7, row * 7 + 7).map((on, column) => (
                <View
                  key={column}
                  style={{
                    width: 10 * k,
                    height: 10 * k,
                    borderRadius: 2 * k,
                    backgroundColor: on ? NAVY : "transparent"
                  }}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.ready, { fontSize: 11 * k }]}>
            READY TO SCAN
          </Text>
          {/* <Text
            style={[styles.headline, { fontSize: 18 * k, marginTop: 4 * k }]}
          >
            See you there.
          </Text> */}
        
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default memo(IntroTicket);

const styles = StyleSheet.create({
  shadow: {
    position: "absolute"
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: "hidden",
    overflow: "hidden"
  },
  front: {
    flex: 1,
    flexDirection: "row"
  },
  frontMain: {
    flex: 1,
    justifyContent: "space-between"
  },
  eyebrow: {
    color: "rgba(255, 255, 255, 0.75)",
    fontFamily: "PlusJakartaSans-Medium",
    letterSpacing: 2.4
  },
  headline: {
    color: "#ffffff",
    fontFamily: "PlusJakartaSans-Bold"
  },
  stub: {
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    borderLeftColor: "rgba(255, 255, 255, 0.4)"
  },
  // The notches are cut in the page colour, so they read as holes.
  hole: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: BASE
  },
  serial: {
    color: "rgba(255, 255, 255, 0.8)",
    fontFamily: "PlusJakartaSans-Medium",
    textAlign: "center",
    transform: [{ rotate: "90deg" }]
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NAVY
  },
  code: {
    backgroundColor: "#ffffff"
  },
  codeRow: {
    flexDirection: "row"
  },
  ready: {
    color: "#6ee7b7",
    fontFamily: "PlusJakartaSans-Medium",
    letterSpacing: 2.4
  },
  hint: {
    color: "rgba(255, 255, 255, 0.55)",
    fontFamily: "PlusJakartaSans-Regular"
  }
});
