import { StyleSheet, Text, View } from "react-native";
import React, { memo, useCallback, useEffect, useState } from "react";
import useSlide from "@screens/onboarding/hooks/use-slide.hook";
import { screensList } from "@screens/onboarding/utils/data";
import clsx from "clsx";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { getComponentLayoutProperties } from "@utils/functions";
import { SLIDE_DURATION } from "@screens/onboarding/utils/variables";
import { cn } from "@/shared/utils/classnames";

const SLIDE_SIZE_CLASSNAME = "h-2 flex-1";

const SlideBar: React.FC<{
  isActive: boolean;
  shouldSlideBackwards: boolean;
  shouldSlideForward: boolean;
}> = ({ isActive, shouldSlideBackwards, shouldSlideForward }) => {
  const [barWidth, setBarWidth] = useState(0);
  const translateX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  const slideActiveAnimation = useCallback(() => {
    translateX.value = withTiming(0, { duration: 300 });
  }, [translateX]);

  const slidePreviousAnimation = useCallback(() => {
    translateX.value = withTiming(barWidth * -1, { duration: SLIDE_DURATION });
  }, [translateX, barWidth]);

  const slideNextAnimation = useCallback(() => {
    translateX.value = withTiming(barWidth, { duration: SLIDE_DURATION });
  }, [translateX, barWidth]);

  useEffect(() => {
    if (isActive) {
      slideActiveAnimation();
    }
  }, [isActive, slideActiveAnimation]);

  useEffect(() => {
    if (shouldSlideBackwards) {
      slidePreviousAnimation();
    }
  }, [shouldSlideBackwards, slidePreviousAnimation]);

  useEffect(() => {
    if (shouldSlideForward) {
      slideNextAnimation();
    }
  }, [shouldSlideForward, slideNextAnimation]);

  return (
    <View
      onLayout={(e) => {
        const { width } = getComponentLayoutProperties(e);
        if (!isActive) {
          translateX.value = width * -1;
        }

        setBarWidth(width);
      }}
      className={cn(
        clsx(
          "bg-black/10 dark:bg-white/20 rounded-full overflow-hidden",
          SLIDE_SIZE_CLASSNAME
        )
      )}
    >
      {!!barWidth && (
        <Animated.View
          className={"bg-primary rounded-full size-full"}
          style={[animatedStyle]}
        />
      )}
    </View>
  );
};

const MemorizedSlideBar = memo(SlideBar);

const SlideStatusBarComponent = () => {
  const { activeSlideIndex, previousSlideIndex } = useSlide();
  return (
    <View className="flex-row items-center gap-1 px-horizontal py-4">
      {screensList.map((_, index) => (
        <MemorizedSlideBar
          key={index}
          isActive={activeSlideIndex === index}
          shouldSlideBackwards={
            previousSlideIndex === index && activeSlideIndex < index
          }
          shouldSlideForward={
            previousSlideIndex === index && activeSlideIndex > index
          }
        />
      ))}
    </View>
  );
};

export default memo(SlideStatusBarComponent);

const styles = StyleSheet.create({});
