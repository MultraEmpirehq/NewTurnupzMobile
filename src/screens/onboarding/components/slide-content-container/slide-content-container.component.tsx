import { StyleSheet, Text, View } from "react-native";
import React, { memo, useCallback, useEffect, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

const INITIAL_OPACITY_VALUE = 0,
  FINAL_OPACITY_VALUE = 1,
  DURATION = 300;

const SlideContentComponent: React.FC<{
  isActive: boolean;
  children: React.ReactNode;
}> = ({ isActive, children }) => {
  const [shouldShowContent, setShouldShowContent] = useState(false);
  const opacity = useSharedValue(INITIAL_OPACITY_VALUE);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  const showContentAnimation = useCallback(() => {
    opacity.value = withTiming(FINAL_OPACITY_VALUE, { duration: DURATION });
  }, [opacity]);

  const hideContentAnimation = useCallback(() => {
    opacity.value = withTiming(INITIAL_OPACITY_VALUE, { duration: DURATION });
    setTimeout(() => {
      setShouldShowContent(false);
    }, DURATION + 200);
  }, [opacity]);

  useEffect(() => {
    if (isActive) {
      setShouldShowContent(true);
    }
  }, [isActive, showContentAnimation]);

  useEffect(() => {
    if (!isActive) {
      hideContentAnimation();
    }
  }, [isActive, hideContentAnimation]);

  useEffect(() => {
    if (shouldShowContent) {
      showContentAnimation();
    }
  }, [shouldShowContent, showContentAnimation]);

  if (!shouldShowContent) return null;
  return (
    <Animated.View
      className="flex-1 justify-between py-6 bg-white"
      style={[animatedStyle]}
    >
      {children}
    </Animated.View>
  );
};

export default memo(SlideContentComponent);

const styles = StyleSheet.create({});
