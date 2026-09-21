import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import SlideStatusBarComponent from "../components/slide-status-bar/slide-bar.component";
import SlideContentComponent from "../components/slide-content/slide-content.component";

const OnboardingScreen = () => {
  return (
    <ContainerComponent isSafeAreaView>
      <SlideStatusBarComponent />
      <SlideContentComponent />
    </ContainerComponent>
  );
};

export default memo(OnboardingScreen);

const styles = StyleSheet.create({});
