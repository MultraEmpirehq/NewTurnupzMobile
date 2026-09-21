import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import TextComponent from "@/shared/components/text/text.component";
import SlideContentContainerComponent from "../slide-content-container/slide-content-container.component";
import useSlide from "../../hooks/use-slide.hook";
import { screensList, screensToShowInSlide } from "../../utils/data";
import ButtonComponent from "@/shared/components/button/button.component";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import { constructErrorMessage } from "@/api/functions";
import { onError } from "@/shared/components/status/toast";
import { patchData } from "@/api";
import { TUser, UserGender } from "@/shared/stores/user.store";
import { FullNameSVG, GenderSVG } from "@/shared/assets/svg";
import { cn } from "@/shared/utils/classnames";
import { capitalizeFirstLetter } from "@/shared/utils/functions";

const genderList = Object.keys(UserGender).map((gender) => ({
  label: gender,
  value: UserGender[gender as keyof typeof UserGender]
}));

const GenderComponent = () => {
  const [gender, setGender] = useState<UserGender | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { activeSlideIndex, handleNextSlideClicked } = useSlide();
  const inputRef = useRef<TextInput>(null);
  const slideIndex = useMemo(
    () =>
      screensList.findIndex(
        (screen) => screen === screensToShowInSlide["gender"]
      ),
    [activeSlideIndex]
  );
  const isActive = useMemo(
    () => activeSlideIndex === slideIndex,
    [activeSlideIndex, slideIndex]
  );

  const handleInputFocus = useCallback(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const handleContinueButtonClicked = useCallback(async () => {
    setIsLoading(true);
    if (!gender) {
      onError("Please select your gender");
      return;
    }
    try {
      const { data } = await patchData<{ gender: UserGender }, TUser>("/user", {
        gender
      });
      handleNextSlideClicked(data?.data || null);
    } catch (error) {
      const errorMessage = constructErrorMessage(
        error as TApiErrorResponseType,
        "Failed to continue"
      );
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [handleNextSlideClicked, gender]);

  useEffect(() => {
    if (isActive && !isLoading) {
      handleInputFocus();
    }
  }, [isActive, handleInputFocus, isLoading]);

  return (
    <SlideContentContainerComponent isActive={isActive}>
      <ContainerComponent>
        <View className="gap-3 items-center py-6">
          <TextComponent className="text-center font-bold">
            One step away! What Is your gender??
          </TextComponent>
          <View className="flex-row gap-2 items-center">
            {genderList.map((gen) => {
              const isSelected = gen?.value === gender;
              return (
                <TouchableOpacity
                  className={cn(
                    "px-4 py-2 rounded-lg bg-black/5",
                    isSelected && "bg-primary-700"
                  )}
                  key={gen?.value}
                  onPress={() => setGender(gen?.value)}
                >
                  <TextComponent
                    className={cn("text-xs", isSelected && "text-white")}
                  >
                    {capitalizeFirstLetter(gen?.label || "")}
                  </TextComponent>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <ContainerComponent className="items-center justify-center">
          <GenderSVG width={100} />
        </ContainerComponent>
      </ContainerComponent>
      <ButtonComponent
        isLoading={isLoading}
        disabled={!gender}
        onPress={handleContinueButtonClicked}
      >
        Continue
      </ButtonComponent>
    </SlideContentContainerComponent>
  );
};

export default memo(GenderComponent);

const styles = StyleSheet.create({});
