import React, { memo, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Path, Svg } from "react-native-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import SafeModal from "@/shared/components/modals/safe-modal";
import ModalKeyboardAvoider from "@/shared/components/modals/modal-keyboard-avoider";
import OverlayToast from "@/shared/components/status/toast/overlay-toast";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import useUserStore from "@/shared/stores/user.store";
import {
  HIGHLIGHT_LIMITS,
  pickedProblem,
  reportHighlight,
  sendCrowdPhotos,
  THighlight,
  TPickedMedia,
  useEventHighlights,
  useRefreshHighlights
} from "./highlights-api";

const ACCENT = "#00B2FF";

const PlayIcon = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M8 5v14l11-7z" fill="#0b1b33" />
  </Svg>
);

const CameraIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
      stroke="#ffffff"
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="#ffffff" strokeWidth={2} />
  </Svg>
);

const clipLength = (seconds: number | null) => (seconds ? `0:${String(seconds).padStart(2, "0")}` : "");

/**
 * One photo or clip as a tile. Clips play in the phone's player (the app has
 * no video player of its own yet).
 */
const Tile = ({
  item,
  height,
  width,
  onOpen
}: {
  item: THighlight;
  height: number;
  width: number | `${number}%`;
  onOpen: () => void;
}) => (
  <Pressable
    onPress={onOpen}
    accessibilityRole="button"
    accessibilityLabel={item.type === "video" ? "Play clip" : item.by ? `Photo from ${item.by}` : "Photo"}
    className="overflow-hidden rounded-2xl bg-zinc-900"
    style={{ height, width }}
  >
    {item.type === "image" ? (
      <CustomImage className="size-full" imageClassName="size-full" source={{ uri: item.url }} contentFit="cover" />
    ) : (
      <View className="size-full items-center justify-center">
        <View className="size-12 items-center justify-center rounded-full bg-white/90">
          <PlayIcon size={18} />
        </View>
        {!!item.durationSeconds && (
          <TextComponent className="mt-2 text-xs font-bold text-white/80">{clipLength(item.durationSeconds)}</TextComponent>
        )}
      </View>
    )}
    {!!item.by && (
      <View className="absolute bottom-2 left-2 max-w-[90%] rounded-full bg-black/65 px-2.5 py-1">
        <TextComponent numberOfLines={1} className="text-[11px] font-bold text-white">
          {item.by}
        </TextComponent>
      </View>
    )}
  </Pressable>
);

/** A photo full screen, with report for fans' photos. */
const Viewer = ({ eventId, item, onClose }: { eventId: string; item: THighlight | null; onClose: () => void }) => {
  const signedIn = !!useUserStore((state) => state.userToken);
  const [reporting, setReporting] = useState(false);
  const report = async () => {
    if (!item) return;
    setReporting(true);
    try {
      await reportHighlight(eventId, item.id);
      onSuccess("Thanks for letting us know.");
      onClose();
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "Couldn't report it."));
    } finally {
      setReporting(false);
    }
  };
  return (
    <SafeModal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black">
        {!!item && (
          <>
            <CustomImage
              className="w-full"
              imageClassName="size-full"
              source={{ uri: item.url }}
              contentFit="contain"
              style={{ height: "75%" }}
            />
            <View className="flex-row items-center justify-between px-5 pt-4">
              <TextComponent numberOfLines={2} className="mr-3 flex-1 text-sm text-white/80">
                {[item.by, item.caption].filter(Boolean).join(" · ") || "From the organiser"}
              </TextComponent>
              {!item.fromOrganiser && signedIn && (
                <Pressable onPress={() => void report()} disabled={reporting} hitSlop={8} className="mr-4">
                  <TextComponent className="text-sm font-semibold text-white/70">Report</TextComponent>
                </Pressable>
              )}
              <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
                <TextComponent className="text-sm font-bold text-white">Close</TextComponent>
              </Pressable>
            </View>
          </>
        )}
      </View>
      <OverlayToast />
    </SafeModal>
  );
};

