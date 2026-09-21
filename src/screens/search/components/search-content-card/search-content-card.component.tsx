import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import CustomImageComponent from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { TEventDetailsType } from "@/shared/utils/types";
import { format } from "date-fns";
import LoadingSkeletonComponent from "@/shared/components/status/loading-skeleton/loading-skeleton.component";
import { cn } from "@/shared/utils/classnames";

const SearchContentCardComponent: React.FC<TEventDetailsType> = ({
  name = "Event Name",
  image,
  eventGuestsOfHonour,
  date = new Date()
}) => {
  const performer = eventGuestsOfHonour?.[0]?.name;
  return (
    <View className="flex-row items-center gap-3">
      <CustomImageComponent
        source={image}
        className="aspect-video w-[unset] h-20 rounded-lg"
      />
      <View className="flex-1 gap-1">
        <TextComponent className="font-bold">{name}</TextComponent>
        <TextComponent className="text-sm">
          <TextComponent className="font-medium text-sm">
            Performer:{" "}
          </TextComponent>
          <TextComponent className="text-sm opacity-60">
            {performer || "N/A"}
          </TextComponent>
        </TextComponent>
        <TextComponent className="text-sm">
          <TextComponent className="font-medium text-sm">Date: </TextComponent>
          <TextComponent className="text-sm opacity-60">
            {format(date, "MMMM d, yyyy")}
          </TextComponent>
        </TextComponent>
      </View>
    </View>
  );
};

export const SearchContentCardSkeleton: React.FC<{ className?: string }> = ({
  className
}) => {
  return (
    <View className={cn("flex-row items-center gap-3", className)}>
      <LoadingSkeletonComponent className="aspect-video w-[unset] h-20 rounded-lg" />
      <View className="flex-1 gap-1">
        <LoadingSkeletonComponent className="h-4 w-full" />
        <LoadingSkeletonComponent className="h-4 w-full" />
        <LoadingSkeletonComponent className="h-4 w-full" />
      </View>
    </View>
  );
};

export default memo(SearchContentCardComponent);

const styles = StyleSheet.create({});
