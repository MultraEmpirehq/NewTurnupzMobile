import { formatZero, openSupportChat, useCreditBalance } from "@/screens/live/live-api";
import OrdersPage from "./orders.screen";
import { maskAmount, useBalancePrivacyStore } from "@/shared/stores/balance-privacy.store";
import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import React, { memo, useState } from "react";
import { BRAND } from "@/shared/utils/brand-colors";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View
} from "react-native";
import Constants from "expo-constants";
import { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Path, Svg } from "react-native-svg";
import { WEB_APP_URL } from "@env";
import { useQueryClient } from "@tanstack/react-query";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { deleteData } from "@/api";
import useUser from "@/shared/hooks/use-user.hook";
import {
  TAccessibilityOptions,
  useAccessibilityStore
} from "@/shared/stores/accessibility.store";
import {
  LANGUAGES,
  TLanguageChoice,
  phoneLanguage,
  useLanguageStore
} from "@/shared/stores/language.store";
import { PASSWORD_REGEX } from "@/shared/utils/regex";
import { ProfilePhoto } from "@/screens/profile/profile-photo";
import { usePeopleNav } from "@/screens/people/people-nav";
import {
  TMessagePolicy,
  useBlockPerson,
  useBlocks,
  useFollowRequests,
  usePrivacy,
  useUpdatePrivacy
} from "@/screens/people/people-api";
import { BackHeader, Loading } from "@/screens/live/explore-details";
import { TICKET_LIST_BACKGROUND } from "@/screens/live/event-ticket-card";
import {
  TNotificationPreferences,
  TSession,
  changePassword,
  logOut,
  signOutDevice,
  signOutOtherDevices,
  updateNotificationPreferences,
  useFaqs,
  useNotificationPreferences,
  useSessions,
} from "./profile-api";

/**
 * Settings, and the pages behind each row. Every switch and form here talks
 * to the api, except accessibility and language, which are how this phone
 * draws the app. Privacy covers a private profile, who can message you and
 * the people you've blocked.
 */

const INK = "#0b1d2a";
const BLUE = "#00b2ff";
// Red is kept only for errors and destructive actions.
const DANGER = BRAND.danger;

type TPage =
  | "menu"
  | "password"
  | "notifications"
  | "devices"
  | "accessibility"
  | "privacy"
  | "blocked"
  | "language"
  | "help"
  | "orders"
  | "delete";

const errorText = (error: unknown, fallback: string) =>
  constructErrorMessage(error as TApiErrorResponseType, fallback);

/* ------------------------------------------------------------- building blocks */

const Chevron = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24">
    <Path d="M9 5l7 7-7 7" fill="none" stroke="#a1a1aa" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const Section = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <View className="mt-5 px-4">
    {!!title && (
      <TextComponent className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
        {title}
      </TextComponent>
    )}
    <View className="overflow-hidden rounded-2xl bg-white">{children}</View>
  </View>
);

const Row = ({
  label,
  hint,
  value,
  tone,
  onPress,
  last
}: {
  label: string;
  hint?: string;
  value?: string;
  tone?: "danger";
  onPress: () => void;
  last?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    className={last ? "flex-row items-center gap-3 px-4 py-4" : "flex-row items-center gap-3 border-b border-black/5 px-4 py-4"}
    style={({ pressed }) => ({ backgroundColor: pressed ? "#f4f5f8" : "transparent" })}
  >
    <View className="flex-1">
      <TextComponent className="text-base font-semibold" style={{ color: tone === "danger" ? DANGER : INK }}>
        {label}
      </TextComponent>
      {!!hint && <TextComponent className="mt-0.5 text-xs text-zinc-500">{hint}</TextComponent>}
    </View>
    {!!value && <TextComponent className="text-sm text-zinc-500">{value}</TextComponent>}
    {tone !== "danger" && <Chevron />}
  </Pressable>
);

const Toggle = ({
  label,
  hint,
  value,
  onChange,
  disabled,
  last
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) => (
  <View className={last ? "flex-row items-center gap-3 px-4 py-3.5" : "flex-row items-center gap-3 border-b border-black/5 px-4 py-3.5"}>
    <View className="flex-1">
      <TextComponent className="text-base font-semibold" style={{ color: disabled ? "#a1a1aa" : INK }}>
        {label}
      </TextComponent>
      {!!hint && <TextComponent className="mt-0.5 text-xs text-zinc-500">{hint}</TextComponent>}
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ true: BLUE, false: "#e4e4e7" }}
      thumbColor="#ffffff"
      accessibilityLabel={label}
    />
  </View>
);

