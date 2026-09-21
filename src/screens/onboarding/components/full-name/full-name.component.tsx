import { StyleSheet, Text, TextInput, View } from "react-native";
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
import { TUser } from "@/shared/stores/user.store";
import { FullNameSVG } from "@/shared/assets/svg";
import useSlideStore from "../../stores/slide.store";

const FullNameComponent = () => {
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const activeSlideIndex = useSlideStore((state) => state.activeSlideIndex);
  console.log("activeSlideIndex", activeSlideIndex);
  const { handleNextSlideClicked } = useSlide();
  const inputRef = useRef<TextInput>(null);
  const slideIndex = useMemo(
    () =>
      screensList.findIndex(
        (screen) => screen === screensToShowInSlide["full-name"]
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
    try {
      const [firstName, lastName] = fullName.split(" ");
      const { data } = await patchData<
        { firstName: string; lastName: string },
        TUser
      >("/user", {
        firstName,
        lastName
      });
      console.log("data", data);
      handleNextSlideClicked(data?.data || null);
    } catch (error) {
      console.log("error", error);
      const errorMessage = constructErrorMessage(
        error as TApiErrorResponseType,
        "Failed to continue"
      );
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [handleNextSlideClicked, fullName]);

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
            Let's sign you up! What is your full name?
          </TextComponent>
          <InputFieldComponent
            editable={!isLoading}
            className="w-[unset]"
            inputClassName="w-[unset] border-b border-t-0 border-l-0 border-r-0 text-center"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            ref={inputRef}
          />
        </View>
        <ContainerComponent className="items-center justify-center">
          <FullNameSVG width={100} />
        </ContainerComponent>
      </ContainerComponent>
      <ButtonComponent
        isLoading={isLoading}
        onPress={handleContinueButtonClicked}
      >
        Continue
      </ButtonComponent>
    </SlideContentContainerComponent>
  );
};

export default memo(FullNameComponent);

const styles = StyleSheet.create({});
