import React, { memo, useState } from "react";
import RefundTracker from "./refund-tracker";
import { useQueryClient } from "@tanstack/react-query";
import { postData } from "@/api";
import { constructErrorMessage } from "@/api/functions";
import SafeModal from "@/shared/components/modals/safe-modal";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { shareReceipt } from "./order-receipt-pdf";
import * as Clipboard from "expo-clipboard";
import Svg, { Path } from "react-native-svg";
import BrandRefreshList from "@/shared/components/brand-refresh/brand-refresh-list.component";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import OverlayToast from "@/shared/components/status/toast/overlay-toast";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import { BRAND } from "@/shared/utils/brand-colors";
import { formatEventClock, formatEventDay } from "@/shared/utils/event-time";
import { ORDER_OUTCOMES, TOrderStatus } from "@/shared/utils/order-status";
import { BackHeader, EmptyNote, Loading } from "@/screens/live/explore-details";
import { TICKET_LIST_BACKGROUND } from "@/screens/live/event-ticket-card";
import {
  TMyOrder,
  eventPlace,
  openSupportChat,
  useMyOrder,
  useMyOrders
} from "@/screens/live/live-api";

const INK = "#07141D";

const TONES = {
  good: { bg: "#E7F8EE", fg: "#0F7A3B" },
  wait: { bg: "#E5F7FF", fg: "#05609C" },
  bad: { bg: "#FDECEC", fg: "#B91C1C" },
  info: { bg: "#F1F2F5", fg: "#52525B" }
};

/** The badge for an order: free, paid, waiting, failed, refunded (in part or whole). */
const badgeOf = (order: TMyOrder) => {
  const status = (order.status?.toUpperCase() ?? "PENDING") as TOrderStatus;
  const outcome = ORDER_OUTCOMES[status] ?? ORDER_OUTCOMES.PENDING;
  const refunded = order.refunds?.reduce((sum, r) => sum + r.tickets, 0) ?? 0;
  if (status === "COMPLETED" && refunded > 0) {
    return refunded >= order.quantity
      ? { label: "Refunded", ...TONES.info }
      : { label: "Part refunded", ...TONES.info };
  }
  if (status === "COMPLETED") {
    return { label: order.total?.amount ? "Paid" : "Free", ...TONES.good };
  }
  return { label: outcome.badge, ...TONES[outcome.tone] };
};

/** "2 × Regular · 1 × VIP". */
const linesOf = (order: TMyOrder) =>
  order.items?.length
    ? order.items.map((item) => `${item.quantity} × ${item.name}`).join(" · ")
    : `${order.quantity} × ${order.ticket?.name ?? "Ticket"}`;

const orderedOn = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

const copy = async (text: string, what: string) => {
  await Clipboard.setStringAsync(text);
  onSuccess(`${what} copied`);
};

const CopyButton = ({ text, what }: { text: string; what: string }) => (
  <Pressable
    onPress={() => void copy(text, what)}
    accessibilityRole="button"
    accessibilityLabel={`Copy ${what.toLowerCase()}`}
    hitSlop={8}
    className="rounded-full px-3 py-1.5"
    style={{ backgroundColor: BRAND.blueTint }}
  >
    <TextComponent
      className="text-xs font-bold"
      style={{ color: BRAND.blueDeep }}
    >
      Copy
    </TextComponent>
  </Pressable>
);

const Line = ({
  label,
  value,
  strong
}: {
  label: string;
  value: string;
  strong?: boolean;
}) => (
  <View className="flex-row items-center justify-between gap-3 py-1.5">
    <TextComponent
      className={
        strong
          ? "flex-1 text-base font-bold text-zinc-950"
          : "flex-1 text-sm text-zinc-600"
      }
    >
      {label}
    </TextComponent>
    <TextComponent
      className={
        strong
          ? "text-base font-extrabold text-zinc-950"
          : "text-sm font-semibold text-zinc-900"
      }
    >
      {value}
    </TextComponent>
  </View>
);

const Card = ({
  title,
  children
}: {
  title?: string;
  children: React.ReactNode;
}) => (
  <View className="mx-4 mt-3 rounded-2xl bg-white p-4">
    {!!title && (
      <TextComponent className="mb-1 text-xs font-extrabold tracking-wide text-zinc-400">
        {title.toUpperCase()}
      </TextComponent>
    )}
    {children}
  </View>
);

