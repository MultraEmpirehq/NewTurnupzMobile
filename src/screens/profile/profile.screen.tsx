import { useOrganiserAccess } from "@/screens/organiser/organiser-api";
import { useOrganiserStore } from "@/shared/stores/organiser.store";
import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Path, Svg } from "react-native-svg";
import { useQueryClient } from "@tanstack/react-query";
import TextComponent from "@/shared/components/text/text.component";
import RoundAvatar from "@/shared/components/images/round-avatar.component";
import { onError } from "@/shared/components/status/toast";
import useUserStore from "@/shared/stores/user.store";
import { useHiddenEventsStore } from "@/shared/stores/hidden-events.store";
import { BRAND } from "@/shared/utils/brand-colors";
import { formatEventDay } from "@/shared/utils/event-time";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import { constructErrorMessage } from "@/api/functions";
import EventTicketCard, {
  TICKET_LIST_BACKGROUND
} from "@/screens/live/event-ticket-card";
import EventOptionsSheet, {
  TEventOptionsTarget
} from "@/screens/live/event-options.sheet";
import {
  BackHeader,
  EmptyNote,
  Loading,
  PerformerAvatar,
  PerformerProfileScreen,
  PlannerDetailScreen,
  VenueDetailScreen
} from "@/screens/live/explore-details";
import {
  TLiveEvent,
  eventPlace,
  useCreditBalance,
  useLiveEvents,
  useLiveUserTickets,
  useLiveVenue,
  formatZero
} from "@/screens/live/live-api";
import FollowButton from "./follow-button";
import InviteFriendsCard, { inviteLink } from "./invite-friends.card";
import ProfileSettingsScreen from "./profile-settings.screen";
import EditProfileScreen from "./edit-profile.screen";
import WalletScreen from "./wallet.screen";
import { ProfilePhoto } from "./profile-photo";
import { usePeopleNav } from "@/screens/people/people-nav";
import { usePerson } from "@/screens/people/people-api";
import { maskAmount, useBalancePrivacyStore } from "@/shared/stores/balance-privacy.store";
import {
  TFollowedItem,
  uploadProfilePhoto,
  useFollows,
  useMe,
  useReferralMe
} from "./profile-api";
import { useEmptyCreditText } from "@/shared/hooks/use-empty-credit-text";

/**
 * Your profile: photo, name and bio over the blue banner, Edit and Share, your
 * numbers, your Turnupz Credit (opens your wallet) and invite code, then your
 * events: upcoming, past and saved. Settings sit behind the gear; Edit profile,
 * Wallet, Invite friends, Saved and Following open as their own pages, and
 * Android's back button steps out of each one.
 */

type TList = "saved" | "following";
type TPage = "edit" | "wallet" | "invite";
type TEventsTab = "tickets" | "saved" | "posts" | "tagged";

/** One event you have tickets for, and how many. */
type TMyEvent = { event: TLiveEvent; count: number };
type TDetail =
  | { kind: "performer"; id: string }
  | { kind: "venue"; id: string; name: string }
  | { kind: "planner"; id: string; name: string };

const FOLLOW_LABEL: Record<TFollowedItem["targetType"], string> = {
  PERFORMER: "Performer",
  VENUE: "Venue",
  PLANNER: "Event planner",
  PERSON: "Person"
};

const toOptions = (event: TLiveEvent): TEventOptionsTarget => ({
  id: event.id,
  name: event.name,
  date: event.date,
  timezone: event.timezone,
  image: event.image ?? event.medias?.[0],
  place: eventPlace(event),
  isFavorite: event.isFavorite
});

/** An event in your lists: picture, name, date and place, and a note on the right. */
const EventRow = ({
  event,
  note,
  onPress
}: {
  event: TLiveEvent;
  note?: string;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    className="mx-5 mt-2.5 flex-row items-center gap-3 rounded-2xl bg-white p-2.5"
  >
    <CustomImage
      className="size-14 rounded-xl"
      imageClassName="size-full rounded-xl"
      source={{ uri: event.image ?? event.medias?.[0] }}
      contentFit="cover"
    />
    <View className="flex-1">
      <TextComponent numberOfLines={1} className="text-sm font-bold text-zinc-950">
        {event.name}
      </TextComponent>
      <TextComponent numberOfLines={1} className="mt-0.5 text-xs text-zinc-500">
        {formatEventDay(event.date, event.timezone, { withYear: false })} · {eventPlace(event)}
      </TextComponent>
    </View>
    {!!note && (
      <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: BRAND.blueTint }}>
        <TextComponent className="text-[11px] font-bold" style={{ color: BRAND.blueDeep }}>
          {note}
        </TextComponent>
      </View>
    )}
  </Pressable>
);

