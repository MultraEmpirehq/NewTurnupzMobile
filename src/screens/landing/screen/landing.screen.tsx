import { Pressable, TouchableOpacity, View } from "react-native";
import React, { memo, useCallback, useState } from "react";
import { WEB_APP_URL } from "@env";
import AuthTicketLayout from "@/shared/components/auth-ticket/auth-ticket.layout";
import GoogleSignInButton, {
  isGoogleSignInAvailable
} from "@/shared/components/google-sign-in/google-sign-in-button.component";
import AppleSignInButton from "@/shared/components/apple-sign-in/apple-sign-in-button.component";
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
import { useIntroStore } from "@/shared/stores/intro.store";
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
  // The email field auto-focuses only once the launch intro is out of the way,
  // so the keyboard doesn't come up over it. Keying it on that remounts the
  // field (still empty: the intro covers it) with autoFocus on.
  const introDone = useIntroStore((state) => state.introDone);
  const {
    control,
    handleSubmit,
    getValues,
    resetField,
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
                // The link finishes sign-up on the web, as the web's own does.
                url: `${WEB_APP_URL}/auth/register/{{token}}?email=${body.email}`
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
  // Google lands in the same place as a password login.
  const onGoogleToken = useCallback(
    async (accessToken: string) => {
      performAuthOperations(accessToken, true);
      await performAuthVerificationCheck();
      onSuccess("Login successful");
    },
    [performAuthOperations, performAuthVerificationCheck]
  );
  return (
    <AuthTicketLayout
      eyebrow={canLogin ? "Log in" : "Log in or sign up"}
      title={canLogin ? "Welcome back" : "Let's get you in"}
      subtitle={
        canLogin
          ? "Enter your password to carry on where you left off."
          : "Enter your email. We'll log you in, or send a link to set up your account if you're new."
      }
      footer={
        <TextComponent className="text-center text-xs text-white/55">
          By continuing you agree to the Turnupz Terms of Service and Privacy
          Policy.
        </TextComponent>
      }
    >
      <View className="gap-5">
        {canLogin ? (
          // The email is settled by now, so it shows as a chip that can be changed.
          <View className="flex-row items-center gap-3 rounded-2xl bg-[#f7f9fc] px-4 py-3">
            <TextComponent
              numberOfLines={1}
              className="flex-1 text-base font-medium text-black"
            >
              {getValues("email")?.trim().toLowerCase()}
            </TextComponent>
            <Pressable
              onPress={() => {
                resetField("password");
                setCanLogin(false);
              }}
              accessibilityRole="button"
              hitSlop={8}
            >
              <TextComponent className="text-sm font-bold text-[#0577FA]">
                Change
              </TextComponent>
            </Pressable>
          </View>
        ) : (
          <Controller
            control={control}
            name="email"
            render={({
              field: { onChange, value, ref },
              fieldState: { error }
            }) => (
              <InputFieldComponent
                key={introDone ? "email-ready" : "email-waiting"}
                autoFocus={introDone}
                label="Email"
                placeholder="name@example.com"
                inputMode="email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
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
        )}
        {canLogin && (
          <View className="gap-2">
            <Controller
              control={control}
              name="password"
              render={({
                field: { onChange, value, ref },
                fieldState: { error }
              }) => (
                <InputFieldComponent
                  label="Password"
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  autoCorrect={false}
                  autoFocus
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
            <View className="w-full flex-row items-center justify-end">
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate("forgot-password");
                }}
              >
                <TextComponent className="text-sm font-medium text-black/60">
                  Forgot password?
                </TextComponent>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <ButtonComponent
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || !isValid}
          isLoading={isSubmitting}
          className="h-12 rounded-full bg-[#00b2ff] py-0"
        >
          {canLogin ? "Log in" : "Continue with email"}
        </ButtonComponent>
        <View className="flex-row items-center gap-3">
          <View className="h-[1px] flex-1 bg-black/10" />
          <TextComponent className="text-xs text-black/40">OR</TextComponent>
          <View className="h-[1px] flex-1 bg-black/10" />
        </View>
        <View className="gap-3">
          {isGoogleSignInAvailable && (
            <GoogleSignInButton
              onToken={onGoogleToken}
              onError={onError}
              disabled={isSubmitting}
            />
          )}
          <AppleSignInButton disabled={isSubmitting} />
        </View>
      </View>
    </AuthTicketLayout>
  );
};

export default memo(LandingScreen);
