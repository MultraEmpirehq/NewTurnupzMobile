import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { memo, useMemo } from "react";
import { TEventDetailsType } from "@/shared/utils/types";
import TextComponent from "../../text/text.component";
import { formatUpcomingTime } from "@/shared/utils/functions";
import LocationIcon from "@/shared/assets/icons/location.icon";
import { format } from "date-fns";
import { cn } from "@/shared/utils/classnames";
import CircleExclamationIcon from "@/shared/assets/icons/circle-exclamation.icon";
import LoadingSkeletonComponent from "../../status/loading-skeleton/loading-skeleton.component";

const HappeningCardActionButton: React.FC<{
  onPress: () => void;
  icon: React.ReactNode;
}> = memo(({ onPress, icon }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-2 bg-primary rounded-md p-1"
    >
      {icon}
    </TouchableOpacity>
  );
});

const ICON_SIZE = 14;

const HappeningTodayCard: React.FC<
  TEventDetailsType & { classNames?: string }
> = ({ classNames, date = new Date(), name = "Event Name", venue }) => {
  const {
    name: venueName = "Venue name",
    address: venueAddress = "Venue address"
  } = venue || {};
  const happeningNowText = useMemo(() => {
    return formatUpcomingTime(date);
  }, [date]);
  const isHappeningNow = useMemo(() => {
    return happeningNowText === "now";
  }, [happeningNowText]);
  return (
    <View className={cn("gap-2 flex-row items-start", classNames)}>
      <View className="items-center gap-1 h-full pt-1">
        <View
          className={cn(
            "size-3 rounded-full items-center justify-center",
            isHappeningNow && "bg-primary",
            !isHappeningNow && "bg-white border border-primary"
          )}
        >
          <View className="size-1 rounded-full bg-white"></View>
        </View>
        <View className="flex-1 border-r border-dashed border-black/20"></View>
      </View>
      <View className="gap-2 flex-1">
        <TextComponent className="opacity-60 text-xs">
          Happening {happeningNowText}
        </TextComponent>

        <View className="gap-1">
          <TextComponent className="font-bold">{name}</TextComponent>
          <View className="flex-row items-center gap-1">
            <LocationIcon size={14} color="#6B7280" />
            <TextComponent className="text-sm opacity-60">
              {venueName}, {venueAddress}
            </TextComponent>
          </View>
          <TextComponent className="opacity-60 text-sm">
            {format(date, "hh:mm a")}
          </TextComponent>
        </View>
        <View className="flex-row items-center gap-2">
          <HappeningCardActionButton
            onPress={() => {}}
            icon={<CircleExclamationIcon size={ICON_SIZE} color="#6B7280" />}
          />
          <HappeningCardActionButton
            onPress={() => {}}
            icon={<CircleExclamationIcon size={ICON_SIZE} color="#6B7280" />}
          />
          <HappeningCardActionButton
            onPress={() => {}}
            icon={<CircleExclamationIcon size={ICON_SIZE} color="#6B7280" />}
          />
        </View>
      </View>
    </View>
  );
};

export const HappeningTodayLoadingCard: React.FC<{ classNames?: string }> =
  memo(({ classNames }) => {
    return (
      <View className={cn("gap-2 flex-row items-start", classNames)}>
        <View className="h-full gap-1 items-center">
          <LoadingSkeletonComponent className="size-3 rounded-full" />
          <LoadingSkeletonComponent className="w-1 flex-1 h-[unset]" />
        </View>
        <View className="flex-1 gap-3">
          <LoadingSkeletonComponent className="h-4 w-20" />
          <View className="gap-1">
            <LoadingSkeletonComponent className="h-4 w-full" />
            <LoadingSkeletonComponent className="h-4 w-[90%]" />
            <LoadingSkeletonComponent className="h-4 w-20" />
          </View>
        </View>
      </View>
    );
  });

export default memo(HappeningTodayCard);

const styles = StyleSheet.create({});
