import React, { memo } from "react";
import { useTicketsHeldFor } from "./live-api";
import { Pressable, View } from "react-native";
import { Circle, Path, Svg } from "react-native-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import {
  formatEventClock,
  formatEventDateBlock
} from "@/shared/utils/event-time";

/** The list background; the card's ticket notches are cut in it. */
export const TICKET_LIST_BACKGROUND = "#f7f8fb";

type TEventTicketCardProps = {
  name: string;
  date: Date | string;
  /** The venue's zone; date and time read on its clock. */
  timezone?: string;
  image?: string;
  category?: string;
  place?: string;
  badge?: string;
  /** The event, so the card can show "Going" when you hold tickets for it. */
  eventId?: string;
  onPress?: () => void;
  /** Shows the dots button for the event's options. */
  onMore?: () => void;
  /** A fixed width for side-scrolling rails; full width in lists otherwise. */
  width?: number;
};

/**
 * An event as a ticket stub, matching the web's card: the poster with its
 * category, a torn perforation, then the date block, name and place. Used by the
 * home feed, Explore's lists and its side-scrolling rails, and the profile.
 */
const EventTicketCard: React.FC<TEventTicketCardProps> = ({
  name,
  date,
  timezone,
  image,
  category,
  place,
  badge,
  eventId,
  onPress,
  onMore,
  width
}) => {
  const going = useTicketsHeldFor(eventId) > 0;
  const dateBlock = formatEventDateBlock(date, timezone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${name}`}
      onPress={onPress}
      className={width ? "mb-5 rounded-3xl bg-white" : "mx-4 mb-5 rounded-3xl bg-white"}
      style={{
        width,
        shadowColor: "#0f172a",
        shadowOpacity: 0.1,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3
      }}
    >
      <View className="overflow-hidden rounded-3xl border border-black/5">
        <View className="relative aspect-[4/3] w-full bg-[#eef6ff]">
          {!!image && (
            <CustomImage
              className="size-full"
              imageClassName="size-full"
              source={{ uri: image }}
              contentFit="cover"
            />
          )}
          {!!category && (
            <View className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1">
              <TextComponent className="text-xs font-semibold text-zinc-900">
                {category}
              </TextComponent>
            </View>
          )}
          {(going || !!badge) && (
            <View className="absolute right-3 top-3 flex-row gap-1.5">
              {going && (
                // You already hold tickets for this one.
                <View className="flex-row items-center gap-1 rounded-full px-3 py-1" style={{ backgroundColor: "#0577FA" }}>
                  <TextComponent className="text-xs font-bold text-white">✓ Going</TextComponent>
                </View>
              )}
              {!!badge && (
                <View className="rounded-full bg-black/55 px-3 py-1">
                  <TextComponent className="text-xs font-semibold text-white">{badge}</TextComponent>
                </View>
              )}
            </View>
          )}
        </View>

        {/* The perforation: two notches and a dashed tear line. */}
        <View style={{ height: 0 }}>
          {[{ left: -12 }, { right: -12 }].map((side, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                top: -12,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: TICKET_LIST_BACKGROUND,
                ...side
              }}
            />
          ))}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 20,
              right: 20,
              borderTopWidth: 2,
              borderStyle: "dashed",
              borderColor: "#e3eef7"
            }}
          />
        </View>

        <View className="flex-row items-center gap-4 py-4 pl-5 pr-3">
          <View className="w-12 items-center rounded-2xl bg-[#eef6ff] py-2">
            <TextComponent className="text-[11px] font-semibold text-zinc-900">
              {dateBlock?.month ?? "TBA"}
            </TextComponent>
            <TextComponent className="text-xl font-bold leading-6 text-zinc-900">
              {dateBlock?.day ?? "--"}
            </TextComponent>
          </View>
          <View className="flex-1 gap-1">
            <TextComponent
              numberOfLines={1}
              className="text-base font-semibold text-zinc-950"
            >
              {name}
            </TextComponent>
            <View className="flex-row items-center gap-1">
              <Svg width={13} height={13} viewBox="0 0 24 24">
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
              <TextComponent
                numberOfLines={1}
                className="flex-1 text-sm text-zinc-500"
              >
                {formatEventClock(date, timezone)} ·{" "}
                {place || "Venue to be announced"}
              </TextComponent>
            </View>
          </View>
          {onMore && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open event options"
              onPress={onMore}
              hitSlop={8}
              className="h-9 w-8 items-center justify-center"
            >
              <View className="gap-0.5">
                <View className="size-1 rounded-full bg-zinc-700" />
                <View className="size-1 rounded-full bg-zinc-700" />
                <View className="size-1 rounded-full bg-zinc-700" />
              </View>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
};

export default memo(EventTicketCard);
