import { View } from "react-native";
import React, { memo } from "react";
import CustomImageComponent from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { TTicketDetailsType } from "@/shared/utils/types";
import { format } from "date-fns";
import { TicketCurveOneSVG, TicketCurveTwoSVG } from "@svg/index";
import LoadingSkeletonComponent from "@/shared/components/status/loading-skeleton/loading-skeleton.component";
import { cn } from "@/shared/utils/classnames";

const TicketCardComponent: React.FC<TTicketDetailsType> = ({
  event,
  type,
  quantity
}) => {
  const { name, venue, date } = event || {};
  return (
    <View className="flex-row items-center gap-4">
      <TicketCurveOneSVG
        height={"100%"}
        color={"#000000"}
        strokeWidth={2}
        opacity={0.2}
      />
      <CustomImageComponent className="aspect-square" />
      <View className="h-full border-r border-dashed border-black/20"></View>
      <View className="flex-1 gap-1.5">
        <TextComponent className="font-bold text-sm text-uppercase">
          {name || "Event Name"}
        </TextComponent>
        <TextComponent className="text-xs opacity-60">
          {venue?.address || "Venue Address"}
        </TextComponent>
        <TextComponent className="text-xs opacity-60">
          {format(date || new Date(), "dd MMM yyyy")} &bull;
          {format(date || new Date(), "hh:mm a")}
        </TextComponent>
        <TextComponent className="text-xs opacity-60">
          {type || "Type"} &bull; {quantity || 0} tickets
        </TextComponent>
      </View>

      <TicketCurveTwoSVG
        height={"100%"}
        color={"#000000"}
        strokeWidth={2}
        opacity={0.2}
      />
    </View>
  );
};

export const TicketCardSkeletonComponent: React.FC<{ className?: string }> = ({
  className
}) => {
  return (
    <View className={cn("flex-row items-center gap-4", className)}>
      <LoadingSkeletonComponent className="aspect-square size-28" />
      <View className="flex-1 gap-1">
        <LoadingSkeletonComponent className="h-4 w-full" />
        <LoadingSkeletonComponent className="h-4 w-full" />
        <LoadingSkeletonComponent className="h-4 w-full" />
        <LoadingSkeletonComponent className="h-4 w-full" />
      </View>
    </View>
  );
};

export default memo(TicketCardComponent);
