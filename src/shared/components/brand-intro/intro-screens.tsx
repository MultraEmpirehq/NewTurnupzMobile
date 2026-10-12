import React, { memo } from "react";
import { DimensionValue, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { G, Path, Rect } from "react-native-svg";
import { BLUE, INK, BLUE_SOFT, BLUE_DEEP, BLUE_NAVY } from "./intro-timeline";
import { EVENT_ICONS, TEventIcon } from "./intro-icons";

/**
 * The app screens the intro's reel is made of: one booking, start to finish,
 * from finding an event to the QR at the door. They're story cards, not real
 * content: every line of text is an empty placeholder bar, so the flow reads at
 * a glance without showing names, places or prices that could be mistaken for
 * real listings. The feed's cards follow the web's ticket-stub card (poster,
 * perforation, date block).
 */

type TEvent = { icon: TEventIcon; colors: [string, string] };

const EVENTS: TEvent[] = [
  { icon: "tech", colors: [BLUE, BLUE_NAVY] },
  { icon: "food", colors: [BLUE_SOFT, BLUE] },
  { icon: "sport", colors: [BLUE_SOFT, BLUE] },
  { icon: "comedy", colors: [BLUE_NAVY, BLUE_DEEP] },
  { icon: "business", colors: ["#1e40af", BLUE] },
  { icon: "family", colors: [BLUE_DEEP, BLUE_SOFT] },
  { icon: "music", colors: [BLUE_DEEP, BLUE_SOFT] }
];

export type TScreen =
  | { kind: "feed"; events: [number, number] }
  | { kind: "detail" | "tickets" | "paid" | "pass"; event: number };

type TScreenProps = { screen: TScreen; width: number; height: number };

/** One phone screen. Laid out for a 180-wide screen and scaled to fit. */
export const Screen = memo(({ screen, width, height }: TScreenProps) => {
  const u = width / 180;
  return (
    <View
      style={[
        styles.screen,
        { width, height, borderRadius: 20 * u, padding: 10 * u }
      ]}
    >
      <View
        style={[
          styles.notch,
          { width: 44 * u, height: 4 * u, marginBottom: 8 * u }
        ]}
      />
      {screen.kind === "feed" && <Feed u={u} events={screen.events} />}
      {screen.kind === "detail" && (
        <Detail u={u} event={EVENTS[screen.event]} />
      )}
      {screen.kind === "tickets" && <Tickets u={u} />}
      {screen.kind === "paid" && <Paid u={u} />}
      {screen.kind === "pass" && <Pass u={u} event={EVENTS[screen.event]} />}
    </View>
  );
});
Screen.displayName = "Screen";

/* ------------------------------- Pieces -------------------------------- */

/** A placeholder line of text. */
const Bar = ({
  u,
  width,
  height = 5,
  color = "#e6e9f0"
}: {
  u: number;
  width: DimensionValue;
  height?: number;
  color?: string;
}) => (
  <View
    style={{
      width,
      height: height * u,
      borderRadius: (height / 2) * u,
      backgroundColor: color
    }}
  />
);

const Poster = ({
  event,
  u,
  height,
  radius = 12
}: {
  event: TEvent;
  u: number;
  height: number;
  radius?: number;
}) => (
  <LinearGradient
    colors={event.colors}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.center, { height: height * u, borderRadius: radius * u }]}
  >
    <Svg
      width={height * 0.42 * u}
      height={height * 0.42 * u}
      viewBox="0 0 24 24"
    >
      <G
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {EVENT_ICONS[event.icon]}
      </G>
    </Svg>
    {/* The category tag, empty. */}
    <View
      style={[
        styles.tag,
        {
          top: 7 * u,
          left: 7 * u,
          width: 30 * u,
          height: 10 * u,
          borderRadius: 5 * u
        }
      ]}
    />
  </LinearGradient>
);

/** The web card's date block, empty. */
const DateBlock = ({ u }: { u: number }) => (
  <View
    style={[
      styles.dateBlock,
      { width: 24 * u, height: 26 * u, borderRadius: 8 * u, gap: 3 * u }
    ]}
  >
    <Bar u={u} width="55%" height={3} color="#c9dcf5" />
    <Bar u={u} width="45%" height={6} color="#a9c6ee" />
  </View>
);

/** A torn perforation: notches cut in the screen's colour, and a dashed tear. */
const Perforation = ({ u }: { u: number }) => (
  <View style={styles.perforation}>
    {[{ left: -6 * u }, { right: -6 * u }].map((side, index) => (
      <View
        key={index}
        style={[
          styles.hole,
          side,
          { top: -6 * u, width: 12 * u, height: 12 * u, borderRadius: 6 * u }
        ]}
      />
    ))}
    <View
      style={[
        styles.tear,
        { left: 9 * u, right: 9 * u, borderTopWidth: 1.2 * u }
      ]}
    />
  </View>
);