/** "Were you there?": pick photos and clips, then post them to the event. */
const AddPhotosSheet = ({
  eventId,
  eventName,
  remaining,
  visible,
  onClose
}: {
  eventId: string;
  eventName: string;
  remaining: number;
  visible: boolean;
  onClose: () => void;
}) => {
  const refresh = useRefreshHighlights(eventId);
  const [picked, setPicked] = useState<TPickedMedia[]>([]);
  const [caption, setCaption] = useState("");
  const [showName, setShowName] = useState(true);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setPicked([]);
    setCaption("");
    setConsent(false);
    setSent(0);
  }, [visible]);

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, remaining - picked.length),
      videoMaxDuration: HIGHLIGHT_LIMITS.clipSeconds,
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
    setPicked([...picked, ...next.filter((item) => !pickedProblem(item))].slice(0, remaining));
  };

  const send = async () => {
    setSending(true);
    try {
      await sendCrowdPhotos(eventId, { items: picked, caption, showName });
      setSent(picked.length);
      refresh();
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "Couldn't send them. Try again."));
    } finally {
      setSending(false);
    }
  };

  const canSend = picked.length > 0 && consent && !sending;

  return (
    <SafeModal visible={visible} transparent animationType="slide" onRequestClose={() => !sending && onClose()}>
      <Pressable className="flex-1 bg-black/40" onPress={() => !sending && onClose()} />
      <ModalKeyboardAvoider className="max-h-[90%]">
        <View className="shrink rounded-t-3xl bg-white px-5 pb-8 pt-5">
          {sent ? (
            <View className="items-center gap-3 py-4">
              <TextComponent className="text-xl font-bold text-zinc-950">Posted</TextComponent>
              <TextComponent className="text-center text-sm text-zinc-500">
                {sent === 1 ? "It's" : "They're"} on the {eventName} page and your profile.
              </TextComponent>
              <Pressable onPress={onClose} className="mt-2 h-12 w-full items-center justify-center rounded-xl" style={{ backgroundColor: ACCENT }}>
                <TextComponent className="font-bold text-white">Done</TextComponent>
              </Pressable>
            </View>
          ) : (
            <>
              <TextComponent className="text-lg font-bold text-zinc-950">Add your photos</TextComponent>
              <TextComponent className="mt-1 text-sm text-zinc-500">
                You can add {remaining} more. Clips up to {HIGHLIGHT_LIMITS.clipSeconds} seconds.
              </TextComponent>
              <ScrollView className="mt-4" keyboardShouldPersistTaps="handled">
                <View className="flex-row flex-wrap gap-2">
                  {picked.map((item, index) => (
                    <View key={`${item.uri}-${index}`} className="overflow-hidden rounded-xl bg-zinc-900" style={{ width: 96, height: 96 }}>
                      {item.type === "image" ? (
                        <CustomImage className="size-full" imageClassName="size-full" source={{ uri: item.uri }} contentFit="cover" />
                      ) : (
                        <View className="size-full items-center justify-center">
                          <PlayIcon />
                          <TextComponent className="mt-1 text-[11px] font-bold text-white/80">
                            {clipLength(Math.round((item.durationMs ?? 0) / 1000))}
                          </TextComponent>
                        </View>
                      )}
                      <Pressable
                        onPress={() => setPicked(picked.filter((_, i) => i !== index))}
                        accessibilityLabel="Remove"
                        hitSlop={6}
                        className="absolute right-1 top-1 size-6 items-center justify-center rounded-full bg-black/70"
                      >
                        <TextComponent className="text-xs font-bold text-white">×</TextComponent>
                      </Pressable>
                    </View>
                  ))}
                  {picked.length < remaining && (
                    <Pressable
                      onPress={() => void pick()}
                      className="items-center justify-center rounded-xl border-2 border-dashed border-zinc-300"
                      style={{ width: 96, height: 96 }}
                    >
                      <TextComponent className="text-sm font-semibold text-zinc-600">+ Add</TextComponent>
                    </Pressable>
                  )}
                </View>

                <TextComponent className="mt-4 text-xs font-semibold text-zinc-600">Caption (optional)</TextComponent>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={140}
                  placeholder="Front row for this one"
                  placeholderTextColor="#a1a1aa"
                  className="mt-2 h-12 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-950"
                />

                <View className="mt-4 flex-row items-center justify-between rounded-xl border border-zinc-200 p-3">
                  <View className="mr-3 flex-1">
                    <TextComponent className="text-sm font-semibold text-zinc-950">Show my username</TextComponent>
                    <TextComponent className="text-xs text-zinc-500">Off: posted as "Someone who was there"</TextComponent>
                  </View>
                  <Switch value={showName} onValueChange={setShowName} trackColor={{ true: ACCENT }} />
                </View>

                <Pressable
                  onPress={() => setConsent(!consent)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consent }}
                  className="mt-4 flex-row items-start gap-3"
                >
                  <View
                    className="mt-0.5 size-5 items-center justify-center rounded border"
                    style={{ borderColor: consent ? ACCENT : "#a1a1aa", backgroundColor: consent ? ACCENT : "transparent" }}
                  >
                    {consent && <TextComponent className="text-xs font-bold text-white">✓</TextComponent>}
                  </View>
                  <TextComponent className="flex-1 text-sm text-zinc-700">
                    I took these, and anyone clearly in them is happy to be shared.
                  </TextComponent>
                </Pressable>
              </ScrollView>

              <Pressable
                onPress={() => void send()}
                disabled={!canSend}
                className="mt-5 h-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: canSend ? ACCENT : "#bae6fd" }}
              >
                {sending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <TextComponent className="font-bold text-white">
                    {picked.length ? `Post ${picked.length}` : "Pick photos or clips"}
                  </TextComponent>
                )}
              </Pressable>
              <TextComponent className="mt-2 text-center text-xs text-zinc-500">
                Shows on the event page and your profile straight away. The organiser can take it off their event. If your profile is private, only your followers see it.
              </TextComponent>
            </>
          )}
        </View>
      </ModalKeyboardAvoider>
      <OverlayToast />
    </SafeModal>
  );
};

