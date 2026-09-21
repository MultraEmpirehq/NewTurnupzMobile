import { StyleSheet, Text, View } from "react-native";
import React, { memo, useCallback, useEffect, useState } from "react";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import { NavigationProp } from "@react-navigation/native";
import { AuthenticatedStackParamList } from "@/navigation/authenticated-navigator/authenticated-navigator";
import { useNavigation } from "@react-navigation/native";
import CloseCircleIcon from "@/shared/assets/icons/close-circle.icon";
import { useDebouncedCallback } from "use-debounce";
import { useSearchStore } from "../../store/search.store";

const SearchBoxComponent: React.FC<{
  onSearch: (searchText: string) => void;
  value: string;
}> = ({ onSearch, value }) => {
  const addToRecentList = useSearchStore((state) => state.addToRecentList);
  const navigation =
    useNavigation<NavigationProp<AuthenticatedStackParamList>>();
  const [search, setSearch] = useState<string>("");
  const processSearch = useDebouncedCallback((searchText: string) => {
    onSearch(searchText);
    if (!searchText?.trim()) return;
    addToRecentList(searchText);
  }, 700);
  const handleSearchInput = useCallback(
    (searchText: string) => {
      setSearch(searchText);
      processSearch(searchText);
    },
    [processSearch]
  );
  useEffect(() => {
    setSearch(value);
  }, [value]);
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
        rightButtonAction={() => {
          navigation.goBack();
        }}
        rightIcon={<CloseCircleIcon size={20} color="#000000" opacity={0.5} />}
      />
    </View>
  );
};

export default memo(SearchBoxComponent);

const styles = StyleSheet.create({});
