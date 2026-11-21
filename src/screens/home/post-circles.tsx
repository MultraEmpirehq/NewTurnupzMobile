import React, { memo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import RoundAvatar from "@/shared/components/images/round-avatar.component";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";
import NewPostSheet from "@/screens/profile/new-post.sheet";
import { TCircle, usePostCircles } from "@/screens/profile/posts-api";
import PersonPostsViewer from "./person-posts.viewer";

const SIZE = 60;
/** A circle with a post in the last day: the brand blue ring; older: grey. */
const ring = (circle: TCircle) => (circle.fresh ? BRAND.blue : BRAND.greyLine);

/**
 * The circles at the top of Home: you first (tap to see yours, "+" to post),
 * then the people you follow who posted this week, the most recent first.
 * Tapping one opens their posts full screen.
 */
const PostCircles = ({ onOpenEvent, onOpenPerson }: { onOpenEvent: (id: string) => void; onOpenPerson: (username: string) => void }) => {
  const circles = usePostCircles(true);
  const [open, setOpen] = useState<TCircle | null>(null);
  const [creating, setCreating] = useState(false);
  const me = circles.data?.me;
  const people = circles.data?.people ?? [];
  if (!me) return null;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: 16 }}>
        <View className="items-center" style={{ width: SIZE + 8 }}>
          <Pressable
            onPress={() => (me.posts ? setOpen(me) : setCreating(true))}
            accessibilityRole="button"
            accessibilityLabel={me.posts ? "Your posts" : "New post"}
          >
            <RoundAvatar uri={me.image} name={me.name} size={SIZE} ring={me.posts ? ring(me) : BRAND.greyLine} />
          </Pressable>
          <Pressable
            onPress={() => setCreating(true)}
            accessibilityRole="button"
            accessibilityLabel="New post"
            hitSlop={6}
            className="absolute size-6 items-center justify-center rounded-full border-2 border-white"
            style={{ right: 2, top: SIZE - 20, backgroundColor: BRAND.blue }}
          >
            <Svg width={12} height={12} viewBox="0 0 24 24">
              <Path d="M12 5v14M5 12h14" stroke="#FFFFFF" strokeWidth={3.2} strokeLinecap="round" />
            </Svg>
          </Pressable>
          <TextComponent numberOfLines={1} className="mt-1.5 text-[11px] font-semibold text-zinc-700">You</TextComponent>
        </View>
        {people.map((person) => (
          <Pressable
            key={person.id}
            onPress={() => setOpen(person)}
            accessibilityRole="button"
            accessibilityLabel={`${person.name}'s posts${person.fresh ? ", new" : ""}`}
            className="items-center"
            style={{ width: SIZE + 8 }}
          >
            <RoundAvatar uri={person.image} name={person.name} size={SIZE} ring={ring(person)} />
            <TextComponent numberOfLines={1} className="mt-1.5 text-[11px] font-semibold text-zinc-700">
              {person.name.split(" ")[0]}
            </TextComponent>
          </Pressable>
        ))}
      </ScrollView>
      <PersonPostsViewer person={open} onClose={() => setOpen(null)} onOpenEvent={onOpenEvent} onOpenPerson={onOpenPerson} />
      <NewPostSheet
        visible={creating}
        onClose={() => {
          setCreating(false);
          void circles.refetch();
        }}
        events={[]}
      />
    </>
  );
};

export default memo(PostCircles);