const Button = ({ u }: { u: number }) => (
  <LinearGradient
    colors={[BLUE, BLUE_DEEP]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={[styles.center, { height: 26 * u, borderRadius: 13 * u }]}
  >
    <Bar u={u} width="38%" height={4} color="rgba(255, 255, 255, 0.75)" />
  </LinearGradient>
);

const Lines = ({ u, count }: { u: number; count: number }) => (
  <View style={{ gap: 4 * u }}>
    {Array.from({ length: count }, (_, index) => (
      <Bar
        key={index}
        u={u}
        width={index === count - 1 ? "60%" : "100%"}
        height={4}
      />
    ))}
  </View>
);

/* ------------------------------- Screens ------------------------------- */

// Discover: the feed of ticket-stub cards.
const Feed = ({ u, events }: { u: number; events: [number, number] }) => (
  <View style={{ gap: 8 * u }}>
    <View style={styles.row}>
      <View style={{ gap: 4 * u, flex: 1 }}>
        <Bar u={u} width="45%" height={4} />
        <Bar u={u} width="60%" height={8} color="#d5dae4" />
      </View>
      <LinearGradient
        colors={[BLUE, BLUE_DEEP]}
        style={{ width: 18 * u, height: 18 * u, borderRadius: 9 * u }}
      />
    </View>
    <View style={[styles.row, { gap: 4 * u, justifyContent: "flex-start" }]}>
      {[0, 1, 2, 3].map((chip) => (
        <View
          key={chip}
          style={{
            width: 26 * u,
            height: 12 * u,
            borderRadius: 6 * u,
            backgroundColor: chip === 0 ? INK : "#ffffff"
          }}
        />
      ))}
    </View>
    {events.map((index) => (
      <View key={index} style={[styles.card, { borderRadius: 14 * u }]}>
        <Poster event={EVENTS[index]} u={u} height={72} radius={0} />
        <Perforation u={u} />
        <View style={[styles.row, { padding: 7 * u, gap: 6 * u }]}>
          <DateBlock u={u} />
          <View style={{ flex: 1, gap: 4 * u }}>
            <Bar u={u} width="85%" height={6} color="#d5dae4" />
            <Bar u={u} width="65%" height={4} />
            <Bar u={u} width="35%" height={4} color="#cde4fe" />
          </View>
        </View>
      </View>
    ))}
  </View>
);

// The event page, with its call to get tickets.
const Detail = ({ u, event }: { u: number; event: TEvent }) => (
  <View style={{ flex: 1, gap: 7 * u }}>
    <Poster event={event} u={u} height={120} radius={14} />
    <Bar u={u} width="80%" height={9} color="#d5dae4" />
    <View style={[styles.row, { gap: 6 * u, justifyContent: "flex-start" }]}>
      <DateBlock u={u} />
      <View style={{ flex: 1, gap: 4 * u }}>
        <Bar u={u} width="55%" height={4} />
        <Bar u={u} width="75%" height={4} />
      </View>
    </View>
    <Lines u={u} count={3} />
    <View style={{ flex: 1 }} />
    <View style={[styles.row, { gap: 10 * u }]}>
      <View style={{ flex: 1, gap: 4 * u }}>
        <Bar u={u} width="50%" height={3} />
        <Bar u={u} width="80%" height={7} color="#d5dae4" />
      </View>
      <View style={{ width: "58%" }}>
        <Button u={u} />
      </View>
    </View>
  </View>
);

const TIERS = [
  { picked: false, soldOut: true },
  { picked: true, soldOut: false },
  { picked: false, soldOut: false }
];

// Choosing tickets: one tier picked, one sold out.
const Tickets = ({ u }: { u: number }) => (
  <View style={{ flex: 1, gap: 8 * u }}>
    <Bar u={u} width="65%" height={9} color="#d5dae4" />
    <Bar u={u} width="45%" height={4} />
    {TIERS.map((tier, index) => (
      <View
        key={index}
        style={[
          styles.tier,
          tier.picked && styles.tierPicked,
          tier.soldOut && styles.soldOut,
          { padding: 8 * u, borderRadius: 10 * u }
        ]}
      >
        <View style={{ flex: 1, gap: 4 * u }}>
          <Bar u={u} width="45%" height={5} color="#d5dae4" />
          <Bar u={u} width="30%" height={4} />
        </View>
        {/* The stepper: minus, count, plus. */}
        <View style={[styles.row, { gap: 5 * u }]}>
          {[0, 1, 2].map((dot) => (
            <View
              key={dot}
              style={{
                width: 7 * u,
                height: 7 * u,
                borderRadius: 3.5 * u,
                backgroundColor:
                  dot === 1 ? (tier.picked ? BLUE_DEEP : "#d5dae4") : "#cde4fe"
              }}
            />
          ))}
        </View>
      </View>
    ))}
    <View style={{ flex: 1 }} />
    <View style={styles.row}>
      <Bar u={u} width="30%" height={4} />
      <Bar u={u} width="28%" height={7} color="#d5dae4" />
    </View>
    <Button u={u} />
  </View>
);

// Paid: the tick, and you're going.
const Paid = ({ u }: { u: number }) => (
  <View style={[styles.center, { flex: 1, gap: 8 * u }]}>
    <LinearGradient
      colors={["#22c55e", "#15803d"]}
      style={[
        styles.center,
        { width: 58 * u, height: 58 * u, borderRadius: 29 * u }
      ]}
    >
      <Svg width={28 * u} height={28 * u} viewBox="0 0 24 24">
        <Path
          d="M5 12.5l4.5 4.5L19 7.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </LinearGradient>
    <Bar u={u} width="60%" height={9} color="#d5dae4" />
    <Bar u={u} width="75%" height={4} />
    <Bar u={u} width="50%" height={4} />
    <View
      style={[
        styles.receipt,
        styles.row,
        { borderRadius: 10 * u, padding: 8 * u }
      ]}
    >
      <Bar u={u} width="25%" height={4} />
      <Bar u={u} width="30%" height={6} color="#d5dae4" />
    </View>
    <View style={{ width: "100%" }}>
      <Button u={u} />
    </View>
  </View>
);

// A QR-looking pattern: the three corner finders and a fixed scatter.
const QR_SIZE = 21;
const QR_CELLS = Array.from({ length: QR_SIZE * QR_SIZE }, (_, index) => {
  const x = index % QR_SIZE;
  const y = Math.floor(index / QR_SIZE);
  const finder = (fx: number, fy: number) => {
    const dx = x - fx;
    const dy = y - fy;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return undefined;
    return Math.max(Math.abs(dx - 3), Math.abs(dy - 3)) !== 2;
  };
  const inFinder = finder(0, 0) ?? finder(14, 0) ?? finder(0, 14);
  if (inFinder !== undefined) return inFinder;
  const noise = Math.sin(index * 91.7 + 13.1) * 10000;
  return noise - Math.floor(noise) > 0.52;
});

// The ticket in your pocket, ready at the door.
const Pass = ({ u, event }: { u: number; event: TEvent }) => (
  <View style={{ flex: 1, gap: 8 * u }}>
    <Bar u={u} width="55%" height={9} color="#d5dae4" />
    <View style={[styles.card, { borderRadius: 14 * u }]}>
      <LinearGradient
        colors={event.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 9 * u, gap: 5 * u }}
      >
        <Bar u={u} width="70%" height={7} color="rgba(255, 255, 255, 0.9)" />
        <Bar u={u} width="50%" height={4} color="rgba(255, 255, 255, 0.6)" />
      </LinearGradient>
      <Perforation u={u} />
      <View style={[styles.center, { padding: 12 * u, gap: 7 * u }]}>
        <Svg
          width={88 * u}
          height={88 * u}
          viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
        >
          {QR_CELLS.map((on, index) =>
            on ? (
              <Rect
                key={index}
                x={index % QR_SIZE}
                y={Math.floor(index / QR_SIZE)}
                width={1.02}
                height={1.02}
                fill={INK}
              />
            ) : null
          )}
        </Svg>
        <Bar u={u} width="45%" height={5} color="#d5dae4" />
        <Bar u={u} width="35%" height={4} color="#a7f3d0" />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#f7f8fb",
    borderWidth: 1,
    borderColor: "rgba(11, 29, 42, 0.08)",
    overflow: "hidden"
  },
  notch: {
    alignSelf: "center",
    borderRadius: 4,
    backgroundColor: "rgba(11, 29, 42, 0.12)"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  center: {
    alignItems: "center",
    justifyContent: "center"
  },
  card: {
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(11, 29, 42, 0.06)"
  },
  tag: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.85)"
  },
  perforation: {
    height: 0
  },
  hole: {
    position: "absolute",
    backgroundColor: "#f7f8fb"
  },
  tear: {
    position: "absolute",
    top: 0,
    borderStyle: "dashed",
    borderColor: "#e3e8f2"
  },
  dateBlock: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef6ff"
  },
  tier: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e8ebf2"
  },
  tierPicked: {
    borderColor: BLUE_DEEP,
    backgroundColor: "#e6f1fe"
  },
  soldOut: {
    opacity: 0.45
  },
  receipt: {
    width: "100%",
    backgroundColor: "#ffffff"
  }
});
