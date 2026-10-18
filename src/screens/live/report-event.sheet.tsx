import OverlayToast from "@/shared/components/status/toast/overlay-toast";
import React, { memo, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { REPORT_REASONS, reportEvent } from "./live-api";

/** Flags an event to the moderators. The organiser never sees who sent it. */
const ReportEventSheet = ({
  visible,
  eventId,
  eventName,
  onClose
}: {
  visible: boolean;
  eventId: string;
  eventName: string;
  onClose: () => void;
}) => {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails("");
    }
  }, [visible]);

  const needsDetails = reason === "other";
  const canSend = !!reason && (!needsDetails || !!details.trim()) && !sending;

  const send = async () => {
    if (!canSend || !reason) return;
    setSending(true);
    try {
      await reportEvent(eventId, {
        reason,
        details: details.trim() || undefined
      });
      onSuccess("Thanks, we've got your report. A moderator will look into it.");
      onClose();
    } catch (error) {
      onError(
        constructErrorMessage(
          error as TApiErrorResponseType,
          "We couldn't send your report. Please try again."
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={() => !sending && onClose()} />
      <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
        <TextComponent className="text-lg font-bold text-zinc-950">
          Report "{eventName}"
        </TextComponent>
        <TextComponent className="mt-1 text-sm text-zinc-500">
          Tell us what's wrong. The organiser won't see who sent it.
        </TextComponent>
        <ScrollView className="mt-4" keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            {REPORT_REASONS.map((option) => {
              const isSelected = reason === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => setReason(option.value)}
                  className={
                    isSelected
                      ? "rounded-xl border border-red-300 bg-red-50 px-4 py-3"
                      : "rounded-xl border border-zinc-200 px-4 py-3"
                  }
                >
                  <TextComponent className="text-sm font-semibold text-zinc-950">
                    {option.label}
                  </TextComponent>
                </Pressable>
              );
            })}
          </View>
          <TextComponent className="mt-4 text-xs font-semibold text-zinc-600">
            {needsDetails ? "Details" : "Details (optional)"}
          </TextComponent>
          <TextInput
            value={details}
            onChangeText={setDetails}
            maxLength={1000}
            multiline
            placeholder="Anything that helps us check, like what you were told or charged."
            placeholderTextColor="#a1a1aa"
            className="mt-2 min-h-20 rounded-xl border border-zinc-200 p-3 text-sm text-zinc-950"
            textAlignVertical="top"
          />
        </ScrollView>
        <View className="mt-5 flex-row gap-3">
          <Pressable
            onPress={onClose}
            disabled={sending}
            className="h-12 flex-1 items-center justify-center rounded-lg border border-zinc-200"
          >
            <TextComponent className="font-bold text-zinc-700">Cancel</TextComponent>
          </Pressable>
          <Pressable
            onPress={() => void send()}
            disabled={!canSend}
            className={
              canSend
                ? "h-12 flex-1 items-center justify-center rounded-lg bg-red-600"
                : "h-12 flex-1 items-center justify-center rounded-lg bg-red-300"
            }
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <TextComponent className="font-bold text-white">Send report</TextComponent>
            )}
          </Pressable>
        </View>
      </View>
      <OverlayToast />
    </Modal>
  );
};

export default memo(ReportEventSheet);
