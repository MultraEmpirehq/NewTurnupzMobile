import NavIcon from "@/shared/components/nav-icons/nav-icons";
import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import ContainerComponent from "@/shared/components/container/container.component";
import TextComponent from "@/shared/components/text/text.component";
import { TEventDetailsType } from "@/shared/utils/types";
import TurnupzWordmark from "@/shared/assets/images/turnupz.png blue.png";
import { useAccessibilityStore } from "@/shared/stores/accessibility.store";
import LiveEventDetailScreen from "@/screens/live/event-detail.screen";
import LiveTicketCheckoutScreen from "@/screens/live/ticket-checkout.screen";
import LiveMyTicketsScreen from "@/screens/live/my-tickets.screen";
import LiveExploreScreen from "@/screens/live/explore.screen";
import ProfileScreen from "@/screens/profile/profile.screen";
import NotificationsScreen from "@/screens/notifications/notifications.screen";
import ChatsScreen from "@/screens/chat/chats.screen";
import PeopleModal from "@/screens/people/people-modal";
import { useUnreadNotifications } from "@/screens/notifications/notifications-api";
import EventOptionsSheet, { TEventOptionsTarget } from "@/screens/live/event-options.sheet";
import { useHiddenEventsStore } from "@/shared/stores/hidden-events.store";
import useUserStore from "@/shared/stores/user.store";
import { PerformerProfileScreen as LivePerformerProfileScreen } from "@/screens/live/explore-details";
import BrandRefreshList, { TBrandRefreshListHandle } from "@/shared/components/brand-refresh/brand-refresh-list.component";
import BrandLoader from "@/shared/components/brand-loader/brand-loader.component";
import EventTicketCard, { TICKET_LIST_BACKGROUND } from "@/screens/live/event-ticket-card";
import { eventPlace, TLiveEvent, useLiveEvents } from "@/screens/live/live-api";

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
};

type TBottomNavId =
  "home" | "search" | "tickets" | "messages" | "favorites" | "profile";

