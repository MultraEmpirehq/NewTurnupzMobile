import React, { memo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, Share, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TextComponent from "@/shared/components/text/text.component";
import { BackHeader } from "@/screens/live/explore-details";
import { TICKET_LIST_BACKGROUND } from "@/screens/live/event-ticket-card";
import { constructErrorMessage } from "@/api/functions";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { deleteData, getData, postData } from "@/api";
import { Field, PrimaryButton } from "./profile-settings.screen";

type TStatus = { enabled: boolean; enabledAt: string | null; backupCodesLeft: number; trustedDevices: number };

const KEY = ["two-factor"];
const errorText = (error: unknown, fallback: string) =>
  constructErrorMessage(error as TApiErrorResponseType, fallback);

const Card = ({ children }: { children: React.ReactNode }) => (
  <View className="mx-4 mt-5 gap-3 rounded-2xl bg-white p-4">{children}</View>
);

const LinkButton = ({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) => (
  <Pressable onPress={onPress} accessibilityRole="button" className="py-2">
    <TextComponent className="font-semibold" style={{ color: danger ? "#dc2626" : "#00b2ff" }}>
      {label}
    </TextComponent>
  </Pressable>
);

/**
 * Two-factor sign-in on the phone. A phone can't scan its own screen, so
 * setup opens the authenticator app straight from a link (or the key is
 * copied in), then one code turns it on and the backup codes show once.
 */
const TwoFactorSettings = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: KEY,
    queryFn: async () => (await getData<TStatus>("/account/two-factor")).data?.data ?? null
  });
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [action, setAction] = useState<"disable" | "codes" | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  const run = async (work: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      onError(errorText(error, fallback));
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      const { data } = await postData<undefined, { secret: string; otpauthUrl: string }>("/account/two-factor/setup");
      setSetup(data?.data ?? null);
      setCode("");
    }, t("twoFactor.failed"));

  const enable = () =>
    run(async () => {
      const { data } = await postData<{ code: string }, { backupCodes: string[] }>("/account/two-factor/enable", { code });
      setSetup(null);
      setCode("");
      setCodes(data?.data?.backupCodes ?? null);
      onSuccess(t("twoFactor.turnedOn"));
      await refresh();
    }, t("twoFactor.wrongCode"));

  const confirm = () =>
    run(async () => {
      if (action === "disable") {
        await postData("/account/two-factor/disable", { code });
        onSuccess(t("twoFactor.turnedOff"));
      } else {
        const { data } = await postData<{ code: string }, { backupCodes: string[] }>("/account/two-factor/backup-codes", { code });
        setCodes(data?.data?.backupCodes ?? null);
      }
      setAction(null);
      setCode("");
      await refresh();
    }, t("twoFactor.wrongCode"));

  const codesText = codes ? `${t("twoFactor.codesFileTitle")}\n\n${codes.join("\n")}\n` : "";
  const data = status.data;

  return (
    <View className="flex-1" style={{ backgroundColor: TICKET_LIST_BACKGROUND }}>
      <BackHeader title={t("twoFactor.title")} onBack={onBack} />
      <Card>
        <TextComponent className="text-sm text-zinc-600">{t("twoFactor.intro")}</TextComponent>
      </Card>

      {status.isLoading ? (
        <ActivityIndicator className="mt-8" color="#00b2ff" />
      ) : codes ? (
        <Card>
          <TextComponent className="text-base font-bold text-[#0b1d2a]">{t("twoFactor.saveCodes")}</TextComponent>
          <TextComponent className="text-sm text-zinc-600">{t("twoFactor.saveCodesBody")}</TextComponent>
          <View className="flex-row flex-wrap gap-2 rounded-xl bg-zinc-100 p-3">
            {codes.map((item) => (
              <TextComponent key={item} className="w-[45%] font-mono text-sm text-[#0b1d2a]">
                {item}
              </TextComponent>
            ))}
          </View>
          <View className="flex-row gap-4">
            <LinkButton
              label={t("twoFactor.copy")}
              onPress={() => {
                void Clipboard.setStringAsync(codesText);
                onSuccess(t("twoFactor.copied"));
              }}
            />
            <LinkButton label={t("twoFactor.share")} onPress={() => void Share.share({ message: codesText })} />
          </View>
          <PrimaryButton label={t("twoFactor.savedThem")} onPress={() => setCodes(null)} />
        </Card>
      ) : setup ? (
        <Card>
          <TextComponent className="text-base font-bold text-[#0b1d2a]">{t("twoFactor.setupTitle")}</TextComponent>
          <TextComponent className="text-sm text-zinc-600">{t("twoFactor.setupBody")}</TextComponent>
          <PrimaryButton
            label={t("twoFactor.openApp")}
            onPress={() =>
              void Linking.openURL(setup.otpauthUrl).catch(() =>
                Alert.alert(t("twoFactor.noApp"), t("twoFactor.noAppBody"))
              )
            }
          />
          <View className="rounded-xl bg-zinc-100 p-3">
            <TextComponent className="text-xs text-zinc-500">{t("twoFactor.key")}</TextComponent>
            <TextComponent selectable className="font-mono text-sm text-[#0b1d2a]">
              {setup.secret.match(/.{1,4}/g)?.join(" ")}
            </TextComponent>
          </View>
          <LinkButton
            label={t("twoFactor.copyKey")}
            onPress={() => {
              void Clipboard.setStringAsync(setup.secret);
              onSuccess(t("twoFactor.copied"));
            }}
          />
          <Field
            label={t("twoFactor.codeLabel")}
            value={code}
            onChange={(value: string) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            keyboard="number-pad"
            autoCapitalize="none"
          />
          <PrimaryButton label={t("twoFactor.turnOn")} onPress={() => void enable()} busy={busy} disabled={code.length !== 6} />
          <LinkButton label={t("common.cancel")} onPress={() => setSetup(null)} />
        </Card>
      ) : data?.enabled ? (
        <Card>
          <TextComponent className="text-base font-bold text-[#0b1d2a]">{t("twoFactor.on")}</TextComponent>
          <TextComponent className="text-sm text-zinc-600">
            {t("twoFactor.backupLeft", { count: data.backupCodesLeft })}
          </TextComponent>
          {action ? (
            <>
              <Field
                label={action === "disable" ? t("twoFactor.codeToTurnOff") : t("twoFactor.codeForNewCodes")}
                value={code}
                onChange={(value: string) => setCode(value.slice(0, 20))}
                autoCapitalize="none"
              />
              <PrimaryButton
                label={action === "disable" ? t("twoFactor.turnOff") : t("twoFactor.newCodes")}
                onPress={() => void confirm()}
                busy={busy}
                disabled={code.trim().length < 6}
              />
              <LinkButton label={t("common.cancel")} onPress={() => setAction(null)} />
            </>
          ) : (
            <>
              <LinkButton label={t("twoFactor.newCodes")} onPress={() => { setAction("codes"); setCode(""); }} />
              {data.trustedDevices > 0 && (
                <LinkButton
                  label={t("twoFactor.forgetDevices")}
                  onPress={() =>
                    void run(async () => {
                      await deleteData("/account/two-factor/trusted-devices");
                      onSuccess(t("twoFactor.forgotDevices"));
                      await refresh();
                    }, t("twoFactor.failed"))
                  }
                />
              )}
              <LinkButton label={t("twoFactor.turnOff")} danger onPress={() => { setAction("disable"); setCode(""); }} />
            </>
          )}
        </Card>
      ) : (
        <Card>
          <TextComponent className="text-base font-bold text-[#0b1d2a]">{t("twoFactor.off")}</TextComponent>
          <PrimaryButton label={t("twoFactor.turnOn")} onPress={() => void start()} busy={busy} />
        </Card>
      )}
    </View>
  );
};

export default memo(TwoFactorSettings);
