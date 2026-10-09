import React, { memo, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from "react-native-reanimated";
import QRCode from "react-native-qrcode-svg";
import Svg, { Path } from "react-native-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import {
  LOGO_HEIGHT,
  LOGO_PATHS,
  LOGO_VIEWBOX,
  LOGO_WIDTH
} from "@/shared/components/brand-intro/logo-paths";
import {
  formatEventClock,
  formatEventDay
} from "@/shared/utils/event-time";
import { TICKET_LIST_BACKGROUND } from "./event-ticket-card";

/**
 * A booked event as the intro's flip ticket (the web's closing-CTA ticket):
 * the brand gradient (the photo is only a small thumb, so it never fights the
 * text), the logo, ADMIT and the event,
 * and a torn stub with the ticket number. The first few peek at their back
 * when the list opens, hinting that they turn. Tap one and it flips over to
 * your QR, ready to scan, then hands over to the full passes; it turns back
 * when they close.
 */

const BLUE = "#00b2ff";
const PINK = "#ff0088";
const NAVY = "#00121a";
const easeFlip = Easing.bezier(0.22, 1, 0.36, 1);

type TFlipTicketCardProps = {
  name: string;
  date: Date | string;
  timezone?: string;
  place?: string;
  image?: string;
  /** How many tickets you hold for it. */
  count: number;
  /** The ticket type(s), e.g. "VIP" or "VIP + 1 more". */
  ticketLabel: string;
  /** What the QR on the back holds: your first ticket that still works. */
  qrValue?: string;
  /** The short number on the stub. */
  serial: string;
  /** "Ready", or "Checked in" and the like when none can be used. */
  status: { label: string; ready: boolean };
  /** Past events read in greys. */
  past?: boolean;
  width: number;
  /** Peek on arrival after this delay (ms); unset, it doesn't. */
  peekDelay?: number;
  /** Turned over (showing the QR) while its passes are open. */
  flipped: boolean;
  onPress: () => void;
};

