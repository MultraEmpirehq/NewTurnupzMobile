import { WEB_APP_URL } from "@env";
import React, { memo, useState } from "react";
import SafeModal from "@/shared/components/modals/safe-modal";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import useUserStore from "@/shared/stores/user.store";
import { emailMeLink } from "./organiser-api";

/** A job the app leaves to the website, and why. */
export type TWebOnlyTask = {
  /** "Edit Lagos Sound Weekend" */
  title: string;
  /** Why it's on the web, in a line. */
  reason: string;
  /** The website's page, e.g. "/app/events/123/edit". */
  path: string;
};

export const webUrl = (path: string) =>
  `${(WEB_APP_URL ?? "https://turnupz.app").replace(/\/$/, "")}${path}`;

/**
 * "This is easier on a bigger screen": for setup work the app leaves to the
 * website (editing events, payouts, the team). Emails them the page so it's
 * waiting on their laptop; never blocks, since the website works on a phone.
 */
const WebOnlySheet = ({ task, onClose }: { task: TWebOnlyTask | null; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const email = useUserStore((state) => state.user?.email);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!task || sending) return;
    setSending(true);
    try {
      const result = await emailMeLink(task.path, task.title.toLowerCase());
      onSuccess(`Sent to ${result?.sentTo ?? email}. Open it on your laptop.`);
      onClose();
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "We couldn't send the email. Copy the link instead."));
    } finally {
      setSending(false);
    }
  };
  const copy = async () => {
    if (!task) return;
    await Clipboard.setStringAsync(webUrl(task.path));
    onSuccess("Link copied");
  };
  const openHere = () => {
    if (!task) return;
    onClose();
    void Linking.openURL(webUrl(task.path)).catch(() => onError("We couldn't open the website."));
  };

  return (
    <SafeModal visible={!!task} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1" style={{ backgroundColor: "rgba(7,20,29,0.45)" }} onPress={onClose} accessibilityLabel="Close" />
      <View className="rounded-t-3xl bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-zinc-200" />
        <View className="size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: BRAND.blueTint }}>
          {/* A laptop. */}
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Rect x={4} y={5} width={16} height={11} rx={1.5} fill="none" stroke={BRAND.blueDeep} strokeWidth={2} />
            <Path d="M2 19h20" stroke={BRAND.blueDeep} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </View>
        <TextComponent className="mt-3 text-xl font-extrabold text-zinc-950">This is easier on a bigger screen</TextComponent>
        <TextComponent className="mt-1 text-sm leading-5 text-zinc-600">
          <TextComponent className="text-sm font-bold text-zinc-950">{task?.title}</TextComponent> is on the Turnupz website.{" "}
          {task?.reason}
        </TextComponent>

        <Pressable
          onPress={() => void send()}
          disabled={sending}
          accessibilityRole="button"
          className="mt-5 h-12 items-center justify-center rounded-full"
          style={{ backgroundColor: BRAND.ink }}
        >
          {sending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <TextComponent className="text-[15px] font-bold text-white">Email me the link</TextComponent>
          )}
        </Pressable>
        {!!email && (
          <TextComponent className="mt-1.5 text-center text-xs text-zinc-500">To {email}</TextComponent>
        )}
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => void copy()}
            accessibilityRole="button"
            className="h-11 flex-1 items-center justify-center rounded-full border border-zinc-200"
          >
            <TextComponent className="text-sm font-bold text-zinc-950">Copy link</TextComponent>
          </Pressable>
          <Pressable
            onPress={openHere}
            accessibilityRole="button"
            className="h-11 flex-1 items-center justify-center rounded-full border border-zinc-200"
          >
            <TextComponent className="text-sm font-bold text-zinc-950">Open on this phone</TextComponent>
          </Pressable>
        </View>
      </View>
    </SafeModal>
  );
};

export default memo(WebOnlySheet);
