import React, { memo } from "react";
import ContainerComponent from "../../container/container.component";
import { cn } from "@/shared/utils/classnames";
import TextComponent from "../../text/text.component";
import { WINDOW_WIDTH } from "@/shared/utils/variables";
import EmptyOutlineIcon from "@/shared/assets/icons/empty-outline.icon";

type TEmptyPeopleList = {
  isEmpty: boolean;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  textClassName?: string;
};

const EmptyPeopleList: React.FC<TEmptyPeopleList> = ({
  isEmpty,
  description,
  icon,
  className,
  textClassName
}) => {
  if (!isEmpty) {
    return;
  }
  return (
    <ContainerComponent
      className={cn(
        "items-center justify-center gap-3 p-horizontal",
        className
      )}
    >
      {icon || <EmptyOutlineIcon size={WINDOW_WIDTH * 0.13} />}
      <TextComponent
        className={cn("text-center opacity-60 max-w-[70%]", textClassName)}
      >
        {description || " Empty content!"}
      </TextComponent>
    </ContainerComponent>
  );
};

export default memo(EmptyPeopleList);
