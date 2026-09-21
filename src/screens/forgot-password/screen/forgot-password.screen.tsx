import { ScrollView, StyleSheet, Text, View } from "react-native";
import React, { memo, useCallback } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import KeyboardViewLayout from "@/shared/components/keyboard-view/keyboard-view.layout";
import TextComponent from "@/shared/components/text/text.component";
import joi from "joi";
import { Controller, useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import ButtonComponent from "@/shared/components/button/button.component";
import { getData, postData } from "@/api";
import {
  EVerificationType,
  TUserCheckResponseType
} from "../../../shared/utils/types";
import { onError } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { UnauthenticatedStackParamList } from "@/navigation/unauthenticated-navigator/unauthenticated-navigator";

type TForgotPasswordBodyType = {
  email: string;
};

const forgotPasswordSchema = joi.object<TForgotPasswordBodyType>({
  email: joi.string().email().required().messages({
    "string.email": "Invalid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required"
  })
});

const defaultValues: TForgotPasswordBodyType = {
  email: ""
};

const ForgotPasswordScreen = () => {
  const navigation =
    useNavigation<NavigationProp<UnauthenticatedStackParamList>>();
  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting }
  } = useForm<TForgotPasswordBodyType>({
    resolver: joiResolver(forgotPasswordSchema),
    defaultValues: defaultValues
  });
  const onSubmit = useCallback(async (body: TForgotPasswordBodyType) => {
    try {
      const { data } = await getData<TUserCheckResponseType>(
        `/auth?email=${body.email}`
      );
      if (!data?.data?.exists) {
        onError("Email does not exist");
        return;
      }
      navigation.navigate("verification", {
        email: body.email,
        type: EVerificationType.FORGOT_PASSWORD
      });
    } catch (error) {
      const errorMessage = constructErrorMessage(
        error as TApiErrorResponseType,
        "Failed to check if email exists"
      );
      onError(errorMessage);
    }
  }, []);
  return (
    <ContainerComponent isSafeAreaView>
      <KeyboardViewLayout className="flex-1" contentContainerClassName="flex-1">
        <ScrollView
          contentContainerClassName="flex-1 py-20 pt-40 gap-20 px-horizontal"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2 items-center justify-center max-w-[250px] self-center">
            <TextComponent className="font-bold text-2xl">
              Forgot your password?
            </TextComponent>
            <TextComponent className="opacity-60 max-w-sm text-center">
              Confirm your email and we will send the instructions.
            </TextComponent>
          </View>
          <View className="gap-6">
            <Controller
              control={control}
              name="email"
              render={({
                field: { onChange, value, ref },
                fieldState: { error }
              }) => (
                <InputFieldComponent
                  placeholder="Enter your email"
                  inputMode="email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  autoFocus={true}
                  returnKeyType="next"
                  onSubmitEditing={() => {
                    handleSubmit(onSubmit)();
                  }}
                  ref={ref}
                  onChangeText={onChange}
                  value={value}
                  error={error?.message}
                />
              )}
            />
          </View>
          <ButtonComponent
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting || !isValid}
            isLoading={isSubmitting}
          >
            Continue
          </ButtonComponent>
        </ScrollView>
      </KeyboardViewLayout>
    </ContainerComponent>
  );
};

export default memo(ForgotPasswordScreen);

const styles = StyleSheet.create({});
