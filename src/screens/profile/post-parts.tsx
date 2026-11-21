import React, { memo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { formatDistanceToNowStrict } from "date-fns";
import RoundAvatar from "@/shared/components/images/round-avatar.component";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";

/**
 * The pieces every full-screen post view shares (opened from a profile or a
 * circle on Home), so they always look alike.
 */

export const postAgo = (date: string) =>
  Date.now() - new Date(date).getTime() < 60_000 ? "just now" : formatDistanceToNowStrict(new Date(date), { addSuffix: true });

/** Top of a full-screen post: who and when, then "⋯" (when there are options) and close. */
export const PostViewerHeader = memo(
  ({
    name,
    image,
    when,
    onPressPerson,
    onMore,
    busy = false,
    onClose
  }: {
    name: string;
    image: string | null;
    when?: string;
    onPressPerson?: () => void;
    onMore?: () => void;
    busy?: boolean;
    onClose: () => void;
  }) => (
    <View className="h-14 flex-row items-center gap-2 px-4">
      <Pressable
        onPress={onPressPerson}
        disabled={!onPressPerson}
        accessibilityRole="button"
        accessibilityLabel={`${name}'s profile`}
        className="flex-1 flex-row items-center gap-2.5"
      >
        <RoundAvatar uri={image} name={name} size={34} />
        <View className="flex-1">
          <TextComponent numberOfLines={1} className="text-[15px] font-bold text-white">{name}</TextComponent>
          {!!when && <TextComponent className="text-xs text-white/70">{postAgo(when)}</TextComponent>}
        </View>
      </Pressable>
      {!!onMore && (
        <Pressable onPress={onMore} disabled={busy} accessibilityRole="button" accessibilityLabel="Post options" hitSlop={8} className="size-10 items-center justify-center">
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View className="flex-row" style={{ gap: 3 }}>
              {[0, 1, 2].map((dot) => (
                <View key={dot} className="size-1.5 rounded-full bg-white" />
              ))}
            </View>
          )}
        </Pressable>
      )}
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} className="size-10 items-center justify-center">
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      </Pressable>
    </View>
  )
);
PostViewerHeader.displayName = "PostViewerHeader";

/**
 * The photo frame of a full-screen post: 16 in from each side, rounded like the
 * cards, so photos never touch the screen's edges. Reports its width, for
 * paging through more than one photo.
 */
export const PostPhotoFrame = memo(
  ({ children, onWidth }: { children: React.ReactNode; onWidth?: (width: number) => void }) => (
    <View
      className="mx-4 overflow-hidden rounded-3xl bg-zinc-900"
      onLayout={onWidth ? (event) => onWidth(event.nativeEvent.layout.width) : undefined}
    >
      {children}
    </View>
  )
);
PostPhotoFrame.displayName = "PostPhotoFrame";

/** Where a post is from, in the white pill event cards use for their category. */
export const EventPill = memo(({ name, onPress }: { name: string; onPress?: () => void }) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole="link"
    accessibilityLabel={`Open ${name}`}
    className="absolute left-3 top-3 max-w-[75%] flex-row items-center gap-1.5 rounded-full bg-white/90 py-1 pl-2.5 pr-3"
  >
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path
        d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"
        fill="none"
        stroke={BRAND.link}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    </Svg>
    <TextComponent numberOfLines={1} className="text-xs font-semibold text-zinc-900">{name}</TextComponent>
  </Pressable>
));
EventPill.displayName = "EventPill";

/** Dots over the foot of a photo when a post has more than one. */
export const MediaDots = memo(({ count, index }: { count: number; index: number }) =>
  count > 1 ? (
    <View pointerEvents="none" className="absolute bottom-3 left-0 right-0 flex-row justify-center" style={{ gap: 5 }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="rounded-full" style={{ width: i === index ? 16 : 6, height: 6, backgroundColor: i === index ? "#FFFFFF" : "rgba(255,255,255,0.5)" }} />
      ))}
    </View>
  ) : null
);
MediaDots.displayName = "MediaDots";
