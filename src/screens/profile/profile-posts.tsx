import ClipPlayer from "@/shared/components/video/clip-player";
import React, { memo, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeModal from "@/shared/components/modals/safe-modal";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { TPost, deletePost, removeMyTag, setMyTagHidden, taggedLine, useProfilePosts, useRefreshPosts } from "./posts-api";
import { PostActions } from "./post-social";
import { EventPill, MediaDots, PostPhotoFrame, PostViewerHeader } from "./post-parts";
import { ClipTile } from "./clip-tile";
import NewPostSheet from "./new-post.sheet";

const GAP = 6;

/**
 * One post, full screen: swipe through its photos, caption, event and who's
 * tagged. Delete for your own; for one you're tagged in, hide it from your
 * profile or take yourself off it.
 */
const PostViewer = ({ post, onClose, onChanged }: { post: TPost; onClose: () => void; onChanged: () => void }) => {
  const insets = useSafeAreaInsets();
  const { width: screen } = useWindowDimensions();
  // The frame's real width (inset from the edges), measured once it's laid out.
  const [width, setWidth] = useState(Math.floor(screen - 32));
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const remove = () =>
    Alert.alert("Delete this post?", post.event ? "It goes from your profile and the event page." : "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          deletePost(post.id)
            .then(() => {
              onSuccess("Deleted");
              onChanged();
            })
            .catch((error) => onError(constructErrorMessage(error as TApiErrorResponseType, "Couldn't delete it.")))
            .finally(() => setBusy(false));
        }
      }
    ]);

  const run = (action: Promise<unknown>, done: string) => {
    setBusy(true);
    action
      .then(() => {
        onSuccess(done);
        onChanged();
      })
      .catch((error) => onError(constructErrorMessage(error as TApiErrorResponseType, "Couldn't do that.")))
      .finally(() => setBusy(false));
  };

  // You're tagged in it (and it isn't yours): hide it, or take yourself off.
  const tagOptions = () =>
    Alert.alert(`${post.author.name} tagged you`, undefined, [
      post.myTag?.hidden
        ? { text: "Show on my profile", onPress: () => run(setMyTagHidden(post.id, false), "Back on your profile") }
        : { text: "Hide from my profile", onPress: () => run(setMyTagHidden(post.id, true), "Hidden from your profile") },
      { text: "Remove me from this post", style: "destructive", onPress: () => run(removeMyTag(post.id), "You're no longer tagged") },
      { text: "Cancel", style: "cancel" }
    ]);

  // Your own: delete. Tagged in someone else's: hide it from your profile, or take yourself off.
  const options = post.mine
    ? remove
    : post.myTag
      ? tagOptions
      : undefined;

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom }}>
      <PostViewerHeader
        name={post.author.name}
        image={post.author.image}
        when={post.createdAt}
        onMore={options}
        busy={busy}
        onClose={onClose}
      />
      <PostPhotoFrame onWidth={setWidth}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        >
          {post.media.map((item, i) => (
            <View key={item.id} style={{ width, aspectRatio: 4 / 5 }}>
              {item.type === "video" ? (
                <ClipPlayer uri={item.url} active={i === index} />
              ) : (
                <CustomImage className="size-full" imageClassName="size-full" source={{ uri: item.url }} contentFit="cover" />
              )}
            </View>
          ))}
        </ScrollView>
        {!!post.event && <EventPill name={post.event.name} />}
        <MediaDots count={post.media.length} index={index} />
      </PostPhotoFrame>

      {!post.removed ? (
        <PostActions post={post} dark>
          {!!post.caption && <TextComponent className="text-[15px] leading-5 text-white">{post.caption}</TextComponent>}
          {post.tags.length > 0 && <TextComponent className="text-xs font-semibold text-white/70">{taggedLine(post.tags)}</TextComponent>}
        </PostActions>
      ) : (
        !!post.caption && <TextComponent className="px-4 pt-3 text-[15px] leading-5 text-white">{post.caption}</TextComponent>
      )}

      {/* Notes only the author (or the tagged person) sees. */}
      <View className="gap-1.5 px-4">
        {!!post.myTag?.hidden && <TextComponent className="text-xs text-white/60">Hidden from your profile. Only you see it here.</TextComponent>}
        {!!post.removed && (
          <TextComponent className="text-xs" style={{ color: "#FCA5A5" }}>
            {post.removed.byTeam ? `Taken down by our team: ${post.removed.reason ?? "it broke our rules"}.` : "Hidden after several reports while our team looks."} Only you can see it.
          </TextComponent>
        )}
        {!post.removed && post.hiddenFromEvent && (
          <TextComponent className="text-xs text-white/60">The organiser took it off their event. It's still on your profile.</TextComponent>
        )}
      </View>
    </View>
  );
};

