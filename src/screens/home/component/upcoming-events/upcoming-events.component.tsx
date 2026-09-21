import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import TextComponent from "@/shared/components/text/text.component";
import { TEventDetailsType } from "@/shared/utils/types";
import { getData } from "@/api";
import { useQuery } from "@tanstack/react-query";
import TrendingEventCardComponent, {
  TrendingEventLoadingCard
} from "@/shared/components/events/trending-event-card/trending-event-card.component";
import QueryErrorComponent from "@/shared/components/status/query-error/query-error.component";
import { constructErrorMessage } from "@/api/functions";
import { FlashList } from "@shopify/flash-list";
import EmptyList from "@/shared/components/status/empty-list/empty-list";
import { addDays } from "date-fns";

const queryFn = async () => {
  const queryParams = new URLSearchParams();
  queryParams.append("limit", "5");
  queryParams.append("page", "1");
  const today = new Date();
  const tomorrow = addDays(today, 1);
  queryParams.append("startDate", tomorrow?.toISOString());
  const { data } = await getData<TEventDetailsType[]>(
    `/events?${queryParams.toString()}`
  );
  return data?.data;
};

const renderItem = ({ item }: { item: TEventDetailsType }) => {
  return <TrendingEventCardComponent className="w-40 mr-4" {...item} />;
};
const UpcomingEventComponents = () => {
  const { data, error, refetch } = useQuery({
    queryKey: ["trending-events"],
    queryFn
  });
  return (
    <View className="gap-6">
      <TextComponent className="font-medium">Upcoming Events</TextComponent>
      <View className="gap-6">
        {!data && !error && (
          <FlashList
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            data={new Array(5).fill("0")}
            renderItem={() => (
              <TrendingEventLoadingCard classNames="w-40 mr-4" />
            )}
            keyExtractor={(item, index) =>
              `${item?.id?.toString()}-${index?.toString()}`
            }
          />
        )}

        {error && !data && (
          <View className="h-52 items-center justify-center">
            <QueryErrorComponent
              className="py-10"
              isShown={!!error && !data}
              retryFunction={refetch}
              description={constructErrorMessage(
                error as TApiErrorResponseType,
                "Failed to fetch trending events"
              )}
            />
          </View>
        )}

        {data && data.length === 0 && (
          <View className="h-52 items-center justify-center">
            <EmptyList
              className="py-10"
              isEmpty={!!data && data.length === 0}
              description="No upcoming events found"
            />
          </View>
        )}
        {data && data.length > 0 && (
          <FlashList
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            data={data}
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              `${item?.id?.toString()}-${index?.toString()}`
            }
          />
        )}
      </View>
    </View>
  );
};

export default memo(UpcomingEventComponents);

const styles = StyleSheet.create({});
