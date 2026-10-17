import React, { memo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useQueryClient } from "@tanstack/react-query";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { BackHeader } from "@/screens/live/explore-details";
import { maskAmount, useBalancePrivacyStore } from "@/shared/stores/balance-privacy.store";
import { CardBadge } from "@/screens/live/ticket-checkout.screen";
import {
  TCreditGrant,
  TSavedCard,
  cardExpiry,
  cardLabel,
  formatPrice,
  makeCardDefault,
  removeSavedCard,
  useCreditBalance,
  useCreditHistory,
  useSavedCards
} from "@/screens/live/live-api";

const STATE_LABEL: Record<TCreditGrant["state"], string> = {
  PENDING: "On the way",
  AVAILABLE: "Ready to spend",
  SPENT: "Spent",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled"
};

const day = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "";

const SectionLabel = ({ children }: { children: string }) => (
  <TextComponent className="mb-2 mt-6 px-1 text-xs font-bold text-zinc-500">{children}</TextComponent>
);

/**
 * Your wallet: Turnupz Credit (what you can spend on tickets, what's on the way,
 * where it came from) and the cards you've saved, which you can make pay first
 * or remove. Cards are added by ticking "Save this card" when you pay.
 */
const WalletScreen = ({ onBack }: { onBack: () => void }) => {
  const queryClient = useQueryClient();
  const balance = useCreditBalance();
  const history = useCreditHistory();
  const cards = useSavedCards();
  const [busyCard, setBusyCard] = useState<string | null>(null);
  const hideBalance = useBalancePrivacyStore((state) => state.hideBalance);
  const toggleHideBalance = useBalancePrivacyStore((state) => state.toggleHideBalance);

  const rows = balance.data ?? [];
  const recent = (history.data ?? []).slice(0, 10);

  const refresh = () => {
    void balance.refetch();
    void history.refetch();
    void cards.refetch();
  };

  const update = async (card: TSavedCard, action: "default" | "remove") => {
    setBusyCard(card.id);
    try {
      const next = action === "default" ? await makeCardDefault(card.id) : await removeSavedCard(card.id);
      queryClient.setQueryData(["saved-cards"], next);
      onSuccess(action === "default" ? `Your ${cardLabel(card)} now pays first` : "Card removed");
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "That didn't work. Please try again."));
    } finally {
      setBusyCard(null);
    }
  };

  const cardOptions = (card: TSavedCard) =>
    Alert.alert(cardLabel(card), `Expires ${cardExpiry(card)}`, [
      ...(!card.isDefault && !card.isExpired
        ? [{ text: "Make it pay first", onPress: () => void update(card, "default") }]
        : []),
      {
        text: "Remove card",
        style: "destructive" as const,
        onPress: () =>
          Alert.alert("Remove this card?", `You can add your ${cardLabel(card)} again next time you pay.`, [
            { text: "Keep it", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: () => void update(card, "remove") }
          ])
      },
      { text: "Cancel", style: "cancel" as const }
    ]);

  return (
    <View className="flex-1" style={{ backgroundColor: "#F7F8FB" }}>
      <BackHeader title="Wallet" onBack={onBack} />
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={balance.isRefetching} onRefresh={refresh} tintColor={BRAND.blue} />
        }
      >
        {/* Turnupz Credit */}
        <View className="overflow-hidden rounded-3xl p-5" style={{ backgroundColor: BRAND.ink }}>
          <View
            pointerEvents="none"
            className="absolute -right-12 -top-12 size-44 rounded-full"
            style={{ backgroundColor: BRAND.blue, opacity: 0.22 }}
          />
          <View className="flex-row items-center justify-between">
            <TextComponent className="text-xs font-semibold text-white/70">Turnupz Credit</TextComponent>
            <Pressable
              onPress={toggleHideBalance}
              accessibilityRole="button"
              accessibilityLabel={hideBalance ? "Show balance" : "Hide balance"}
              hitSlop={12}
              className="size-8 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              <Svg width={17} height={17} viewBox="0 0 24 24">
                <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke={BRAND.white} strokeWidth={1.8} strokeLinejoin="round" />
                <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="none" stroke={BRAND.white} strokeWidth={1.8} />
                {hideBalance && <Path d="M4 4l16 16" fill="none" stroke={BRAND.white} strokeWidth={1.8} strokeLinecap="round" />}
              </Svg>
            </Pressable>
          </View>
          {balance.isLoading ? (
            <ActivityIndicator className="my-4 self-start" color={BRAND.white} />
          ) : rows.length ? (
            rows.map((row) => (
              <View key={row.currency} className="mt-1">
                <TextComponent className="text-3xl font-extrabold text-white">
                  {hideBalance
                    ? maskAmount(row.available.formatted?.withCurrency ?? formatPrice(row.available))
                    : row.available.formatted?.withCurrency ?? formatPrice(row.available)}
                </TextComponent>
                {row.pending.amount > 0 && !hideBalance && (
                  <TextComponent className="text-sm text-white/70">
                    {formatPrice(row.pending)} on the way
                  </TextComponent>
                )}
                {!!row.nextExpiry && row.available.amount > 0 && (
                  <TextComponent className="text-xs text-white/50">
                    Use some by {day(row.nextExpiry)} before it expires
                  </TextComponent>
                )}
              </View>
            ))
          ) : (
            <TextComponent className="mt-1 text-2xl font-extrabold text-white">
              {hideBalance ? "•••••" : "No credit yet"}
            </TextComponent>
          )}
          <TextComponent className="mt-3 text-xs leading-5 text-white/70">
            From refunds and friends you invite. It comes off your next ticket at checkout.
          </TextComponent>
        </View>

        <SectionLabel>Recent</SectionLabel>
        <View className="rounded-2xl bg-white px-4">
          {history.isLoading ? (
            <ActivityIndicator className="my-5" color={BRAND.blue} />
          ) : recent.length ? (
            recent.map((grant, index) => (
              <View
                key={grant.id}
                className="flex-row items-center gap-3 py-3"
                style={index ? { borderTopWidth: 1, borderTopColor: "#EEF0F4" } : undefined}
              >
                <View className="size-10 items-center justify-center rounded-xl" style={{ backgroundColor: BRAND.blueTint }}>
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path
                      d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"
                      fill="none"
                      stroke={BRAND.blueDeep}
                      strokeWidth={1.8}
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <View className="flex-1">
                  <TextComponent numberOfLines={2} className="text-sm font-bold text-zinc-950">
                    {grant.description}
                  </TextComponent>
                  <TextComponent className="text-xs text-zinc-500">
                    {day(grant.createdAt)} · {STATE_LABEL[grant.state]}
                    {grant.state === "PENDING" && grant.releaseAt ? ` until ${day(grant.releaseAt)}` : ""}
                  </TextComponent>
                </View>
                <TextComponent className="text-sm font-extrabold" style={{ color: BRAND.success }}>
                  +{formatPrice(grant.amount)}
                </TextComponent>
              </View>
            ))
          ) : (
            <TextComponent className="py-4 text-sm text-zinc-500">
              Nothing yet. Invite friends from your profile to earn some.
            </TextComponent>
          )}
        </View>

        <SectionLabel>Cards</SectionLabel>
        <View className="rounded-2xl bg-white px-4">
          {cards.isLoading ? (
            <ActivityIndicator className="my-5" color={BRAND.blue} />
          ) : (cards.data ?? []).length ? (
            (cards.data ?? []).map((card, index) => (
              <Pressable
                key={card.id}
                onPress={() => cardOptions(card)}
                disabled={busyCard === card.id}
                accessibilityRole="button"
                accessibilityHint="Make it pay first or remove it"
                className="flex-row items-center gap-3 py-3"
                style={index ? { borderTopWidth: 1, borderTopColor: "#EEF0F4" } : undefined}
              >
                <CardBadge brand={card.brand} />
                <View className="flex-1">
                  <TextComponent className="text-sm font-bold text-zinc-950">{cardLabel(card)}</TextComponent>
                  <TextComponent
                    className="text-xs"
                    style={{ color: card.isExpired ? BRAND.danger : "#71717A" }}
                  >
                    {card.isExpired ? `Expired ${cardExpiry(card)}` : `Expires ${cardExpiry(card)}`}
                  </TextComponent>
                </View>
                {busyCard === card.id ? (
                  <ActivityIndicator color={BRAND.blue} />
                ) : card.isDefault && !card.isExpired ? (
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: BRAND.blueTint }}>
                    <TextComponent className="text-[11px] font-bold" style={{ color: BRAND.blueDeep }}>
                      Pays first
                    </TextComponent>
                  </View>
                ) : (
                  <TextComponent className="text-lg font-extrabold text-zinc-400">⋮</TextComponent>
                )}
              </Pressable>
            ))
          ) : (
            <View className="py-4">
              <TextComponent className="text-sm font-bold text-zinc-950">No saved cards yet</TextComponent>
              <TextComponent className="mt-1 text-sm leading-5 text-zinc-500">
                Next time you pay for a ticket, switch on “Save this card for next time” and it will
                show up here, so paying again is one tap.
              </TextComponent>
            </View>
          )}
        </View>

        <View className="mt-4 flex-row gap-3 px-1">
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke={BRAND.success} strokeWidth={2} />
            <Path d="m9 12 2 2 4-4" fill="none" stroke={BRAND.success} strokeWidth={2} />
          </Svg>
          <TextComponent className="flex-1 text-xs leading-5 text-zinc-500">
            Your full card number is never stored on Turnupz. Flutterwave, our payment partner,
            keeps it safe.
          </TextComponent>
        </View>
      </ScrollView>
    </View>
  );
};

export default memo(WalletScreen);
