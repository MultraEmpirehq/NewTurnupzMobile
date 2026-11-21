import React, { memo, useEffect } from "react";
import SafeModal from "@/shared/components/modals/safe-modal";
import { Pressable, ScrollView, Share, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { WEB_APP_URL } from "@env";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import OverlayToast from "@/shared/components/status/toast/overlay-toast";
import { useBlogReadsStore } from "@/shared/stores/blog-reads.store";
import { BRAND } from "@/shared/utils/brand-colors";
import { formatEventDay } from "@/shared/utils/event-time";
import { TBlogPost, TLiveEvent } from "./live-api";

/** "2 hrs ago", "Yesterday", "12 Oct". */
export const postedAgo = (iso?: string) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  if (hours < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/** About 200 words a minute, never under a minute. */
const readingTime = (body: string) => Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));

/**
 * One blog post in full: the cover picture, who posted it and when, the whole
 * text and its other pictures, with the event kept in view at the bottom.
 * Opening it marks it read.
 */
const BlogPostScreen = ({
  post,
  event,
  bookLabel,
  canBook,
  onBook,
  onClose
}: {
  post: TBlogPost | null;
  event: TLiveEvent;
  bookLabel: string;
  canBook: boolean;
  onBook: () => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const markRead = useBlogReadsStore((state) => state.markRead);
  useEffect(() => {
    if (post) markRead(post.id);
  }, [post, markRead]);

  if (!post) return <SafeModal visible={false} />;
  const [cover, ...more] = post.images ?? [];
  const by = event.organizerName || "The organiser";
  const share = () =>
    Share.share({
      message: `${post.title} · ${event.name} on Turnupz: ${(WEB_APP_URL ?? "").replace(/\/$/, "")}/explore/event/${event.id}`
    }).catch(() => undefined);

  return (
    <SafeModal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {cover ? (
            <CustomImage className="h-64 w-full" imageClassName="size-full" source={{ uri: cover }} contentFit="cover" />
          ) : (
            <View className="h-28 w-full" style={{ backgroundColor: BRAND.blueTint }} />
          )}
          <View className="px-5 pt-4">
            <View className="flex-row items-center gap-2.5">
              <View className="size-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: BRAND.ink }}>
                <TextComponent className="text-xs font-extrabold" style={{ color: BRAND.link }}>
                  {by.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
                </TextComponent>
              </View>
              <View className="flex-1">
                <TextComponent numberOfLines={1} className="text-[13px] font-bold text-zinc-950">{by}</TextComponent>
                <TextComponent className="text-xs text-zinc-500">
                  Organiser · {postedAgo(post.createdAt)} · {readingTime(post.body)} min read
                </TextComponent>
              </View>
            </View>
            <TextComponent className="mt-3 text-[22px] font-extrabold leading-7 text-zinc-950">{post.title}</TextComponent>
            {!!post.excerpt && (
              <TextComponent className="mt-2 text-[15px] font-semibold leading-6 text-zinc-700">{post.excerpt}</TextComponent>
            )}
            <TextComponent className="mt-3 text-[15px] leading-6 text-zinc-800">{post.body}</TextComponent>
            {more.map((url) => (
              <CustomImage key={url} className="mt-3 h-52 w-full rounded-2xl" imageClassName="size-full rounded-2xl" source={{ uri: url }} contentFit="cover" />
            ))}
          </View>
        </ScrollView>

        {/* The event, one tap away. */}
        <View className="flex-row items-center gap-3 border-t bg-white px-4 py-3" style={{ borderColor: "#EEF0F4" }}>
          {!!event.image && (
            <CustomImage className="size-11 rounded-xl" imageClassName="size-full rounded-xl" source={{ uri: event.image }} contentFit="cover" />
          )}
          <View className="flex-1">
            <TextComponent numberOfLines={1} className="text-[13px] font-bold text-zinc-950">{event.name}</TextComponent>
            <TextComponent className="text-xs text-zinc-500">{formatEventDay(event.date, event.timezone, { withYear: false })}</TextComponent>
          </View>
          {canBook && (
            <Pressable onPress={onBook} accessibilityRole="button" className="rounded-full px-4 py-2.5" style={{ backgroundColor: BRAND.blueDeep }}>
              <TextComponent className="text-[13px] font-extrabold text-white">{bookLabel}</TextComponent>
            </Pressable>
          )}
        </View>

        {/* Back and share, over the cover picture. */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="absolute left-4 size-9 items-center justify-center rounded-full bg-white/90"
          style={{ top: insets.top + 8 }}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" fill="none" stroke={BRAND.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Pressable
          onPress={share}
          accessibilityRole="button"
          accessibilityLabel="Share this post"
          className="absolute right-4 size-9 items-center justify-center rounded-full bg-white/90"
          style={{ top: insets.top + 8 }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v13" fill="none" stroke={BRAND.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </SafeAreaView>
      <OverlayToast />
    </SafeModal>
  );
};

export default memo(BlogPostScreen);
