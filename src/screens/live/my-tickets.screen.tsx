import OverlayToast from "@/shared/components/status/toast/overlay-toast";
import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { BRAND } from "@/shared/utils/brand-colors";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";
import BrandRefreshList from "@/shared/components/brand-refresh/brand-refresh-list.component";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { formatEventClock, formatEventDay } from "@/shared/utils/event-time";
import { TICKET_LIST_BACKGROUND } from "./event-ticket-card";
import TransferTicketSheet from "./transfer-ticket.sheet";
import { OrderSheet } from "@/screens/profile/orders.screen";
import { ReceivedTransferRow, SentTransferRow } from "./sent-transfers";
import { BackHeader, EmptyNote, Loading } from "./explore-details";
import {
  TLiveEvent,
  TLiveUserTicket,
  eventPlace,
  useLiveUserTickets,
  useSentTransfers,
  useRefundedOrders,
  TRefundedOrder,
  formatPrice,
  useReceivedTransfers,
  canTransfer
} from "./live-api";

/**
 * My tickets, in the app's ticket-stub look: one card per event (however
 * many tickets you hold for it), upcoming or past. Tapping one opens your
 * passes, one per ticket, each with the QR code for the door.
 */

const INK = "#0b1d2a";
const BLUE = "#00b2ff";

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  UN_USED: { label: "Ready", bg: "#e8f8ef", fg: "#15803d" },
  USED: { label: "Checked in", bg: "#f1f2f5", fg: "#52525b" },
  EXPIRED: { label: "Expired", bg: "#f1f2f5", fg: "#52525b" },
  CANCELLED: { label: "Cancelled", bg: "#ffe4e6", fg: "#be123c" }
};
const NOT_USED = { label: "Not used", bg: "#f1f2f5", fg: "#52525b" };

type TEventTickets = { event: TLiveEvent; tickets: TLiveUserTicket[] };

/** An event counts as past six hours after it starts. */
const isPast = (event: TLiveEvent) =>
  new Date(event.date).getTime() < Date.now() - 6 * 60 * 60 * 1000;

/** A ticket's state; once the event is over an unused ticket is "Not used", never "Ready". */
const statusOf = (ticket: TLiveUserTicket, event?: TLiveEvent) => {
  const status = STATUS[ticket.status ?? "UN_USED"] ?? STATUS.UN_USED;
  return event && isPast(event) && status === STATUS.UN_USED
    ? NOT_USED
    : status;
};

