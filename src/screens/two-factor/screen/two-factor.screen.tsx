import AuthTicketLayout from "@/shared/components/auth-ticket/auth-ticket.layout";
import { ActivityIndicator, Pressable, Switch, TextInput, View } from "react-native";
import React, { memo, useCallback, useEffect, useState } from "react";
import NumberKeyboardComponent from "@/shared/components/form/keyboards/number-keyboard.component";
import OtpFormComponent from "@/shared/components/form/otp-form/otp-form.component";
import TextComponent from "@/shared/components/text/text.component";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { UnauthenticatedStackParamList } from "@/navigation/unauthenticated-navigator/unauthenticated-navigator";
import { postData } from "@/api";
import { constructErrorMessage } from "@/api/functions";
import { onError } from "@/shared/components/status/toast";
import useApp from "@/shared/hooks/use-app.hook";
import useAuth from "@/shared/hooks/use-auth.hook";
import { setTrustedDevice } from "@/shared/utils/trusted-device";

type TResponse = { accessToken?: string; trustedDeviceToken?: string };

/**
 * The second step of signing in when two-factor is on: the 6-digit code from
 * their authenticator app, or one of their backup codes. "Trust this phone"
 * skips it here for 30 days.
 */
const TwoFactorScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<UnauthenticatedStackParamList>>();
  const { params } = useRoute<RouteProp<UnauthenticatedStackParamList, "two-factor">>();
  const { performAuthOperations } = useApp();
  const { performAuthVerificationCheck } = useAuth();
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [trust, setTrust] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const verify = useCallback(
    async (value: string) => {
      if (busy) return;
      setBusy(true);
      setError(undefined);
      try {
        const { data } = await postData<
          { challenge: string; code: string; trustDevice: boolean },
          TResponse
        >("/auth/two-factor", { challenge: params.challenge, code: value.trim(), trustDevice: trust });
        setTrustedDevice(data?.data?.trustedDeviceToken);
        const accessToken = data?.data?.accessToken;
        if (!accessToken) throw new Error("No session");
        performAuthOperations(accessToken, true);
        await performAuthVerificationCheck();
      } catch (err) {
        const message = constructErrorMessage(err as TApiErrorResponseType, "That code didn't work.");
        setError(message);
        setCode("");
        onError(message);
        // A spent or expired sign-in can't be retried: back to the start.
        if (/sign in again/i.test(message)) navigation.goBack();
      } finally {
        setBusy(false);
      }
    },
    [busy, params.challenge, trust, performAuthOperations, performAuthVerificationCheck, navigation]
  );

  // Six digits from the app: check straight away, like the emailed code.
  useEffect(() => {
    if (!useBackup && code.length === 6) void verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, useBackup]);

  return (
    <>
      <AuthTicketLayout
        eyebrow="Two-factor sign-in"
        title={useBackup ? "Enter a backup code" : "Enter the code from your app"}
        subtitle={
          useBackup
            ? "One of the codes you saved when you turned this on. Each works once."
            : "Open your authenticator app and type the 6-digit code for Turnupz."
        }
        onBack={() => navigation.goBack()}
        footer={
          useBackup ? undefined : (
            <View className="h-[300px] rounded-3xl bg-white p-3">
              <NumberKeyboardComponent value={code} onChange={setCode} disabled={busy} />
            </View>
          )
        }
      >
        <View className="items-center gap-5">
          {useBackup ? (
            <View className="w-full gap-3">
              <TextInput
                value={code}
                onChangeText={(value) => setCode(value.slice(0, 20))}
                placeholder="xxxxx-xxxxx"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                className="h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-base text-[#0b1d2a]"
                accessibilityLabel="Backup code"
              />
              {error && <TextComponent className="text-sm text-red-600">{error}</TextComponent>}
              <Pressable
                onPress={() => void verify(code)}
                disabled={busy || code.replace(/[^a-z0-9]/gi, "").length < 10}
                accessibilityRole="button"
                className="h-12 items-center justify-center rounded-full bg-[#00b2ff]"
                style={({ pressed }) => ({ opacity: pressed || busy ? 0.7 : 1 })}
              >
                <TextComponent className="font-semibold text-white">Verify and sign in</TextComponent>
              </Pressable>
            </View>
          ) : (
            <OtpFormComponent value={code} totalBoxes={6} error={error} />
          )}

          <View className="w-full flex-row items-center justify-between">
            <TextComponent className="text-white">Trust this phone for 30 days</TextComponent>
            <Switch value={trust} onValueChange={setTrust} accessibilityLabel="Trust this phone for 30 days" />
          </View>

          <Pressable
            onPress={() => {
              setUseBackup((value) => !value);
              setCode("");
              setError(undefined);
            }}
            accessibilityRole="button"
          >
            <TextComponent className="font-semibold text-link">
              {useBackup ? "Use the app instead" : "Use a backup code"}
            </TextComponent>
          </Pressable>
        </View>
      </AuthTicketLayout>
      {busy && (
        <View className="size-full absolute inset-0 bg-black/30 items-center justify-center">
          <ActivityIndicator size="large" color="#00b2ff" />
        </View>
      )}
    </>
  );
};

export default memo(TwoFactorScreen);
