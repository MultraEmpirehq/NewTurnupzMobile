import React, { memo, useMemo, useState } from "react";
import { initialsOf } from "@/shared/utils/initials";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeModal from "@/shared/components/modals/safe-modal";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import useUserStore from "@/shared/stores/user.store";
import { useConnections } from "@/screens/people/people-api";
import { useQueryClient } from "@tanstack/react-query";
import { createGroup } from "./group-api";


/**
 * People you follow who follow you back, to tick. Used by New group, Group
 * info's Add, and tagging people in a post.
 */
export const PeopleToAdd = memo(
  ({
    exclude = [],
    actionLabel,
    onDone,
    onCancel,
    busy = false,
    initial = [],
    emptyNote = "Only people who follow you back can be added here. Anyone else can join with the invite link."
  }: {
    exclude?: string[];
    /** Already ticked when it opens. */
    initial?: string[];
    /** Shown when nobody follows you back yet. */
    emptyNote?: string;
    actionLabel: string;
    onDone: (ids: string[]) => void;
    onCancel?: () => void;
    busy?: boolean;
  }) => {
    const username = useUserStore((state) => state.user?.username);
    const following = useConnections(username, "following");
    const [q, setQ] = useState("");
    const [chosen, setChosen] = useState<string[]>(initial);
    const people = useMemo(() => {
      const all = following.data?.pages.flatMap((page) => page.items) ?? [];
      const term = q.trim().toLowerCase().replace(/^@/, "");
      return all
        .filter((person) => person.followsYou && !exclude.includes(person.id))
        .filter((person) => !term || person.name.toLowerCase().includes(term) || person.username?.toLowerCase().includes(term));
    }, [following.data, q, exclude]);

    return (
      <View className="flex-1">
        <View className="mx-4 mt-3 h-11 flex-row items-center rounded-xl bg-white px-3">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search people you follow each other with"
            placeholderTextColor="#a1a1aa"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search people"
            className="flex-1 text-sm text-zinc-950"
          />
        </View>
        <FlatList
          data={people}
          keyExtractor={(person) => person.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => following.hasNextPage && void following.fetchNextPage()}
          renderItem={({ item }) => {
            const on = chosen.includes(item.id);
            return (
              <Pressable
                onPress={() => setChosen((current) => (on ? current.filter((id) => id !== item.id) : [...current, item.id]))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                className="mx-4 mb-1.5 flex-row items-center gap-3 rounded-2xl bg-white p-3"
              >
                {item.image ? (
                  <CustomImage className="size-10 rounded-full" imageClassName="size-full rounded-full" source={{ uri: item.image }} contentFit="cover" />
                ) : (
                  <View className="size-10 items-center justify-center rounded-full" style={{ backgroundColor: BRAND.blueTint }}>
                    <TextComponent className="text-xs font-extrabold" style={{ color: BRAND.blueDeep }}>{initialsOf(item.name)}</TextComponent>
                  </View>
                )}
                <View className="flex-1">
                  <TextComponent numberOfLines={1} className="text-sm font-bold text-zinc-950">{item.name}</TextComponent>
                  {!!item.username && <TextComponent numberOfLines={1} className="text-xs text-zinc-500">@{item.username}</TextComponent>}
                </View>
                <View
                  className="size-6 items-center justify-center rounded-full border"
                  style={{ borderColor: on ? BRAND.blue : "#D4D4D8", backgroundColor: on ? BRAND.blue : "transparent" }}
                >
                  {on && (
                    <Svg width={13} height={13} viewBox="0 0 24 24">
                      <Path d="M5 12l5 5 9-10" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  )}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            following.isLoading ? (
              <ActivityIndicator color={BRAND.blue} className="py-8" />
            ) : (
              <TextComponent className="mx-6 mt-4 text-center text-sm text-zinc-500">
                {q ? "Nobody matches that." : emptyNote}
              </TextComponent>
            )
          }
        />
        <View className="flex-row gap-2 px-4 pb-3 pt-2">
          {!!onCancel && (
            <Pressable onPress={onCancel} className="h-12 flex-1 items-center justify-center rounded-full border border-zinc-200 bg-white">
              <TextComponent className="text-sm font-bold text-zinc-950">Cancel</TextComponent>
            </Pressable>
          )}
          <Pressable
            onPress={() => onDone(chosen)}
            disabled={busy}
            className="h-12 flex-[2] items-center justify-center rounded-full"
            style={{ backgroundColor: BRAND.blue, opacity: busy ? 0.6 : 1 }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <TextComponent className="text-sm font-extrabold text-white">
                {actionLabel}
                {chosen.length ? ` (${chosen.length})` : ""}
              </TextComponent>
            )}
          </Pressable>
        </View>
      </View>
    );
  }
);
PeopleToAdd.displayName = "PeopleToAdd";

/** New group: a name, then who's in it. Opens the chat when it's made. */
const NewGroupSheet = ({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (id: string) => void }) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const make = async (memberIds: string[]) => {
    if (!name.trim()) {
      onError("Give the group a name");
      return;
    }
    setBusy(true);
    try {
      const made = await createGroup({ name: name.trim(), memberIds });
      if (!made) return;
      void queryClient.invalidateQueries({ queryKey: ["live-chats"] });
      onSuccess(made.skipped ? `Group made. ${made.skipped} need the invite link to join.` : "Group made");
      setName("");
      onCreated(made.id);
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "Couldn't make the group."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeModal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: "#F7F8FB", paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="h-14 flex-row items-center gap-2 border-b bg-white px-3" style={{ borderColor: "#EEF0F4" }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} className="size-9 items-center justify-center">
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={BRAND.ink} strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </Pressable>
          <TextComponent className="flex-1 text-lg font-bold text-zinc-950">New group</TextComponent>
        </View>
        <View className="mx-4 mt-4 rounded-2xl bg-white px-3.5 py-1">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Group name, e.g. Hiking crew"
            placeholderTextColor="#a1a1aa"
            maxLength={60}
            accessibilityLabel="Group name"
            className="h-12 text-base font-semibold text-zinc-950"
          />
        </View>
        <TextComponent className="mx-5 mt-2 text-xs text-zinc-500">Plan something with friends: a hike, a trip, a night out.</TextComponent>
        <PeopleToAdd actionLabel="Make group" onDone={(ids) => void make(ids)} busy={busy} />
      </View>
    </SafeModal>
  );
};

export default memo(NewGroupSheet);
