import React, { memo, useEffect, useRef, useState } from "react";
import { FlatList, Linking, Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import SafeModal from "@/shared/components/modals/safe-modal";
import TextComponent from "@/shared/components/text/text.component";

export type TMediaItem = { url: string; type?: string | null };

const VIDEO_URL = /\/video\/upload\/|\.(mp4|mov|webm|m4v)(\?|#|$)/i;

export const isVideo = (item: TMediaItem) =>
  item.type ? item.type.toUpperCase() === "VIDEO" : VIDEO_URL.test(item.url);

/** A still for a video: Cloudinary makes one from the same address. */
const posterFor = (url: string) =>
  url.includes("/video/upload/") ? url.replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, ".jpg") : null;

/** The gallery's items: typed when the event has them, else plain urls. */
export const mediaItemsOf = (
  details?: { url?: string; type?: string | null }[] | null,
  urls?: (string | undefined)[] | null
): TMediaItem[] => {
  const typed = (details ?? [])
    .filter((item): item is { url: string; type?: string | null } => !!item?.url)
    .map((item) => ({ url: item.url, type: item.type ?? null }));
  if (typed.length) return typed;
  return (urls ?? []).filter((url): url is string => !!url).map((url) => ({ url }));
};

const PlayMark = ({ size = 48 }: { size?: number }) => (
  <View
    className="items-center justify-center rounded-full bg-white/90"
    style={{ width: size, height: size }}
  >
    <Svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24">
      <Path d="M8 5v14l11-7z" fill="#09090b" />
    </Svg>
  </View>
);

/** A tile in the gallery: the photo, or the video's still with a play mark. */
export const MediaTile = ({
  item,
  height,
  onPress
}: {
  item: TMediaItem;
  height: number;
  onPress: () => void;
}) => {
  const video = isVideo(item);
  const poster = video ? posterFor(item.url) : item.url;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={video ? "Play video" : "Open photo"}
      className="w-full overflow-hidden rounded-xl bg-zinc-900"
      style={{ height }}
    >
      {!!poster && (
        <CustomImage
          className="size-full"
          imageClassName="size-full"
          source={{ uri: poster }}
          contentFit="cover"
          style={{ height }}
        />
      )}
      {video && (
        <View className="absolute inset-0 items-center justify-center bg-black/25">
          <PlayMark />
        </View>
      )}
    </Pressable>
  );
};

/**
 * Photos full size, swiped through one at a time. A video opens in the
 * phone's own player.
 */
export const MediaViewer = ({
  items,
  index,
  onClose
}: {
  items: TMediaItem[];
  index: number | null;
  onClose: () => void;
}) => {
  const { width, height } = useWindowDimensions();
  const list = useRef<FlatList<TMediaItem>>(null);
  const [at, setAt] = useState(index ?? 0);
  useEffect(() => {
    if (index !== null) setAt(index);
  }, [index]);

  return (
    <SafeModal visible={index !== null} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center justify-between px-4 py-2">
            <TextComponent className="text-sm font-semibold text-white">
              {at + 1} / {items.length}
            </TextComponent>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              className="size-10 items-center justify-center rounded-full bg-white/15"
            >
              <TextComponent className="text-xl text-white">✕</TextComponent>
            </Pressable>
          </View>
          {index !== null && (
            <FlatList
              ref={list}
              data={items}
              horizontal
              pagingEnabled
              initialScrollIndex={index}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, i) => `${item.url}-${i}`}
              onMomentumScrollEnd={(event) =>
                setAt(Math.round(event.nativeEvent.contentOffset.x / width))
              }
              renderItem={({ item }) => {
                const video = isVideo(item);
                const poster = video ? posterFor(item.url) : item.url;
                return (
                  <Pressable
                    disabled={!video}
                    onPress={() => void Linking.openURL(item.url)}
                    style={{ width, height: height * 0.8 }}
                    className="items-center justify-center"
                  >
                    {!!poster && (
                      <CustomImage
                        className="size-full"
                        imageClassName="size-full"
                        source={{ uri: poster }}
                        contentFit="contain"
                        style={{ width, height: height * 0.8 }}
                      />
                    )}
                    {video && (
                      <View className="absolute items-center gap-2">
                        <PlayMark size={64} />
                        <TextComponent className="text-xs font-semibold text-white">
                          Tap to play
                        </TextComponent>
                      </View>
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </SafeModal>
  );
};

export default memo(MediaViewer);
