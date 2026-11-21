import React, { memo, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Share, TextInput, View } from "react-native";
import { WEB_APP_URL } from "@env";
import RoundAvatar from "@/shared/components/images/round-avatar.component";
import { CommentIcon, HeartIcon, ShareIcon } from "@/shared/components/icons/social-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDistanceToNowStrict } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import SafeModal from "@/shared/components/modals/safe-modal";
import ModalKeyboardAvoider from "@/shared/components/modals/modal-keyboard-avoider";
import TextComponent from "@/shared/components/text/text.component";
import { onError } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { TComment, TPost, addPostComment, removePostComment, togglePostLike, usePostComments } from "./posts-api";

/** Liked or not and how many, answering a tap straight away and settling on what the server says. */
export const usePostLike = (post: TPost) => {
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likes);
  const toggle = (only?: "on") => {
    if (only === "on" && liked) return;
    const next = !liked;
    setLiked(next);
    setLikes((count) => count + (next ? 1 : -1));
    togglePostLike(post.id)
      .then((result) => {
        if (!result) return;
        setLiked(result.liked);
        setLikes(result.likes);
        void queryClient.invalidateQueries({ queryKey: ["posts", "user"] });
      })
      .catch((error) => {
        setLiked(!next);
        setLikes((count) => count + (next ? -1 : 1));
        onError(constructErrorMessage(error as TApiErrorResponseType, "Couldn't do that."));
      });
  };
  return { liked, likes, toggle };
};
export type TPostLike = ReturnType<typeof usePostLike>;

/** Shares a link to the person who posted it (and says where). */
export const sharePost = (post: TPost) => {
  const base = (WEB_APP_URL ?? "https://turnupz.com").replace(/\/$/, "");
  const link = post.author.username ? `${base}/people/${post.author.username}` : base;
  void Share.share({ message: `${post.author.name} on Turnupz${post.event ? ` at ${post.event.name}` : ""}: ${link}` });
};

/**
 * The one action bar under a post, wherever it shows (the feed, the full-screen
 * viewer): like, comment, share, then how many liked it and a way into the
 * comments. Pass `like` when the photo also likes on a double-tap, so both
 * share one state.
 */
export const PostActions = memo(
  ({ post, like: shared, dark = false, children }: { post: TPost; like?: TPostLike; dark?: boolean; children?: React.ReactNode }) => {
    const own = usePostLike(post);
    const like = shared ?? own;
    const [comments, setComments] = useState(post.comments);
    const [open, setOpen] = useState(false);
    const color = dark ? "#FFFFFF" : BRAND.ink;
    const muted = dark ? "rgba(255,255,255,0.7)" : "#71717A";

    return (
      <>
        <View className="flex-row items-center gap-5 px-4 pt-3">
          <Pressable onPress={() => like.toggle()} accessibilityRole="button" accessibilityLabel={like.liked ? "Unlike" : "Like"} hitSlop={8}>
            <HeartIcon color={color} filled={like.liked} size={27} />
          </Pressable>
          <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Comments" hitSlop={8}>
            <CommentIcon color={color} />
          </Pressable>
          <Pressable onPress={() => sharePost(post)} accessibilityRole="button" accessibilityLabel="Share" hitSlop={8}>
            <ShareIcon color={color} />
          </Pressable>
        </View>
        <View className="gap-1 px-4 pb-4 pt-2">
          {like.likes > 0 && (
            <TextComponent className="text-sm font-bold" style={{ color }}>
              {like.likes} {like.likes === 1 ? "like" : "likes"}
            </TextComponent>
          )}
          {children}
          <Pressable onPress={() => setOpen(true)} accessibilityRole="button" hitSlop={4}>
            <TextComponent className="text-sm" style={{ color: muted }}>
              {comments ? `View ${comments === 1 ? "1 comment" : `all ${comments} comments`}` : "Add a comment…"}
            </TextComponent>
          </Pressable>
        </View>
        <CommentsSheet
          postId={open ? post.id : null}
          likes={like.likes}
          onClose={() => setOpen(false)}
          onCountChange={(delta) => setComments((count) => Math.max(0, count + delta))}
        />
      </>
    );
  }
);
PostActions.displayName = "PostActions";

