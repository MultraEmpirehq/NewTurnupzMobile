import { View } from "react-native";
import React, { memo, useMemo } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/shared/utils/classnames";
import BadgeCheckIcon from "@/shared/assets/icons/badge-check.icon";
import CircleExclamationIcon from "@/shared/assets/icons/circle-exclamation.icon";
import TextComponent from "../../text/text.component";

const UPPERCASE_REGEXP = /[A-Z]/;
const LOWERCASE_REGEXP = /[a-z]/;
const NUMBER_REGEXP = /\d/;
const SPECIAL_CHARACTER_CHECK = /\W/;
const checkValidity = (password: string) => {
  return {
    hasUpperCase: UPPERCASE_REGEXP.test(password),
    hasLowerCase: LOWERCASE_REGEXP.test(password),
    hasNumber: NUMBER_REGEXP.test(password),
    hasSpecialCharacter: SPECIAL_CHARACTER_CHECK.test(password),
    has8OrMoreCharacters: password.length > 7
  };
};

const validityViewClassName = cva("flex-row items-center gap-2", {
  variants: {
    isValid: {
      false: "opacity-60",
      true: null
    }
  },
  defaultVariants: {
    isValid: false
  }
});
const validityTextClassName = cva("text-xs", {
  variants: {
    isValid: {
      false: null,
      true: "text-primary"
    }
  },
  defaultVariants: {
    isValid: false
  }
});

const CheckParameters: React.FC<{ isValid: boolean; value: string }> = ({
  isValid,
  value
}) => {
  return (
    <View className={cn(validityViewClassName({ isValid }))}>
      <View>
        {isValid && <BadgeCheckIcon color={"#006B99"} color2={"#6FB1FC"} />}
        {!isValid && <CircleExclamationIcon />}
      </View>
      <TextComponent className={cn(validityTextClassName({ isValid }))}>
        {value}
      </TextComponent>
    </View>
  );
};

const MemorizedCheckParameters = memo(CheckParameters);

const CheckPasswordValidity: React.FC<{ password: string }> = ({
  password
}) => {
  const passwordCheck = useMemo(() => checkValidity(password), [password]);
  return (
    <View className="gap-3">
      <MemorizedCheckParameters
        isValid={passwordCheck.hasUpperCase}
        value="At least one uppercase"
      />
      <MemorizedCheckParameters
        isValid={passwordCheck.hasLowerCase}
        value="At least one lowercase"
      />
      <MemorizedCheckParameters
        isValid={passwordCheck.hasNumber}
        value="At least one number"
      />
      <MemorizedCheckParameters
        isValid={passwordCheck.hasSpecialCharacter}
        value="At least one special character"
      />
      <MemorizedCheckParameters
        isValid={passwordCheck.has8OrMoreCharacters}
        value="At least 8 characters"
      />
    </View>
  );
};

export default memo(CheckPasswordValidity);
