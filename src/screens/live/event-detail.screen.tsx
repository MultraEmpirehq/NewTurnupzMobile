import { openInMaps } from "@/shared/utils/open-in-maps";
import MessageIcon from "@/shared/assets/icons/message.icon";
import ShareIcon from "@/shared/assets/icons/share.icon";
import EventOptionsSheet from "./event-options.sheet";
import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import VerifiedName from "@/shared/components/verified-name/verified-name.component";
import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  FlatList,
  ScrollView,
  useWindowDimensions,
  View
} from "react-native";
import { Circle, Path, Svg } from "react-native-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import EventHighlights from "./event-highlights";
import TextComponent from "@/shared/components/text/text.component";
import ChevronLeftIcon from "@/shared/assets/icons/chevron-left.icon";
import LocationIcon from "@/shared/assets/icons/location.icon";
import { onError } from "@/shared/components/status/toast";
import {
  eventZoneNote,
  formatEventClock,
  formatEventDay,
  formatEventTime
} from "@/shared/utils/event-time";
import {
  recordEventView,
  eventPlace,
  PERFORMER_TYPE_LABELS,
  TLiveEvent,
  TLiveEventDay,
  startOrganizerChat,
  useLiveEvent,
  useTicketsHeldFor
} from "./live-api";
import { PerformerAvatar } from "./explore-details";
import ReportEventSheet from "./report-event.sheet";
import LeavingTurnupzSheet from "./leaving-turnupz.sheet";
import BlogPostScreen, { postedAgo } from "./blog-post.screen";
import ChatThreadScreen from "./chat-thread.screen";
import { MediaTile, MediaViewer, mediaItemsOf } from "./event-media";
import FollowButton from "@/screens/profile/follow-button";
import useUserStore from "@/shared/stores/user.store";
import { constructErrorMessage } from "@/api/functions";
import { useBlogReadsStore } from "@/shared/stores/blog-reads.store";
import {
  eventDateRange,
  eventDayName,
  eventEndsAt,
  isMultiDay
} from "@/shared/utils/event-days";

const ACCENT = "#00B2FF";

const CalendarIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M7 4V7" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" />
    <Path d="M17 4V7" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" />
    <Path d="M5 8H19V19H5V8Z" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
    <Path d="M5 12H19" stroke={ACCENT} strokeWidth={2} />
  </Svg>
);

const ClockIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={8} stroke={ACCENT} strokeWidth={2} />
    <Path d="M12 8V12L15 14" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

/**
 * A multi-day event's programme: each day with its times and who's on, headliner
 * first. Stands in for the single line-up a one-day event shows.
 */
