import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import TextComponent from "../../text/text.component";
import clsx from "clsx";
import { cn } from "@/shared/utils/classnames";

const LoggedInHeaderComponent: React.FC<{
  title: string;
  className?: string;
  rightContent?: React.ReactNode;
}> = ({ title, className, rightContent }) => {
  return (
    <View
      className={cn(
        clsx("flex-row items-center justify-between relative", className)
      )}
    >
      <View className="flex-1">
        <TextComponent className="font-bold text-lg text-primary-900">
          {title}
        </TextComponent>
      </View>
      {rightContent && <View className="">{rightContent}</View>}
    </View>
  );
};

export default memo(LoggedInHeaderComponent);

const styles = StyleSheet.create({});