/** Comments on a post: read, write, reply, and remove your own (or any on your post). */
export const CommentsSheet = ({
  postId,
  likes,
  onClose,
  onCountChange
}: {
  postId: string | null;
  likes: number;
  onClose: () => void;
  onCountChange: (delta: number) => void;
}) => {
  const insets = useSafeAreaInsets();
  const list = usePostComments(postId);
  const items = useMemo(() => list.data?.pages.flatMap((page) => page.items) ?? [], [list.data]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<TComment | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!postId || !text.trim()) return;
    setSending(true);
    try {
      await addPostComment(postId, text.trim(), replyTo?.id);
      setText("");
      setReplyTo(null);
      onCountChange(1);
      void list.refetch();
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "Couldn't post your comment."));
    } finally {
      setSending(false);
    }
  };

  const remove = (comment: TComment) =>
    Alert.alert("Remove this comment?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          void removePostComment(comment.id)
            .then(() => {
              onCountChange(-1);
              void list.refetch();
            })
            .catch((error) => onError(constructErrorMessage(error as TApiErrorResponseType, "Couldn't remove it.")))
      }
    ]);

  return (
    <SafeModal visible={!!postId} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="Close comments" />
      <ModalKeyboardAvoider className="max-h-[80%]">
        <View className="rounded-t-3xl bg-white" style={{ paddingBottom: insets.bottom }}>
          <View className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-zinc-300" />
          <View className="flex-row items-baseline justify-between px-5 pb-2 pt-3">
            <TextComponent className="text-[17px] font-extrabold text-zinc-950">Comments</TextComponent>
            <TextComponent className="text-xs text-zinc-500">{likes} {likes === 1 ? "like" : "likes"}</TextComponent>
          </View>
          <FlatList
            data={items}
            keyExtractor={(comment) => comment.id}
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}
            onEndReached={() => list.hasNextPage && void list.fetchNextPage()}
            renderItem={({ item }) => (
              <View className="flex-row gap-2.5" style={item.parentId ? { marginLeft: 36 } : undefined}>
                <RoundAvatar uri={item.author.image} name={item.author.name} size={32} />
                <View className="flex-1">
                  <TextComponent className="text-[13px] text-zinc-950">
                    <TextComponent className="text-[13px] font-bold text-zinc-950">{item.author.username ?? item.author.name}</TextComponent>
                    {item.byPostAuthor ? <TextComponent className="text-[11px] font-bold" style={{ color: BRAND.blueDeep }}> · Author</TextComponent> : null}
                    <TextComponent className="text-[12px] text-zinc-500"> {Date.now() - new Date(item.createdAt).getTime() < 60_000 ? "just now" : formatDistanceToNowStrict(new Date(item.createdAt))}</TextComponent>
                  </TextComponent>
                  <TextComponent className={item.removed ? "mt-0.5 text-sm italic text-zinc-400" : "mt-0.5 text-sm leading-5 text-zinc-950"}>
                    {item.removed ? "Comment removed" : item.body}
                  </TextComponent>
                  {!item.removed && (
                    <View className="mt-1 flex-row gap-4">
                      <Pressable onPress={() => setReplyTo(item)} hitSlop={6} accessibilityRole="button">
                        <TextComponent className="text-xs font-bold text-zinc-500">Reply</TextComponent>
                      </Pressable>
                      {item.canRemove && (
                        <Pressable onPress={() => remove(item)} hitSlop={6} accessibilityRole="button">
                          <TextComponent className="text-xs font-bold text-zinc-500">Remove</TextComponent>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              list.isLoading ? (
                <ActivityIndicator color={BRAND.blue} className="py-8" />
              ) : (
                <TextComponent className="py-8 text-center text-sm text-zinc-500">No comments yet. Say something.</TextComponent>
              )
            }
          />
          {!!replyTo && (
            <View className="flex-row items-center justify-between bg-zinc-50 px-5 py-2">
              <TextComponent className="text-xs text-zinc-600">Replying to {replyTo.author.username ?? replyTo.author.name}</TextComponent>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8} accessibilityRole="button">
                <TextComponent className="text-xs font-bold text-zinc-600">Cancel</TextComponent>
              </Pressable>
            </View>
          )}
          <View className="flex-row items-center gap-2 border-t border-zinc-100 px-4 py-2.5">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment"
              placeholderTextColor="#71717A"
              maxLength={500}
              accessibilityLabel="Add a comment"
              className="h-11 flex-1 rounded-full bg-zinc-100 px-4 text-sm text-zinc-950"
            />
            <Pressable onPress={() => void send()} disabled={sending || !text.trim()} accessibilityRole="button" className="h-11 justify-center px-2">
              {sending ? (
                <ActivityIndicator color={BRAND.blue} />
              ) : (
                <TextComponent className="text-sm font-extrabold" style={{ color: text.trim() ? BRAND.blueDeep : "#A1A1AA" }}>Send</TextComponent>
              )}
            </Pressable>
          </View>
        </View>
      </ModalKeyboardAvoider>
    </SafeModal>
  );
};
