import React, { memo, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";
import BrandRefreshList from "@/shared/components/brand-refresh/brand-refresh-list.component";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { formatEventClock, formatEventDay } from "@/shared/utils/event-time";
import { TICKET_LIST_BACKGROUND } from "./event-ticket-card";
import FlipTicketCard from "./flip-ticket-card";
import TransferTicketSheet from "./transfer-ticket.sheet";
import { ReceivedTransferRow, SentTransferRow } from "./sent-transfers";
import { BackHeader, EmptyNote, Loading } from "./explore-details";
import {
  TLiveEvent,
  TLiveUserTicket,
  eventPlace,
  useLiveUserTickets,
  useSentTransfers,
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
const statusOf = (ticket: TLiveUserTicket) =>
  STATUS[ticket.status ?? "UN_USED"] ?? STATUS.UN_USED;

type TEventTickets = { event: TLiveEvent; tickets: TLiveUserTicket[] };

/** An event counts as past six hours after it starts. */
const isPast = (event: TLiveEvent) =>
  new Date(event.date).getTime() < Date.now() - 6 * 60 * 60 * 1000;

/** One pass: the event on top, a tear line, then the QR and the ticket's details. */
const Pass = ({
  event,
  ticket,
  width
}: {
  event: TLiveEvent;
  ticket: TLiveUserTicket;
  width: number;
}) => {
  const status = statusOf(ticket);
  const code = (ticket.code || ticket.id).toUpperCase();
  return (
    <View style={{ width }} className="overflow-hidden rounded-3xl bg-white">
      <View className="h-28 w-full bg-[#eef6ff]">
        {!!(event.image ?? event.medias?.[0]) && (
          <CustomImage
            className="size-full"
            imageClassName="size-full"
            source={{ uri: event.image ?? event.medias?.[0] }}
            contentFit="cover"
          />
        )}
        <View className="absolute inset-0 bg-black/35" />
        <View className="absolute bottom-3 left-4 right-4">
          <TextComponent
            numberOfLines={1}
            className="text-lg font-bold text-white"
          >
            {event.name}
          </TextComponent>
          <TextComponent numberOfLines={1} className="text-xs text-white/85">
            {formatEventDay(event.date, event.timezone, { withYear: false })} ·{" "}
            {formatEventClock(event.date, event.timezone)} · {eventPlace(event)}
          </TextComponent>
        </View>
      </View>

      {/* The tear line, with a notch either side. */}
      <View style={{ height: 0 }}>
        {[{ left: -12 }, { right: -12 }].map((side, index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              top: -12,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: INK,
              ...side
            }}
          />
        ))}
        <View
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            borderTopWidth: 2,
            borderStyle: "dashed",
            borderColor: "#e3eef7"
          }}
        />
      </View>

      <View className="items-center px-5 pb-6 pt-6">
        <View
          className="rounded-2xl bg-white p-3"
          style={{
            opacity: ticket.status === "UN_USED" || !ticket.status ? 1 : 0.35
          }}
        >
          <QRCode
            value={ticket.qrCodeValue || ticket.code || ticket.id}
            size={Math.min(220, width - 90)}
          />
        </View>
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
  onClose,
  onSend
}: {
  group: TEventTickets | null;
  onClose: () => void;
  /** Sends one pass to someone; offered only on passes that can be sent. */
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
                  <Pass event={group.event} ticket={ticket} width={passWidth} />
                </Pressable>
                {canTransfer(ticket) && !isPast(group.event) && (
                  <Pressable
                    onPress={() => onSend(ticket)}
                    accessibilityRole="button"
                    className="h-11 flex-row items-center justify-center rounded-full bg-white/10 px-6"
                  >
                    <TextComponent className="font-semibold text-white">
                      Send to someone
                    </TextComponent>
                  </Pressable>
                )}
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
          Show this at the door. Turn your screen brightness up if it won't
          scan. Tap to close.
        </TextComponent>
      </SafeAreaView>
    </Modal>
  );
};

