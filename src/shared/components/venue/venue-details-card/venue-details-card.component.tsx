import { StyleSheet, Text, View } from "react-native";
import React, { memo, useMemo } from "react";
import CustomImageComponent from "../../images/custom-image/custom-image.component";
import TextComponent from "../../text/text.component";
import { TVenueDetailsType } from "@/shared/utils/types";
import { cn } from "@/shared/utils/classnames";
import LoadingSkeletonComponent from "../../status/loading-skeleton/loading-skeleton.component";

const VenueDetailsCard: React.FC<
  TVenueDetailsType & { className?: string }
> = ({
  className,
  name = "Venue Name",
  address = "Venue Address",
  totalAvailableSeat = 500,
  images
}) => {
  console.log("images venue details card", images);
  const firstImage = useMemo(() => images?.[0], [images]);
  console.log(firstImage);
  return (
    <View className={cn("gap-2", className)}>
      <CustomImageComponent
        source={firstImage}
        className="w-full h-[unset] aspect-square rounded-lg border border-black/5"
      />
      <View className="gap-1">
        <TextComponent className="font-bold">{name}</TextComponent>
        <TextComponent className="opacity-60 text-sm">{address}</TextComponent>
        <TextComponent className="opacity-60 text-xs">
          {totalAvailableSeat} available seats
        </TextComponent>
      </View>
    </View>
  );
};

export const VenueDetailsCardLoader: React.FC<{ classNames?: string }> = ({
  classNames
}) => {
  return (
    <View className={cn("gap-2", classNames)}>
      <LoadingSkeletonComponent className="w-full h-[unset] aspect-square" />
      <View className="gap-2">
        <LoadingSkeletonComponent className="h-4 w-full" />
        <LoadingSkeletonComponent className="h-4 w-32" />
        <LoadingSkeletonComponent className="h-4 w-28" />
      </View>
    </View>
  );
};

export default memo(VenueDetailsCard);

const styles = StyleSheet.create({});
