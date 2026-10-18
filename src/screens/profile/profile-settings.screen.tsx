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
import { PASSWORD_REGEX } from "@/shared/utils/regex";
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
 * to the api, except accessibility, which is how this phone draws the app.
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
      onSuccess("Password changed");
      onBack();
    } catch (error) {
      onError(errorText(error, "Couldn't change your password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Change password" onBack={onBack}>
      <View className="gap-4 px-4 pt-6">
        <Field label="Current password" value={current} onChange={setCurrent} secure autoCapitalize="none" />
        <Field
          label="New password"
          value={next}
          onChange={setNext}
          secure
          autoCapitalize="none"
          error={next && !strong ? "Use 8+ characters with upper and lower case, a number and a symbol" : undefined}
          note={!next ? "8+ characters with upper and lower case, a number and a symbol" : strong ? "Strong password" : undefined}
        />
        <Field
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          secure
          autoCapitalize="none"
          error={confirm && !matches ? "Passwords don't match" : undefined}
        />
        <TextComponent className="px-1 text-xs text-zinc-500">
          Signed up with Google or Apple? You don't have a password yet. Use Forgot password on the sign-in screen to set one.
        </TextComponent>
        <PrimaryButton label="Change password" onPress={() => void save()} busy={saving} disabled={!canSave} />
      </View>
    </Page>
  );
};

/* ----------------------------------------------------------------- notifications */

const NOTIFICATION_ROWS: { key: keyof TNotificationPreferences; label: string; hint: string }[] = [
  { key: "orderUpdates", label: "My tickets and orders", hint: "Tickets ready, payments and refunds" },
  { key: "ticketTransfers", label: "Tickets sent to me", hint: "When a friend sends you a ticket" },
  { key: "eventUpdates", label: "Events I'm going to", hint: "Updates from the organiser, time or venue changes" },
  { key: "creditUpdates", label: "Turnupz Credit and invites", hint: "When you earn credit, or it's about to run out" }
];

export const NotificationsPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
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
      onError(errorText(error, "Couldn't save that setting."));
    }
  };

  return (
    <Page title="Notification settings" onBack={onBack}>
      {!value ? (
        prefs.isLoading ? <Loading /> : (
          <TextComponent className="p-8 text-center text-sm text-zinc-500">We couldn't load your settings.</TextComponent>
        )
      ) : (
        <>
          <Section>
            <Toggle
              label="Notifications on this phone"
              hint="Turn alerts off here any time. Everything still shows in Notifications."
              value={value.push}
              onChange={(next) => void change("push", next)}
              last
            />
          </Section>
          <Section title="Tell me about">
            {NOTIFICATION_ROWS.map((row, index) => (
              <Toggle
                key={row.key}
                label={row.label}
                hint={row.hint}
                value={value[row.key]}
                onChange={(next) => void change(row.key, next)}
                last={index === NOTIFICATION_ROWS.length - 1}
              />
            ))}
          </Section>
          <Section title="Email">
            <Toggle
              label="Email me what I miss"
              hint="An email when a notification goes unread for a while"
              value={value.email}
              onChange={(next) => void change("email", next)}
              last
            />
          </Section>
          <TextComponent className="px-6 pt-4 text-xs text-zinc-500">
            Account and security messages are always sent.
          </TextComponent>
        </>
      )}
    </Page>
  );
};

/* ----------------------------------------------------------------------- devices */

