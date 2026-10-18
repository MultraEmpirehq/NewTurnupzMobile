import React, { memo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import TextComponent from "@/shared/components/text/text.component";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { formatEventDay } from "@/shared/utils/event-time";
import {
  TReceivedTransfer,
  TSentTransfer,
  recipientLabel,
  useAcceptTransfer,
  useCancelTransfer,
  useDeclineTransfer
} from "./live-api";

const INK = "#0b1d2a";

const STATUS: Record<
  TSentTransfer["status"],
  { label: string; bg: string; fg: string }
> = {
  PENDING: { label: "Waiting to be claimed", bg: "#e5f7ff", fg: "#006b99" },
  CLAIMED: { label: "Claimed", bg: "#e8f8ef", fg: "#15803d" },
  CANCELLED: { label: "Cancelled", bg: "#f1f2f5", fg: "#52525b" }
};

const ago = (value: string) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};

/** One ticket you've sent, with Take it back while it's still waiting. */
export const SentTransferRow = memo(function SentTransferRow({
  transfer
}: {
  transfer: TSentTransfer;
}) {
  const cancel = useCancelTransfer();
  const [busy, setBusy] = useState(false);
  const event = transfer.userTicket?.ticket?.event;
  const status = STATUS[transfer.status] ?? STATUS.PENDING;
  const who = recipientLabel(transfer);

  const takeBack = () =>
    Alert.alert(
      "Take this ticket back?",
      `${who} won't be able to claim it, and it goes back into your tickets.`,
      [
        { text: "Keep it sent", style: "cancel" },
        {
          text: "Take it back",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await cancel.mutateAsync(transfer.id);
              onSuccess("It's back in your tickets.");
            } catch (error) {
              onError(
                constructErrorMessage(
                  error as TApiErrorResponseType,
                  "Couldn't take the ticket back."
                )
              );
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );

  return (
    <View className="mx-4 mb-3 flex-row gap-3 rounded-2xl border border-black/5 bg-white p-3">
      <View className="size-14 overflow-hidden rounded-xl bg-zinc-100">
        {!!event?.image && (
          <CustomImage
            className="size-full"
            imageClassName="size-full"
            source={{ uri: event.image }}
            contentFit="cover"
          />
        )}
      </View>
      <View className="flex-1 gap-1">
        <TextComponent
          numberOfLines={1}
          className="font-bold"
          style={{ color: INK }}
        >
          {event?.name ?? "Event"}
        </TextComponent>
        <TextComponent numberOfLines={1} className="text-xs text-zinc-600">
          {transfer.userTicket?.ticket?.name ?? "Ticket"} to {who}
        </TextComponent>
        <TextComponent className="text-[11px] text-zinc-500">
          {transfer.status === "CLAIMED" && transfer.claimedAt
            ? `Claimed ${ago(transfer.claimedAt)}`
            : `Sent ${ago(transfer.createdAt)}`}
          {event?.date
            ? ` · ${formatEventDay(event.date, event.timezone, { withYear: false })}`
            : ""}
        </TextComponent>
        <View className="mt-1 flex-row items-center justify-between">
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: status.bg }}
          >
            <TextComponent
              className="text-[10px] font-bold"
              style={{ color: status.fg }}
            >
              {status.label}
            </TextComponent>
          </View>
          {transfer.status === "PENDING" &&
            (busy ? (
              <ActivityIndicator size="small" />
            ) : (
              <Pressable
                onPress={takeBack}
                hitSlop={8}
                accessibilityRole="button"
              >
                <TextComponent className="text-xs font-bold text-red-600">
                  Take it back
                </TextComponent>
              </Pressable>
            ))}
        </View>
      </View>
    </View>
  );
});

/** A ticket someone sent you, to accept (into your tickets) or decline (back to them). */
export const ReceivedTransferRow = memo(function ReceivedTransferRow({
  transfer,
  onAccepted
}: {
  transfer: TReceivedTransfer;
  onAccepted: () => void;
}) {
  const accept = useAcceptTransfer();
  const decline = useDeclineTransfer();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const event = transfer.userTicket?.ticket?.event;
  const sender =
    transfer.senderUsername && !transfer.senderName.startsWith("@")
      ? `${transfer.senderName} (@${transfer.senderUsername})`
      : transfer.senderName;

  const run = async (kind: "accept" | "decline") => {
    setBusy(kind);
    try {
      if (kind === "accept") {
        await accept.mutateAsync(transfer.id);
        onSuccess("It's yours. It's in your upcoming tickets.");
        onAccepted();
      } else {
        await decline.mutateAsync(transfer.id);
        onSuccess(`Declined. It's gone back to ${transfer.senderName}.`);
      }
    } catch (error) {
      onError(
        constructErrorMessage(
          error as TApiErrorResponseType,
          kind === "accept"
            ? "Couldn't accept this ticket."
            : "Couldn't decline this ticket."
        )
      );
    } finally {
      setBusy(null);
    }
  };

  const confirmDecline = () =>
    Alert.alert(
      "Decline this ticket?",
      `It goes back to ${transfer.senderName}.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => void run("decline")
        }
      ]
    );

  return (
    <View className="mx-4 mb-3 gap-3 rounded-2xl border border-sky-100 bg-white p-3">
      <View className="flex-row gap-3">
        <View className="size-14 overflow-hidden rounded-xl bg-zinc-100">
          {!!event?.image && (
            <CustomImage
              className="size-full"
              imageClassName="size-full"
              source={{ uri: event.image }}
              contentFit="cover"
            />
          )}
        </View>
        <View className="flex-1 gap-1">
          <TextComponent
            numberOfLines={1}
            className="font-bold"
            style={{ color: INK }}
          >
            {event?.name ?? "Event"}
          </TextComponent>
          <TextComponent numberOfLines={2} className="text-xs text-zinc-600">
            {sender} sent you {transfer.userTicket?.ticket?.name ?? "a ticket"}
          </TextComponent>
          <TextComponent className="text-[11px] text-zinc-500">
            Sent {ago(transfer.createdAt)}
            {event?.date
              ? ` · ${formatEventDay(event.date, event.timezone, { withYear: false })}`
              : ""}
          </TextComponent>
        </View>
      </View>
      <View className="flex-row gap-2">
        <Pressable
          onPress={confirmDecline}
          disabled={!!busy}
          accessibilityRole="button"
          className="h-10 flex-1 items-center justify-center rounded-full border border-zinc-200"
        >
          {busy === "decline" ? (
            <ActivityIndicator size="small" />
          ) : (
            <TextComponent className="font-semibold text-zinc-700">
              Decline
            </TextComponent>
          )}
        </Pressable>
        <Pressable
          onPress={() => void run("accept")}
          disabled={!!busy}
          accessibilityRole="button"
          className="h-10 flex-1 items-center justify-center rounded-full"
          style={{ backgroundColor: "#00b2ff" }}
        >
          {busy === "accept" ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <TextComponent className="font-bold text-white">
              Accept
            </TextComponent>
          )}
        </Pressable>
      </View>
    </View>
  );
});