export const Field = ({
  label,
  value,
  onChange,
  note,
  error,
  multiline,
  maxLength,
  secure,
  keyboard,
  autoCapitalize = "sentences",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  note?: string;
  error?: string;
  multiline?: boolean;
  maxLength?: number;
  secure?: boolean;
  keyboard?: "default" | "email-address" | "phone-pad" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  placeholder?: string;
}) => (
  <View className="gap-1.5">
    <View className="flex-row items-end justify-between px-1">
      <TextComponent className="text-sm font-semibold text-zinc-700">{label}</TextComponent>
      {!!maxLength && (
        <TextComponent className="text-xs text-zinc-400">
          {value.length}/{maxLength}
        </TextComponent>
      )}
    </View>
    <TextInput
      value={value}
      onChangeText={onChange}
      multiline={multiline}
      maxLength={maxLength}
      secureTextEntry={secure}
      keyboardType={keyboard}
      autoCapitalize={autoCapitalize}
      autoCorrect={!secure && keyboard !== "url"}
      placeholder={placeholder}
      placeholderTextColor="#a1a1aa"
      className={multiline ? "min-h-24 rounded-lg bg-white px-4 py-3 text-base text-zinc-950" : "h-12 rounded-lg bg-white px-4 text-base text-zinc-950"}
      style={{
        fontFamily: "PlusJakartaSans-Regular",
        borderWidth: 1,
        borderColor: error ? DANGER : "rgba(0,0,0,0.12)",
        textAlignVertical: multiline ? "top" : "center"
      }}
    />
    {!!(error || note) && (
      <TextComponent className="px-1 text-xs" style={{ color: error ? DANGER : "#71717a" }}>
        {error || note}
      </TextComponent>
    )}
  </View>
);

export const PrimaryButton = ({
  label,
  onPress,
  busy,
  disabled
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || busy}
    accessibilityRole="button"
    className="h-12 items-center justify-center rounded-full"
    style={{ backgroundColor: disabled ? "#d4d4d8" : BLUE }}
  >
    {busy ? <ActivityIndicator color="#ffffff" /> : <TextComponent className="text-base font-bold text-white">{label}</TextComponent>}
  </Pressable>
);

