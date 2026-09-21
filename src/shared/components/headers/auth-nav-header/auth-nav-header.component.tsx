import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { memo } from "react";
import ArrowLeftIcon from "@assets/icons/arrow-left.icon";
import { useNavigation } from "@react-navigation/native";
import clsx from "clsx";
import { cn } from "@/shared/utils/classnames";

const AuthNavHeaderComponent: React.FC<{ className?: string }> = ({
  className
}) => {
  const { goBack } = useNavigation();
  return (
    <View
      className={cn(clsx("flex-row items-center justify-between", className))}
    >
      <TouchableOpacity onPress={goBack}>
        <ArrowLeftIcon />
      </TouchableOpacity>
    </View>
  );
};

export default memo(AuthNavHeaderComponent);

const styles = StyleSheet.create({});
