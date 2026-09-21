import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import React, { memo, useCallback } from "react";
import { TEventDetailsType } from "@/shared/utils/types";
import ContainerComponent from "@/shared/components/container/container.component";
import SearchContentCardComponent from "../search-content-card/search-content-card.component";
import { FlashList, ListRenderItem } from "@shopify/flash-list";

const SearchListComponent: React.FC<{
  eventList: TEventDetailsType[];
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
}> = ({ eventList, isFetchingNextPage, fetchNextPage, hasNextPage }) => {
  const renderItem = useCallback<ListRenderItem<TEventDetailsType>>(
    ({ item }) => {
      return <SearchContentCardComponent {...item} />;
    },
    []
  );
  return (
    <ContainerComponent>
      <FlashList<TEventDetailsType>
        data={eventList}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item?.id?.toString() || ""}-${index}`}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onEndReached={() => {
          if (hasNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="h-10">
              <ActivityIndicator size="large" color="#05B5FF" />
            </View>
          ) : undefined
        }
      />
    </ContainerComponent>
  );
};

export default memo(SearchListComponent);

const styles = StyleSheet.create({});