const Page = ({
  title,
  onBack,
  children
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) => (
  <View className="flex-1" style={{ backgroundColor: TICKET_LIST_BACKGROUND }}>
    <BackHeader title={title} onBack={onBack} />
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
);

/* ---------------------------------------------------------------------- password */

const PasswordPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const strong = PASSWORD_REGEX.test(next);
  const matches = !!next && next === confirm;
  const canSave = !!current && strong && matches;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await changePassword({ oldPassword: current, password: next });
      onSuccess(t("password.changed"));
      onBack();
    } catch (error) {
      onError(errorText(error, t("password.failed")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title={t("settings.changePassword")} onBack={onBack}>
      <View className="gap-4 px-4 pt-6">
        <Field label={t("password.current")} value={current} onChange={setCurrent} secure autoCapitalize="none" />
        <Field
          label={t("password.new")}
          value={next}
          onChange={setNext}
          secure
          autoCapitalize="none"
          error={next && !strong ? t("password.rulesError") : undefined}
          note={!next ? t("password.rules") : strong ? t("password.strong") : undefined}
        />
        <Field
          label={t("password.confirm")}
          value={confirm}
          onChange={setConfirm}
          secure
          autoCapitalize="none"
          error={confirm && !matches ? t("password.mismatch") : undefined}
        />
        <TextComponent className="px-1 text-xs text-zinc-500">{t("password.social")}</TextComponent>
        <PrimaryButton label={t("settings.changePassword")} onPress={() => void save()} busy={saving} disabled={!canSave} />
      </View>
    </Page>
  );
};

/* ----------------------------------------------------------------- notifications */

// Each row's words are notificationSettings.<key> and <key>Hint.
const NOTIFICATION_ROWS = ["orderUpdates", "ticketTransfers", "eventUpdates", "creditUpdates"] as const;

export const NotificationsPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const prefs = useNotificationPreferences();
  const value = prefs.data;

  const change = async (key: keyof TNotificationPreferences, next: boolean) => {
    if (!value) return;
    queryClient.setQueryData(["notification-preferences"], { ...value, [key]: next });
    try {
      const saved = await updateNotificationPreferences({ [key]: next });
      if (saved) queryClient.setQueryData(["notification-preferences"], saved);
    } catch (error) {
      queryClient.setQueryData(["notification-preferences"], value);
      onError(errorText(error, t("notificationSettings.saveFailed")));
    }
  };

  return (
    <Page title={t("notificationSettings.title")} onBack={onBack}>
      {!value ? (
        prefs.isLoading ? <Loading /> : (
          <TextComponent className="p-8 text-center text-sm text-zinc-500">{t("notificationSettings.loadFailed")}</TextComponent>
        )
      ) : (
        <>
          <Section>
            <Toggle
              label={t("notificationSettings.push")}
              hint={t("notificationSettings.pushHint")}
              value={value.push}
              onChange={(next) => void change("push", next)}
              last
            />
          </Section>
          <Section title={t("notificationSettings.tellMeAbout")}>
            {NOTIFICATION_ROWS.map((key, index) => (
              <Toggle
                key={key}
                label={t(`notificationSettings.${key}`)}
                hint={t(`notificationSettings.${key}Hint`)}
                value={value[key]}
                onChange={(next) => void change(key, next)}
                last={index === NOTIFICATION_ROWS.length - 1}
              />
            ))}
          </Section>
          <Section title={t("notificationSettings.email")}>
            <Toggle
              label={t("notificationSettings.emailMe")}
              hint={t("notificationSettings.emailMeHint")}
              value={value.email}
              onChange={(next) => void change("email", next)}
              last
            />
          </Section>
          <TextComponent className="px-6 pt-4 text-xs text-zinc-500">
            {t("notificationSettings.alwaysSent")}
          </TextComponent>
        </>
      )}
    </Page>
  );
};

/* ----------------------------------------------------------------------- devices */

const ago = (iso: string, t: TFunction) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!iso || Number.isNaN(minutes)) return "";
  if (minutes < 5) return t("devices.activeNow");
  if (minutes < 60) return t("devices.activeMinutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("devices.activeHours", { count: hours });
  return t("devices.activeDays", { count: Math.round(hours / 24) });
};

const DeviceIcon = ({ platform }: { platform: string }) => (
  <View className="size-11 items-center justify-center rounded-full bg-[#eef6ff]">
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d={platform === "app" ? "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2" : "M4 5h16v11H4zM2 19h20"}
        fill="none"
        stroke={BLUE}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  </View>
);

const DevicesPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const { t, i18n } = useTranslation();
  const sessions = useSessions();
  const [busy, setBusy] = useState<string | null>(null);
  const list = sessions.data ?? [];
  const others = list.filter((session) => !session.isCurrent);

  const signOut = (session: TSession) =>
    Alert.alert(t("devices.signOutConfirm"), session.device, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("devices.signOut"),
        style: "destructive",
        onPress: async () => {
          setBusy(session.id);
          try {
            await signOutDevice(session.id);
            await sessions.refetch();
          } catch (error) {
            onError(errorText(error, t("devices.signOutFailed")));
          } finally {
            setBusy(null);
          }
        }
      }
    ]);

  const signOutOthers = () =>
    Alert.alert(t("devices.signOutAllConfirm"), t("devices.signOutAllBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("devices.signOutAllButton"),
        style: "destructive",
        onPress: async () => {
          setBusy("all");
          try {
            await signOutOtherDevices();
            await sessions.refetch();
          } catch (error) {
            onError(errorText(error, t("devices.signOutAllFailed")));
          } finally {
            setBusy(null);
          }
        }
      }
    ]);

  return (
    <Page title={t("settings.loginActivity")} onBack={onBack}>
      <TextComponent className="px-5 pt-5 text-sm text-zinc-600">{t("devices.intro")}</TextComponent>
      {sessions.isLoading ? (
        <Loading />
      ) : (
        <Section>
          {list.map((session, index) => (
            <View
              key={session.id}
              className={index === list.length - 1 ? "flex-row items-center gap-3 px-4 py-3.5" : "flex-row items-center gap-3 border-b border-black/5 px-4 py-3.5"}
            >
              <DeviceIcon platform={session.platform} />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <TextComponent numberOfLines={1} className="shrink text-base font-semibold text-zinc-950">
                    {session.device}
                  </TextComponent>
                  {session.isCurrent && (
                    <View className="rounded-full bg-[#e3f6ff] px-2 py-0.5">
                      <TextComponent className="text-[10px] font-bold" style={{ color: BLUE }}>{t("devices.thisDevice")}</TextComponent>
                    </View>
                  )}
                </View>
                <TextComponent className="text-xs text-zinc-500">
                  {[session.isCurrent ? t("devices.activeNow") : ago(session.lastSeenAt, t), session.ip].filter(Boolean).join(" · ")}
                </TextComponent>
                {!!session.signedInAt && (
                  <TextComponent className="text-xs text-zinc-400">
                    {t("devices.signedIn", {
                      date: new Date(session.signedInAt).toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" })
                    })}
                  </TextComponent>
                )}
              </View>
              {!session.isCurrent &&
                (busy === session.id ? (
                  <ActivityIndicator color={DANGER} />
                ) : (
                  <Pressable onPress={() => signOut(session)} hitSlop={8} accessibilityRole="button">
                    <TextComponent className="text-sm font-bold" style={{ color: DANGER }}>{t("devices.signOut")}</TextComponent>
                  </Pressable>
                ))}
            </View>
          ))}
        </Section>
      )}
      {others.length > 1 && (
        <View className="px-4 pt-5">
          <Pressable
            onPress={signOutOthers}
            disabled={busy === "all"}
            accessibilityRole="button"
            className="h-12 items-center justify-center rounded-full border bg-white"
            style={{ borderColor: DANGER }}
          >
            {busy === "all" ? (
              <ActivityIndicator color={DANGER} />
            ) : (
              <TextComponent className="text-base font-bold" style={{ color: DANGER }}>
                {t("devices.signOutAll")}
              </TextComponent>
            )}
          </Pressable>
        </View>
      )}
    </Page>
  );
};

/* ----------------------------------------------------------------- accessibility */

// Each row's words are accessibility.<key> and <key>Hint.
const ACCESSIBILITY_ROWS: (keyof TAccessibilityOptions)[] = [
  "largerText",
  "highContrast",
  "buttonLabels",
  "screenReaderHints"
];

const AccessibilityPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const { t } = useTranslation();
  const options = useAccessibilityStore();
  return (
    <Page title={t("settings.accessibility")} onBack={onBack}>
      <Section>
        {ACCESSIBILITY_ROWS.map((key, index) => (
          <Toggle
            key={key}
            label={t(`accessibility.${key}`)}
            hint={t(`accessibility.${key}Hint`)}
            value={options[key]}
            onChange={() => options.toggleOption(key)}
            last={index === ACCESSIBILITY_ROWS.length - 1}
          />
        ))}
      </Section>
      <TextComponent className="px-6 pt-4 text-xs text-zinc-500">{t("common.savedOnPhone")}</TextComponent>
    </Page>
  );
};

/* ----------------------------------------------------------------------- privacy */

const MESSAGE_POLICIES: TMessagePolicy[] = ["EVERYONE", "MUTUALS", "NOBODY"];
const POLICY_KEY = { EVERYONE: "everyone", MUTUALS: "mutuals", NOBODY: "nobody" } as const;

