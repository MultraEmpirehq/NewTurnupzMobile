import { TextInput, View } from "react-native";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import TextComponent from "@/shared/components/text/text.component";
import SlideContentContainerComponent from "../slide-content-container/slide-content-container.component";
import useSlide from "../../hooks/use-slide.hook";
import { screensList, screensToShowInSlide } from "../../utils/data";
import ButtonComponent from "@/shared/components/button/button.component";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import { constructErrorMessage } from "@/api/functions";
import { onError, onSuccess } from "@/shared/components/status/toast";
import { postData } from "@/api";
import useSlideStore from "../../stores/slide.store";

/**
 * The last, optional step: the code of whoever invited them (a friend's
 * username or a promo code). Both get Turnupz Credit after their first ticket
 * purchase. Skipping is fine; it can be added from the profile for a week.
 */
const InviteCodeComponent = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const activeSlideIndex = useSlideStore((state) => state.activeSlideIndex);
  const setInviteStepDone = useSlideStore((state) => state.setInviteStepDone);
  const { handleNextSlideClicked } = useSlide();
  const inputRef = useRef<TextInput>(null);
  const slideIndex = useMemo(
    () =>
      screensList.findIndex(
        (screen) => screen === screensToShowInSlide["invite-code"]
      ),
    []
  );
  const isActive = activeSlideIndex === slideIndex;

  const finish = useCallback(() => {
    setInviteStepDone(true);
    handleNextSlideClicked(null);
  }, [handleNextSlideClicked, setInviteStepDone]);

  const handleAddCode = useCallback(async () => {
    if (!code.trim()) {
      finish();
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await postData<
        { code: string },
        { invitedBy: string }
      >("/referrals/apply", { code: code.trim() });
      onSuccess(`${data?.data?.invitedBy ?? "Your friend"} invited you`);
      finish();
    } catch (error) {
      onError(
        constructErrorMessage(
          error as TApiErrorResponseType,
          "That code isn't valid"
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [code, finish]);

  return (
    <SlideContentContainerComponent isActive={isActive}>
      <ContainerComponent>
        <View className="gap-3 items-center py-6">
          <TextComponent className="text-center font-bold">
            Got an invite code?
          </TextComponent>
          <TextComponent className="text-center text-sm text-gray-500">
            Add a friend&apos;s username or a promo code. You&apos;ll both get
            Turnupz Credit after your first ticket purchase.
          </TextComponent>
          <InputFieldComponent
            editable={!isLoading}
            className="w-[unset]"
            inputClassName="w-[unset] border-b border-t-0 border-l-0 border-r-0 text-center"
            placeholder="Invite code (optional)"
            value={code}
            onChangeText={setCode}
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleAddCode}
            ref={inputRef}
          />
        </View>
      </ContainerComponent>
      <View className="gap-3">
        <ButtonComponent isLoading={isLoading} onPress={handleAddCode}>
          {code.trim() ? "Add code and finish" : "Finish"}
        </ButtonComponent>
        {!!code.trim() && (
          <ButtonComponent
            variant="outline"
            disabled={isLoading}
            onPress={finish}
          >
            Skip
          </ButtonComponent>
        )}
      </View>
    </SlideContentContainerComponent>
  );
};

export default memo(InviteCodeComponent);
