import { ScrollView, StyleSheet, Text, View } from "react-native";
import React, { memo, useCallback } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import KeyboardViewLayout from "@/shared/components/keyboard-view/keyboard-view.layout";
import TextComponent from "@/shared/components/text/text.component";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import ButtonComponent from "@/shared/components/button/button.component";
import { useRoute } from "@react-navigation/native";
import { RouteProp } from "@react-navigation/native";
import { UnauthenticatedStackParamList } from "@/navigation/unauthenticated-navigator/unauthenticated-navigator";
import { PASSWORD_REGEX } from "@/shared/utils/regex";
import joi from "joi";
import { Controller, useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { constructErrorMessage } from "@/api/functions";
import { postData } from "@/api";
import { onSuccess } from "@/shared/components/status/toast";
import { TAuthBodyType, TLoginResponseType } from "../../../shared/utils/types";
import useUserStore from "../../../shared/stores/user.store";
import useApp from "../../../shared/hooks/use-app.hook";
import useAuth from "@/shared/hooks/use-auth.hook";
import CheckPasswordValidityComponent from "@/shared/components/form/password-validity/check-password-validity.component";

type TCreatePasswordBodyType = {
  password: string;
  confirmPassword: string;
};

const createPasswordSchema = joi.object<TCreatePasswordBodyType>({
  password: joi.string().required().pattern(PASSWORD_REGEX).messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
    "string.pattern.base":
      "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  }),
  confirmPassword: joi.string().required().equal(joi.ref("password")).messages({
    "string.empty": "Confirm password is required",
    "any.required": "Confirm password is required",
    "any.only": "Passwords do not match"
  })
});

const defaultValues: TCreatePasswordBodyType = {
  password: "",
  confirmPassword: ""
};

const CreatePasswordScreen = () => {
  const { performAuthVerificationCheck } = useAuth();
  const {
    control,
    watch,
    handleSubmit,
    formState: { isValid, isSubmitting }
  } = useForm<TCreatePasswordBodyType>({
    resolver: joiResolver(createPasswordSchema),
    defaultValues: defaultValues,
    mode: "onChange"
  });
  const { params } =
    useRoute<RouteProp<UnauthenticatedStackParamList, "create-password">>();
  const { token, email } = params || {};
  const { performAuthOperations } = useApp();

  const password = watch("password");

  const onSubmit = useCallback(
    async (body: TCreatePasswordBodyType) => {
      try {
        const { data } = await postData<
          { email: string; token: string; password: string },
          TLoginResponseType
        >("/auth/register/verify", {
          email,
          token,
          password: body?.password || ""
        });
        console.log("data", data?.data?.accessToken);
        performAuthOperations(data?.data?.accessToken, true);
        await performAuthVerificationCheck();
        onSuccess("Password created successfully");
      } catch (error) {
        const errorMessage = constructErrorMessage(
          error as TApiErrorResponseType,
          "Failed to create password"
        );
      }
    },
    [performAuthVerificationCheck]
  );
  return (
    <ContainerComponent isSafeAreaView>
      <KeyboardViewLayout className="flex-1" contentContainerClassName="flex-1">
        <ScrollView
          contentContainerClassName="flex-1 py-20 pt-40 gap-20 px-horizontal"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TextComponent className="font-bold text-center">
            Create Password
          </TextComponent>
          <View className="gap-6">
            <View className="gap-2">
              <Controller
                control={control}
                name="password"
                render={({
                  field: { onChange, value, ref },
                  fieldState: { error }
                }) => (
                  <InputFieldComponent
                    placeholder="Enter your password"
                    secureTextEntry
                    onChangeText={onChange}
                    value={value}
                    error={error?.message}
                    ref={ref}
                  />
                )}
              />
              <CheckPasswordValidityComponent password={password} />
            </View>
            <Controller
              control={control}
              name="confirmPassword"
              render={({
                field: { onChange, value, ref },
                fieldState: { error }
              }) => (
                <InputFieldComponent
                  placeholder="Confirm your password"
                  secureTextEntry
                  onChangeText={onChange}
                  value={value}
                  error={error?.message}
                  ref={ref}
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

export default memo(CreatePasswordScreen);

const styles = StyleSheet.create({});
