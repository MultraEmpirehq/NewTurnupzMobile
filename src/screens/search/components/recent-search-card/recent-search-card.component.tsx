import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { memo } from "react";
import TextComponent from "@/shared/components/text/text.component";
import CloseIcon from "@/shared/assets/icons/close.icon";
import { useSearchStore } from "../../store/search.store";

const RecentSearchCardComponent: React.FC<{
  searchText: string;
  onPress: (value: string) => void;
}> = ({ searchText, onPress }) => {
  const addToRecentList = useSearchStore((state) => state.addToRecentList);
  const removeFromRecentList = useSearchStore(
    (state) => state.removeFromRecentList
  );
  return (
    <View className="py-6 px-4 border-b border-black/10 rounded-md gap-4 flex-row items-center justify-between">
      <TouchableOpacity
        onPress={() => {
          onPress(searchText);
          addToRecentList(searchText);
        }}
      >
        <TextComponent className="text-link text-sm">
          {searchText}
        </TextComponent>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => removeFromRecentList(searchText)}>
        <CloseIcon size={16} color="#000000" opacity={0.5} />
      </TouchableOpacity>
    </View>
  );
};

export default memo(RecentSearchCardComponent);

const styles = StyleSheet.create({});
