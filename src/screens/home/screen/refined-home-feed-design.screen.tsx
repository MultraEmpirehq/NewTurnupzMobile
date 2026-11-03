import NavIcon from "@/shared/components/nav-icons/nav-icons";
import { useLiveUserTickets } from "@/screens/live/live-api";
import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, View } from "react-native";
import { ScreenActiveContext } from "@/shared/hooks/use-screen-active";
import { useHomePlace } from "@/shared/hooks/use-home-place";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import ContainerComponent from "@/shared/components/container/container.component";
import TextComponent from "@/shared/components/text/text.component";
import { TEventDetailsType } from "@/shared/utils/types";
import TurnupzWordmark from "@/shared/assets/images/turnupz-wordmark-blue.png";
import { useAccessibilityStore } from "@/shared/stores/accessibility.store";
import { useTranslation } from "react-i18next";
import LiveEventDetailScreen from "@/screens/live/event-detail.screen";
import LiveTicketCheckoutScreen from "@/screens/live/ticket-checkout.screen";
import LiveMyTicketsScreen from "@/screens/live/my-tickets.screen";
import LiveExploreScreen from "@/screens/live/explore.screen";
import ProfileScreen from "@/screens/profile/profile.screen";
import NotificationsScreen from "@/screens/notifications/notifications.screen";
import ChatsScreen from "@/screens/chat/chats.screen";
import PeopleModal from "@/screens/people/people-modal";
import { useUnreadNotifications } from "@/screens/notifications/notifications-api";
import EventOptionsSheet, {
  TEventOptionsTarget
} from "@/screens/live/event-options.sheet";
import { useHiddenEventsStore } from "@/shared/stores/hidden-events.store";
import useUserStore from "@/shared/stores/user.store";
import { PerformerProfileScreen as LivePerformerProfileScreen } from "@/screens/live/explore-details";
import BrandRefreshList, {
  TBrandRefreshListHandle
} from "@/shared/components/brand-refresh/brand-refresh-list.component";
import BrandLoader from "@/shared/components/brand-loader/brand-loader.component";
import EventTicketCard, {
  TICKET_LIST_BACKGROUND
} from "@/screens/live/event-ticket-card";
import {
  eventPlace,
  TEventMomentum,
  TLiveEvent,
  useLiveEvents
} from "@/screens/live/live-api";
import { FeaturedBoost } from "@/screens/live/sponsored";
import OrganiserShellScreen from "@/screens/organiser/organiser-shell.screen";
import ChooseModeSheet from "@/screens/organiser/choose-mode.sheet";
import WebOnlySheet, { TWebOnlyTask } from "@/screens/organiser/web-only.sheet";
import { useOrganiserAccess } from "@/screens/organiser/organiser-api";
import { useOrganiserStore } from "@/shared/stores/organiser.store";

type TFeedMediaKind = "image" | "video";
type TFeedEvent = Omit<TEventDetailsType, "date"> & {
  date: Date;
  organizerName: string;
  venueName: string;
  venueAddress: string;
  mediaKind?: TFeedMediaKind;
  /** Set on live events; times then read on the venue's clock. */
  timezone?: string;
  /** The event's category name, shown as a tag on the card's poster. */
  category?: string;
  /** Saved by the signed-in person (live events). */
  isFavorite?: boolean;
  /** How it's selling, for the card's label. */
  momentum?: TEventMomentum | null;
};

type TBottomNavId =
  "home" | "search" | "tickets" | "messages" | "favorites" | "profile";

type TBottomNavItem = {
  id: TBottomNavId;
  /** Its name, as a key under nav.* in the translations. */
  label: "home" | "explore" | "messages" | "notifications" | "profile";
  renderIcon: (color: string, active: boolean) => React.ReactNode;
};

const ACTIVE_NAV_COLOR = "#00B2FF";
/** How many events the home feed fetches at a time. */
const HOME_FEED_BATCH = 10;
const INACTIVE_NAV_COLOR = "#3F3F46";

/** The bottom bar is icons only (labels are an accessibility option). */
const NAV_ICON_SIZE = 26;