/** "VIP", or "VIP + 1 more" when the tickets are of different types. */
const ticketLabelOf = (tickets: TLiveUserTicket[]) => {
  const names = [
    ...new Set(tickets.map((ticket) => ticket.ticket?.name || "Ticket"))
  ];
  return names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0];
};

const LiveMyTicketsScreen = ({ onBack }: { onBack: () => void }) => {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(420, width - 32);
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
  const [tab, setTab] = useState<"upcoming" | "past" | "received" | "sent">(
    "upcoming"
  );
  const showPast = tab === "past";
  const [open, setOpen] = useState<TEventTickets | null>(null);
  const [sending, setSending] = useState<TLiveUserTicket | null>(null);
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
            value: "received" as const,
            label: receivedItems.length
              ? `Received (${receivedItems.length})`
              : "Received"
          },
          {
            value: "sent" as const,
            label: waiting ? `Sent (${waiting})` : "Sent"
          }
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
      {tab === "received" ? (
        <BrandRefreshList
          data={receivedItems}
          keyExtractor={(transfer) => transfer.id}
          style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
          refreshing={received.isRefetching}
          onRefresh={() => void received.refetch()}
          ListHeaderComponent={tabsHeader}
          ListEmptyComponent={
            received.isLoading ? (
              <Loading />
            ) : (
              <EmptyNote
                title="Nothing waiting for you"
                body="When someone sends you a ticket, it shows here for you to accept."
              />
            )
          }
          renderItem={({ item }) => (
            <ReceivedTransferRow
              transfer={item}
              onAccepted={() => setTab("upcoming")}
            />
          )}
        />
      ) : tab === "sent" ? (
        <BrandRefreshList
          data={sentItems}
          keyExtractor={(transfer) => transfer.id}
          style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
          contentContainerStyle={{ paddingBottom: 32, paddingTop: 4 }}
          refreshing={sent.isRefetching}
          onRefresh={() => void sent.refetch()}
          ListHeaderComponent={tabsHeader}
          ListEmptyComponent={
            sent.isLoading ? (
              <Loading />
            ) : (
              <EmptyNote
                title="Nothing sent yet"
                body="Tickets you send to someone show here until they claim them."
              />
            )
          }
          renderItem={({ item }) => <SentTransferRow transfer={item} />}
        />
      ) : isLoading ? (
        <Loading />
      ) : (
        <BrandRefreshList
          data={list}
          keyExtractor={(group) => group.event.id}
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
          renderItem={({ item: group, index }) => {
            const usable = group.tickets.filter(
              (ticket) => statusOf(ticket) === STATUS.UN_USED
            );
            const first = usable[0] ?? group.tickets[0];
            return (
              <FlipTicketCard
                name={group.event.name}
                date={group.event.date}
                timezone={group.event.timezone}
                place={eventPlace(group.event)}
                image={group.event.image ?? group.event.medias?.[0]}
                count={group.tickets.length}
                ticketLabel={ticketLabelOf(group.tickets)}
                qrValue={first.qrCodeValue || first.code || first.id}
                serial={(first.code || first.id)
                  .replace(/[^a-z0-9]/gi, "")
                  .slice(-5)
                  .toUpperCase()}
                status={{
                  label: statusOf(first).label,
                  ready: usable.length > 0
                }}
                past={showPast}
                width={cardWidth}
                // The first few peek at their back when the list opens.
                peekDelay={index < 3 ? 450 + index * 160 : undefined}
                flipped={open?.event.id === group.event.id}
                onPress={() => setOpen(group)}
              />
            );
          }}
        />
      )}
      <PassViewer
        group={open}
        onClose={() => setOpen(null)}
        onSend={setSending}
      />
      <TransferTicketSheet
        ticket={sending}
        eventName={open?.event.name ?? "this event"}
        onClose={() => setSending(null)}
        onSent={() => {
          // It's left your tickets: close everything and show it under Sent.
          setSending(null);
          setOpen(null);
          setTab("sent");
        }}
      />
    </View>
  );
};

export default memo(LiveMyTicketsScreen);
