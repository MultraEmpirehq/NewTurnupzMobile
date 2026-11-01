import React, { useImperativeHandle, useMemo, useRef, useState } from "react";
import { FlatList, FlatListProps, Platform, RefreshControl, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import BrandLoader from "../brand-loader/brand-loader.component";

/**
 * A FlatList whose pull-to-refresh is the brand loader: as the list is pulled
 * down the wordmark writes itself and inks in with the pull, and once let go it
 * keeps pulsing until the refresh is done. The platform's own refresh still
 * runs it (it holds the list open while refreshing), with its spinner hidden.
 *
 * iOS reads the pull from the bounce past the top. Android has no bounce, so
 * there a pan gesture running alongside the list's own scrolling reads it,
 * and the list slides down by that much to open the same gap.
 */

/** How far to pull for the wordmark to be fully drawn, in points. */
const FULL_PULL = 90;
const IS_ANDROID = Platform.OS === "android";

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

  // How far past the top the list is pulled, in points.
  const pull = useSharedValue(0);
  // Whether the list is at its top, so a downward drag is a pull (Android).
  const atTop = useSharedValue(true);
  // A plain FlatList (so its ref can scroll it); the pull feeds the loader.
  const onScroll: FlatListProps<T>["onScroll"] = (event) => {
    const offset = event.nativeEvent.contentOffset.y;
    if (!IS_ANDROID) pull.value = Math.max(0, -offset);
    atTop.value = offset <= 0;
    lastOffset.current = offset;
    props.onScroll?.(event);
  };
  // Fully drawn while refreshing; otherwise drawn as far as it's pulled.
  const isRefreshing = useDerivedValue(() => (refreshing ? 1 : 0), [refreshing]);
  const progress = useDerivedValue(() =>
    isRefreshing.value ? 1 : Math.min(1, pull.value / FULL_PULL)
  );

  // Android: read the drag alongside the list's own scrolling (and its refresh).
  const gesture = useMemo(() => {
    if (!IS_ANDROID || !onRefresh) return null;
    const pan = Gesture.Pan()
      .activeOffsetY(8)
      .onUpdate((event) => {
        // Half the finger's travel, like a rubber band; only from the top.
        pull.value = atTop.value ? Math.max(0, event.translationY * 0.5) : 0;
      })
      .onFinalize(() => {
        pull.value = 0;
      });
    return Gesture.Simultaneous(Gesture.Native(), pan);
  }, [atTop, onRefresh, pull]);

  // The gap the pull opens: follows the finger, then holds while refreshing
  // and eases shut once it's done.
  const gap = useDerivedValue(() =>
    pull.value > 0
      ? Math.max(pull.value, isRefreshing.value ? 64 : 0)
      : withTiming(isRefreshing.value ? 64 : 0, { duration: 220 })
  );
  // The loader sits in that gap, centred in it, fading in early.
  const overlayStyle = useAnimatedStyle(() => ({
    height: IS_ANDROID ? gap.value : Math.max(pull.value, isRefreshing.value ? 64 : 0),
    opacity: isRefreshing.value ? 1 : Math.min(1, pull.value / 30)
  }));
  // Android: the list moves down to open the gap, as iOS's bounce does.
  const listStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateY: IS_ANDROID ? gap.value : 0 }]
  }));
  const list = (
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
            // Android draws its spinner anyway: keep it out of sight.
            progressViewOffset={IS_ANDROID ? -1000 : undefined}
          />
        ) : undefined
      }
    />
  );

  // The gap shows what's behind the list, so it wears the list's own colour.
  const listBackground = StyleSheet.flatten(props.style)?.backgroundColor;

  return (
    <View style={{ flex: 1, backgroundColor: listBackground }}>
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
          <BrandLoader height={26} hideLabel progress={progress} playing={!!refreshing} />
        </Animated.View>
      )}
      <Animated.View style={listStyle}>
        {gesture ? <GestureDetector gesture={gesture}>{list}</GestureDetector> : list}
      </Animated.View>
    </View>
  );
}

export default BrandRefreshList;
