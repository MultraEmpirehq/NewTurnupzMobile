import React, { memo, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import SafeModal from "@/shared/components/modals/safe-modal";
import ModalKeyboardAvoider from "@/shared/components/modals/modal-keyboard-avoider";
import TextComponent from "@/shared/components/text/text.component";
import { onError } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { formatEventClock, formatEventDay } from "@/shared/utils/event-time";
import LiveTicketQr from "./live-ticket-qr";
import { useNamePass, useOpenPass } from "./live-api";

const INK = "#0b1d2a";

/** One of my passes, opened for the door: the live code, or my name first. */
const PassSheet = ({
  token,
  onClose
}: {
  token: string | null;
  onClose: () => void;
}) => {
  const { data: pass, isLoading, error } = useOpenPass(token);
  const naming = useNamePass(token);
  const [name, setName] = useState("");

  return (
    <SafeModal
      visible={!!token}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50"
        onPress={onClose}
        accessible={false}
      />
      <ModalKeyboardAvoider>
        <View className="overflow-hidden rounded-t-3xl bg-white pb-10">
          {isLoading && (
            <ActivityIndicator className="my-16" color={BRAND.blueDeep} />
          )}
          {!!error && (
            <TextComponent
              className="p-6 text-center text-base font-semibold"
              style={{ color: INK }}
            >
              {constructErrorMessage(
                error as TApiErrorResponseType,
                "This pass doesn't work."
              )}
            </TextComponent>
          )}
          {pass && (
            <>
              <LinearGradient
                colors={[BRAND.blueDeep, BRAND.blue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 20 }}
              >
                <TextComponent
                  className="text-xs font-bold uppercase text-white"
                  style={{ letterSpacing: 2 }}
                >
                  {pass.passName} pass
                </TextComponent>
                <TextComponent className="mt-1 text-xl font-extrabold text-white">
                  {pass.event.name}
                </TextComponent>
                <TextComponent className="mt-2 text-sm text-white">
                  {formatEventDay(pass.event.date, pass.event.timezone, {
                    withYear: false
                  })}{" "}
                  · {formatEventClock(pass.event.date, pass.event.timezone)}
                  {pass.event.venue ? ` · ${pass.event.venue}` : ""}
                </TextComponent>
              </LinearGradient>
              {pass.holderName ? (
                <View className="items-center gap-3 px-5 pt-5">
                  <LiveTicketQr
                    ticket={{
                      id: token!,
                      code: pass.code,
                      liveCode: pass.liveCode
                    }}
                    size={220}
                    usable={!pass.checkedInAt}
                    holderName={pass.holderName}
                  />
                  <TextComponent className="text-sm text-zinc-500">
                    {pass.checkedInAt
                      ? "Checked in"
                      : `Show this at the door. It's for ${pass.holderName} only.`}
                  </TextComponent>
                </View>
              ) : (
                <View className="gap-3 px-5 pt-5">
                  <TextComponent
                    className="text-lg font-bold"
                    style={{ color: INK }}
                  >
                    What's your name?
                  </TextComponent>
                  <TextComponent className="text-sm text-zinc-500">
                    The door checks it, so use the name on your ID.
                  </TextComponent>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    maxLength={80}
                    placeholder="Your name"
                    autoCapitalize="words"
                    className="h-12 rounded-xl border border-zinc-200 px-3 text-base"
                    style={{ color: INK }}
                  />
                  <Pressable
                    disabled={name.trim().length < 2 || naming.isPending}
                    onPress={() =>
                      naming.mutate(name.trim(), {
                        onError: (err) =>
                          onError(
                            constructErrorMessage(
                              err as TApiErrorResponseType,
                              "Couldn't save your name."
                            )
                          )
                      })
                    }
                    className="h-12 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: BRAND.blueDeep,
                      opacity: name.trim().length < 2 ? 0.5 : 1
                    }}
                  >
                    <TextComponent className="text-base font-bold text-white">
                      Show my pass
                    </TextComponent>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </ModalKeyboardAvoider>
    </SafeModal>
  );
};

export default memo(PassSheet);
