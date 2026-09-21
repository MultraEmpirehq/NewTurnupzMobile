import { View } from "react-native";
import React, { memo, useCallback, useEffect, useState } from "react";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import { useDebouncedCallback } from "use-debounce";
import { useSearchStore } from "../../stores/search.store";

const SearchBoxComponent = () => {
  const setSearchText = useSearchStore((state) => state.setSearchText);
  const searchText = useSearchStore((state) => state.searchText);
  const [search, setSearch] = useState<string>("");
  const processSearch = useDebouncedCallback((searchText: string) => {
    setSearchText(searchText);
  }, 700);
  const handleSearchInput = useCallback(
    (searchText: string) => {
      setSearch(searchText);
      processSearch(searchText);
    },
    [processSearch]
  );
  useEffect(() => {
    setSearch(searchText);
  }, [searchText]);
  return (
    <View className="px-horizontal py-6">
      <InputFieldComponent
        placeholder="Search here..."
        value={search}
        onChangeText={handleSearchInput}
        returnKeyType="search"
        onSubmitEditing={() => {
          console.log("search", search);
        }}
      />
    </View>
  );
};

export default memo(SearchBoxComponent);
