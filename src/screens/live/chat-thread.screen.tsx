import OverlayToast from "@/shared/components/status/toast/overlay-toast";
import React, { memo, useMemo, useState } from "react";
import SafeModal from "@/shared/components/modals/safe-modal";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { onError } from "@/shared/components/status/toast";
import useUserStore from "@/shared/stores/user.store";
import { constructErrorMessage } from "@/api/functions";
import { patchData } from "@/api";
import { BRAND, BRAND_GRADIENT } from "@/shared/utils/brand-colors";
import { formatEventClock, formatEventDay } from "@/shared/utils/event-time";
import {
  TLiveChat,
  TLiveChatMessage,
  TSharedEvent,
  sendChatMessage,
  sendChatPhoto,
  useLiveChatMessages,
  useLiveChats,
  useLiveUserTickets
} from "./live-api";
import GroupInfo from "./group-info";

/**
 * One chat, in the redesign. An event's group chat pins your tickets and the
 * doors time at the top, and the organiser's posts stand out. A chat with an
 * organiser keeps the event in view with "Get tickets", and offers quick
 * questions to start with. Closed chats (a few days after the event) can still
 * be read. Photos are shrunk on the phone before they're sent.
 */

const QUICK_QUESTIONS = ["What time do doors open?", "Is there a dress code?", "Is there parking?", "Can I get a refund?"];

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};

export const SharedEventCard = ({ event, onPress }: { event: TSharedEvent; onPress?: () => void; mine?: boolean }) => (
  <Pressable onPress={onPress} disabled={!onPress} className="w-60 overflow-hidden rounded-2xl border border-black/5 bg-white">
    <View className="h-28 w-full" style={{ backgroundColor: BRAND.blueTint }}>
      {!!event.image && <CustomImage className="size-full" imageClassName="size-full" source={{ uri: event.image }} contentFit="cover" />}
    </View>
    <View className="gap-0.5 px-3 py-2.5">
      <TextComponent numberOfLines={2} className="text-sm font-bold text-zinc-950">{event.name}</TextComponent>
      <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
        {formatEventDay(event.date, event.timezone, { withYear: false })} · {formatEventClock(event.date, event.timezone)}
      </TextComponent>
      {!!event.place && <TextComponent numberOfLines={1} className="text-xs text-zinc-500">{event.place}</TextComponent>}
      {!!onPress && <TextComponent className="mt-1 text-xs font-bold" style={{ color: BRAND.blueDeep }}>View event</TextComponent>}
    </View>
  </Pressable>
);