type TBottomNavItem = {
  id: TBottomNavId;
  label: string;
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
    label: "Home",
    renderIcon: (color, active) => <NavIcon name="home" size={NAV_ICON_SIZE} color={color} active={active} />
  },
  {
    id: "search",
    label: "Explore",
    renderIcon: (color, active) => <NavIcon name="explore" size={NAV_ICON_SIZE} color={color} active={active} />
  },
  {
    id: "messages",
    label: "Messages",
    renderIcon: (color, active) => <NavIcon name="messages" size={NAV_ICON_SIZE} color={color} active={active} />
  },
  {
    id: "favorites",
    label: "Notifications",
    renderIcon: (color, active) => <NavIcon name="notifications" size={NAV_ICON_SIZE} color={color} active={active} />
  },
  {
    id: "profile",
    label: "Profile",
    renderIcon: (color, active) => <NavIcon name="profile" size={NAV_ICON_SIZE} color={color} active={active} />
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
  const buttonLabels = useAccessibilityStore((state) => state.buttonLabels);
  const screenReaderHints = useAccessibilityStore(
    (state) => state.screenReaderHints
  );
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  return (
    <View
      className={
        highContrast
          ? buttonLabels
            ? "h-[76px] flex-row items-center justify-between border-t-2 border-white bg-black px-3"
            : "h-[68px] flex-row items-center justify-around border-t-2 border-white bg-black px-2"
          : buttonLabels
            ? "h-[76px] flex-row items-center justify-between border-t border-zinc-200 bg-white px-3"
            : "h-[68px] flex-row items-center justify-around border-t border-zinc-200 bg-white px-2"
      }
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
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
                ? `${item.label}, ${unreadNotifications} unread`
                : item.label
            }
            accessibilityHint={
              screenReaderHints ? `Opens the ${item.label} section` : undefined
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
                {item.label}
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
    name={event.name}
    date={event.date}
    timezone={event.timezone}
    image={event.medias?.[0] || event.image}
    category={event.category}
    place={event.venueName}
    badge={event.mediaKind === "video" ? "Video" : undefined}
    onPress={() => onOpenDetails?.(event)}
    onMore={() => onOpenSettings(event)}
  />
);


const RefinedHomeFeedDesignScreen = () => {
  const [activeTab, setActiveTab] = useState<TBottomNavId>("home");
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
  // Hidden events and the card dots: the same store and sheet as Explore.
  const hiddenEventIds = useHiddenEventsStore((state) => state.hiddenEventIds);
  const syncHiddenEvents = useHiddenEventsStore((state) => state.sync);
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const unreadNotifications = useUnreadNotifications(isSignedIn);
  useEffect(() => {
    if (isSignedIn) void syncHiddenEvents();
  }, [isSignedIn, syncHiddenEvents]);
  const [optionsEvent, setOptionsEvent] = useState<TEventOptionsTarget | null>(
    null
  );
  // The home feed is live: published events from the API, ten at a time,
  // the next ten fetched as you scroll towards the end.
  const liveEvents = useLiveEvents({ limit: String(HOME_FEED_BATCH) });
  // The loader shows only while the feed's first page is on its way.
  const isSplashVisible = liveEvents.isLoading && !liveEvents.data;
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
  const isExploreTab = activeTab === "search";
  const isTicketsTab = activeTab === "tickets";
  const isMessagesTab = activeTab === "messages";
  const isNotificationsTab = activeTab === "favorites";
  const isProfileTab = activeTab === "profile";
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

  if (liveBookingEvent) {
    return (
      <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
        <View
          className="flex-1 w-full self-center bg-white"
          style={{ maxWidth: 430 }}
        >
          <LiveTicketCheckoutScreen
            event={liveBookingEvent}
            onBack={() => setLiveBookingEvent(null)}
            onViewTickets={openLiveTickets}
          />
        </View>
      </ContainerComponent>
    );
  }

  if (liveEventId) {
    return (
      <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
        <View
          className="flex-1 w-full self-center bg-white"
          style={{ maxWidth: 430 }}
        >
          <LiveEventDetailScreen
            eventId={liveEventId}
            onBack={() => setLiveEventId(null)}
            onBook={setLiveBookingEvent}
            onOpenPerformer={(id) => {
              setLivePerformerId(id);
              setLiveEventId(null);
            }}
          />
        </View>
      </ContainerComponent>
    );
  }
  if (livePerformerId) {
    return (
      <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
        <View
          className="flex-1 w-full self-center bg-white"
          style={{ maxWidth: 430 }}
        >
          <LivePerformerProfileScreen
            performerId={livePerformerId}
            onBack={() => setLivePerformerId(null)}
            onOpenEvent={(id) => {
              setLivePerformerId(null);
              setLiveEventId(id);
            }}
          />
        </View>
      </ContainerComponent>
    );
  }


  return (
    <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
      <StatusBar style="dark" />
      <View
        className="flex-1 w-full self-center bg-white"
        style={{ maxWidth: 430 }}
      >
        {isExploreTab ? (
          <LiveExploreScreen
            onBook={setLiveBookingEvent}
            scrollToTopSignal={exploreTopSignal}
          />
        ) : isTicketsTab ? (
          <LiveMyTicketsScreen onBack={() => setActiveTab(ticketsReturnTab)} />
        ) : isMessagesTab ? (
          <ChatsScreen
            onOpenEvent={(eventId) => setLiveEventId(eventId)}
            onOpenTickets={() => {
              setTicketsReturnTab("messages");
              setActiveTab("tickets");
            }}
          />
        ) : isNotificationsTab ? (
          <NotificationsScreen
            onOpenEvent={(eventId) => setLiveEventId(eventId)}
            onOpenTickets={() => {
              setTicketsReturnTab("favorites");
              setActiveTab("tickets");
            }}
          />
        ) : isProfileTab ? (
          <ProfileScreen
            onOpenEvent={(eventId) => setLiveEventId(eventId)}
            onOpenTickets={() => {
              setTicketsReturnTab("profile");
              setActiveTab("tickets");
            }}
          />
        ) : (
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
              onRefresh={() => void liveEvents.refetch()}
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
        {!isTicketsTab && (
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
        {/* Someone's profile, their followers, finding people: opened from anywhere. */}
        <PeopleModal />
      </View>
    </ContainerComponent>
  );
};

export default memo(RefinedHomeFeedDesignScreen);
