import React, { memo, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import SafeModal from "@/shared/components/modals/safe-modal";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { TPickedMedia, createPost, pickedProblem } from "@/screens/live/highlights-api";
import { ClipTile } from "./clip-tile";
import { PeopleToAdd } from "@/screens/live/new-group.sheet";
import { useConnections } from "@/screens/people/people-api";
import useUserStore from "@/shared/stores/user.store";

const MAX_ITEMS = 10;

/**
 * New post from the profile: photos and clips, a caption, and (optionally)
 * an event you had a ticket for that ended in the last two weeks, which also
 * puts it on that event's page.
 */
const NewPostSheet = ({
  visible,
  onClose,
  events
}: {
  visible: boolean;
  onClose: () => void;
  /** Events they can still post to. */
  events: { id: string; name: string }[];
}) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<TPickedMedia[]>([]);
  const [caption, setCaption] = useState("");
  const [eventId, setEventId] = useState<string | null>(null);
  const [showName, setShowName] = useState(true);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  // People tagged in it, and the picker for them.
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagging, setTagging] = useState(false);
  const username = useUserStore((state) => state.user?.username);
  const following = useConnections(username, "following");
  const tagNames = useMemo(() => {
    const everyone = following.data?.pages.flatMap((page) => page.items) ?? [];
    return tagIds.map((id) => everyone.find((person) => person.id === id)?.name).filter(Boolean) as string[];
  }, [following.data, tagIds]);

  useEffect(() => {
    if (!visible) return;
    setPicked([]);
    setCaption("");
    setEventId(null);
    setShowName(true);
    setConsent(false);
    setTagIds([]);
    setTagging(false);
  }, [visible]);

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, MAX_ITEMS - picked.length),
      videoMaxDuration: 30,
      quality: 0.85
    });
    if (result.canceled) return;
    const next: TPickedMedia[] = result.assets.map((asset) => ({
      uri: asset.uri,
      type: asset.type === "video" ? "video" : "image",
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      durationMs: asset.duration,
      fileSize: asset.fileSize
    }));
    const problem = next.map(pickedProblem).find(Boolean);
    if (problem) onError(problem);
    setPicked([...picked, ...next.filter((item) => !pickedProblem(item))].slice(0, MAX_ITEMS));
  };

  const post = async () => {
    setSending(true);
    try {
      await createPost({ items: picked, caption, eventId: eventId ?? undefined, showName, consent, tagUserIds: tagIds });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      if (eventId) void queryClient.invalidateQueries({ queryKey: ["event-highlights", eventId] });
      onSuccess(eventId ? "Posted. It's on your profile and the event page." : "Posted");
      onClose();
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "Couldn't post it."));
    } finally {
      setSending(false);
    }
  };

  const canPost = picked.length > 0 && (!eventId || consent) && !sending;

  return (
    <SafeModal visible={visible} animationType="slide" onRequestClose={() => !sending && onClose()}>
      <View className="flex-1" style={{ backgroundColor: "#F7F8FB", paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="h-14 flex-row items-center gap-2 border-b bg-white px-3" style={{ borderColor: "#EEF0F4" }}>
          <Pressable onPress={onClose} disabled={sending} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} className="size-10 items-center justify-center">
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={BRAND.ink} strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </Pressable>
          <TextComponent className="flex-1 text-lg font-bold text-zinc-950">New post</TextComponent>
          <Pressable
            onPress={() => void post()}
            disabled={!canPost}
            accessibilityRole="button"
            className="h-9 justify-center rounded-full px-5"
            style={{ backgroundColor: BRAND.blue, opacity: canPost ? 1 : 0.5 }}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <TextComponent className="text-sm font-extrabold text-white">Post</TextComponent>}
          </Pressable>
        </View>

        {tagging ? (
          // Tag people: those who follow you back, ticked from a list.
          <PeopleToAdd
            initial={tagIds}
            actionLabel="Done"
            emptyNote="You can tag people who follow you back."
            onCancel={() => setTagging(false)}
            onDone={(ids) => {
              setTagIds(ids);
              setTagging(false);
            }}
          />
        ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {picked.map((item, index) => (
              <View key={item.uri + index} className="overflow-hidden rounded-2xl bg-zinc-200" style={{ width: 104, aspectRatio: 4 / 5 }}>
                {item.type === "video" ? (
                  <ClipTile />
                ) : (
                  <CustomImage className="size-full" imageClassName="size-full" source={{ uri: item.uri }} contentFit="cover" />
                )}
                <Pressable
                  onPress={() => setPicked(picked.filter((_, i) => i !== index))}
                  accessibilityRole="button"
                  accessibilityLabel="Remove"
                  className="absolute right-1.5 top-1.5 size-7 items-center justify-center rounded-full bg-black/65"
                >
                  <TextComponent className="text-sm font-bold text-white">×</TextComponent>
                </Pressable>
              </View>
            ))}
            {picked.length < MAX_ITEMS && (
              <Pressable
                onPress={() => void pick()}
                accessibilityRole="button"
                className="items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-white"
                style={{ width: 104, aspectRatio: 4 / 5 }}
              >
                <TextComponent className="text-2xl text-zinc-500">+</TextComponent>
                <TextComponent className="text-xs font-bold text-zinc-600">Add</TextComponent>
              </Pressable>
            )}
          </ScrollView>
          <TextComponent className="text-xs text-zinc-500">Up to {MAX_ITEMS} photos or clips; clips up to 30 seconds.</TextComponent>

          <View className="rounded-2xl bg-white px-3.5 py-2">
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Say something about it"
              placeholderTextColor="#71717A"
              multiline
              maxLength={500}
              accessibilityLabel="Caption"
              className="min-h-[64px] text-[15px] text-zinc-950"
            />
          </View>

          <Pressable
            onPress={() => setTagging(true)}
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3"
          >
            <View className="flex-1">
              <TextComponent className="text-xs font-bold text-zinc-500">TAG PEOPLE</TextComponent>
              <TextComponent numberOfLines={1} className="text-[15px] text-zinc-950">
                {tagNames.length ? tagNames.join(", ") : "Who's in it?"}
              </TextComponent>
            </View>
            <TextComponent className="text-sm font-bold text-link">{tagIds.length ? "Change" : "Add"}</TextComponent>
          </Pressable>

          {events.length > 0 && (
            <View className="overflow-hidden rounded-2xl bg-white">
              <TextComponent className="px-4 pt-3 text-xs font-bold text-zinc-500">EVENT (OPTIONAL)</TextComponent>
              {[{ id: null as string | null, name: "Not linked to an event" }, ...events].map((event) => {
                const on = eventId === event.id;
                return (
                  <Pressable
                    key={event.id ?? "none"}
                    onPress={() => setEventId(event.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    className="flex-row items-center gap-3 px-4 py-3"
                  >
                    <View className="size-5 items-center justify-center rounded-full border-2" style={{ borderColor: on ? BRAND.blue : "#D4D4D8" }}>
                      {on && <View className="size-2.5 rounded-full" style={{ backgroundColor: BRAND.blue }} />}
                    </View>
                    <TextComponent numberOfLines={1} className="flex-1 text-[15px] text-zinc-950">{event.name}</TextComponent>
                  </Pressable>
                );
              })}
              <TextComponent className="px-4 pb-3 text-xs text-zinc-500">Linked, it also shows on the event page. The organiser can take it off there.</TextComponent>
            </View>
          )}

          {!!eventId && (
            <>
              <View className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <View className="flex-1">
                  <TextComponent className="text-[15px] font-semibold text-zinc-950">Show my username on the event page</TextComponent>
                  <TextComponent className="text-xs text-zinc-500">Off: shown as "Someone who was there"</TextComponent>
                </View>
                <Switch value={showName} onValueChange={setShowName} trackColor={{ true: BRAND.blue, false: "#D4D4D8" }} />
              </View>
              <Pressable onPress={() => setConsent(!consent)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} className="flex-row items-start gap-2.5 px-1">
                <View className="mt-0.5 size-5 items-center justify-center rounded-md border-2" style={{ borderColor: consent ? BRAND.blue : "#A1A1AA", backgroundColor: consent ? BRAND.blue : "transparent" }}>
                  {consent && <TextComponent className="text-xs font-extrabold text-white">✓</TextComponent>}
                </View>
                <TextComponent className="flex-1 text-sm text-zinc-950">I took these, and anyone clearly in them is happy to be shared.</TextComponent>
              </Pressable>
            </>
          )}
        </ScrollView>
        )}
      </View>
    </SafeModal>
  );
};

export default memo(NewPostSheet);
