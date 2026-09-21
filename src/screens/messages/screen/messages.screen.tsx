import { StyleSheet, View } from "react-native";
import React, { memo } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import LoggedinHeaderComponent from "@/shared/components/headers/loggedin-header/loggedin-header.component";
import TextComponent from "@/shared/components/text/text.component";

const MessagesScreen = () => {
  return (
    <ContainerComponent isSafeAreaView>
      <LoggedinHeaderComponent
        title="Messages"
        className="px-horizontal py-4"
      />
      <View className="flex-1 items-center justify-center px-horizontal">
        <TextComponent className="text-center opacity-60">
          Messages are not wired up yet.
        </TextComponent>
      </View>
    </ContainerComponent>
  );
};

export default memo(MessagesScreen);

const styles = StyleSheet.create({});
