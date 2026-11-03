import VerifiedName from "@/shared/components/verified-name/verified-name.component";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "@/shared/utils/brand-colors";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { Circle, Path, Svg } from "react-native-svg";
import { useDebounce } from "use-debounce";
import {
  addDays,
  addWeeks,
  endOfDay,
  endOfWeek,
  isWeekend,
  nextSaturday,
  nextSunday,
  startOfDay,
  startOfWeek
} from "date-fns";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import EventTicketCard, { TICKET_LIST_BACKGROUND } from "./event-ticket-card";
import ExploreFilterSheet, {
  EMPTY_FILTERS,
  TExploreFilters,
  TWhen,
  countFilters
} from "./explore-filter.sheet";
import BrandRefreshList, {
  TBrandRefreshListHandle
} from "@/shared/components/brand-refresh/brand-refresh-list.component";
import useUserStore from "@/shared/stores/user.store";
import { useHiddenEventsStore } from "@/shared/stores/hidden-events.store";
import {
  TExplorePlace,
  placeLabel,
  useExplorePlaceStore
} from "@/shared/stores/explore-place.store";
import ExplorePlaceSheet from "./explore-place.sheet";
import { SponsoredRail } from "./sponsored";
import EventOptionsSheet, { TEventOptionsTarget } from "./event-options.sheet";
import LiveEventDetailScreen from "./event-detail.screen";
import {
  PerformerAvatar,
  PerformerChartScreen,
  PerformerProfileScreen,
  PlannerDetailScreen,
  PlannersScreen,
  VenueDetailScreen
} from "./explore-details";
import {
  TLiveEvent,
  TLiveEventFilters,
  TLiveVenue,
  eventPlace,
  useLiveCategories,
  useLiveEventLocations,
  useLivePerformers,
  useLiveEvents,
  useLivePerformerChartFor,
  useLivePlanners,
  useLiveVenues,
  CHART_REGIONS,
  PERFORMER_TYPE_LABELS,
  TLivePerformer,
  TLiveLocation
} from "./live-api";

/**
 * Explore, one design for the app and the web. The web's search and filters sit
 * on top (search, a strip of days with quick ranges, categories); underneath,
 * the app's browse sections (Happening today, Trending, Top performers, Venues,
 * Event planners), each headed by the place it looks in ("Trending in Lagos ▾",
 * which changes it), then every upcoming event there. Every event card is the
 * home feed's ticket card. Searching or filtering
 * swaps the sections for results, events or venues. All of it is live data.
 */

const INK = "#0b1d2a";
// Accents are the deeper brand blue (strictly blue, black, white and grey).
const ACCENT = BRAND.blueDeep;
const BLUE = "#00b2ff";

const PRESETS = [
  { value: "today", label: "Happening today" },
  { value: "weekend", label: "This weekend" },
  { value: "week", label: "This week" },
  { value: "next-week", label: "Next week" }
] as const;

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

/** Whole-day edges, so the query stays the same all day (as on the web). */
const rangeFor = (when: TWhen, now = new Date()) => {
  const monday = { weekStartsOn: 1 } as const;
  if (typeof when === "number") {
    return [startOfDay(new Date(when)), endOfDay(new Date(when))];
  }
  if (typeof when === "object") {
    return [startOfDay(new Date(when.start)), endOfDay(new Date(when.end))];
  }
  switch (when) {
    case "today":
      return [startOfDay(now), endOfDay(now)];
    case "tomorrow":
      return [startOfDay(addDays(now, 1)), endOfDay(addDays(now, 1))];
    case "weekend":
      return isWeekend(now)
        ? [
            startOfDay(now),
            endOfDay(now.getDay() === 0 ? now : nextSunday(now))
          ]
        : [startOfDay(nextSaturday(now)), endOfDay(nextSunday(now))];
    case "week":
      return [startOfDay(now), endOfWeek(now, monday)];
    case "next-week": {
      const next = startOfWeek(addWeeks(now, 1), monday);
      return [next, endOfWeek(next, monday)];
    }
  }
};

