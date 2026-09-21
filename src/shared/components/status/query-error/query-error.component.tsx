import React, { memo } from "react";
import { View } from "react-native";
import clsx from "clsx";
import ContainerComponent from "../../container/container.component";
import TextComponent from "../../text/text.component";
import ButtonComponent from "../../button/button.component";
import { cn } from "@/shared/utils/classnames";

type TQueryErrorComponent = {
  title?: string;
  description?: string;
  retryFunction?: () => void;
  isShown: boolean;
  className?: string;
};

const QueryErrorComponent: React.FC<TQueryErrorComponent> = ({
  title = "Unexpected error occurred!",
  description = "Sorry about that! Please try again",
  retryFunction,
  isShown = false,
  className
}) => {
  if (!isShown) {
    return null;
  }
  return (
    <ContainerComponent
      className={cn(clsx("items-center justify-center gap-6", className))}
    >
      <View className="gap-2">
        <TextComponent className="text-xl font-semibold text-center">
          {title}
        </TextComponent>
        <TextComponent className="text-sm text-center opacity-60">
          {description}
        </TextComponent>
      </View>
      {retryFunction && (
        <ButtonComponent
          onPress={retryFunction}
          variant="outline"
          textClassName="text-primary text-sm"
        >
          Try again
        </ButtonComponent>
      )}
    </ContainerComponent>
  );
};

export default memo(QueryErrorComponent);
