import React, { memo, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getData, patchData, postData } from "@/api";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { formatEventDay } from "@/shared/utils/event-time";
import { usePeopleNav } from "@/screens/people/people-nav";
import { TLiveChat } from "./live-api";

/** Someone in an event's group chat. Chats show people by name and @username only. */
type TChatMember = {
  userId: string;
  name: string;
  username?: string | null;
  role: "vendor" | "scanner" | "attendee";
  profileImageUrl: string | null;
  muted: boolean;
};

const ROLE = {
  vendor: { label: "Organiser", background: BRAND.ink, color: "#ffffff" },
  scanner: { label: "Door team", background: BRAND.blueTint, color: BRAND.blueDeep }
} as const;

/** The members, or why they can't be shown (the organiser keeps the list private). */
const useChatMembers = (eventId?: string | null) =>
  useQuery({
    queryKey: ["chat-members", eventId],
    enabled: !!eventId,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await getData<TChatMember[]>(`/event/${eventId}/chat/members`);
        return { members: data?.data ?? [], hidden: false };
      } catch (error) {
        if ((error as { response?: { status?: number } })?.response?.status === 403) {
          return { members: [] as TChatMember[], hidden: true };
        }
        throw error;
      }
    }
  });

const initials = (name: string) =>
  name.replace(/^@/, "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

/**
 * Group info for an event's chat: the event, who's in it (name, @username and
 * whether they're the organiser or on the door team, never email), muting it
 * for yourself, and for the organiser, reporting or removing someone. Opens
 * over the chat, so back returns to it.
 */
const GroupInfo = ({
  chat,
  iAmOrganiser,
  onOpenEvent,
  onClose
}: {
  chat: TLiveChat;
  iAmOrganiser: boolean;
  onOpenEvent?: (eventId: string) => void;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  // It lies over the whole chat, notch included, so it keeps clear of it itself.
  const insets = useSafeAreaInsets();
  const openPerson = usePeopleNav((state) => state.openPerson);
  const { data, isLoading, error, refetch } = useChatMembers(chat.eventId);
  const [q, setQ] = useState("");
  const members = useMemo(() => {
    const all = data?.members ?? [];
    // The organiser first, then the door team, then everyone by name.
    const order = { vendor: 0, scanner: 1, attendee: 2 } as const;
    const sorted = [...all].sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name));
    const term = q.trim().toLowerCase().replace(/^@/, "");
    return term
      ? sorted.filter((member) => member.name.toLowerCase().includes(term) || member.username?.toLowerCase().includes(term))
      : sorted;
  }, [data, q]);

  const toggleMute = () =>
    void patchData(`/chats/${chat.id}/mute`, { muted: !chat.muted })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["live-chats"] });
        onSuccess(chat.muted ? "Alerts are back on" : "Chat muted. You won't get alerts for it.");
      })
      .catch(() => onError("That didn't work. Please try again."));

  // The organiser's tools for one member: report them to Turnupz, or take them out of the chat.
  const manage = (member: TChatMember) =>
    Alert.alert(member.name, member.username ? `@${member.username}` : undefined, [
      ...(member.username ? [{ text: "View profile", onPress: () => openPerson(member.username!) }] : []),
      {
        text: "Report to Turnupz",
        onPress: () =>
          void postData(`/event-chat/${chat.id}/members/report`, { memberUserId: member.userId, reason: "Reported from the group chat" })
            .then(() => onSuccess("Reported. Our team will look at it."))
            .catch((failure) => onError(constructErrorMessage(failure as TApiErrorResponseType, "Couldn't report them.")))
      },
      {
        text: "Remove from chat",
        style: "destructive",
        onPress: () =>
          Alert.alert(`Remove ${member.name}?`, "They won't be able to read or post in this chat.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: () =>
                void postData(`/event-chat/${chat.id}/members/block`, { memberUserId: member.userId })
                  .then(() => {
                    onSuccess(`${member.name} was removed`);
                    void refetch();
                  })
                  .catch((failure) => onError(constructErrorMessage(failure as TApiErrorResponseType, "Couldn't remove them.")))
            }
          ])
      },
      { text: "Cancel", style: "cancel" }
    ]);

  const header = (
    <View>
      {/* The event */}
      <View className="items-center px-6 pb-4 pt-5">
        {chat.eventImage ? (
          <CustomImage className="size-20 rounded-2xl" imageClassName="size-full rounded-2xl" source={{ uri: chat.eventImage }} contentFit="cover" />
        ) : (
          <View className="size-20 rounded-2xl" style={{ backgroundColor: BRAND.blueTint }} />
        )}
        <TextComponent className="mt-3 text-center text-lg font-extrabold text-zinc-950">{chat.eventName || chat.title}</TextComponent>
        <TextComponent className="text-xs text-zinc-500">
          {[chat.eventDate ? formatEventDay(chat.eventDate, chat.eventTimezone, { withYear: false }) : null, `${chat.memberCount ?? 0} going`]
            .filter(Boolean)
            .join(" · ")}
        </TextComponent>
        <View className="mt-4 flex-row gap-2">
          {!!chat.eventId && !!onOpenEvent && (
            <Pressable onPress={() => onOpenEvent(chat.eventId!)} accessibilityRole="button" className="rounded-full px-4 py-2" style={{ backgroundColor: BRAND.blueDeep }}>
              <TextComponent className="text-xs font-extrabold text-white">Event page</TextComponent>
            </Pressable>
          )}
          <Pressable onPress={toggleMute} accessibilityRole="button" className="rounded-full border border-zinc-200 bg-white px-4 py-2">
            <TextComponent className="text-xs font-bold text-zinc-950">{chat.muted ? "Unmute" : "Mute"}</TextComponent>
          </Pressable>
        </View>
      </View>

      <View className="flex-row items-center justify-between px-4 pb-2">
        <TextComponent className="text-[11px] font-extrabold tracking-widest text-zinc-400">
          MEMBERS{data?.members.length ? ` · ${data.members.length}` : ""}
        </TextComponent>
      </View>
      {!!data?.members.length && data.members.length > 8 && (
        <View className="mx-4 mb-2 h-10 flex-row items-center rounded-xl bg-white px-3">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by name or @username"
            placeholderTextColor="#a1a1aa"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search members"
            className="flex-1 text-sm text-zinc-950"
          />
        </View>
      )}
      {iAmOrganiser && !!data?.members.length && (
        <TextComponent className="mx-4 mb-2 text-[11px] text-zinc-500">Tap someone to report them or remove them from the chat.</TextComponent>
      )}
    </View>
  );

  return (
    <View
      className="absolute inset-0"
      style={{ backgroundColor: "#F7F8FB", paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="h-14 flex-row items-center gap-2 border-b bg-white px-3" style={{ borderColor: "#EEF0F4" }}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Back to the chat" hitSlop={10} className="size-9 items-center justify-center">
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" fill="none" stroke={BRAND.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <TextComponent className="flex-1 text-lg font-bold text-zinc-950">Group info</TextComponent>
      </View>
      <FlatList
        data={members}
        keyExtractor={(member) => member.userId}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const role = item.role === "attendee" ? null : ROLE[item.role];
          return (
            <Pressable
              onPress={() => (iAmOrganiser && item.role !== "vendor" ? manage(item) : item.username ? openPerson(item.username) : undefined)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}${role ? `, ${role.label}` : ""}`}
              className="mx-4 mb-1.5 flex-row items-center gap-3 rounded-2xl bg-white p-3"
            >
              {item.profileImageUrl ? (
                <CustomImage className="size-10 rounded-full" imageClassName="size-full rounded-full" source={{ uri: item.profileImageUrl }} contentFit="cover" />
              ) : (
                <View className="size-10 items-center justify-center rounded-full" style={{ backgroundColor: item.role === "vendor" ? BRAND.ink : BRAND.blueTint }}>
                  <TextComponent className="text-xs font-extrabold" style={{ color: item.role === "vendor" ? BRAND.blue : BRAND.blueDeep }}>
                    {initials(item.name)}
                  </TextComponent>
                </View>
              )}
              <View className="flex-1">
                <TextComponent numberOfLines={1} className="text-sm font-bold text-zinc-950">{item.name}</TextComponent>
                {!!item.username && <TextComponent numberOfLines={1} className="text-xs text-zinc-500">@{item.username}</TextComponent>}
              </View>
              {!!role && (
                <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: role.background }}>
                  <TextComponent className="text-[10px] font-extrabold" style={{ color: role.color }}>{role.label}</TextComponent>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={BRAND.blue} className="py-8" />
          ) : data?.hidden ? (
            <View className="mx-4 rounded-2xl bg-white p-4">
              <TextComponent className="text-sm font-bold text-zinc-950">The member list is private</TextComponent>
              <TextComponent className="mt-0.5 text-xs text-zinc-500">
                The organiser keeps who's going private. You can still chat with everyone here.
              </TextComponent>
            </View>
          ) : error ? (
            <Pressable onPress={() => void refetch()} className="mx-4 rounded-2xl bg-white p-4">
              <TextComponent className="text-sm text-zinc-600">We couldn't load the members. Tap to try again.</TextComponent>
            </Pressable>
          ) : q ? (
            <TextComponent className="mx-4 text-sm text-zinc-500">No one matches “{q}”.</TextComponent>
          ) : null
        }
      />
    </View>
  );
};

export default memo(GroupInfo);
