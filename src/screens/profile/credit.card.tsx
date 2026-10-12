import React, { memo, useState } from "react";
import { Pressable, View } from "react-native";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";
import {
  TCreditGrant,
  formatPrice,
  useCreditBalance,
  useCreditHistory
} from "@/screens/live/live-api";

const STATE_LABEL: Record<TCreditGrant["state"], string> = {
  PENDING: "On the way",
  AVAILABLE: "Available",
  SPENT: "Spent",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled"
};

const day = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : "";

/**
 * Turnupz Credit: what can be spent on tickets now, what's on the way (invite
 * rewards wait a couple of days after the event), when it next expires, and
 * where each amount came from.
 */
const CreditCard = () => {
  const { data: balance } = useCreditBalance();
  const [open, setOpen] = useState(false);
  const { data: history } = useCreditHistory(open);
  if (!balance?.length) return null;

  return (
    <View className="mx-4 mt-4 rounded-2xl p-4" style={{ backgroundColor: BRAND.ink }}>
      <TextComponent className="text-xs uppercase tracking-wider text-white/60">
        Turnupz Credit
      </TextComponent>
      {balance.map((row) => (
        <View key={row.currency} className="mt-1">
          <TextComponent className="text-2xl font-bold text-white">
            {row.available.formatted?.withCurrency ?? formatPrice(row.available)}
          </TextComponent>
          {row.pending.amount > 0 && (
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
      ))}
      <TextComponent className="mt-2 text-xs text-white/60">
        Spend it on tickets at checkout.
      </TextComponent>

      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        className="mt-3 self-start rounded-lg bg-white/10 px-3 py-2"
      >
        <TextComponent className="text-sm font-semibold text-white">
          {open ? "Hide history" : "See history"}
        </TextComponent>
      </Pressable>

      {open && (
        <View className="mt-3 gap-3">
          {(history ?? []).map((grant) => (
            <View
              key={grant.id}
              className="flex-row items-start justify-between gap-3 border-t border-white/10 pt-3"
            >
              <View className="flex-1">
                <TextComponent className="text-sm text-white">
                  {grant.description}
                </TextComponent>
                <TextComponent className="text-xs text-white/50">
                  {day(grant.createdAt)} · {STATE_LABEL[grant.state]}
                  {grant.state === "PENDING" && grant.releaseAt
                    ? ` until ${day(grant.releaseAt)}`
                    : ""}
                </TextComponent>
              </View>
              <TextComponent className="text-sm font-bold text-white">
                +{formatPrice(grant.amount)}
              </TextComponent>
            </View>
          ))}
          {history && !history.length && (
            <TextComponent className="text-sm text-white/60">
              Nothing yet.
            </TextComponent>
          )}
        </View>
      )}
    </View>
  );
};

export default memo(CreditCard);