const FlipTicketCard = ({
  name,
  date,
  timezone,
  place,
  image,
  count,
  ticketLabel,
  qrValue,
  serial,
  status,
  past,
  width,
  peekDelay,
  flipped,
  onPress
}: TFlipTicketCardProps) => {
  const height = Math.round(width * 0.52);
  const k = width / 300; // the web ticket is 300 × 150
  const stub = 74 * k;
  const turn = useSharedValue(0);

  // The intro's peek: a small turn and back, to show it has a back.
  useEffect(() => {
    if (peekDelay === undefined) return;
    turn.value = withDelay(
      peekDelay,
      withSequence(
        withTiming(-24, { duration: 380, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 520, easing: easeFlip })
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Turned over while the passes are open; back again once they close.
  useEffect(() => {
    turn.value = withTiming(flipped ? 180 : 0, { duration: 620, easing: easeFlip });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  const front = useAnimatedStyle(() => ({
    opacity: Math.cos((turn.value * Math.PI) / 180) > 0 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${turn.value}deg` }]
  }));
  const back = useAnimatedStyle(() => ({
    opacity: Math.cos(((turn.value + 180) * Math.PI) / 180) > 0 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${turn.value + 180}deg` }]
  }));

  // Tap: turn over to the QR, then open the passes as it lands.
  const press = () => {
    turn.value = withTiming(180, { duration: 560, easing: easeFlip }, (done) => {
      if (done) runOnJS(onPress)();
    });
  };

  const radius = 22 * k;
  const notch = 24 * k;
  const colors: [string, string, string] = past ? ["#334155", "#475569", "#64748b"] : [BLUE, BLUE, PINK];

  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${count} ${count === 1 ? "ticket" : "tickets"}. Open your ${count === 1 ? "pass" : "passes"}`}
      style={{ width, height, alignSelf: "center", marginBottom: 18 }}
    >
      {/* Front: the event under the brand gradient, the logo, and the stub. */}
      <Animated.View style={[styles.face, { borderRadius: radius }, front]}>
        <LinearGradient
          colors={colors}
          locations={[0, 0.35, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.row}>
          <View style={[styles.main, { padding: 18 * k }]}>
            <View style={styles.topRow}>
              <Svg width={(20 * k * LOGO_WIDTH) / LOGO_HEIGHT} height={20 * k} viewBox={LOGO_VIEWBOX}>
                {LOGO_PATHS.map((d) => (
                  <Path key={d.slice(0, 12)} d={d} fill="#ffffff" />
                ))}
              </Svg>
              <View style={[styles.topRight, { gap: 6 * k }]}>
                {!status.ready && (
                  <View style={[styles.chip, { paddingHorizontal: 8 * k, paddingVertical: 2 * k }]}>
                    <Text style={[styles.chipText, { fontSize: 10 * k }]}>{status.label.toUpperCase()}</Text>
                  </View>
                )}
                {/* The event's photo as a small thumb: it never sits behind text. */}
                {!!image && (
                  <View
                    style={[
                      styles.thumb,
                      { width: 40 * k, height: 40 * k, borderRadius: 12 * k, borderWidth: 2 * k }
                    ]}
                  >
                    <CustomImage
                      style={{ width: "100%", height: "100%" }}
                      imageStyle={{ width: "100%", height: "100%" }}
                      source={{ uri: image }}
                      contentFit="cover"
                    />
                  </View>
                )}
              </View>
            </View>
            <View>
              <Text style={[styles.eyebrow, { fontSize: 10 * k }]}>
                ADMIT {count === 1 ? "ONE" : count} · {ticketLabel.toUpperCase()}
              </Text>
              <Text numberOfLines={2} style={[styles.headline, { fontSize: 19 * k, lineHeight: 22 * k }]}>
                {name}
              </Text>
              <Text numberOfLines={1} style={[styles.detail, { fontSize: 12 * k, marginTop: 4 * k }]}>
                {formatEventDay(date, timezone, { withYear: false })} · {formatEventClock(date, timezone)}
              </Text>
              {!!place && (
                <Text numberOfLines={1} style={[styles.detail, { fontSize: 12 * k }]}>
                  {place}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.stub, { width: stub, borderLeftWidth: 2 * k }]}>
            {/* The notches are cut in the page colour, so they read as holes. */}
            <View style={[styles.hole, { top: -notch / 2, left: -notch / 2, width: notch, height: notch }]} />
            <View style={[styles.hole, { bottom: -notch / 2, left: -notch / 2, width: notch, height: notch }]} />
            <Text style={[styles.serial, { fontSize: 11 * k, width: height, letterSpacing: 3 * k }]}>
              NO. {serial}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Back: your code, ready at the door. */}
      <Animated.View
        style={[styles.face, styles.back, { borderRadius: radius, padding: 16 * k, gap: 16 * k }, back]}
      >
        <View style={[styles.code, { padding: 8 * k, borderRadius: 12 * k }]}>
          {!!qrValue && <QRCode value={qrValue} size={height - 32 * k - 16 * k} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.ready, { fontSize: 11 * k, color: status.ready ? "#6ee7b7" : "#cbd5e1" }]}>
            {status.ready ? "READY TO SCAN" : status.label.toUpperCase()}
          </Text>
          <Text numberOfLines={2} style={[styles.headline, { fontSize: 17 * k, marginTop: 4 * k }]}>
            {ticketLabel}
          </Text>
          <Text style={[styles.hint, { fontSize: 12 * k, marginTop: 4 * k }]}>
            {count > 1 ? `${count} passes` : "Show it at the door"}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

export default memo(FlipTicketCard);

const styles = StyleSheet.create({
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: "hidden",
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  row: { flex: 1, flexDirection: "row" },
  main: { flex: 1, justifyContent: "space-between" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topRight: { flexDirection: "row", alignItems: "center" },
  thumb: { overflow: "hidden", borderColor: "rgba(255,255,255,0.9)", backgroundColor: "rgba(255,255,255,0.2)" },
  chip: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" },
  chipText: { color: "#ffffff", fontFamily: "Avenir-Black", letterSpacing: 1.2 },
  eyebrow: { color: "rgba(255, 255, 255, 0.8)", fontFamily: "Avenir-Roman", letterSpacing: 2.2 },
  headline: {
    color: "#ffffff",
    fontFamily: "Avenir-Black",
    textShadowColor: "rgba(0, 18, 26, 0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  detail: {
    color: "rgba(255, 255, 255, 0.92)",
    fontFamily: "Avenir-Roman",
    textShadowColor: "rgba(0, 18, 26, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  stub: {
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    borderLeftColor: "rgba(255, 255, 255, 0.45)"
  },
  hole: { position: "absolute", borderRadius: 999, backgroundColor: TICKET_LIST_BACKGROUND },
  serial: {
    color: "rgba(255, 255, 255, 0.85)",
    fontFamily: "Avenir-Roman",
    textAlign: "center",
    transform: [{ rotate: "90deg" }]
  },
  back: { flexDirection: "row", alignItems: "center", backgroundColor: NAVY },
  code: { backgroundColor: "#ffffff" },
  ready: { fontFamily: "Avenir-Roman", letterSpacing: 2.2 },
  hint: { color: "rgba(255, 255, 255, 0.6)", fontFamily: "Avenir-Book" }
});
