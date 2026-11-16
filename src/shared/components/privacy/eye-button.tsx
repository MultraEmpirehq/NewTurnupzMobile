import React, { memo } from "react";
import { Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useBalancePrivacyStore } from "@/shared/stores/balance-privacy.store";

/**
 * The eye that shows or hides money (Turnupz Credit, an organiser's sales and
 * earnings). One switch for the whole app, hidden until tapped.
 */
const EyeButton = ({ color, background }: { color: string; background: string }) => {
  const hidden = useBalancePrivacyStore((state) => state.hideBalance);
  const toggle = useBalancePrivacyStore((state) => state.toggleHideBalance);
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={hidden ? "Show amounts" : "Hide amounts"}
      hitSlop={12}
      className="size-8 items-center justify-center rounded-full"
      style={{ backgroundColor: background }}
    >
      <Svg width={17} height={17} viewBox="0 0 24 24">
        <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="none" stroke={color} strokeWidth={1.8} />
        {hidden && <Path d="M4 4l16 16" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />}
      </Svg>
    </Pressable>
  );
};

export default memo(EyeButton);
