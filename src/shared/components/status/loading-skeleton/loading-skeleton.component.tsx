import React, { memo, useEffect } from "react";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import clsx from "clsx";
import { cn } from "@/shared/utils/classnames";

const INITIAL_OPACITY_VALUE = 0,
  FINAL_OPACITY_VALUE = 1,
  DURATION = 1000;

const LoadingSkeletonComponent: React.FC<{ className?: string }> = ({
  className
}) => {
  const opacity = useSharedValue(INITIAL_OPACITY_VALUE);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(FINAL_OPACITY_VALUE, { duration: DURATION }),
      -1,
      true
    );
    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);
  return (
    <Animated.View
      className={cn(
        clsx("h-4 w-full bg-[#F2F3F5] dark:bg-[#2A2A2A] rounded-md", className)
      )}
      style={[animatedStyle]}
    />
  );
};

export default memo(LoadingSkeletonComponent);
