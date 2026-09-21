import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import { TEventDetailsType } from "@/shared/utils/types";
import { cn } from "@/shared/utils/classnames";
import CustomImageComponent from "../../images/custom-image/custom-image.component";
import TextComponent from "../../text/text.component";
import { format } from "date-fns";
import LoadingSkeletonComponent from "../../status/loading-skeleton/loading-skeleton.component";

const TrendingEventCard: React.FC<
  TEventDetailsType & { className?: string }
> = ({ className, name, date = new Date(), image }) => {
  return (
    <View className={cn("gap-2", className)}>
      <CustomImageComponent
        source={image}
        className="w-full h-[unset] aspect-square rounded-lg border border-black/5"
      />
      <View className="gap-2">
        <TextComponent className="font-bold">{name}</TextComponent>
        <TextComponent size="small" className="opacity-60">
          {format(date, "dd MMM yyyy")}
        </TextComponent>
      </View>
    </View>
  );
};

export const TrendingEventLoadingCard: React.FC<{ classNames?: string }> = ({
  classNames
}) => {
  return (
    <View className={cn("gap-2", classNames)}>
      <LoadingSkeletonComponent className="w-full h-[unset] aspect-square" />
      <View className="gap-2">
        <LoadingSkeletonComponent className="h-4 w-full" />
        <LoadingSkeletonComponent className="h-4 w-32" />
      </View>
    </View>
  );
};

export default memo(TrendingEventCard);

const styles = StyleSheet.create({});
