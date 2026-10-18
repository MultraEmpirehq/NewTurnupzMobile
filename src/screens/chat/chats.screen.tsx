import React, { memo, useEffect, useMemo, useState } from "react";
import { useOpenChatStore } from "@/shared/stores/open-chat.store";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import useUserStore from "@/shared/stores/user.store";
import { BRAND } from "@/shared/utils/brand-colors";
import ChatThreadScreen from "@/screens/live/chat-thread.screen";
import { TLiveChat, useAcceptTransfer, useLiveChats, useReceivedTransfers } from "@/screens/live/live-api";
import { usePeopleNav } from "@/screens/people/people-modal";

/**
 * Messages: every chat you're in. You join an event's group chat as soon as
 * you have a ticket; chats with organisers sit alongside. A ticket a friend
 * sent you waits at the top with Accept.
 */

const FILTERS = [
  { id: "all", label: "All" },
  { id: "events", label: "Events" },
  { id: "friends", label: "Friends" },
  { id: "organisers", label: "Organisers" }
] as const;
type TFilter = (typeof FILTERS)[number]["id"];

const when = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days < 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString(undefined, { weekday: "short" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

const Tag = ({ label, dark }: { label: string; dark?: boolean }) => (
  <View className="ml-1.5 rounded-md px-1.5 py-0.5" style={{ backgroundColor: dark ? "#EEF0F4" : BRAND.blueTint }}>
    <TextComponent className="text-[9.5px] font-extrabold" style={{ color: dark ? "#374151" : BRAND.blueDeep }}>{label}</TextComponent>
  </View>
);

const ChatsScreen = ({
  onOpenEvent,
  onOpenTickets
}: {
  onOpenEvent: (eventId: string) => void;
  onOpenTickets: () => void;
}) => {
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const myId = useUserStore((state) => state.user?.id);
  const chats = useLiveChats(isSignedIn);
  const received = useReceivedTransfers();
  const accept = useAcceptTransfer();
  const [filter, setFilter] = useState<TFilter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<TLiveChat | null>(null);
  // A chat asked for from elsewhere (a "Message from the Turnupz team" notification).
  const pendingChatId = useOpenChatStore((state) => state.pendingChatId);
  const openChatWhenReady = useOpenChatStore((state) => state.openChatWhenReady);
  useEffect(() => {
    if (!pendingChatId) return;
    const chat = (chats.data ?? []).find((c) => c.id === pendingChatId);
    if (chat) {
      setOpen(chat);
      openChatWhenReady(null);
    } else if (!chats.isFetching) {
      void chats.refetch().then((result) => {
        const found = (result.data ?? []).find((c) => c.id === pendingChatId);
        if (found) setOpen(found);
        openChatWhenReady(null);
      });
    }
  }, [pendingChatId, chats.data, chats.isFetching]); // eslint-disable-line react-hooks/exhaustive-deps
  const openSearch = usePeopleNav((state) => state.openSearch);

  const pending = (received.data ?? []).filter((transfer) => transfer.status === "PENDING");
  const waiting = pending[0];

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = (chats.data ?? []).filter((chat) => {
      // Your chat with the Turnupz team shows under All, at the top.
      if (chat.type === "SUPPORT" && filter !== "all") return false;
      if (filter === "events" && chat.type !== "EVENT_GROUP") return false;
      if (filter === "organisers" && chat.type !== "DIRECT") return false;
      if (filter === "friends" && chat.type !== "PERSON") return false;
      return !needle || `${chat.eventName} ${chat.preview ?? ""}`.toLowerCase().includes(needle);
    });
    return [...list.filter((c) => c.type === "SUPPORT"), ...list.filter((c) => c.type !== "SUPPORT")];
  }, [chats.data, filter, query]);

  const unreadEvents = (chats.data ?? []).filter((chat) => chat.type === "EVENT_GROUP" && (chat.unreadCount ?? 0) > 0).length;

  const acceptWaiting = async () => {
    if (!waiting) return;
    try {
      await accept.mutateAsync(waiting.id);
      onSuccess("It's in your tickets, and you've joined the event's chat.");
      void chats.refetch();
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "That didn't work. Please try again."));
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#F7F8FB" }}>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-1.5">
        <TextComponent className="text-[26px] font-extrabold text-zinc-950">Messages</TextComponent>
        <Pressable
          onPress={openSearch}
          accessibilityRole="button"
          accessibilityLabel="Find people to message"
          className="size-10 items-center justify-center rounded-xl border bg-white"
          style={{ borderColor: "#EEF0F4" }}
        >
          <Svg width={19} height={19} viewBox="0 0 24 24">
            <Circle cx={9} cy={8} r={3.5} fill="none" stroke={BRAND.ink} strokeWidth={2} />
            <Path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M18 8v6M15 11h6" fill="none" stroke={BRAND.ink} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>
      <View className="mx-5 flex-row items-center gap-2 rounded-2xl border bg-white px-3.5" style={{ borderColor: "#EEF0F4", height: 42 }}>
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Circle cx={11} cy={11} r={7} fill="none" stroke="#9AA3AF" strokeWidth={2.2} />
          <Path d="m20 20-3.5-3.5" fill="none" stroke="#9AA3AF" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats"
          placeholderTextColor="#9AA3AF"
          className="flex-1 text-[14px] text-zinc-950"
          autoCorrect={false}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={chats.isRefetching}
            onRefresh={() => {
              void chats.refetch();
              void received.refetch();
            }}
            tintColor={BRAND.blue}
          />
        }
      >
        <View className="flex-row gap-2 px-5 pb-2 pt-3">
          {FILTERS.map((chip) => {
            const on = chip.id === filter;
            return (
              <Pressable
                key={chip.id}
                onPress={() => setFilter(chip.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                className="flex-row items-center rounded-full border px-3.5 py-2"
                style={{ backgroundColor: on ? BRAND.ink : BRAND.white, borderColor: on ? BRAND.ink : "#EEF0F4" }}
              >
                <TextComponent className="text-[12.5px] font-bold" style={{ color: on ? BRAND.white : "#4B5563" }}>{chip.label}</TextComponent>
                {chip.id === "events" && unreadEvents > 0 && (
                  <TextComponent className="ml-1 text-[12.5px] font-bold" style={{ color: BRAND.blue }}>{unreadEvents}</TextComponent>
                )}
              </Pressable>
            );
          })}
        </View>

        {!!waiting && (
          <View className="mx-5 mb-2.5 mt-1 flex-row items-center gap-3 rounded-[18px] p-3" style={{ backgroundColor: BRAND.ink }}>
            <View className="size-10 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(0,178,255,0.18)" }}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" fill="none" stroke={BRAND.blue} strokeWidth={2} strokeLinejoin="round" />
              </Svg>
            </View>
            <View className="flex-1">
              <TextComponent className="text-[13.5px] font-extrabold text-white">{waiting.senderName} sent you a ticket</TextComponent>
              <TextComponent numberOfLines={1} className="text-xs text-white/75">
                {waiting.userTicket?.ticket?.name ?? "Ticket"} · {waiting.userTicket?.ticket?.event?.name ?? "an event"}
                {pending.length > 1 ? ` · +${pending.length - 1} more` : ""}
              </TextComponent>
            </View>
            <Pressable onPress={() => void acceptWaiting()} disabled={accept.isPending} accessibilityRole="button" className="rounded-full px-3.5 py-2" style={{ backgroundColor: BRAND.blue }}>
              {accept.isPending ? <ActivityIndicator size="small" color={BRAND.white} /> : <TextComponent className="text-[12.5px] font-extrabold text-white">Accept</TextComponent>}
            </Pressable>
          </View>
        )}

        {chats.isLoading ? (
          <ActivityIndicator className="mt-16" color={BRAND.blue} />
        ) : !shown.length ? (
          <View className="mt-16 items-center px-10">
            <TextComponent className="text-center text-base font-bold text-zinc-950">
              {query || filter !== "all" ? "No chats here" : "No chats yet"}
            </TextComponent>
            <TextComponent className="mt-1 text-center text-sm text-zinc-500">
              {query || filter !== "all"
                ? "Try All, or search for something else."
                : "When you get a ticket, you join that event's chat. Follow friends to message them, or message an organiser from any event."}
            </TextComponent>
          </View>
        ) : (
          <View className="px-3">
            {shown.map((chat) => {
              const unread = chat.unreadCount ?? 0;
              const isGroup = chat.type === "EVENT_GROUP";
              const isPerson = chat.type === "PERSON";
              const iAmOrganiser = !isPerson && chat.vendor?.id === myId;
              return (
                <Pressable
                  key={chat.id}
                  onPress={() => setOpen(chat)}
                  accessibilityRole="button"
                  accessibilityLabel={`${chat.eventName}${unread ? `, ${unread} unread` : ""}`}
                  className="flex-row items-center gap-3 rounded-2xl px-2 py-2.5"
                  style={unread ? { backgroundColor: BRAND.white } : undefined}
                >
                  {isGroup && chat.eventImage ? (
                    <CustomImage className="size-[52px] rounded-[14px]" imageClassName="size-full rounded-[14px]" source={{ uri: chat.eventImage }} contentFit="cover" />
                  ) : isPerson && chat.person?.image ? (
                    <CustomImage className="size-[52px] rounded-full" imageClassName="size-full rounded-full" source={{ uri: chat.person.image }} contentFit="cover" />
                  ) : (
                    <View className="size-[52px] items-center justify-center rounded-[14px]" style={{ backgroundColor: isGroup || iAmOrganiser ? BRAND.blueTint : BRAND.ink }}>
                      <TextComponent className="font-extrabold" style={{ color: isGroup || iAmOrganiser ? BRAND.blueDeep : BRAND.blue }}>{initials(chat.eventName)}</TextComponent>
                    </View>
                  )}
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <TextComponent numberOfLines={1} className="shrink text-[14.5px] font-bold text-zinc-950">{chat.eventName}</TextComponent>
                      {isGroup ? (
                        <Tag label={chat.status === "ARCHIVED" ? "CLOSED" : "EVENT"} dark={chat.status === "ARCHIVED"} />
                      ) : !isPerson && !iAmOrganiser ? (
                        <Tag label="ORGANISER" dark />
                      ) : null}
                    </View>
                    <TextComponent numberOfLines={1} className="mt-0.5 text-[13px] text-zinc-500">
                      {chat.preview || (isGroup ? `${chat.memberCount ?? 0} going` : "Say hello")}
                    </TextComponent>
                  </View>
                  <View className="items-end gap-1.5">
                    <TextComponent className="text-[11.5px] font-semibold text-zinc-400">{when(chat.lastActivityAt)}</TextComponent>
                    {unread > 0 ? (
                      <View className="min-w-5 items-center rounded-full px-1.5" style={{ backgroundColor: chat.muted ? "#C7CDD6" : BRAND.blueDeep, height: 20 }}>
                        <TextComponent className="text-[11px] font-extrabold leading-5 text-white">{unread > 99 ? "99+" : unread}</TextComponent>
                      </View>
                    ) : chat.muted ? (
                      <TextComponent className="text-[10px] font-bold text-zinc-400">Muted</TextComponent>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ChatThreadScreen
        chatId={open?.id ?? null}
        chat={(chats.data ?? []).find((chat) => chat.id === open?.id) ?? open}
        title={open?.eventName ?? ""}
        onOpenEvent={(eventId) => {
          setOpen(null);
          onOpenEvent(eventId);
        }}
        onOpenTickets={() => {
          setOpen(null);
          onOpenTickets();
        }}
        onClose={() => {
          setOpen(null);
          void chats.refetch();
        }}
      />
    </View>
  );
};

export default memo(ChatsScreen);
