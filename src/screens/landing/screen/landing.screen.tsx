import { Pressable, TouchableOpacity, View } from "react-native";
import React, { memo, useCallback, useState } from "react";
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
import { postData } from "@/api";
import { useIntroStore } from "@/shared/stores/intro.store";
import { usePermissionsIntroStore } from "@/shared/stores/permissions-intro.store";
import useApp from "@/shared/hooks/use-app.hook";
import { onError } from "@/shared/components/status/toast";
import { EVerificationType, TLoginResponseType } from "@/shared/utils/types";
import { constructErrorMessage } from "@/api/functions";
import { Controller } from "react-hook-form";
import { TAuthBodyType } from "../../../shared/utils/types";
import useAuth from "../../../shared/hooks/use-auth.hook";
import { useOrganiserStore } from "@/shared/stores/organiser.store";

type TIntent = "attendee" | "organiser";
type TMode = "login" | "signup";

// Same account either way; the side only changes the words and, for
// organisers, where the app goes once they're in (see the home screen).
const COPY: Record<TIntent, { eyebrow: string; title: Record<TMode, string>; subtitle: Record<TMode, string> }> = {
  attendee: {
    eyebrow: "Welcome to Turnupz",
    title: { login: "Welcome back", signup: "Create your account" },
    subtitle: {
      login: "",
      signup: "Enter your email and we'll send you a code to get started."
    }
  },
  organiser: {
    eyebrow: "For organisers",
    title: { login: "Organiser log in", signup: "Host on Turnupz" },
    subtitle: {
      login: "",
      signup:
        "Enter your email and we'll send you a code. Then tell us about your business and start selling tickets."
    }
  }
};

// The website's words, so both doors read the same everywhere.
const OTHER_DOOR: Record<TIntent, { prompt: string; label: string; to: TIntent }> = {
  attendee: { prompt: "Hosting events?", label: "Organiser sign-in", to: "organiser" },
  organiser: { prompt: "Just going to events?", label: "Attendee sign-in", to: "attendee" }
};

const emailRule = joi.string().email({ tlds: false }).required().messages({
  "string.email": "Enter a valid email address",
  "string.empty": "Email is required",
  "any.required": "Email is required"
});

const loginSchema = joi.object({
  email: emailRule,
  password: joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required"
  })
});

const signupSchema = joi.object({ email: emailRule }).unknown(true);

