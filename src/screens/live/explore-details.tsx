import React, { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Circle, Path, Svg } from "react-native-svg";
import { useDebounce } from "use-debounce";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import FollowButton from "@/screens/profile/follow-button";
import EventTicketCard, { TICKET_LIST_BACKGROUND } from "./event-ticket-card";
import {
  CHART_REGIONS,
  PERFORMER_TYPE_LABELS,
  TChartRegion,
  TLiveEvent,
  TLivePerformer,
  TLivePerformerSummary,
  TLiveVenue,
  eventPlace,
  useLiveEvents,
  useLivePerformer,
  useLivePerformerChart,
  useLivePlanners,
  TLivePlanner
} from "./live-api";

/**
 * Explore's detail pages, back from the app's original flow (tap a chart, a
 * performer, a venue or a planner and it opens) with everything on them real:
 * the performer charts, a performer's profile, a venue and an event planner.
 */

const INK = "#0b1d2a";
const PINK = "#ff0088";
const BLUE = "#00b2ff";

const initialsOf = (name: string) =>
  name
    .replace(/["“”]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

/** A performer's photo, or their initials on the brand gradient. */
export const PerformerAvatar = ({
  performer,
  size
}: {
  performer: Pick<TLivePerformerSummary, "name" | "image">;
  size: number;
}) =>
  performer.image ? (
    <CustomImage
      className="overflow-hidden"
      imageClassName="size-full"
      style={{ width: size, height: size, borderRadius: size / 2 }}
      source={{ uri: performer.image }}
      contentFit="cover"
    />
  ) : (
    <LinearGradient
      colors={[BLUE, PINK]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <TextComponent className="font-bold text-white" style={{ fontSize: size * 0.34 }}>
        {initialsOf(performer.name)}
      </TextComponent>
    </LinearGradient>
  );

export const BackHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <View className="h-14 flex-row items-center gap-2 border-b border-black/5 bg-white px-3">
    <Pressable
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={10}
      className="size-9 items-center justify-center"
    >
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M15 5l-7 7 7 7" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
    <TextComponent numberOfLines={1} className="flex-1 text-lg font-bold text-zinc-950">
      {title}
    </TextComponent>
  </View>
);

export const Loading = () => (
  <View className="items-center py-16">
    <ActivityIndicator color={BLUE} />
  </View>
);

export const EmptyNote = ({ title, body }: { title: string; body: string }) => (
  <View className="items-center gap-1 px-8 py-12">
    <TextComponent className="text-center text-base font-bold text-zinc-950">{title}</TextComponent>
    <TextComponent className="text-center text-sm text-zinc-500">{body}</TextComponent>
  </View>
);

export const eventCard = (
  event: TLiveEvent,
  onOpenEvent: (id: string) => void,
  onEventOptions?: (event: TLiveEvent) => void
) => (
  <EventTicketCard
    key={event.id}
    name={event.name}
    date={event.date}
    timezone={event.timezone}
    image={event.image ?? event.medias?.[0]}
    category={event.category?.name}
    place={eventPlace(event)}
    onPress={() => onOpenEvent(event.id)}
    onMore={onEventOptions ? () => onEventOptions(event) : undefined}
  />
);

/* --------------------------------- Charts -------------------------------- */

const typeAndPlace = (performer: TLivePerformer) =>
  [PERFORMER_TYPE_LABELS[performer.type], performer.country].filter(Boolean).join(" · ");

const PodiumSpot = ({
  performer,
  place,
  onPress
}: {
  performer: TLivePerformer;
  place: 1 | 2 | 3;
  onPress: () => void;
}) => {
  const size = place === 1 ? 96 : 76;
  const height = place === 1 ? 70 : place === 2 ? 52 : 40;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Number ${place}, ${performer.name}`}
      className="flex-1 items-center"
    >
      <View>
        <View
          className="rounded-full p-1"
          style={{ backgroundColor: place === 1 ? "#ffd166" : place === 2 ? "#d9dee7" : "#f1b98b" }}
        >
          <PerformerAvatar performer={performer} size={size} />
        </View>
        <View
          className="absolute -bottom-2 self-center rounded-full px-2.5 py-0.5"
          style={{ backgroundColor: INK }}
        >
          <TextComponent className="text-xs font-bold text-white">{place}</TextComponent>
        </View>
      </View>
      <TextComponent numberOfLines={1} className="mt-4 px-1 text-sm font-bold text-zinc-950">
        {performer.name}
      </TextComponent>
      <TextComponent numberOfLines={1} className="text-[11px] text-zinc-500">
        {PERFORMER_TYPE_LABELS[performer.type]}
      </TextComponent>
      <LinearGradient
        colors={place === 1 ? [BLUE, PINK] : ["#e9eef6", "#dfe6f0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height, alignSelf: "stretch", marginTop: 10, marginHorizontal: 6, borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
      />
    </Pressable>
  );
};

export const PerformerChartScreen = memo(
  ({
    initialRegion = "global",
    onBack,
    onOpenPerformer
  }: {
    initialRegion?: TChartRegion;
    onBack: () => void;
    onOpenPerformer: (id: string) => void;
  }) => {
    const [region, setRegion] = useState<TChartRegion>(initialRegion);
    const chart = useLivePerformerChart(region, 30);
    const performers = chart.data ?? [];
    const podium = performers.slice(0, 3);
    const rest = performers.slice(3);

    return (
      <View className="flex-1" style={{ backgroundColor: TICKET_LIST_BACKGROUND }}>
        <BackHeader title="Top performers" onBack={onBack} />
        <FlatList
          data={rest}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View className="gap-5 pb-4 pt-4">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
                {CHART_REGIONS.map((option) => {
                  const active = option.value === region;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setRegion(option.value)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      className="rounded-full px-4 py-2"
                      style={{ backgroundColor: active ? INK : "#ffffff", borderWidth: active ? 0 : 1, borderColor: "rgba(11,29,42,0.08)" }}
                    >
                      <TextComponent className="text-sm font-medium" style={{ color: active ? "#ffffff" : INK }}>
                        {option.label}
                      </TextComponent>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <TextComponent className="px-4 text-xs text-zinc-500">
                Ranked by tickets sold for their events over the last year.
              </TextComponent>
              {chart.isLoading ? (
                <Loading />
              ) : podium.length === 0 ? (
                <EmptyNote
                  title="No chart yet"
                  body="Once performers from here are booked on Turnupz, they'll show up."
                />
              ) : (
                <View className="mx-4 flex-row items-end rounded-3xl bg-white px-2 pt-5">
                  {podium[1] && <PodiumSpot performer={podium[1]} place={2} onPress={() => onOpenPerformer(podium[1].id)} />}
                  <PodiumSpot performer={podium[0]} place={1} onPress={() => onOpenPerformer(podium[0].id)} />
                  {podium[2] && <PodiumSpot performer={podium[2]} place={3} onPress={() => onOpenPerformer(podium[2].id)} />}
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onOpenPerformer(item.id)}
              accessibilityRole="button"
              className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3"
            >
              <TextComponent className="w-7 text-base font-bold text-zinc-400">{item.rank}</TextComponent>
              <PerformerAvatar performer={item} size={48} />
              <View className="flex-1">
                <TextComponent numberOfLines={1} className="text-base font-bold text-zinc-950">
                  {item.name}
                </TextComponent>
                <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
                  {typeAndPlace(item)}
                </TextComponent>
              </View>
              <TextComponent className="text-xs font-semibold" style={{ color: BLUE }}>
                {item.upcomingEventsCount} upcoming
              </TextComponent>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </View>
    );
  }
);
PerformerChartScreen.displayName = "PerformerChartScreen";

/* ------------------------------- Performer ------------------------------- */

const socialLinks = (performer: TLivePerformer) =>
  [
    performer.instagram && {
      label: "Instagram",
      url: `https://instagram.com/${performer.instagram.replace(/^@/, "")}`
    },
    performer.twitter && {
      label: "X",
      url: `https://x.com/${performer.twitter.replace(/^@/, "")}`
    },
    performer.website && {
      label: "Website",
      url: /^https?:\/\//.test(performer.website) ? performer.website : `https://${performer.website}`
    }
  ].filter(Boolean) as { label: string; url: string }[];

export const PerformerProfileScreen = memo(
  ({
    performerId,
    onBack,
    onOpenEvent,
    onEventOptions
  }: {
    performerId: string;
    onBack: () => void;
    onOpenEvent: (id: string) => void;
    /** The card dots: the shared event options sheet. */
    onEventOptions?: (event: TLiveEvent) => void;
  }) => {
    const [showPast, setShowPast] = useState(false);
    const profile = useLivePerformer(performerId);
    const upcoming = useLiveEvents({ performerId, status: "UPCOMING" });
    const past = useLiveEvents({ performerId, status: "PAST" });
    const performer = profile.data;
    const list = useMemo(
      () => ((showPast ? past : upcoming).data?.pages ?? []).flatMap((page) => page.events),
      [showPast, past.data, upcoming.data] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const pastCount = past.data?.pages?.[0]?.events.length ?? 0;

    return (
      <View className="flex-1" style={{ backgroundColor: TICKET_LIST_BACKGROUND }}>
        <BackHeader title={performer?.name ?? "Performer"} onBack={onBack} />
        {profile.isLoading ? (
          <Loading />
        ) : !performer ? (
          <EmptyNote title="Performer not found" body="They may have been removed." />
        ) : (
          <FlatList
            data={list}
            keyExtractor={(event) => event.id}
            renderItem={({ item }) => eventCard(item, onOpenEvent, onEventOptions)}
            ListHeaderComponent={
              <View className="gap-5 pb-5">
                <LinearGradient
                  colors={["#e3f6ff", "#ffe8f3"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ alignItems: "center", paddingTop: 28, paddingBottom: 22, gap: 10 }}
                >
                  <View className="rounded-full bg-white p-1.5">
                    <PerformerAvatar performer={performer} size={112} />
                  </View>
                  <TextComponent className="text-2xl font-bold text-zinc-950">{performer.name}</TextComponent>
                  <View className="flex-row items-center gap-2">
                    <View className="rounded-full px-3 py-1" style={{ backgroundColor: INK }}>
                      <TextComponent className="text-xs font-semibold text-white">
                        {PERFORMER_TYPE_LABELS[performer.type]}
                      </TextComponent>
                    </View>
                    {!!performer.country && (
                      <TextComponent className="text-sm text-zinc-600">{performer.country}</TextComponent>
                    )}
                  </View>
                  <View className="pt-1">
                    <FollowButton type="PERFORMER" id={performer.id} name={performer.name} />
                  </View>
                </LinearGradient>

                {!!performer.bio && (
                  <TextComponent className="px-5 text-base leading-6 text-zinc-800">{performer.bio}</TextComponent>
                )}

                {socialLinks(performer).length > 0 && (
                  <View className="flex-row flex-wrap gap-2 px-5">
                    {socialLinks(performer).map((link) => (
                      <Pressable
                        key={link.label}
                        onPress={() => void Linking.openURL(link.url)}
                        accessibilityRole="link"
                        className="rounded-full border border-black/10 bg-white px-4 py-2"
                      >
                        <TextComponent className="text-sm font-medium text-zinc-900">{link.label}</TextComponent>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View className="mx-4 flex-row rounded-full border border-black/5 bg-white p-1 self-start">
                  {[
                    { value: false, label: `Upcoming (${performer.upcomingEventsCount})` },
                    { value: true, label: pastCount ? `Past (${pastCount}${past.hasNextPage ? "+" : ""})` : "Past" }
                  ].map((option) => (
                    <Pressable
                      key={option.label}
                      onPress={() => setShowPast(option.value)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: showPast === option.value }}
                      className="rounded-full px-4 py-2"
                      style={{ backgroundColor: showPast === option.value ? INK : "transparent" }}
                    >
                      <TextComponent
                        className="text-sm font-medium"
                        style={{ color: showPast === option.value ? "#ffffff" : INK }}
                      >
                        {option.label}
                      </TextComponent>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            ListEmptyComponent={
              (showPast ? past : upcoming).isLoading ? (
                <Loading />
              ) : (
                <EmptyNote
                  title={showPast ? "No past events" : "Nothing booked right now"}
                  body={showPast ? "Their earlier events will show here." : "Check back soon for new dates."}
                />
              )
            }
            onEndReached={() => {
              const query = showPast ? past : upcoming;
              if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
            }}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>
    );
  }
);
PerformerProfileScreen.displayName = "PerformerProfileScreen";

/* --------------------------------- Venue --------------------------------- */

const openInMaps = (venue: TLiveVenue) => {
  const query = encodeURIComponent([venue.name, venue.address].filter(Boolean).join(", "));
  void Linking.openURL(
    Platform.OS === "ios" ? `http://maps.apple.com/?q=${query}` : `https://www.google.com/maps/search/?api=1&query=${query}`
  );
};

export const VenueDetailScreen = memo(
  ({
    venue,
    onBack,
    onOpenEvent,
    onEventOptions
  }: {
    venue: TLiveVenue;
    onBack: () => void;
    onOpenEvent: (id: string) => void;
    /** The card dots: the shared event options sheet. */
    onEventOptions?: (event: TLiveEvent) => void;
  }) => {
    const [search, setSearch] = useState("");
    const [q] = useDebounce(search.trim(), 400);
    const events = useLiveEvents({ venueId: venue.id, q, status: "UPCOMING" });
    const items = useMemo(
      () => (events.data?.pages ?? []).flatMap((page) => page.events),
      [events.data]
    );

    return (
      <View className="flex-1" style={{ backgroundColor: TICKET_LIST_BACKGROUND }}>
        <BackHeader title={venue.name} onBack={onBack} />
        <FlatList
          data={items}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => eventCard(item, onOpenEvent, onEventOptions)}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View className="gap-4 pb-5">
              <View className="h-[230px] w-full bg-[#eef6ff]">
                {!!venue.images?.[0] && (
                  <CustomImage className="size-full" imageClassName="size-full" source={{ uri: venue.images[0] }} contentFit="cover" />
                )}
              </View>
              <View className="gap-1 px-5">
                <TextComponent className="text-2xl font-bold text-zinc-950">{venue.name}</TextComponent>
                {!!venue.address && (
                  <TextComponent className="text-sm text-zinc-500">{venue.address}</TextComponent>
                )}
              </View>
              <View className="flex-row gap-3 px-5">
                {[
                  !!venue.totalAvailableSeat && { label: "Capacity", value: venue.totalAvailableSeat.toLocaleString() },
                  !!venue.rating && { label: "Rating", value: `★ ${venue.rating.toFixed(1)}` },
                  { label: "Upcoming", value: String(items.length) + (events.hasNextPage ? "+" : "") }
                ]
                  .filter(Boolean)
                  .map((stat) => {
                    const { label, value } = stat as { label: string; value: string };
                    return (
                      <View key={label} className="flex-1 items-center rounded-2xl bg-white py-3">
                        <TextComponent className="text-lg font-bold text-zinc-950">{value}</TextComponent>
                        <TextComponent className="text-[11px] text-zinc-500">{label}</TextComponent>
                      </View>
                    );
                  })}
              </View>
              <View className="flex-row items-center gap-3 px-5">
              <FollowButton type="VENUE" id={venue.id} name={venue.name} />
              <Pressable
                onPress={() => openInMaps(venue)}
                accessibilityRole="link"
                className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-full border border-black/10 bg-white"
              >
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
                  <Circle cx="12" cy="10" r="2.5" fill="none" stroke={INK} strokeWidth={2} />
                </Svg>
                <TextComponent className="text-sm font-semibold text-zinc-900">Open in Maps</TextComponent>
              </Pressable>
              </View>
              <View className="gap-3 px-4">
                <TextComponent className="px-1 text-lg font-bold" style={{ color: BLUE }}>
                  Events at this venue
                </TextComponent>
                <View className="h-11 flex-row items-center gap-2 rounded-full border border-black/5 bg-white px-4">
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search events at this venue"
                    placeholderTextColor="#a1a1aa"
                    className="flex-1 text-base text-zinc-950"
                    style={{ fontFamily: "Avenir-Book" }}
                  />
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            events.isLoading ? (
              <Loading />
            ) : (
              <EmptyNote
                title={q ? "No events match" : "Nothing on here yet"}
                body={q ? "Try another search." : "Upcoming events at this venue will show here."}
              />
            )
          }
          onEndReached={() => {
            if (events.hasNextPage && !events.isFetchingNextPage) void events.fetchNextPage();
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </View>
    );
  }
);
VenueDetailScreen.displayName = "VenueDetailScreen";

/* -------------------------------- Planner -------------------------------- */

export const PlannerDetailScreen = memo(
  ({
    name,
    organizerId,
    events: given,
    onBack,
    onOpenEvent,
    onEventOptions
  }: {
    name: string;
    /** With it, their events come from the api (and they can be followed). */
    organizerId?: string;
    /** Without an organizerId: the events to list. */
    events?: TLiveEvent[];
    onBack: () => void;
    onOpenEvent: (id: string) => void;
    /** The card dots: the shared event options sheet. */
    onEventOptions?: (event: TLiveEvent) => void;
  }) => {
    const fetched = useLiveEvents(
      { organizerId, status: "UPCOMING" },
      !!organizerId
    );
    const events = useMemo(
      () =>
        organizerId
          ? (fetched.data?.pages ?? []).flatMap((page) => page.events)
          : given ?? [],
      [organizerId, fetched.data, given]
    );
    return (
      <View className="flex-1" style={{ backgroundColor: TICKET_LIST_BACKGROUND }}>
        <BackHeader title={name} onBack={onBack} />
        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => eventCard(item, onOpenEvent, onEventOptions)}
          ListHeaderComponent={
            <View className="items-center gap-2 pb-6 pt-7">
              <PerformerAvatar performer={{ name }} size={88} />
              <TextComponent className="text-2xl font-bold text-zinc-950">{name}</TextComponent>
              <TextComponent className="text-sm text-zinc-500">
                Event planner · {events.length}
                {fetched.hasNextPage ? "+" : ""} upcoming {events.length === 1 ? "event" : "events"}
              </TextComponent>
              <View className="pt-2">
                <FollowButton type="PLANNER" id={organizerId} name={name} />
              </View>
            </View>
          }
          ListEmptyComponent={
            organizerId && fetched.isLoading ? (
              <Loading />
            ) : (
              <EmptyNote title="Nothing coming up" body="Their next events will show here." />
            )
          }
          onEndReached={() => {
            if (fetched.hasNextPage && !fetched.isFetchingNextPage) void fetched.fetchNextPage();
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </View>
    );
  }
);
PlannerDetailScreen.displayName = "PlannerDetailScreen";

/* ------------------------------ All planners ----------------------------- */

/** Every planner with something coming up, busiest first, searchable. */
export const PlannersScreen = memo(
  ({
    onBack,
    onOpenPlanner
  }: {
    onBack: () => void;
    onOpenPlanner: (planner: TLivePlanner) => void;
  }) => {
    const [search, setSearch] = useState("");
    const [q] = useDebounce(search.trim(), 400);
    const planners = useLivePlanners(q);
    const items = useMemo(
      () => (planners.data?.pages ?? []).flatMap((page) => page.planners),
      [planners.data]
    );
    return (
      <View className="flex-1" style={{ backgroundColor: TICKET_LIST_BACKGROUND }}>
        <BackHeader title="Event planners" onBack={onBack} />
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View className="px-4 pb-3 pt-4">
              <View className="h-11 flex-row items-center rounded-full border border-black/5 bg-white px-4">
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search planners"
                  placeholderTextColor="#a1a1aa"
                  className="flex-1 text-base text-zinc-950"
                  style={{ fontFamily: "Avenir-Book" }}
                />
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onOpenPlanner(item)}
              accessibilityRole="button"
              className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl bg-white p-3"
            >
              <PerformerAvatar performer={{ name: item.name, image: item.image ?? undefined }} size={52} />
              <View className="flex-1">
                <TextComponent numberOfLines={1} className="text-base font-bold text-zinc-950">
                  {item.name}
                </TextComponent>
                <TextComponent className="text-xs font-semibold" style={{ color: BLUE }}>
                  {item.upcomingEvents} upcoming {item.upcomingEvents === 1 ? "event" : "events"}
                </TextComponent>
              </View>
              <FollowButton type="PLANNER" id={item.id} name={item.name} size="sm" />
            </Pressable>
          )}
          ListEmptyComponent={
            planners.isLoading ? (
              <Loading />
            ) : (
              <EmptyNote
                title={q ? "No planners match" : planners.error ? "We couldn't load planners" : "No planners yet"}
                body={q ? "Try another name." : "Planners with upcoming events show here."}
              />
            )
          }
          onEndReached={() => {
            if (planners.hasNextPage && !planners.isFetchingNextPage) void planners.fetchNextPage();
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </View>
    );
  }
);
PlannersScreen.displayName = "PlannersScreen";
