import { isTwoFactorChallenge } from "@/shared/utils/trusted-device";
import AuthTicketLayout from "@/shared/components/auth-ticket/auth-ticket.layout";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import React, { memo, useCallback, useEffect, useState } from "react";
import NumberKeyboardComponent from "@/shared/components/form/keyboards/number-keyboard.component";
import OtpFormComponent from "@/shared/components/form/otp-form/otp-form.component";
import OtpCountdownComponent from "@/shared/components/otp-countdown/otp-countdown.component";
import TextComponent from "@/shared/components/text/text.component";
import {
  NavigationProp,
  useIsFocused,
  useNavigation,
  useRoute
} from "@react-navigation/native";
import { UnauthenticatedStackParamList } from "@/navigation/unauthenticated-navigator/unauthenticated-navigator";
import { RouteProp } from "@react-navigation/native";
import { postData } from "@/api";
import { onError } from "@/shared/components/status/toast";
import { constructErrorMessage } from "@/api/functions";
import { EVerificationType, TLoginResponseType } from "@/shared/utils/types";
import useApp from "@/shared/hooks/use-app.hook";
import useAuth from "@/shared/hooks/use-auth.hook";

/** Where each kind of code is asked for again. */
const RESEND_PATH: Partial<Record<EVerificationType, string>> = {
  [EVerificationType.LOGIN]: "/auth/login/code/start",
  [EVerificationType.ACCOUNT_CREATION]: "/auth/signup/start"
};

// Never says whether the email has an account: the server doesn't either.
const subtitleFor = (type: EVerificationType | undefined, who: string) =>
  type === EVerificationType.ACCOUNT_CREATION
    ? `We've sent a 6-digit code to ${who}. If it already has an account, we've emailed it instead.`
    : type === EVerificationType.LOGIN || type === EVerificationType.FORGOT_PASSWORD
      ? `If ${who} has a Turnupz account, we've sent it a 6-digit code.`
      : `We sent a 6-digit code to ${who}.`;

const VerificationScreen = () => {
  const navigation =
    useNavigation<NavigationProp<UnauthenticatedStackParamList>>();
  const { params } =
    useRoute<RouteProp<UnauthenticatedStackParamList, "verification">>();
  const { email, phoneNumber, type } = params || {};
  const { performAuthOperations } = useApp();
  const { performAuthVerificationCheck } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | undefined>(undefined);
  const [timer, setTimer] = useState(0);
  const [otp, setOtp] = useState("");
  // The sign-in screen may have sent the code already.
  const [token, setToken] = useState<string | undefined>(params?.token);
  const isFocused = useIsFocused();

  const sendOTP = useCallback(async () => {
    if (!type) {
      onError("Verification type is required");
      return;
    }
    if (!email && !phoneNumber) {
      onError("Email or phone number is required");
      return;
    }
    if (email) {
      if (!email.includes("@")) {
        onError("Invalid email");
        return;
      }
    }
    if (phoneNumber) {
      if (!phoneNumber.startsWith("+")) {
        onError("Invalid phone number");
        return;
      }
    }
    setIsLoading(true);
    setOtpError(undefined);
    setOtp("");
    try {
      const path = RESEND_PATH[type] ?? "/auth/otp/send";
      const payload = path === "/auth/otp/send" ? { otpType: type, email } : { email };
      const { data } = await postData<
        typeof payload,
        { token: string; expiresAt: Date }
      >(path, payload);
      const token = data?.data?.token;
      if (!token) {
        onError("Failed to send OTP");
        return;
      }
      setToken(data?.data?.token || undefined);
    } catch (error) {
      const errorMessage = constructErrorMessage(
        error as TApiErrorResponseType,
        "We couldn't send a code. Try again."
      );
      onError(errorMessage);
      setOtpError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [type, email, phoneNumber]);

  const verifyOTP = useCallback(async () => {
    if (!token) {
      onError("Token is required");
      return;
    }
    if (!otp) {
      onError("OTP is required");
      return;
    }
    setIsLoading(true);
    try {
      if (type === EVerificationType.LOGIN) {
        const { data } = await postData<{ token: string; otp: string }, TLoginResponseType>(
          "/auth/login/code",
          { token, otp }
        );
        if (isTwoFactorChallenge(data?.data)) {
          navigation.navigate("two-factor", { challenge: data.data.challenge });
          return;
        }
        performAuthOperations(data?.data?.accessToken, true);
        await performAuthVerificationCheck();
        return;
      }
      const payload = {
        token,
        otp,
        otpType: type
      };
      const { data } = await postData<
        typeof payload,
        { message: string; token: string; expiresAt: Date }
      >("/auth/otp/verify", payload);
      const newToken = data?.data?.token;
      if (type === EVerificationType.ACCOUNT_CREATION) {
        navigation.navigate("create-password", {
          token: newToken,
          email: email || ""
        });
        return;
      }
      if (type === EVerificationType.FORGOT_PASSWORD) {
        navigation.navigate("reset-password", { token: newToken });
        return;
      }
      navigation.navigate("landing");
    } catch (error) {
      const errorMessage = constructErrorMessage(
        error as TApiErrorResponseType,
        "That code didn't work. Check it, or ask for a new one."
      );
      setOtpError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
      setOtp("");
    }
  }, [token, otp, type, navigation, performAuthOperations, performAuthVerificationCheck]);

  useEffect(() => {
    if (isFocused && !token) {
      sendOTP();
    }
  }, [token, isFocused, type, email, phoneNumber]);

  useEffect(() => {
    if (otp.length === 6) {
      verifyOTP();
    }
  }, [otp]);
  return (
    <>
      <AuthTicketLayout
        eyebrow="Verify it's you"
        title="Enter your code"
        subtitle={subtitleFor(type, email ?? phoneNumber ?? "you")}
        onBack={() => navigation.goBack()}
        footer={
          // The keypad sits on its own card so it reads on the night sky.
          <View className="h-[300px] rounded-3xl bg-white p-3">
            <NumberKeyboardComponent
              value={otp}
              onChange={setOtp}
              disabled={isLoading || !isFocused || !token}
            />
          </View>
        }
      >
        <View className="items-center gap-5">
          <OtpFormComponent value={otp} totalBoxes={6} error={otpError} />
          <OtpCountdownComponent
            expiryTime={timer}
            loading={isLoading}
            resendOTP={sendOTP}
          />
        </View>
      </AuthTicketLayout>
      {isLoading && (
        <View className="size-full absolute inset-0 bg-black/30 items-center justify-center">
          <ActivityIndicator size="large" color="#00b2ff" />
        </View>
      )}
    </>
  );
};

export default memo(VerificationScreen);

const styles = StyleSheet.create({});
