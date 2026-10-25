import React, { memo, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { getData, postData } from "@/api";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { useScreenActive } from "@/shared/hooks/use-screen-active";
import { rememberArrival } from "@/shared/stores/arrival.store";
import { formatEventTime } from "@/shared/utils/event-time";
import EventTicketCard from "./event-ticket-card";
import { TLiveEvent, eventPlace } from "./live-api";

/**
 * Boosted events, as on the web: up to three for a placement and area, always
 * marked Sponsored, in a new order each time. Seeing them and opening one are
 * counted for the organiser, and a sale that follows counts for the boost.
 */

export type TBoostPlacement = "HOME" | "EXPLORE" | "SEARCH";

type TSponsoredEvent = TLiveEvent & { sponsored: true; boostId: string };

export const useSponsored = (query: {
  placement: TBoostPlacement;
  countryCode?: string;
  city?: string;
  q?: string;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: ["sponsored", query.placement, query.countryCode, query.city, query.q],
    enabled: (query.enabled ?? true) && (query.placement !== "SEARCH" || !!query.q),
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams({ placement: query.placement });
      if (query.countryCode) params.set("countryCode", query.countryCode);
      if (query.city) params.set("city", query.city);
      if (query.q) params.set("q", query.q);
      const { data } = await getData<TSponsoredEvent[]>(`/boosts/sponsored?${params}`);
      return data?.data ?? [];
    }
  });

/** Counts a set as seen once, while its screen is the one showing. */
const useSeen = (events: TSponsoredEvent[]) => {
  const active = useScreenActive();
  const key = events.map((event) => event.boostId).join(",");
  useEffect(() => {
    if (!active || !key) return;
    void postData("/boosts/impressions", { boostIds: key.split(",") }).catch(
      () => undefined
    );
  }, [active, key]);
};

/** Opening one: counted, and remembered so the order says it came from the boost. */
const opened = (event: TSponsoredEvent) => {
  rememberArrival(event.id, { src: "boost" });
  void postData(`/boosts/${event.boostId}/click`, {}).catch(() => undefined);
};

/** Explore's first row, or the top of search results. */
export const SponsoredRail = memo(
  ({
    placement,
    countryCode,
    city,
    q,
    cardWidth,
    onOpenEvent
  }: {
    placement: Extract<TBoostPlacement, "EXPLORE" | "SEARCH">;
    countryCode?: string;
    city?: string;
    q?: string;
    cardWidth: number;
    onOpenEvent: (eventId: string) => void;
  }) => {
    const { data: events = [] } = useSponsored({ placement, countryCode, city, q });
    useSeen(events);
    if (!events.length) return null;
    return (
      <View>
        <TextComponent className="mb-3 px-4 text-[11px] font-extrabold tracking-[2px] text-[#0577FA]/70">
          SPONSORED
        </TextComponent>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
        >
          {events.map((event) => (
            <EventTicketCard
              key={event.id}
              width={events.length > 1 ? cardWidth : undefined}
              eventId={event.id}
              name={event.name}
              date={event.date}
              timezone={event.timezone}
              image={event.image ?? event.medias?.[0]}
              place={eventPlace(event)}
              momentum={event.momentum}
              sponsored
              onPress={() => {
                opened(event);
                onOpenEvent(event.id);
              }}
            />
          ))}
        </ScrollView>
      </View>
    );
  }
);
SponsoredRail.displayName = "SponsoredRail";

/** The cheapest paid ticket, for "from …". */
const fromPrice = (event: TLiveEvent) =>
  (
    event as TLiveEvent & {
      eventTickets?: { ticketPrice?: { amount: number; formatted?: { withCurrency?: string } } | number }[];
    }
  ).eventTickets
    ?.map((ticket) => ticket.ticketPrice)
    .filter(
      (price): price is { amount: number; formatted?: { withCurrency?: string } } =>
        typeof price === "object" && (price?.amount ?? 0) > 0
    )
    .sort((a, b) => a.amount - b.amount)[0]?.formatted?.withCurrency;

/**
 * The big Featured card at the top of the home feed: a boosted event, or a few
 * taking turns every few seconds. Nothing shows when nothing is boosted.
 */
export const FeaturedBoost = memo(
  ({
    countryCode,
    city,
    enabled = true,
    onOpenEvent
  }: {
    countryCode?: string;
    city?: string;
    enabled?: boolean;
    onOpenEvent: (eventId: string) => void;
  }) => {
    const { data: events = [] } = useSponsored({ placement: "HOME", countryCode, city, enabled });
    useSeen(events);
    const [index, setIndex] = useState(0);
    useEffect(() => {
      if (events.length < 2) return;
      const timer = setInterval(() => setIndex((current) => current + 1), 6000);
      return () => clearInterval(timer);
    }, [events.length]);
    const event = useMemo(() => events[index % Math.max(events.length, 1)], [events, index]);
    if (!event) return null;
    const price = fromPrice(event);
    const image = event.image ?? event.medias?.[0];

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sponsored: ${event.name}. Get tickets`}
        onPress={() => {
          opened(event);
          onOpenEvent(event.id);
        }}
        className="mx-4 mb-5 overflow-hidden rounded-[28px] bg-[#06142e]"
        style={{ height: 300 }}
      >
        {!!image && (
          <CustomImage
            className="absolute inset-0 size-full"
            imageClassName="size-full"
            source={{ uri: image }}
            contentFit="cover"
          />
        )}
        <LinearGradient
          colors={["rgba(6,20,46,0.05)", "rgba(6,20,46,0.55)", "rgba(6,20,46,0.92)"]}
          locations={[0, 0.45, 1]}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1">
          <TextComponent className="text-xs font-bold text-white">Sponsored</TextComponent>
        </View>
        <View className="absolute bottom-5 left-5 right-5 gap-2">
          {event.momentum?.sellingFast && (
            <View className="self-start rounded-full bg-orange-500 px-3 py-1">
              <TextComponent className="text-xs font-extrabold text-white">🔥 Selling fast</TextComponent>
            </View>
          )}
          <TextComponent numberOfLines={2} className="text-2xl font-extrabold text-white">
            {event.name}
          </TextComponent>
          <TextComponent numberOfLines={1} className="text-sm text-white/85">
            {formatEventTime(event.date, event.timezone)} · {eventPlace(event)}
          </TextComponent>
          <View className="mt-1 flex-row items-center justify-between">
            <View className="rounded-xl bg-white px-4 py-2">
              <TextComponent className="text-sm font-extrabold text-[#06142e]">
                Get tickets{price ? ` · from ${price}` : ""} →
              </TextComponent>
            </View>
            {events.length > 1 && (
              <View className="flex-row gap-1.5" accessibilityElementsHidden>
                {events.map((item, dot) => (
                  <View
                    key={item.id}
                    className="h-1.5 rounded-full bg-white"
                    style={{
                      width: dot === index % events.length ? 22 : 6,
                      opacity: dot === index % events.length ? 1 : 0.5
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }
);
FeaturedBoost.displayName = "FeaturedBoost";
