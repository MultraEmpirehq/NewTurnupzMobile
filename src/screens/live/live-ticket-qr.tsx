import React, { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useKeepAwake } from "expo-keep-awake";
import TextComponent from "@/shared/components/text/text.component";
import { liveCodeFor, serverNow } from "@/shared/utils/live-code";
import { TLiveUserTicket } from "./live-api";

const RING = "#00b2ff";
const RING_TRACK = "#E5F7FF";

/** The code to show, and how long it has left: live when the ticket has a secret. */
const useLiveValue = (ticket: TLiveUserTicket, running: boolean) => {
  const staticValue = ticket.qrCodeValue || ticket.code || ticket.id;
  const make = () =>
    ticket.liveCode && ticket.code
      ? { ...liveCodeFor(ticket.liveCode.secret, ticket.code, ticket.liveCode.windowSeconds), live: true }
      : { value: staticValue, secondsLeft: 0, live: false };
  const [state, setState] = useState(make);
  useEffect(() => {
    setState(make());
    if (!running || !ticket.liveCode) return;
    const timer = setInterval(() => setState(make()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, ticket.liveCode?.secret, ticket.code]);
  return state;
};

/** A band of colour that keeps moving: a screenshot freezes it. */
const ShimmerBand = ({ label }: { label: string }) => {
  const shift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shift, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [shift]);
  return (
    <View className="h-7 w-full items-center justify-center overflow-hidden rounded-t-2xl">
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: "200%",
          transform: [{ translateX: shift.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
        }}
      >
        <LinearGradient
          colors={["#00b2ff", "#7c5cff", "#ff5ca8", "#ffb347", "#00b2ff", "#7c5cff", "#ff5ca8"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
      <TextComponent numberOfLines={1} className="px-3 text-[10px] font-extrabold tracking-[2.5px] text-white">
        {label}
      </TextComponent>
    </View>
  );
};

const clockOf = (at: number) => {
  const date = new Date(at);
  const parts = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }).split(":");
  return { head: parts.slice(0, -1).join(":"), seconds: parts[parts.length - 1] };
};

/**
 * A ticket's QR, live: it changes every 30 seconds, made on the phone from
 * the ticket's secret, so a screenshot stops working within about 90 seconds. Three things move to
 * show it's live (a ring counting down, a shimmering band, the seconds), and
 * the screen stays awake while it's open. Tickets saved before live codes
 * show their plain code until they refresh.
 */
const LiveTicketQr = ({
  ticket,
  size,
  usable,
  holderName,
  compact
}: {
  ticket: TLiveUserTicket;
  size: number;
  /** Not used yet and not over: the code is shown, and runs. */
  usable: boolean;
  holderName?: string;
  /** The peek on a stacked card: just the code. */
  compact?: boolean;
}) => {
  const { value, secondsLeft, live } = useLiveValue(ticket, usable);
  if (compact || !live) {
    return <QRCode value={value} size={size} />;
  }
  return <FullLiveQr value={value} secondsLeft={secondsLeft} windowSeconds={ticket.liveCode!.windowSeconds} size={size} usable={usable} holderName={holderName} />;
};

const FullLiveQr = ({
  value,
  secondsLeft,
  windowSeconds,
  size,
  usable,
  holderName
}: {
  value: string;
  secondsLeft: number;
  windowSeconds: number;
  size: number;
  usable: boolean;
  holderName?: string;
}) => {
  useKeepAwake();
  const ring = size + 44;
  const radius = ring / 2 - 5;
  const around = 2 * Math.PI * radius;
  const clock = clockOf(serverNow());
  return (
    <View className="w-full items-center overflow-hidden rounded-2xl border border-black/5 bg-white">
      <ShimmerBand label={`LIVE · TURNUPZ${holderName ? ` · ${holderName.toUpperCase()}` : ""} · LIVE`} />
      <View style={{ width: ring, height: ring, marginTop: 12 }} className="items-center justify-center">
        <Svg width={ring} height={ring} style={{ position: "absolute" }}>
          <Circle cx={ring / 2} cy={ring / 2} r={radius} stroke={RING_TRACK} strokeWidth={6} fill="none" />
          <Circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            stroke={RING}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${around} ${around}`}
            strokeDashoffset={around * (1 - secondsLeft / windowSeconds)}
            transform={`rotate(-90 ${ring / 2} ${ring / 2})`}
          />
        </Svg>
        <View style={{ opacity: usable ? 1 : 0.35 }}>
          <QRCode value={value} size={size} />
        </View>
      </View>
      <View className="mt-2 flex-row items-center gap-2" accessibilityLiveRegion="polite">
        <View className="size-2 rounded-full" style={{ backgroundColor: "#10b981" }} />
        <TextComponent className="text-xs font-extrabold" style={{ color: "#047857" }}>
          Live code · new one in {secondsLeft}s
        </TextComponent>
      </View>
      <TextComponent className="mb-3 mt-0.5 text-2xl font-extrabold text-zinc-950" style={{ fontVariant: ["tabular-nums"] }}>
        {clock.head}:<TextComponent className="text-2xl font-extrabold" style={{ color: "#0577FA" }}>{clock.seconds}</TextComponent>
      </TextComponent>
    </View>
  );
};

export default memo(LiveTicketQr);