/**
 * On an ended event: the organiser's highlights, their thank-you line, and
 * photos from the crowd with "Were you there?" for ticket holders.
 */
const EventHighlights = ({ eventId, eventName, isPast }: { eventId: string; eventName: string; isPast: boolean }) => {
  const signedIn = !!useUserStore((state) => state.userToken);
  const { data } = useEventHighlights(eventId, isPast);
  const [viewing, setViewing] = useState<THighlight | null>(null);
  const [adding, setAdding] = useState(false);
  if (!data?.over) return null;

  const open = (item: THighlight) => {
    if (item.type === "video") void Linking.openURL(item.url);
    else setViewing(item);
  };
  const showAdd = data.crowdOpen && (!signedIn || !!data.me?.canAdd);
  const addPhotos = () => (signedIn ? setAdding(true) : onError("Sign in to add your photos."));

  return (
    <View className="mt-6 gap-5">
      {data.organiser.length > 0 && (
        <View>
          <TextComponent className="mb-2 text-base font-bold text-zinc-950">Highlights</TextComponent>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {data.organiser.map((item) => (
              <Tile key={item.id} item={item} height={180} width={150} onOpen={() => open(item)} />
            ))}
          </ScrollView>
        </View>
      )}

      {(!!data.recap || !!data.attendance) && (
        <View className="gap-2 rounded-2xl border border-zinc-200 bg-white p-4">
          <TextComponent className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#0077b3" }}>
            From the organiser
          </TextComponent>
          {!!data.recap && <TextComponent className="text-base font-bold text-zinc-950">“{data.recap}”</TextComponent>}
          {!!data.attendance && (
            <TextComponent className="text-sm font-semibold text-zinc-700">{data.attendance} turned up</TextComponent>
          )}
        </View>
      )}

      {(data.crowd.length > 0 || showAdd) && (
        <View>
          <TextComponent className="text-base font-bold text-zinc-950">From the crowd</TextComponent>
          <TextComponent className="mb-3 mt-0.5 text-xs text-zinc-500">
            From people who were there.
          </TextComponent>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {showAdd && (
              <Pressable
                onPress={addPhotos}
                accessibilityRole="button"
                className="items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3"
                style={{ width: "48%", height: 200, borderColor: "#7dd3fc", backgroundColor: "#f0faff" }}
              >
                <View className="size-11 items-center justify-center rounded-full" style={{ backgroundColor: ACCENT }}>
                  <CameraIcon />
                </View>
                <TextComponent className="text-sm font-extrabold text-zinc-950">Were you there?</TextComponent>
                <TextComponent className="text-center text-xs text-zinc-500">
                  {signedIn ? "Add your photos and clips" : "Sign in to add your photos"}
                </TextComponent>
              </Pressable>
            )}
            {data.crowd.map((item) => (
              <Tile key={item.id} item={item} height={200} width="48%" onOpen={() => open(item)} />
            ))}
          </View>
        </View>
      )}

      <Viewer eventId={eventId} item={viewing} onClose={() => setViewing(null)} />
      {!!data.me && (
        <AddPhotosSheet
          eventId={eventId}
          eventName={eventName}
          remaining={data.me.remaining}
          visible={adding}
          onClose={() => setAdding(false)}
        />
      )}
    </View>
  );
};

export default memo(EventHighlights);
