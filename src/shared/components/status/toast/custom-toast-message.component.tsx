import React, { memo, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { hideMessage, MessageComponentProps } from "react-native-flash-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";

/** A solid colour and icon per kind of message. Red and green only for status. */
const LOOK = {
  success: { background: BRAND.success, icon: "M5 12.5l4.5 4.5L19 7.5" },
  danger: { background: BRAND.danger, icon: "M12 7v6M12 16.5v.5" },
  info: { background: BRAND.blueDeep, icon: "M12 11v6M12 7.5v.5" }
} as const;

type TKind = keyof typeof LOOK;

/**
 * A message card at the top of the screen in the colour of what happened.
 * A thin line along its bottom runs down while it's showing, so you can see
 * how long it will stay. Tap it, or the ×, to close it sooner. The line is
 * driven by a plain timer: animations don't run reliably on the new
 * renderer, which once left every toast invisible.
 */
const CustomToastMessageComponent = ({ message }: MessageComponentProps) => {
  const insets = useSafeAreaInsets();
  const kind: TKind = message?.type === "danger" || message?.type === "success" ? message.type : "info";
  const look = LOOK[kind];
  const duration = typeof message?.duration === "number" ? message.duration : 4000;

  // Time left, 1 → 0, ticking a few times a second.
  const [left, setLeft] = useState(1);
  useEffect(() => {
    const started = Date.now();
    setLeft(1);
    const timer = setInterval(() => {
      const next = Math.max(0, 1 - (Date.now() - started) / duration);
      setLeft(next);
      if (next === 0) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [message, duration]);

  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12 }}>
      <Pressable
        onPress={hideMessage}
        accessibilityRole="alert"
        accessibilityLabel={message?.message}
        accessibilityHint="Tap to close"
        className="overflow-hidden rounded-2xl"
        style={{
          backgroundColor: look.background,
          shadowColor: "#07141D",
          shadowOpacity: 0.22,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10
        }}
      >
        <View className="flex-row items-center gap-3 px-4 py-3.5">
          <View className="size-8 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.22)" }}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d={look.icon} fill="none" stroke={BRAND.white} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <TextComponent className="flex-1 text-sm font-semibold leading-5" style={{ color: BRAND.white }}>
            {message?.message}
          </TextComponent>
          <Pressable onPress={hideMessage} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close message">
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M6 6l12 12M18 6 6 18" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2.4} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>
        {/* Time left. */}
        <View style={{ height: 3, backgroundColor: "rgba(255,255,255,0.25)" }}>
          <View style={{ height: 3, width: `${Math.round(left * 1000) / 10}%`, backgroundColor: "rgba(255,255,255,0.9)" }} />
        </View>
      </Pressable>
    </View>
  );
};

export default memo(CustomToastMessageComponent);