const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!iso || Number.isNaN(minutes)) return "";
  if (minutes < 5) return "Active now";
  if (minutes < 60) return `Active ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Active ${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `Active ${days} ${days === 1 ? "day" : "days"} ago`;
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
  const sessions = useSessions();
  const [busy, setBusy] = useState<string | null>(null);
  const list = sessions.data ?? [];
  const others = list.filter((session) => !session.isCurrent);

  const signOut = (session: TSession) =>
    Alert.alert("Sign out this device?", session.device, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setBusy(session.id);
          try {
            await signOutDevice(session.id);
            await sessions.refetch();
          } catch (error) {
            onError(errorText(error, "Couldn't sign that device out."));
          } finally {
            setBusy(null);
          }
        }
      }
    ]);

  const signOutOthers = () =>
    Alert.alert("Sign out every other device?", "You'll stay signed in on this phone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out all",
        style: "destructive",
        onPress: async () => {
          setBusy("all");
          try {
            await signOutOtherDevices();
            await sessions.refetch();
          } catch (error) {
            onError(errorText(error, "Couldn't sign the other devices out."));
          } finally {
            setBusy(null);
          }
        }
      }
    ]);

  return (
    <Page title="Login activity" onBack={onBack}>
      <TextComponent className="px-5 pt-5 text-sm text-zinc-600">
        Where your account is signed in. Don't recognise one? Sign it out and change your password.
      </TextComponent>
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
                      <TextComponent className="text-[10px] font-bold" style={{ color: BLUE }}>THIS DEVICE</TextComponent>
                    </View>
                  )}
                </View>
                <TextComponent className="text-xs text-zinc-500">
                  {[session.isCurrent ? "Active now" : ago(session.lastSeenAt), session.ip].filter(Boolean).join(" · ")}
                </TextComponent>
                {!!session.signedInAt && (
                  <TextComponent className="text-xs text-zinc-400">
                    Signed in {new Date(session.signedInAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </TextComponent>
                )}
              </View>
              {!session.isCurrent &&
                (busy === session.id ? (
                  <ActivityIndicator color={DANGER} />
                ) : (
                  <Pressable onPress={() => signOut(session)} hitSlop={8} accessibilityRole="button">
                    <TextComponent className="text-sm font-bold" style={{ color: DANGER }}>Sign out</TextComponent>
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
                Sign out all other devices
              </TextComponent>
            )}
          </Pressable>
        </View>
      )}
    </Page>
  );
};

/* ----------------------------------------------------------------- accessibility */

const ACCESSIBILITY_ROWS: { key: keyof TAccessibilityOptions; label: string; hint: string }[] = [
  { key: "largerText", label: "Larger text", hint: "Bigger text throughout Turnupz" },
  { key: "highContrast", label: "High contrast", hint: "Darker text that's easier to read" },
  { key: "buttonLabels", label: "Navigation labels", hint: "Words under the icons in the bottom bar" },
  { key: "screenReaderHints", label: "Screen reader hints", hint: "Extra spoken help on the navigation" }
];

const AccessibilityPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const options = useAccessibilityStore();
  return (
    <Page title="Accessibility" onBack={onBack}>
      <Section>
        {ACCESSIBILITY_ROWS.map((row, index) => (
          <Toggle
            key={row.key}
            label={row.label}
            hint={row.hint}
            value={options[row.key]}
            onChange={() => options.toggleOption(row.key)}
            last={index === ACCESSIBILITY_ROWS.length - 1}
          />
        ))}
      </Section>
      <TextComponent className="px-6 pt-4 text-xs text-zinc-500">Saved on this phone.</TextComponent>
    </Page>
  );
};

/* -------------------------------------------------------------------------- delete account */

const DeleteAccountPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
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
      onSuccess("Your account has been deleted");
      await logoutUser();
    } catch (error) {
      onError(errorText(error, "Couldn't delete your account. Please try again."));
      setDeleting(false);
    }
  };

  return (
    <Page title="Delete account" onBack={onBack}>
      <View className="gap-4 px-4 pt-6">
        <View className="rounded-2xl bg-white p-4">
          <TextComponent className="text-base font-bold text-zinc-950">
            Deleting your account can't be undone
          </TextComponent>
          {[
            "Your profile, photo, followers and saved cards are removed, and you're signed out everywhere.",
            "You lose access to your tickets, and any Turnupz Credit you have is lost.",
            "Your orders are kept without your name, because we have to keep payment records.",
            "If you've sold tickets to an upcoming event, cancel it or wait until it's over first.",
            "You can sign up again with the same email later."
          ].map((line) => (
            <View key={line} className="mt-2.5 flex-row gap-2.5">
              <View className="mt-[7px] size-1.5 rounded-full" style={{ backgroundColor: DANGER }} />
              <TextComponent className="flex-1 text-sm leading-5 text-zinc-700">{line}</TextComponent>
            </View>
          ))}
        </View>
        <Field
          label="Why are you leaving? (optional)"
          value={reason}
          onChange={setReason}
          multiline
          placeholder="It helps us make Turnupz better"
        />
        <Field
          label="Type DELETE to confirm"
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
            <TextComponent className="text-base font-bold text-white">Delete my account</TextComponent>
          )}
        </Pressable>
      </View>
    </Page>
  );
};

/* -------------------------------------------------------------------------- help */

const HelpPage = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
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
      onSuccess("Sent. The Turnupz team will reply in your Messages.");
    } catch (error) {
      onError(errorText(error, "Couldn't send your message."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Page title="Help & FAQs" onBack={onBack}>
      <Section title="Common questions">
        {faqs.isLoading ? (
          <Loading />
        ) : !(faqs.data ?? []).length ? (
          <TextComponent className="p-4 text-sm text-zinc-500">No questions yet.</TextComponent>
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
      <Section title="Still stuck? Message us">
        <View className="gap-3 p-4">
          <Field label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Refund for a cancelled event" />
          <Field label="Message" value={message} onChange={setMessage} multiline placeholder="Tell us what happened" />
          <TextComponent className="px-1 text-xs text-zinc-500">
            The Turnupz team will reply in your Messages.
          </TextComponent>
          <PrimaryButton label="Send" onPress={() => void send()} busy={sending} disabled={!message.trim()} />
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
  if (page === "help") return <HelpPage onBack={back} />;
  if (page === "orders") return <OrdersPage onBack={back} />;
  if (page === "delete") return <DeleteAccountPage onBack={back} />;

  const openWeb = (path: string) =>
    void Linking.openURL(`${WEB_APP_URL}${path}`).catch(() => onError("Couldn't open the page."));

  const confirmLogOut = () =>
    Alert.alert("Log out of Turnupz?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
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
      <BackHeader title="Settings" onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Section title="Account">
          <Row label="Change password" onPress={() => setPage("password")} />
          <Row
            label="Orders"
            hint="Receipts, payments and order numbers"
            onPress={() => setPage("orders")}
          />
          <Row
            label="Wallet"
            hint="Your Turnupz Credit and saved cards"
            value={creditText}
            onPress={onOpenWallet}
            last
          />
        </Section>
        <Section title="Preferences">
          <Row label="Notifications" onPress={() => setPage("notifications")} />
          <Row label="Accessibility" onPress={() => setPage("accessibility")} last />
        </Section>
        <Section title="Security">
          <Row
            label="Login activity"
            hint="Devices signed in to your account"
            value={deviceCount ? `${deviceCount} ${deviceCount === 1 ? "device" : "devices"}` : undefined}
            onPress={() => setPage("devices")}
            last
          />
        </Section>
        <Section title="Support">
          <Row label="Help & FAQs" hint="Answers, or message our team" onPress={() => setPage("help")} />
          <Row label="Terms of Service" onPress={() => openWeb("/terms")} />
          <Row label="Privacy Policy" onPress={() => openWeb("/privacy-policy")} last />
        </Section>
        <Section>
          {loggingOut ? (
            <View className="items-center py-4">
              <ActivityIndicator color={DANGER} />
            </View>
          ) : (
            <Row label="Log out" tone="danger" onPress={confirmLogOut} last />
          )}
        </Section>
        <Section>
          <Row label="Delete account" onPress={() => setPage("delete")} last />
        </Section>
        {!!version && (
          <TextComponent className="pt-6 text-center text-xs text-zinc-400">Turnupz {version}</TextComponent>
        )}
      </ScrollView>
    </View>
  );
};

export default memo(ProfileSettingsScreen);
