import React, { memo, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import TextComponent from "@/shared/components/text/text.component";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { formatEventClock, formatEventDay } from "@/shared/utils/event-time";
import useUserStore from "@/shared/stores/user.store";
import { NotificationsPage } from "@/screens/profile/profile-settings.screen";
import {
  TLiveEvent,
  eventPlace,
  useAcceptTransfer,
  useDeclineTransfer,
  useLiveUserTickets,
  useReceivedTransfers
} from "@/screens/live/live-api";
import { usePeopleNav } from "@/screens/people/people-modal";
import {
  NOTIFICATION_FILTERS,
  TNotification,
  TNotificationCategory,
  TNotificationFilter,
  useMarkRead,
  useNotifications,
  useUnreadNotifications
} from "./notifications-api";

/** Events don't store an end time yet: treat one as running this long. */
const ASSUMED_LENGTH_MS = 6 * 60 * 60 * 1000;

/** "in 9 hrs", "in 45 min". */
const happeningIn = (start: number, now: number) => {
  const minutes = Math.max(1, Math.round((start - now) / 60000));
  if (minutes < 60) return `IN ${minutes} MIN`;
  const hours = Math.round(minutes / 60);
  return `IN ${hours} ${hours === 1 ? "HR" : "HRS"}`;
};

/** "10 min ago", "3 hrs ago", "Yesterday", "Mon", "12 Oct". */
const ago = (iso: string, now: number) => {
  const then = new Date(iso).getTime();
  const minutes = Math.floor((now - then) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && new Date(then).getDate() === new Date(now).getDate()) {
    return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  }
  const date = new Date(then);
  const days = Math.floor((now - then) / 86400000);
  if (days < 2) return "Yesterday";
  if (days < 7) return date.toLocaleDateString(undefined, { weekday: "short" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const groupOf = (iso: string, now: number) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const then = new Date(iso).getTime();
  if (then >= start.getTime()) return "TODAY";
  if (then >= start.getTime() - 86400000) return "YESTERDAY";
  if (then >= start.getTime() - 6 * 86400000) return "THIS WEEK";
  return "EARLIER";
};

/** An icon on a tint for each kind of notification. Red and green only for status. */
const KIND: Record<TNotificationCategory, { tint: string; color: string; path: string }> = {
  ORDER_UPDATES: {
    tint: BRAND.blueTint,
    color: BRAND.blueDeep,
    path: "M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"
  },
  TICKET_TRANSFERS: {
    tint: BRAND.blueTint,
    color: BRAND.blueDeep,
    path: "M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4zM10 12h6M13 9l3 3-3 3"
  },
  EVENT_UPDATES: {
    tint: BRAND.ink,
    color: BRAND.blue,
    path: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"
  },
  CREDIT: {
    tint: BRAND.successTint,
    color: BRAND.success,
    path: "M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"
  },
  ACCOUNT: {
    tint: "#F1F3F6",
    color: "#4B5563",
    path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  },
  VENDOR_VERIFICATION: {
    tint: "#F1F3F6",
    color: "#4B5563",
    path: "M9 12l2 2 4-4M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  }
};

const KindIcon = ({ category }: { category: TNotificationCategory }) => {
  const kind = KIND[category] ?? KIND.ACCOUNT;
  return (
    <View className="size-11 items-center justify-center rounded-[13px]" style={{ backgroundColor: kind.tint }}>
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d={kind.path} fill="none" stroke={kind.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
};

/** Today's event, with what you need that day one tap away. */
const TodayCard = ({
  event,
  count,
  now,
  onShowTicket,
  onOpenEvent
}: {
  event: TLiveEvent;
  count: number;
  now: number;
  onShowTicket: () => void;
  onOpenEvent: () => void;
}) => {
  const start = new Date(event.date).getTime();
  const label = start > now ? `TODAY · HAPPENING ${happeningIn(start, now)}` : "TODAY · HAPPENING NOW";
  const place = eventPlace(event);
  const directions = () => {
    const query = encodeURIComponent([event.venue?.name || event.venueName, event.venue?.address].filter(Boolean).join(", ") || place);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };
  return (
    <Pressable onPress={onOpenEvent} accessibilityRole="button" className="mx-4 mb-1 overflow-hidden rounded-[22px]" style={{ height: 160 }}>
      <CustomImage
        className="absolute"
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}
        imageClassName="size-full"
        source={{ uri: event.image ?? event.medias?.[0] }}
        contentFit="cover"
      />
      <LinearGradient colors={["rgba(7,20,29,0.15)", "rgba(7,20,29,0.9)"]} style={{ position: "absolute", inset: 0 }} />
      <View className="flex-1 justify-between p-3.5">
        <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: BRAND.blue }}>
          <TextComponent className="text-[10.5px] font-extrabold tracking-wider text-white">{label}</TextComponent>
        </View>
        <View>
          <TextComponent numberOfLines={1} className="text-[17px] font-extrabold text-white">{event.name}</TextComponent>
          <TextComponent numberOfLines={1} className="mt-0.5 text-xs font-semibold text-white/85">
            Doors {formatEventClock(event.date, event.timezone)} · {place} · {count} {count === 1 ? "ticket" : "tickets"}
          </TextComponent>
          <View className="mt-2.5 flex-row gap-2">
            <Pressable onPress={onShowTicket} accessibilityRole="button" className="rounded-full bg-white px-3 py-2">
              <TextComponent className="text-xs font-extrabold text-zinc-950">Show my ticket</TextComponent>
            </Pressable>
            <Pressable onPress={directions} accessibilityRole="button" className="rounded-full px-3 py-2" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
              <TextComponent className="text-xs font-extrabold text-white">Directions</TextComponent>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

/** Accept or decline a ticket sent to you, right in the list. */
const TransferActions = ({ transferId }: { transferId: string }) => {
  const accept = useAcceptTransfer();
  const decline = useDeclineTransfer();
  const busy = accept.isPending || decline.isPending;
  const act = async (kind: "accept" | "decline") => {
    try {
      if (kind === "accept") {
        await accept.mutateAsync(transferId);
        onSuccess("It's in your tickets now.");
      } else {
        await decline.mutateAsync(transferId);
        onSuccess("Declined. The ticket went back to your friend.");
      }
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "That didn't work. Please try again."));
    }
  };
  return (
    <View className="mt-2 flex-row gap-2">
      <Pressable onPress={() => void act("accept")} disabled={busy} accessibilityRole="button" className="rounded-full px-4 py-2" style={{ backgroundColor: BRAND.blueDeep }}>
        {accept.isPending ? <ActivityIndicator size="small" color={BRAND.white} /> : <TextComponent className="text-[12.5px] font-extrabold text-white">Accept</TextComponent>}
      </Pressable>
      <Pressable onPress={() => void act("decline")} disabled={busy} accessibilityRole="button" className="rounded-full border border-zinc-200 bg-white px-4 py-2">
        <TextComponent className="text-[12.5px] font-extrabold text-zinc-950">Decline</TextComponent>
      </Pressable>
    </View>
  );
};

/**
 * Notifications: today's event up top, then everything sorted by day. Unread
 * ones stand out; tapping one marks it read and opens what it's about. A ticket
 * sent to you can be accepted right here. The gear opens notification settings.
 */
const NotificationsScreen = ({
  onOpenEvent,
  onOpenTickets
}: {
  onOpenEvent: (eventId: string) => void;
  onOpenTickets: () => void;
}) => {
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const [filter, setFilter] = useState<TNotificationFilter>("all");
  const [showSettings, setShowSettings] = useState(false);
  const openPerson = usePeopleNav((state) => state.openPerson);
  const list = useNotifications(filter, isSignedIn);
  const unread = useUnreadNotifications(isSignedIn);
  const { markRead, markAllRead } = useMarkRead();
  const tickets = useLiveUserTickets();
  const received = useReceivedTransfers();
  const now = Date.now();

  // The soonest event you have tickets for that's on today and not over.
  const today = useMemo(() => {
    const byEvent = new Map<string, { event: TLiveEvent; count: number }>();
    for (const page of tickets.data?.pages ?? []) {
      for (const ticket of page.tickets) {
        const event = ticket.ticket?.event;
        if (!event?.id || !event.date) continue;
        const start = new Date(event.date).getTime();
        const isToday = formatEventDay(event.date, event.timezone) === formatEventDay(new Date(now), event.timezone);
        if (!isToday || now > start + ASSUMED_LENGTH_MS) continue;
        const mine = byEvent.get(event.id);
        if (mine) mine.count += 1;
        else byEvent.set(event.id, { event, count: 1 });
      }
    }
    return [...byEvent.values()].sort((a, b) => +new Date(a.event.date) - +new Date(b.event.date))[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets.data]);

  const pendingTransfers = useMemo(
    () => new Set((received.data ?? []).filter((transfer) => transfer.status === "PENDING").map((transfer) => transfer.id)),
    [received.data]
  );

  const items = useMemo(() => (list.data?.pages ?? []).flatMap((page) => page.items), [list.data]);
  const groups = useMemo(() => {
    const out: { title: string; items: TNotification[] }[] = [];
    for (const item of items) {
      const title = groupOf(item.createdAt, now);
      const last = out[out.length - 1];
      if (last?.title === title) last.items.push(item);
      else out.push({ title, items: [item] });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (showSettings) return <NotificationsPage onBack={() => setShowSettings(false)} />;

  const open = (item: TNotification) => {
    if (!item.isRead) void markRead([item.id]);
    if (item.data?.action === "open_person" && typeof item.data.username === "string") {
      openPerson(item.data.username);
    } else if (item.eventId) onOpenEvent(item.eventId);
    else if (item.category === "ORDER_UPDATES" || item.category === "TICKET_TRANSFERS") onOpenTickets();
  };

  const refresh = () => {
    void list.refetch();
    void unread.refetch();
    void tickets.refetch();
    void received.refetch();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#F7F8FB" }}>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-1.5">
        <TextComponent className="text-[26px] font-extrabold text-zinc-950">Notifications</TextComponent>
        <View className="flex-row items-center gap-3">
          {!!unread.data && (
            <Pressable onPress={() => void markAllRead()} accessibilityRole="button" hitSlop={8}>
              <TextComponent className="text-[13px] font-bold" style={{ color: BRAND.blueDeep }}>Mark all read</TextComponent>
            </Pressable>
          )}
          <Pressable
            onPress={() => setShowSettings(true)}
            accessibilityRole="button"
            accessibilityLabel="Notification settings"
            className="size-9 items-center justify-center rounded-xl border bg-white"
            style={{ borderColor: "#EEF0F4" }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={3} fill="none" stroke={BRAND.ink} strokeWidth={1.8} />
              <Path
                d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
                fill="none"
                stroke={BRAND.ink}
                strokeWidth={1.8}
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={refresh} tintColor={BRAND.blue} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y > contentSize.height - 400 && list.hasNextPage && !list.isFetchingNextPage) {
            void list.fetchNextPage();
          }
        }}
        scrollEventThrottle={200}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 6 }}>
          {NOTIFICATION_FILTERS.map((chip) => {
            const on = chip.id === filter;
            return (
              <Pressable
                key={chip.id}
                onPress={() => setFilter(chip.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                className="rounded-full border px-3.5 py-2"
                style={{ backgroundColor: on ? BRAND.ink : BRAND.white, borderColor: on ? BRAND.ink : "#EEF0F4" }}
              >
                <TextComponent className="text-[12.5px] font-bold" style={{ color: on ? BRAND.white : "#4B5563" }}>
                  {chip.label}
                </TextComponent>
              </Pressable>
            );
          })}
        </ScrollView>

        {!!today && (filter === "all" || filter === "tickets" || filter === "events") && (
          <View className="mt-2">
            <TodayCard
              event={today.event}
              count={today.count}
              now={now}
              onShowTicket={onOpenTickets}
              onOpenEvent={() => onOpenEvent(today.event.id)}
            />
          </View>
        )}

        {list.isLoading ? (
          <ActivityIndicator className="mt-16" color={BRAND.blue} />
        ) : list.error && !items.length ? (
          <View className="mt-16 items-center px-10">
            <TextComponent className="text-center text-base font-bold text-zinc-950">We couldn't load your notifications</TextComponent>
            <TextComponent className="mt-1 text-center text-sm text-zinc-500">Pull down to try again.</TextComponent>
          </View>
        ) : !items.length ? (
          <View className="mt-16 items-center px-10">
            <TextComponent className="text-center text-base font-bold text-zinc-950">You're all caught up</TextComponent>
            <TextComponent className="mt-1 text-center text-sm text-zinc-500">
              {filter === "all"
                ? "Tickets, event updates and credit will show up here."
                : "Nothing here yet. Try All to see everything."}
            </TextComponent>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.title}>
              <TextComponent className="px-[22px] pb-1.5 pt-3 text-xs font-extrabold tracking-wide text-zinc-500">{group.title}</TextComponent>
              {group.items.map((item) => {
                const transferId =
                  item.data?.action === "accept_transfer" && item.data.transferId && pendingTransfers.has(item.data.transferId)
                    ? item.data.transferId
                    : null;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => open(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.isRead ? "" : "Unread. "}${item.title}. ${item.content}`}
                    className="mx-2 flex-row gap-3 rounded-2xl px-4 py-2.5"
                    style={!item.isRead ? { backgroundColor: BRAND.white } : undefined}
                  >
                    <KindIcon category={item.category} />
                    <View className="flex-1 pr-3.5">
                      <TextComponent className="text-[13.5px] font-extrabold leading-5 text-zinc-950">{item.title}</TextComponent>
                      <TextComponent className="text-[13.5px] leading-5 text-zinc-700">{item.content}</TextComponent>
                      <TextComponent className="mt-0.5 text-[11.5px] font-semibold text-zinc-400">{ago(item.createdAt, now)}</TextComponent>
                      {!!transferId && <TransferActions transferId={transferId} />}
                    </View>
                    {!item.isRead && (
                      <View className="absolute right-3.5 top-4 size-2 rounded-full" style={{ backgroundColor: BRAND.blueDeep }} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
        {list.isFetchingNextPage && <ActivityIndicator className="my-4" color={BRAND.blue} />}
      </ScrollView>
    </View>
  );
};

export default memo(NotificationsScreen);
