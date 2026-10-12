import React, { memo, useState } from "react";
import { Pressable, Share, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { WEB_APP_URL } from "@env";
import { useQueryClient } from "@tanstack/react-query";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { applyInviteCode, useReferralMe } from "./profile-api";

/** The link a friend opens to sign up with this code. */
const inviteLink = (code: string) =>
  `${(WEB_APP_URL ?? "").replace(/\/$/, "")}/invite/${encodeURIComponent(code)}`;

/**
 * Their invite code (their username) to copy or share, how many friends it has
 * brought in and what it's earned, and, while they're new enough, a box to add
 * the code of whoever invited them.
 */
const InviteFriendsCard = () => {
  const { data } = useReferralMe();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);

  if (!data?.code) return null;
  const myCode = data.code;
  const link = inviteLink(myCode);

  const copy = async (value: string, what: string) => {
    await Clipboard.setStringAsync(value);
    onSuccess(`${what} copied`);
  };
  const share = () =>
    Share.share({
      message: `Join me on Turnupz and find what's on. Use my code ${myCode} when you sign up: ${link}`
    }).catch(() => undefined);

  const add = async () => {
    if (!code.trim() || adding) return;
    setAdding(true);
    try {
      const result = await applyInviteCode(code);
      onSuccess(`Added. ${result?.invitedBy ?? "Your friend"} invited you.`);
      setCode("");
      await queryClient.invalidateQueries({ queryKey: ["referrals", "me"] });
    } catch (error) {
      onError(
        constructErrorMessage(
          error as TApiErrorResponseType,
          "Couldn't add that code"
        )
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <View className="mx-4 mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
      <TextComponent className="text-base font-bold text-black">
        Invite friends
      </TextComponent>
      <TextComponent className="mt-1 text-sm text-zinc-500">
        When a friend signs up with your code and buys their first ticket, you
        both get Turnupz Credit to spend on tickets.
      </TextComponent>

      <View className="mt-3 flex-row items-center justify-between rounded-xl bg-zinc-100 px-3 py-3">
        <View className="flex-1">
          <TextComponent className="text-xs uppercase tracking-wider text-zinc-500">
            Your code
          </TextComponent>
          <TextComponent className="text-xl font-bold text-black">
            {myCode}
          </TextComponent>
        </View>
        <Pressable
          onPress={() => copy(myCode, "Code")}
          accessibilityRole="button"
          accessibilityLabel="Copy your code"
          className="rounded-lg bg-white px-3 py-2"
        >
          <TextComponent className="text-sm font-semibold text-black">
            Copy
          </TextComponent>
        </Pressable>
      </View>

      <View className="mt-3 flex-row gap-2">
        <Pressable
          onPress={() => copy(link, "Link")}
          accessibilityRole="button"
          className="flex-1 items-center rounded-xl border border-zinc-300 py-3"
        >
          <TextComponent className="text-sm font-semibold text-black">
            Copy link
          </TextComponent>
        </Pressable>
        <Pressable
          onPress={share}
          accessibilityRole="button"
          className="flex-1 items-center rounded-xl py-3"
          style={{ backgroundColor: BRAND.blueDeep }}
        >
          <TextComponent className="text-sm font-semibold text-white">
            Share
          </TextComponent>
        </Pressable>
      </View>

      <View className="mt-3 flex-row">
        {[
          { label: "Joined", value: data.counts.invited },
          { label: "Pending", value: data.counts.pending },
          { label: "Rewarded", value: data.counts.rewarded }
        ].map((item) => (
          <View key={item.label} className="flex-1 items-center">
            <TextComponent className="text-lg font-bold text-black">
              {item.value}
            </TextComponent>
            <TextComponent className="text-xs text-zinc-500">
              {item.label}
            </TextComponent>
          </View>
        ))}
      </View>
      {data.earnings.map((row) => (
        <TextComponent key={row.currency} className="mt-2 text-sm text-zinc-700">
          Earned {row.earned.formatted.withCurrency}
          {row.pending.amount > 0
            ? ` · ${row.pending.formatted.withCurrency} on the way`
            : ""}
        </TextComponent>
      ))}

      {!!data.referredBy && (
        <TextComponent className="mt-3 text-sm text-zinc-500">
          You were invited by {data.referredBy}.
        </TextComponent>
      )}

      {data.canAddCode && (
        <View className="mt-4 border-t border-zinc-200 pt-4">
          <TextComponent className="text-sm font-semibold text-black">
            Got an invite code?
          </TextComponent>
          <View className="mt-2 flex-row items-center gap-2">
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="A friend's username or a promo code"
              placeholderTextColor="#a1a1aa"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={add}
              editable={!adding}
              className="flex-1 rounded-xl border border-zinc-300 px-3 py-3 text-black"
            />
            <Pressable
              onPress={add}
              disabled={!code.trim() || adding}
              accessibilityRole="button"
              className="rounded-xl px-4 py-3"
              style={{
                backgroundColor: BRAND.black,
                opacity: !code.trim() || adding ? 0.4 : 1
              }}
            >
              <TextComponent className="text-sm font-semibold text-white">
                {adding ? "Adding…" : "Add"}
              </TextComponent>
            </Pressable>
          </View>
          {!!data.addCodeUntil && (
            <TextComponent className="mt-1 text-xs text-zinc-500">
              You can add one until{" "}
              {new Date(data.addCodeUntil).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short"
              })}
              , before your first purchase.
            </TextComponent>
          )}
        </View>
      )}
    </View>
  );
};

export default memo(InviteFriendsCard);