const BOTTOM_NAV_ITEMS: TBottomNavItem[] = [
  {
    id: "home",
    label: "home",
    renderIcon: (color, active) => (
      <NavIcon name="home" size={NAV_ICON_SIZE} color={color} active={active} />
    )
  },
  {
    id: "search",
    label: "explore",
    renderIcon: (color, active) => (
      <NavIcon
        name="explore"
        size={NAV_ICON_SIZE}
        color={color}
        active={active}
      />
    )
  },
  {
    id: "messages",
    label: "messages",
    renderIcon: (color, active) => (
      <NavIcon
        name="messages"
        size={NAV_ICON_SIZE}
        color={color}
        active={active}
      />
    )
  },
  {
    id: "favorites",
    label: "notifications",
    renderIcon: (color, active) => (
      <NavIcon
        name="notifications"
        size={NAV_ICON_SIZE}
        color={color}
        active={active}
      />
    )
  },
  {
    id: "profile",
    label: "profile",
    renderIcon: (color, active) => (
      <NavIcon
        name="profile"
        size={NAV_ICON_SIZE}
        color={color}
        active={active}
      />
    )
  }
];

/** A live event in the shape the feed card draws. */
const toLiveFeedEvent = (event: TLiveEvent): TFeedEvent => ({
  id: event.id,
  name: event.name,
  date: new Date(event.date),
  image: event.image ?? "",
  medias: [event.image, ...(event.medias ?? [])].filter(Boolean) as string[],
  totalTickets: 0,
  organizerName: event.organizerName ?? "",
  venueName: eventPlace(event),
  venueAddress: event.venue?.address ?? "",
  mediaKind: "image",
  timezone: event.timezone,
  category: event.category?.name,
  isFavorite: event.isFavorite,
  momentum: event.momentum,
  description: event.description,
  venue: {
    id: event.venue?.id ?? `${event.id}-venue`,
    name: event.venue?.name ?? eventPlace(event),
    address: event.venue?.address ?? "",
    totalAvailableSeat: 0,
    images: event.image ? [event.image] : []
  }
});

