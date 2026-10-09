import React, { useImperativeHandle, useRef, useState } from "react";
import { FlatList, FlatListProps, RefreshControl, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue
} from "react-native-reanimated";
import BrandLoader from "../brand-loader/brand-loader.component";

/**
 * A FlatList whose pull-to-refresh is the brand loader: as the list is pulled
 * down the wordmark writes itself and inks in with the pull, and once let go it
 * keeps pulsing until the refresh is done. The platform spinner is still there
 * (it holds the list open while refreshing) but drawn transparent.
 */

/** How far to pull for the wordmark to be fully drawn, in points. */
const FULL_PULL = 90;

export type TBrandRefreshListHandle = { scrollToTop: () => void };

function BrandRefreshList<T>({
  refreshing,
  onRefresh,
  listRef,
  ...props
}: FlatListProps<T> & {
  /** Control over the list, e.g. to take it back to the top. */
  listRef?: React.Ref<TBrandRefreshListHandle>;
}) {
  const flatListRef = useRef<FlatList<T>>(null);
  // Where the list is scrolled to, and a key that remounts it at the top.
  const lastOffset = useRef(0);
  const [resetKey, setResetKey] = useState(0);
  const handle: TBrandRefreshListHandle = {
    scrollToTop: () => {
      const from = lastOffset.current;
      if (from <= 0) return;
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      // On iOS here the native scroll command never reaches the list (NativeWind's
      // JSX wrapper drops its native ref under React 19). If it didn't move,
      // start the list over, which opens it at the top; its data is cached.
      setTimeout(() => {
        if (lastOffset.current >= from - 1) {
          lastOffset.current = 0;
          setResetKey((key) => key + 1);
        }
      }, 120);
    }
  };
  useImperativeHandle(listRef, () => handle);

  // How far past the top the list is pulled (iOS bounce), in points.
  const pull = useSharedValue(0);
  // A plain FlatList (so its ref can scroll it); the pull feeds the loader.
  const onScroll: FlatListProps<T>["onScroll"] = (event) => {
    pull.value = Math.max(0, -event.nativeEvent.contentOffset.y);
    lastOffset.current = event.nativeEvent.contentOffset.y;
    props.onScroll?.(event);
  };
  const progress = useDerivedValue(() => Math.min(1, pull.value / FULL_PULL));

  // The loader sits in the gap the pull opens, centred in it, fading in early.
  const overlayStyle = useAnimatedStyle(() => ({
    height: Math.max(pull.value, refreshing ? 64 : 0),
    opacity: refreshing ? 1 : Math.min(1, pull.value / 30)
  }));

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        key={resetKey}
        {...props}
        ref={flatListRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor="transparent"
              colors={["transparent"]}
              progressBackgroundColor="transparent"
            />
          ) : undefined
        }
      />
      {onRefresh && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            },
            overlayStyle
          ]}
        >
          <BrandLoader
            height={26}
            hideLabel
            progress={progress}
            playing={!!refreshing}
          />
        </Animated.View>
      )}
    </View>
  );
}

export default BrandRefreshList;
