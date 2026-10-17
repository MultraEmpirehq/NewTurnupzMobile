import React, { memo, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { hideMessage, MessageComponentProps } from "react-native-flash-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";

/** Colour and icon per kind of message. Red and green only for status. */
const LOOK = {
  success: { color: BRAND.success, tint: BRAND.successTint, icon: "M5 12.5l4.5 4.5L19 7.5" },
  danger: { color: BRAND.danger, tint: BRAND.dangerTint, icon: "M12 7v6M12 16.5v.5" },
  info: { color: BRAND.blueDeep, tint: BRAND.blueTint, icon: "M12 11v6M12 7.5v.5" }
} as const;

type TKind = keyof typeof LOOK;

/**
 * A message card at the top of the screen. A thin line along its bottom runs
 * down while it's showing, so you can see how long it will stay, like a page
 * loading in a browser. Tap it, or the ×, to close it sooner.
 */
const CustomToastMessageComponent = ({ message }: MessageComponentProps) => {
  const insets = useSafeAreaInsets();
  const kind: TKind = message?.type === "danger" || message?.type === "success" ? message.type : "info";
  const look = LOOK[kind];
  const duration = typeof message?.duration === "number" ? message.duration : 6000;

  // Restart the line for each new message.
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    progress.setValue(1);
    const run = Animated.timing(progress, {
      toValue: 0,
      duration,
      easing: Easing.linear,
      useNativeDriver: false
    });
    run.start();
    return () => run.stop();
  }, [message, duration, progress]);

  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12 }}>
      <Pressable
        onPress={hideMessage}
        accessibilityRole="alert"
        accessibilityLabel={message?.message}
        accessibilityHint="Tap to close"
        className="overflow-hidden rounded-2xl bg-white"
        style={{
          shadowColor: "#07141D",
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
          borderWidth: 1,
          borderColor: "rgba(7,20,29,0.06)"
        }}
      >
        <View className="flex-row items-center gap-3 px-4 py-3.5">
          <View className="size-8 items-center justify-center rounded-full" style={{ backgroundColor: look.tint }}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d={look.icon} fill="none" stroke={look.color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <TextComponent className="flex-1 text-sm font-semibold leading-5 text-zinc-950">
            {message?.message}
          </TextComponent>
          <Pressable onPress={hideMessage} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close message">
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M6 6l12 12M18 6 6 18" fill="none" stroke="#A1A1AA" strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>
        {/* Time left: runs from full width to nothing. */}
        <View style={{ height: 3, backgroundColor: look.tint }}>
          <Animated.View
            style={{
              height: 3,
              backgroundColor: look.color,
              width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] })
            }}
          />
        </View>
      </Pressable>
    </View>
  );
};

export default memo(CustomToastMessageComponent);
