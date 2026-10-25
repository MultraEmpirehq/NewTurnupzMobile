import React, { memo } from "react";
import SafeModal from "@/shared/components/modals/safe-modal";
import { Linking, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import TextComponent from "@/shared/components/text/text.component";
import OverlayToast from "@/shared/components/status/toast/overlay-toast";
import { onError } from "@/shared/components/status/toast";
import { BRAND } from "@/shared/utils/brand-colors";

/** "tix.example.com/abc" → "tix.example.com"; null if it isn't a web link. */
export const linkHost = (url?: string | null) => {
  const match = (url ?? "").trim().match(/^https?:\/\/([^/?#]+)/i);
  return match ? match[1].replace(/^www\./i, "").toLowerCase() : null;
};

const POINTS = [
  "You'll pay on their website, not on Turnupz.",
  "Turnupz Credit and your saved cards can't be used there.",
  "For refunds or problems with your ticket, contact the seller."
];

/**
 * Shown before an event's outside ticket link opens, so people know they're
 * leaving Turnupz and who they're buying from.
 */
const LeavingTurnupzSheet = ({
  url,
  eventName,
  onClose
}: {
  /** The outside ticket link; the sheet shows while it's set. */
  url: string | null;
  eventName?: string;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const host = linkHost(url);

  const go = async () => {
    if (!url || !host) return;
    onClose();
    try {
      await Linking.openURL(url.trim());
    } catch {
      onError("We couldn't open that website. Please try again.");
    }
  };

  return (
    <SafeModal visible={!!url} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1" style={{ backgroundColor: "rgba(7,20,29,0.45)" }} onPress={onClose} accessibilityLabel="Close" />
      <View className="rounded-t-3xl bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-zinc-200" />
        <View className="size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: BRAND.blueTint }}>
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path
              d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
              fill="none"
              stroke={BRAND.blueDeep}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <TextComponent className="mt-3 text-xl font-extrabold text-zinc-950">You're leaving Turnupz</TextComponent>
        <TextComponent className="mt-1 text-sm leading-5 text-zinc-600">
          {eventName ? `Tickets for ${eventName} are sold on ` : "These tickets are sold on "}
          <TextComponent className="text-sm font-bold text-zinc-950">{host ?? "another website"}</TextComponent>.
        </TextComponent>

        <View className="mt-4 gap-2.5 rounded-2xl p-3.5" style={{ backgroundColor: "#F7F8FB" }}>
          {POINTS.map((point) => (
            <View key={point} className="flex-row gap-2.5">
              <View className="mt-[7px] size-1.5 rounded-full" style={{ backgroundColor: BRAND.blueDeep }} />
              <TextComponent className="flex-1 text-[13px] leading-5 text-zinc-700">{point}</TextComponent>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => void go()}
          disabled={!host}
          accessibilityRole="button"
          className="mt-5 h-12 items-center justify-center rounded-full"
          style={{ backgroundColor: host ? BRAND.ink : "#C7CDD6" }}
        >
          <TextComponent className="text-[15px] font-bold text-white">
            {host ? `Continue to ${host}` : "This link doesn't work"}
          </TextComponent>
        </Pressable>
        <Pressable onPress={onClose} accessibilityRole="button" className="mt-2 h-11 items-center justify-center">
          <TextComponent className="text-sm font-bold" style={{ color: BRAND.blueDeep }}>Stay on Turnupz</TextComponent>
        </Pressable>
      </View>
      <OverlayToast />
    </SafeModal>
  );
};

export default memo(LeavingTurnupzSheet);
