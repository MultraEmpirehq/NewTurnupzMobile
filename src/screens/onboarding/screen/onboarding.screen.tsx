import React, { memo, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { format } from "date-fns";
import { useDebounce } from "use-debounce";
import AuthTicketLayout from "@/shared/components/auth-ticket/auth-ticket.layout";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import ButtonComponent from "@/shared/components/button/button.component";
import TextComponent from "@/shared/components/text/text.component";
import { getData, patchData, postData } from "@/api";
import { constructErrorMessage } from "@/api/functions";
import { onError, onSuccess } from "@/shared/components/status/toast";
import useUserStore, { TUser, UserGender } from "@/shared/stores/user.store";
import { useOrganiserStore } from "@/shared/stores/organiser.store";
import useUser from "@/shared/hooks/use-user.hook";
import { adultAgeMessage, isAdultBirthDate } from "@/shared/utils/age";
import { COUNTRIES, countryByCode } from "@/shared/utils/countries";
import DateModalComponent from "../components/date-modal/date-modal.component";
import CountryPickerSheet from "../components/country-picker/country-picker.sheet";

const GENDERS: { value: UserGender; label: string }[] = [
  { value: UserGender.MALE, label: "Male" },
  { value: UserGender.FEMALE, label: "Female" },
  { value: UserGender.OTHER, label: "Other" }
];

type TForm = {
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth: Date | null;
  gender: UserGender | null;
  country: string;
  postalCode: string;
  inviteCode: string;
};
type TErrors = Partial<Record<keyof TForm, string>>;

/** What they've given already, e.g. a name from Google; codes stored either way. */
const prefill = (user: TUser | null): TForm => ({
  firstName: user?.firstName ?? "",
  lastName: user?.lastName ?? "",
  username: user?.username ?? "",
  dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth) : null,
  gender: user?.gender ?? null,
  country:
    countryByCode(user?.countryCode ?? user?.country)?.code ??
    COUNTRIES.find((item) => item.name === user?.country)?.code ??
    "",
  postalCode: "",
  inviteCode: ""
});

/** A field's label and its error, styled like the inputs around it. */
const FieldLabel = ({ children }: { children: string }) => (
  <TextComponent className="mb-1.5 text-sm font-medium text-black">{children}</TextComponent>
);
const FieldError = ({ message }: { message?: string }) =>
  message ? <TextComponent className="mt-1 text-xs text-red-500">{message}</TextComponent> : null;

/**
 * The last sign-up step, on one screen like the website's: name, username,
 * birthday, gender and country, plus an optional postcode and invite code.
 * Everything is saved together, then the app opens.
 */
