import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import React, { memo, useCallback, useState } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import KeyboardViewLayout from "@/shared/components/keyboard-view/keyboard-view.layout";
import TextComponent from "@/shared/components/text/text.component";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import ButtonComponent from "@/shared/components/button/button.component";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { UnauthenticatedStackParamList } from "@/navigation/unauthenticated-navigator/unauthenticated-navigator";
import { useForm } from "react-hook-form";
import joi from "joi";
import { joiResolver } from "@hookform/resolvers/joi";
import { getData, postData } from "@/api";
import useUserStore, { TUser } from "@/shared/stores/user.store";
import useApp from "@/shared/hooks/use-app.hook";
import { onError, onSuccess } from "@/shared/components/status/toast";
import {
  EVerificationType,
  TLoginResponseType,
  TUserCheckResponseType
} from "@/shared/utils/types";
import { constructErrorMessage } from "@/api/functions";
import { Controller } from "react-hook-form";
import { TAuthBodyType } from "../../../shared/utils/types";
import useAuth from "../../../shared/hooks/use-auth.hook";

const checkIfEmailExistsSchema = joi.object({
  email: joi.string().email().required().messages({
    "string.email": "Invalid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required"
  })
});

const checkIfEmailExistsDefaultValues: TAuthBodyType = {
  email: ""
};

const authDefaultValues: TAuthBodyType = {
  email: "",
  password: undefined
};

const authSchema = joi.object({
  email: joi.string().email().required().messages({
    "string.email": "Invalid email address",
    "string.empty": "Email is required",
    "any.required": "Email is required"
  }),
  password: joi.string().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required"
  })
});

const LandingScreen = () => {
  const navigation =
    useNavigation<NavigationProp<UnauthenticatedStackParamList>>();
  const [canLogin, setCanLogin] = useState(false);
  const { performAuthOperations } = useApp();
  const setUserDetails = useUserStore((state) => state.setUser);
  const { performAuthVerificationCheck } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting }
  } = useForm<TAuthBodyType>({
    defaultValues: canLogin
      ? authDefaultValues
      : checkIfEmailExistsDefaultValues,
    resolver: joiResolver(canLogin ? authSchema : checkIfEmailExistsSchema)
  });
  const onSubmit = useCallback(
    async (formBody: TAuthBodyType) => {
      // One spelling per address, as on the web, so capitals can't split an account.
      const body = { ...formBody, email: formBody.email.trim().toLowerCase() };
      try {
        if (!canLogin) {
          const { data } = await getData<TUserCheckResponseType>(
            `/auth?email=${body.email}`
          );
          if (!data?.data?.exists) {
            await postData<{ email: string; url: string }, string>(
              "/auth/register",
              {
                email: body.email,
                url: "http://localhost:3333/{{token}}"
              }
            );
            navigation.navigate("verification", {
              email: body.email,
              type: EVerificationType.ACCOUNT_CREATION
            });
            return;
          }
          if (data?.data?.shouldRequestPassword) {
            navigation.navigate("verification", {
              email: body.email,
              type: EVerificationType.ACCOUNT_CREATION
            });
            return;
          }
          if (data?.data?.isAccountDisabled) {
            onError("Account is disabled! Please contact support to activate");
            return;
          }

          if (!data?.data?.isEmailVerified) {
            navigation.navigate("verification", {
              email: body.email,
              type: EVerificationType.EMAIL_VERIFICATION
            });
            return;
          }
          return setCanLogin(true);
        }
        const { data } = await postData<TAuthBodyType, TLoginResponseType>(
          "/auth/login",
          body
        );
        performAuthOperations(data?.data?.accessToken, true);
        await performAuthVerificationCheck();
        onSuccess("Login successful");
      } catch (error) {
        const errorMessage = constructErrorMessage(
          error as TApiErrorResponseType,
          "Failed to login"
        );
        onError(errorMessage);
      }
    },
    [canLogin, performAuthOperations, performAuthVerificationCheck]
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
          <View className="gap-2 items-center justify-center max-w-[250px] self-center">
            <TextComponent className="font-bold text-2xl">
              Welcome
            </TextComponent>
            <TextComponent className="opacity-60 max-w-sm text-center">
              Enter your email to signup if you are new here or login if you are
              already a member
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
                  placeholder="E.G example@gmail.com"
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
            {canLogin && (
              <>
                <Controller
                  control={control}
                  name="password"
                  render={({
                    field: { onChange, value, ref },
                    fieldState: { error }
                  }) => (
                    <InputFieldComponent
                      placeholder="********"
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                      autoCorrect={false}
                      autoFocus={false}
                      returnKeyType="done"
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
                <View className="w-full justify-end flex-row items-center">
                  <TouchableOpacity
                    onPress={() => {
                      navigation.navigate("forgot-password");
                    }}
                  >
                    <TextComponent className="text-primary">
                      Forgot password?
                    </TextComponent>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <ButtonComponent
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting || !isValid}
              isLoading={isSubmitting}
            >
              Continue
            </ButtonComponent>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 h-[1px] bg-black/20" />
              <TextComponent className="opacity-60">OR</TextComponent>
              <View className="flex-1 h-[1px] bg-black/20" />
            </View>
          </View>
        </ScrollView>
      </KeyboardViewLayout>
    </ContainerComponent>
  );
};

export default memo(LandingScreen);