/** "Today", "Tomorrow", or the day itself, then the time, on the venue's clock. */
const whenOf = (event: TLiveEvent) => {
  const start = new Date(event.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  const days = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const clock = formatEventClock(event.date, event.timezone);
  if (days === 0) return `Today · ${clock}`;
  if (days === 1) return `Tomorrow · ${clock}`;
  return `${formatEventDay(event.date, event.timezone, { withYear: days < -300 })} · ${clock}`;
};

/** "2 × Regular · 1 × VIP" for the tickets you hold. */
const typesOf = (tickets: TLiveUserTicket[]) => {
  const counts = new Map<string, number>();
  for (const ticket of tickets) {
    const name = ticket.ticket?.name || "Ticket";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => `${count} × ${name}`).join(" · ");
};

/** Solid pass colours (no photo behind the words, so they always read clearly). */
const PASS_COLOURS = ["#07141D", "#0E2A44", "#0566D6"];
const PAST_COLOUR = "#52525B";

/** The top of a pass: a small photo, the event, when and where, on a solid colour. */
const PassHeader = ({
  event,
  colour,
  right
}: {
  event: TLiveEvent;
  colour: string;
  right?: React.ReactNode;
}) => {
  const image = event.image ?? event.medias?.[0];
  return (
    <View
      className="flex-row items-center gap-3 px-4 py-3.5"
      style={{ backgroundColor: colour }}
    >
      <View className="size-11 overflow-hidden rounded-xl bg-white/15">
        {!!image && (
          <CustomImage
            className="size-full"
            imageClassName="size-full"
            source={{ uri: image }}
            contentFit="cover"
          />
        )}
      </View>
      <View className="flex-1">
        <TextComponent
          numberOfLines={1}
          className="text-base font-bold text-white"
        >
          {event.name}
        </TextComponent>
        <TextComponent numberOfLines={1} className="text-xs text-white/75">
          {whenOf(event)} · {eventPlace(event)}
        </TextComponent>
      </View>
      {right}
    </View>
  );
};

/** One pass: the event on top, a tear line, then the QR (or, once it's over, how it went). */
const Pass = ({
  event,
  ticket,
  width,
  colour
}: {
  event: TLiveEvent;
  ticket: TLiveUserTicket;
  width: number;
  colour: string;
}) => {
  const past = isPast(event);
  const status = statusOf(ticket, event);
  const code = (ticket.code || ticket.id).toUpperCase();
  const usable = !past && (ticket.status === "UN_USED" || !ticket.status);
  return (
    <View style={{ width }} className="overflow-hidden rounded-3xl bg-white">
      <PassHeader event={event} colour={colour} />
      <View className="items-center px-5 pb-6 pt-5">
        {past ? (
          // Over: nothing to scan any more, just how it went.
          <View className="w-full items-center rounded-2xl bg-zinc-50 px-4 py-6">
            <TextComponent className="text-lg font-extrabold text-zinc-950">
              Event ended
            </TextComponent>
            <TextComponent className="mt-1 text-sm text-zinc-500">
              {ticket.status === "USED"
                ? "You checked in. Hope it was a good one!"
                : "This ticket wasn't used."}
            </TextComponent>
          </View>
        ) : (
          <View
            className="rounded-2xl bg-white p-3"
            style={{ opacity: usable ? 1 : 0.35 }}
          >
            <QRCode
              value={ticket.qrCodeValue || ticket.code || ticket.id}
              size={Math.min(220, width - 90)}
            />
          </View>
        )}
        <TextComponent className="mt-3 text-xs font-semibold tracking-widest text-zinc-500">
          {code}
        </TextComponent>
        <View className="mt-5 w-full flex-row justify-between gap-4">
          <View className="flex-1">
            <TextComponent className="text-[11px] uppercase tracking-wider text-zinc-400">
              Ticket
            </TextComponent>
            <TextComponent
              numberOfLines={1}
              className="text-base font-bold text-zinc-950"
            >
              {ticket.ticket?.name ?? "Ticket"}
            </TextComponent>
          </View>
          <View className="items-end">
            <TextComponent className="text-[11px] uppercase tracking-wider text-zinc-400">
              Status
            </TextComponent>
            <View
              className="mt-0.5 rounded-full px-2.5 py-0.5"
              style={{ backgroundColor: status.bg }}
            >
              <TextComponent
                className="text-xs font-bold"
                style={{ color: status.fg }}
              >
                {status.label}
              </TextComponent>
            </View>
          </View>
        </View>
        {!!ticket.currentHolderName && (
          <View className="mt-3 w-full">
            <TextComponent className="text-[11px] uppercase tracking-wider text-zinc-400">
              Holder
            </TextComponent>
            <TextComponent
              numberOfLines={1}
              className="text-base font-semibold text-zinc-900"
            >
              {ticket.currentHolderName}
            </TextComponent>
          </View>
        )}
      </View>
    </View>
  );
};

/** Your passes for one event, side by side when there are several. */
const PassViewer = ({
  group,
  colour,
  onClose,
  onSend,
  onViewOrder
}: {
  group: TEventTickets | null;
  colour: string;
  /** The order a ticket came from (only on tickets you bought). */
  onViewOrder: (orderId: string) => void;
  onClose: () => void;
  /** Transfers one pass to someone; offered only on passes that can be. */
  onSend: (ticket: TLiveUserTicket) => void;
}) => {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const passWidth = Math.min(360, width - 48);
  const count = group?.tickets.length ?? 0;

  return (
    <Modal
      visible={!!group}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={["top", "bottom"]}
        className="flex-1"
        style={{ backgroundColor: INK }}
      >
        <View className="h-14 flex-row items-center justify-between px-4">
          <TextComponent className="text-lg font-bold text-white">
            {count > 1 ? `Your passes · ${page + 1} of ${count}` : "Your pass"}
          </TextComponent>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            className="size-10 items-center justify-center rounded-full bg-white/10"
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="#ffffff"
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        </View>
        {/* The dark space around the passes closes them too. */}
        <Pressable
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          accessible={false}
        />
        {!!group && (
          <ScrollView
            horizontal
            pagingEnabled={false}
            snapToInterval={passWidth + 16}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: (width - passWidth) / 2,
              gap: 16,
              alignItems: "center",
              flexGrow: 1
            }}
            onScroll={(event) =>
              setPage(
                Math.round(event.nativeEvent.contentOffset.x / (passWidth + 16))
              )
            }
            scrollEventThrottle={32}
          >
            {group.tickets.map((ticket) => (
              // Tapping the pass closes it again, the way tapping the ticket opened it.
              <View key={ticket.id} className="items-center gap-3">
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityHint="Closes your passes"
                >
                  <Pass
                    event={group.event}
                    ticket={ticket}
                    width={passWidth}
                    colour={colour}
                  />
                </Pressable>
                <View className="flex-row gap-2">
                  {canTransfer(ticket) && !isPast(group.event) && (
                    <Pressable
                      onPress={() => onSend(ticket)}
                      accessibilityRole="button"
                      className="h-11 flex-row items-center justify-center rounded-full bg-white/10 px-6"
                    >
                      <TextComponent className="font-semibold text-white">
                        Transfer
                      </TextComponent>
                    </Pressable>
                  )}
                  {/* Receipts and help live with the order (only yours, not one sent to you). */}
                  {!!ticket.orderId && (
                    <Pressable
                      onPress={() => onViewOrder(ticket.orderId!)}
                      accessibilityRole="button"
                      className="h-11 flex-row items-center justify-center rounded-full bg-white/10 px-6"
                    >
                      <TextComponent className="font-semibold text-white">
                        View order
                      </TextComponent>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        {count > 1 && (
          <View className="flex-row justify-center gap-1.5 pb-3">
            {group?.tickets.map((ticket, index) => (
              <View
                key={ticket.id}
                className="h-1.5 rounded-full"
                style={{
                  width: index === page ? 18 : 6,
                  backgroundColor:
                    index === page ? BLUE : "rgba(255,255,255,0.3)"
                }}
              />
            ))}
          </View>
        )}
        <TextComponent
          className="px-8 pb-4 text-center text-xs text-white/60"
          pointerEvents="none"
        >
          {group && isPast(group.event)
            ? "This event is over, so there's nothing to scan. Tap to close."
            : "Show this at the door. Turn your screen brightness up if it won't scan. Tap to close."}
        </TextComponent>
      </SafeAreaView>
      <OverlayToast />
    </Modal>
  );
};

/** The dashed tear across a ticket, with a notch bitten out of each side. */
const TearLine = () => (
  <View style={{ height: 0, zIndex: 2 }}>
    <View
      style={{
        position: "absolute",
        left: 18,
        right: 18,
        top: -1,
        borderTopWidth: 2,
        borderStyle: "dashed",
        borderColor: "#D9E0E8"
      }}
    />
    {[{ left: -11 }, { right: -11 }].map((side, index) => (
      <View
        key={index}
        style={{
          position: "absolute",
          top: -11,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: TICKET_LIST_BACKGROUND,
          ...side
        }}
      />
    ))}
  </View>
);

/** Every pass is a full ticket this tall (header + the part below the tear). */
const BODY_HEIGHT = 186;
/** How much of the QR code shows on the card: the top half. */
const QR_PEEK = 106;
const CARD_HEIGHT = 72 + BODY_HEIGHT;
/** How much of each pass shows in the stack: its top, like cards in a wallet. */
const PEEK = 80;
/** A smooth glide (no bounce) whenever the wallet rearranges. */
const GLIDE = LinearTransition.duration(320);

/**
 * Your passes as a wallet, like Apple Wallet: full-length tickets stacked so
 * each shows its top, the last one in full. Tap one and it slides out of the
 * stack right where it is (the ones below move down); tap its top to tuck it
 * back in.
 */
const WalletStack = ({
  groups,
  openId,
  colourOf,
  onPick,
  onOpenPasses
}: {
  groups: TEventTickets[];
  openId: string | null;
  colourOf: (group: TEventTickets, index: number) => string;
  onPick: (eventId: string | null) => void;
  onOpenPasses: (group: TEventTickets) => void;
}) => {
  // The soonest (or, for past events, the latest) is the one you see in full.
  const stacked = [...groups].reverse();
  const open = stacked.find((g) => g.event.id === openId);
  const ordered = stacked;
  return (
    <View className="px-4">
      {ordered.map((group, index) => {
        const isOpen = open ? group === open : index === ordered.length - 1;
        // Each pass tucks under the next, except right after the open one: the
        // passes below slide down out of its way, so it shows in full where it is.
        const marginTop =
          index === 0 ? 0 : ordered[index - 1] === open ? 14 : PEEK - CARD_HEIGHT;
        return (
          <Animated.View
            key={group.event.id}
            layout={GLIDE}
            style={{ marginTop, zIndex: index }}
          >
            <WalletCard
              group={group}
              colour={colourOf(group, groups.indexOf(group))}
              open={isOpen}
              onPress={() =>
                onPick(open && group === open ? null : group.event.id)
              }
              onOpenPasses={() => onOpenPasses(group)}
            />
          </Animated.View>
        );
      })}
    </View>
  );
};

/**
 * One event's pass: its coloured top, the tear, then your first ticket's QR
 * code (or, after the event, how it went). In the stack only its top shows;
 * tapping anywhere on it opens it.
 */
const WalletCard = ({
  group,
  colour,
  open,
  onPress,
  onOpenPasses
}: {
  group: TEventTickets;
  colour: string;
  /** Fully on show, with its buttons working. */
  open: boolean;
  onPress: () => void;
  onOpenPasses: () => void;
}) => {
  const past = isPast(group.event);
  const usable = group.tickets.filter(
    (t) => statusOf(t, group.event) === STATUS.UN_USED
  );
  const ticket = usable[0] ?? group.tickets[0];
  const status = statusOf(ticket, group.event);
  const count = group.tickets.length;
  const statusLabel = past
    ? ticket.status === "USED"
      ? "Checked in"
      : "Ended"
    : status.label;
  return (
    <View
      className="overflow-hidden rounded-3xl"
      style={{
        height: CARD_HEIGHT,
        backgroundColor: "#ffffff",
        shadowColor: "#07141D",
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -3 },
        elevation: 4
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          open ? `Put ${group.event.name} back` : `Show ${group.event.name}`
        }
      >
        <PassHeader
          event={group.event}
          colour={colour}
          right={
            <View className="rounded-full bg-white/15 px-2.5 py-1">
              <TextComponent className="text-xs font-bold text-white">
                {count}
              </TextComponent>
            </View>
          }
        />
      </Pressable>
      <TearLine />
      {/*
        Half the code peeks out, fading away, so it's clear there's more: tap
        and the full pass opens (with sending, for tickets you can pass on).
        In the stack, the whole card just picks it.
      */}
      <Pressable
        onPress={open ? onOpenPasses : onPress}
        accessibilityRole="button"
        accessibilityLabel={
          open
            ? `Open your pass for ${group.event.name}`
            : `Show ${group.event.name}`
        }
        className="flex-1 px-4 pt-3"
      >
        <View className="flex-row items-center justify-between">
          <TextComponent
            numberOfLines={1}
            className="flex-1 text-xs font-semibold text-zinc-500"
          >
            {typesOf(group.tickets)}
          </TextComponent>
          <View
            className="rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: status.bg }}
          >
            <TextComponent
              className="text-xs font-bold"
              style={{ color: status.fg }}
            >
              {statusLabel}
            </TextComponent>
          </View>
        </View>
        {past ? (
          <View className="mt-3 w-full items-center rounded-2xl bg-zinc-50 px-4 py-5">
            <TextComponent className="text-base font-extrabold text-zinc-950">
              Event ended
            </TextComponent>
            <TextComponent className="mt-1 text-center text-xs text-zinc-500">
              {group.tickets.some((t) => t.status === "USED")
                ? "You checked in. Hope it was a good one!"
                : "These tickets weren't used."}
            </TextComponent>
          </View>
        ) : (
          <View
            className="mt-3 items-center overflow-hidden"
            style={{ height: QR_PEEK }}
          >
            <QRCode
              value={ticket.qrCodeValue || ticket.code || ticket.id}
              size={176}
            />
            <LinearGradient
              colors={["rgba(255,255,255,0)", "#ffffff"]}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 56
              }}
            />
          </View>
        )}
        <TextComponent
          className="mt-1 text-center text-xs font-bold"
          style={{ color: BRAND.blueDeep }}
        >
          {past
            ? "Tap to see your pass"
            : count > 1
              ? `Tap to show your ${count} passes`
              : "Tap to show your pass"}
        </TextComponent>
      </Pressable>
    </View>
  );
};

/** "VIP", or "VIP + 1 more" when the tickets are of different types. */
const REFUND_STATUS: Record<string, { label: string; color: string }> = {
  processing: { label: "On its way", color: "#71717a" },
  completed: { label: "Refunded", color: "#047857" },
  failed: { label: "Delayed, we're on it", color: "#b91c1c" }
};

/** One refunded order: how many tickets, where the money went, and if it's arrived. */
const RefundRow = ({ order }: { order: TRefundedOrder }) => (
  <View className="mx-4 mb-3 rounded-2xl bg-white p-4">
    <TextComponent className="text-base font-semibold" style={{ color: INK }}>
      {order.ticket?.event?.data?.name ?? "Event"}
    </TextComponent>
    {order.refunds.map((refund, index) => {
      const parts = [
        refund.toCard.amount > 0 &&
          `${formatPrice(refund.toCard)} to your card`,
        refund.asCredit.amount > 0 &&
          `${formatPrice(refund.asCredit)} as Turnupz Credit`
      ].filter(Boolean);
      const status = REFUND_STATUS[refund.status] ?? REFUND_STATUS.processing;
      return (
        <View key={index} className="mt-2">
          <TextComponent className="text-sm text-zinc-700">
            {refund.tickets} ticket{refund.tickets === 1 ? "" : "s"} refunded
            {parts.length ? `: ${parts.join(" and ")}` : ""}
          </TextComponent>
          <TextComponent className="text-xs" style={{ color: status.color }}>
            {status.label}
            {refund.status === "processing" && refund.toCard.amount > 0
              ? " · cards usually take 5–10 working days"
              : ""}
          </TextComponent>
        </View>
      );
    })}
  </View>
);

const ticketLabelOf = (tickets: TLiveUserTicket[]) => {
  const names = [
    ...new Set(tickets.map((ticket) => ticket.ticket?.name || "Ticket"))
  ];
  return names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0];
};

const LiveMyTicketsScreen = ({
  onBack,
  openEventId
}: {
  onBack: () => void;
  /** Open this event's passes as soon as the tickets have loaded. */
  openEventId?: string | null;
}) => {
  useHardwareBack(onBack);
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useLiveUserTickets();
  const [tab, setTab] = useState<"upcoming" | "past" | "transfers" | "refunds">(
    "upcoming"
  );
  // The card at the front of the wallet (the soonest one until you pick another).
  const [frontId, setFrontId] = useState<string | null>(null);
  const refunded = useRefundedOrders();
  const refundedItems = refunded.data ?? [];
  const showPast = tab === "past";
  const [open, setOpen] = useState<TEventTickets | null>(null);
  const [sending, setSending] = useState<TLiveUserTicket | null>(null);
  // An order opened from a pass ("View order").
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  // The event the ticket being sent is for (the passes close before sending).
  const [sendingEventName, setSendingEventName] = useState("this event");
  const sent = useSentTransfers();
  const sentItems = sent.data ?? [];
  const waiting = sentItems.filter(
    (transfer) => transfer.status === "PENDING"
  ).length;
  const received = useReceivedTransfers();
  const receivedItems = received.data ?? [];

  // Tickets grouped by event: soonest first, or most recent first for past ones.
  const { upcoming, past } = useMemo(() => {
    const byEvent = new Map<string, TEventTickets>();
    for (const page of data?.pages ?? []) {
      for (const ticket of page.tickets) {
        const event = ticket.ticket?.event;
        if (!event?.id) continue;
        const group = byEvent.get(event.id) ?? { event, tickets: [] };
        group.tickets.push(ticket);
        byEvent.set(event.id, group);
      }
    }
    const groups = [...byEvent.values()];
    const time = (group: TEventTickets) => new Date(group.event.date).getTime();
    return {
      upcoming: groups
        .filter((group) => !isPast(group.event))
        .sort((a, b) => time(a) - time(b)),
      past: groups
        .filter((group) => isPast(group.event))
        .sort((a, b) => time(b) - time(a))
    };
  }, [data]);
  const list = showPast ? past : upcoming;
  /** Each card keeps its colour; past ones are grey. */
  const colourOf = (group: TEventTickets, index: number) =>
    isPast(group.event)
      ? PAST_COLOUR
      : PASS_COLOURS[Math.max(index, 0) % PASS_COLOURS.length];

  // Opened from a ticket on the profile: go straight to that event's passes,
  // on the Past tab if the event is over. Only once, so closing them sticks.
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!openEventId || openedFor.current === openEventId) return;
    const group =
      upcoming.find((g) => g.event.id === openEventId) ??
      past.find((g) => g.event.id === openEventId);
    if (group) {
      openedFor.current = openEventId;
      if (past.includes(group)) setTab("past");
      setFrontId(group.event.id);
      setOpen(group);
    } else if (!hasNextPage && !isLoading) {
      openedFor.current = openEventId;
    } else if (hasNextPage && !isFetchingNextPage) {
      // Not in the first page of tickets yet: load more until it turns up.
      void fetchNextPage();
    }
  }, [
    openEventId,
    upcoming,
    past,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    fetchNextPage
  ]);

  const tabsHeader = (
    // Four tabs don't fit every phone, so the row scrolls sideways.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      className="my-4 grow-0"
    >
      <View className="flex-row self-start rounded-full border border-black/5 bg-white p-1">
        {[
          {
            value: "upcoming" as const,
            label: `Upcoming (${upcoming.length})`
          },
          { value: "past" as const, label: `Past (${past.length})` },
          {
            value: "transfers" as const,
            label:
              receivedItems.length + waiting
                ? `Transfers (${receivedItems.length + waiting})`
                : "Transfers"
          },
          // Only once there's something to show.
          ...(refundedItems.length
            ? [
                {
                  value: "refunds" as const,
                  label: `Refunds (${refundedItems.length})`
                }
              ]
            : [])
        ].map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setTab(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === option.value }}
            className="rounded-full px-4 py-2"
            style={{
              backgroundColor: tab === option.value ? INK : "transparent"
            }}
          >
            <TextComponent
              className="text-sm font-medium"
              style={{ color: tab === option.value ? "#ffffff" : INK }}
            >
              {option.label}
            </TextComponent>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
    >
      <BackHeader title="My tickets" onBack={onBack} />
      {/* No connection, but the copy on the phone still gets you in. */}
      {!!error && !!data && (
        <View className="mx-4 mt-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: "#FFF3E0" }}>
          <TextComponent className="text-xs font-semibold leading-4" style={{ color: "#9A3412" }}>
            You're offline. These are the tickets saved on your phone, and they
            still work at the door.
          </TextComponent>
        </View>
      )}
      {tab === "refunds" ? (
        <BrandRefreshList
          data={refundedItems}
          keyExtractor={(order) => order.id}
          style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
          refreshing={refunded.isRefetching}
          onRefresh={() => void refunded.refetch()}
          ListHeaderComponent={tabsHeader}
          ListEmptyComponent={
            refunded.isLoading ? (
              <Loading />
            ) : (
              <EmptyNote
                title="No refunds"
                body="Refunded tickets show here."
              />
            )
          }
          renderItem={({ item }) => <RefundRow order={item} />}
        />
      ) : tab === "transfers" ? (
        <BrandRefreshList
          data={[
            ...receivedItems.map((item) => ({
              kind: "received" as const,
              item
            })),
            ...sentItems.map((item) => ({ kind: "sent" as const, item }))
          ]}
          keyExtractor={(row) => `${row.kind}-${row.item.id}`}
          style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
          refreshing={received.isRefetching || sent.isRefetching}
          onRefresh={() => {
            void received.refetch();
            void sent.refetch();
          }}
          ListHeaderComponent={tabsHeader}
          ListEmptyComponent={
            received.isLoading || sent.isLoading ? (
              <Loading />
            ) : (
              <EmptyNote
                title="No transfers"
                body="Tickets sent to you wait here for you to accept, and tickets you send show here until they're claimed."
              />
            )
          }
          renderItem={({ item: row, index }) => (
            <>
              {/* A heading where each kind starts. */}
              {(index === 0 || index === receivedItems.length) && (
                <TextComponent className="mx-5 mb-2 mt-1 text-xs font-extrabold tracking-wide text-zinc-400">
                  {row.kind === "received" ? "SENT TO YOU" : "YOU SENT"}
                </TextComponent>
              )}
              {row.kind === "received" ? (
                <ReceivedTransferRow
                  transfer={row.item}
                  onAccepted={() => setTab("upcoming")}
                />
              ) : (
                <SentTransferRow transfer={row.item} />
              )}
            </>
          )}
        />
      ) : isLoading ? (
        <Loading />
      ) : (
        <BrandRefreshList
          // The whole wallet is one piece, so its cards can slide past each other.
          data={list.length ? ["wallet"] : []}
          keyExtractor={(key) => key}
          style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          onEndReached={() =>
            hasNextPage && !isFetchingNextPage && void fetchNextPage()
          }
          ListHeaderComponent={tabsHeader}
          ListEmptyComponent={
            error ? (
              <EmptyNote
                title="We couldn't load your tickets"
                body="Pull down to try again."
              />
            ) : showPast ? (
              <EmptyNote
                title="No past events"
                body="Events you've been to will show here."
              />
            ) : (
              <EmptyNote
                title="No upcoming tickets"
                body="Tickets you buy or register for show up here."
              />
            )
          }
          renderItem={() => (
            <WalletStack
              groups={list}
              openId={frontId}
              colourOf={colourOf}
              onPick={setFrontId}
              onOpenPasses={setOpen}
            />
          )}
        />
      )}
      <PassViewer
        onViewOrder={(orderId) => {
          // One sheet at a time on iOS: let the passes slide away first.
          setOpen(null);
          setTimeout(() => setViewingOrderId(orderId), 450);
        }}
        group={open}
        colour={open ? colourOf(open, list.indexOf(open)) : INK}
        onClose={() => setOpen(null)}
        onSend={(ticket) => {
          // iOS shows one modal at a time: close the passes first, then open
          // the send sheet once they've slid away.
          setSendingEventName(open?.event.name ?? "this event");
          setOpen(null);
          setTimeout(() => setSending(ticket), 450);
        }}
      />
      <OrderSheet orderId={viewingOrderId} onClose={() => setViewingOrderId(null)} />
      <TransferTicketSheet
        ticket={sending}
        eventName={sendingEventName}
        onClose={() => setSending(null)}
        onSent={() => {
          // It's left your tickets: close everything and show it under Sent.
          setSending(null);
          setOpen(null);
          setTab("transfers");
        }}
      />
    </View>
  );
};

export default memo(LiveMyTicketsScreen);
