import React, { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View
} from "react-native";
import { Circle, Path, Svg } from "react-native-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
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
import { eventPlace, TLiveEvent, useLiveEvent } from "./live-api";
import ReportEventSheet from "./report-event.sheet";

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

const TABS = ["Overview", "Media", "Activities", "Blogs"] as const;
type TTab = (typeof TABS)[number];

const guestName = (guest: NonNullable<TLiveEvent["eventGuestsOfHonour"]>[number]) =>
  guest.name || [guest.firstName, guest.lastName].filter(Boolean).join(" ");

/**
 * An event, from the API: the prototype's event page with everything on it real.
 * Times read on the venue's clock. `onBook` opens ticket checkout or registration.
 */
const LiveEventDetailScreen = ({
  eventId,
  onBack,
  onBook
}: {
  eventId: string;
  onBack: () => void;
  onBook: (event: TLiveEvent) => void;
}) => {
  const { data: event, isLoading, error, refetch } = useLiveEvent(eventId);
  const [activeTab, setActiveTab] = useState<TTab>("Overview");
  const [isReporting, setIsReporting] = useState(false);
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 380;
  const horizontalPadding = isCompactPhone ? 12 : 16;

  const media = useMemo(
    () => [event?.image, ...(event?.medias ?? [])].filter(Boolean) as string[],
    [event]
  );
  const guests = (event?.eventGuestsOfHonour ?? []).map(guestName).filter(Boolean);
  const zoneNote = event ? eventZoneNote(event.timezone) : null;
  const isPast = event ? new Date(event.date) < new Date() : false;

  const bookLabel =
    event?.saleMethod === "external_link"
      ? "Get Tickets"
      : event?.saleMethod === "register"
        ? "Register"
        : "Book Ticket";

  const handleBook = () => {
    if (!event) return;
    if (event.saleMethod === "external_link") {
      if (!event.ticketUrl) {
        onError("The organiser hasn't added a ticket link yet.");
        return;
      }
      void Linking.openURL(event.ticketUrl);
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

          <TextComponent className="mt-4 text-xl font-bold text-primary">
            {event.name}
          </TextComponent>
          <View className="mt-3 gap-2">
            <View className="flex-row items-center">
              <LocationIcon size={15} color={ACCENT} />
              <TextComponent className="ml-2 flex-1 text-sm text-zinc-700">
                {eventPlace(event)}
              </TextComponent>
            </View>
            <View className="flex-row items-center">
              <CalendarIcon />
              <TextComponent className="ml-2 text-sm text-zinc-700">
                {formatEventDay(event.date, event.timezone)}
              </TextComponent>
            </View>
            <View className="flex-row items-center">
              <ClockIcon />
              <TextComponent className="ml-2 text-sm font-semibold text-primary">
                {formatEventClock(event.date, event.timezone)}
              </TextComponent>
              {!!zoneNote && (
                <TextComponent className="ml-2 text-xs text-zinc-500">
                  ({zoneNote})
                </TextComponent>
              )}
            </View>
            {!!event.organizerName && (
              <TextComponent className="text-xs text-zinc-500">
                By {event.organizerName}
              </TextComponent>
            )}
          </View>

          <Pressable
            disabled={isPast}
            onPress={handleBook}
            className={
              isPast
                ? "mt-5 h-12 items-center justify-center rounded-lg bg-zinc-300"
                : "mt-5 h-12 items-center justify-center rounded-lg bg-primary"
            }
          >
            <TextComponent className="font-bold text-white">
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
              {guests.length > 0 && (
                <>
                  <TextComponent className="mt-6 text-base font-bold text-primary">
                    Guests of honour
                  </TextComponent>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {guests.map((name) => (
                      <View key={name} className="rounded-full bg-white px-3 py-2 shadow-sm">
                        <TextComponent className="text-xs font-bold text-zinc-700">
                          {name}
                        </TextComponent>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {activeTab === "Media" && (
            <View className="mt-4 gap-3">
              {media.length === 0 ? (
                <TextComponent className="text-sm text-zinc-500">No photos yet.</TextComponent>
              ) : (
                media.map((uri) => (
                  <CustomImage
                    key={uri}
                    className="w-full rounded-xl"
                    imageClassName="size-full rounded-xl"
                    source={{ uri }}
                    contentFit="cover"
                    style={{ height: isCompactPhone ? 180 : 210 }}
                  />
                ))
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
            <View className="mt-4 gap-3">
              {(event.blogPosts ?? []).length === 0 ? (
                <TextComponent className="text-sm text-zinc-500">No updates yet.</TextComponent>
              ) : (
                (event.blogPosts ?? []).map((post) => (
                  <View key={post.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                    {!!post.image && (
                      <CustomImage
                        className="h-36 w-full"
                        imageClassName="size-full"
                        source={{ uri: post.image }}
                        contentFit="cover"
                      />
                    )}
                    <View className="p-4">
                      <TextComponent className="text-lg font-bold text-zinc-950">
                        {post.title}
                      </TextComponent>
                      <TextComponent className="mt-2 text-sm leading-5 text-zinc-600">
                        {post.excerpt || post.body}
                      </TextComponent>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

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
