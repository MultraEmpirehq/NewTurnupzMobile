import React, { memo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View
} from "react-native";
import { WEB_APP_URL } from "@env";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import useUserStore from "@/shared/stores/user.store";
import { TLiveUserTicket, useTransferRecipient, useTransferTicket } from "./live-api";
import { parseRecipient } from "@/shared/utils/transfer-recipient";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";

const INK = "#0b1d2a";
const BLUE = "#00b2ff";

/**
 * Sends one ticket to someone by email, the same as on the web: it leaves your
 * tickets and waits under Sent until they claim it, or you take it back.
 */
const TransferTicketSheet = ({
  ticket,
  eventName,
  onClose,
  onSent
}: {
  ticket: TLiveUserTicket | null;
  eventName: string;
  onClose: () => void;
  onSent: () => void;
}) => {
  const [input, setInput] = useState("");
  const transfer = useTransferTicket();
  const myEmail = useUserStore((state) => state.user?.email)?.toLowerCase();

  useEffect(() => {
    if (ticket) setInput("");
  }, [ticket]);

  // One box: an email for anyone, or the @username of someone on Turnupz.
  const recipient = parseRecipient(input);
  const typedUsername = recipient?.kind === "username" ? recipient.username : undefined;
  const [lookupName, setLookupName] = useState<string | undefined>();
  useEffect(() => {
    const timer = setTimeout(() => setLookupName(typedUsername), 400);
    return () => clearTimeout(timer);
  }, [typedUsername]);
  const lookup = useTransferRecipient(lookupName);
  const isChecking =
    !!typedUsername && (lookup.isLoading || lookupName !== typedUsername);

  const problem = !input.trim()
    ? null
    : !recipient
      ? "Enter an email or a Turnupz username"
      : recipient.kind === "email" && recipient.email === myEmail
        ? "That's your own email"
        : recipient.kind === "username" && !isChecking && !lookup.data
          ? "No one on Turnupz has that username"
          : recipient.kind === "username" && lookup.data?.isYou
            ? "That's you"
            : null;
  const canSend =
    !!recipient && !problem && !isChecking && !transfer.isPending;

  const send = async () => {
    if (!ticket || !recipient || !canSend) return;
    const label =
      recipient.kind === "email"
        ? recipient.email
        : lookup.data?.name || `@${recipient.username}`;
    try {
      await transfer.mutateAsync({
        userTicketId: ticket.id,
        recipient,
        claimBaseUrl: WEB_APP_URL
      });
      onSuccess(`Sent to ${label}. It's under Sent until they claim it.`);
      onSent();
    } catch (error) {
      onError(
        constructErrorMessage(
          error as TApiErrorResponseType,
          "We couldn't send this ticket. Please try again."
        )
      );
    }
  };

  return (
    <Modal
      visible={!!ticket}
      transparent
      animationType="slide"
      onRequestClose={() => !transfer.isPending && onClose()}
    >
      <Pressable
        className="flex-1 bg-black/50"
        onPress={() => !transfer.isPending && onClose()}
        accessible={false}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="rounded-t-3xl bg-white px-5 pb-10 pt-5">
          <TextComponent className="text-lg font-bold" style={{ color: INK }}>
            Transfer this ticket
          </TextComponent>
          <TextComponent className="mt-1 text-sm text-zinc-500">
            {ticket?.ticket?.name ?? "Ticket"} for {eventName}. Send it to their
            email, or their @username if they&apos;re on Turnupz. Until they
            claim it, you can take it back.
          </TextComponent>
          <TextComponent className="mt-5 text-xs font-semibold text-zinc-600">
            Email or @username
          </TextComponent>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="friend@example.com or @username"
            placeholderTextColor="#a1a1aa"
            keyboardType="email-address"
            textContentType="none"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="send"
            onSubmitEditing={() => void send()}
            className="mt-2 h-12 rounded-xl border border-zinc-200 px-4 text-base"
            style={{ color: INK }}
          />
          {!!typedUsername && (isChecking || lookup.data) && (
            <View className="mt-3 flex-row items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2.5">
              {isChecking ? (
                <TextComponent className="text-sm text-zinc-500">
                  Looking for @{typedUsername}...
                </TextComponent>
              ) : (
                <>
                  <View className="size-9 items-center justify-center overflow-hidden rounded-full" style={{ backgroundColor: BLUE }}>
                    {lookup.data?.avatar ? (
                      <CustomImage
                        className="size-full"
                        imageClassName="size-full"
                        source={{ uri: lookup.data.avatar }}
                        contentFit="cover"
                      />
                    ) : (
                      <TextComponent className="text-xs font-bold text-white">
                        {(lookup.data?.name || lookup.data?.username || "?").slice(0, 2).toUpperCase()}
                      </TextComponent>
                    )}
                  </View>
                  <View className="flex-1">
                    <TextComponent numberOfLines={1} className="font-semibold" style={{ color: INK }}>
                      {lookup.data?.name || `@${lookup.data?.username}`}
                    </TextComponent>
                    <TextComponent className="text-xs text-zinc-500">
                      @{lookup.data?.username} on Turnupz
                    </TextComponent>
                  </View>
                </>
              )}
            </View>
          )}
          {!!problem && (
            <TextComponent className="mt-2 text-xs text-red-600">{problem}</TextComponent>
          )}
          <Pressable
            onPress={() => void send()}
            disabled={!canSend}
            accessibilityRole="button"
            className="mt-5 h-12 items-center justify-center rounded-full"
            style={{ backgroundColor: canSend ? BLUE : "#d4d4d8" }}
          >
            {transfer.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <TextComponent className="font-bold text-white">Transfer ticket</TextComponent>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default memo(TransferTicketSheet);