const EventSchedule = ({
  days,
  timezone,
  onOpenPerformer
}: {
  days: TLiveEventDay[];
  timezone?: string;
  onOpenPerformer?: (performerId: string) => void;
}) => (
  <View className="mt-6">
    <TextComponent className="text-base font-bold text-primary">Schedule</TextComponent>
    <View className="mt-3 gap-3">
      {days.map((day, dayIndex) => (
        <View key={day.id} className="rounded-2xl border border-zinc-100 bg-white p-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <TextComponent className="text-[10px] font-extrabold tracking-widest text-primary">
                DAY {dayIndex + 1}
              </TextComponent>
              <TextComponent numberOfLines={1} className="mt-0.5 text-base font-bold text-zinc-950">
                {eventDayName(day, timezone)}
              </TextComponent>
            </View>
            <View className="items-end">
              {!!day.label && (
                <TextComponent className="text-xs text-zinc-500">
                  {formatEventDay(day.startsAt, timezone, { withYear: false })}
                </TextComponent>
              )}
              <TextComponent className="text-xs font-semibold text-zinc-700">
                {formatEventClock(day.startsAt, timezone)}
                {day.endsAt ? ` – ${formatEventClock(day.endsAt, timezone)}` : ""}
              </TextComponent>
            </View>
          </View>
          {day.performers?.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="mt-3 gap-4 pr-4"
            >
              {day.performers.map((performer) => (
                <Pressable
                  key={performer.id}
                  onPress={() => onOpenPerformer?.(performer.id)}
                  disabled={!onOpenPerformer || performer.isVerified === false}
                  accessibilityRole="button"
                  accessibilityLabel={`${performer.name}${performer.isHeadliner ? ", headliner" : ""}`}
                  className="w-[72px] items-center gap-1.5"
                >
                  <PerformerAvatar performer={performer} size={56} />
                  <VerifiedName
                    name={performer.name}
                    verified={performer.isVerified}
                    numberOfLines={2}
                    tickSize={11}
                    centered
                    className="text-center text-[11px] font-bold text-zinc-900"
                  />
                  <TextComponent className="text-[10px] text-zinc-500">
                    {performer.isHeadliner && day.performers!.length > 1
                      ? "Headliner"
                      : PERFORMER_TYPE_LABELS[performer.type]}
                  </TextComponent>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <TextComponent className="mt-2 text-sm text-zinc-500">
              Line-up to be announced.
            </TextComponent>
          )}
        </View>
      ))}
    </View>
  </View>
);

/** The sponsor board: each logo fills its tile, or the name shows. */
const SponsorBoard = ({ sponsors }: { sponsors?: TLiveEvent["sponsors"] }) => {
  const items = (sponsors ?? []).filter((sponsor) => sponsor.name?.trim());
  if (!items.length) return null;
  return (
    <View className="mt-6 border-t border-zinc-200 pt-4">
      <TextComponent className="text-base font-bold text-primary">Sponsors</TextComponent>
      <View className="mt-3 flex-row flex-wrap overflow-hidden rounded-xl border border-zinc-100 bg-white">
        {items.map((sponsor, index) => {
          const logo = sponsor.showName ? null : sponsor.imageDetails?.url;
          return (
            <View
              key={sponsor.id ?? `${sponsor.name}-${index}`}
              className="h-20 items-center justify-center overflow-hidden border-b border-r border-zinc-100 px-2"
              style={{ width: "50%" }}
            >
              {logo ? (
                <CustomImage
                  className="absolute inset-0"
                  imageClassName="size-full"
                  source={{ uri: logo }}
                  contentFit="cover"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <TextComponent numberOfLines={2} className="text-center text-sm font-bold text-zinc-700">
                  {sponsor.name}
                </TextComponent>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

/** The space between cards in a sideways row. */
const SIDE_CARD_GAP = 10;

const TABS = ["Overview", "Media", "Activities", "Blogs"] as const;
type TTab = (typeof TABS)[number];

/**
 * An event, from the API: the prototype's event page with everything on it real.
 * Times read on the venue's clock. `onBook` opens ticket checkout or registration.
 */
const LiveEventDetailScreen = ({
  eventId,
  onBack,
  onBook,
  onShowTickets,
  onOpenPerformer
}: {
  eventId: string;
  onBack: () => void;
  onBook: (event: TLiveEvent) => void;
  /** Your passes for this event (when you already hold tickets). */
  onShowTickets?: (eventId: string) => void;
  /** Opens a performer's profile from the line-up. */
  onOpenPerformer?: (performerId: string) => void;
}) => {
  useHardwareBack(onBack);
  const { data: event, isLoading, error, refetch } = useLiveEvent(eventId);
  // Counted once per opening, for the organiser's page views.
  useEffect(() => {
    recordEventView(eventId);
  }, [eventId]);
  const [activeTab, setActiveTab] = useState<TTab>("Overview");
  const [isReporting, setIsReporting] = useState(false);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const readPostIds = useBlogReadsStore((state) => state.readPostIds);
  const pendingPostId = useBlogReadsStore((state) => state.pendingPostId);
  const openPostWhenReady = useBlogReadsStore((state) => state.openPostWhenReady);
  // Newest first.
  const posts = useMemo(
    () =>
      [...(event?.blogPosts ?? [])].sort(
        (a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0)
      ),
    [event]
  );
  const unreadPosts = posts.filter((post) => !readPostIds.includes(post.id)).length;
  const openPost = posts.find((post) => post.id === openPostId) ?? null;
  // Opened from a "posted a blog" notification: go straight to that post.
  useEffect(() => {
    if (!pendingPostId || !posts.length) return;
    if (posts.some((post) => post.id === pendingPostId)) {
      setActiveTab("Blogs");
      setOpenPostId(pendingPostId);
    }
    openPostWhenReady(null);
  }, [pendingPostId, posts, openPostWhenReady]);
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 380;
  const horizontalPadding = isCompactPhone ? 12 : 16;
  // Sideways rows: most of the screen, with the next card peeking in so it's clear there's more.
  const sideCardWidth = Math.round(width * 0.78);

  const [viewing, setViewing] = useState<number | null>(null);
  const [organiserChat, setOrganiserChat] = useState<{ id: string; title: string } | null>(null);
  const [openingChat, setOpeningChat] = useState(false);
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const [sharing, setSharing] = useState(false);
  const messageOrganiser = async () => {
    if (!event) return;
    if (!isSignedIn) {
      onError("Sign in to message the organiser.");
      return;
    }
    setOpeningChat(true);
    try {
      const chat = await startOrganizerChat(event.id);
      setOrganiserChat({ id: chat.id, title: chat.title });
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "We couldn't reach the organiser right now."));
    } finally {
      setOpeningChat(false);
    }
  };
  const media = useMemo(
    () => [
      ...(event?.image ? [{ url: event.image }] : []),
      ...mediaItemsOf(event?.mediaDetails, event?.medias)
    ],
    [event]
  );
  const zoneNote = event ? eventZoneNote(event.timezone, event.date) : null;
  // A multi-day event is on until its last day is over.
  const isPast = event ? eventEndsAt(event) < new Date() : false;
  const multiDay = isMultiDay(event);

  // Tickets you already hold for this event: say so, and offer them first.
  const held = useTicketsHeldFor(event?.id);
  const isRegistration = event?.saleMethod === "register";
  const bookLabel =
    event?.saleMethod === "external_link"
      ? "Get Tickets"
      : isRegistration
        ? held
          ? "You're registered"
          : "Register free"
        : held
          ? "Get more tickets"
          : "Book Ticket";

  const [leavingTo, setLeavingTo] = useState<string | null>(null);

  const handleBook = () => {
    if (!event) return;
    if (event.saleMethod === "external_link") {
      if (!event.ticketUrl) {
        onError("The organiser hasn't added a ticket link yet.");
        return;
      }
      // Tell them they're leaving Turnupz before the seller's site opens.
      setLeavingTo(event.ticketUrl);
      return;
    }
    onBook(event);
  };

  return (
    <View className="flex-1 bg-zinc-50">
      <View
        className="z-10 flex-row items-center justify-between border-b border-zinc-100 bg-zinc-50"
        style={{ paddingHorizontal: horizontalPadding, paddingVertical: 8 }}
      >
        <Pressable onPress={onBack} className="size-8 items-center justify-center">
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        {!!event && !event.isOwner && (
          <Pressable onPress={() => setIsReporting(true)} hitSlop={8}>
            <TextComponent className="text-xs font-semibold text-zinc-500">
              Report
            </TextComponent>
          </Pressable>
        )}
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ACCENT} />
        </View>
      )}

      {!isLoading && (error || !event) && (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <TextComponent className="text-center font-bold text-zinc-950">
            We couldn't load this event
          </TextComponent>
          <Pressable onPress={() => void refetch()} className="rounded-lg bg-primary px-5 py-2.5">
            <TextComponent className="font-bold text-white">Try again</TextComponent>
          </Pressable>
        </View>
      )}

      {!!event && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 32,
            paddingHorizontal: horizontalPadding,
            paddingTop: 8
          }}
        >
          {!!event.image && (
            <CustomImage
              className="w-full rounded-xl"
              imageClassName="size-full rounded-xl"
              source={{ uri: event.image }}
              contentFit="cover"
              style={{ height: isCompactPhone ? 190 : 220 }}
            />
          )}

          <View className="mt-4 flex-row items-start gap-3">
            <TextComponent className="flex-1 text-xl font-bold text-primary">
              {event.name}
            </TextComponent>
            <Pressable
              onPress={() => setSharing(true)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Share ${event.name}`}
              className="h-9 w-9 items-center justify-center rounded-full border border-zinc-200"
            >
              <ShareIcon size={17} color="#27272a" />
            </Pressable>
          </View>
          <View className="mt-3 gap-2">
            <View className="flex-row items-center">
              <LocationIcon size={15} color={ACCENT} />
              <TextComponent numberOfLines={2} className="ml-2 shrink text-sm text-zinc-700">
                {eventPlace(event)}
              </TextComponent>
              {!!(event.venue?.address || eventPlace(event)) && (
                <Pressable
                  onPress={() =>
                    openInMaps(
                      [event.venue?.name, event.venue?.address].filter(Boolean).join(", ") ||
                        eventPlace(event)
                    )
                  }
                  hitSlop={8}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${eventPlace(event)} in a maps app`}
                  className="ml-2"
                >
                  <TextComponent className="text-sm font-semibold" style={{ color: ACCENT }}>
                    Open in…
                  </TextComponent>
                </Pressable>
              )}
            </View>
            <View className="flex-row items-center">
              <CalendarIcon />
              <TextComponent className="ml-2 text-sm text-zinc-700">
                {multiDay
                  ? `${eventDateRange(event)} · ${event.days!.length} days`
                  : formatEventDay(event.date, event.timezone)}
              </TextComponent>
            </View>
            <View className="flex-row items-center">
              <ClockIcon />
              <TextComponent className="ml-2 text-sm font-semibold text-primary">
                {multiDay
                  ? `Starts ${formatEventClock(event.date, event.timezone)}`
                  : formatEventClock(event.date, event.timezone)}
              </TextComponent>
              {!!zoneNote && (
                <TextComponent className="ml-2 text-xs text-zinc-500">
                  ({zoneNote})
                </TextComponent>
              )}
            </View>
            {!!event.organizerName && (
              <View className="flex-row items-center gap-2">
                <TextComponent numberOfLines={2} className="shrink text-xs text-zinc-500">
                  By <TextComponent className="text-xs font-bold text-zinc-900">{event.organizerName}</TextComponent>
                </TextComponent>
                {!event.isOwner && (
                  <>
                    <FollowButton
                      type="PLANNER"
                      id={event.organizerId}
                      name={event.organizerName}
                      iconOnly
                    />
                    <Pressable
                      onPress={() => void messageOrganiser()}
                      disabled={openingChat}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`Message ${event.organizerName}`}
                      className="h-9 w-9 items-center justify-center rounded-full border border-zinc-200"
                    >
                      {openingChat ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <MessageIcon size={17} color="#27272a" />
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </View>

          <EventHighlights eventId={event.id} eventName={event.name} isPast={isPast} />

          {held > 0 && (
            <View
              className="mt-5 flex-row items-center gap-3 rounded-xl px-3.5 py-3"
              style={{ backgroundColor: "#E5F7FF" }}
            >
              <View className="size-8 items-center justify-center rounded-full" style={{ backgroundColor: "#0577FA" }}>
                <TextComponent className="text-sm font-extrabold text-white">✓</TextComponent>
              </View>
              <View className="flex-1">
                <TextComponent className="text-sm font-bold text-zinc-950">
                  {isPast
                    ? "You had tickets for this event"
                    : isRegistration
                      ? "You're registered"
                      : "You're going"}
                </TextComponent>
                <TextComponent className="text-xs text-zinc-600">
                  {held} {isRegistration ? (held === 1 ? "pass" : "passes") : held === 1 ? "ticket" : "tickets"} in My
                  tickets
                </TextComponent>
              </View>
              {!!onShowTickets && (
                <Pressable
                  onPress={() => event && onShowTickets(event.id)}
                  accessibilityRole="button"
                  className="rounded-full px-3.5 py-2"
                  style={{ backgroundColor: "#0577FA" }}
                >
                  <TextComponent className="text-xs font-bold text-white">
                    {held === 1 ? "Show ticket" : "Show tickets"}
                  </TextComponent>
                </Pressable>
              )}
            </View>
          )}

          <Pressable
            disabled={isPast || (isRegistration && held > 0)}
            onPress={handleBook}
            className={
              isPast || (isRegistration && held > 0)
                ? "mt-5 h-12 items-center justify-center rounded-lg bg-zinc-300"
                : held > 0
                  ? "mt-3 h-12 items-center justify-center rounded-lg border-2 border-primary bg-white"
                  : "mt-5 h-12 items-center justify-center rounded-lg bg-primary"
            }
          >
            <TextComponent
              className="font-bold"
              style={{
                color:
                  held > 0 && !isPast && !(isRegistration && held > 0) ? "#00B2FF" : "#ffffff"
              }}
            >
              {isPast ? "This event has ended" : bookLabel}
            </TextComponent>
          </Pressable>

          <View className="mt-6 flex-row border-b border-zinc-200">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  className={
                    isActive
                      ? "mr-5 border-b-2 border-primary pb-2"
                      : "mr-5 border-b-2 border-transparent pb-2"
                  }
                >
                  <TextComponent
                    className={
                      isActive
                        ? "text-sm font-bold text-primary"
                        : "text-sm font-semibold text-zinc-500"
                    }
                  >
                    {tab}
                    {/* Only what you haven't read yet; gone once you have. */}
                    {tab === "Blogs" && unreadPosts > 0 ? ` ${unreadPosts}` : ""}
                  </TextComponent>
                </Pressable>
              );
            })}
          </View>

          {activeTab === "Overview" && (
            <View className="mt-4">
              <TextComponent className="text-lg font-bold text-primary">
                About this event
              </TextComponent>
              <TextComponent className="mt-2 text-sm leading-5 text-zinc-950">
                {event.description || "The organiser hasn't added a description yet."}
              </TextComponent>
              {!!event.additionalInformation?.length && (
                <>
                  <TextComponent className="mt-6 text-base font-bold text-primary">
                    Additional information
                  </TextComponent>
                  {event.additionalInformation.map((item, index) => (
                    <TextComponent key={index} className="mt-2 text-sm leading-5 text-zinc-950">
                      {index + 1}. {item}
                    </TextComponent>
                  ))}
                </>
              )}
              {multiDay && (
                <EventSchedule
                  days={event.days!}
                  timezone={event.timezone}
                  onOpenPerformer={onOpenPerformer}
                />
              )}
              {!multiDay && !!event.performers?.length && (
                <>
                  <TextComponent className="mt-6 text-base font-bold text-primary">
                    Line-up
                  </TextComponent>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerClassName="mt-3 gap-4 pr-4"
                  >
                    {event.performers.map((performer) => (
                      <Pressable
                        key={performer.id}
                        onPress={() => onOpenPerformer?.(performer.id)}
                        // Only verified performers have a page to open.
                        disabled={!onOpenPerformer || performer.isVerified === false}
                        accessibilityRole="button"
                        accessibilityLabel={`${performer.name}${performer.isHeadliner ? ", headliner" : ""}`}
                        className="w-[84px] items-center gap-1.5"
                      >
                        <PerformerAvatar performer={performer} size={72} />
                        <VerifiedName
                          name={performer.name}
                          verified={performer.isVerified}
                          numberOfLines={2}
                          tickSize={12}
                          centered
                          className="text-center text-xs font-bold text-zinc-900"
                        />
                        <TextComponent className="text-[10px] text-zinc-500">
                          {performer.isHeadliner && event.performers!.length > 1
                            ? "Headliner"
                            : PERFORMER_TYPE_LABELS[performer.type]}
                        </TextComponent>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          )}

          {activeTab === "Media" && (
            <View className="mt-4">
              {media.length === 0 ? (
                <TextComponent className="text-sm text-zinc-500">No photos or videos yet.</TextComponent>
              ) : (
                // Sideways, so a big gallery doesn't push the rest of the page far down.
                <FlatList
                  horizontal
                  data={media}
                  keyExtractor={(item, index) => `${item.url}-${index}`}
                  showsHorizontalScrollIndicator={false}
                  initialNumToRender={3}
                  windowSize={5}
                  snapToInterval={sideCardWidth + SIDE_CARD_GAP}
                  decelerationRate="fast"
                  style={{ marginHorizontal: -horizontalPadding }}
                  contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: SIDE_CARD_GAP }}
                  renderItem={({ item, index }) => (
                    <View style={{ width: media.length === 1 ? width - horizontalPadding * 2 : sideCardWidth }}>
                      <MediaTile
                        item={item}
                        height={isCompactPhone ? 180 : 210}
                        onPress={() => setViewing(index)}
                      />
                    </View>
                  )}
                />
              )}
            </View>
          )}

          {activeTab === "Activities" && (
            <View className="mt-4 gap-3">
              {(event.activities ?? []).length === 0 ? (
                <TextComponent className="text-sm text-zinc-500">
                  No schedule has been shared yet.
                </TextComponent>
              ) : (
                (event.activities ?? []).map((activity, index) => (
                  <View key={`${activity.name}-${index}`} className="rounded-xl bg-white p-4 shadow-sm">
                    {!!activity.date && (
                      <TextComponent className="text-[10px] font-bold text-primary">
                        {formatEventTime(activity.date, event.timezone)}
                      </TextComponent>
                    )}
                    <TextComponent className="mt-1 text-base font-bold text-zinc-950">
                      {activity.name}
                    </TextComponent>
                    {!!activity.description && (
                      <TextComponent className="mt-1 text-sm leading-5 text-zinc-600">
                        {activity.description}
                      </TextComponent>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "Blogs" && (
            <View className="mt-4">
              {posts.length === 0 ? (
                <TextComponent className="text-sm text-zinc-500">
                  No blogs yet. The organiser's news and updates will show here.
                </TextComponent>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={sideCardWidth + SIDE_CARD_GAP}
                  decelerationRate="fast"
                  style={{ marginHorizontal: -horizontalPadding }}
                  contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: SIDE_CARD_GAP }}
                >
                {posts.map((post) => {
                  const isNew = !readPostIds.includes(post.id);
                  const cover = post.images?.[0];
                  return (
                    <Pressable
                      key={post.id}
                      onPress={() => setOpenPostId(post.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${isNew ? "New. " : ""}${post.title}. Read more`}
                      className="overflow-hidden rounded-2xl border border-zinc-100 bg-white"
                      style={{ width: posts.length === 1 ? width - horizontalPadding * 2 : sideCardWidth }}
                    >
                      {!!cover && (
                        <CustomImage className="h-36 w-full" imageClassName="size-full" source={{ uri: cover }} contentFit="cover" />
                      )}
                      <View className="p-4">
                        <View className="flex-row items-center gap-1.5">
                          {isNew && (
                            <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: "#00B2FF" }}>
                              <TextComponent className="text-[9.5px] font-extrabold tracking-wide text-white">NEW</TextComponent>
                            </View>
                          )}
                          <TextComponent numberOfLines={1} className="flex-1 text-xs font-semibold text-zinc-500">
                            {[event.organizerName, postedAgo(post.createdAt)].filter(Boolean).join(" · ")}
                          </TextComponent>
                        </View>
                        <TextComponent className="mt-1.5 text-base font-extrabold leading-6 text-zinc-950">
                          {post.title}
                        </TextComponent>
                        <TextComponent numberOfLines={3} className="mt-1 text-sm leading-5 text-zinc-600">
                          {post.excerpt || post.body}
                        </TextComponent>
                        <TextComponent className="mt-2 text-sm font-extrabold" style={{ color: "#0577FA" }}>
                          Read more ›
                        </TextComponent>
                      </View>
                    </Pressable>
                  );
                })}
                </ScrollView>
              )}
            </View>
          )}

          {/* Under the tabs, so sponsors show whichever tab someone is on. */}
          <SponsorBoard sponsors={event.sponsors} />
        </ScrollView>
      )}

      {!!event && (
        <BlogPostScreen
          post={openPost}
          event={event}
          bookLabel={bookLabel}
          canBook={!isPast}
          onBook={() => {
            setOpenPostId(null);
            // After the post has slid away (one modal at a time on iOS).
            setTimeout(handleBook, 400);
          }}
          onClose={() => setOpenPostId(null)}
        />
      )}
      <LeavingTurnupzSheet url={leavingTo} eventName={event?.name} onClose={() => setLeavingTo(null)} />
      <MediaViewer items={media} index={viewing} onClose={() => setViewing(null)} />
      <ChatThreadScreen
        chatId={organiserChat?.id ?? null}
        title={organiserChat?.title ?? ""}
        subtitle="Event organiser"
        onClose={() => setOrganiserChat(null)}
      />
      {/* Share: the same sheet as the ⋮ menu on Home, straight to sharing. */}
      <EventOptionsSheet
        shareOnly
        event={
          sharing && event
            ? {
                id: event.id,
                name: event.name,
                date: event.date,
                timezone: event.timezone,
                image: event.medias?.[0] || event.image,
                place: event.venueName,
                isFavorite: event.isFavorite
              }
            : null
        }
        onClose={() => setSharing(false)}
      />
      {!!event && (
        <ReportEventSheet
          visible={isReporting}
          eventId={event.id}
          eventName={event.name}
          onClose={() => setIsReporting(false)}
        />
      )}
    </View>
  );
};

export default memo(LiveEventDetailScreen);