const Avatar = ({ name, size = 30, dark }: { name?: string | null; size?: number; dark?: boolean }) => (
  <View
    className="items-center justify-center rounded-full"
    style={{ width: size, height: size, backgroundColor: dark ? BRAND.ink : BRAND.blueTint }}
  >
    <TextComponent className="text-[11px] font-extrabold" style={{ color: dark ? BRAND.blue : BRAND.blueDeep }}>
      {(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
    </TextComponent>
  </View>
);

type TRow = { type: "day"; id: string; label: string } | { type: "message"; id: string; message: TLiveChatMessage };

const ChatThreadScreen = ({
  chatId,
  chat: chatProp,
  title,
  subtitle,
  aboutEvent,
  onOpenEvent,
  onOpenTickets,
  onClose
}: {
  chatId: string | null;
  /** The chat's summary from the list, when known (header, state, unread). */
  chat?: TLiveChat | null;
  title: string;
  subtitle?: string;
  /** An event to attach to the next message sent (then it's dropped). */
  aboutEvent?: TSharedEvent | null;
  onOpenEvent?: (eventId: string) => void;
  onOpenTickets?: () => void;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const myId = useUserStore((state) => state.user?.id);
  const messages = useLiveChatMessages(chatId);
  const chats = useLiveChats(!!chatId && !chatProp);
  const chat = chatProp ?? chats.data?.find((item) => item.id === chatId) ?? null;
  const tickets = useLiveUserTickets();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [attachEvent, setAttachEvent] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const isGroup = chat?.type === "EVENT_GROUP";
  // Opened from an event's "Message organiser" before the list has caught up.
  const isDirect = chat?.type === "DIRECT" || (!chat && !!aboutEvent);
  // Two people who follow each other (opened from a profile before the list caught up).
  const isPerson = chat?.type === "PERSON" || (!chat && !aboutEvent);
  const isClosed = chat?.status === "ARCHIVED";
  const iAmOrganiser = !isPerson && !!myId && chat?.vendor?.id === myId;
  const onlyOrganiser = isGroup && !!chat?.announcementMode && !iAmOrganiser;
  const canPost = !isClosed && !onlyOrganiser;
  const eventId = chat?.eventId ?? aboutEvent?.id ?? null;
  const eventImage = chat?.eventImage ?? aboutEvent?.image ?? null;
  const eventDate = chat?.eventDate ?? aboutEvent?.date ?? null;
  const timezone = chat?.eventTimezone ?? aboutEvent?.timezone ?? null;

  const myTicketCount = useMemo(() => {
    if (!eventId) return 0;
    let count = 0;
    for (const page of tickets.data?.pages ?? []) {
      for (const ticket of page.tickets) if (ticket.ticket?.event?.id === eventId) count += 1;
    }
    return count;
  }, [tickets.data, eventId]);

  const list = messages.data ?? [];
  const rows = useMemo<TRow[]>(() => {
    const out: TRow[] = [];
    let lastDay = "";
    for (const message of list) {
      const label = dayLabel(message.createdAt);
      if (label !== lastDay) {
        out.push({ type: "day", id: `day-${message.id}`, label });
        lastDay = label;
      }
      out.push({ type: "message", id: message.id, message });
    }
    return out.reverse();
  }, [list]);

  const lastMine = [...list].reverse().find((message) => message.senderId === myId);
  const seen =
    (isDirect || isPerson) && !!lastMine && !!chat?.otherLastReadAt && new Date(chat.otherLastReadAt) >= new Date(lastMine.createdAt);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["live-chat-messages", chatId] });
    void queryClient.invalidateQueries({ queryKey: ["live-chats"] });
  };

  const send = async (text = draft) => {
    const body = text.trim();
    if (!chatId || !body || sending || !canPost) return;
    setSending(true);
    try {
      await sendChatMessage(chatId, {
        body,
        ...(aboutEvent && attachEvent ? { sharedEventId: aboutEvent.id } : {})
      });
      setDraft("");
      setAttachEvent(false);
      refresh();
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "Your message didn't send. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const sendPhoto = async () => {
    if (!chatId || !canPost) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (picked.canceled || !picked.assets?.[0]) return;
    setSending(true);
    try {
      await sendChatPhoto(chatId, picked.assets[0], draft);
      setDraft("");
      refresh();
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "Your photo didn't send. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const options = () => {
    if (!chatId || !chat) return;
    Alert.alert(title, undefined, [
      ...(isGroup ? [{ text: "Group info and members", onPress: () => setShowInfo(true) }] : []),
      {
        text: chat.muted ? "Turn alerts back on" : "Mute this chat",
        onPress: () => {
          void patchData(`/chats/${chatId}/mute`, { muted: !chat.muted })
            .then(refresh)
            .catch(() => onError("That didn't work. Please try again."));
        }
      },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const headerSubtitle =
    subtitle ??
    (isGroup && eventDate
      ? `${formatEventDay(eventDate, timezone, { withYear: false })} · ${chat?.memberCount ?? 0} going`
      : isPerson
        ? chat?.person?.username
          ? `@${chat.person.username}`
          : undefined
        : isDirect
          ? iAmOrganiser
            ? "Asked about your event"
            : "Organiser"
          : undefined);

  const renderMessage = (message: TLiveChatMessage) => {
    const mine = message.senderId === myId;
    const fromOrganiser = message.senderRole === "vendor" || message.kind === "event-update";
    const image = message.attachmentDetails?.url || (message.kind === "image" ? message.assetUrl : null);
    const shared = message.metadata?.sharedEvent;
    const caption = image && message.body === "Photo" ? null : message.body;

    // In a group, the organiser's posts are updates for everyone: a dark card.
    if (isGroup && fromOrganiser && !mine) {
      return (
        <View className="px-3 py-1">
          <View className="rounded-[18px] p-3.5" style={{ backgroundColor: BRAND.ink }}>
            <View className="mb-1 flex-row items-center gap-1.5">
              <TextComponent className="text-xs font-extrabold text-white">{message.senderName}</TextComponent>
              <View className="rounded-md px-1.5 py-0.5" style={{ backgroundColor: BRAND.blue }}>
                <TextComponent className="text-[9.5px] font-extrabold text-white">ORGANISER</TextComponent>
              </View>
            </View>
            {!!image && (
              <CustomImage className="mb-2 h-40 w-full rounded-xl" imageClassName="size-full rounded-xl" source={{ uri: image }} contentFit="cover" />
            )}
            {!!caption && <TextComponent className="text-[13px] leading-5 text-white">{caption}</TextComponent>}
            <TextComponent className="mt-1 text-right text-[10.5px] text-white/60">{clock(message.createdAt)}</TextComponent>
          </View>
        </View>
      );
    }

    return (
      <View className={mine ? "flex-row-reverse items-end gap-2 px-3 py-1" : "flex-row items-end gap-2 px-3 py-1"}>
        {!mine && isGroup && <Avatar name={message.senderName} />}
        <View style={{ maxWidth: "80%" }} className={mine ? "items-end" : "items-start"}>
          {!!shared && (
            <View className="mb-1">
              <SharedEventCard event={shared} onPress={onOpenEvent ? () => onOpenEvent(shared.id) : undefined} />
            </View>
          )}
          {!!image && (
            <CustomImage className="mb-1 h-44 w-52 rounded-2xl" imageClassName="size-full rounded-2xl" source={{ uri: image }} contentFit="cover" />
          )}
          {!!caption && (
            <View
              className="overflow-hidden px-3 py-2"
              style={{
                borderRadius: 18,
                borderBottomRightRadius: mine ? 6 : 18,
                borderBottomLeftRadius: mine ? 18 : 6,
                backgroundColor: mine ? undefined : BRAND.white,
                borderWidth: mine ? 0 : 1,
                borderColor: "#EEF0F4"
              }}
            >
              {mine && <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", inset: 0 }} />}
              {!mine && isGroup && (
                <TextComponent className="mb-0.5 text-[11.5px] font-extrabold" style={{ color: BRAND.blueDeep }}>{message.senderName}</TextComponent>
              )}
              <TextComponent className="text-[13.5px] leading-5" style={{ color: mine ? BRAND.white : "#18181b" }}>{caption}</TextComponent>
              <TextComponent className="mt-0.5 text-right text-[10.5px]" style={{ color: mine ? "rgba(255,255,255,0.75)" : "#A1A1AA" }}>
                {clock(message.createdAt)}
                {mine && seen && lastMine?.id === message.id ? " · Seen" : ""}
              </TextComponent>
            </View>
          )}
        </View>
      </View>
    );
  };

  const showQuickQuestions = isDirect && !iAmOrganiser && canPost && !draft && list.length < 4;

  return (
    <SafeModal visible={!!chatId} animationType="slide" onRequestClose={showInfo ? () => setShowInfo(false) : onClose}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: "#F7F8FB" }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* Header */}
          <View className="flex-row items-center gap-2.5 border-b bg-white px-3 pb-2.5 pt-1" style={{ borderColor: "#EEF0F4" }}>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} className="size-9 items-center justify-center">
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path d="M15 5l-7 7 7 7" fill="none" stroke={BRAND.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            {isGroup && eventImage ? (
              <CustomImage className="size-10 rounded-xl" imageClassName="size-full rounded-xl" source={{ uri: eventImage }} contentFit="cover" />
            ) : isPerson && chat?.person?.image ? (
              <CustomImage className="size-10 rounded-full" imageClassName="size-full rounded-full" source={{ uri: chat.person.image }} contentFit="cover" />
            ) : (
              <Avatar name={title} size={40} dark={isDirect && !iAmOrganiser} />
            )}
            {/* A group chat's name opens who's in it. */}
            <Pressable
              onPress={() => setShowInfo(true)}
              disabled={!isGroup || !chat}
              accessibilityRole={isGroup ? "button" : undefined}
              accessibilityHint={isGroup ? "Shows the members" : undefined}
              className="flex-1"
            >
              <TextComponent numberOfLines={1} className="text-[15px] font-extrabold text-zinc-950">{title}</TextComponent>
              {!!headerSubtitle && (
                <TextComponent numberOfLines={1} className="text-[11.5px] font-semibold text-zinc-500">
                  {headerSubtitle}
                  {isGroup && chat ? " · Members ›" : ""}
                </TextComponent>
              )}
            </Pressable>
            {!!chat && (
              <Pressable onPress={options} accessibilityRole="button" accessibilityLabel="Chat options" hitSlop={10} className="size-9 items-center justify-center">
                <TextComponent className="text-lg font-extrabold text-zinc-400">⋯</TextComponent>
              </Pressable>
            )}
          </View>

          {/* Your tickets, pinned (group chats) */}
          {isGroup && myTicketCount > 0 && eventDate && (
            <Pressable
              onPress={onOpenTickets}
              disabled={!onOpenTickets}
              accessibilityRole="button"
              className="mx-3 mt-2.5 flex-row items-center gap-2.5 rounded-2xl border bg-white p-2.5"
              style={{ borderColor: "#EEF0F4" }}
            >
              <View className="size-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: BRAND.blueTint }}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" fill="none" stroke={BRAND.blueDeep} strokeWidth={2} strokeLinejoin="round" />
                </Svg>
              </View>
              <View className="flex-1">
                <TextComponent className="text-[12.5px] font-extrabold text-zinc-950">
                  Your {myTicketCount} {myTicketCount === 1 ? "ticket" : "tickets"} · Doors {formatEventClock(eventDate, timezone)}
                </TextComponent>
                <TextComponent className="text-[11.5px] text-zinc-500">{formatEventDay(eventDate, timezone)}</TextComponent>
              </View>
              {!!onOpenTickets && <TextComponent className="text-xs font-extrabold" style={{ color: BRAND.blueDeep }}>Show ›</TextComponent>}
            </Pressable>
          )}

          {/* The event, kept in view (chat with an organiser) */}
          {isDirect && !iAmOrganiser && !!eventId && (
            <View className="mx-3 mt-2.5 flex-row items-center gap-2.5 rounded-[18px] border bg-white p-2.5" style={{ borderColor: "#EEF0F4" }}>
              {!!eventImage && <CustomImage className="size-11 rounded-xl" imageClassName="size-full rounded-xl" source={{ uri: eventImage }} contentFit="cover" />}
              <View className="flex-1">
                <TextComponent numberOfLines={1} className="text-[13.5px] font-extrabold text-zinc-950">{aboutEvent?.name ?? chat?.title ?? "The event"}</TextComponent>
                {!!eventDate && <TextComponent className="text-[11.5px] font-semibold text-zinc-500">{formatEventDay(eventDate, timezone, { withYear: false })}</TextComponent>}
              </View>
              {!!onOpenEvent && (
                <Pressable onPress={() => onOpenEvent(eventId)} accessibilityRole="button" className="rounded-full px-3 py-2" style={{ backgroundColor: BRAND.blueDeep }}>
                  <TextComponent className="text-xs font-extrabold text-white">Get tickets</TextComponent>
                </Pressable>
              )}
            </View>
          )}

          {(isClosed || onlyOrganiser) && (
            <View className="mx-3 mt-2 rounded-xl border border-dashed bg-white px-3 py-2" style={{ borderColor: "#D5DAE1" }}>
              <TextComponent className="text-[11.5px] font-semibold text-zinc-500">
                {isClosed
                  ? "This chat closed after the event. You can still read it."
                  : "Only the organiser can post right now. You'll see their updates here."}
              </TextComponent>
            </View>
          )}

          {/* Messages, newest at the bottom */}
          {messages.isLoading ? (
            <ActivityIndicator className="mt-16" color={BRAND.blue} />
          ) : (
            <FlatList
              data={rows}
              inverted
              keyExtractor={(row) => row.id}
              contentContainerStyle={{ paddingVertical: 10 }}
              renderItem={({ item }) =>
                item.type === "day" ? (
                  <View className="items-center py-1.5">
                    <View className="rounded-full border bg-white px-2.5 py-0.5" style={{ borderColor: "#EEF0F4" }}>
                      <TextComponent className="text-[11px] font-bold text-zinc-400">{item.label}</TextComponent>
                    </View>
                  </View>
                ) : (
                  renderMessage(item.message)
                )
              }
              ListEmptyComponent={
                <View className="items-center px-10 py-10" style={{ transform: [{ scaleY: -1 }] }}>
                  <TextComponent className="text-center text-sm text-zinc-500">
                    {isPerson ? "Say hello." : isDirect ? "Ask the organiser anything about the event." : "Say hi to everyone going."}
                  </TextComponent>
                </View>
              }
            />
          )}

          {showQuickQuestions && (
            <View className="px-3 pb-1">
              <TextComponent className="mb-1.5 text-center text-[11.5px] font-semibold text-zinc-500">Quick questions</TextComponent>
              <View className="flex-row flex-wrap justify-center gap-1.5">
                {QUICK_QUESTIONS.map((question) => (
                  <Pressable key={question} onPress={() => void send(question)} accessibilityRole="button" className="rounded-full px-3 py-2" style={{ backgroundColor: BRAND.blueTint }}>
                    <TextComponent className="text-xs font-bold" style={{ color: BRAND.blueDeep }}>{question}</TextComponent>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Composer */}
          {canPost && (
            <View className="flex-row items-center gap-2 border-t bg-white px-3 py-2.5" style={{ borderColor: "#EEF0F4" }}>
              <Pressable onPress={() => void sendPhoto()} disabled={sending} accessibilityRole="button" accessibilityLabel="Send a photo" className="size-10 items-center justify-center rounded-full" style={{ backgroundColor: BRAND.blueTint }}>
                <TextComponent className="text-xl font-bold" style={{ color: BRAND.blueDeep }}>+</TextComponent>
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={isGroup ? "Message everyone going" : isPerson ? "Message" : iAmOrganiser ? "Reply" : "Message the organiser"}
                placeholderTextColor="#9AA3AF"
                multiline
                className="max-h-28 min-h-10 flex-1 rounded-[20px] border px-3.5 py-2.5 text-[14px] text-zinc-950"
                style={{ borderColor: "#EEF0F4", backgroundColor: "#F7F8FB" }}
              />
              <Pressable
                onPress={() => void send()}
                disabled={!draft.trim() || sending}
                accessibilityRole="button"
                accessibilityLabel="Send"
                className="size-10 items-center justify-center rounded-full"
                style={{ backgroundColor: draft.trim() ? BRAND.blueDeep : "#C7CDD6" }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={BRAND.white} />
                ) : (
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke={BRAND.white} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
        {showInfo && isGroup && !!chat && (
          <GroupInfo chat={chat} iAmOrganiser={iAmOrganiser} onOpenEvent={onOpenEvent} onClose={() => setShowInfo(false)} />
        )}
      </SafeAreaView>
      <OverlayToast />
    </SafeModal>
  );
};

export default memo(ChatThreadScreen);