const PrivacyPage = ({ onBack, onOpenBlocked }: { onBack: () => void; onOpenBlocked: () => void }) => {
  useHardwareBack(onBack);
  const { t } = useTranslation();
  const privacy = usePrivacy();
  const update = useUpdatePrivacy();
  const requests = useFollowRequests(!!privacy.data?.isPrivate);
  const openFollowRequests = usePeopleNav((state) => state.openFollowRequests);
  const value = privacy.data;

  const change = async (next: Parameters<typeof update>[0]) => {
    try {
      await update(next);
    } catch (error) {
      onError(errorText(error, t("privacy.saveFailed")));
    }
  };

  return (
    <Page title={t("settings.privacySettings")} onBack={onBack}>
      {!value ? (
        privacy.isLoading ? <Loading /> : (
          <TextComponent className="p-8 text-center text-sm text-zinc-500">{t("notificationSettings.loadFailed")}</TextComponent>
        )
      ) : (
        <>
          <Section title={t("privacy.visibility")}>
            <Toggle
              label={t("privacy.private")}
              hint={t("privacy.privateHint")}
              value={value.isPrivate}
              onChange={(next) => void change({ isPrivate: next })}
              last={!value.isPrivate}
            />
            {value.isPrivate && (
              <Row
                label={t("privacy.followRequests")}
                value={requests.data?.length ? String(requests.data.length) : undefined}
                onPress={openFollowRequests}
                last
              />
            )}
          </Section>
          <TextComponent className="px-6 pt-2 text-xs italic text-zinc-500">{t("privacy.privateNote")}</TextComponent>

          <Section title={t("privacy.messages")}>
            {MESSAGE_POLICIES.map((policy, index) => {
              const on = value.messagePolicy === policy;
              return (
                <Pressable
                  key={policy}
                  onPress={() => !on && void change({ messagePolicy: policy })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  className={
                    index === MESSAGE_POLICIES.length - 1
                      ? "flex-row items-center gap-3 px-4 py-3.5"
                      : "flex-row items-center gap-3 border-b border-black/5 px-4 py-3.5"
                  }
                  style={({ pressed }) => ({ backgroundColor: pressed ? "#f4f5f8" : "transparent" })}
                >
                  <View className="flex-1">
                    <TextComponent className="text-base font-semibold" style={{ color: INK }}>
                      {t(`privacy.${POLICY_KEY[policy]}`)}
                    </TextComponent>
                    <TextComponent className="mt-0.5 text-xs text-zinc-500">
                      {t(`privacy.${POLICY_KEY[policy]}Hint`)}
                    </TextComponent>
                  </View>
                  <View
                    className="size-[22px] items-center justify-center rounded-full border-2"
                    style={{ borderColor: on ? BLUE : "#c4c9d2" }}
                  >
                    {on && <View className="size-[11px] rounded-full" style={{ backgroundColor: BLUE }} />}
                  </View>
                </Pressable>
              );
            })}
          </Section>

          <Section title={t("privacy.restricted")}>
            <Row
              label={t("privacy.blocked")}
              hint={
                value.blockedCount
                  ? t("privacy.blockedCount", { count: value.blockedCount })
                  : t("privacy.noneBlocked")
              }
              onPress={onOpenBlocked}
              last
            />
          </Section>
        </>
      )}
    </Page>
  );
};

const BlockedPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const { t } = useTranslation();
  const blocks = useBlocks();
  const blockPerson = useBlockPerson();
  const [busy, setBusy] = useState<string | null>(null);

  const unblock = (id: string, name: string) =>
    Alert.alert(t("privacy.unblockConfirm", { name }), t("privacy.unblockBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("privacy.unblock"),
        onPress: async () => {
          setBusy(id);
          try {
            await blockPerson(id, false);
          } catch (error) {
            onError(errorText(error, t("privacy.saveFailed")));
          } finally {
            setBusy(null);
          }
        }
      }
    ]);

  const list = blocks.data ?? [];
  return (
    <Page title={t("privacy.blocked")} onBack={onBack}>
      {blocks.isLoading ? (
        <Loading />
      ) : !list.length ? (
        <TextComponent className="px-8 pt-10 text-center text-sm text-zinc-500">{t("privacy.blockedEmpty")}</TextComponent>
      ) : (
        <Section>
          {list.map((person, index) => (
            <View
              key={person.id}
              className={index === list.length - 1 ? "flex-row items-center gap-3 px-4 py-3" : "flex-row items-center gap-3 border-b border-black/5 px-4 py-3"}
            >
              <ProfilePhoto uri={person.image} name={person.name} size={44} ringColor="#ffffff" />
              <View className="flex-1">
                <TextComponent numberOfLines={1} className="text-base font-semibold text-zinc-950">{person.name}</TextComponent>
                {!!person.username && (
                  <TextComponent numberOfLines={1} className="text-xs text-zinc-500">@{person.username}</TextComponent>
                )}
              </View>
              {busy === person.id ? (
                <ActivityIndicator color={BLUE} />
              ) : (
                <Pressable
                  onPress={() => unblock(person.id, person.name)}
                  accessibilityRole="button"
                  className="h-8 items-center justify-center rounded-full border px-3.5"
                  style={{ borderColor: "#DDE2EA" }}
                >
                  <TextComponent className="text-[12.5px] font-bold text-zinc-950">{t("privacy.unblock")}</TextComponent>
                </Pressable>
              )}
            </View>
          ))}
        </Section>
      )}
    </Page>
  );
};

