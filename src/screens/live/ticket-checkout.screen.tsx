import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import ChevronLeftIcon from "@/shared/assets/icons/chevron-left.icon";
import { onError } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { postData } from "@/api";
import useUserStore from "@/shared/stores/user.store";
import { describeTicketSaleState, ticketSaleState } from "@/shared/utils/ticket-sales";
import { ticketDaysLabel } from "@/shared/utils/event-days";
import { orderOutcome } from "@/shared/utils/order-status";
import { BRAND } from "@/shared/utils/brand-colors";
import { readArrival } from "@/shared/stores/arrival.store";
import HoldTimer from "./hold-timer";
import {
  cardLabel,
  checkPromoCode,
  fetchOrder,
  formatMoney,
  formatZero,
  formatPrice,
  TLiveEvent,
  TLiveOrder,
  TLiveTicket,
  TPromoCheck,
  TSavedCard,
  useCreateOrder,
  useCreditBalance,
  useLiveTickets,
  useSavedCards
} from "./live-api";

/** Most a buyer can pick when the ticket sets no limit of its own. */
const DEFAULT_MAX = 10;

type TStep =
  | { kind: "select" }
  /** On Flutterwave's page (redirectUrl), or a saved card the bank is still confirming. */
  | {
      kind: "awaiting-payment";
      orderId: string;
      redirectUrl?: string;
      /** When the held seats are let go, for the countdown. */
      holdExpiresAt?: string | null;
    }
  | { kind: "outcome"; order: TLiveOrder }
  | { kind: "registered"; status: "confirmed" | "pending" };

const maxFor = (ticket: TLiveTicket) => {
  const byStock = ticket.available ?? ticket.quantity ?? DEFAULT_MAX;
  const cap = ticket.maxPerOrder ?? DEFAULT_MAX;
  return Math.max(0, Math.min(byStock, cap));
};

/**
 * Picking tickets and paying, for one event. One ticket type per order, as the API
 * takes it. Turnupz Credit can pay for some or all of it; the rest is paid with a
 * saved card (straight away) or on Flutterwave's page in the browser, where the
 * card can be saved for next time. When the app comes back to the front, the
 * order is read again, and the API confirms the payment as it answers.
 */
