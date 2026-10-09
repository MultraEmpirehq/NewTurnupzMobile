import React, { memo, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import { Path, Svg } from "react-native-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import BrandRefreshList from "@/shared/components/brand-refresh/brand-refresh-list.component";
import useUserStore from "@/shared/stores/user.store";
import { useHiddenEventsStore } from "@/shared/stores/hidden-events.store";
import EventTicketCard, {
  TICKET_LIST_BACKGROUND
} from "@/screens/live/event-ticket-card";
import EventOptionsSheet, {
  TEventOptionsTarget
} from "@/screens/live/event-options.sheet";
import {
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
  useLiveEvents,
  useLiveUserTickets,
  useLiveVenue
} from "@/screens/live/live-api";
import FollowButton from "./follow-button";
import ProfileSettingsScreen from "./profile-settings.screen";
import { TFollowedItem, useFollows, useMe } from "./profile-api";

/**
 * The profile tab: who you are, then what you're going to (tickets), what
 * you've saved, and who you follow. Settings sit behind the gear. Everything
 * comes from the api.
 */

const INK = "#0b1d2a";
const BLUE = "#00b2ff";

type TTab = "tickets" | "saved" | "following";
type TDetail =
  | { kind: "performer"; id: string }
  | { kind: "venue"; id: string; name: string }
  | { kind: "planner"; id: string; name: string };

const TABS: { value: TTab; label: string }[] = [
  { value: "tickets", label: "Tickets" },
  { value: "saved", label: "Saved" },
  { value: "following", label: "Following" }
];

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const Avatar = ({ uri, name, size }: { uri?: string | null; name: string; size: number }) => (
  <View
    className="items-center justify-center overflow-hidden rounded-full bg-[#e3f6ff]"
    style={{ width: size, height: size }}
  >
    {uri ? (
      <CustomImage className="size-full" imageClassName="size-full" source={{ uri }} contentFit="cover" />
    ) : (
      <TextComponent className="font-bold" style={{ color: BLUE, fontSize: size * 0.36 }}>
        {initialsOf(name)}
      </TextComponent>
    )}
  </View>
);

const toOptions = (event: TLiveEvent): TEventOptionsTarget => ({
  id: event.id,
  name: event.name,
  date: event.date,
  timezone: event.timezone,
  image: event.image ?? event.medias?.[0],
  place: eventPlace(event),
  isFavorite: event.isFavorite
});

const FOLLOW_LABEL: Record<TFollowedItem["targetType"], string> = {
  PERFORMER: "Performer",
  VENUE: "Venue",
  PLANNER: "Event planner"
};

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
  onOpenTickets: () => void;
}) => {
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const me = useMe();
  const user = me.data;
  const hiddenEventIds = useHiddenEventsStore((state) => state.hiddenEventIds);

  const [tab, setTab] = useState<TTab>("tickets");
  const [view, setView] = useState<"profile" | "settings" | "edit">("profile");
  const [detail, setDetail] = useState<TDetail | null>(null);
  const [optionsEvent, setOptionsEvent] = useState<TEventOptionsTarget | null>(null);

  const tickets = useLiveUserTickets();
  const saved = useLiveEvents({ isFavorite: "true", limit: "50" }, isSignedIn);
  const follows = useFollows(isSignedIn);

  // One card per upcoming event, however many tickets you hold for it.
  const ticketEvents = useMemo(() => {
    const byEvent = new Map<string, { event: TLiveEvent; count: number }>();
    for (const page of tickets.data?.pages ?? []) {
      for (const ticket of page.tickets) {
        const event = ticket.ticket?.event;
        if (!event?.id || new Date(event.date).getTime() < Date.now() - 6 * 3600 * 1000) continue;
        const current = byEvent.get(event.id);
        byEvent.set(event.id, { event, count: (current?.count ?? 0) + 1 });
      }
    }
    return [...byEvent.values()].sort(
      (a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime()
    );
  }, [tickets.data]);

  const savedEvents = useMemo(
    () =>
      (saved.data?.pages ?? [])
        .flatMap((page) => page.events)
        .filter((event) => !hiddenEventIds.includes(event.id)),
    [saved.data, hiddenEventIds]
  );
  const followed = follows.data ?? [];

  const refresh = () => {
    void me.refetch();
    void tickets.refetch();
    void saved.refetch();
    void follows.refetch();
  };

  const options = (
    <EventOptionsSheet
      event={optionsEvent}
      onClose={() => setOptionsEvent(null)}
      onOpenEvent={onOpenEvent}
    />
  );

  if (view !== "profile") {
    return (
      <ProfileSettingsScreen
        startAt={view === "edit" ? "edit" : "menu"}
        onBack={() => {
          setView("profile");
          void me.refetch();
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

  const name = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your profile";
  const website = user?.website
    ? /^https?:\/\//i.test(user.website)
      ? user.website
      : `https://${user.website}`
    : null;
  const savedTotal = saved.data?.pages?.[0]?.pagination?.total ?? savedEvents.length;
  const counts: Record<TTab, number> = {
    tickets: ticketEvents.length,
    saved: savedTotal,
    following: followed.length
  };

  const header = (
    <View className="bg-white">
      <View className="items-center px-6 pb-5 pt-6">
        <Avatar uri={user?.profileImage} name={name} size={96} />
        <TextComponent className="mt-3 text-center text-2xl font-bold text-zinc-950">{name}</TextComponent>
        {!!user?.username && (
          <TextComponent className="mt-0.5 text-sm font-semibold text-zinc-500">@{user.username}</TextComponent>
        )}
        {!!user?.bio && (
          <TextComponent className="mt-3 text-center text-sm leading-5 text-zinc-700">{user.bio}</TextComponent>
        )}
        <View className="mt-2 flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {!!user?.country && (
            <TextComponent className="text-xs text-zinc-500">{user.country}</TextComponent>
          )}
          {!!website && (
            <Pressable onPress={() => void Linking.openURL(website)} accessibilityRole="link">
              <TextComponent className="text-xs font-bold" style={{ color: BLUE }}>
                {user?.website?.replace(/^https?:\/\//i, "")}
              </TextComponent>
            </Pressable>
          )}
        </View>
        <View className="mt-4 w-full flex-row gap-3">
          <Pressable
            onPress={() => setView("edit")}
            accessibilityRole="button"
            className="h-11 flex-1 items-center justify-center rounded-full"
            style={{ backgroundColor: BLUE }}
          >
            <TextComponent className="text-sm font-bold text-white">Edit profile</TextComponent>
          </Pressable>
          <Pressable
            onPress={onOpenTickets}
            accessibilityRole="button"
            className="h-11 flex-1 items-center justify-center rounded-full border border-black/10 bg-white"
          >
            <TextComponent className="text-sm font-bold text-zinc-900">My tickets</TextComponent>
          </Pressable>
        </View>
      </View>

      {/* The three lists, with how many are in each. */}
      <View className="flex-row border-b border-black/5">
        {TABS.map((item) => {
          const active = tab === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => setTab(item.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className="flex-1 items-center pb-3 pt-1"
              style={{ borderBottomWidth: 2, borderBottomColor: active ? INK : "transparent" }}
            >
              <TextComponent className="text-lg font-bold" style={{ color: active ? INK : "#a1a1aa" }}>
                {counts[item.value]}
              </TextComponent>
              <TextComponent className="text-xs font-semibold" style={{ color: active ? INK : "#a1a1aa" }}>
                {item.label}
              </TextComponent>
            </Pressable>
          );
        })}
      </View>
      <View className="h-4" style={{ backgroundColor: TICKET_LIST_BACKGROUND }} />
    </View>
  );

  const loading =
    tab === "tickets" ? tickets.isLoading : tab === "saved" ? saved.isLoading : follows.isLoading;
  const empty = loading ? (
    <Loading />
  ) : tab === "tickets" ? (
    <EmptyNote title="No upcoming tickets" body="Tickets you buy or register for show here." />
  ) : tab === "saved" ? (
    <EmptyNote title="Nothing saved yet" body="Tap ⋯ on any event and choose Save event." />
  ) : (
    <EmptyNote
      title="Not following anyone yet"
      body="Follow performers, venues and planners from their pages in Explore."
    />
  );

  type TRow =
    | { key: string; kind: "ticket"; event: TLiveEvent; count: number }
    | { key: string; kind: "saved"; event: TLiveEvent }
    | { key: string; kind: "follow"; item: TFollowedItem };
  const rows: TRow[] =
    tab === "tickets"
      ? ticketEvents.map(({ event, count }) => ({ key: event.id, kind: "ticket", event, count }))
      : tab === "saved"
        ? savedEvents.map((event) => ({ key: event.id, kind: "saved", event }))
        : followed.map((item) => ({ key: `${item.targetType}-${item.targetId}`, kind: "follow", item }));

  const renderRow = ({ item: row }: { item: TRow }) => {
    if (row.kind === "follow") {
      const item = row.item;
      return (
        <Pressable
          onPress={() =>
            setDetail(
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
            <Avatar uri={item.image} name={item.name} size={52} />
          )}
          <View className="flex-1">
            <TextComponent numberOfLines={1} className="text-base font-bold text-zinc-950">
              {item.name}
            </TextComponent>
            <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
              {item.subtitle || FOLLOW_LABEL[item.targetType]}
            </TextComponent>
            <TextComponent className="mt-0.5 text-xs font-semibold" style={{ color: BLUE }}>
              {item.upcomingEvents
                ? `${item.upcomingEvents} upcoming ${item.upcomingEvents === 1 ? "event" : "events"}`
                : "No upcoming events"}
            </TextComponent>
          </View>
          <FollowButton type={item.targetType} id={item.targetId} name={item.name} size="sm" />
        </Pressable>
      );
    }
    const event = row.event;
    return (
      <EventTicketCard
        name={event.name}
        date={event.date}
        timezone={event.timezone}
        image={event.image ?? event.medias?.[0]}
        category={event.category?.name}
        place={eventPlace(event)}
        badge={row.kind === "ticket" ? `${row.count} ${row.count === 1 ? "ticket" : "tickets"}` : undefined}
        onPress={() => (row.kind === "ticket" ? onOpenTickets() : onOpenEvent(event.id))}
        onMore={() => setOptionsEvent(toOptions(event))}
      />
    );
  };

  return (
    <View className="flex-1 bg-white">
      <View className="h-14 flex-row items-center justify-between border-b border-black/5 bg-white px-4">
        <TextComponent className="text-xl font-bold text-zinc-950">Profile</TextComponent>
        <Pressable
          onPress={() => setView("settings")}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={10}
          className="size-10 items-center justify-center"
        >
          <Svg width={23} height={23} viewBox="0 0 24 24">
            <Path
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
              fill="none"
              stroke={INK}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>
      {!user && me.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={BLUE} />
        </View>
      ) : (
        <BrandRefreshList
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={renderRow}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshing={me.isRefetching}
          onRefresh={refresh}
          onEndReached={() => {
            if (tab === "tickets" && tickets.hasNextPage && !tickets.isFetchingNextPage) {
              void tickets.fetchNextPage();
            }
            if (tab === "saved" && saved.hasNextPage && !saved.isFetchingNextPage) {
              void saved.fetchNextPage();
            }
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
      {options}
    </View>
  );
};

export default memo(ProfileScreen);