const PreviewBottomNav = ({
  activeTab,
  onTabPress,
  unreadNotifications = 0
}: {
  activeTab: TBottomNavId;
  onTabPress: (tab: TBottomNavId) => void;
  /** Shows a blue dot on the notifications tab. */
  unreadNotifications?: number;
}) => {
  const { t } = useTranslation();
  const buttonLabels = useAccessibilityStore((state) => state.buttonLabels);
  const screenReaderHints = useAccessibilityStore(
    (state) => state.screenReaderHints
  );
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  // Above Android's navigation buttons and the iPhone home bar, not under them.
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ height: (buttonLabels ? 76 : 68) + insets.bottom, paddingBottom: insets.bottom }}
      className={
        highContrast
          ? buttonLabels
            ? "flex-row items-center justify-between border-t-2 border-white bg-black px-3"
            : "flex-row items-center justify-around border-t-2 border-white bg-black px-2"
          : buttonLabels
            ? "flex-row items-center justify-between border-t border-zinc-200 bg-white px-3"
            : "flex-row items-center justify-around border-t border-zinc-200 bg-white px-2"
      }
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        const label = t(`nav.${item.label}`);
        const color = isActive
          ? highContrast
            ? "#38bdf8"
            : ACTIVE_NAV_COLOR
          : highContrast
            ? "#ffffff"
            : INACTIVE_NAV_COLOR;

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={
              item.id === "favorites" && unreadNotifications > 0
                ? t("nav.unread", { label, count: unreadNotifications })
                : label
            }
            accessibilityHint={
              screenReaderHints ? t("nav.opens", { label }) : undefined
            }
            accessibilityState={{ selected: isActive }}
            onPress={() => onTabPress(item.id)}
            className={
              buttonLabels
                ? "h-14 min-w-14 items-center justify-center"
                : "size-14 items-center justify-center rounded-full"
            }
          >
            <View>
              {item.renderIcon(color, isActive)}
              {item.id === "favorites" && unreadNotifications > 0 && (
                <View
                  className="absolute -right-1 -top-0.5 size-2.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: "#0577FA" }}
                />
              )}
            </View>
            {/* Icons only: a dot marks where you are. */}
            {!buttonLabels && (
              <View
                className="mt-1 size-1.5 rounded-full"
                style={{ backgroundColor: isActive ? color : "transparent" }}
              />
            )}
            {buttonLabels && (
              <TextComponent
                className={
                  highContrast
                    ? isActive
                      ? "mt-1 text-[10px] font-bold text-sky-300"
                      : "mt-1 text-[10px] text-white"
                    : isActive
                      ? "mt-1 text-[10px] font-bold text-primary"
                      : "mt-1 text-[10px] text-zinc-500"
                }
              >
                {label}
              </TextComponent>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

/** The feed's background; the card's ticket notches are cut in it. */
const FEED_BACKGROUND = TICKET_LIST_BACKGROUND;

/** A feed event as a web-style ticket stub; the dots open its options. */
const FeedCard = ({
  event,
  onOpenSettings,
  onOpenDetails
}: {
  event: TFeedEvent;
  onOpenSettings: (event: TFeedEvent) => void;
  onOpenDetails?: (event: TFeedEvent) => void;
}) => (
  <EventTicketCard
    eventId={event.id}
    name={event.name}
    date={event.date}
    timezone={event.timezone}
    image={event.medias?.[0] || event.image}
    category={event.category}
    place={event.venueName}
    badge={event.mediaKind === "video" ? "Video" : undefined}
    momentum={event.momentum}
    onPress={() => onOpenDetails?.(event)}
    onMore={() => onOpenSettings(event)}
  />
);

const RefinedHomeFeedDesignScreen = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TBottomNavId>("home");
  // Tabs opened so far; they stay mounted (hidden) after you leave them.
  const [visitedTabs, setVisitedTabs] = useState<TBottomNavId[]>(["home"]);
  useEffect(() => {
    setVisitedTabs((tabs) =>
      tabs.includes(activeTab) ? tabs : [...tabs, activeTab]
    );
  }, [activeTab]);
  // Android back on another tab returns to Home; on Home it leaves the app.
  // Pages opened on top answer first (each has its own back handling).
  useHardwareBack(() => {
    if (activeTab === "home") return false;
    setActiveTab("home");
  });
  // Tapping the tab you're on takes that screen back to its top.
  const homeListRef = useRef<TBrandRefreshListHandle>(null);
  const [exploreTopSignal, setExploreTopSignal] = useState(0);
  const onTabPress = (tab: TBottomNavId) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      return;
    }
    if (tab === "home") {
      homeListRef.current?.scrollToTop();
    }
    if (tab === "search") setExploreTopSignal((count) => count + 1);
  };
  const [ticketsReturnTab, setTicketsReturnTab] =
    useState<TBottomNavId>("profile");
  // An event whose passes open as soon as My tickets does (tapped on the profile).
  const [ticketsOpenEventId, setTicketsOpenEventId] = useState<string | null>(
    null
  );
  // Hidden events and the card dots: the same store and sheet as Explore.
  const hiddenEventIds = useHiddenEventsStore((state) => state.hiddenEventIds);
  const syncHiddenEvents = useHiddenEventsStore((state) => state.sync);
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const userId = useUserStore((state) => state.user?.id);
  // Organisers and team members: which app opens, asked once and remembered.
  const organiser = useOrganiserAccess();
  const mode = useOrganiserStore((state) => state.mode);
  const setMode = useOrganiserStore((state) => state.setMode);
  const askedFor = useOrganiserStore((state) => state.askedFor);
  const markAsked = useOrganiserStore((state) => state.markAsked);
  const inOrganiserMode = mode === "organiser" && organiser.canOrganise;
  const askMode =
    isSignedIn && !!userId && organiser.ready && organiser.canOrganise && !askedFor.includes(userId);
  const chooseMode = (next: "attendee" | "organiser") => {
    if (userId) markAsked(userId);
    setMode(next);
  };
  // Signed in on the Organiser side: open as an organiser if they already run
  // events, are on a team or are door staff for an event (the organiser side
  // has the scanner); else point them at vendor verification on the website.
  const wantsToHost = useOrganiserStore((state) => state.wantsToHost);
  const setWantsToHost = useOrganiserStore((state) => state.setWantsToHost);
  const [hostTask, setHostTask] = useState<TWebOnlyTask | null>(null);
  useEffect(() => {
    if (!wantsToHost || !isSignedIn || !userId || !organiser.ready) return;
    setWantsToHost(false);
    if (organiser.canOrganise) {
      chooseMode("organiser");
      return;
    }
    setHostTask({
      title: "Vendor verification",
      reason: "Tell us about your business there, and once you're approved you can create events and sell tickets.",
      path: "/app/settings/vendor-verification"
    });
  }, [wantsToHost, isSignedIn, userId, organiser.ready, organiser.canOrganise]); // eslint-disable-line react-hooks/exhaustive-deps
  const unreadNotifications = useUnreadNotifications(isSignedIn);
  // Your tickets, loaded once when the app opens (all of them), so event pages
  // and cards know what you're going to, and a fresh copy is kept for offline.
  const myTickets = useLiveUserTickets(isSignedIn);
  useEffect(() => {
    if (myTickets.hasNextPage && !myTickets.isFetchingNextPage) void myTickets.fetchNextPage();
  }, [myTickets.hasNextPage, myTickets.isFetchingNextPage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isSignedIn) void syncHiddenEvents();
  }, [isSignedIn, syncHiddenEvents]);
  const [optionsEvent, setOptionsEvent] = useState<TEventOptionsTarget | null>(
    null
  );
  // The home feed is live: published events from the API, ten at a time,
  // the next ten fetched as you scroll towards the end.
  // Where the feed shows events from: your city if location is on (or your
  // country when your city has none yet), otherwise everywhere.
  const homePlace = useHomePlace();
  const place = homePlace.place;
  const [cityHasNone, setCityHasNone] = useState(false);
  const [countryHasNone, setCountryHasNone] = useState(false);
  useEffect(() => {
    setCityHasNone(false);
    setCountryHasNone(false);
  }, [place?.city, place?.countryCode]);
  const scope: "city" | "country" | "everywhere" =
    !place || countryHasNone
      ? "everywhere"
      : place.city && !cityHasNone
        ? "city"
        : "country";
  const liveEvents = useLiveEvents(
    {
      limit: String(HOME_FEED_BATCH),
      ...(scope === "city"
        ? { city: place?.city ?? "", countryCode: place?.countryCode ?? "" }
        : {}),
      ...(scope === "country" ? { countryCode: place?.countryCode ?? "" } : {})
    },
    homePlace.ready
  );
  // Nothing on in your city yet: widen to your country, then everywhere.
  const firstPageEmpty =
    !!liveEvents.data &&
    !liveEvents.isFetching &&
    !liveEvents.data.pages[0]?.events.length;
  useEffect(() => {
    if (!firstPageEmpty) return;
    if (scope === "city") setCityHasNone(true);
    else if (scope === "country") setCountryHasNone(true);
  }, [firstPageEmpty, scope]);
  // The loader shows only while the feed's first page (and your location, the
  // first time) are on their way.
  const isSplashVisible =
    !homePlace.ready || (liveEvents.isLoading && !liveEvents.data);
  const feedEvents = useMemo(
    () =>
      (liveEvents.data?.pages ?? [])
        .flatMap((page) => page.events)
        .map(toLiveFeedEvent)
        .filter((event) => !hiddenEventIds.includes(event.id)),
    [hiddenEventIds, liveEvents.data]
  );
  const [liveEventId, setLiveEventId] = useState<string | null>(null);
  // A performer opened from an event's line-up on the home feed.
  const [livePerformerId, setLivePerformerId] = useState<string | null>(null);
  const [liveBookingEvent, setLiveBookingEvent] = useState<TLiveEvent | null>(
    null
  );
  const isTicketsTab = activeTab === "tickets";
  const openHomeEventDetails = (event: TFeedEvent) => {
    setLiveEventId(event.id);
  };
  const openLiveTickets = () => {
    setLiveBookingEvent(null);
    setLiveEventId(null);
    setTicketsReturnTab("home");
    setActiveTab("tickets");
  };
  if (isSplashVisible) {
    return (
      <ContainerComponent isSafeAreaView className="bg-white">
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center bg-white">
          <BrandLoader />
        </View>
      </ContainerComponent>
    );
  }

  // A page opened on top of the tabs: checkout, an event, or a performer. The
  // tab underneath stays as it was, so going back is instant and keeps your place.
  const overlay = liveBookingEvent ? (
    <LiveTicketCheckoutScreen
      event={liveBookingEvent}
      onBack={() => setLiveBookingEvent(null)}
      onViewTickets={openLiveTickets}
    />
  ) : liveEventId ? (
    <LiveEventDetailScreen
      eventId={liveEventId}
      onBack={() => setLiveEventId(null)}
      onBook={setLiveBookingEvent}
      onShowTickets={(eventId) => {
        setLiveEventId(null);
        setTicketsOpenEventId(eventId);
        setTicketsReturnTab(activeTab === "tickets" ? "home" : activeTab);
        setActiveTab("tickets");
      }}
      onOpenPerformer={(id) => {
        setLivePerformerId(id);
        setLiveEventId(null);
      }}
    />
  ) : livePerformerId ? (
    <LivePerformerProfileScreen
      performerId={livePerformerId}
      onBack={() => setLivePerformerId(null)}
      onOpenEvent={(id) => {
        setLivePerformerId(null);
        setLiveEventId(id);
      }}
    />
  ) : null;

  /**
   * A tab, kept mounted once visited and hidden while you're elsewhere, so
   * switching back shows it at once, scrolled where you left it.
   */
  const tabSlot = (id: TBottomNavId, content: React.ReactNode) =>
    visitedTabs.includes(id) ? (
      <ScreenActiveContext.Provider value={activeTab === id && !overlay}>
        <View style={activeTab === id ? { flex: 1 } : { display: "none" }}>
          {content}
        </View>
      </ScreenActiveContext.Provider>
    ) : null;

  return (
    <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
      <StatusBar style="dark" />
      <View
        className="flex-1 w-full self-center bg-white"
        style={{ maxWidth: 430 }}
      >
        {inOrganiserMode && (
          <ScreenActiveContext.Provider value={!overlay}>
            <OrganiserShellScreen onOpenEvent={(eventId) => setLiveEventId(eventId)} onAttendee={() => setMode("attendee")} />
          </ScreenActiveContext.Provider>
        )}
        {!inOrganiserMode && tabSlot(
          "home",
          <>
            <View className="h-14 items-center justify-center border-b border-zinc-100 bg-white px-4">
              <CustomImage
                className="h-9 w-28"
                imageClassName="size-full"
                source={TurnupzWordmark}
                contentFit="contain"
              />
            </View>
            <BrandRefreshList
              listRef={homeListRef}
              data={feedEvents}
              keyExtractor={(event) => event.id}
              style={{ backgroundColor: FEED_BACKGROUND }}
              contentContainerStyle={{ paddingTop: 16 }}
              // A boosted event, big and marked Sponsored, where the phone is.
              ListHeaderComponent={
                <FeaturedBoost
                  countryCode={place?.countryCode}
                  city={place?.city}
                  enabled={homePlace.ready}
                  onOpenEvent={setLiveEventId}
                />
              }
              renderItem={({ item }) => (
                <FeedCard
                  event={item}
                  onOpenSettings={(event) =>
                    setOptionsEvent({
                      id: event.id,
                      name: event.name,
                      date: event.date,
                      timezone: event.timezone,
                      image: event.medias?.[0] || event.image,
                      place: event.venueName,
                      isFavorite: event.isFavorite
                    })
                  }
                  onOpenDetails={openHomeEventDetails}
                />
              )}
              refreshing={liveEvents.isRefetching}
              onRefresh={() => {
                void liveEvents.refetch();
                // The Featured card too: a boost may have started since.
                void queryClient.invalidateQueries({ queryKey: ["sponsored"] });
              }}
              // The next ten load well before the end is reached, so scrolling
              // never has to stop and wait.
              onEndReached={() =>
                liveEvents.hasNextPage &&
                !liveEvents.isFetchingNextPage &&
                void liveEvents.fetchNextPage()
              }
              onEndReachedThreshold={2}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={9}
              ListFooterComponent={
                liveEvents.isFetchingNextPage ? (
                  <View className="items-center pb-8 pt-2">
                    <BrandLoader height={22} hideLabel />
                  </View>
                ) : !liveEvents.hasNextPage &&
                  feedEvents.length > HOME_FEED_BATCH ? (
                  <TextComponent className="mb-6 text-center text-sm text-zinc-400">
                    You're all caught up
                  </TextComponent>
                ) : null
              }
              ListEmptyComponent={
                <View className="mt-24 items-center gap-2 px-8">
                  <TextComponent className="text-center text-lg font-bold text-zinc-950">
                    {liveEvents.isLoading
                      ? "Finding events..."
                      : liveEvents.error
                        ? "We couldn't load events"
                        : "No events yet"}
                  </TextComponent>
                  {!liveEvents.isLoading && (
                    <TextComponent className="text-center text-sm text-zinc-500">
                      {liveEvents.error
                        ? "Pull down to try again."
                        : "New events will show up here."}
                    </TextComponent>
                  )}
                </View>
              }
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-4"
            />
          </>
        )}
        {!inOrganiserMode && tabSlot(
          "search",
          <LiveExploreScreen
            onBook={setLiveBookingEvent}
            scrollToTopSignal={exploreTopSignal}
          />
        )}
        {!inOrganiserMode && tabSlot(
          "messages",
          <ChatsScreen
            onOpenEvent={(eventId) => setLiveEventId(eventId)}
            onOpenTickets={() => {
              setTicketsReturnTab("messages");
              setActiveTab("tickets");
            }}
          />
        )}
        {!inOrganiserMode && tabSlot(
          "favorites",
          <NotificationsScreen
            onOpenEvent={(eventId) => setLiveEventId(eventId)}
            onOpenMessages={() => setActiveTab("messages")}
            onOpenTickets={() => {
              setTicketsReturnTab("favorites");
              setActiveTab("tickets");
            }}
          />
        )}
        {!inOrganiserMode && tabSlot(
          "profile",
          <ProfileScreen
            onOpenEvent={(eventId) => setLiveEventId(eventId)}
            onOpenTickets={(eventId) => {
              setTicketsOpenEventId(eventId ?? null);
              setTicketsReturnTab("profile");
              setActiveTab("tickets");
            }}
          />
        )}
        {/* My tickets is a page of its own: opened fresh each time. */}
        {!inOrganiserMode && isTicketsTab && (
          <ScreenActiveContext.Provider value={!overlay}>
            <LiveMyTicketsScreen
              openEventId={ticketsOpenEventId}
              onBack={() => {
                setTicketsOpenEventId(null);
                setActiveTab(ticketsReturnTab);
              }}
            />
          </ScreenActiveContext.Provider>
        )}
        {!inOrganiserMode && !isTicketsTab && (
          <PreviewBottomNav
            activeTab={activeTab}
            onTabPress={onTabPress}
            unreadNotifications={unreadNotifications.data ?? 0}
          />
        )}
        <EventOptionsSheet
          event={optionsEvent}
          onClose={() => setOptionsEvent(null)}
          onOpenEvent={(eventId) => setLiveEventId(eventId)}
        />
        <WebOnlySheet task={hostTask} onClose={() => setHostTask(null)} />
        <ChooseModeSheet
          visible={askMode && !wantsToHost && !hostTask && !overlay}
          who={organiser.isVendor ? "You run events" : organiser.teams[0] ? `${organiser.teams[0].name} added you to their team` : "You can scan tickets at the door"}
          onChoose={chooseMode}
        />
        {/* Someone's profile, their followers, finding people: opened from anywhere. */}
        <PeopleModal />
        {overlay && (
          <View style={StyleSheet.absoluteFill} className="bg-white">
            {overlay}
          </View>
        )}
      </View>
    </ContainerComponent>
  );
};

export default memo(RefinedHomeFeedDesignScreen);
