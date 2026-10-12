// CustomFlash.tsx
import { cn } from "@/shared/utils/classnames";
import React, { memo } from "react";
import { Pressable, View } from "react-native";
import { hideMessage, MessageComponentProps } from "react-native-flash-message";
import { SafeAreaView } from "react-native-safe-area-context";
import TextComponent from "../../text/text.component";
import BadgeCheckIcon from "@/shared/assets/icons/badge-check.icon";
import CircleExclamationIcon from "@/shared/assets/icons/circle-exclamation.icon";

const CustomToastMessageComponent: React.FC<MessageComponentProps> = ({
  message
}) => {
  return (
    <SafeAreaView>
      <Pressable
        onPress={hideMessage}
        className={cn(
          "bg-secondary-50 dark:bg-secondary-200 flex-row justify-between items-center  gap-10 px-4 py-5 mx-3 rounded-xl shadow-md"
        )}
      >
        <TextComponent className="flex-1 text-sm font-medium">
          {message?.message}
        </TextComponent>

        <View>
          {message?.type === "success" && (
            <BadgeCheckIcon color="#21CF46" color2={"#67FF7D"} />
          )}
          {message?.type === "info" && (
            <CircleExclamationIcon color="#00B2FF" />
          )}
          {message?.type === "danger" && (
            <CircleExclamationIcon color="#F22F22" />
          )}
        </View>
      </Pressable>
    </SafeAreaView>
  );
};

export default memo(CustomToastMessageComponent);
