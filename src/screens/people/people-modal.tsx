import React, { memo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { create } from "zustand";
import TextComponent from "@/shared/components/text/text.component";
import { onError } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { ProfilePhoto } from "@/screens/profile/profile-photo";
import ChatThreadScreen from "@/screens/live/chat-thread.screen";
import {
  TPersonCard,
  startPersonChat,
  useConnections,
  useFollowPerson,
  usePeopleSearch,
  usePerson
} from "./people-api";

/**
 * People: someone's profile, who follows them and who they follow, and
 * finding people by name. One full-screen stack that any screen can open
 * (search, a chat, a notification); back steps through it. Two people who
 * follow each other can message each other from here.
 */

type TPage =
  | { kind: "person"; username: string }
  | { kind: "connections"; username: string; which: "followers" | "following" }
  | { kind: "search" };

type TPeopleNav = {
  stack: TPage[];
  openPerson: (username: string) => void;
  openConnections: (username: string, which: "followers" | "following") => void;
  openSearch: () => void;
  back: () => void;
  close: () => void;
};

export const usePeopleNav = create<TPeopleNav>((set) => ({
  stack: [],
  openPerson: (username) => set((state) => ({ stack: [...state.stack, { kind: "person", username }] })),
  openConnections: (username, which) =>
    set((state) => ({ stack: [...state.stack, { kind: "connections", username, which }] })),
  openSearch: () => set((state) => ({ stack: [...state.stack, { kind: "search" }] })),
  back: () => set((state) => ({ stack: state.stack.slice(0, -1) })),
  close: () => set({ stack: [] })
}));

const Header = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <View className="h-14 flex-row items-center gap-2 border-b bg-white px-3" style={{ borderColor: "#EEF0F4" }}>
    <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} className="size-9 items-center justify-center">
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M15 5l-7 7 7 7" fill="none" stroke={BRAND.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
    <TextComponent numberOfLines={1} className="flex-1 text-lg font-bold text-zinc-950">{title}</TextComponent>
  </View>
);