/** A message to our team about this order, with the order number already on it. */
const OrderHelp = ({ order }: { order: TMyOrder }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const reference = order.reference ?? order.id;
  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await openSupportChat(
        `Help with order ${reference} (${order.ticket?.event?.name ?? "event"}):\n${message.trim()}`
      );
      setMessage("");
      setOpen(false);
      onSuccess("Sent. The Turnupz team will reply in your Messages.");
    } catch {
      onError("Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="mx-4 mt-3 h-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: INK }}
      >
        <TextComponent className="font-bold text-white">
          Get help with this order
        </TextComponent>
      </Pressable>
    );
  }
  return (
    <Card title="Get help">
      <TextComponent className="text-sm text-zinc-600">
        Tell us what went wrong, or ask for a refund. We'll include your order
        number {reference}, and reply in your Messages.
      </TextComponent>
      <TextInput
        value={message}
        onChangeText={setMessage}
        multiline
        placeholder="e.g. I'd like a refund, or I was charged but didn't get my tickets"
        placeholderTextColor="#A1A1AA"
        className="mt-3 min-h-24 rounded-xl border border-zinc-200 p-3 text-base text-zinc-950"
        style={{ textAlignVertical: "top" }}
      />
      <Pressable
        onPress={() => void send()}
        disabled={!message.trim() || sending}
        accessibilityRole="button"
        className="mt-3 h-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: message.trim() ? BRAND.blueDeep : "#D4D4D8" }}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <TextComponent className="font-bold text-white">Send</TextComponent>
        )}
      </Pressable>
    </Card>
  );
};