/** A followed venue's page: its details load, its name shows meanwhile. */
const FollowedVenue = ({
  id,
  name,
  ...props
}: {
  id: string;
  name: string;
  onBack: () => void;
  onOpenEvent: (id: string) => void;
  onEventOptions: (event: TLiveEvent) => void;
}) => {
  const venue = useLiveVenue(id);
  return <VenueDetailScreen venue={venue.data ?? { id, name }} {...props} />;
};

const ProfileScreen = ({
  onOpenEvent,
  onOpenTickets
}: {
  onOpenEvent: (eventId: string) => void;
  /** My tickets; with an event, that event's passes open straight away. */
  onOpenTickets: (eventId?: string) => void;
}) => {
  const queryClient = useQueryClient();
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const me = useMe();
  const user = me.data;
  const hiddenEventIds = useHiddenEventsStore((state) => state.hiddenEventIds);

  const [showSettings, setShowSettings] = useState(false);
  const [page, setPage] = useState<TPage | null>(null);
  const [eventsTab, setEventsTab] = useState<TEventsTab>("tickets");
  const credit = useCreditBalance(isSignedIn);
  const openPerson = usePeopleNav((state) => state.openPerson);
  const openConnections = usePeopleNav((state) => state.openConnections);
  const myPeople = usePerson(user?.username);
  const hideBalance = useBalancePrivacyStore((state) => state.hideBalance);
  const toggleHideBalance = useBalancePrivacyStore((state) => state.toggleHideBalance);
  const referral = useReferralMe();
  const emptyCredit = useEmptyCreditText();
  const [list, setList] = useState<TList | null>(null);
  const [detail, setDetail] = useState<TDetail | null>(null);
  const [optionsEvent, setOptionsEvent] = useState<TEventOptionsTarget | null>(null);
  const [uploading, setUploading] = useState(false);

  const organiser = useOrganiserAccess();
  const setOrganiserMode = useOrganiserStore((state) => state.setMode);
  const tickets = useLiveUserTickets();
  const saved = useLiveEvents({ isFavorite: "true", limit: "50" }, isSignedIn);
  const follows = useFollows(isSignedIn);

  // The counts need every ticket, so the rest load in the background.
  useEffect(() => {
    if (tickets.hasNextPage && !tickets.isFetchingNextPage) void tickets.fetchNextPage();
  }, [tickets.hasNextPage, tickets.isFetchingNextPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Purchased tickets, events you registered for (free sign-ups), and every
  // event you hold tickets for, split into upcoming and past.
  const { purchased, registered, upcoming, past } = useMemo(() => {
    let bought = 0;
    const registeredEvents = new Set<string>();
    const byEvent = new Map<string, TMyEvent>();
    for (const ticketPage of tickets.data?.pages ?? []) {
      for (const ticket of ticketPage.tickets) {
        const event = ticket.ticket?.event;
        if (event?.saleMethod === "register") registeredEvents.add(event.id);
        else bought += 1;
        if (!event?.id) continue;
        const mine = byEvent.get(event.id);
        if (mine) mine.count += 1;
        else byEvent.set(event.id, { event, count: 1 });
      }
    }
    const now = Date.now();
    const all = [...byEvent.values()];
    return {
      purchased: bought,
      registered: registeredEvents.size,
      upcoming: all
        .filter((item) => new Date(item.event.date).getTime() >= now)
        .sort((a, b) => +new Date(a.event.date) - +new Date(b.event.date)),
      past: all
        .filter((item) => new Date(item.event.date).getTime() < now)
        .sort((a, b) => +new Date(b.event.date) - +new Date(a.event.date))
    };
  }, [tickets.data]);

  const savedEvents = useMemo(
    () =>
      (saved.data?.pages ?? [])
        .flatMap((page) => page.events)
        .filter((event) => !hiddenEventIds.includes(event.id)),
    [saved.data, hiddenEventIds]
  );
  const savedTotal = saved.data?.pages?.[0]?.pagination?.total ?? savedEvents.length;
  const followed = follows.data ?? [];

  const refresh = () => {
    void me.refetch();
    void tickets.refetch();
    void saved.refetch();
    void follows.refetch();
  };

  const changePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      await uploadProfilePhoto(result.assets[0]);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (error) {
      onError(
        constructErrorMessage(error as TApiErrorResponseType, "Couldn't upload that photo. Please try another.")
      );
    } finally {
      setUploading(false);
    }
  };

  const options = (
    <EventOptionsSheet
      event={optionsEvent}
      onClose={() => setOptionsEvent(null)}
      onOpenEvent={onOpenEvent}
    />
  );

  if (page === "edit" && user) {
    return (
      <EditProfileScreen
        user={user}
        uploading={uploading}
        onChangePhoto={() => void changePhoto()}
        onBack={() => setPage(null)}
      />
    );
  }
  if (page === "wallet") return <WalletScreen onBack={() => setPage(null)} />;
  if (page === "invite") {
    return (
      <View className="flex-1" style={{ backgroundColor: "#F7F8FB" }}>
        <BackHeader title="Invite friends" onBack={() => setPage(null)} />
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <InviteFriendsCard />
        </ScrollView>
      </View>
    );
  }

  if (showSettings) {
    return (
      <ProfileSettingsScreen
        onBack={() => {
          setShowSettings(false);
          void me.refetch();
        }}
        onOpenWallet={() => {
          setShowSettings(false);
          setPage("wallet");
        }}
      />
    );
  }

  if (detail) {
    const back = () => {
      setDetail(null);
      void follows.refetch();
    };
    return (
      <>
        {detail.kind === "performer" ? (
          <PerformerProfileScreen
            performerId={detail.id}
            onBack={back}
            onOpenEvent={onOpenEvent}
            onEventOptions={(event) => setOptionsEvent(toOptions(event))}
          />
        ) : detail.kind === "venue" ? (
          <FollowedVenue
            id={detail.id}
            name={detail.name}
            onBack={back}
            onOpenEvent={onOpenEvent}
            onEventOptions={(event) => setOptionsEvent(toOptions(event))}
          />
        ) : (
          <PlannerDetailScreen
            name={detail.name}
            organizerId={detail.id}
            onBack={back}
            onOpenEvent={onOpenEvent}
            onEventOptions={(event) => setOptionsEvent(toOptions(event))}
          />
        )}
        {options}
      </>
    );
  }

  // Saved events or who you follow, opened from the numbers.
  if (list === "saved") {
    return (
      <View className="flex-1" style={{ backgroundColor: TICKET_LIST_BACKGROUND }}>
        <BackHeader title="Saved events" onBack={() => setList(null)} />
        <FlatList
          data={savedEvents}
          keyExtractor={(event) => event.id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          renderItem={({ item: event }) => (
            <EventTicketCard
              name={event.name}
              date={event.date}
              timezone={event.timezone}
              image={event.image ?? event.medias?.[0]}
              category={event.category?.name}
              place={eventPlace(event)}
              onPress={() => onOpenEvent(event.id)}
              onMore={() => setOptionsEvent(toOptions(event))}
            />
          )}
          ListEmptyComponent={
            saved.isLoading ? <Loading /> : <EmptyNote title="Nothing saved yet" body="Tap ⋯ on any event and choose Save event." />
          }
          onEndReached={() => saved.hasNextPage && !saved.isFetchingNextPage && void saved.fetchNextPage()}
        />
        {options}
      </View>
    );
  }
  if (list === "following") {
    return (
      <View className="flex-1" style={{ backgroundColor: TICKET_LIST_BACKGROUND }}>
        <BackHeader title="Following" onBack={() => setList(null)} />
        <FlatList
          data={followed}
          keyExtractor={(item) => `${item.targetType}-${item.targetId}`}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                item.targetType === "PERSON"
                  ? item.subtitle && openPerson(item.subtitle.replace(/^@/, ""))
                  : setDetail(
                  item.targetType === "PERFORMER"
                    ? { kind: "performer", id: item.targetId }
                    : item.targetType === "VENUE"
                      ? { kind: "venue", id: item.targetId, name: item.name }
                      : { kind: "planner", id: item.targetId, name: item.name }
                )
              }
              accessibilityRole="button"
              className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl bg-white p-3"
            >
              {item.targetType === "PERFORMER" && !item.image ? (
                <PerformerAvatar performer={{ name: item.name }} size={52} />
              ) : (
                <RoundAvatar uri={item.image} name={item.name} size={52} />
              )}
              <View className="flex-1">
                <TextComponent numberOfLines={1} className="text-base font-bold text-zinc-950">
                  {item.name}
                </TextComponent>
                <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
                  {item.subtitle || FOLLOW_LABEL[item.targetType]}
                </TextComponent>
                {item.targetType !== "PERSON" && (
                  <TextComponent className="mt-0.5 text-xs font-semibold" style={{ color: BRAND.blue }}>
                    {item.upcomingEvents
                      ? `${item.upcomingEvents} upcoming ${item.upcomingEvents === 1 ? "event" : "events"}`
                      : "No upcoming events"}
                  </TextComponent>
                )}
              </View>
              <FollowButton type={item.targetType} id={item.targetId} name={item.name} size="sm" />
            </Pressable>
          )}
          ListEmptyComponent={
            follows.isLoading ? (
              <Loading />
            ) : (
              <EmptyNote title="Not following anyone yet" body="Follow friends, performers, venues and planners to see them here." />
            )
          }
        />
      </View>
    );
  }

  const name = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your profile";
  const more = tickets.hasNextPage ? "+" : "";
  const creditRow = credit.data?.find((row) => row.available.amount > 0) ?? credit.data?.[0];
  const inviteCode = referral.data?.code ?? user?.username ?? null;

  const shareProfile = () => {
    const handle = user?.username ? `@${user.username}` : name;
    const link = inviteCode && !organiser.isVendor ? ` ${inviteLink(inviteCode)}` : "";
    Share.share({
      message: `I'm ${handle} on Turnupz, where I find what's on. Join me:${link}`
    }).catch(() => undefined);
  };

  // Settings and more, behind the menu icon.
  const gear = (
    <Pressable
      onPress={() => setShowSettings(true)}
      accessibilityRole="button"
      accessibilityLabel="Settings and more"
      hitSlop={10}
      className="size-10 items-center justify-center"
    >
      <Svg width={26} height={26} viewBox="0 0 24 24">
        <Path d="M4.5 7h15M4.5 12h15M4.5 17h15" fill="none" stroke={BRAND.ink} strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );

  if (!user) {
    return (
      <View className="flex-1 bg-white">
        <View className="h-14 flex-row items-center justify-between px-5">
          <TextComponent className="text-[26px] font-extrabold text-zinc-950">Profile</TextComponent>
          {gear}
        </View>
        <View className="flex-1 items-center justify-center">
          {me.isLoading ? (
            <ActivityIndicator color={BRAND.blue} />
          ) : (
            <EmptyNote title="We couldn't load your profile" body="Check your connection and try again." />
          )}
        </View>
      </View>
    );
  }

  // Every event you hold a ticket or free pass for: coming up first, then past.
  const allTickets = [...upcoming, ...past];
  const ticketCount = allTickets.reduce((sum, item) => sum + item.count, 0);
  const noteFor = (item: TMyEvent) =>
    item.event.saleMethod === "register"
      ? "Free pass"
      : `${item.count} ${item.count === 1 ? "ticket" : "tickets"}`;
  const tabEvents =
    eventsTab === "saved"
      ? savedEvents.map((event) => ({ event, note: undefined as string | undefined, past: false }))
      : eventsTab === "tickets"
        ? allTickets.map((item, index) => ({ event: item.event, note: noteFor(item), past: index >= upcoming.length }))
        : [];
  const emptyTab = {
    tickets: { title: "No tickets yet", body: "Tickets you buy and free events you register for will show here." },
    saved: { title: "Nothing saved yet", body: "Tap ⋯ on any event and choose Save event." },
    posts: { title: "Posts are coming soon", body: "You'll be able to share photos from events you went to." },
    tagged: { title: "Tagged is coming soon", body: "Photos friends tag you in will show here." }
  }[eventsTab];

  return (
    <View className="flex-1" style={{ backgroundColor: "#F7F8FB" }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={me.isRefetching} onRefresh={refresh} tintColor={BRAND.blue} />}
      >
        <View className="h-14 flex-row items-center justify-between px-5">
          <TextComponent className="text-[26px] font-extrabold text-zinc-950">Profile</TextComponent>
          {gear}
        </View>

        <View className="px-5 pt-2">
          {/* Photo on the left, who you are beside it. */}
          <View className="flex-row items-center gap-4">
            {/* Tap the photo to change it. */}
            <Pressable
              onPress={() => void changePhoto()}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <ProfilePhoto uri={user.profileImage} name={name} size={84} ringColor={BRAND.white} />
              {uploading && (
                <View className="absolute inset-0 items-center justify-center">
                  <ActivityIndicator color={BRAND.blueDeep} />
                </View>
              )}
            </Pressable>
            <View className="flex-1">
              <TextComponent numberOfLines={2} className="text-[21px] font-extrabold leading-7 text-zinc-950">{name}</TextComponent>
              <TextComponent numberOfLines={1} className="mt-0.5 text-[13px] text-zinc-500">
                {[user.username ? `@${user.username}` : null, user.showCountry ? user.country : null]
                  .filter(Boolean)
                  .join(" · ")}
              </TextComponent>
              {!!user.bio && (
                <TextComponent numberOfLines={3} className="mt-1.5 text-[13px] leading-[18px] text-zinc-700">{user.bio}</TextComponent>
              )}
              <View className="mt-2 flex-row gap-4">
                <Pressable
                  onPress={() => user.username && openConnections(user.username, "followers")}
                  accessibilityRole="button"
                  hitSlop={6}
                >
                  <TextComponent className="text-[13px] text-zinc-500">
                    <TextComponent className="text-[13px] font-extrabold text-zinc-950">{myPeople.data?.followers ?? 0}</TextComponent>{" "}
                    {myPeople.data?.followers === 1 ? "follower" : "followers"}
                  </TextComponent>
                </Pressable>
                <Pressable onPress={() => setList("following")} accessibilityRole="button" hitSlop={6}>
                  <TextComponent className="text-[13px] text-zinc-500">
                    <TextComponent className="text-[13px] font-extrabold text-zinc-950">{followed.length}</TextComponent> following
                  </TextComponent>
                </Pressable>
              </View>
            </View>
          </View>
          <View className="mt-4 flex-row gap-2">
            <Pressable
              onPress={() => setPage("edit")}
              accessibilityRole="button"
              className="h-10 flex-1 items-center justify-center rounded-xl"
              style={{ backgroundColor: BRAND.ink }}
            >
              <TextComponent className="text-sm font-bold text-white">Edit profile</TextComponent>
            </Pressable>
            <Pressable
              onPress={shareProfile}
              accessibilityRole="button"
              className="h-10 flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white"
            >
              <TextComponent className="text-sm font-bold text-zinc-950">Share profile</TextComponent>
            </Pressable>
          </View>
        </View>


        <View className="mx-5 mt-4 flex-row gap-2.5">
          <Pressable
            onPress={() => setPage("wallet")}
            accessibilityRole="button"
            accessibilityLabel="Open your wallet"
            className="flex-1 rounded-2xl p-3.5"
            style={{ backgroundColor: BRAND.ink }}
          >
            <View className="flex-row items-center justify-between">
              <TextComponent className="text-xs font-semibold text-white/75">Turnupz Credit</TextComponent>
              <Pressable
                onPress={toggleHideBalance}
                accessibilityRole="button"
                accessibilityLabel={hideBalance ? "Show balance" : "Hide balance"}
                hitSlop={12}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.8} strokeLinejoin="round" />
                  <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.8} />
                  {hideBalance && <Path d="M4 4l16 16" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.8} strokeLinecap="round" />}
                </Svg>
              </Pressable>
            </View>
            <TextComponent numberOfLines={1} className="mt-0.5 text-lg font-extrabold text-white">
              {hideBalance
                ? maskAmount(creditRow?.available.formatted?.withCurrency)
                : creditRow && creditRow.available.amount > 0
                  ? creditRow.available.formatted?.withCurrency
                  : creditRow?.available.formatted?.withCurrency ?? emptyCredit}
            </TextComponent>
            <TextComponent className="mt-0.5 text-xs font-semibold" style={{ color: BRAND.blue }}>
              Open wallet ›
            </TextComponent>
          </Pressable>
          {/* Invites are for attendees: an organiser's code no longer works. */}
          {!organiser.isVendor && (
            <Pressable
              onPress={() => setPage("invite")}
              accessibilityRole="button"
              accessibilityLabel="Invite friends"
              className="flex-1 rounded-2xl p-3.5"
              style={{ backgroundColor: BRAND.blueTint }}
            >
              <TextComponent className="text-xs font-semibold text-zinc-600">Invite friends</TextComponent>
              <TextComponent numberOfLines={1} className="mt-0.5 text-lg font-extrabold text-zinc-950">
                {inviteCode ?? "Get credit"}
              </TextComponent>
              <TextComponent className="mt-0.5 text-xs font-semibold" style={{ color: BRAND.blueDeep }}>
                Share your code ›
              </TextComponent>
            </Pressable>
          )}
        </View>

        {/* Organisers and team members: a quiet way across. This is an attendee's page first. */}
        {organiser.canOrganise && (
          <Pressable
            onPress={() => setOrganiserMode("organiser")}
            accessibilityRole="button"
            className="mx-5 mt-3 flex-row items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3"
          >
            <View className="flex-1 pr-3">
              <TextComponent className="text-sm font-bold text-zinc-950">Organiser tools</TextComponent>
              <TextComponent numberOfLines={1} className="mt-0.5 text-xs text-zinc-500">
                {organiser.isVendor ? "Sales, your events and the door" : `${organiser.teams[0]?.name ?? "Door access"}`}
              </TextComponent>
            </View>
            <TextComponent className="text-sm font-bold text-zinc-400">›</TextComponent>
          </Pressable>
        )}

        <View className="mx-5 mt-4 flex-row" style={{ borderBottomWidth: 1, borderBottomColor: "#E3E7ED" }}>
          {(
            [
              { id: "posts", label: "Posts", count: "0" },
              { id: "tagged", label: "Tagged", count: "0" },
              { id: "tickets", label: "Tickets", count: `${ticketCount}${more}` },
              { id: "saved", label: "Saved", count: String(savedTotal) }
            ] as const
          ).map((tab) => {
            const on = eventsTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setEventsTab(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                className="flex-1 items-center px-0.5 pb-2.5"
                style={on ? { borderBottomWidth: 2.5, borderBottomColor: BRAND.blue, marginBottom: -1 } : undefined}
              >
                <View className="flex-row items-center gap-1">
                  <TextComponent numberOfLines={1} className={on ? "text-[13px] font-bold text-zinc-950" : "text-[13px] font-bold text-zinc-400"}>
                    {tab.label}
                  </TextComponent>
                  <View className="rounded-full px-1.5" style={{ backgroundColor: on ? BRAND.blueTint : "#EEF0F4" }}>
                    <TextComponent className="text-[11px] font-extrabold" style={{ color: on ? BRAND.blueDeep : "#71717A" }}>
                      {tab.count}
                    </TextComponent>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {(eventsTab === "saved" ? saved.isLoading : eventsTab === "tickets" ? tickets.isLoading : false) ? (
          <Loading />
        ) : tabEvents.length ? (
          tabEvents.map(({ event, note, past: isPastRow }, index) => (
            <React.Fragment key={event.id}>
              {/* Where the past ones begin. */}
              {isPastRow && !tabEvents[index - 1]?.past && (
                <TextComponent className="mx-5 mt-4 text-xs font-extrabold tracking-wide text-zinc-400">PAST</TextComponent>
              )}
              <EventRow
                event={event}
                note={note}
                onPress={() => (eventsTab === "saved" ? onOpenEvent(event.id) : onOpenTickets(event.id))}
              />
            </React.Fragment>
          ))
        ) : (
          <EmptyNote title={emptyTab.title} body={emptyTab.body} />
        )}
      </ScrollView>
      {options}
    </View>
  );
};

export default memo(ProfileScreen);