const LandingScreen = () => {
  const navigation =
    useNavigation<NavigationProp<UnauthenticatedStackParamList>>();
  const [intent, setIntent] = useState<TIntent>("attendee");
  const [mode, setMode] = useState<TMode>("login");
  const [sendingCode, setSendingCode] = useState(false);
  const copy = COPY[intent];
  const setWantsToHost = useOrganiserStore((state) => state.setWantsToHost);
  const { performAuthOperations } = useApp();
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
    trigger,
    resetField,
    formState: { isSubmitting }
  } = useForm<TAuthBodyType>({
    defaultValues: { email: "", password: undefined },
    resolver: joiResolver(mode === "login" ? loginSchema : signupSchema)
  });

  const failed = (error: unknown, fallback: string) =>
    onError(constructErrorMessage(error as TApiErrorResponseType, fallback));

  // The answer is the same whether or not the email has an account, so the
  // next screen says the same too.
  const sendCode = useCallback(
    async (purpose: TMode, email: string) => {
      const { data } = await postData<{ email: string }, { token: string; expiresAt: string }>(
        purpose === "login" ? "/auth/login/code/start" : "/auth/signup/start",
        { email }
      );
      const token = data?.data?.token;
      if (!token) throw new Error("No code was sent");
      navigation.navigate("verification", {
        email,
        token,
        type: purpose === "login" ? EVerificationType.LOGIN : EVerificationType.ACCOUNT_CREATION
      });
    },
    [navigation]
  );

  const onSubmit = useCallback(
    async (formBody: TAuthBodyType) => {
      // One spelling per address, as on the web, so capitals can't split an account.
      const email = formBody.email.trim().toLowerCase();
      // Kept (it's saved) through any sign-up steps, until home acts on it.
      setWantsToHost(intent === "organiser");
      try {
        if (mode === "signup") {
          await sendCode("signup", email);
          return;
        }
        const { data } = await postData<TAuthBodyType, TLoginResponseType>("/auth/login", {
          email,
          password: formBody.password
        });
        performAuthOperations(data?.data?.accessToken, true);
        await performAuthVerificationCheck();
      } catch (error) {
        failed(error, mode === "signup" ? "We couldn't send a code. Try again." : "We couldn't log you in. Try again.");
      }
    },
    [mode, intent, setWantsToHost, sendCode, performAuthOperations, performAuthVerificationCheck]
  );

  const codeInstead = useCallback(async () => {
    if (!(await trigger("email"))) return;
    setWantsToHost(intent === "organiser");
    setSendingCode(true);
    try {
      await sendCode("login", getValues("email").trim().toLowerCase());
    } catch (error) {
      failed(error, "We couldn't send a code. Try again.");
    } finally {
      setSendingCode(false);
    }
  }, [trigger, getValues, intent, setWantsToHost, sendCode]);

  // Google lands in the same place as a password login.
  const onGoogleToken = useCallback(
    async (accessToken: string) => {
      setWantsToHost(intent === "organiser");
      performAuthOperations(accessToken, true);
      await performAuthVerificationCheck();
    },
    [intent, setWantsToHost, performAuthOperations, performAuthVerificationCheck]
  );

  const busy = isSubmitting || sendingCode;

  return (
    <AuthTicketLayout
      eyebrow={copy.eyebrow}
      title={copy.title[mode]}
      subtitle={copy.subtitle[mode] || undefined}
      stubKicker={intent === "organiser" ? "ALL ACCESS" : undefined}
      stubTitle={intent === "organiser" ? "Your stage on Turnupz" : undefined}
      footer={
        // Kept off the card so the form stays short.
        <View className="items-center gap-2">
          <View className="flex-row flex-wrap items-center justify-center gap-1">
            <TextComponent className="text-sm text-white/65">{OTHER_DOOR[intent].prompt}</TextComponent>
            <TouchableOpacity
              onPress={() => {
                const next = OTHER_DOOR[intent].to;
                setIntent(next);
                // Organisers mostly come to start hosting.
                setMode(next === "organiser" ? "signup" : "login");
              }}
              accessibilityRole="button"
              hitSlop={8}
            >
              <TextComponent className="text-sm font-bold text-white">{OTHER_DOOR[intent].label}</TextComponent>
            </TouchableOpacity>
          </View>
          <TextComponent className="text-center text-xs text-white/45">
            By continuing you agree to the Terms and Privacy Policy.
          </TextComponent>
        </View>
      }
    >
      <View className="gap-5">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
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
              returnKeyType={mode === "login" ? "next" : "done"}
              onSubmitEditing={() => {
                if (mode === "signup") handleSubmit(onSubmit)();
              }}
              ref={ref}
              onChangeText={onChange}
              value={value}
              error={error?.message}
            />
          )}
        />
        {mode === "login" && (
          <View className="gap-2">
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, ref }, fieldState: { error } }) => (
                <InputFieldComponent
                  label="Password"
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    handleSubmit(onSubmit)();
                  }}
                  ref={ref}
                  onChangeText={onChange}
                  value={value ?? ""}
                  error={error?.message}
                />
              )}
            />
            <TouchableOpacity
              onPress={() => navigation.navigate("forgot-password")}
              hitSlop={8}
              accessibilityRole="button"
              className="self-end"
            >
              <TextComponent className="text-sm font-medium text-black/60">Forgot password?</TextComponent>
            </TouchableOpacity>
          </View>
        )}
        {/* Always tappable: a wrong or missing entry shows its message under
            the field, rather than leaving a greyed-out button. */}
        <ButtonComponent
          onPress={handleSubmit(onSubmit)}
          disabled={busy}
          isLoading={busy}
          className="h-12 rounded-full bg-[#00b2ff] py-0"
        >
          {mode === "login" ? "Log in" : "Email me a code"}
        </ButtonComponent>
        <View className="flex-row items-center gap-3">
          <View className="h-[1px] flex-1 bg-black/10" />
          <TextComponent className="text-xs text-black/40">OR</TextComponent>
          <View className="h-[1px] flex-1 bg-black/10" />
        </View>
        <View className="gap-3">
          {isGoogleSignInAvailable && (
            <GoogleSignInButton onToken={onGoogleToken} onError={onError} disabled={busy} />
          )}
          {mode === "login" && (
            <Pressable
              onPress={() => void codeInstead()}
              disabled={busy}
              accessibilityRole="button"
              className="h-12 flex-row items-center justify-center gap-3 rounded-full border border-black/15 bg-white"
              style={({ pressed }) => ({ opacity: pressed || busy ? 0.6 : 1 })}
            >
              <TextComponent className="text-base font-medium text-black">Email me a sign-in code</TextComponent>
            </Pressable>
          )}
        </View>
        {/* Log in and create account are separate screens, so neither one
            says whether an email already has an account. */}
        <View className="flex-row flex-wrap items-center justify-center gap-1">
          <TextComponent className="text-sm text-black/60">
            {mode === "login" ? "New to Turnupz?" : "Already have an account?"}
          </TextComponent>
          <TouchableOpacity
            onPress={() => {
              setMode(mode === "login" ? "signup" : "login");
              resetField("password");
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <TextComponent className="text-sm font-bold text-[#007db3]">
              {mode === "login" ? "Create an account" : "Log in"}
            </TextComponent>
          </TouchableOpacity>
        </View>
      </View>
    </AuthTicketLayout>
  );
};

export default memo(LandingScreen);