const OnboardingScreen = () => {
  const user = useUserStore((state) => state.userNotVerifiedDetails ?? state.user);
  const setUser = useUserStore((state) => state.setUser);
  const wantsToHost = useOrganiserStore((state) => state.wantsToHost);
  const { getUserDetails } = useUser();
  const [form, setForm] = useState<TForm>(() => prefill(user));
  const [errors, setErrors] = useState<TErrors>({});
  const [saving, setSaving] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);
  const [pickingCountry, setPickingCountry] = useState(false);

  const set = <K extends keyof TForm>(key: K) => (value: TForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  // Is the username free? Their own saved one counts as free.
  const [username] = useDebounce(form.username.trim().toLowerCase(), 500);
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  useEffect(() => {
    if (username.length < 3) {
      setUsernameState("idle");
      return;
    }
    if (username === user?.username?.toLowerCase()) {
      setUsernameState("free");
      return;
    }
    let live = true;
    setUsernameState("checking");
    getData(`/auth/username?username=${encodeURIComponent(username)}`)
      .then(() => live && setUsernameState("free"))
      .catch(() => live && setUsernameState("taken"));
    return () => {
      live = false;
    };
  }, [username, user?.username]);

  // Whose invite code it is, so they can see it's the right one.
  const [inviteCode] = useDebounce(form.inviteCode.trim(), 500);
  const [invite, setInvite] = useState<
    { state: "idle" | "checking" | "bad" } | { state: "ok"; name: string }
  >({ state: "idle" });
  useEffect(() => {
    if (!inviteCode) {
      setInvite({ state: "idle" });
      return;
    }
    let live = true;
    setInvite({ state: "checking" });
    getData<{ name: string }>(`/referrals/code/${encodeURIComponent(inviteCode)}`)
      .then(({ data }) => live && setInvite({ state: "ok", name: data?.data?.name ?? "a friend" }))
      .catch(() => live && setInvite({ state: "bad" }));
    return () => {
      live = false;
    };
  }, [inviteCode]);

  const validate = (): TErrors => {
    const next: TErrors = {};
    if (!form.firstName.trim()) next.firstName = "First name is required";
    if (!form.lastName.trim()) next.lastName = "Last name is required";
    if (form.username.trim().length < 3) next.username = "Pick a username of at least 3 characters";
    else if (usernameState === "taken") next.username = "That username is taken";
    if (!form.dateOfBirth) next.dateOfBirth = "Date of birth is required";
    else if (!isAdultBirthDate(form.dateOfBirth)) next.dateOfBirth = adultAgeMessage;
    if (!form.gender) next.gender = "Choose one";
    if (!form.country) next.country = "Country is required";
    return next;
  };

  const submit = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      onError("Check the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      const { data } = await patchData<Record<string, unknown>, TUser>("/user", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim().toLowerCase(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        country: form.country,
        // Left out when blank: the api checks any postcode it's given.
        ...(form.postalCode.trim() ? { postalCode: form.postalCode.trim() } : {})
      });
      // The invite is a bonus: a code that can't be used doesn't stop sign-up.
      if (form.inviteCode.trim() && invite.state !== "bad") {
        try {
          const applied = await postData<{ code: string }, { invitedBy: string }>(
            "/referrals/apply",
            { code: form.inviteCode.trim() }
          );
          onSuccess(`${applied.data?.data?.invitedBy ?? "Your friend"} invited you`);
        } catch (error) {
          onError(constructErrorMessage(error as TApiErrorResponseType, "We couldn't add that invite code"));
        }
      }
      if (data?.data) setUser(data.data);
      getUserDetails();
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "We couldn't save your details"));
    } finally {
      setSaving(false);
    }
  };

  const country = countryByCode(form.country);

  return (
    <AuthTicketLayout
      eyebrow={wantsToHost ? "Organiser sign-up · Last step" : "Almost there"}
      title="Tell us about you"
      subtitle={
        wantsToHost
          ? "Your own details first. Your business comes next, so you can start selling tickets."
          : "A few details so we can show you events that fit. Takes a minute."
      }
      stubKicker={wantsToHost ? "ALL ACCESS" : undefined}
      stubTitle={wantsToHost ? "Your stage on Turnupz" : undefined}
    >
      <View className="gap-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <InputFieldComponent
              label="First name"
              placeholder="Ada"
              autoComplete="given-name"
              textContentType="givenName"
              value={form.firstName}
              onChangeText={set("firstName")}
              error={errors.firstName}
            />
          </View>
          <View className="flex-1">
            <InputFieldComponent
              label="Last name"
              placeholder="Okafor"
              autoComplete="family-name"
              textContentType="familyName"
              value={form.lastName}
              onChangeText={set("lastName")}
              error={errors.lastName}
            />
          </View>
        </View>

        <View>
          <InputFieldComponent
            label="Username"
            placeholder="ada.okafor"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username-new"
            value={form.username}
            onChangeText={set("username")}
            error={errors.username}
          />
          {!errors.username && usernameState !== "idle" && (
            <TextComponent
              className={`mt-1 text-xs ${
                usernameState === "taken" ? "text-red-500" : usernameState === "free" ? "text-emerald-600" : "text-black/50"
              }`}
            >
              {usernameState === "checking"
                ? "Checking…"
                : usernameState === "free"
                  ? "Available"
                  : "That username is taken"}
            </TextComponent>
          )}
        </View>

        <View>
          <FieldLabel>Date of birth</FieldLabel>
          <Pressable
            onPress={() => setPickingDate(true)}
            accessibilityRole="button"
            className={`h-12 justify-center rounded-xl bg-[#f7f9fc] px-4 ${errors.dateOfBirth ? "border border-red-400" : ""}`}
          >
            <TextComponent className={form.dateOfBirth ? "text-base text-black" : "text-base text-black/40"}>
              {form.dateOfBirth ? format(form.dateOfBirth, "d MMMM yyyy") : "Select your birthday"}
            </TextComponent>
          </Pressable>
          <FieldError message={errors.dateOfBirth} />
        </View>

        <View>
          <FieldLabel>Gender</FieldLabel>
          <View className="flex-row gap-2">
            {GENDERS.map((option) => {
              const selected = form.gender === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => set("gender")(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className={`h-11 flex-1 items-center justify-center rounded-full border ${
                    selected ? "border-[#0577FA] bg-[#0577FA]/10" : "border-black/10 bg-white"
                  }`}
                >
                  <TextComponent className={`text-sm font-semibold ${selected ? "text-[#0577FA]" : "text-black/70"}`}>
                    {option.label}
                  </TextComponent>
                </Pressable>
              );
            })}
          </View>
          <FieldError message={errors.gender} />
        </View>

        <View>
          <FieldLabel>Country</FieldLabel>
          <Pressable
            onPress={() => setPickingCountry(true)}
            accessibilityRole="button"
            className={`h-12 flex-row items-center gap-2 rounded-xl bg-[#f7f9fc] px-4 ${errors.country ? "border border-red-400" : ""}`}
          >
            {country && <TextComponent className="text-lg">{country.flag}</TextComponent>}
            <TextComponent className={country ? "text-base text-black" : "text-base text-black/40"}>
              {country?.name ?? "Select your country"}
            </TextComponent>
          </Pressable>
          <FieldError message={errors.country} />
        </View>

        <InputFieldComponent
          label="Postcode (optional)"
          placeholder="e.g. T2P 1J9"
          autoCapitalize="characters"
          autoComplete="postal-code"
          value={form.postalCode}
          onChangeText={set("postalCode")}
        />

        <View>
          <InputFieldComponent
            label="Invite code (optional)"
            placeholder="A friend's username or a promo code"
            autoCapitalize="none"
            autoCorrect={false}
            value={form.inviteCode}
            onChangeText={set("inviteCode")}
          />
          {invite.state !== "idle" && (
            <TextComponent
              className={`mt-1 text-xs ${
                invite.state === "bad" ? "text-red-500" : invite.state === "ok" ? "text-emerald-600" : "text-black/50"
              }`}
            >
              {invite.state === "checking"
                ? "Checking…"
                : invite.state === "ok"
                  ? `From ${invite.name}. You'll both get Turnupz Credit after your first ticket.`
                  : "That code isn't valid. We'll leave it off."}
            </TextComponent>
          )}
        </View>

        {/* Always tappable: it checks the form and points at what to fix. */}
        <ButtonComponent
          onPress={submit}
          disabled={saving}
          isLoading={saving}
          className="h-12 rounded-full bg-[#00b2ff] py-0"
        >
          Finish sign-up
        </ButtonComponent>
      </View>

      <DateModalComponent
        visible={pickingDate}
        value={form.dateOfBirth}
        onClose={() => setPickingDate(false)}
        onDateSelected={set("dateOfBirth")}
      />
      <CountryPickerSheet
        visible={pickingCountry}
        value={form.country}
        onSelect={(picked) => set("country")(picked.code)}
        onClose={() => setPickingCountry(false)}
      />
    </AuthTicketLayout>
  );
};

export default memo(OnboardingScreen);