/**
 * Your posts on your profile: a three-across 4:5 grid, newest first. Posts
 * linked to an event also show in its highlights; add them from the event page.
 */
const ProfilePosts = ({
  username,
  own = true,
  padded = true,
  events = [],
  which = "posts"
}: {
  username?: string | null;
  /** Someone else's profile: a plainer empty note. */
  own?: boolean;
  /** Off when the screen already pads its content (20 each side). */
  padded?: boolean;
  /** Your own profile: events you can still post to. */
  events?: { id: string; name: string }[];
  /** Their posts, or the posts they're tagged in. */
  which?: "posts" | "tagged";
}) => {
  const { width } = useWindowDimensions();
  const posts = useProfilePosts(username, which);
  const refresh = useRefreshPosts(username);
  const [open, setOpen] = useState<TPost | null>(null);
  const [creating, setCreating] = useState(false);
  const newPost = own && which === "posts" ? (
    <>
      <Pressable
        onPress={() => setCreating(true)}
        accessibilityRole="button"
        className={`${padded ? "mx-5" : ""} mt-4 h-11 flex-row items-center justify-center gap-2 rounded-full`}
        style={{ backgroundColor: BRAND.blue }}
      >
        <TextComponent className="text-sm font-extrabold text-white">+ New post</TextComponent>
      </Pressable>
      <NewPostSheet visible={creating} onClose={() => setCreating(false)} events={events} />
    </>
  ) : null;
  const items = useMemo(() => posts.data?.pages.flatMap((page) => page.items) ?? [], [posts.data]);
  const tile = (width - 40 - GAP * 2) / 3;

  if (posts.isLoading) return <ActivityIndicator color={BRAND.blue} className="py-8" />;
  if (!items.length) {
    return (
      <>
      {newPost}
      <View className={`${padded ? "mx-5" : ""} mt-4 items-center rounded-3xl border border-dashed border-zinc-200 bg-white px-6 py-10`}>
        <TextComponent className="text-base font-bold text-zinc-950">{which === "tagged" ? "No tagged posts yet" : "No posts yet"}</TextComponent>
        {own && (
          <TextComponent className="mt-1 text-center text-sm text-zinc-500">
            {which === "tagged"
              ? "When friends tag you in a post, it shows here."
              : "Share photos and clips. Link one to an event you went to and it shows on the event page too."}
          </TextComponent>
        )}
      </View>
      </>
    );
  }

  return (
    <>
    {newPost}
    <View className={padded ? "px-5 pt-4" : "pt-4"}>
      <View className="flex-row flex-wrap" style={{ gap: GAP }}>
        {items.map((post) => {
          const first = post.media[0];
          return (
            <Pressable
              key={post.id}
              onPress={() => setOpen(post)}
              accessibilityRole="button"
              accessibilityLabel={post.caption ?? "Open post"}
              className="overflow-hidden rounded-xl bg-zinc-100"
              style={{ width: tile, aspectRatio: 4 / 5, opacity: post.removed || post.myTag?.hidden ? 0.5 : 1 }}
            >
              {first?.type === "video" ? (
                <ClipTile />
              ) : first ? (
                <CustomImage className="size-full" imageClassName="size-full" source={{ uri: first.url }} contentFit="cover" />
              ) : null}
              {post.media.length > 1 && (
                <View className="absolute right-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5">
                  <TextComponent className="text-[10px] font-extrabold text-white">{post.media.length}</TextComponent>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {posts.hasNextPage && (
        <Pressable onPress={() => void posts.fetchNextPage()} className="mt-4 h-11 items-center justify-center rounded-full border border-zinc-200 bg-white">
          {posts.isFetchingNextPage ? <ActivityIndicator color={BRAND.blue} /> : <TextComponent className="text-sm font-bold text-zinc-950">Show more</TextComponent>}
        </Pressable>
      )}
      <SafeModal visible={!!open} animationType="fade" onRequestClose={() => setOpen(null)}>
        {open && (
          <PostViewer
            post={open}
            onClose={() => setOpen(null)}
            onChanged={() => {
              setOpen(null);
              refresh();
            }}
          />
        )}
      </SafeModal>
    </View>
    </>
  );
};

export default memo(ProfilePosts);
