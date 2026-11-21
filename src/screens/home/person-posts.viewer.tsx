import ClipPlayer from "@/shared/components/video/clip-player";
import React, { memo, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeModal from "@/shared/components/modals/safe-modal";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";
import { PostActions } from "@/screens/profile/post-social";
import { EventPill, PostPhotoFrame, PostViewerHeader } from "@/screens/profile/post-parts";
import { TCircle, taggedLine, useProfilePosts } from "@/screens/profile/posts-api";

/**
 * Someone's recent posts, opened from their circle on Home: full screen, one
 * photo at a time with bars along the top. Tap the right side for the next,
 * the left for the one before; each post's caption, who's tagged, the event
 * and the like/comment/share bar sit under its photos.
 */
const PersonPostsViewer = ({
  person,
  onClose,
  onOpenEvent,
  onOpenPerson
}: {
  person: TCircle | null;
  onClose: () => void;
  onOpenEvent: (id: string) => void;
  onOpenPerson: (username: string) => void;
}) => {
  const insets = useSafeAreaInsets();
  const posts = useProfilePosts(person?.username);
  // Every photo of every post, newest post first, as pages.
  const pages = useMemo(
    () =>
      (posts.data?.pages.flatMap((page) => page.items) ?? [])
        .filter((post) => !post.removed)
        .flatMap((post) => post.media.map((media) => ({ post, media }))),
    [posts.data]
  );
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [person?.id]);
  const page = pages[Math.min(index, Math.max(0, pages.length - 1))];
  const next = () => (index < pages.length - 1 ? setIndex(index + 1) : onClose());
  const back = () => setIndex(Math.max(0, index - 1));

  return (
    <SafeModal visible={!!person} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black" style={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom }}>
        {/* One bar per photo; the ones seen are filled. */}
        <View className="flex-row px-3" style={{ gap: 4 }}>
          {pages.map((item, i) => (
            <View key={`${item.post.id}-${item.media.id}`} className="h-[3px] flex-1 rounded-full" style={{ backgroundColor: i <= index ? "#FFFFFF" : "rgba(255,255,255,0.3)" }} />
          ))}
        </View>

        {!!person && (
          <PostViewerHeader
            name={person.name}
            image={person.image}
            when={page?.post.createdAt}
            onPressPerson={
              person.username
                ? () => {
                    onClose();
                    onOpenPerson(person.username!);
                  }
                : undefined
            }
            onClose={onClose}
          />
        )}

        {posts.isLoading ? (
          <ActivityIndicator color={BRAND.blue} className="mt-24" />
        ) : !page ? (
          <TextComponent className="mt-24 text-center text-sm text-white/70">No posts yet.</TextComponent>
        ) : (
          <>
            <PostPhotoFrame>
              <View style={{ aspectRatio: 4 / 5 }}>
                {page.media.type === "video" ? (
                  <ClipPlayer key={page.media.id} uri={page.media.url} />
                ) : (
                  <CustomImage className="size-full" imageClassName="size-full" source={{ uri: page.media.url }} contentFit="cover" />
                )}
                {/* Tap the left third to go back, anywhere else to go on (the foot
                    is left clear for a clip's sound button). */}
                <View className="absolute inset-x-0 top-0 flex-row" style={{ bottom: 64 }}>
                  <Pressable onPress={back} accessibilityLabel="Previous photo" style={{ flex: 1 }} />
                  <Pressable onPress={next} accessibilityLabel="Next photo" style={{ flex: 2 }} />
                </View>
                {!!page.post.event && (
                  <EventPill
                    name={page.post.event.name}
                    onPress={() => {
                      onClose();
                      onOpenEvent(page.post.event!.id);
                    }}
                  />
                )}
              </View>
            </PostPhotoFrame>
            {/* Keyed by post so the like and comments follow the post on show. */}
            <PostActions key={page.post.id} post={page.post} dark>
              {!!page.post.caption && <TextComponent className="text-[15px] leading-5 text-white">{page.post.caption}</TextComponent>}
              {page.post.tags.length > 0 && <TextComponent className="text-xs font-semibold text-white/70">{taggedLine(page.post.tags)}</TextComponent>}
            </PostActions>
          </>
        )}
      </View>
    </SafeModal>
  );
};

export default memo(PersonPostsViewer);
