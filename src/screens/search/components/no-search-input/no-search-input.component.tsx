import React, { memo, useCallback } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import { useSearchStore } from "../../store/search.store";
import TextComponent from "@/shared/components/text/text.component";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import RecentSearchCardComponent from "../recent-search-card/recent-search-card.component";

const NoSearchInputComponent: React.FC<{
  setSearchText: (searchText: string) => void;
}> = ({ setSearchText }) => {
  const recentSearches = useSearchStore((state) => state.recentSearches);

  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item }) => {
      return (
        <RecentSearchCardComponent searchText={item} onPress={setSearchText} />
      );
    },
    [setSearchText]
  );
  if (recentSearches.length < 1) {
    return (
      <ContainerComponent className="px-horizontal items-center justify-center">
        <TextComponent className="text-center opacity-60 text-sm -mt-32">
          Start typing to search for events...
        </TextComponent>
      </ContainerComponent>
    );
  }

  return (
    <ContainerComponent className="px-horizontal gap-4">
      <TextComponent className="font-bold">Recent Searches</TextComponent>
      <FlashList
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        extraData={{ setSearchText }}
        data={recentSearches}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item}-${index}`}
      />
    </ContainerComponent>
  );
};

export default memo(NoSearchInputComponent);
