import { TouchableOpacity, View } from "react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { cva } from "class-variance-authority";
import TextComponent from "../../text/text.component";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "Del"];

const generateButtonStyles = cva(
  "items-center justify-center flex-1 rounded-2xl",
  {
    variants: {
      hasBackground: {
        true: "bg-secondary",
        false: null
      }
    },
    defaultVariants: {
      hasBackground: false
    }
  }
);

const splitKeysIntoGroups = (groupingCount: number = 3) => {
  const grouping: string[][] = [];
  for (let i = 0; i < KEYS.length; i++) {
    const keyIndex = i + 1;
    const calculatedGroupingIndex = Math.ceil(keyIndex / groupingCount);
    const groupingIndex = calculatedGroupingIndex - 1;
    const previousGroupingData = grouping[groupingIndex] || [];

    const newGroupedArray = [...previousGroupingData, KEYS[i]];
    grouping[groupingIndex] = newGroupedArray;
  }

  return grouping;
};

const KeyComponent: React.FC<{
  text: string;
  onPress?: (value: string) => void;
  deleteFunction?: () => void;
}> = ({ text, onPress = () => {}, deleteFunction = () => {} }) => {
  const isDelete = text?.toLowerCase() === "del";
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={text || undefined}
      testID={`number-keyboard-key-${text || "empty"}`}
      onPress={() => {
        if (isDelete) {
          deleteFunction();
          return;
        }
        onPress(text);
      }}
      className={generateButtonStyles()}
    >
      <TextComponent className="text-lg font-semibold">{text}</TextComponent>
    </TouchableOpacity>
  );
};

const MemorizedKeyComponent = memo(KeyComponent);

const GroupKeysComponent: React.FC<{
  keys: string[];
  onPress?: (value: string) => void;
  deleteFunction?: () => void;
}> = ({ keys, onPress = () => {}, deleteFunction = () => {} }) => {
  return (
    <View className="flex-row items-stretch gap-4 flex-[0.3]">
      {keys.map((key) => (
        <MemorizedKeyComponent
          onPress={onPress}
          deleteFunction={deleteFunction}
          key={key}
          text={key}
        />
      ))}
    </View>
  );
};

const MemorizedGroupKeyComponent = memo(GroupKeysComponent);

const INITIAL_KEYBOARD_POSITION = 300,
  FINAL_KEYBOARD_POSITION = 0;

const NumberKeyboardComponent: React.FC<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ value = "", onChange = () => {}, disabled = false }) => {
  const translateY = useSharedValue(INITIAL_KEYBOARD_POSITION);
  const groupedKeys = useMemo(() => splitKeysIntoGroups(), []);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  const animateKeyboard = useCallback((disabled: boolean) => {
    if (disabled) {
      translateY.value = withTiming(INITIAL_KEYBOARD_POSITION, {
        duration: 300
      });
      return;
    }
    translateY.value = withTiming(FINAL_KEYBOARD_POSITION, { duration: 300 });
  }, []);

  const deleteFunction = useCallback(() => {
    const newValue = value.slice(0, value.length - 1);
    onChange(newValue);
  }, [value, onChange]);

  const onPress = useCallback(
    (key: string) => {
      const newValue = `${value || ""}${key}`;
      onChange(newValue);
    },
    [value, onChange]
  );
  useEffect(() => {
    animateKeyboard(disabled);
  }, [disabled]);
  return (
    <View className="flex-1 max-h-[280px] gap-4 justify-end">
      <Animated.View className={"flex-1"} style={[animatedStyle]}>
        {groupedKeys.map((keys) => (
          <MemorizedGroupKeyComponent
            key={keys?.toString()}
            keys={keys}
            deleteFunction={deleteFunction}
            onPress={onPress}
          />
        ))}
      </Animated.View>
    </View>
  );
};

export default memo(NumberKeyboardComponent);