const rangeFilters = (when: TWhen) => {
  const [start, end] = rangeFor(when);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

/* ------------------------------ Small parts ----------------------------- */

const Chip = ({
  label,
  active,
  tone = "ink",
  onPress
}: {
  label: string;
  active: boolean;
  tone?: "ink" | "accent";
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    className="rounded-full px-4 py-2"
    style={{
      backgroundColor: active
        ? tone === "accent"
          ? ACCENT
          : INK
        : tone === "accent"
          ? BRAND.blueTintDeep
          : "#ffffff",
      borderWidth: active || tone === "accent" ? 0 : 1,
      borderColor: "rgba(11,29,42,0.08)"
    }}
  >
    <TextComponent
      className="text-sm font-medium"
      style={{ color: active ? "#ffffff" : tone === "accent" ? ACCENT : INK }}
    >
      {label}
    </TextComponent>
  </Pressable>
);

const PinIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24">
    <Path
      d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"
      fill="none"
      stroke="#71717a"
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Circle
      cx="12"
      cy="10"
      r="2.5"
      fill="none"
      stroke="#71717a"
      strokeWidth={2}
    />
  </Svg>
);

/**
 * The app's section header: a blue title and a "See all". With a place, the
 * title reads "Trending in Lagos ▾" and the place opens the location picker.
 */
const SectionHeader = ({
  title,
  place,
  onPlace,
  action = "See all",
  onAction
}: {
  title: string;
  place?: string;
  onPlace?: () => void;
  action?: string;
  onAction?: () => void;
}) => (
  <View className="mb-3 flex-row items-center justify-between gap-3 px-4">
    <View className="flex-1 flex-row flex-wrap items-center">
      <TextComponent className="text-lg font-bold" style={{ color: BLUE }}>
        {title}
        {/* "Trending in Lagos", but "Trending everywhere". */}
        {place ? (place === "everywhere" ? " " : " in ") : ""}
      </TextComponent>
      {!!place && (
        <Pressable
          onPress={onPlace}
          disabled={!onPlace}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${title} in ${place}. Change location`}
          className="flex-row items-center gap-1"
        >
          <TextComponent
            numberOfLines={1}
            className="text-lg font-bold"
            style={{ color: INK, textDecorationLine: "underline", textDecorationColor: "#cbd5e1" }}
          >
            {place}
          </TextComponent>
          {!!onPlace && (
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M6 9l6 6 6-6" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </Pressable>
      )}
    </View>
    {onAction && (
      <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
        <TextComponent
          className="text-sm font-semibold"
          style={{ color: BLUE }}
        >
          {action}
        </TextComponent>
      </Pressable>
    )}
  </View>
);

/** A section with nothing in it for this place, and a way to look elsewhere. */
const SectionEmpty = ({ text, onPlace }: { text: string; onPlace: () => void }) => (
  <Pressable
    onPress={onPlace}
    accessibilityRole="button"
    className="mx-4 flex-row items-center justify-between gap-3 rounded-2xl border border-dashed border-black/10 bg-white px-4 py-4"
  >
    <TextComponent className="flex-1 text-sm text-zinc-500">{text}</TextComponent>
    <TextComponent className="text-sm font-bold" style={{ color: ACCENT }}>
      Change location
    </TextComponent>
  </Pressable>
);

/** A venue as the app's photo tile, its name over the picture. */
const VenueTile = ({
  venue,
  onPress
}: {
  venue: TLiveVenue;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`See events at ${venue.name}`}
    className="h-[200px] w-[200px] overflow-hidden rounded-3xl bg-[#eef6ff]"
  >
    {!!venue.images?.[0] && (
      <CustomImage
        className="size-full"
        imageClassName="size-full"
        source={{ uri: venue.images[0] }}
        contentFit="cover"
      />
    )}
    <LinearGradient
      colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"]}
      className="absolute inset-x-0 bottom-0 h-20 justify-end px-3 pb-2.5"
    >
      <TextComponent numberOfLines={1} className="text-sm font-bold text-white">
        {venue.name}
      </TextComponent>
      {!!venue.totalAvailableSeat && (
        <TextComponent className="text-[11px] text-white/80">
          {venue.totalAvailableSeat.toLocaleString()} seats
        </TextComponent>
      )}
    </LinearGradient>
  </Pressable>
);

type TPlanner = {
  name: string;
  count: number;
  image?: string;
  /** The organiser's user id, when the api gives it. */
  organizerId?: string;
};

/** An organiser, from their own events: a cover, their name and what's coming. */
const PlannerTile = ({
  planner,
  onPress
}: {
  planner: TPlanner;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`See events by ${planner.name}`}
    className="w-[230px] overflow-hidden rounded-3xl border border-black/5 bg-white"
  >
    <View className="h-[120px] w-full bg-[#eef6ff]">
      {!!planner.image && (
        <CustomImage
          className="size-full"
          imageClassName="size-full"
          source={{ uri: planner.image }}
          contentFit="cover"
        />
      )}
    </View>
    <View className="flex-row items-center gap-2 px-3 py-3">
      <LinearGradient
        colors={[BLUE, ACCENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="size-9 items-center justify-center rounded-full"
      >
        <TextComponent className="text-xs font-bold text-white">
          {initialsOf(planner.name)}
        </TextComponent>
      </LinearGradient>
      <View className="flex-1">
        <TextComponent
          numberOfLines={1}
          className="text-sm font-bold text-zinc-950"
        >
          {planner.name}
        </TextComponent>
        <TextComponent className="text-[11px] text-zinc-500">
          {planner.count} upcoming {planner.count === 1 ? "event" : "events"}
        </TextComponent>
      </View>
    </View>
  </Pressable>
);

const VenueCard = ({
  venue,
  onPress
}: {
  venue: TLiveVenue;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`See events at ${venue.name}`}
    className="mx-4 mb-5 overflow-hidden rounded-3xl border border-black/5 bg-white"
  >
    <View className="aspect-[16/9] w-full bg-[#eef6ff]">
      {!!venue.images?.[0] && (
        <CustomImage
          className="size-full"
          imageClassName="size-full"
          source={{ uri: venue.images[0] }}
          contentFit="cover"
        />
      )}
    </View>
    <View className="gap-1 px-5 py-4">
      <TextComponent
        numberOfLines={1}
        className="text-base font-semibold text-zinc-950"
      >
        {venue.name}
      </TextComponent>
      {!!venue.address && (
        <View className="flex-row items-center gap-1">
          <PinIcon />
          <TextComponent
            numberOfLines={1}
            className="flex-1 text-sm text-zinc-500"
          >
            {venue.address}
          </TextComponent>
        </View>
      )}
      <View className="mt-1 flex-row gap-3">
        {!!venue.totalAvailableSeat && (
          <TextComponent className="text-xs text-zinc-500">
            {venue.totalAvailableSeat.toLocaleString()} seats
          </TextComponent>
        )}
        {!!venue.rating && (
          <TextComponent className="text-xs text-zinc-500">
            ★ {venue.rating.toFixed(1)}
          </TextComponent>
        )}
      </View>
    </View>
  </Pressable>
);

/** A horizontal rail that only shows when it has something real in it. */
function Rail<T>({
  items,
  render,
  keyOf
}: {
  items: T[];
  render: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 px-4"
    >
      {items.map((item) => (
        <React.Fragment key={keyOf(item)}>{render(item)}</React.Fragment>
      ))}
    </ScrollView>
  );
}

/* --------------------------------- Screen -------------------------------- */

/** A charting performer in the browse rail, with their place on the chart. */
const PerformerRailCard = ({
  performer,
  onPress
}: {
  performer: TLivePerformer;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`Number ${performer.rank}, ${performer.name}`}
    className="w-[150px] items-center gap-2 rounded-3xl border border-black/5 bg-white px-3 pb-4 pt-5"
  >
    <View>
      <PerformerAvatar performer={performer} size={104} />
      <View
        className="absolute -left-1 -top-1 size-8 items-center justify-center rounded-full border-2 border-white"
        style={{ backgroundColor: INK }}
      >
        <TextComponent className="text-xs font-bold text-white">
          {performer.rank}
        </TextComponent>
      </View>
    </View>
    <VerifiedName
      name={performer.name}
      verified={performer.isVerified}
      className="text-base font-bold text-zinc-950"
    />
    <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
      {PERFORMER_TYPE_LABELS[performer.type]}
      {performer.country ? ` · ${performer.country}` : ""}
    </TextComponent>
  </Pressable>
);

/** The phone's region (e.g. "NG" from en-NG), to put local places first. */
const deviceRegion = (() => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return new Intl.Locale(locale).maximize().region?.toUpperCase();
  } catch {
    return undefined;
  }
})();

/** What a search or filter can show. */
type TResultTab = "events" | "venues" | "performers" | "countries";

const RESULT_TABS: { value: TResultTab; label: string }[] = [
  { value: "events", label: "Events" },
  { value: "venues", label: "Venues" },
  { value: "performers", label: "Performers" },
  { value: "countries", label: "Countries" }
];

/** Explore's own pages, stacked so back returns where you came from. */
type TExploreDetail =
  | { kind: "event"; id: string }
  | { kind: "chart" }
  | { kind: "performer"; id: string }
  | { kind: "venue"; venue: TLiveVenue }
  | { kind: "planner"; name: string; organizerId?: string }
  | { kind: "planners" };

const LiveExploreScreen = ({
  onBook,
  scrollToTopSignal = 0
}: {
  /** Ticket checkout or registration, run by the app around Explore. */
  onBook: (event: TLiveEvent) => void;
  /** Bumped when Explore's tab is tapped again: back out of any page, then to the top. */
  scrollToTopSignal?: number;
}) => {
  // Whichever result list is showing; they share it as only one is mounted.
  const queryClient = useQueryClient();
  const listRef = useRef<TBrandRefreshListHandle>(null);
  const [stack, setStack] = useState<TExploreDetail[]>([]);
  const push = (detail: TExploreDetail) =>
    setStack((current) => [...current, detail]);
  const pop = () => setStack((current) => current.slice(0, -1));
  const onOpenEvent = (id: string) => push({ kind: "event", id });

  useEffect(() => {
    if (!scrollToTopSignal) return;
    setStack((current) => {
      // In a page: the tap closes the pages; Explore reopens at the top.
      if (current.length) return [];
      listRef.current?.scrollToTop();
      return current;
    });
  }, [scrollToTopSignal]);

  // The shared options sheet behind every card's dots.
  const [optionsEvent, setOptionsEvent] = useState<TEventOptionsTarget | null>(
    null
  );
  const openCardOptions = (event: TLiveEvent) =>
    setOptionsEvent({
      id: event.id,
      name: event.name,
      date: event.date,
      timezone: event.timezone,
      image: event.image ?? event.medias?.[0],
      place: eventPlace(event),
      isFavorite: event.isFavorite
    });
  const hiddenEventIds = useHiddenEventsStore((state) => state.hiddenEventIds);
  const visible = (list: TLiveEvent[]) =>
    list.filter((event) => !hiddenEventIds.includes(event.id));

  const [tab, setTab] = useState<TResultTab>("events");
  const [search, setSearch] = useState("");
  const [q] = useDebounce(search.trim(), 400);
  // Everything the quick row and the filter sheet set, in one place.
  const [filterState, setFilterState] =
    useState<TExploreFilters>(EMPTY_FILTERS);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const {
    when,
    categoryId,
    priceType,
    trendingOnly,
    savedOnly,
    past,
    venue,
    location
  } = filterState;
  const update = (changes: Partial<TExploreFilters>) =>
    setFilterState((current) => ({ ...current, ...changes }));
  const setWhen = (value: TWhen | undefined) => update({ when: value });
  const setCategoryId = (value: string | undefined) =>
    update({ categoryId: value });
  const setTrendingOnly = (value: boolean) => update({ trendingOnly: value });
  const [planner, setPlanner] = useState<string | undefined>();
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const sheetCount = countFilters(filterState);
  // Where the browse sections look; the picker behind every "in Lagos ▾".
  const storedPlace = useExplorePlaceStore((state) => state.place);
  const setPlace = useExplorePlaceStore((state) => state.setPlace);
  const [isPlaceOpen, setIsPlaceOpen] = useState(false);
  const openPlace = () => setIsPlaceOpen(true);
  const { width: screenWidth } = useWindowDimensions();
  // Rail cards: the home feed's card, narrow enough to show the next one.
  const railCardWidth = Math.min(320, screenWidth - 64);

  // The next two weeks, rebuilt when the date rolls over.
  const dayKey = new Date().toDateString();
  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) =>
        startOfDay(addDays(new Date(), index))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayKey]
  );

  // Everything narrowing the list, for the reset button's label.
  const activeCount = sheetCount + (q ? 1 : 0) + (planner ? 1 : 0);

  const isFiltering = !!(
    q ||
    when !== undefined ||
    categoryId ||
    priceType ||
    trendingOnly ||
    savedOnly ||
    past ||
    venue ||
    location ||
    planner ||
    tab !== "events"
  );

  const locationsQuery = useLiveEventLocations();
  const locations = locationsQuery.data ?? [];
  // Not picked yet: the phone's own country when it has events, else everywhere.
  const place: TExplorePlace | null =
    storedPlace !== undefined
      ? storedPlace
      : (() => {
          const home = locations.find((item) => item.countryCode === deviceRegion);
          return home ? { countryCode: home.countryCode, country: home.country } : null;
        })();
  const placeName = placeLabel(place);
  // For sentences: "in Lagos", or "anywhere" when looking everywhere.
  const inPlaceName = place ? `in ${placeName}` : "anywhere";

  const filters = useMemo<TLiveEventFilters>(
    () => ({
      q,
      categoryId,
      priceType,
      venueId: venue?.id,
      // A filter's location wins; browsing, the list follows the picked place.
      countryCode: location
        ? location.countryCode
        : isFiltering
          ? undefined
          : place?.countryCode,
      city: location ? location.city : isFiltering ? undefined : place?.city,
      ...(trendingOnly ? { isTrending: "true" as const } : {}),
      ...(savedOnly ? { isFavorite: "true" as const } : {}),
      ...(past ? { status: "PAST" as const } : {}),
      ...(when === undefined ? {} : rangeFilters(when))
    }),
    // dayKey keeps the date range current past midnight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      q,
      when,
      location,
      categoryId,
      priceType,
      trendingOnly,
      savedOnly,
      past,
      venue,
      dayKey,
      isFiltering,
      place?.countryCode,
      place?.city
    ]
  );

  // The list: every upcoming event while browsing, the results once filtering.
  const events = useLiveEvents(filters);
  // The browse rails.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const todayRange = useMemo(() => rangeFilters("today"), [dayKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weekRange = useMemo(() => rangeFilters("week"), [dayKey]);
  const inPlace = { countryCode: place?.countryCode, city: place?.city };
  const today = useLiveEvents({ ...todayRange, ...inPlace, limit: "10" });
  const thisWeek = useLiveEvents({ ...weekRange, ...inPlace, limit: "10" });
  const trending = useLiveEvents({ isTrending: "true", ...inPlace, limit: "10" });
  // Top performers from the place's part of the world.
  const chart = useLivePerformerChartFor(place?.countryCode, 10);
  const chartItems = chart.data?.performers ?? [];
  const chartRegion = chart.data?.region ?? "global";
  const chartPlace =
    chartRegion === "global"
      ? undefined
      : CHART_REGIONS.find((region) => region.value === chartRegion)?.label;
  // The venues rail looks in the place; the Venues tab searches everywhere.
  const venues = useLiveVenues(
    tab === "venues" ? q : "",
    isFiltering || !place ? undefined : { country: place.country, city: place.city }
  );
  const performers = useLivePerformers(q, tab === "performers");
  const performerItems = useMemo(
    () => (performers.data?.pages ?? []).flatMap((page) => page.performers),
    [performers.data]
  );
  const { data: categories = [] } = useLiveCategories();
  // Countries match on their name, code or any of their cities.
  // Location helpers: the phone's country first, then the busiest cities.
  const placeHelpers = useMemo(() => {
    const ordered = [...locations].sort(
      (a, b) =>
        Number(b.countryCode === deviceRegion) -
        Number(a.countryCode === deviceRegion)
    );
    const helpers: {
      key: string;
      label: string;
      countryCode: string;
      country: string;
      city?: string;
    }[] = [];
    const home = ordered[0];
    if (home) {
      helpers.push({
        key: home.countryCode,
        label: `In ${home.country}`,
        countryCode: home.countryCode,
        country: home.country
      });
    }
    ordered
      .flatMap((item) =>
        item.cities.map((city) => ({
          ...city,
          countryCode: item.countryCode,
          country: item.country
        }))
      )
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .forEach((city) =>
        helpers.push({
          key: `${city.countryCode}-${city.name}`,
          label: `In ${city.name}`,
          countryCode: city.countryCode,
          country: city.country,
          city: city.name
        })
      );
    return helpers;
  }, [locations]);

  const countryItems = useMemo(() => {
    const term = q.toLowerCase();
    if (!term) return locations;
    return locations.filter(
      (item) =>
        item.country.toLowerCase().includes(term) ||
        item.countryCode.toLowerCase() === term ||
        item.cities.some((city) => city.name.toLowerCase().includes(term))
    );
  }, [locations, q]);

  const flat = (query: typeof events) =>
    (query.data?.pages ?? []).flatMap((page) => page.events);
  const eventItems = useMemo(() => {
    const all = visible(flat(events));
    return planner
      ? all.filter((event) => event.organizerName === planner)
      : all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.data, planner, hiddenEventIds]);
  const todayItems = useMemo(() => visible(flat(today)), [today.data, hiddenEventIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const weekItems = useMemo(() => visible(flat(thisWeek)), [thisWeek.data, hiddenEventIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const trendingItems = useMemo(() => visible(flat(trending)), [trending.data, hiddenEventIds]); // eslint-disable-line react-hooks/exhaustive-deps
  const venueItems = useMemo(
    () => (venues.data?.pages ?? []).flatMap((page) => page.venues),
    [venues.data]
  );

  // Every planner with something coming up, wherever it is, busiest first.
  const plannersQuery = useLivePlanners("", 10);
  // An api without the planners list yet: the organisers in the loaded events.
  const derivedPlanners = useMemo<TPlanner[]>(() => {
    const byName = new Map<string, TPlanner>();
    flat(events).forEach((event) => {
      const name = event.organizerName?.trim();
      if (!name) return;
      const current = byName.get(name);
      byName.set(name, {
        name,
        count: (current?.count ?? 0) + 1,
        image: current?.image ?? event.image ?? event.medias?.[0],
        organizerId: current?.organizerId ?? event.organizerId
      });
    });
    return [...byName.values()].sort((a, b) => b.count - a.count).slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.data]);
  const apiPlanners = plannersQuery.data?.pages?.[0]?.planners;
  const planners: TPlanner[] = plannersQuery.isError
    ? derivedPlanners
    : (apiPlanners ?? []).map((planner) => ({
        name: planner.name,
        count: planner.upcomingEvents,
        image: planner.image ?? undefined,
        organizerId: planner.id
      }));

  // Happening today, or this week when nothing is on today.
  const soonItems = todayItems.length ? todayItems : weekItems;
  const soonTitle = todayItems.length
    ? "Happening today"
    : "Happening this week";

  const clearAll = () => {
    setSearch("");
    setFilterState(EMPTY_FILTERS);
    setPlanner(undefined);
  };

  const openVenue = (item: TLiveVenue) => push({ kind: "venue", venue: item });

  const isEvents = tab === "events";
  const query =
    tab === "events"
      ? events
      : tab === "venues"
        ? venues
        : tab === "performers"
          ? performers
          : locationsQuery;

  const filtersBlock = (
    <View className="gap-4 pb-4 pt-4">
      <View className="gap-1 px-4">
        <TextComponent
          className="text-xs font-bold tracking-widest"
          style={{ color: ACCENT }}
        >
          EXPLORE
        </TextComponent>
        <TextComponent className="text-3xl font-bold text-zinc-950">
          Find what&apos;s on
        </TextComponent>
      </View>

      <View className="mx-4 h-12 flex-row items-center gap-2 rounded-full border border-black/5 bg-white px-4">
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Circle
            cx="11"
            cy="11"
            r="7"
            fill="none"
            stroke="#71717a"
            strokeWidth={2}
          />
          <Path
            d="M20 20l-3.5-3.5"
            stroke="#71717a"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            tab === "events"
              ? "Search events, places, venues..."
              : tab === "venues"
                ? "Search venues by name"
                : tab === "performers"
                  ? "Search performers by name"
                  : "Search countries or cities"
          }
          placeholderTextColor="#a1a1aa"
          returnKeyType="search"
          autoCorrect={false}
          className="flex-1 text-base text-zinc-950"
          style={{ fontFamily: "PlusJakartaSans-Regular" }}
        />
        {!!search && (
          <Pressable
            onPress={() => setSearch("")}
            hitSlop={8}
            accessibilityLabel="Clear search"
          >
            <TextComponent className="text-sm text-zinc-400">
              Clear
            </TextComponent>
          </Pressable>
        )}
        {/* The app's filter button, with how many filters are on. */}
        <Pressable
          onPress={() => setIsSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            sheetCount ? `Filters, ${sheetCount} on` : "Filters"
          }
          hitSlop={6}
          className="ml-1 size-9 items-center justify-center rounded-full"
          style={{ backgroundColor: sheetCount ? INK : "#f4f5f8" }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path
              d="M4 7h10M18 7h2M4 17h4M12 17h8"
              stroke={sheetCount ? "#ffffff" : INK}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Circle
              cx="16"
              cy="7"
              r="2"
              fill="none"
              stroke={sheetCount ? "#ffffff" : INK}
              strokeWidth={2}
            />
            <Circle
              cx="10"
              cy="17"
              r="2"
              fill="none"
              stroke={sheetCount ? "#ffffff" : INK}
              strokeWidth={2}
            />
          </Svg>
          {sheetCount > 0 && (
            <View
              className="absolute -right-1 -top-1 size-5 items-center justify-center rounded-full"
              style={{ backgroundColor: ACCENT }}
            >
              <TextComponent className="text-[10px] font-bold text-white">
                {sheetCount}
              </TextComponent>
            </View>
          )}
        </Pressable>
      </View>

      {/* Categories first, as the app had them. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4"
      >
        <Chip
          label="All"
          active={!categoryId}
          onPress={() => setCategoryId(undefined)}
        />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            active={categoryId === category.id}
            onPress={() =>
              setCategoryId(
                categoryId === category.id ? undefined : category.id
              )
            }
          />
        ))}
      </ScrollView>

      {/* The web's day strip and quick ranges. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4"
      >
        {days.map((day, index) => {
          const value = day.getTime();
          const active = when === value;
          const weekend = day.getDay() === 0 || day.getDay() === 6;
          return (
            <Pressable
              key={value}
              onPress={() => setWhen(active ? undefined : value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className="w-14 items-center rounded-2xl py-2"
              style={{ backgroundColor: active ? INK : "#ffffff" }}
            >
              <TextComponent
                className="text-[11px] font-semibold"
                style={{
                  color: active ? "#ffffff" : weekend ? ACCENT : "#71717a"
                }}
              >
                {index === 0 ? "TODAY" : WEEKDAYS[day.getDay()]}
              </TextComponent>
              <TextComponent
                className="text-xl font-bold"
                style={{ color: active ? "#ffffff" : INK }}
              >
                {day.getDate()}
              </TextComponent>
              <TextComponent
                className="text-[10px]"
                style={{ color: active ? "rgba(255,255,255,0.7)" : "#a1a1aa" }}
              >
                {MONTHS[day.getMonth()]}
              </TextComponent>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4"
      >
        {PRESETS.map((preset) => (
          <Chip
            key={preset.value}
            label={preset.label}
            tone="accent"
            active={when === preset.value}
            onPress={() =>
              setWhen(when === preset.value ? undefined : preset.value)
            }
          />
        ))}
        {placeHelpers.map((helper) => {
          const active =
            location?.countryCode === helper.countryCode &&
            location?.city === helper.city;
          return (
            <Chip
              key={helper.key}
              label={`📍 ${helper.label.replace(/^In /, "")}`}
              tone="accent"
              active={active}
              onPress={() =>
                update({
                  location: active
                    ? undefined
                    : {
                        countryCode: helper.countryCode,
                        country: helper.country,
                        city: helper.city
                      }
                })
              }
            />
          );
        })}
      </ScrollView>
    </View>
  );

  // A rail's event: the home feed's ticket card, with the same dots.
  const railCard = (event: TLiveEvent) => (
    <EventTicketCard
      width={railCardWidth}
      eventId={event.id}
      name={event.name}
      date={event.date}
      timezone={event.timezone}
      image={event.image ?? event.medias?.[0]}
      category={event.category?.name}
      place={eventPlace(event)}
      momentum={event.momentum}
      onPress={() => onOpenEvent(event.id)}
      onMore={() => openCardOptions(event)}
    />
  );
  const browsing = (query: typeof events) => query.isLoading && !query.data;

  // Browsing: the app's sections, each headed by where it's looking
  // ("Trending in Lagos ▾"), which opens the location picker.
  const browseBlock = (
    <View className="gap-7 pb-6">
      <View>
        <SectionHeader
          title={soonTitle}
          place={placeName}
          onPlace={openPlace}
          onAction={soonItems.length ? () => setWhen(todayItems.length ? "today" : "week") : undefined}
        />
        {soonItems.length ? (
          <Rail items={soonItems} keyOf={(event) => event.id} render={railCard} />
        ) : browsing(today) || browsing(thisWeek) ? (
          <ActivityIndicator color={BLUE} className="py-6" />
        ) : (
          <SectionEmpty text={`Nothing on this week ${inPlaceName}.`} onPlace={openPlace} />
        )}
      </View>
      <View>
        <SectionHeader
          title="Trending"
          place={placeName}
          onPlace={openPlace}
          onAction={trendingItems.length ? () => setTrendingOnly(true) : undefined}
        />
        {trendingItems.length ? (
          <Rail items={trendingItems} keyOf={(event) => event.id} render={railCard} />
        ) : browsing(trending) ? (
          <ActivityIndicator color={BLUE} className="py-6" />
        ) : (
          <SectionEmpty text={`Nothing trending ${inPlaceName} yet.`} onPlace={openPlace} />
        )}
      </View>
      {chartItems.length > 0 && (
        <View>
          <SectionHeader
            title="Top performers"
            place={chartPlace}
            onPlace={chartPlace ? openPlace : undefined}
            action="View charts"
            onAction={() => push({ kind: "chart" })}
          />
          <Rail
            items={chartItems}
            keyOf={(item) => item.id}
            render={(item) => (
              <PerformerRailCard
                performer={item}
                onPress={() => push({ kind: "performer", id: item.id })}
              />
            )}
          />
        </View>
      )}
      <View>
        <SectionHeader
          title="Venues"
          place={placeName}
          onPlace={openPlace}
          onAction={venueItems.length ? () => setTab("venues") : undefined}
        />
        {venueItems.length ? (
          <Rail
            items={venueItems.slice(0, 10)}
            keyOf={(item) => item.id}
            render={(item) => (
              <VenueTile venue={item} onPress={() => openVenue(item)} />
            )}
          />
        ) : venues.isLoading ? (
          <ActivityIndicator color={BLUE} className="py-6" />
        ) : (
          <SectionEmpty text={`No venues listed ${inPlaceName} yet.`} onPlace={openPlace} />
        )}
      </View>
      {planners.length > 0 && (
        <View>
          <SectionHeader
            title="Event planners"
            onAction={plannersQuery.isError ? undefined : () => push({ kind: "planners" })}
          />
          <Rail
            items={planners}
            keyOf={(item) => item.name}
            render={(item) => (
              <PlannerTile
                planner={item}
                onPress={() =>
                  push({ kind: "planner", name: item.name, organizerId: item.organizerId })
                }
              />
            )}
          />
        </View>
      )}
      <SectionHeader title="All upcoming events" place={placeName} onPlace={openPlace} />
    </View>
  );

  // Filtering: what's applied, the events/venues switch, and a way out.
  const resultsBlock = (
    <View className="gap-3 pb-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4"
      >
        <View className="flex-row rounded-full border border-black/5 bg-white p-1">
          {RESULT_TABS.map(({ value, label }) => (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === value }}
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: tab === value ? INK : "transparent" }}
            >
              <TextComponent
                className="text-sm font-medium"
                style={{ color: tab === value ? "#ffffff" : INK }}
              >
                {label}
              </TextComponent>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View className="mx-4 flex-row items-center justify-end">
        <Pressable
          onPress={() => {
            clearAll();
            setTab("events");
          }}
          hitSlop={8}
          accessibilityRole="button"
        >
          <TextComponent className="text-sm font-bold" style={{ color: ACCENT }}>
            {activeCount === 0
              ? "Back to events"
              : activeCount > 1
                ? `✕ Clear all ${activeCount} filters`
                : "✕ Clear filter"}
          </TextComponent>
        </Pressable>
      </View>
      {isEvents && location && !venue && !planner && (
        <View className="mx-4 rounded-2xl bg-[#eef6ff] px-4 py-3">
          <TextComponent numberOfLines={1} className="text-sm text-zinc-900">
            Events in{" "}
            <TextComponent className="font-bold">
              {location.city
                ? `${location.city}, ${location.country}`
                : location.country}
            </TextComponent>
          </TextComponent>
        </View>
      )}
      {isEvents && (venue || planner || trendingOnly || savedOnly || past) && (
        <View className="mx-4 rounded-2xl bg-[#eef6ff] px-4 py-3">
          <TextComponent numberOfLines={1} className="text-sm text-zinc-900">
            {venue
              ? "Events at "
              : planner
                ? "Events by "
                : savedOnly
                  ? "Your "
                  : past
                    ? "Past "
                    : "Trending "}
            <TextComponent className="font-bold">
              {venue?.name ??
                planner ??
                (savedOnly ? "saved events" : past ? "events" : "right now")}
            </TextComponent>
          </TextComponent>
        </View>
      )}
    </View>
  );

  // Boosted events: at the top of Explore while browsing, and of search results.
  const sponsoredPlacement = !isFiltering ? "EXPLORE" : isEvents && q ? "SEARCH" : null;
  // The place is settled (picked, or the phone's own country found), so a
  // boost from somewhere else never flashes up first.
  const placeReady = storedPlace !== undefined || !locationsQuery.isPending;
  const sponsored = sponsoredPlacement && (sponsoredPlacement === "SEARCH" || placeReady) && (
    <View className={sponsoredPlacement === "SEARCH" ? "pb-2 pt-4" : "pb-2"}>
      <SponsoredRail
        placement={sponsoredPlacement}
        q={sponsoredPlacement === "SEARCH" ? q : undefined}
        countryCode={sponsoredPlacement === "SEARCH" ? undefined : place?.countryCode}
        city={sponsoredPlacement === "SEARCH" ? undefined : place?.city}
        cardWidth={railCardWidth}
        onOpenEvent={onOpenEvent}
      />
    </View>
  );
  const header = (
    <View>
      {filtersBlock}
      {isFiltering ? (
        <>
          {resultsBlock}
          {sponsored}
        </>
      ) : (
        <>
          {sponsored}
          {browseBlock}
        </>
      )}
    </View>
  );

  const empty = (
    <View className="items-center gap-2 px-8 pt-6">
      {query.isLoading ? (
        <ActivityIndicator color={BLUE} />
      ) : (
        <>
          <TextComponent className="text-center text-lg font-bold text-zinc-950">
            {query.error
              ? `We couldn't load ${tab}`
              : tab === "events"
                ? "No events match"
                : tab === "venues"
                  ? "No venues found"
                  : tab === "performers"
                    ? "No performers found"
                    : "No countries match"}
          </TextComponent>
          <TextComponent className="text-center text-sm text-zinc-500">
            {query.error
              ? "Pull down to try again."
              : "Try another day, category or search."}
          </TextComponent>
        </>
      )}
    </View>
  );

  const loadMore = () => {
    if (!("fetchNextPage" in query)) return;
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  const refresh = () => {
    // Sponsored too: a boost may have started since.
    void queryClient.invalidateQueries({ queryKey: ["sponsored"] });
    void events.refetch();
    void today.refetch();
    void thisWeek.refetch();
    void trending.refetch();
    void venues.refetch();
    void chart.refetch();
    void performers.refetch();
    void locationsQuery.refetch();
  };

  const sheet = (
    <ExploreFilterSheet
      visible={isSheetOpen}
      value={filterState}
      categories={categories}
      venues={venueItems}
      locations={locations}
      canShowSaved={isSignedIn}
      onClose={() => setIsSheetOpen(false)}
      onApply={(next) => {
        setFilterState(next);
        setPlanner(undefined);
        setTab("events");
        setIsSheetOpen(false);
      }}
    />
  );

  const placeSheet = (
    <ExplorePlaceSheet
      visible={isPlaceOpen}
      locations={locations}
      current={place}
      homeCountryCode={deviceRegion}
      onPick={(next) => {
        setPlace(next);
        listRef.current?.scrollToTop();
      }}
      onClose={() => setIsPlaceOpen(false)}
    />
  );

  // An open page sits over Explore; Explore keeps its filters and scroll.
  const optionsSheet = (
    <EventOptionsSheet
      event={optionsEvent}
      onClose={() => setOptionsEvent(null)}
      onOpenEvent={onOpenEvent}
    />
  );
  const detail = stack[stack.length - 1];
  if (detail) {
    return (
      <>
        {optionsSheet}
        {renderDetail(detail)}
      </>
    );
  }
  function renderDetail(detail: TExploreDetail) {
    switch (detail.kind) {
      case "event":
        return (
          <LiveEventDetailScreen
            eventId={detail.id}
            onBack={pop}
            onBook={onBook}
            onOpenPerformer={(id) => push({ kind: "performer", id })}
          />
        );
      case "chart":
        return (
          <PerformerChartScreen
            onBack={pop}
            onOpenPerformer={(id) => push({ kind: "performer", id })}
          />
        );
      case "performer":
        return (
          <PerformerProfileScreen
            onEventOptions={openCardOptions}
            performerId={detail.id}
            onBack={pop}
            onOpenEvent={onOpenEvent}
          />
        );
      case "venue":
        return (
          <VenueDetailScreen
            onEventOptions={openCardOptions}
            venue={detail.venue}
            onBack={pop}
            onOpenEvent={onOpenEvent}
          />
        );
      case "planners":
        return (
          <PlannersScreen
            onBack={pop}
            onOpenPlanner={(planner) =>
              push({ kind: "planner", name: planner.name, organizerId: planner.id })
            }
          />
        );
      case "planner":
        return (
          <PlannerDetailScreen
            name={detail.name}
            organizerId={detail.organizerId}
            events={visible(flat(events)).filter(
              (event) => event.organizerName === detail.name
            )}
            onEventOptions={openCardOptions}
            onBack={pop}
            onOpenEvent={onOpenEvent}
          />
        );
    }
  }

  const footer = (loading: boolean) =>
    loading ? <ActivityIndicator color={BLUE} className="py-6" /> : null;
  const listProps = {
    listRef,
    style: { backgroundColor: TICKET_LIST_BACKGROUND },
    ListHeaderComponent: header,
    ListEmptyComponent: empty,
    keyboardShouldPersistTaps: "handled" as const,
    onRefresh: refresh,
    onEndReached: loadMore
  };

  if (tab === "performers") {
    return (
      <>
        {sheet}
      {optionsSheet}
      {placeSheet}
        <BrandRefreshList<TLivePerformer>
          {...listProps}
          data={performerItems}
          keyExtractor={(item) => item.id}
          refreshing={performers.isRefetching}
          ListFooterComponent={footer(performers.isFetchingNextPage)}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => push({ kind: "performer", id: item.id })}
              accessibilityRole="button"
              className="mx-4 mb-3 flex-row items-center gap-4 rounded-3xl border border-black/5 bg-white p-4"
            >
              <PerformerAvatar performer={item} size={64} />
              <View className="flex-1 gap-0.5">
                <TextComponent
                  numberOfLines={1}
                  className="text-base font-bold text-zinc-950"
                >
                  {item.name}
                </TextComponent>
                <TextComponent
                  numberOfLines={1}
                  className="text-sm text-zinc-500"
                >
                  {PERFORMER_TYPE_LABELS[item.type]}
                  {item.country ? ` · ${item.country}` : ""}
                </TextComponent>
                <TextComponent
                  className="text-xs font-semibold"
                  style={{ color: BLUE }}
                >
                  {item.upcomingEventsCount} upcoming{" "}
                  {item.upcomingEventsCount === 1 ? "event" : "events"}
                </TextComponent>
              </View>
            </Pressable>
          )}
        />
      </>
    );
  }

  if (tab === "countries") {
    const openLocation = (
      item: (typeof countryItems)[number],
      city?: string
    ) => {
      setSearch("");
      setFilterState((current) => ({
        ...current,
        location: { countryCode: item.countryCode, country: item.country, city }
      }));
      setTab("events");
    };
    return (
      <>
        {sheet}
      {optionsSheet}
      {placeSheet}
        <BrandRefreshList<TLiveLocation>
          {...listProps}
          data={countryItems}
          keyExtractor={(item) => item.countryCode}
          refreshing={locationsQuery.isRefetching}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openLocation(item)}
              accessibilityRole="button"
              accessibilityLabel={`Events in ${item.country}`}
              className="mx-4 mb-3 gap-3 rounded-3xl border border-black/5 bg-white p-4"
            >
              <View className="flex-row items-center gap-3">
                <LinearGradient
                  colors={[BLUE, ACCENT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="size-12 items-center justify-center rounded-2xl"
                >
                  <TextComponent className="text-base font-bold text-white">
                    {item.countryCode}
                  </TextComponent>
                </LinearGradient>
                <View className="flex-1">
                  <TextComponent className="text-base font-bold text-zinc-950">
                    {item.country}
                  </TextComponent>
                  <TextComponent className="text-sm text-zinc-500">
                    {item.count} upcoming{" "}
                    {item.count === 1 ? "event" : "events"}
                  </TextComponent>
                </View>
              </View>
              {item.cities.length > 0 && (
                <View className="flex-row flex-wrap gap-2">
                  {item.cities.slice(0, 6).map((city) => (
                    <Pressable
                      key={city.name}
                      onPress={() => openLocation(item, city.name)}
                      accessibilityRole="button"
                      className="rounded-full bg-[#f4f5f8] px-3 py-1.5"
                    >
                      <TextComponent className="text-sm text-zinc-800">
                        {city.name} · {city.count}
                      </TextComponent>
                    </Pressable>
                  ))}
                </View>
              )}
            </Pressable>
          )}
        />
      </>
    );
  }

  return isEvents ? (
    <>
      {sheet}
      {optionsSheet}
      {placeSheet}
      <BrandRefreshList<TLiveEvent>
        listRef={listRef}
        data={eventItems}
        keyExtractor={(event) => event.id}
        style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <EventTicketCard
            eventId={item.id}
            name={item.name}
            date={item.date}
            timezone={item.timezone}
            image={item.image ?? item.medias?.[0]}
            category={item.category?.name}
            place={eventPlace(item)}
            momentum={item.momentum}
            onPress={() => onOpenEvent(item.id)}
            onMore={() => openCardOptions(item)}
          />
        )}
        refreshing={events.isRefetching}
        onRefresh={refresh}
        onEndReached={loadMore}
        ListFooterComponent={
          events.isFetchingNextPage ? (
            <ActivityIndicator color={BLUE} className="py-6" />
          ) : null
        }
      />
    </>
  ) : (
    <>
      {sheet}
      {optionsSheet}
      {placeSheet}
      <BrandRefreshList<TLiveVenue>
        listRef={listRef}
        data={venueItems}
        keyExtractor={(item) => item.id}
        style={{ backgroundColor: TICKET_LIST_BACKGROUND }}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <VenueCard venue={item} onPress={() => openVenue(item)} />
        )}
        refreshing={venues.isRefetching}
        onRefresh={refresh}
        onEndReached={loadMore}
        ListFooterComponent={
          venues.isFetchingNextPage ? (
            <ActivityIndicator color={BLUE} className="py-6" />
          ) : null
        }
      />
    </>
  );
};

export default memo(LiveExploreScreen);
