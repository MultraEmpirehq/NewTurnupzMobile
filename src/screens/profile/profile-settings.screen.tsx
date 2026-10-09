import React, { memo, useEffect, useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { Path, Svg } from "react-native-svg";
import { WEB_APP_URL } from "@env";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { getData } from "@/api";
import { constructErrorMessage } from "@/api/functions";
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
  TProfileUpdate,
  TSession,
  changePassword,
  logOut,
  sendSupportMessage,
  signOutDevice,
  signOutOtherDevices,
  updateNotificationPreferences,
  updateProfile,
  uploadProfilePhoto,
  useFaqs,
  useMe,
  useNotificationPreferences,
  useSessions,
  useWallet
} from "./profile-api";

/**
 * Settings, and the pages behind each row. Every switch and form here talks
 * to the api, except accessibility, which is how this phone draws the app.
 */

const INK = "#0b1d2a";
const BLUE = "#00b2ff";
const PINK = "#ff0088";

type TPage =
  | "menu"
  | "edit"
  | "password"
  | "notifications"
  | "devices"
  | "accessibility"
  | "help";

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
      <TextComponent className="text-base font-semibold" style={{ color: tone === "danger" ? PINK : INK }}>
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
      accessibilityLabel={label}
    />
  </View>
);

const Field = ({
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
  autoCapitalize?: "none" | "sentences" | "words";
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
      className={multiline ? "min-h-24 rounded-2xl bg-white px-4 py-3 text-base text-zinc-950" : "h-12 rounded-2xl bg-white px-4 text-base text-zinc-950"}
      style={{
        fontFamily: "Avenir-Book",
        borderWidth: 1,
        borderColor: error ? PINK : "rgba(0,0,0,0.06)",
        textAlignVertical: multiline ? "top" : "center"
      }}
    />
    {!!(error || note) && (
      <TextComponent className="px-1 text-xs" style={{ color: error ? PINK : "#71717a" }}>
        {error || note}
      </TextComponent>
    )}
  </View>
);

const PrimaryButton = ({
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

/* ------------------------------------------------------------------ edit profile */

const EditProfilePage = ({ onBack }: { onBack: () => void }) => {
  const queryClient = useQueryClient();
  const me = useMe();
  const user = me.data;
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    bio: "",
    website: "",
    phone: ""
  });
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [username] = useDebounce(form.username.trim().toLowerCase(), 500);

  if (user && loadedFor !== user.id) {
    setLoadedFor(user.id);
    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      username: user.username ?? "",
      bio: user.bio ?? "",
      website: user.website ?? "",
      phone: user.phone ?? ""
    });
  }

  // Is the username free? Only asked when it changes from yours.
  useEffect(() => {
    if (!username || username === user?.username) {
      setUsernameState("idle");
      return;
    }
    let live = true;
    setUsernameState("checking");
    getData(`/auth/username?username=${encodeURIComponent(username)}`)
      .then(() => live && setUsernameState("free"))
      .catch(() => live && setUsernameState("taken"));
    return () => {
      live = false;
    };
  }, [username, user?.username]);

  const set = (key: keyof typeof form) => (text: string) => {
    setForm((current) => ({ ...current, [key]: text }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      await uploadProfilePhoto(result.assets[0]);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      onSuccess("Profile photo updated");
    } catch (error) {
      onError(errorText(error, "Couldn't upload that photo. Please try another."));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const errors: Record<string, string> = {};
    if (!form.firstName.trim()) errors.firstName = "Enter your first name";
    if (!form.lastName.trim()) errors.lastName = "Enter your last name";
    if (!/^[a-z0-9._]{3,30}$/i.test(form.username.trim())) {
      errors.username = "3 to 30 letters, numbers, dots or underscores";
    }
    if (usernameState === "taken") errors.username = "That username is taken";
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    // Only what changed goes up; cleared bio, website or phone go up empty.
    const next: TProfileUpdate = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username: form.username.trim().toLowerCase(),
      bio: form.bio.trim(),
      website: form.website.trim(),
      phone: form.phone.trim()
    };
    const changed = Object.fromEntries(
      Object.entries(next).filter(
        ([key, value]) => value !== ((user?.[key as keyof typeof user] as string | undefined) ?? "")
      )
    );
    if (!Object.keys(changed).length) {
      onBack();
      return;
    }
    setSaving(true);
    try {
      await updateProfile(changed);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      onSuccess("Profile saved");
      onBack();
    } catch (error) {
      const api = (error as TApiErrorResponseType)?.response?.data as
        | { errors?: Record<string, string> }
        | undefined;
      if (api?.errors) setFieldErrors(api.errors);
      onError(errorText(error, "Couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  };

  const name = [form.firstName, form.lastName].filter(Boolean).join(" ") || "You";

  return (
    <Page title="Edit profile" onBack={onBack}>
      {!user ? (
        <Loading />
      ) : (
        <View className="gap-4 px-4 pt-6">
          <Pressable onPress={() => void pickPhoto()} disabled={uploading} accessibilityRole="button" accessibilityLabel="Change profile photo" className="items-center gap-2">
            <View className="size-28 items-center justify-center overflow-hidden rounded-full bg-[#e3f6ff]">
              {user.profileImage ? (
                <CustomImage className="size-full" imageClassName="size-full" source={{ uri: user.profileImage }} contentFit="cover" />
              ) : (
                <TextComponent className="text-4xl font-bold" style={{ color: BLUE }}>
                  {name[0]?.toUpperCase()}
                </TextComponent>
              )}
              {uploading && (
                <View className="absolute inset-0 items-center justify-center bg-black/40">
                  <ActivityIndicator color="#ffffff" />
                </View>
              )}
            </View>
            <TextComponent className="text-sm font-bold" style={{ color: BLUE }}>
              {uploading ? "Uploading…" : "Change photo"}
            </TextComponent>
          </Pressable>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="First name" value={form.firstName} onChange={set("firstName")} error={fieldErrors.firstName} autoCapitalize="words" />
            </View>
            <View className="flex-1">
              <Field label="Last name" value={form.lastName} onChange={set("lastName")} error={fieldErrors.lastName} autoCapitalize="words" />
            </View>
          </View>
          <Field
            label="Username"
            value={form.username}
            onChange={set("username")}
            autoCapitalize="none"
            error={fieldErrors.username || (usernameState === "taken" ? "That username is taken" : undefined)}
            note={usernameState === "checking" ? "Checking…" : usernameState === "free" ? "Available" : undefined}
          />
          <Field
            label="Bio"
            value={form.bio}
            onChange={set("bio")}
            multiline
            maxLength={160}
            error={fieldErrors.bio}
            placeholder="A line about you"
          />
          <Field
            label="Website"
            value={form.website}
            onChange={set("website")}
            keyboard="url"
            autoCapitalize="none"
            error={fieldErrors.website}
            placeholder="yoursite.com or a social link"
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={set("phone")}
            keyboard="phone-pad"
            error={fieldErrors.phone}
            placeholder="+234 801 234 5678"
          />
          <Field label="Email" value={user.email ?? ""} onChange={() => undefined} note="Your sign-in email can't be changed here." />
          <View className="pt-2">
            <PrimaryButton label="Save" onPress={() => void save()} busy={saving} disabled={uploading} />
          </View>
        </View>
      )}
    </Page>
  );
};

/* ---------------------------------------------------------------------- password */

const PasswordPage = ({ onBack }: { onBack: () => void }) => {
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
  { key: "eventUpdates", label: "Event updates", hint: "Changes and reminders for events you're going to" },
  { key: "orderUpdates", label: "Orders and payments", hint: "Payment confirmations and refunds" },
  { key: "ticketTransfers", label: "Ticket transfers", hint: "When someone sends you a ticket" }
];

const NotificationsPage = ({ onBack }: { onBack: () => void }) => {
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
    <Page title="Notifications" onBack={onBack}>
      {!value ? (
        prefs.isLoading ? <Loading /> : (
          <TextComponent className="p-8 text-center text-sm text-zinc-500">We couldn't load your settings.</TextComponent>
        )
      ) : (
        <>
          <Section>
            <Toggle
              label="Push notifications"
              hint="Alerts on this phone. Your inbox in the app keeps everything either way."
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
            onSuccess(`${session.device} signed out`);
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
            const count = await signOutOtherDevices();
            onSuccess(count === 1 ? "1 device signed out" : `${count} devices signed out`);
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
                  <ActivityIndicator color={PINK} />
                ) : (
                  <Pressable onPress={() => signOut(session)} hitSlop={8} accessibilityRole="button">
                    <TextComponent className="text-sm font-bold" style={{ color: PINK }}>Sign out</TextComponent>
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
            style={{ borderColor: PINK }}
          >
            {busy === "all" ? (
              <ActivityIndicator color={PINK} />
            ) : (
              <TextComponent className="text-base font-bold" style={{ color: PINK }}>
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

/* -------------------------------------------------------------------------- help */

const HelpPage = ({ onBack }: { onBack: () => void }) => {
  const faqs = useFaqs();
  const me = useMe();
  const [open, setOpen] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const name = me.data?.name || [me.data?.firstName, me.data?.lastName].filter(Boolean).join(" ");

  const send = async () => {
    if (!message.trim() || !me.data?.email) return;
    setSending(true);
    try {
      await sendSupportMessage({
        name: name || me.data.email,
        email: me.data.email,
        subject: subject.trim() || undefined,
        message: message.trim()
      });
      setSubject("");
      setMessage("");
      onSuccess(`Sent. We'll reply to ${me.data.email}.`);
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
            We'll reply to {me.data?.email ?? "your email"}.
          </TextComponent>
          <PrimaryButton label="Send" onPress={() => void send()} busy={sending} disabled={!message.trim()} />
        </View>
      </Section>
    </Page>
  );
};

/* -------------------------------------------------------------------------- menu */

const ProfileSettingsScreen = ({
  startAt = "menu",
  onBack
}: {
  startAt?: "menu" | "edit";
  onBack: () => void;
}) => {
  const queryClient = useQueryClient();
  const { logoutUser } = useUser();
  const [page, setPage] = useState<TPage>(startAt);
  const wallet = useWallet();
  const sessions = useSessions();
  const [loggingOut, setLoggingOut] = useState(false);
  // Opened straight on a page (Edit profile): Back leaves settings altogether.
  const back = () => (startAt === "menu" ? setPage("menu") : onBack());

  if (page === "edit") return <EditProfilePage onBack={back} />;
  if (page === "password") return <PasswordPage onBack={back} />;
  if (page === "notifications") return <NotificationsPage onBack={back} />;
  if (page === "devices") return <DevicesPage onBack={back} />;
  if (page === "accessibility") return <AccessibilityPage onBack={back} />;
  if (page === "help") return <HelpPage onBack={back} />;

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
          <Row label="Edit profile" hint="Name, photo, bio and links" onPress={() => setPage("edit")} />
          <Row label="Change password" onPress={() => setPage("password")} />
          <Row
            label="Wallet balance"
            hint="Refunds and credit you can spend on tickets"
            value={wallet.data?.balance?.formatted?.withCurrency ?? (wallet.isLoading ? "…" : "—")}
            onPress={() => void wallet.refetch()}
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
              <ActivityIndicator color={PINK} />
            </View>
          ) : (
            <Row label="Log out" tone="danger" onPress={confirmLogOut} last />
          )}
        </Section>
        {!!version && (
          <TextComponent className="pt-6 text-center text-xs text-zinc-400">Turnupz {version}</TextComponent>
        )}
      </ScrollView>
    </View>
  );
};

export default memo(ProfileSettingsScreen);