const LiveTicketCheckoutScreen = ({
  event,
  onBack,
  onViewTickets
}: {
  event: TLiveEvent;
  onBack: () => void;
  onViewTickets: () => void;
}) => {
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 380;
  const horizontalPadding = isCompactPhone ? 12 : 16;
  const user = useUserStore((state) => state.user);
  const isRegistration = event.saleMethod === "register";
  const { data: allTickets, isLoading, error, refetch } = useLiveTickets(event.id);
  const createOrder = useCreateOrder();
  /** How many of each ticket type: several types for tickets, one for registration. */
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [step, setStep] = useState<TStep>({ kind: "select" });
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Android back: never mid-payment; from the waiting screen, back to the tickets.
  useHardwareBack(() => {
    if (isSubmitting) return;
    if (step.kind === "awaiting-payment") setStep({ kind: "select" });
    else onBack();
  });

  // Private tickets need the organiser's invite link, and external ones are sold
  // elsewhere, so neither is offered here.
  const tickets = useMemo(
    () =>
      (allTickets ?? []).filter(
        (ticket) => ticket.visibility !== "private" && ticket.type !== "EXTERNAL_LINK"
      ),
    [allTickets]
  );
  const lines = useMemo(
    () =>
      tickets
        .filter((ticket) => (quantities[ticket.id] ?? 0) > 0)
        .map((ticket) => ({ ticket, quantity: quantities[ticket.id] })),
    [tickets, quantities]
  );
  const selected = lines[0]?.ticket ?? null;
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const selectedOnSale =
    lines.length > 0 && lines.every((line) => ticketSaleState(line.ticket).status === "open");
  const orderAmount = lines.reduce(
    (sum, line) => sum + (line.ticket.price?.amount ?? 0) * line.quantity,
    0
  );
  const isFree = orderAmount <= 0;

  // The organiser's promo code: checked with the API, taken off each paid ticket
  // (never more than 90%). The API works out the exact amount when you pay.
  const [promo, setPromo] = useState<TPromoCheck | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoChecking, setPromoChecking] = useState(false);
  const applyPromo = useCallback(
    async (raw: string, quiet = false) => {
      const code = raw.trim().toUpperCase();
      if (!code) return;
      setPromoChecking(true);
      try {
        const checked = await checkPromoCode(event.id, code);
        if (checked) {
          setPromo(checked);
          setPromoInput(checked.code);
          setPromoOpen(true);
        }
      } catch (promoError) {
        if (!quiet) {
          onError(
            constructErrorMessage(
              promoError as TApiErrorResponseType,
              "That code doesn't work for this event."
            )
          );
        }
      } finally {
        setPromoChecking(false);
      }
    },
    [event.id]
  );
  // A promoter's code they arrived with fills itself in.
  useEffect(() => {
    const code = readArrival(event.id).code;
    if (code && user && !isRegistration) void applyPromo(code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, !!user]);
  const promoDiscount =
    !promo || isRegistration
      ? 0
      : lines.reduce((sum, line) => {
          const price = line.ticket.price?.amount ?? 0;
          if (price <= 0) return sum;
          const most = Math.floor(price * 0.9);
          const off = promo.discountPercent
            ? Math.min(Math.round((price * promo.discountPercent) / 100), most)
            : Math.min(promo.discountAmount?.amount ?? 0, most);
          return sum + off * line.quantity;
        }, 0);
  const afterPromo = Math.max(orderAmount - promoDiscount, 0);
  const total = selected ? formatMoney(afterPromo, selected.price) : "";

  // Turnupz Credit in the ticket's currency, spent first when switched on.
  const { data: credit } = useCreditBalance(!isRegistration);
  const [useCredit, setUseCredit] = useState(true);
  const currency = selected?.price?.currency?.code?.toUpperCase();
  const creditAvailable =
    credit?.find((row) => row.currency.toUpperCase() === currency)?.available
      ?.amount ?? 0;
  const creditApplied =
    !isFree && !isRegistration && useCredit
      ? Math.min(creditAvailable, afterPromo)
      : 0;
  const toPay = Math.max(afterPromo - creditApplied, 0);
  const coveredByCredit = creditApplied > 0 && toPay === 0;

  // Pay with: a saved card (the one that pays first is picked), or a new card.
  const needsCard = !!selected && !isFree && !isRegistration && !coveredByCredit;
  const { data: savedCards } = useSavedCards(!isRegistration);
  const usableCards = useMemo(
    () => (savedCards ?? []).filter((card) => !card.isExpired),
    [savedCards]
  );
  const [cardChoice, setCardChoice] = useState<string | "new" | null>(null);
  const payWith =
    cardChoice && (cardChoice === "new" || usableCards.some((card) => card.id === cardChoice))
      ? cardChoice
      : (usableCards.find((card) => card.isDefault) ?? usableCards[0])?.id ?? "new";
  const payingCard = usableCards.find((card) => card.id === payWith) ?? null;
  const [saveCard, setSaveCard] = useState(true);

  // Start with one of the first ticket that's on sale, so the summary isn't empty.
  const [startedWithOne, setStartedWithOne] = useState(false);
  useEffect(() => {
    if (startedWithOne) return;
    const firstBuyable = tickets.find(
      (ticket) => ticketSaleState(ticket).status === "open" && maxFor(ticket) > 0
    );
    if (firstBuyable) {
      setQuantities({ [firstBuyable.id]: 1 });
      setStartedWithOne(true);
    }
  }, [startedWithOne, tickets]);

  /** Moves the countdown to the hold's latest end, if they're still on that order. */
  const keepHold = useCallback((orderId: string, holdExpiresAt: string) => {
    setStep((current) =>
      current.kind === "awaiting-payment" &&
      current.orderId === orderId &&
      current.holdExpiresAt !== holdExpiresAt
        ? { ...current, holdExpiresAt }
        : current
    );
  }, []);

  const checkOrder = useCallback(async (orderId: string) => {
    setIsChecking(true);
    try {
      const order = await fetchOrder(orderId);
      if (order && order.status?.toUpperCase() !== "PENDING") {
        setStep({ kind: "outcome", order });
      } else if (order?.holdExpiresAt) {
        keepHold(orderId, order.holdExpiresAt);
      }
      return order;
    } catch (checkError) {
      onError(
        constructErrorMessage(
          checkError as TApiErrorResponseType,
          "We couldn't check your order. Please try again."
        )
      );
    } finally {
      setIsChecking(false);
    }
  }, [keepHold]);

  // Coming back from the payment page is the moment to look again.
  const awaitingOrderId = step.kind === "awaiting-payment" ? step.orderId : null;
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!awaitingOrderId) return;
    const subscription = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        void checkOrder(awaitingOrderId);
      }
      appState.current = next;
    });
    return () => subscription.remove();
  }, [awaitingOrderId, checkOrder]);

  // A saved card being confirmed: look again every few seconds.
  const confirmingOrderId =
    step.kind === "awaiting-payment" && !step.redirectUrl ? step.orderId : null;
  useEffect(() => {
    if (!confirmingOrderId) return;
    const timer = setInterval(() => void checkOrder(confirmingOrderId), 4000);
    return () => clearInterval(timer);
  }, [confirmingOrderId, checkOrder]);

  /**
   * Sets how many of one ticket type. Registration takes one type at a time, and
   * an order can't mix currencies, so either of those starts the order afresh.
   */
  const setCount = (ticket: TLiveTicket, count: number) => {
    const next = Math.max(0, Math.min(count, maxFor(ticket)));
    setQuantities((current) => {
      const otherCurrency =
        !!currency && ticket.price?.currency?.code?.toUpperCase() !== currency;
      const base = isRegistration || otherCurrency ? {} : { ...current };
      if (next > 0) base[ticket.id] = next;
      else delete base[ticket.id];
      return base;
    });
  };

  const pay = async () => {
    if (!selected || !selectedOnSale || quantity < 1) return;
    const one = lines.length === 1;
    // What brought them here (a boost, a reminder…), for the organiser's results.
    const source = readArrival(event.id).src;
    setIsSubmitting(true);
    try {
      if (isRegistration) {
        const name =
          user?.name ||
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          "Turnupz attendee";
        const { data } = await postData<
          { ticketId: string; quantity: number; attendeeName: string; attendeeEmail: string },
          { status: "confirmed" | "pending" }
        >(`/event/${event.id}/register`, {
          ticketId: selected.id,
          quantity,
          attendeeName: name,
          attendeeEmail: user?.email ?? ""
        });
        setStep({ kind: "registered", status: data?.data?.status ?? "confirmed" });
        return;
      }
      const created = await createOrder.mutateAsync({
        // One ticket type keeps the original request; several go as items.
        ...(one
          ? { ticketId: selected.id, quantity }
          : {
              items: lines.map((line) => ({
                ticketId: line.ticket.id,
                quantity: line.quantity
              }))
            }),
        ...(creditApplied > 0 ? { useCredit: true } : {}),
        ...(promo ? { promoCode: promo.code } : {}),
        ...(source ? { source } : {}),
        ...(needsCard
          ? payingCard
            ? { cardId: payingCard.id }
            : { saveCard }
          : {})
      });
      if (!created?.orderId) throw new Error("No order was created");
      // A saved card the bank hasn't confirmed yet: wait here for it.
      if (!created.redirectUrl && created.status?.toUpperCase() === "PENDING") {
        setStep({
          kind: "awaiting-payment",
          orderId: created.orderId,
          holdExpiresAt: created.holdExpiresAt
        });
        return;
      }
      if (created.redirectUrl) {
        setStep({
          kind: "awaiting-payment",
          orderId: created.orderId,
          redirectUrl: created.redirectUrl,
          holdExpiresAt: created.holdExpiresAt
        });
        await Linking.openURL(created.redirectUrl);
        return;
      }
      // A free ticket, or one paid fully with credit, completes straight away.
      const order = await checkOrder(created.orderId);
      if (order) setStep({ kind: "outcome", order });
    } catch (payError) {
      onError(
        constructErrorMessage(
          payError as TApiErrorResponseType,
          isRegistration
            ? "We couldn't register you. Please try again."
            : "We couldn't start your order. Please try again."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const reopenPayment = async (orderId: string) => {
    try {
      const { data } = await postData<
        undefined,
        { redirectUrl?: string; status?: string; holdExpiresAt?: string | null }
      >(`/order/${orderId}/payment`);
      // Reopening holds the seats afresh if the hold had run out.
      if (data?.data?.holdExpiresAt) keepHold(orderId, data.data.holdExpiresAt);
      if (data?.data?.redirectUrl) {
        await Linking.openURL(data.data.redirectUrl);
      } else {
        await checkOrder(orderId);
      }
    } catch (reopenError) {
      onError(
        constructErrorMessage(
          reopenError as TApiErrorResponseType,
          "We couldn't reopen the payment page."
        )
      );
    }
  };

  const header = (title: string, onPress: () => void) => (
    <View className="z-10 mb-4 flex-row items-center bg-zinc-50 py-2">
      <Pressable onPress={onPress} className="size-8 items-center justify-center">
        <ChevronLeftIcon size={18} color="#52525b" />
      </Pressable>
      <TextComponent className="flex-1 text-center font-bold text-zinc-950">
        {title}
      </TextComponent>
      <View className="size-8" />
    </View>
  );

  if (step.kind === "awaiting-payment" && !step.redirectUrl) {
    return (
      <View className="flex-1 bg-zinc-50" style={{ padding: horizontalPadding }}>
        {header("Confirming payment", () => setStep({ kind: "select" }))}
        <View className="mt-10 items-center gap-3 px-4">
          <ActivityIndicator color="#00B2FF" />
          <TextComponent className="text-center text-lg font-bold text-zinc-950">
            Your bank is confirming the payment
          </TextComponent>
          <TextComponent className="text-center text-sm text-zinc-600">
            This usually takes a few seconds. Your tickets will be in My Tickets as soon as
            it's done.
          </TextComponent>
          <HoldTimer until={step.holdExpiresAt} />
        </View>
        <Pressable
          onPress={() => void checkOrder(step.orderId)}
          disabled={isChecking}
          className="mt-8 h-12 items-center justify-center rounded-lg bg-primary"
        >
          {isChecking ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <TextComponent className="font-bold text-white">Check again</TextComponent>
          )}
        </Pressable>
      </View>
    );
  }

  if (step.kind === "awaiting-payment") {
    return (
      <View className="flex-1 bg-zinc-50" style={{ padding: horizontalPadding }}>
        {header("Complete payment", () => setStep({ kind: "select" }))}
        <View className="mt-10 items-center gap-3 px-4">
          <ActivityIndicator color="#00B2FF" />
          <TextComponent className="text-center text-lg font-bold text-zinc-950">
            Finish paying in your browser
          </TextComponent>
          <TextComponent className="text-center text-sm text-zinc-600">
            Come back here when you're done and we'll confirm your tickets.
          </TextComponent>
          <HoldTimer until={step.holdExpiresAt} />
        </View>
        <Pressable
          onPress={() => void checkOrder(step.orderId)}
          disabled={isChecking}
          className="mt-8 h-12 items-center justify-center rounded-lg bg-primary"
        >
          {isChecking ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <TextComponent className="font-bold text-white">I've paid, check now</TextComponent>
          )}
        </Pressable>
        <Pressable
          onPress={() => void reopenPayment(step.orderId)}
          className="mt-3 h-12 items-center justify-center rounded-lg border border-zinc-200 bg-white"
        >
          <TextComponent className="font-bold text-zinc-700">Open the payment page again</TextComponent>
        </Pressable>
      </View>
    );
  }

  if (step.kind === "outcome" || step.kind === "registered") {
    const outcome =
      step.kind === "outcome"
        ? orderOutcome(step.order.status)
        : step.status === "pending"
          ? {
              title: "Registration submitted",
              message: "The organiser approves registrations for this event. We'll let you know.",
              tone: "wait" as const
            }
          : {
              title: "You're registered!",
              message: "Your pass is ready in My Tickets.",
              tone: "good" as const
            };
    const reason = step.kind === "outcome" ? step.order.statusReason : null;
    const toneClass = {
      good: "bg-emerald-50 text-emerald-700",
      wait: "bg-sky-50 text-sky-800",
      bad: "bg-red-50 text-red-700",
      info: "bg-sky-50 text-sky-700"
    }[outcome.tone];
    const canRetry = step.kind === "outcome" && step.order.status?.toUpperCase() === "FAILED";
    return (
      <View className="flex-1 bg-zinc-50" style={{ padding: horizontalPadding }}>
        {header("Your order", onBack)}
        <View className={`mt-6 rounded-2xl p-5 ${toneClass.split(" ")[0]}`}>
          <TextComponent className={`text-xl font-bold ${toneClass.split(" ")[1]}`}>
            {outcome.title}
          </TextComponent>
          <TextComponent className="mt-2 text-sm leading-5 text-zinc-700">
            {outcome.message}
          </TextComponent>
          {!!reason && (
            <TextComponent className="mt-3 text-sm leading-5 text-zinc-600">{reason}</TextComponent>
          )}
        </View>
        {(outcome.tone === "good" || step.kind === "registered") && (
          <Pressable
            onPress={onViewTickets}
            className="mt-6 h-12 items-center justify-center rounded-lg bg-primary"
          >
            <TextComponent className="font-bold text-white">View my tickets</TextComponent>
          </Pressable>
        )}
        {canRetry && (
          <Pressable
            onPress={() => setStep({ kind: "select" })}
            className="mt-6 h-12 items-center justify-center rounded-lg bg-primary"
          >
            <TextComponent className="font-bold text-white">Try again</TextComponent>
          </Pressable>
        )}
        <Pressable
          onPress={onBack}
          className="mt-3 h-12 items-center justify-center rounded-lg border border-zinc-200 bg-white"
        >
          <TextComponent className="font-bold text-zinc-700">Back to the event</TextComponent>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-zinc-50"
      stickyHeaderIndices={[0]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 32,
        paddingHorizontal: horizontalPadding,
        paddingTop: horizontalPadding
      }}
    >
      {header(isRegistration ? "Register" : "Select Ticket", onBack)}
      {!!event.image && (
        <CustomImage
          className="w-full rounded-xl"
          imageClassName="size-full rounded-xl"
          source={{ uri: event.image }}
          contentFit="cover"
          style={{ height: isCompactPhone ? 124 : 144 }}
        />
      )}
      <TextComponent className="mt-4 text-lg font-bold text-zinc-950">
        {isRegistration ? "Registration types" : "Available Tickets"}
      </TextComponent>

      {isLoading && <ActivityIndicator className="mt-6" color="#00B2FF" />}
      {!!error && !isLoading && (
        <Pressable onPress={() => void refetch()} className="mt-4 rounded-xl bg-white p-4">
          <TextComponent className="text-sm text-zinc-700">
            Couldn't load tickets. Tap to try again.
          </TextComponent>
        </Pressable>
      )}
      {!isLoading && !error && tickets.length === 0 && (
        <TextComponent className="mt-4 text-sm text-zinc-500">
          No tickets are available for this event right now.
        </TextComponent>
      )}

      {tickets.map((ticket) => {
        const saleNote = describeTicketSaleState(ticketSaleState(ticket), event.timezone);
        // Which days of a multi-day event it gets you in on.
        const daysNote = ticketDaysLabel(ticket.dayIds, event);
        const soldOut = maxFor(ticket) === 0 && (ticket.available ?? 1) === 0;
        const count = quantities[ticket.id] ?? 0;
        const isSelected = count > 0;
        const max = maxFor(ticket);
        const unavailable = !!saleNote || soldOut;
        return (
          <Pressable
            key={ticket.id}
            disabled={unavailable}
            onPress={() => {
              if (!isSelected) setCount(ticket, 1);
            }}
            className="mt-3"
            style={unavailable ? { opacity: 0.55 } : undefined}
          >
            <TicketShape
              selected={isSelected && !unavailable}
              top={
                <View className="flex-row items-start gap-3 px-4 pb-3.5 pt-4">
                  <View className="flex-1">
                    <TextComponent numberOfLines={2} className="text-[15px] font-bold text-zinc-950">
                      {ticket.name}
                    </TextComponent>
                    {!!daysNote && (
                      <TextComponent className="mt-1 text-xs font-bold" style={{ color: "#0577FA" }}>
                        {daysNote}
                      </TextComponent>
                    )}
                    {!!saleNote && (
                      <TextComponent className="mt-1.5 text-xs font-semibold text-sky-700">
                        {saleNote}
                      </TextComponent>
                    )}
                  </View>
                  {soldOut ? (
                    <TicketChip label="Sold out" tone="danger" />
                  ) : (
                    !saleNote &&
                    ticket.available != null && (
                      <TicketChip
                        label={`${ticket.available.toLocaleString()} left`}
                        tone={ticket.available <= FEW_LEFT ? "warn" : "plain"}
                      />
                    )
                  )}
                </View>
              }
              bottom={
                <View className="min-h-[52px] flex-row items-center px-4 py-3">
                  <View className="flex-1">
                    <TextComponent className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Price
                    </TextComponent>
                    <TextComponent className="text-base font-extrabold" style={{ color: BRAND.blueDeep }}>
                      {formatPrice(ticket.price)}
                    </TextComponent>
                  </View>
                  {isSelected && !unavailable ? (
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        onPress={() => setCount(ticket, count - 1)}
                        accessibilityLabel={count === 1 ? `Remove ${ticket.name}` : `One less ${ticket.name}`}
                        className="size-8 items-center justify-center rounded-full bg-zinc-100"
                      >
                        <TextComponent className="font-bold text-zinc-500">-</TextComponent>
                      </Pressable>
                      <TextComponent className="w-6 text-center font-bold text-zinc-950">
                        {count}
                      </TextComponent>
                      <Pressable
                        onPress={() => setCount(ticket, count + 1)}
                        disabled={count >= max}
                        accessibilityLabel={`One more ${ticket.name}`}
                        className={
                          count >= max
                            ? "size-8 items-center justify-center rounded-full bg-zinc-300"
                            : "size-8 items-center justify-center rounded-full bg-primary"
                        }
                      >
                        <TextComponent className="font-bold text-white">+</TextComponent>
                      </Pressable>
                    </View>
                  ) : (
                    !unavailable && (
                      <TextComponent className="text-xs font-bold" style={{ color: BRAND.blueDeep }}>
                        {isRegistration ? "Select" : "Add"}
                      </TextComponent>
                    )
                  )}
                </View>
              }
              note={
                isSelected && !unavailable && count >= max && max > 0 ? (
                  <View className="mx-4 mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: BRAND.blueTint }}>
                    <TextComponent className="text-xs leading-4 text-zinc-700">
                      {max === ticket.available
                        ? `That's all that's left. You've got the last ${max === 1 ? "one" : max}.`
                        : `You can get up to ${max} in one order, so others get a chance too.`}
                    </TextComponent>
                  </View>
                ) : null
              }
            />
          </Pressable>
        );
      })}

      {!!selected && (
        <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          {lines.map((line, index) => (
            <View
              key={line.ticket.id}
              className={index ? "mt-2 flex-row justify-between gap-3" : "flex-row justify-between gap-3"}
            >
              <TextComponent numberOfLines={1} className="flex-1 text-xs text-zinc-500">
                {line.quantity} × {line.ticket.name}
              </TextComponent>
              <TextComponent className="text-sm font-bold text-zinc-950">
                {formatPrice(line.ticket.price, line.quantity)}
              </TextComponent>
            </View>
          ))}
          {!isFree && !isRegistration && (
            <View className="mt-3 border-t border-zinc-100 pt-3">
              {promo ? (
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <TextComponent className="text-sm font-bold text-emerald-700">
                      {promo.code}
                    </TextComponent>
                    <TextComponent className="text-xs text-zinc-500">{promo.label}</TextComponent>
                  </View>
                  {promoDiscount > 0 && (
                    <TextComponent className="text-sm font-bold text-emerald-700">
                      −{formatMoney(promoDiscount, selected.price)}
                    </TextComponent>
                  )}
                  <Pressable
                    onPress={() => {
                      setPromo(null);
                      setPromoInput("");
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove code ${promo.code}`}
                  >
                    <TextComponent className="text-xs font-bold text-zinc-500">Remove</TextComponent>
                  </Pressable>
                </View>
              ) : promoOpen ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={promoInput}
                    onChangeText={(text) => setPromoInput(text.toUpperCase())}
                    onSubmitEditing={() => void applyPromo(promoInput)}
                    placeholder="Promo code"
                    placeholderTextColor="#a1a1aa"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus
                    maxLength={20}
                    returnKeyType="done"
                    accessibilityLabel="Promo code"
                    className="h-11 flex-1 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-950"
                  />
                  <Pressable
                    disabled={!promoInput.trim() || promoChecking}
                    onPress={() => void applyPromo(promoInput)}
                    accessibilityRole="button"
                    className={
                      !promoInput.trim() || promoChecking
                        ? "h-11 items-center justify-center rounded-lg bg-zinc-300 px-4"
                        : "h-11 items-center justify-center rounded-lg bg-primary px-4"
                    }
                  >
                    {promoChecking ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <TextComponent className="text-sm font-bold text-white">Apply</TextComponent>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setPromoOpen(true)} hitSlop={6} accessibilityRole="button">
                  <TextComponent className="text-sm font-semibold" style={{ color: BRAND.blueDeep }}>
                    Have a promo code?
                  </TextComponent>
                </Pressable>
              )}
            </View>
          )}
          {!isFree && !isRegistration && (
            <View className="mt-3 flex-row items-center justify-between gap-3 border-t border-zinc-100 pt-3">
              <View className="flex-1">
                <TextComponent className="text-sm font-semibold text-zinc-950">
                  Use Turnupz Credit
                </TextComponent>
                <TextComponent className="text-xs text-zinc-500">
                  {creditAvailable > 0
                    ? `${formatMoney(creditAvailable, selected.price)} available`
                    : `${formatZero(selected.price)} available`}
                </TextComponent>
              </View>
              <Switch
                disabled={creditAvailable <= 0}
                value={useCredit && creditAvailable > 0}
                onValueChange={setUseCredit}
                trackColor={{ true: BRAND.blueDeep, false: "#D4D4D8" }}
                thumbColor={BRAND.white}
                accessibilityLabel="Use Turnupz Credit"
              />
            </View>
          )}
          {creditApplied > 0 && (
            <View className="mt-2 flex-row justify-between">
              <TextComponent className="text-xs text-zinc-500">Turnupz Credit</TextComponent>
              <TextComponent className="text-sm font-bold text-zinc-950">
                −{formatMoney(creditApplied, selected.price)}
              </TextComponent>
            </View>
          )}
          <View className="mt-3 flex-row flex-wrap justify-between gap-2 border-t border-zinc-100 pt-3">
            <TextComponent className="text-xs text-zinc-500">
              {creditApplied > 0 ? "To pay" : "Total"}
            </TextComponent>
            <TextComponent className="text-xl font-bold text-zinc-950">
              {creditApplied > 0
                ? coveredByCredit
                  ? "Covered by credit"
                  : formatMoney(toPay, selected.price)
                : total}
            </TextComponent>
          </View>
        </View>
      )}

      {needsCard && (
        <PayWith
          cards={usableCards}
          value={payWith}
          onChange={setCardChoice}
          saveCard={saveCard}
          onSaveCardChange={setSaveCard}
        />
      )}

      <Pressable
        disabled={!selected || !selectedOnSale || isSubmitting}
        onPress={() => void pay()}
        className={
          !selected || !selectedOnSale
            ? "mt-5 h-12 items-center justify-center rounded-lg bg-zinc-300"
            : "mt-5 h-12 items-center justify-center rounded-lg bg-primary"
        }
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <TextComponent className="font-bold text-white">
            {isRegistration
              ? "Register"
              : isFree
                ? "Get free ticket"
                : coveredByCredit
                  ? "Pay with Turnupz Credit"
                  : `Pay ${creditApplied > 0 ? formatMoney(toPay, selected?.price) : total}`}
          </TextComponent>
        )}
      </Pressable>
      {needsCard && (
        <TextComponent className="mt-2 text-center text-[11px] text-zinc-400">
          {payingCard
            ? `Paying with your ${cardLabel(payingCard)}${creditApplied > 0 ? ", after your Turnupz Credit" : ""}.`
            : "You'll pay securely on Flutterwave's page. We never see your card number."}
        </TextComponent>
      )}
    </ScrollView>
  );
};

/** At or under this many left, the count turns orange. */
const FEW_LEFT = 20;

const NOTCH = 11;
const CORNER = 14;

/** The ticket's outline: rounded corners and a half-circle notch each side, at the tear line. */
const ticketPath = (w: number, h: number, cut: number, inset: number) => {
  const l = inset;
  const r = w - inset;
  const t = inset;
  const b = h - inset;
  return [
    `M ${l + CORNER} ${t}`,
    `H ${r - CORNER}`,
    `A ${CORNER} ${CORNER} 0 0 1 ${r} ${t + CORNER}`,
    `V ${cut - NOTCH}`,
    `A ${NOTCH} ${NOTCH} 0 0 0 ${r} ${cut + NOTCH}`,
    `V ${b - CORNER}`,
    `A ${CORNER} ${CORNER} 0 0 1 ${r - CORNER} ${b}`,
    `H ${l + CORNER}`,
    `A ${CORNER} ${CORNER} 0 0 1 ${l} ${b - CORNER}`,
    `V ${cut + NOTCH}`,
    `A ${NOTCH} ${NOTCH} 0 0 0 ${l} ${cut - NOTCH}`,
    `V ${t + CORNER}`,
    `A ${CORNER} ${CORNER} 0 0 1 ${l + CORNER} ${t}`,
    "Z"
  ].join(" ");
};

/**
 * A real-looking ticket: a dotted outline that follows the notches, and a
 * dotted tear line between the details (top) and the price (bottom).
 */
const TicketShape = memo(
  ({
    top,
    bottom,
    note,
    selected
  }: {
    top: React.ReactNode;
    bottom: React.ReactNode;
    /** Shown under the price, inside the ticket. */
    note?: React.ReactNode;
    selected: boolean;
  }) => {
    const [size, setSize] = useState({ w: 0, h: 0 });
    const [cut, setCut] = useState(0);
    const stroke = selected ? BRAND.blue : "#C5CEDA";
    const inset = 1;
    return (
      <View onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {size.w > 0 && cut > 0 && (
          <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h}>
            <Path
              d={ticketPath(size.w, size.h, cut, inset)}
              fill={selected ? "#F2FAFF" : "#FFFFFF"}
              stroke={stroke}
              strokeWidth={1.6}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
            <Line
              x1={NOTCH + 10}
              x2={size.w - NOTCH - 10}
              y1={cut}
              y2={cut}
              stroke={selected ? "#9ADCFF" : "#D9E0E8"}
              strokeWidth={1.6}
              strokeDasharray="1 6"
              strokeLinecap="round"
            />
          </Svg>
        )}
        <View onLayout={(e) => setCut(e.nativeEvent.layout.height)}>{top}</View>
        {bottom}
        {note}
      </View>
    );
  }
);

/** A small pill on the ticket: how many are left, or sold out. */
const TicketChip = ({ label, tone }: { label: string; tone: "plain" | "warn" | "danger" }) => (
  <View
    className="rounded-full px-2.5 py-1"
    style={{ backgroundColor: tone === "danger" ? "#FDECEC" : tone === "warn" ? "#FFF3E0" : "#F1F4F8" }}
  >
    <TextComponent
      className="text-[11px] font-bold"
      style={{ color: tone === "danger" ? "#DC2626" : tone === "warn" ? "#C2410C" : "#52606D" }}
    >
      {label}
    </TextComponent>
  </View>
);

/** A radio dot, filled when picked. */
const Radio = ({ on }: { on: boolean }) => (
  <View
    className="size-5 rounded-full"
    style={{ borderWidth: on ? 6 : 2, borderColor: on ? BRAND.blueDeep : "#C7CDD6" }}
  />
);

/** The card picture: brand initials on its colour. */
export const CardBadge = ({ brand }: { brand: string }) => {
  const dark = /master/i.test(brand);
  return (
    <View
      className="h-7 w-10 items-center justify-center rounded-md"
      style={{ backgroundColor: dark ? "#111111" : /visa/i.test(brand) ? "#1A1F71" : BRAND.ink }}
    >
      <TextComponent className="text-[9px] font-extrabold italic text-white">
        {/visa/i.test(brand) ? "VISA" : dark ? "●●" : brand.slice(0, 4).toUpperCase()}
      </TextComponent>
    </View>
  );
};

/**
 * Saved cards to pick from, or a new card on Flutterwave's page (which can be
 * saved for next time).
 */
const PayWith = ({
  cards,
  value,
  onChange,
  saveCard,
  onSaveCardChange
}: {
  cards: TSavedCard[];
  value: string;
  onChange: (value: string) => void;
  saveCard: boolean;
  onSaveCardChange: (value: boolean) => void;
}) => (
  <View className="mt-4">
    <TextComponent className="mb-2 px-1 text-xs font-bold text-zinc-500">Pay with</TextComponent>
    <View className="rounded-xl bg-white px-4 shadow-sm">
      {cards.map((card) => (
        <Pressable
          key={card.id}
          onPress={() => onChange(card.id)}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === card.id }}
          className="flex-row items-center gap-3 border-b border-zinc-100 py-3"
        >
          <CardBadge brand={card.brand} />
          <View className="flex-1">
            <TextComponent className="text-sm font-bold text-zinc-950">{cardLabel(card)}</TextComponent>
            <TextComponent className="text-xs text-zinc-500">Saved card</TextComponent>
          </View>
          <Radio on={value === card.id} />
        </Pressable>
      ))}
      <Pressable
        onPress={() => onChange("new")}
        accessibilityRole="radio"
        accessibilityState={{ checked: value === "new" }}
        className="flex-row items-center gap-3 py-3"
      >
        <View
          className="h-7 w-10 items-center justify-center rounded-md"
          style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: BRAND.blueDeep }}
        >
          <TextComponent className="font-bold" style={{ color: BRAND.blueDeep }}>+</TextComponent>
        </View>
        <View className="flex-1">
          <TextComponent className="text-sm font-bold text-zinc-950">
            {cards.length ? "Use a new card" : "Card, bank transfer or USSD"}
          </TextComponent>
          <TextComponent className="text-xs text-zinc-500">
            {cards.length ? "Or pay by bank transfer or USSD" : "On Flutterwave's secure page"}
          </TextComponent>
        </View>
        <Radio on={value === "new"} />
      </Pressable>
      {value === "new" && (
        <View className="flex-row items-center gap-3 border-t border-zinc-100 py-3">
          <View className="flex-1">
            <TextComponent className="text-sm font-semibold text-zinc-950">
              Save this card for next time
            </TextComponent>
            <TextComponent className="text-xs text-zinc-500">
              If you pay by card, it goes in your wallet so next time is one tap.
            </TextComponent>
          </View>
          <Switch
            value={saveCard}
            onValueChange={onSaveCardChange}
            trackColor={{ true: BRAND.blueDeep, false: "#D4D4D8" }}
            thumbColor={BRAND.white}
            accessibilityLabel="Save this card for next time"
          />
        </View>
      )}
    </View>
  </View>
);

export default memo(LiveTicketCheckoutScreen);
