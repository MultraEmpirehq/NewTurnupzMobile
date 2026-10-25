import React, { memo } from "react";
import SafeModal from "@/shared/components/modals/safe-modal";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";

/**
 * Asked once, the first time we see someone runs events or is on a team: which
 * way should Turnupz open? The app then opens the way they last used it.
 */
const ChooseModeSheet = ({
  visible,
  who,
  onChoose
}: {
  visible: boolean;
  /** "You run events" or "Afrobeat Live Ltd added you to their team". */
  who: string;
  onChoose: (mode: "attendee" | "organiser") => void;
}) => {
  const insets = useSafeAreaInsets();
  return (
    <SafeModal visible={visible} transparent animationType="slide" onRequestClose={() => onChoose("attendee")}>
      <View className="flex-1" style={{ backgroundColor: "rgba(7,20,29,0.45)" }} />
      <View className="rounded-t-3xl bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-zinc-200" />
        <TextComponent className="text-[11px] font-extrabold tracking-widest" style={{ color: BRAND.blueDeep }}>
          {who.toUpperCase()}
        </TextComponent>
        <TextComponent className="mt-1 text-xl font-extrabold text-zinc-950">How do you want to open Turnupz?</TextComponent>
        <TextComponent className="mt-1 text-sm leading-5 text-zinc-600">
          You can switch any time from your profile.
        </TextComponent>

        <Pressable
          onPress={() => onChoose("organiser")}
          accessibilityRole="button"
          className="mt-5 rounded-2xl p-4"
          style={{ backgroundColor: BRAND.ink }}
        >
          <TextComponent className="text-base font-extrabold text-white">Organiser</TextComponent>
          <TextComponent className="mt-0.5 text-xs text-white/70">Today's sales, your events, scanning tickets at the door</TextComponent>
        </Pressable>
        <Pressable
          onPress={() => onChoose("attendee")}
          accessibilityRole="button"
          className="mt-2.5 rounded-2xl border border-zinc-200 p-4"
        >
          <TextComponent className="text-base font-extrabold text-zinc-950">Attendee</TextComponent>
          <TextComponent className="mt-0.5 text-xs text-zinc-500">Find events, buy tickets, your passes</TextComponent>
        </Pressable>
      </View>
    </SafeModal>
  );
};

export default memo(ChooseModeSheet);
