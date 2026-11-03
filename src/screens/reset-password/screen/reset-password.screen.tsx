import AuthTicketLayout from "@/shared/components/auth-ticket/auth-ticket.layout";
import { View } from "react-native";
import React, { memo, useCallback } from "react";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import ButtonComponent from "@/shared/components/button/button.component";
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { UnauthenticatedStackParamList } from "@/navigation/unauthenticated-navigator/unauthenticated-navigator";
import { PASSWORD_REGEX } from "@/shared/utils/regex";
import joi from "joi";
import { Controller, useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import { constructErrorMessage } from "@/api/functions";
import { postData } from "@/api";
import { onError, onSuccess } from "@/shared/components/status/toast";
import CheckPasswordValidityComponent from "@/shared/components/form/password-validity/check-password-validity.component";

type TResetPasswordBodyType = {
  password: string;
  confirmPassword: string;
};

const resetPasswordSchema = joi.object<TResetPasswordBodyType>({
  password: joi.string().required().pattern(PASSWORD_REGEX).messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
    "string.pattern.base":
      "Use 8 or more characters with upper and lower case letters, a number and a symbol"
  }),
  confirmPassword: joi.string().required().equal(joi.ref("password")).messages({
    "string.empty": "Confirm your new password",
    "any.required": "Confirm your new password",
    "any.only": "Passwords don't match"
  })
});

/**
 * The last step of a forgotten password: the code checked out (on the
 * verification screen), so they pick a new one, then log in with it.
 */
const ResetPasswordScreen = () => {
  const navigation =
    useNavigation<NavigationProp<UnauthenticatedStackParamList>>();
  const { params } =
    useRoute<RouteProp<UnauthenticatedStackParamList, "reset-password">>();
  const token = params?.token;
  const {
    control,
    watch,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<TResetPasswordBodyType>({
    resolver: joiResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange"
  });
  const password = watch("password");

  const onSubmit = useCallback(
    async (body: TResetPasswordBodyType) => {
      if (!token) {
        onError("This reset has expired. Start again for a new code.");
        navigation.navigate("forgot-password");
        return;
      }
      try {
        await postData<{ token: string; password: string }, unknown>(
          "/auth/password/change",
          { token, password: body.password }
        );
        onSuccess("Password changed. Log in with your new password.");
        navigation.reset({ index: 0, routes: [{ name: "landing" }] });
      } catch (error) {
        onError(
          constructErrorMessage(
            error as TApiErrorResponseType,
            "We couldn't change your password. Start again for a new code."
          )
        );
      }
    },
    [token, navigation]
  );

  return (
    <AuthTicketLayout
      eyebrow="Reset password"
      title="Choose a new password"
      subtitle="You'll use it with your email to log in from now on."
      onBack={() => navigation.goBack()}
    >
      <View className="gap-5">
        <View className="gap-2">
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
              <InputFieldComponent
                label="New password"
                placeholder="Enter a new password"
                secureTextEntry
                autoFocus
                autoComplete="new-password"
                textContentType="newPassword"
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
          render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
            <InputFieldComponent
              label="Confirm new password"
              placeholder="Enter it again"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              onChangeText={onChange}
              value={value}
              error={error?.message}
              ref={ref}
            />
          )}
        />
        <ButtonComponent
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="h-12 rounded-full bg-[#00b2ff] py-0"
        >
          Save new password
        </ButtonComponent>
      </View>
    </AuthTicketLayout>
  );
};

export default memo(ResetPasswordScreen);
