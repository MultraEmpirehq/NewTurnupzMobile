import React, { memo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { WEB_APP_URL } from "@env";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onInfo, onSuccess } from "@/shared/components/status/toast";
import useUserStore from "@/shared/stores/user.store";
import { useHiddenEventsStore } from "@/shared/stores/hidden-events.store";
import { constructErrorMessage } from "@/api/functions";
import { formatEventClock, formatEventDay } from "@/shared/utils/event-time";
import MessageIcon from "@/shared/assets/icons/message.icon";
import SendIcon from "@/shared/assets/icons/send.icon";
import HeartOutlineIcon from "@/shared/assets/icons/heart-outline.icon";
import UserOutlineIcon from "@/shared/assets/icons/user-outline.icon";
import CopyIcon from "@/shared/assets/icons/copy.icon";
import CircleExclamationIcon from "@/shared/assets/icons/circle-exclamation.icon";
import CheckIcon from "@/shared/assets/icons/check.icon";
import EyeOutlineIcon from "@/shared/assets/icons/eye-open-outline.icon";
import EyeSlashOutlineIcon from "@/shared/assets/icons/eye-slash-outline.icon";
import ChatThreadScreen from "./chat-thread.screen";
import {
  REPORT_REASONS,
  TSharedEvent,
  reportEvent,
  sendChatMessage,
  startOrganizerChat,
  toggleSavedEvent,
  useLiveChats
} from "./live-api";

/**
 * The one sheet behind every event card's dots, wherever the card is (home,
 * Explore, venue, planner and performer pages). It's the home feed's event
 * actions, all real: message the organiser, share with someone on Turnupz,
 * save, copy the link, share out to other apps, hide, and report.
 */

const BLUE = "#00B2FF";
const MUTED = "#71717a";

export type TEventOptionsTarget = {
  id: string;
  name: string;
  date: Date | string;
  timezone?: string;
  image?: string;
  place?: string;
  isFavorite?: boolean;
};

type TView = "actions" | "share" | "pick" | "report";

const eventLink = (id: string) =>
  `${WEB_APP_URL}/explore/event/${encodeURIComponent(id)}`;

const asShared = (event: TEventOptionsTarget): TSharedEvent => ({
  id: event.id,
  name: event.name,
  date: new Date(event.date).toISOString(),
  timezone: event.timezone,
  image: event.image,
  place: event.place
});

const errorText = (error: unknown, fallback: string) =>
  constructErrorMessage(error as TApiErrorResponseType, fallback);

