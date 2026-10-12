import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Path, Svg } from "react-native-svg";
import { useQueryClient } from "@tanstack/react-query";
import TextComponent from "@/shared/components/text/text.component";
import RoundAvatar from "@/shared/components/images/round-avatar.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import useUserStore from "@/shared/stores/user.store";
import { useHiddenEventsStore } from "@/shared/stores/hidden-events.store";
import { BRAND } from "@/shared/utils/brand-colors";
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
  useLiveEvents,
  useLiveUserTickets,
  useLiveVenue
} from "@/screens/live/live-api";
import FollowButton from "./follow-button";
import ProfileInfoForm from "./profile-info.form";
import InviteFriendsCard from "./invite-friends.card";
import CreditCard from "./credit.card";
import ProfileSettingsScreen from "./profile-settings.screen";
import {
  TFollowedItem,
  uploadProfilePhoto,
  useFollows,
  useMe
} from "./profile-api";

/**
 * The profile, laid out as in the original app: your photo and name, a row of
 * numbers (purchased tickets, registered events, saved, following), then your
 * Profile Information to edit in place. Saved and Following open their lists;
 * settings sit behind the gear.
 */

type TList = "saved" | "following";
type TDetail =
  | { kind: "performer"; id: string }
  | { kind: "venue"; id: string; name: string }
  | { kind: "planner"; id: string; name: string };

const FOLLOW_LABEL: Record<TFollowedItem["targetType"], string> = {
  PERFORMER: "Performer",
  VENUE: "Venue",
  PLANNER: "Event planner"
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

/** One number in the row, with a divider after it unless it's the last. */
const Stat = ({
  value,
  label,
  divider,
  onPress
}: {
  value: string;
  label: string;
  divider?: boolean;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole="button"
    accessibilityLabel={`${value} ${label}`}
    className="flex-1 items-center px-1 py-6"
    style={divider ? { borderRightWidth: 1, borderRightColor: "rgba(0,0,0,0.2)" } : undefined}
  >
    <TextComponent className="text-lg font-bold text-black">{value}</TextComponent>
    <TextComponent className="text-center text-xs text-black opacity-60">{label}</TextComponent>
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
  onOpenTickets: () => void;
}) => {
  const queryClient = useQueryClient();
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const me = useMe();
  const user = me.data;
  const hiddenEventIds = useHiddenEventsStore((state) => state.hiddenEventIds);

  const [showSettings, setShowSettings] = useState(false);
  const [list, setList] = useState<TList | null>(null);
  const [detail, setDetail] = useState<TDetail | null>(null);
  const [optionsEvent, setOptionsEvent] = useState<TEventOptionsTarget | null>(null);
  const [uploading, setUploading] = useState(false);

  const tickets = useLiveUserTickets();
  const saved = useLiveEvents({ isFavorite: "true", limit: "50" }, isSignedIn);
  const follows = useFollows(isSignedIn);

  // The counts need every ticket, so the rest load in the background.
  useEffect(() => {
    if (tickets.hasNextPage && !tickets.isFetchingNextPage) void tickets.fetchNextPage();
  }, [tickets.hasNextPage, tickets.isFetchingNextPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Purchased tickets, and events you registered for (free sign-ups).
  const { purchased, registered } = useMemo(() => {
    let bought = 0;
    const registeredEvents = new Set<string>();
    for (const page of tickets.data?.pages ?? []) {
      for (const ticket of page.tickets) {
        const event = ticket.ticket?.event;
        if (event?.saleMethod === "register") registeredEvents.add(event.id);
        else bought += 1;
      }
    }
    return { purchased: bought, registered: registeredEvents.size };
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
      onSuccess("Profile photo updated");
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

  if (showSettings) {
    return (
      <ProfileSettingsScreen
        onBack={() => {
          setShowSettings(false);
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
                <RoundAvatar uri={item.image} name={item.name} size={52} />
              )}
              <View className="flex-1">
                <TextComponent numberOfLines={1} className="text-base font-bold text-zinc-950">
                  {item.name}
                </TextComponent>
                <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
                  {item.subtitle || FOLLOW_LABEL[item.targetType]}
                </TextComponent>
                <TextComponent className="mt-0.5 text-xs font-semibold" style={{ color: BRAND.blue }}>
                  {item.upcomingEvents
                    ? `${item.upcomingEvents} upcoming ${item.upcomingEvents === 1 ? "event" : "events"}`
                    : "No upcoming events"}
                </TextComponent>
              </View>
              <FollowButton type={item.targetType} id={item.targetId} name={item.name} size="sm" />
            </Pressable>
          )}
          ListEmptyComponent={
            follows.isLoading ? (
              <Loading />
            ) : (
              <EmptyNote title="Not following anyone yet" body="Follow performers, venues and planners from their pages in Explore." />
            )
          }
        />
      </View>
    );
  }

  const name = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your profile";
  const more = tickets.hasNextPage ? "+" : "";

  return (
    <View className="flex-1 bg-white">
      <View className="h-14 flex-row items-center justify-between bg-white px-5">
        <TextComponent className="text-xl font-bold text-black">Profile</TextComponent>
        <Pressable
          onPress={() => setShowSettings(true)}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={10}
          className="size-10 items-center justify-center"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
              fill="none"
              stroke={BRAND.black}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      {!user ? (
        <View className="flex-1 items-center justify-center">
          {me.isLoading ? <ActivityIndicator color={BRAND.blue} /> : <EmptyNote title="We couldn't load your profile" body="Pull down to try again." />}
        </View>
      ) : (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 48, gap: 40 }}
            refreshControl={<RefreshControl refreshing={me.isRefetching} onRefresh={refresh} tintColor={BRAND.blue} />}
          >
            <View className="items-center gap-2">
              {/* Tap the photo to change it. */}
              <Pressable
                onPress={() => void changePhoto()}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                <RoundAvatar uri={user.profileImage} name={name} size={96} />
                <View
                  className="absolute bottom-0 right-0 size-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: BRAND.blue, borderWidth: 2, borderColor: BRAND.white }}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={BRAND.white} />
                  ) : (
                    <Svg width={15} height={15} viewBox="0 0 24 24">
                      <Path
                        d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                        fill="none"
                        stroke={BRAND.white}
                        strokeWidth={2}
                        strokeLinejoin="round"
                      />
                    </Svg>
                  )}
                </View>
              </Pressable>
              <TextComponent className="text-lg font-medium text-black">{name}</TextComponent>
              {!!user.username && (
                <TextComponent className="-mt-1 text-sm text-zinc-500">@{user.username}</TextComponent>
              )}
              <View className="mt-2 w-full flex-row" style={{ borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.2)" }}>
                <Stat value={`${purchased}${more}`} label="Purchased Tickets" divider onPress={onOpenTickets} />
                <Stat value={`${registered}${more}`} label="Registered Events" divider onPress={onOpenTickets} />
                <Stat value={String(savedTotal)} label="Saved" divider onPress={() => setList("saved")} />
                <Stat value={String(followed.length)} label="Following" onPress={() => setList("following")} />
              </View>
            </View>
            <CreditCard />
            <InviteFriendsCard />
            <ProfileInfoForm user={user} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      {options}
    </View>
  );
};

export default memo(ProfileScreen);