/** Follow / Following, kept in step everywhere. */
const FollowPill = ({ person, size = "md" }: { person: TPersonCard; size?: "sm" | "md" }) => {
  const follow = useFollowPerson();
  const [busy, setBusy] = useState(false);
  const on = person.isFollowing;
  const label = on ? "Following" : person.followsYou ? "Follow back" : "Follow";
  return (
    <Pressable
      onPress={async () => {
        setBusy(true);
        try {
          await follow(person.id);
        } catch (error) {
          onError(constructErrorMessage(error as TApiErrorResponseType, "That didn't work. Please try again."));
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${person.name}`}
      className={size === "sm" ? "h-8 min-w-24 items-center justify-center rounded-full px-3" : "h-10 flex-1 items-center justify-center rounded-xl"}
      style={on ? { backgroundColor: BRAND.white, borderWidth: 1, borderColor: "#DDE2EA" } : { backgroundColor: BRAND.blueDeep }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={on ? BRAND.blueDeep : BRAND.white} />
      ) : (
        <TextComponent className={size === "sm" ? "text-[12.5px] font-bold" : "text-sm font-bold"} style={{ color: on ? BRAND.ink : BRAND.white }}>
          {label}
        </TextComponent>
      )}
    </Pressable>
  );
};

const PersonRow = ({ person, onPress }: { person: TPersonCard; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" className="flex-row items-center gap-3 px-4 py-2.5">
    <ProfilePhoto uri={person.image} name={person.name} size={48} ringColor={BRAND.white} />
    <View className="flex-1">
      <TextComponent numberOfLines={1} className="text-[14.5px] font-bold text-zinc-950">{person.name}</TextComponent>
      <TextComponent numberOfLines={1} className="text-[12.5px] text-zinc-500">
        {[person.username ? `@${person.username}` : null, person.followsYou ? "Follows you" : null].filter(Boolean).join(" · ")}
      </TextComponent>
    </View>
    <FollowPill person={person} size="sm" />
  </Pressable>
);

const PersonPage = ({ username, onMessage }: { username: string; onMessage: (person: TPersonCard) => void }) => {
  const nav = usePeopleNav();
  const person = usePerson(username);
  const p = person.data;
  return (
    <View className="flex-1" style={{ backgroundColor: "#F7F8FB" }}>
      <Header title={p?.username ? `@${p.username}` : "Profile"} onBack={nav.back} />
      {person.isLoading ? (
        <ActivityIndicator className="mt-16" color={BRAND.blue} />
      ) : !p ? (
        <View className="mt-16 items-center px-10">
          <TextComponent className="text-center text-base font-bold text-zinc-950">We couldn't find this person</TextComponent>
          <TextComponent className="mt-1 text-center text-sm text-zinc-500">They may have changed their username.</TextComponent>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <View className="flex-row items-center gap-4">
            <ProfilePhoto uri={p.image} name={p.name} size={84} ringColor={BRAND.white} />
            <View className="flex-1">
              <TextComponent numberOfLines={2} className="text-[21px] font-extrabold leading-7 text-zinc-950">{p.name}</TextComponent>
              <TextComponent numberOfLines={1} className="mt-0.5 text-[13px] text-zinc-500">
                {[p.username ? `@${p.username}` : null, p.country].filter(Boolean).join(" · ")}
              </TextComponent>
              {!!p.bio && <TextComponent numberOfLines={3} className="mt-1.5 text-[13px] leading-[18px] text-zinc-700">{p.bio}</TextComponent>}
            </View>
          </View>

          <View className="mt-3 flex-row gap-4">
            <Pressable onPress={() => p.username && nav.openConnections(p.username, "followers")} accessibilityRole="button">
              <TextComponent className="text-[13.5px] text-zinc-500">
                <TextComponent className="text-[13.5px] font-extrabold text-zinc-950">{p.followers}</TextComponent> {p.followers === 1 ? "follower" : "followers"}
              </TextComponent>
            </Pressable>
            <Pressable onPress={() => p.username && nav.openConnections(p.username, "following")} accessibilityRole="button">
              <TextComponent className="text-[13.5px] text-zinc-500">
                <TextComponent className="text-[13.5px] font-extrabold text-zinc-950">{p.following}</TextComponent> following
              </TextComponent>
            </Pressable>
          </View>

          {!p.isMe && (
            <>
              <View className="mt-4 flex-row gap-2">
                <FollowPill person={p} />
                {p.canMessage && (
                  <Pressable
                    onPress={() => onMessage(p)}
                    accessibilityRole="button"
                    className="h-10 flex-1 items-center justify-center rounded-xl"
                    style={{ backgroundColor: BRAND.ink }}
                  >
                    <TextComponent className="text-sm font-bold text-white">Message</TextComponent>
                  </Pressable>
                )}
              </View>
              {!p.canMessage && (
                <TextComponent className="mt-2.5 text-[12.5px] text-zinc-500">
                  {p.followsYou
                    ? `${p.name.split(" ")[0]} follows you. Follow back and you can message each other.`
                    : p.isFollowing
                      ? `You can message each other once ${p.name.split(" ")[0]} follows you back.`
                      : "Follow each other to send messages."}
                </TextComponent>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const ConnectionsPage = ({ username, which }: { username: string; which: "followers" | "following" }) => {
  const nav = usePeopleNav();
  const [tab, setTab] = useState(which);
  const list = useConnections(username, tab);
  const items = (list.data?.pages ?? []).flatMap((page) => page.items);
  return (
    <View className="flex-1" style={{ backgroundColor: "#F7F8FB" }}>
      <Header title={`@${username}`} onBack={nav.back} />
      <View className="flex-row bg-white" style={{ borderBottomWidth: 1, borderBottomColor: "#E3E7ED" }}>
        {(["followers", "following"] as const).map((option) => {
          const on = option === tab;
          return (
            <Pressable
              key={option}
              onPress={() => setTab(option)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              className="flex-1 items-center py-3"
              style={on ? { borderBottomWidth: 2.5, borderBottomColor: BRAND.blue, marginBottom: -1 } : undefined}
            >
              <TextComponent className={on ? "text-sm font-bold text-zinc-950" : "text-sm font-bold text-zinc-400"}>
                {option === "followers" ? "Followers" : "Following"}
              </TextComponent>
            </Pressable>
          );
        })}
      </View>
      {list.isLoading ? (
        <ActivityIndicator className="mt-16" color={BRAND.blue} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => <PersonRow person={item} onPress={() => item.username && nav.openPerson(item.username)} />}
          onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
          ListEmptyComponent={
            <View className="mt-16 items-center px-10">
              <TextComponent className="text-center text-sm text-zinc-500">
                {tab === "followers" ? "No followers yet." : "Not following anyone yet."}
              </TextComponent>
            </View>
          }
        />
      )}
    </View>
  );
};

const SearchPage = () => {
  const nav = usePeopleNav();
  const [query, setQuery] = useState("");
  const results = usePeopleSearch(query);
  const typed = query.trim().replace(/^@/, "").length >= 2;
  return (
    <View className="flex-1" style={{ backgroundColor: "#F7F8FB" }}>
      <Header title="Find people" onBack={nav.back} />
      <View className="mx-4 mt-3 flex-row items-center gap-2 rounded-2xl border bg-white px-3.5" style={{ borderColor: "#EEF0F4", height: 44 }}>
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Circle cx={11} cy={11} r={7} fill="none" stroke="#9AA3AF" strokeWidth={2.2} />
          <Path d="m20 20-3.5-3.5" fill="none" stroke="#9AA3AF" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Name or @username"
          placeholderTextColor="#9AA3AF"
          className="flex-1 text-[14px] text-zinc-950"
        />
      </View>
      {!typed ? (
        <TextComponent className="mx-8 mt-10 text-center text-sm text-zinc-500">
          Find friends to follow. When you follow each other, you can send each other messages.
        </TextComponent>
      ) : results.isLoading ? (
        <ActivityIndicator className="mt-10" color={BRAND.blue} />
      ) : (
        <FlatList
          data={results.data ?? []}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => <PersonRow person={item} onPress={() => item.username && nav.openPerson(item.username)} />}
          ListEmptyComponent={<TextComponent className="mx-8 mt-10 text-center text-sm text-zinc-500">No one found. Try another name.</TextComponent>}
        />
      )}
    </View>
  );
};

/** Mounted once: shows whatever page is on top of the people stack. */
const PeopleModal = () => {
  const nav = usePeopleNav();
  const page = nav.stack[nav.stack.length - 1];
  const [chat, setChat] = useState<{ id: string; title: string } | null>(null);

  const message = async (person: TPersonCard) => {
    try {
      const opened = await startPersonChat(person.id);
      setChat({ id: opened.id, title: person.name });
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "We couldn't open that chat. Please try again."));
    }
  };

  return (
    <Modal visible={!!page} animationType="slide" onRequestClose={nav.back}>
      <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
        {page?.kind === "person" && <PersonPage key={`p-${page.username}-${nav.stack.length}`} username={page.username} onMessage={(person) => void message(person)} />}
        {page?.kind === "connections" && <ConnectionsPage key={`c-${page.username}-${nav.stack.length}`} username={page.username} which={page.which} />}
        {page?.kind === "search" && <SearchPage />}
        <ChatThreadScreen chatId={chat?.id ?? null} title={chat?.title ?? ""} onClose={() => setChat(null)} />
      </SafeAreaView>
    </Modal>
  );
};

export default memo(PeopleModal);
