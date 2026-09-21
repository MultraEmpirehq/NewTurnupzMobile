import { TouchableOpacity, View } from "react-native";
import React, { memo } from "react";
import { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";
import { useLinkBuilder } from "@react-navigation/native";
import { cva } from "class-variance-authority";
import TextComponent from "@/shared/components/text/text.component";

const buttonClassName = cva("rounded-md px-4 py-1", {
  variants: {
    isActive: {
      true: "border border-primary transparent",
      false: "bg-black/10 dark:bg-white/10 opacity-60"
    }
  },
  defaultVariants: {
    isActive: false
  }
});

const textClassName = cva("text-sm", {
  variants: {
    isActive: {
      true: "text-primary",
      false: "text-black dark:text-white"
    }
  },
  defaultVariants: {
    isActive: false
  }
});

const TabNavBarComponent: React.FC<MaterialTopTabBarProps> = ({
  state,
  descriptors,
  navigation
}) => {
  const { buildHref } = useLinkBuilder();
  return (
    <View className="flex-row items-center gap-4 px-horizontal pb-6">
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (
          options.tabBarLabel ||
          options.title ||
          route.name
        )?.toString();

        const isFocused = state.index === index;

        const onPress = () => {
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
          <TouchableOpacity
            key={route.key}
            accessibilityRole={"button"}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            className={buttonClassName({ isActive: isFocused })}
          >
            <TextComponent className={textClassName({ isActive: isFocused })}>
              {label}
            </TextComponent>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default memo(TabNavBarComponent);
