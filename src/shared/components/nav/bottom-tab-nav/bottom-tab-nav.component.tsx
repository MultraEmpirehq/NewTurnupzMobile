import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import TextComponent from "../../text/text.component";
import { useLinkBuilder } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/shared/utils/classnames";

const ICON_SIZE = 20;

const BottomTabNavComponent: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation
}) => {
  const { buildHref } = useLinkBuilder();
  return (
    <SafeAreaView
      edges={["bottom"]}
      className="flex-row px-horizontal justify-between items-center"
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const icon = options.tabBarIcon;

        const onPress = () => {
          console.log("onPress", route.name);
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key
          });
        };

        return (
          <PlatformPressable
            className="items-center justify-center"
            key={route.key}
            href={buildHref(route.name, route.params)}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
          >
            {icon &&
              icon({
                color: isFocused ? "#05A5E8" : "#000000",
                size: ICON_SIZE,
                focused: isFocused
              })}
            <TextComponent
              className={cn(
                "text-xs",
                isFocused && "text-primary",
                !isFocused && "text-text"
              )}
            >
              {label?.toString()}
            </TextComponent>
          </PlatformPressable>
        );
      })}
    </SafeAreaView>
  );
};

export default memo(BottomTabNavComponent);

const styles = StyleSheet.create({});
