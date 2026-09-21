import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import TextComponent from "@/shared/components/text/text.component";

const HeaderComponent = () => {
  return (
    <View className="flex-row items-center justify-between gap-6 px-horizontal py-4">
      <TextComponent className="font-bold text-lg">Explore</TextComponent>
      <View className="flex-row items-center gap-2">
        <TextComponent className="text-primary-700">Location</TextComponent>
      </View>
    </View>
  );
};

export default memo(HeaderComponent);

const styles = StyleSheet.create({});
