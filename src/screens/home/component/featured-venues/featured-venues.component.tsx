import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import TextComponent from "@/shared/components/text/text.component";
import { TVenueDetailsType } from "@/shared/utils/types";
import { getData } from "@/api";
import { useQuery } from "@tanstack/react-query";
import QueryErrorComponent from "@/shared/components/status/query-error/query-error.component";
import { constructErrorMessage } from "@/api/functions";
import { FlashList } from "@shopify/flash-list";
import EmptyList from "@/shared/components/status/empty-list/empty-list";
import VenueDetailsCardComponent, {
  VenueDetailsCardLoader
} from "@/shared/components/venue/venue-details-card/venue-details-card.component";

const queryFn = async () => {
  const queryParams = new URLSearchParams();
  queryParams.append("limit", "5");
  queryParams.append("page", "1");
  const { data } = await getData<TVenueDetailsType[]>(
    `/venues?${queryParams.toString()}`
  );
  return data?.data;
};

const renderItem = ({ item }: { item: TVenueDetailsType }) => {
  return <VenueDetailsCardComponent className="w-[55vw] mr-4" {...item} />;
};
const FeaturedVenuesComponents = () => {
  const { data, error, refetch } = useQuery({
    queryKey: ["trending-events"],
    queryFn
  });
  return (
    <View className="gap-6">
      <TextComponent className="font-medium">Featured Venues</TextComponent>
      <View className="gap-6">
        {!data && !error && (
          <FlashList
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            data={new Array(5).fill("0")}
            renderItem={() => (
              <VenueDetailsCardLoader classNames="w-[55vw] mr-4" />
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
                "Failed to fetch featured venues"
              )}
            />
          </View>
        )}

        {data && data.length === 0 && (
          <View className="h-52 items-center justify-center">
            <EmptyList
              className="py-10"
              isEmpty={!!data && data.length === 0}
              description="No featured venues found"
            />
          </View>
        )}
        {data && data.length > 0 && (
          <FlashList<TVenueDetailsType>
            horizontal
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            data={data}
            extraData={{ data }}
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

export default memo(FeaturedVenuesComponents);

const styles = StyleSheet.create({});
