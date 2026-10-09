import React, { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";
import { useQueryClient } from "@tanstack/react-query";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { onError } from "@/shared/components/status/toast";
import useUserStore from "@/shared/stores/user.store";
import { constructErrorMessage } from "@/api/functions";
import {
  formatEventClock,
  formatEventDay
} from "@/shared/utils/event-time";
import {
  TLiveChatMessage,
  TSharedEvent,
  sendChatMessage,
  useLiveChatMessages
} from "./live-api";

/**
 * A real chat: the messages come from the api, and new ones are sent to it.
 * An event shared into the chat shows as that event's card. When opened from
 * an event ("Message event organizer"), that event rides along with the first
 * message so the organiser knows what it's about.
 */

const BLUE = "#00B2FF";

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const SharedEventCard = ({
  event,
  onPress,
  mine
}: {
  event: TSharedEvent;
  onPress?: () => void;
  mine?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    className="w-60 overflow-hidden rounded-2xl border border-black/5 bg-white"
  >
    <View className="h-28 w-full bg-[#eef6ff]">
      {!!event.image && (
        <CustomImage
          className="size-full"
          imageClassName="size-full"
          source={{ uri: event.image }}
          contentFit="cover"
        />
      )}
    </View>
    <View className="gap-0.5 px-3 py-2.5">
      <TextComponent numberOfLines={2} className="text-sm font-bold text-zinc-950">
        {event.name}
      </TextComponent>
      <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
        {formatEventDay(event.date, event.timezone, { withYear: false })} ·{" "}
        {formatEventClock(event.date, event.timezone)}
      </TextComponent>
      {!!event.place && (
        <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
          {event.place}
        </TextComponent>
      )}
      {!!onPress && (
        <TextComponent
          className="mt-1 text-xs font-bold"
          style={{ color: BLUE }}
        >
          View event
        </TextComponent>
      )}
    </View>
  </Pressable>
);

const Bubble = ({
  message,
  mine,
  onOpenEvent
}: {
  message: TLiveChatMessage;
  mine: boolean;
  onOpenEvent?: (eventId: string) => void;
}) => {
  const shared = message.metadata?.sharedEvent;
  return (
    <View className={mine ? "items-end px-4 py-1" : "items-start px-4 py-1"}>
      {!mine && !!message.senderName && (
        <TextComponent className="mb-1 ml-1 text-[11px] font-semibold text-zinc-500">
          {message.senderName}
        </TextComponent>
      )}
      {!!shared && (
        <View className="mb-1">
          <SharedEventCard
            event={shared}
            mine={mine}
            onPress={onOpenEvent ? () => onOpenEvent(shared.id) : undefined}
          />
        </View>
      )}
      {!!message.body && (
        <View
          className="max-w-[78%] rounded-2xl px-3.5 py-2.5"
          style={{ backgroundColor: mine ? BLUE : "#f1f2f5" }}
        >
          <TextComponent
            className="text-sm"
            style={{ color: mine ? "#ffffff" : "#18181b" }}
          >
            {message.body}
          </TextComponent>
        </View>
      )}
      <TextComponent className="mx-1 mt-0.5 text-[10px] text-zinc-400">
        {clock(message.createdAt)}
      </TextComponent>
    </View>
  );
};

const ChatThreadScreen = ({
  chatId,
  title,
  subtitle,
  aboutEvent,
  onOpenEvent,
  onClose
}: {
  chatId: string | null;
  title: string;
  subtitle?: string;
  /** An event to attach to the next message sent (then it's dropped). */
  aboutEvent?: TSharedEvent | null;
  onOpenEvent?: (eventId: string) => void;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const myId = useUserStore((state) => state.user?.id);
  const messages = useLiveChatMessages(chatId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [attach, setAttach] = useState<TSharedEvent | null>(null);
  const [attachFor, setAttachFor] = useState<string | null>(null);

  // A new thread opened from an event starts with that event attached.
  if (chatId !== attachFor) {
    setAttachFor(chatId);
    setAttach(aboutEvent ?? null);
    setDraft("");
  }

  // Newest at the bottom: an inverted list needs them newest first.
  const rows = useMemo(
    () => [...(messages.data ?? [])].reverse(),
    [messages.data]
  );

  const send = async () => {
    const body = draft.trim() || (attach ? `About ${attach.name}` : "");
    if (!chatId || !body || sending) return;
    setSending(true);
    try {
      await sendChatMessage(chatId, {
        body,
        sharedEventId: attach?.id
      });
      setDraft("");
      setAttach(null);
      await queryClient.invalidateQueries({
        queryKey: ["live-chat-messages", chatId]
      });
      void queryClient.invalidateQueries({ queryKey: ["live-chats"] });
    } catch (error) {
      onError(
        constructErrorMessage(
          error as TApiErrorResponseType,
          "Your message didn't send. Please try again."
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={!!chatId}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-white">
        <View className="h-14 flex-row items-center gap-2 border-b border-zinc-100 px-2">
          <Pressable
            onPress={onClose}
            accessibilityLabel="Back"
            className="size-10 items-center justify-center"
          >
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path d="M15 18l-6-6 6-6" fill="none" stroke="#18181b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View className="flex-1">
            <TextComponent numberOfLines={1} className="text-base font-bold text-zinc-950">
              {title}
            </TextComponent>
            {!!subtitle && (
              <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
                {subtitle}
              </TextComponent>
            )}
          </View>
        </View>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {messages.isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color={BLUE} />
            </View>
          ) : (
            <FlatList
              inverted
              data={rows}
              keyExtractor={(message) => message.id}
              renderItem={({ item }) => (
                <Bubble
                  message={item}
                  mine={!!myId && item.senderId === myId}
                  onOpenEvent={onOpenEvent}
                />
              )}
              contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
              ListEmptyComponent={
                <View
                  className="flex-1 items-center justify-center px-10"
                  style={{ transform: [{ scaleY: -1 }] }}
                >
                  <TextComponent className="text-center text-sm text-zinc-500">
                    {messages.error
                      ? "We couldn't load this chat."
                      : "No messages yet. Say hello."}
                  </TextComponent>
                </View>
              }
            />
          )}
          {!!attach && (
            <View className="flex-row items-center gap-3 border-t border-zinc-100 px-4 py-2">
              <View className="size-10 overflow-hidden rounded-lg bg-[#eef6ff]">
                {!!attach.image && (
                  <CustomImage className="size-full" imageClassName="size-full" source={{ uri: attach.image }} contentFit="cover" />
                )}
              </View>
              <View className="flex-1">
                <TextComponent className="text-[11px] text-zinc-500">About this event</TextComponent>
                <TextComponent numberOfLines={1} className="text-sm font-semibold text-zinc-900">
                  {attach.name}
                </TextComponent>
              </View>
              <Pressable onPress={() => setAttach(null)} accessibilityLabel="Remove event" className="p-2">
                <TextComponent className="text-lg text-zinc-400">×</TextComponent>
              </Pressable>
            </View>
          )}
          <View className="flex-row items-end gap-2 border-t border-zinc-100 px-3 py-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              placeholder={attach ? "Ask about this event…" : "Message"}
              placeholderTextColor="#a1a1aa"
              className="max-h-28 min-h-11 flex-1 rounded-3xl bg-zinc-100 px-4 py-3 text-sm text-zinc-900"
            />
            <Pressable
              onPress={() => void send()}
              disabled={sending || (!draft.trim() && !attach)}
              accessibilityLabel="Send"
              className="size-11 items-center justify-center rounded-full"
              style={{
                backgroundColor:
                  draft.trim() || attach ? BLUE : "#d4d4d8"
              }}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default memo(ChatThreadScreen);
