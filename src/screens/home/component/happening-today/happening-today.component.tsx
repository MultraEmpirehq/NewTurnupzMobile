import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import TextComponent from "@/shared/components/text/text.component";
import HappeningTodayCardComponent, {
  HappeningTodayLoadingCard
} from "@/shared/components/events/happening-today-card/happening-today-card.component";
import { useQuery } from "@tanstack/react-query";
import { TEventDetailsType } from "@/shared/utils/types";
import { getData } from "@/api";
import { endOfDay, startOfDay } from "date-fns";
import { useIsFocused } from "@react-navigation/native";
import QueryErrorComponent from "@/shared/components/status/query-error/query-error.component";
import { constructErrorMessage } from "@/api/functions";
import EmptyList from "@/shared/components/status/empty-list/empty-list";

const queryFn = async () => {
  const queryParams = new URLSearchParams();
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  queryParams.append("startDate", todayStart?.toISOString());
  queryParams.append("endDate", todayEnd?.toISOString());
  queryParams.append("limit", "5");
  queryParams.append("page", "1");
  const { data } = await getData<TEventDetailsType[]>(
    `/events?${queryParams.toString()}`
  );
  return data?.data;
};

const HappeningTodayComponent = () => {
  const isFocused = useIsFocused();
  const { data, error, refetch } = useQuery({
    queryKey: ["happening-today"],
    queryFn,
    enabled: isFocused
  });
  return (
    <View className="gap-6">
      <TextComponent className="font-medium">Happening Today</TextComponent>
      <View className="gap-6">
        {!data &&
          !error &&
          Array.from({ length: 5 }).map((_, index) => (
            <HappeningTodayLoadingCard key={index} />
          ))}
        {error && !data && (
          <View className="h-52 items-center justify-center">
            <QueryErrorComponent
              isShown={!!error && !data}
              retryFunction={refetch}
              description={constructErrorMessage(
                error as TApiErrorResponseType,
                "Failed to fetch happening today events"
              )}
            />
          </View>
        )}

        {data && data.length === 0 && (
          <View className="h-52 items-center justify-center">
            <EmptyList
              className="py-10"
              isEmpty={!!data && data.length === 0}
              description="No happening today events found"
            />
          </View>
        )}
        {data &&
          data.map((event) => (
            <HappeningTodayCardComponent key={event.id} {...event} />
          ))}
      </View>
    </View>
  );
};

export default memo(HappeningTodayComponent);

const styles = StyleSheet.create({});
