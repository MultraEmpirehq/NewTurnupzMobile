import AuthTicketLayout from "@/shared/components/auth-ticket/auth-ticket.layout";
import { StyleSheet, View } from "react-native";
import React, { memo, useCallback } from "react";
import TextComponent from "@/shared/components/text/text.component";
import joi from "joi";
import { Controller, useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import ButtonComponent from "@/shared/components/button/button.component";
import { EVerificationType } from "../../../shared/utils/types";
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
      // Straight on to the code, account or not: saying which would tell
      // anyone whether an email has an account.
      navigation.navigate("verification", {
        email: body.email.trim().toLowerCase(),
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
    <AuthTicketLayout
      eyebrow="Forgot password"
      title="Let's get you back in"
      subtitle="Enter your email and we'll send you a code to reset your password."
      onBack={() => navigation.goBack()}
    >
      <View className="gap-5">
        <Controller
          control={control}
          name="email"
          render={({
            field: { onChange, value, ref },
            fieldState: { error }
          }) => (
            <InputFieldComponent
              label="Email"
              placeholder="name@example.com"
              inputMode="email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              autoFocus
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
        <ButtonComponent
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="h-12 rounded-full bg-[#00b2ff] py-0"
        >
          Send reset code
        </ButtonComponent>
      </View>
    </AuthTicketLayout>
  );
};

export default memo(ForgotPasswordScreen);

const styles = StyleSheet.create({});