/** One order in full: the receipt, how it was paid, any refunds, its tickets, and help. */
const OrderReceipt = ({ order }: { order: TMyOrder }) => {
  const queryClient = useQueryClient();
  const [reopening, setReopening] = useState(false);
  const status = order.status?.toUpperCase();
  const waiting = status === "PENDING";
  // A receipt is proof of payment: paid (or free) orders, and refunded ones.
  const hasReceipt = status === "COMPLETED" || status === "REFUNDED";
  const completePayment = async () => {
    setReopening(true);
    try {
      const { data } = await postData<
        undefined,
        { redirectUrl?: string; status?: string }
      >(`/order/${order.id}/payment`);
      if (data?.data?.redirectUrl) {
        await Linking.openURL(data.data.redirectUrl);
      } else {
        onSuccess("Payment received. Your tickets are in My tickets.");
      }
    } catch (error) {
      onError(
        constructErrorMessage(
          error as TApiErrorResponseType,
          "We couldn't reopen the payment page."
        )
      );
    } finally {
      setReopening(false);
      // Coming back from paying (or a lapsed hold) changes the order: look again.
      void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    }
  };
  const event = order.ticket?.event;
  const badge = badgeOf(order);
  const reference = order.reference ?? order.id;
  const image = event?.image ?? event?.medias?.[0];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl bg-white p-4">
        <View className="size-14 overflow-hidden rounded-xl bg-zinc-100">
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
            numberOfLines={2}
            className="text-base font-bold text-zinc-950"
          >
            {event?.name ?? "Event"}
          </TextComponent>
          {!!event?.date && (
            <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
              {formatEventDay(event.date, event.timezone, { withYear: false })}{" "}
              · {formatEventClock(event.date, event.timezone)} ·{" "}
              {eventPlace(event)}
            </TextComponent>
          )}
        </View>
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: badge.bg }}
        >
          <TextComponent
            className="text-xs font-bold"
            style={{ color: badge.fg }}
          >
            {badge.label}
          </TextComponent>
        </View>
      </View>

      <Card>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <TextComponent className="text-xs text-zinc-500">
              Order number
            </TextComponent>
            <TextComponent className="text-base font-extrabold tracking-wider text-zinc-950">
              {reference}
            </TextComponent>
          </View>
          <CopyButton text={reference} what="Order number" />
        </View>
        <TextComponent className="mt-2 text-xs text-zinc-500">
          Ordered {orderedOn(order.createdAt)}
        </TextComponent>
        {!!order.statusReason && (
          <TextComponent className="mt-2 text-sm leading-5 text-zinc-600">
            {order.statusReason}
          </TextComponent>
        )}
      </Card>

      {waiting && (
        <Card>
          <TextComponent className="text-base font-bold text-zinc-950">
            Waiting for your payment
          </TextComponent>
          <TextComponent className="mt-1 text-sm leading-5 text-zinc-600">
            {order.holdExpiresAt && new Date(order.holdExpiresAt) > new Date()
              ? `Your seats are held until ${new Date(order.holdExpiresAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}. Finish paying to get your tickets.`
              : "Finish paying to get your tickets. If the seats have gone in the meantime, you won't be charged."}
          </TextComponent>
          <Pressable
            onPress={() => void completePayment()}
            disabled={reopening}
            accessibilityRole="button"
            className="mt-3 h-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: BRAND.blueDeep }}
          >
            {reopening ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <TextComponent className="font-bold text-white">
                Complete payment
              </TextComponent>
            )}
          </Pressable>
        </Card>
      )}

      <Card title={hasReceipt ? "What you bought" : "Your order"}>
        {(order.items ?? []).map((item) => (
          <Line
            key={item.ticketId}
            label={`${item.quantity} × ${item.name}`}
            value={
              item.unitPrice?.amount
                ? `${item.unitPrice.formatted?.withCurrency} each`
                : "Free"
            }
          />
        ))}
        {(order.tax ?? []).map((tax) => (
          <Line
            key={tax.label}
            label={order.taxIncluded ? `Includes ${tax.label}` : tax.label}
            value={tax.amount?.formatted?.withCurrency ?? ""}
          />
        ))}
        <View className="mt-1 border-t border-zinc-100 pt-1">
          <Line
            label="Total"
            value={
              order.total?.amount
                ? (order.total.formatted?.withCurrency ?? "")
                : "Free"
            }
            strong
          />
        </View>
      </Card>

      {(!!order.payment?.card || !!order.payment?.credit) && (
        <Card
          title={
            order.status?.toUpperCase() === "PENDING"
              ? "Held for this order"
              : "How you paid"
          }
        >
          {!!order.payment?.card && (
            <Line
              label={order.payment.cardLabel ?? "Card"}
              value={order.payment.card.formatted?.withCurrency ?? ""}
            />
          )}
          {!!order.payment?.credit && (
            <Line
              label="Turnupz Credit"
              value={order.payment.credit.formatted?.withCurrency ?? ""}
            />
          )}
        </Card>
      )}

      {!!order.refunds?.length && (
        <Card title="Refunds">
          {order.refunds.map((refund, index) => {
            return (
              <View key={index} className="gap-3 py-2">
                <TextComponent className="text-sm font-semibold text-zinc-900">
                  {refund.tickets} ticket{refund.tickets === 1 ? "" : "s"}
                  {refund.kind === "event_cancelled" ? " · event cancelled" : ""}
                </TextComponent>
                <RefundTracker refund={refund} />
                <View className="gap-1">
                  {[
                    refund.toCard.amount > 0 && ["To your card", refund.toCard.formatted?.withCurrency],
                    refund.asCredit.amount > 0 && ["As Turnupz Credit", refund.asCredit.formatted?.withCurrency],
                    !!refund.feeKept?.amount && ["Booking fee, not refunded", refund.feeKept.formatted?.withCurrency],
                    !!refund.reason && ["Reason", refund.reason]
                  ]
                    .filter((row): row is [string, string] => Array.isArray(row))
                    .map(([label, value]) => (
                      <View key={label} className="flex-row justify-between gap-4">
                        <TextComponent className="text-xs text-zinc-500">{label}</TextComponent>
                        <TextComponent className="flex-1 text-right text-xs font-semibold text-zinc-900">{value}</TextComponent>
                      </View>
                    ))}
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {!!order.userTickets?.length && (
        <Card
          title={
            order.userTickets.length > 1
              ? `Your ${order.userTickets.length} tickets`
              : "Your ticket"
          }
        >
          {order.userTickets.map((ticket) => (
            <View
              key={ticket.id}
              className="flex-row items-center justify-between gap-3 py-1.5"
            >
              <View className="flex-1">
                <TextComponent className="text-sm font-bold tracking-wider text-zinc-950">
                  {(ticket.code ?? ticket.id).toUpperCase()}
                </TextComponent>
                <TextComponent className="text-xs text-zinc-500">
                  {ticket.ticket?.name ?? "Ticket"}
                </TextComponent>
              </View>
              <CopyButton
                text={(ticket.code ?? ticket.id).toUpperCase()}
                what="Ticket code"
              />
            </View>
          ))}
        </Card>
      )}

      {hasReceipt && (
        <Pressable
          onPress={() =>
            void shareReceipt(order, badge.label).catch(() =>
              onError("Couldn't make the receipt. Please try again.")
            )
          }
          accessibilityRole="button"
          className="mx-4 mt-3 h-12 flex-row items-center justify-center gap-2 rounded-xl bg-white"
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path
              d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"
              fill="none"
              stroke={BRAND.blueDeep}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <TextComponent
            className="font-bold"
            style={{ color: BRAND.blueDeep }}
          >
            Share or save receipt
          </TextComponent>
        </Pressable>
      )}
      <OrderHelp order={order} />
    </ScrollView>
  );
};

/**
 * An order on its own page, over whatever is open: from the Orders list, or
 * from a pass ("View order"). Give it the order, or just its id to load it.
 */
export const OrderSheet = memo(function OrderSheet({
  order,
  orderId,
  onClose
}: {
  order?: TMyOrder | null;
  orderId?: string | null;
  onClose: () => void;
}) {
  const loaded = useMyOrder(order ? null : orderId);
  const shown = order ?? loaded.data ?? null;
  const visible = !!order || !!orderId;
  return (
    <SafeModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={["bottom"]}
        className="flex-1"
        style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
      >
        <View className="h-14 flex-row items-center justify-between border-b border-black/5 bg-white px-4">
          <TextComponent className="text-lg font-bold text-zinc-950">
            Order
          </TextComponent>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            className="size-9 items-center justify-center rounded-full bg-zinc-100"
          >
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke={INK}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
        </View>
        {shown ? (
          <OrderReceipt order={shown} />
        ) : loaded.isLoading ? (
          <Loading />
        ) : (
          <EmptyNote
            title="We couldn't find this order"
            body="Pull down on Orders to try again."
          />
        )}
      </SafeAreaView>
      <OverlayToast />
    </SafeModal>
  );
});

/** One row in Orders: the event, what was bought, the total and how it went. */
const OrderRow = ({
  order,
  onPress
}: {
  order: TMyOrder;
  onPress: () => void;
}) => {
  const event = order.ticket?.event;
  const badge = badgeOf(order);
  const image = event?.image ?? event?.medias?.[0];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl bg-white p-3.5"
    >
      <View className="size-12 overflow-hidden rounded-xl bg-zinc-100">
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
          className="text-[15px] font-bold text-zinc-950"
        >
          {event?.name ?? "Event"}
        </TextComponent>
        <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
          {linesOf(order)}
        </TextComponent>
        <TextComponent numberOfLines={1} className="text-xs text-zinc-400">
          {new Date(order.createdAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
          })}
          {order.reference ? ` · ${order.reference}` : ""}
        </TextComponent>
      </View>
      <View className="items-end gap-1">
        <TextComponent className="text-sm font-extrabold text-zinc-950">
          {order.total?.amount ? order.total.formatted?.withCurrency : "Free"}
        </TextComponent>
        <View
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: badge.bg }}
        >
          <TextComponent
            className="text-[11px] font-bold"
            style={{ color: badge.fg }}
          >
            {badge.label}
          </TextComponent>
        </View>
      </View>
    </Pressable>
  );
};

