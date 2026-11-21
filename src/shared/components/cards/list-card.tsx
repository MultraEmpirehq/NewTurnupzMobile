import React, { memo } from "react";
import { Pressable, View, ViewStyle } from "react-native";

/** The lift every card in a list has: the event cards set it. */
export const LIST_CARD_SHADOW: ViewStyle = {
  shadowColor: "#0f172a",
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 3
};

/** Photos at the top of list cards: 4:3, as on the event cards. */
export const LIST_CARD_PHOTO_RATIO = 4 / 3;

/**
 * The card for anything in a feed-style list (events, posts): white, rounded,
 * a hairline border and a soft shadow, 16 in from each side unless it has a
 * fixed width (in a side-scrolling rail). Pass `onPress` to make it a button.
 */
const ListCard = ({
  children,
  width,
  onPress,
  accessibilityLabel,
  borderColor,
  thickBorder = false
}: {
  children: React.ReactNode;
  width?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** A coloured outline (a sponsored event). */
  borderColor?: string;
  thickBorder?: boolean;
}) => {
  const outer = width ? "mb-5 rounded-3xl bg-white" : "mx-4 mb-5 rounded-3xl bg-white";
  const inner = (
    <View
      className={thickBorder ? "overflow-hidden rounded-3xl border-2" : "overflow-hidden rounded-3xl border border-black/5"}
      style={borderColor ? { borderColor } : undefined}
    >
      {children}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} className={outer} style={{ width, ...LIST_CARD_SHADOW }}>
      {inner}
    </Pressable>
  ) : (
    <View className={outer} style={{ width, ...LIST_CARD_SHADOW }}>
      {inner}
    </View>
  );
};

export default memo(ListCard);
