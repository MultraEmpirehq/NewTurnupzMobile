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
import { constructErrorMessage } from "@/api/functions";
import { onError } from "@/shared/components/status/toast";
import { patchData } from "@/api";
import useUserStore, { TUser } from "@/shared/stores/user.store";
import { DateOfBirthSVG } from "@/shared/assets/svg";
import { format } from "date-fns";
import DateModalComponent from "../date-modal/date-modal.component";

const DateOfBirthComponent = () => {
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const username = useUserStore(
    (state) => state.userNotVerifiedDetails?.username || ""
  );
  const { activeSlideIndex, handleNextSlideClicked } = useSlide();
  const inputRef = useRef<TextInput>(null);
  const slideIndex = useMemo(
    () =>
      screensList.findIndex(
        (screen) => screen === screensToShowInSlide["date-of-birth"]
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
    if (!dateOfBirth) {
      onError("Please select your date of birth");
      return;
    }
    console.log("dateOfBirth", dateOfBirth);
    try {
      const { data } = await patchData<{ dateOfBirth: Date }, TUser>("/user", {
        dateOfBirth
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
  }, [handleNextSlideClicked, dateOfBirth]);

  useEffect(() => {
    if (isActive && !isLoading) {
      handleInputFocus();
    }
  }, [isActive, handleInputFocus, isLoading]);

  return (
    <>
      <SlideContentContainerComponent isActive={isActive}>
        <ContainerComponent>
          <View className="gap-3 items-center py-6">
            <TextComponent className="text-center font-bold">
              {username} sounds great! When is your birthday?
            </TextComponent>
            <View className="">
              <TouchableOpacity onPress={() => setIsDateModalVisible(true)}>
                {!dateOfBirth && (
                  <TextComponent className="font-medium opacity-60">
                    DD-MM-YYYY
                  </TextComponent>
                )}
                {dateOfBirth && (
                  <TextComponent className="font-medium opacity-60">
                    {format(dateOfBirth, "dd-MM-yyyy")}
                  </TextComponent>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <ContainerComponent className="items-center justify-center">
            <DateOfBirthSVG width={100} />
          </ContainerComponent>
        </ContainerComponent>
        <ButtonComponent
          isLoading={isLoading}
          onPress={handleContinueButtonClicked}
        >
          Continue
        </ButtonComponent>
      </SlideContentContainerComponent>
      <DateModalComponent
        onDateSelected={setDateOfBirth}
        visible={isDateModalVisible}
        onClose={() => setIsDateModalVisible(false)}
      />
    </>
  );
};

export default memo(DateOfBirthComponent);

const styles = StyleSheet.create({});
