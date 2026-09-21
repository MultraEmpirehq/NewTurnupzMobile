import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { memo } from "react";
import TextComponent from "@/shared/components/text/text.component";
import SearchIcon from "@/shared/assets/icons/search.icon";
import { useNavigation } from "@react-navigation/native";
import { AuthenticatedStackParamList } from "@/navigation/authenticated-navigator/authenticated-navigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const SearchComponent = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthenticatedStackParamList>>();
  return (
    <View className="px-horizontal">
      <TouchableOpacity
        onPress={() => navigation.navigate("search")}
        className="border border-black/10 rounded-md py-3 px-4 flex-row items-center justify-between gap-2"
      >
        <View className="flex flex-row items-center gap-2 flex-1">
          <SearchIcon size={17} color="#000000" opacity={0.5} />
          <TextComponent className="opacity-50">
            Search for events
          </TextComponent>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default memo(SearchComponent);

const styles = StyleSheet.create({});