/** A full-width action: an icon in a circle, a label and an optional hint. */
const Action = ({
  icon,
  label,
  hint,
  selected = false,
  busy = false,
  onPress
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  selected?: boolean;
  busy?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    disabled={busy}
    className={
      selected
        ? "flex-row items-center gap-3 rounded-xl bg-blue-50 px-2 py-2.5"
        : "flex-row items-center gap-3 rounded-xl px-2 py-2.5"
    }
  >
    <View
      className={
        selected
          ? "size-9 items-center justify-center rounded-full bg-primary"
          : "size-9 items-center justify-center rounded-full bg-zinc-100"
      }
    >
      {busy ? <ActivityIndicator size="small" color={BLUE} /> : icon}
    </View>
    <View className="flex-1">
      <TextComponent
        className={
          selected
            ? "text-sm font-bold text-primary"
            : "text-sm font-semibold text-zinc-800"
        }
      >
        {label}
      </TextComponent>
      {!!hint && (
        <TextComponent
          numberOfLines={1}
          className="mt-0.5 text-xs text-zinc-500"
        >
          {hint}
        </TextComponent>
      )}
    </View>
  </Pressable>
);

/** One of the four round shortcuts along the bottom. */
const Quick = ({
  icon,
  label,
  onPress
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    className="min-h-14 w-[23%] items-center gap-1.5"
  >
    <View className="size-11 items-center justify-center rounded-full bg-zinc-100">
      {icon}
    </View>
    <TextComponent className="text-xs text-zinc-600">{label}</TextComponent>
  </Pressable>
);

const Header = ({ title, onBack }: { title: string; onBack?: () => void }) => (
  <View className="mb-3 flex-row items-center justify-between">
    <TextComponent className="text-base font-bold text-zinc-950">
      {title}
    </TextComponent>
    {!!onBack && (
      <Pressable onPress={onBack} hitSlop={10}>
        <TextComponent className="text-sm font-semibold text-primary">
          Back
        </TextComponent>
      </Pressable>
    )}
  </View>
);

const EventOptionsSheet = ({
  event,
  onClose,
  onOpenEvent
}: {
  event: TEventOptionsTarget | null;
  onClose: () => void;
  /** Opens an event shared in a chat; without it event cards there are inert. */
  onOpenEvent?: (eventId: string) => void;
}) => {
  const queryClient = useQueryClient();
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const hiddenEventIds = useHiddenEventsStore((state) => state.hiddenEventIds);
  const toggleHidden = useHiddenEventsStore((state) => state.toggleHidden);

  const [view, setView] = useState<TView>("actions");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"organizer" | "save" | null>(null);
  // Sharing into a chat.
  const [note, setNote] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  // Reporting.
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  // The chat that's open (outlives the sheet, which closes under it).
  const [thread, setThread] = useState<{
    id: string;
    title: string;
    subtitle?: string;
    about?: TSharedEvent | null;
  } | null>(null);

  const chats = useLiveChats(isSignedIn && view === "pick");

  useEffect(() => {
    if (!event) return;
    setView("actions");
    setSaved(!!event.isFavorite);
    setCopied(false);
    setNote("");
    setReason(null);
    setDetails("");
  }, [event]);

  const needSignIn = () => {
    onInfo("Sign in to do that.");
  };

  const sheet = (() => {
    if (!event) return null;
    const isHidden = hiddenEventIds.includes(event.id);
    const link = eventLink(event.id);
    const when = `${formatEventDay(event.date, event.timezone, { withYear: false })} · ${formatEventClock(event.date, event.timezone)}`;
    const shareText = `${event.name}\n${when}${event.place ? ` · ${event.place}` : ""}\n${link}`;

    const messageOrganizer = async () => {
      if (!isSignedIn) return needSignIn();
      setBusy("organizer");
      try {
        const chat = await startOrganizerChat(event.id);
        onClose();
        setThread({
          id: chat.id,
          title: chat.title,
          subtitle: "Event organiser",
          about: asShared(event)
        });
      } catch (error) {
        onError(errorText(error, "We couldn't reach the organiser right now."));
      } finally {
        setBusy(null);
      }
    };

    const toggleSave = async () => {
      if (!isSignedIn) return needSignIn();
      const next = !saved;
      setSaved(next); // show it straight away; put it back if the api says no
      setBusy("save");
      try {
        await toggleSavedEvent(event.id);
        onSuccess(next ? "Saved to your events" : "Removed from saved");
        void queryClient.invalidateQueries({ queryKey: ["live-events"] });
      } catch (error) {
        setSaved(!next);
        onError(errorText(error, "Couldn't update your saved events."));
      } finally {
        setBusy(null);
      }
    };

    const copyLink = async () => {
      try {
        await Clipboard.setStringAsync(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        onError("Couldn't copy the link.");
      }
    };

    const hide = async () => {
      if (!isSignedIn) return needSignIn();
      onClose();
      try {
        const nowHidden = await toggleHidden(event.id);
        onInfo(
          nowHidden
            ? "Event hidden. You won't see it in your feeds."
            : "Event restored"
        );
        void queryClient.invalidateQueries({ queryKey: ["live-events"] });
      } catch (error) {
        onError(errorText(error, "Couldn't update hidden events."));
      }
    };

    const openDestination = (
      destination: "whatsapp" | "facebook" | "x" | "email"
    ) => {
      const text = encodeURIComponent(shareText);
      const urls = {
        whatsapp: `https://wa.me/?text=${text}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
        x: `https://twitter.com/intent/tweet?text=${text}`,
        email: `mailto:?subject=${encodeURIComponent(event.name)}&body=${text}`
      };
      Linking.openURL(urls[destination]).catch(() =>
        onError("Couldn't open that app.")
      );
    };

    const shareToChat = async (chatId: string, chatName: string) => {
      setSendingTo(chatId);
      try {
        await sendChatMessage(chatId, {
          body: note.trim() || "Check out this event",
          sharedEventId: event.id
        });
        void queryClient.invalidateQueries({ queryKey: ["live-chats"] });
        void queryClient.invalidateQueries({
          queryKey: ["live-chat-messages", chatId]
        });
        onSuccess(`Shared with ${chatName}`);
        onClose();
      } catch (error) {
        onError(errorText(error, "Couldn't share the event."));
      } finally {
        setSendingTo(null);
      }
    };

    const submitReport = async () => {
      if (!reason || (reason === "other" && !details.trim())) return;
      setReporting(true);
      try {
        await reportEvent(event.id, {
          reason,
          details: details.trim() || undefined
        });
        onSuccess("Report submitted. Thank you.");
        onClose();
      } catch (error) {
        onError(
          errorText(error, "We couldn't send your report. Please try again.")
        );
      } finally {
        setReporting(false);
      }
    };

    if (view === "report") {
      const canSend = !!reason && (reason !== "other" || !!details.trim());
      return (
        <View>
          <Header title="Report this event" onBack={() => setView("actions")} />
          <TextComponent className="text-sm text-zinc-600">
            Why are you reporting this event? The organiser won't see who sent
            it.
          </TextComponent>
          <ScrollView
            className="mt-2 max-h-72"
            showsVerticalScrollIndicator={false}
          >
            {REPORT_REASONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setReason(option.value)}
                className="flex-row items-center border-b border-zinc-100 py-3"
              >
                <View
                  className={
                    reason === option.value
                      ? "size-5 items-center justify-center rounded-full border border-primary"
                      : "size-5 rounded-full border border-zinc-300"
                  }
                >
                  {reason === option.value && (
                    <View className="size-3 rounded-full bg-primary" />
                  )}
                </View>
                <TextComponent className="ml-3 text-sm text-zinc-700">
                  {option.label}
                </TextComponent>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            value={details}
            onChangeText={setDetails}
            multiline
            placeholder={
              reason === "other"
                ? "Tell us what's wrong (required)"
                : "Tell us more (optional)"
            }
            placeholderTextColor="#a1a1aa"
            className="mt-3 min-h-20 rounded-xl bg-zinc-100 px-3 py-3 text-sm text-zinc-800"
          />
          <Pressable
            disabled={!canSend || reporting}
            onPress={() => void submitReport()}
            className={
              canSend
                ? "mt-4 h-12 items-center justify-center rounded-xl bg-primary"
                : "mt-4 h-12 items-center justify-center rounded-xl bg-zinc-300"
            }
          >
            {reporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <TextComponent className="font-bold text-white">
                Submit report
              </TextComponent>
            )}
          </Pressable>
        </View>
      );
    }

    if (view === "pick") {
      const list = chats.data ?? [];
      return (
        <View>
          <Header
            title="Share with a Turnupz user"
            onBack={() => setView("actions")}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)"
            placeholderTextColor="#a1a1aa"
            className="mb-2 h-11 rounded-xl bg-zinc-100 px-3 text-sm text-zinc-800"
          />
          {chats.isLoading ? (
            <ActivityIndicator className="my-8" color={BLUE} />
          ) : !list.length ? (
            <TextComponent className="my-8 text-center text-sm text-zinc-500">
              {chats.error
                ? "We couldn't load your chats."
                : "No chats yet. Join an event's chat or message an organiser first."}
            </TextComponent>
          ) : (
            <ScrollView
              className="max-h-80"
              showsVerticalScrollIndicator={false}
            >
              {list.map((chat) => (
                <Pressable
                  key={chat.id}
                  disabled={!!sendingTo}
                  onPress={() => void shareToChat(chat.id, chat.eventName)}
                  className="flex-row items-center gap-3 border-b border-zinc-100 py-3"
                >
                  <View className="size-10 items-center justify-center rounded-full bg-blue-50">
                    {chat.type === "DIRECT" ? (
                      <UserOutlineIcon size={16} color={BLUE} />
                    ) : (
                      <MessageIcon size={16} color={BLUE} />
                    )}
                  </View>
                  <View className="flex-1">
                    <TextComponent
                      numberOfLines={1}
                      className="text-sm font-semibold text-zinc-900"
                    >
                      {chat.eventName}
                    </TextComponent>
                    <TextComponent
                      numberOfLines={1}
                      className="text-xs text-zinc-500"
                    >
                      {chat.type === "DIRECT"
                        ? "Private chat"
                        : `${chat.memberCount ?? 0} member${chat.memberCount === 1 ? "" : "s"}`}
                    </TextComponent>
                  </View>
                  {sendingTo === chat.id ? (
                    <ActivityIndicator color={BLUE} />
                  ) : (
                    <TextComponent className="text-sm font-bold text-primary">
                      Send
                    </TextComponent>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      );
    }

    if (view === "share") {
      return (
        <View>
          <Header title="Share event" onBack={() => setView("actions")} />
          <Pressable
            onPress={() => (isSignedIn ? setView("pick") : needSignIn())}
            className="h-14 flex-row items-center rounded-xl bg-blue-50 px-4"
          >
            <MessageIcon size={18} color={BLUE} />
            <View className="ml-3">
              <TextComponent className="text-sm font-bold text-primary">
                Share with a Turnupz user
              </TextComponent>
              <TextComponent className="text-xs text-zinc-500">
                Choose a chat or group
              </TextComponent>
            </View>
          </Pressable>
          <TextComponent className="pb-1 pt-4 text-[11px] font-bold uppercase text-zinc-400">
            Share externally
          </TextComponent>
          <View className="gap-2">
            {(
              [
                ["whatsapp", "WhatsApp"],
                ["facebook", "Facebook"],
                ["x", "X"],
                ["email", "Email"]
              ] as const
            ).map(([destination, label]) => (
              <Pressable
                key={destination}
                onPress={() => openDestination(destination)}
                className="h-11 justify-center rounded-xl bg-zinc-100 px-4"
              >
                <TextComponent className="text-sm font-semibold text-zinc-700">
                  {label}
                </TextComponent>
              </Pressable>
            ))}
            <Pressable
              onPress={() =>
                void Share.share({
                  title: event.name,
                  message: shareText
                }).catch(() => onError("Couldn't open sharing options."))
              }
              className="h-11 justify-center rounded-xl bg-zinc-100 px-4"
            >
              <TextComponent className="text-sm font-semibold text-zinc-700">
                More apps…
              </TextComponent>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <>
        {/* Which event this is about. */}
        <View className="mb-3 flex-row items-center gap-3 border-b border-black/5 pb-4">
          <View className="size-14 overflow-hidden rounded-2xl bg-[#eef6ff]">
            {!!event.image && (
              <CustomImage
                className="size-full"
                imageClassName="size-full"
                source={{ uri: event.image }}
                contentFit="cover"
              />
            )}
          </View>
          <View className="flex-1">
            <TextComponent
              numberOfLines={1}
              className="text-base font-bold text-zinc-950"
            >
              {event.name}
            </TextComponent>
            <TextComponent numberOfLines={1} className="text-sm text-zinc-500">
              {when}
              {event.place ? ` · ${event.place}` : ""}
            </TextComponent>
          </View>
        </View>
        <Action
          icon={<MessageIcon size={16} color={MUTED} />}
          label="Message event organizer"
          hint="Ask a question about this event"
          busy={busy === "organizer"}
          onPress={() => void messageOrganizer()}
        />
        <Action
          icon={<UserOutlineIcon size={16} color={MUTED} />}
          label="Share with community"
          hint="Send it to a chat or group on Turnupz"
          onPress={() => (isSignedIn ? setView("pick") : needSignIn())}
        />
        <Action
          icon={
            <HeartOutlineIcon size={16} color={saved ? "#ffffff" : MUTED} />
          }
          label={saved ? "Remove from saved" : "Save event"}
          selected={saved}
          busy={busy === "save"}
          onPress={() => void toggleSave()}
        />
        <View className="mt-4 flex-row justify-between">
          <Quick
            label={copied ? "Copied!" : "Copy"}
            icon={
              copied ? (
                <CheckIcon size={18} color={BLUE} />
              ) : (
                <CopyIcon size={17} color={MUTED} />
              )
            }
            onPress={() => void copyLink()}
          />
          <Quick
            label="Share Via..."
            icon={<SendIcon size={17} color={MUTED} />}
            onPress={() => setView("share")}
          />
          <Quick
            label={isHidden ? "Unhide" : "Hide"}
            icon={
              isHidden ? (
                <EyeOutlineIcon size={18} color={MUTED} />
              ) : (
                <EyeSlashOutlineIcon size={18} color={MUTED} />
              )
            }
            onPress={() => void hide()}
          />
          <Quick
            label="Report"
            icon={<CircleExclamationIcon size={17} color={MUTED} />}
            onPress={() => setView("report")}
          />
        </View>
      </>
    );
  })();

  return (
    <>
      <Modal
        visible={!!event}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            className="flex-1 bg-black/40"
            onPress={onClose}
            accessibilityLabel="Close"
          />
          {!!sheet && (
            <SafeAreaView edges={["bottom"]} className="rounded-t-3xl bg-white">
              <View className="px-5 pb-4">
                <View className="items-center pb-4 pt-3">
                  <View className="h-1.5 w-10 rounded-full bg-zinc-200" />
                </View>
                {sheet}
              </View>
            </SafeAreaView>
          )}
        </KeyboardAvoidingView>
      </Modal>
      <ChatThreadScreen
        chatId={thread?.id ?? null}
        title={thread?.title ?? ""}
        subtitle={thread?.subtitle}
        aboutEvent={thread?.about}
        onClose={() => setThread(null)}
        onOpenEvent={
          onOpenEvent
            ? (eventId) => {
                setThread(null);
                onOpenEvent(eventId);
              }
            : undefined
        }
      />
    </>
  );
};

export default memo(EventOptionsSheet);