/* ---------------------------------------------------------------------- language */

const Tick = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={BLUE} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LANGUAGE_CHOICES: TLanguageChoice[] = ["system", ...LANGUAGES];

const LanguagePage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const { t } = useTranslation();
  const choice = useLanguageStore((state) => state.choice);
  const setChoice = useLanguageStore((state) => state.setChoice);
  return (
    <Page title={t("language.title")} onBack={onBack}>
      <Section>
        {LANGUAGE_CHOICES.map((option, index) => (
          <Pressable
            key={option}
            onPress={() => setChoice(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: choice === option }}
            className={
              index === LANGUAGE_CHOICES.length - 1
                ? "flex-row items-center gap-3 px-4 py-4"
                : "flex-row items-center gap-3 border-b border-black/5 px-4 py-4"
            }
            style={({ pressed }) => ({ backgroundColor: pressed ? "#f4f5f8" : "transparent" })}
          >
            <View className="flex-1">
              <TextComponent className="text-base font-semibold" style={{ color: INK }}>
                {t(`language.${option}`)}
              </TextComponent>
              {option === "system" && (
                <TextComponent className="mt-0.5 text-xs text-zinc-500">
                  {t("language.systemHint", { language: t(`language.${phoneLanguage()}`) })}
                </TextComponent>
              )}
            </View>
            {choice === option && <Tick />}
          </Pressable>
        ))}
      </Section>
      <TextComponent className="px-6 pt-4 text-xs text-zinc-500">{t("language.note")}</TextComponent>
    </Page>
  );
};

/* -------------------------------------------------------------------------- delete account */

const DeleteAccountPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const { t } = useTranslation();
  const { logoutUser } = useUser();
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const ready = confirm.trim().toUpperCase() === "DELETE";

  const remove = async () => {
    if (!ready) return;
    setDeleting(true);
    try {
      await deleteData("/user/me", {
        data: { confirm: "DELETE", ...(reason.trim() ? { reason: reason.trim() } : {}) }
      });
      onSuccess(t("deleteAccount.done"));
      await logoutUser();
    } catch (error) {
      onError(errorText(error, t("deleteAccount.failed")));
      setDeleting(false);
    }
  };

  return (
    <Page title={t("settings.deleteAccount")} onBack={onBack}>
      <View className="gap-4 px-4 pt-6">
        <View className="rounded-2xl bg-white p-4">
          <TextComponent className="text-base font-bold text-zinc-950">
            {t("deleteAccount.heading")}
          </TextComponent>
          {(["point1", "point2", "point3", "point4", "point5"] as const).map((key) => t(`deleteAccount.${key}`)).map((line) => (
            <View key={line} className="mt-2.5 flex-row gap-2.5">
              <View className="mt-[7px] size-1.5 rounded-full" style={{ backgroundColor: DANGER }} />
              <TextComponent className="flex-1 text-sm leading-5 text-zinc-700">{line}</TextComponent>
            </View>
          ))}
        </View>
        <Field
          label={t("deleteAccount.reason")}
          value={reason}
          onChange={setReason}
          multiline
          placeholder={t("deleteAccount.reasonPlaceholder")}
        />
        <Field
          label={t("deleteAccount.typeDelete")}
          value={confirm}
          onChange={setConfirm}
          autoCapitalize="characters"
          placeholder="DELETE"
        />
        <Pressable
          onPress={() => void remove()}
          disabled={!ready || deleting}
          accessibilityRole="button"
          className="h-12 items-center justify-center rounded-full"
          style={{ backgroundColor: ready ? DANGER : "#d4d4d8" }}
        >
          {deleting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <TextComponent className="text-base font-bold text-white">{t("deleteAccount.button")}</TextComponent>
          )}
        </Pressable>
      </View>
    </Page>
  );
};

/* -------------------------------------------------------------------------- help */

const HelpPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const { t } = useTranslation();
  const faqs = useFaqs();
  const [open, setOpen] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      // Into your chat with the team, so the reply comes back in Messages.
      await openSupportChat(
        subject.trim() ? `${subject.trim()}:\n${message.trim()}` : message.trim()
      );
      setSubject("");
      setMessage("");
      onSuccess(t("help.sent"));
    } catch (error) {
      onError(errorText(error, t("help.failed")));
    } finally {
      setSending(false);
    }
  };

  return (
    <Page title={t("settings.help")} onBack={onBack}>
      <Section title={t("help.common")}>
        {faqs.isLoading ? (
          <Loading />
        ) : !(faqs.data ?? []).length ? (
          <TextComponent className="p-4 text-sm text-zinc-500">{t("help.none")}</TextComponent>
        ) : (
          (faqs.data ?? []).map((faq, index, all) => {
            const isOpen = open === faq.id;
            return (
              <Pressable
                key={faq.id}
                onPress={() => setOpen(isOpen ? null : faq.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                className={index === all.length - 1 ? "px-4 py-4" : "border-b border-black/5 px-4 py-4"}
              >
                <View className="flex-row items-center gap-3">
                  <TextComponent className="flex-1 text-base font-semibold text-zinc-950">{faq.question}</TextComponent>
                  <TextComponent className="text-lg text-zinc-400">{isOpen ? "−" : "+"}</TextComponent>
                </View>
                {isOpen && <TextComponent className="mt-2 text-sm leading-5 text-zinc-600">{faq.answer}</TextComponent>}
              </Pressable>
            );
          })
        )}
      </Section>
      <Section title={t("help.stillStuck")}>
        <View className="gap-3 p-4">
          <Field label={t("help.subject")} value={subject} onChange={setSubject} placeholder={t("help.subjectPlaceholder")} />
          <Field label={t("help.message")} value={message} onChange={setMessage} multiline placeholder={t("help.messagePlaceholder")} />
          <TextComponent className="px-1 text-xs text-zinc-500">{t("help.replyNote")}</TextComponent>
          <PrimaryButton label={t("common.send")} onPress={() => void send()} busy={sending} disabled={!message.trim()} />
        </View>
      </Section>
    </Page>
  );
};

/* -------------------------------------------------------------------------- menu */

const ProfileSettingsScreen = ({
  onBack,
  onOpenWallet
}: {
  onBack: () => void;
  /** The Wallet page: Turnupz Credit and saved cards. */
  onOpenWallet: () => void;
}) => {
  useHardwareBack(onBack);
  const { t } = useTranslation();
  const languageChoice = useLanguageStore((state) => state.choice);
  const queryClient = useQueryClient();
  const { logoutUser } = useUser();
  const [page, setPage] = useState<TPage>("menu");
  const credit = useCreditBalance();
  const hideBalance = useBalancePrivacyStore((state) => state.hideBalance);
  const creditRow = credit.data?.find((row) => row.available.amount > 0) ?? credit.data?.[0];
  const creditText = hideBalance
    ? maskAmount(creditRow?.available.formatted?.withCurrency)
    : creditRow && creditRow.available.amount > 0
      ? creditRow.available.formatted?.withCurrency
      : credit.isLoading
        ? "…"
        : creditRow?.available.formatted?.withCurrency ?? formatZero();
  const sessions = useSessions();
  const [loggingOut, setLoggingOut] = useState(false);
  const back = () => setPage("menu");

  if (page === "password") return <PasswordPage onBack={back} />;
  if (page === "notifications") return <NotificationsPage onBack={back} />;
  if (page === "devices") return <DevicesPage onBack={back} />;
  if (page === "accessibility") return <AccessibilityPage onBack={back} />;
  if (page === "language") return <LanguagePage onBack={back} />;
  if (page === "privacy") return <PrivacyPage onBack={back} onOpenBlocked={() => setPage("blocked")} />;
  if (page === "blocked") return <BlockedPage onBack={() => setPage("privacy")} />;
  if (page === "help") return <HelpPage onBack={back} />;
  if (page === "orders") return <OrdersPage onBack={back} />;
  if (page === "delete") return <DeleteAccountPage onBack={back} />;

  const openWeb = (path: string) =>
    void Linking.openURL(`${WEB_APP_URL}${path}`).catch(() => onError(t("settings.couldntOpen")));

  const confirmLogOut = () =>
    Alert.alert(t("settings.logOutConfirm"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logOut"),
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          await logOut();
          queryClient.clear();
          await logoutUser();
        }
      }
    ]);

  const deviceCount = sessions.data?.length;
  const version = Constants.expoConfig?.version;

  return (
    <View className="flex-1" style={{ backgroundColor: TICKET_LIST_BACKGROUND }}>
      <BackHeader title={t("settings.title")} onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Section title={t("settings.account")}>
          <Row label={t("settings.changePassword")} onPress={() => setPage("password")} />
          <Row
            label={t("settings.orders")}
            hint={t("settings.ordersHint")}
            onPress={() => setPage("orders")}
          />
          <Row
            label={t("settings.wallet")}
            hint={t("settings.walletHint")}
            value={creditText}
            onPress={onOpenWallet}
            last
          />
        </Section>
        <Section title={t("settings.preferences")}>
          <Row label={t("settings.notifications")} onPress={() => setPage("notifications")} />
          <Row label={t("settings.privacySettings")} onPress={() => setPage("privacy")} />
          <Row label={t("settings.accessibility")} onPress={() => setPage("accessibility")} />
          <Row
            label={t("settings.language")}
            value={t(`language.${languageChoice}`)}
            onPress={() => setPage("language")}
            last
          />
        </Section>
        <Section title={t("settings.security")}>
          <Row
            label={t("settings.loginActivity")}
            hint={t("settings.loginActivityHint")}
            value={deviceCount ? t("settings.deviceCount", { count: deviceCount }) : undefined}
            onPress={() => setPage("devices")}
            last
          />
        </Section>
        <Section title={t("settings.support")}>
          <Row label={t("settings.help")} hint={t("settings.helpHint")} onPress={() => setPage("help")} />
          <Row label={t("settings.terms")} onPress={() => openWeb("/terms")} />
          <Row label={t("settings.privacy")} onPress={() => openWeb("/privacy-policy")} last />
        </Section>
        <Section>
          {loggingOut ? (
            <View className="items-center py-4">
              <ActivityIndicator color={DANGER} />
            </View>
          ) : (
            <Row label={t("settings.logOut")} tone="danger" onPress={confirmLogOut} last />
          )}
        </Section>
        <Section>
          <Row label={t("settings.deleteAccount")} onPress={() => setPage("delete")} last />
        </Section>
        {!!version && (
          <TextComponent className="pt-6 text-center text-xs text-zinc-400">{t("settings.version", { version })}</TextComponent>
        )}
      </ScrollView>
    </View>
  );
};

export default memo(ProfileSettingsScreen);
