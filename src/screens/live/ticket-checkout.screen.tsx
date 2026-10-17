import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  useWindowDimensions,
  View
} from "react-native";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import ChevronLeftIcon from "@/shared/assets/icons/chevron-left.icon";
import { onError } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { postData } from "@/api";
import useUserStore from "@/shared/stores/user.store";
import { describeTicketSaleState, ticketSaleState } from "@/shared/utils/ticket-sales";
import { formatEventClock } from "@/shared/utils/event-time";
import { orderOutcome } from "@/shared/utils/order-status";
import { BRAND } from "@/shared/utils/brand-colors";
import {
  cardLabel,
  fetchOrder,
  formatMoney,
  formatPrice,
  TLiveEvent,
  TLiveOrder,
  TLiveTicket,
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
  | { kind: "awaiting-payment"; orderId: string; redirectUrl?: string }
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
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
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const selectedMax = selected ? maxFor(selected) : 0;
  const selectedOnSale = selected ? ticketSaleState(selected).status === "open" : false;
  const total = selected ? formatPrice(selected.price, quantity) : "";
  const isFree = !selected?.price?.amount;

  // Turnupz Credit in the ticket's currency, spent first when switched on.
  const { data: credit } = useCreditBalance(!isRegistration);
  const [useCredit, setUseCredit] = useState(true);
  const currency = selected?.price?.currency?.code?.toUpperCase();
  const creditAvailable =
    credit?.find((row) => row.currency.toUpperCase() === currency)?.available
      ?.amount ?? 0;
  const orderAmount = (selected?.price?.amount ?? 0) * quantity;
  const creditApplied =
    !isFree && !isRegistration && useCredit
      ? Math.min(creditAvailable, orderAmount)
      : 0;
  const toPay = Math.max(orderAmount - creditApplied, 0);
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

  useEffect(() => {
    if (!selectedId) {
      const firstBuyable = tickets.find(
        (ticket) => ticketSaleState(ticket).status === "open" && maxFor(ticket) > 0
      );
      if (firstBuyable) setSelectedId(firstBuyable.id);
    }
  }, [selectedId, tickets]);

  const checkOrder = useCallback(async (orderId: string) => {
    setIsChecking(true);
    try {
      const order = await fetchOrder(orderId);
      if (order && order.status?.toUpperCase() !== "PENDING") {
        setStep({ kind: "outcome", order });
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
  }, []);

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

  const selectTicket = (ticket: TLiveTicket) => {
    setSelectedId(ticket.id);
    setQuantity(1);
  };

  const pay = async () => {
    if (!selected || !selectedOnSale || quantity < 1) return;
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
        ticketId: selected.id,
        quantity,
        ...(creditApplied > 0 ? { useCredit: true } : {}),
        ...(needsCard
          ? payingCard
            ? { cardId: payingCard.id }
            : { saveCard }
          : {})
      });
      if (!created?.orderId) throw new Error("No order was created");
      // A saved card the bank hasn't confirmed yet: wait here for it.
      if (!created.redirectUrl && created.status?.toUpperCase() === "PENDING") {
        setStep({ kind: "awaiting-payment", orderId: created.orderId });
        return;
      }
      if (created.redirectUrl) {
        setStep({
          kind: "awaiting-payment",
          orderId: created.orderId,
          redirectUrl: created.redirectUrl
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
      const { data } = await postData<undefined, { redirectUrl?: string; status?: string }>(
        `/order/${orderId}/payment`
      );
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
            This usually takes a few seconds. Your seats are held, and your tickets will be
            in My Tickets as soon as it's done.
          </TextComponent>
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
            Finish paying on Flutterwave
          </TextComponent>
          <TextComponent className="text-center text-sm text-zinc-600">
            Your seats are held for a few minutes. Come back here when you're done and
            we'll confirm your tickets.
          </TextComponent>
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
        const soldOut = maxFor(ticket) === 0 && (ticket.available ?? 1) === 0;
        const isSelected = ticket.id === selectedId;
        const unavailable = !!saleNote || soldOut;
        return (
          <Pressable
            key={ticket.id}
            disabled={unavailable}
            onPress={() => selectTicket(ticket)}
            className={
              isSelected
                ? "mt-3 rounded-xl border-2 border-primary bg-white p-4 shadow"
                : "mt-3 rounded-xl border-2 border-transparent bg-white p-4 shadow"
            }
            style={unavailable ? { opacity: 0.55 } : undefined}
          >
            <View className="flex-row items-center">
              <View className="flex-1">
                <TextComponent numberOfLines={2} className="font-bold text-zinc-950">
                  {ticket.name}
                </TextComponent>
                <TextComponent className="mt-1 text-sm font-bold text-primary">
                  {formatPrice(ticket.price)}
                </TextComponent>
                {!!saleNote && (
                  <TextComponent className="mt-2 text-xs font-semibold text-sky-700">
                    {saleNote}
                  </TextComponent>
                )}
                {soldOut && (
                  <TextComponent className="mt-2 text-xs font-semibold text-red-600">
                    Sold out
                  </TextComponent>
                )}
                {!unavailable && !!ticket.maxPerOrder && (
                  <TextComponent className="mt-2 text-xs text-zinc-500">
                    Up to {ticket.maxPerOrder} per order
                  </TextComponent>
                )}
              </View>
              {isSelected && !unavailable && (
                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity <= 1}
                    className="size-7 items-center justify-center rounded-full bg-zinc-100"
                  >
                    <TextComponent className="font-bold text-zinc-500">-</TextComponent>
                  </Pressable>
                  <TextComponent className="w-6 text-center font-bold text-zinc-950">
                    {quantity}
                  </TextComponent>
                  <Pressable
                    onPress={() => setQuantity((current) => Math.min(selectedMax, current + 1))}
                    disabled={quantity >= selectedMax}
                    className={
                      quantity >= selectedMax
                        ? "size-7 items-center justify-center rounded-full bg-zinc-300"
                        : "size-7 items-center justify-center rounded-full bg-primary"
                    }
                  >
                    <TextComponent className="font-bold text-white">+</TextComponent>
                  </Pressable>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}

      {!!selected && (
        <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <View className="flex-row justify-between">
            <TextComponent className="text-xs text-zinc-500">
              {quantity} × {selected.name}
            </TextComponent>
            <TextComponent className="text-sm font-bold text-zinc-950">{total}</TextComponent>
          </View>
          {!isFree && !isRegistration && creditAvailable > 0 && (
            <View className="mt-3 flex-row items-center justify-between gap-3 border-t border-zinc-100 pt-3">
              <View className="flex-1">
                <TextComponent className="text-sm font-semibold text-zinc-950">
                  Use Turnupz Credit
                </TextComponent>
                <TextComponent className="text-xs text-zinc-500">
                  {formatMoney(creditAvailable, selected.price)} available
                </TextComponent>
              </View>
              <Switch
                value={useCredit}
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
          <TextComponent className="mt-2 text-[10px] text-zinc-400">
            Doors at {formatEventClock(event.date, event.timezone)}, venue time.
          </TextComponent>
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
