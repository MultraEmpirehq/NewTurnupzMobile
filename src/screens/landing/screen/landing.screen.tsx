import { Pressable, TouchableOpacity, View } from "react-native";
import React, { memo, useCallback, useState } from "react";
import { WEB_APP_URL } from "@env";
import AuthTicketLayout from "@/shared/components/auth-ticket/auth-ticket.layout";
import GoogleSignInButton, {
  isGoogleSignInAvailable
} from "@/shared/components/google-sign-in/google-sign-in-button.component";
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
import { usePermissionsIntroStore } from "@/shared/stores/permissions-intro.store";
import useApp from "@/shared/hooks/use-app.hook";
import { onError } from "@/shared/components/status/toast";
import {
  EVerificationType,
  TLoginResponseType,
  TUserCheckResponseType
} from "@/shared/utils/types";
import { constructErrorMessage } from "@/api/functions";
import { Controller } from "react-hook-form";
import { TAuthBodyType } from "../../../shared/utils/types";
import useAuth from "../../../shared/hooks/use-auth.hook";
import { useOrganiserStore } from "@/shared/stores/organiser.store";

type TIntent = "attendee" | "organiser";

// Same account either way; the side only changes the words and, for
// organisers, where the app goes once they're in (see the home screen).
const COPY: Record<TIntent, { eyebrow: string; title: string; subtitle: string }> = {
  attendee: {
    eyebrow: "Log in or sign up",
    title: "Let's get you in",
    subtitle:
      "Enter your email. We'll log you in, or send a link to set up your account if you're new."
  },
  organiser: {
    eyebrow: "For organisers",
    title: "Host on Turnupz",
    subtitle:
      "Enter your email. We'll log you in, or send a link to set up your account. Then tell us about your business and start selling tickets."
  }
};

// The website's words, so both doors read the same everywhere.
const OTHER_DOOR: Record<TIntent, { prompt: string; label: string; to: TIntent }> = {
  attendee: { prompt: "Hosting events?", label: "Organiser sign-in", to: "organiser" },
  organiser: { prompt: "Just going to events?", label: "Attendee sign-in", to: "attendee" }
};

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
  const [intent, setIntent] = useState<TIntent>("attendee");
  const copy = COPY[intent];
  const setWantsToHost = useOrganiserStore((state) => state.setWantsToHost);
  const { performAuthOperations } = useApp();
  const setUserDetails = useUserStore((state) => state.setUser);
  const { performAuthVerificationCheck } = useAuth();
  // The email field auto-focuses only once the launch intro is out of the way,
  // so the keyboard doesn't come up over it. Keying it on that remounts the
  // field (still empty: the intro covers it) with autoFocus on.
  // The one-time permissions step comes after the intro, so it waits for that too.
  const introPlayed = useIntroStore((state) => state.introDone);
  const permissionsSeen = usePermissionsIntroStore((state) => state.seen);
  const introDone = introPlayed && permissionsSeen;
  const {
    control,
    handleSubmit,
    getValues,
    resetField,
    formState: { isSubmitting }
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
      // Kept (it's saved) through any sign-up steps, until home acts on it.
      setWantsToHost(intent === "organiser");
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
                // Required by the api, but the app's sign-up uses a code
                // instead (sent on the next screen), so no link is emailed.
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
      } catch (error) {
        const errorMessage = constructErrorMessage(
          error as TApiErrorResponseType,
          "Failed to login"
        );
        onError(errorMessage);
      }
    },
    [canLogin, intent, setWantsToHost, performAuthOperations, performAuthVerificationCheck]
  );
  // Google lands in the same place as a password login.
  const onGoogleToken = useCallback(
    async (accessToken: string) => {
      setWantsToHost(intent === "organiser");
      performAuthOperations(accessToken, true);
      await performAuthVerificationCheck();
    },
    [intent, setWantsToHost, performAuthOperations, performAuthVerificationCheck]
  );
  return (
    <AuthTicketLayout
      eyebrow={
        canLogin
          ? intent === "organiser"
            ? "Organiser log in"
            : "Log in"
          : copy.eyebrow
      }
      title={canLogin ? "Welcome back" : copy.title}
      subtitle={
        canLogin
          ? "Enter your password to carry on where you left off."
          : copy.subtitle
      }
      stubKicker={intent === "organiser" ? "ALL ACCESS" : undefined}
      stubTitle={intent === "organiser" ? "Your stage on Turnupz" : undefined}
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
        {/* Always tappable: a wrong or missing entry shows its message under
            the field, rather than leaving a greyed-out button. */}
        <ButtonComponent
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
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
        </View>
        {/* The other door: same account, it only changes where they start. */}
        <View className="flex-row flex-wrap items-center justify-center gap-1">
          <TextComponent className="text-sm text-black/60">{OTHER_DOOR[intent].prompt}</TextComponent>
          <TouchableOpacity
            onPress={() => setIntent(OTHER_DOOR[intent].to)}
            accessibilityRole="button"
            hitSlop={8}
          >
            <TextComponent className="text-sm font-bold text-[#007db3]">{OTHER_DOOR[intent].label}</TextComponent>
          </TouchableOpacity>
        </View>
      </View>
    </AuthTicketLayout>
  );
};

export default memo(LandingScreen);