/** Orders: every purchase you've made, as receipts, with help for each. */
const OrdersPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const orders = useMyOrders();
  const [open, setOpen] = useState<TMyOrder | null>(null);
  const list = (orders.data?.pages ?? []).flatMap((page) => page.orders);
  return (
    <View
      className="flex-1"
      style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
    >
      <BackHeader title="Orders" onBack={onBack} />
      <BrandRefreshList
        data={list}
        keyExtractor={(order) => order.id}
        style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        refreshing={orders.isRefetching}
        onRefresh={() => void orders.refetch()}
        onEndReached={() =>
          orders.hasNextPage &&
          !orders.isFetchingNextPage &&
          void orders.fetchNextPage()
        }
        ListHeaderComponent={
          <TextComponent className="mx-5 mb-3 text-xs leading-5 text-zinc-500">
            Your receipts and payments. Need help? Open an order and quote its
            order number.
          </TextComponent>
        }
        ListEmptyComponent={
          orders.isLoading ? (
            <Loading />
          ) : (
            <EmptyNote
              title="No orders yet"
              body="Tickets you buy or register for will show here with their receipts."
            />
          )
        }
        renderItem={({ item }) => (
          <OrderRow order={item} onPress={() => setOpen(item)} />
        )}
      />
      <OrderSheet order={open} onClose={() => setOpen(null)} />
    </View>
  );
};

export default memo(OrdersPage);
