import { StyleSheet } from "react-native";
import React, { memo, useEffect, useMemo, useState } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import SearchBoxComponent from "../components/search-box/search-box.component";
import { SearchContentCardSkeleton } from "../components/search-content-card/search-content-card.component";
import { useInfiniteQuery } from "@tanstack/react-query";
import { TEventDetailsType } from "@/shared/utils/types";
import { getData } from "@/api";
import { useIsFocused } from "@react-navigation/native";
import NoSearchInputComponent from "../components/no-search-input/no-search-input.component";
import { FlashList } from "@shopify/flash-list";
import QueryErrorComponent from "@/shared/components/status/query-error/query-error.component";
import { constructErrorMessage } from "@/api/functions";
import EmptyList from "@/shared/components/status/empty-list/empty-list";
import SearchListComponent from "../components/search-list/search-list.component";

const searchEvents = async (searchText: string, pageParam: number) => {
  if (!searchText) return null;
  const { data } = await getData<TEventDetailsType[]>(
    // The API filters on `q`; the search text is encoded so "&" or "#" can't break the query.
    `/events?q=${encodeURIComponent(searchText)}&page=${pageParam}`
  );
  return data;
};

const SearchScreen = () => {
  const [eventList, setEventList] = useState<TEventDetailsType[] | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const isFocused = useIsFocused();
  const trimmedSearchText = useMemo(() => searchText?.trim(), [searchText]);
  const shouldFetch = useMemo(
    () => !!trimmedSearchText?.trim(),
    [trimmedSearchText]
  );
  const {
    data,
    refetch,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useInfiniteQuery({
    queryKey: ["search", trimmedSearchText],
    queryFn: ({ pageParam }) => searchEvents(searchText, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.pagination?.nextPage) {
        return undefined;
      }
      return lastPage?.pagination?.nextPage;
    },
    enabled: shouldFetch && isFocused
  });
  useEffect(() => {
    if (!shouldFetch) {
      setEventList(null);
      return;
    }

    const combinedEvents =
      data?.pages?.flatMap((page) => page?.data ?? []) ?? null;

    setEventList(combinedEvents);
  }, [shouldFetch, data]);
  return (
    <ContainerComponent isSafeAreaView>
      <SearchBoxComponent onSearch={setSearchText} value={searchText} />
      {!shouldFetch && !eventList && (
        <NoSearchInputComponent setSearchText={setSearchText} />
      )}
      {shouldFetch && !eventList && !error && (
        <ContainerComponent className="px-horizontal">
          <FlashList
            data={new Array(5).fill("0")}
            renderItem={() => <SearchContentCardSkeleton className="pb-6" />}
            keyExtractor={(item, index) => `${item}-${index}`}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        </ContainerComponent>
      )}
      {shouldFetch && !eventList && error && (
        <ContainerComponent className="px-horizontal">
          <QueryErrorComponent
            isShown={!!error && !eventList}
            retryFunction={refetch}
            className="-mt-32"
            description={constructErrorMessage(
              error as TApiErrorResponseType,
              `Unable to get search results for "${searchText}"`
            )}
          />
        </ContainerComponent>
      )}
      {shouldFetch && eventList && eventList.length < 1 && (
        <ContainerComponent className="px-horizontal">
          <EmptyList
            isEmpty={!!eventList && eventList.length < 1}
            description={`No search results found for "${searchText}"`}
          />
        </ContainerComponent>
      )}
      {shouldFetch && eventList && eventList.length > 0 && (
        <SearchListComponent
          eventList={eventList}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
        />
      )}
    </ContainerComponent>
  );
};

export default memo(SearchScreen);

const styles = StyleSheet.create({});
