import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import React, { memo, useCallback, useEffect, useState } from "react";
import { getData } from "@/api";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchStore } from "../../stores/search.store";
import { useIsFocused } from "@react-navigation/native";
import ContainerComponent from "@/shared/components/container/container.component";
import { TTicketDetailsType } from "@/shared/utils/types";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import TicketCardComponent, {
  TicketCardSkeletonComponent
} from "../ticket-card/ticket-card.component";
import { constructErrorMessage } from "@/api/functions";
import QueryErrorComponent from "@/shared/components/status/query-error/query-error.component";
import EmptyList from "@/shared/components/status/empty-list/empty-list";

export enum ETicketStatus {
  ALL = "ALL",
  PENDING = "PENDING",
  TRANSFERRED = "TRANSFERRED",
  PAST = "PAST"
}

const getTickets = async (
  page: number,
  searchText: string,
  status: ETicketStatus
) => {
  const queryParams = new URLSearchParams();
  queryParams.append("page", page.toString());
  if (searchText) {
    queryParams.append("search", searchText);
  }
  // if (status && status !== ETicketStatus.ALL) {
  //   queryParams.append("status", status);
  // }
  const { data } = await getData<TTicketDetailsType[]>(
    `/tickets/user?${queryParams.toString()}`
  );
  return data;
};

const TicketListComponent: React.FC<{
  status: ETicketStatus;
}> = ({ status = ETicketStatus.ALL }) => {
  const [ticketList, setTicketList] = useState<TTicketDetailsType[] | null>(
    null
  );
  const isFocused = useIsFocused();
  const searchText = useSearchStore((state) => state.searchText);
  const {
    data,
    refetch,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error
  } = useInfiniteQuery({
    queryKey: ["tickets"],
    queryFn: ({ pageParam }) => getTickets(pageParam, searchText, status),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination?.nextPage) {
        return undefined;
      }
      return lastPage?.pagination?.nextPage;
    },
    enabled: isFocused
  });
  const renderItem = useCallback<ListRenderItem<TTicketDetailsType>>(
    ({ item }) => {
      return <TicketCardComponent {...item} />;
    },
    []
  );
  useEffect(() => {
    const firstPageData = data?.pages[0]?.data;
    if (firstPageData && data) {
      setTicketList(data?.pages?.flatMap((page) => page?.data) || []);
    }
  }, [data]);
  return (
    <ContainerComponent>
      {!ticketList && !error && (
        <FlashList
          contentContainerClassName="px-horizontal"
          data={new Array(5).fill("0")}
          renderItem={() => <TicketCardSkeletonComponent className="pb-6" />}
          keyExtractor={(item, index) => `${item}-${index}`}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
      )}
      {ticketList && ticketList.length > 0 && (
        <FlashList
          data={ticketList}
          renderItem={renderItem}
          contentContainerClassName="px-horizontal"
          keyExtractor={(item) => item?.id?.toString() || ""}
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
      )}
      {!!error && !ticketList && (
        <QueryErrorComponent
          className="px-horizontal"
          isShown={!!error && !ticketList}
          retryFunction={refetch}
          description={constructErrorMessage(
            error as TApiErrorResponseType,
            "Failed to fetch tickets"
          )}
        />
      )}
      {ticketList && ticketList.length === 0 && (
        <EmptyList
          className="px-horizontal"
          isEmpty={!!ticketList && ticketList.length === 0}
          description="No tickets found"
        />
      )}
    </ContainerComponent>
  );
};

export default memo(TicketListComponent);

const styles = StyleSheet.create({});
