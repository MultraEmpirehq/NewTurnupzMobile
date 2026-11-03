import React, { memo, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import TextComponent from "@/shared/components/text/text.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import SelectFieldComponent from "@/shared/components/form/select-field/select-field.component";
import DateModalComponent from "@/screens/onboarding/components/date-modal/date-modal.component";
import { TUser, UserGender } from "@/shared/stores/user.store";
import { getData } from "@/api";
import { constructErrorMessage } from "@/api/functions";
import { BRAND } from "@/shared/utils/brand-colors";
import { Field, PrimaryButton } from "./profile-settings.screen";
import { TProfileUpdate, updateProfile } from "./profile-api";

/**
 * Your details on the Edit profile page: what others see (names, username, bio,
 * website), then private details only you see (phone, date of birth, gender,
 * email). Save only shows once something has changed, and the page is told so it
 * can ask before throwing changes away.
 */

const GENDERS = [
  { label: "Male", value: UserGender.MALE },
  { label: "Female", value: UserGender.FEMALE },
  { label: "Other", value: UserGender.OTHER }
];

type TForm = {
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth: string; // yyyy-mm-dd, or ""
  gender: string;
  bio: string;
  website: string;
  phone: string;
};

const fromUser = (user: TUser): TForm => ({
  firstName: user.firstName ?? "",
  lastName: user.lastName ?? "",
  username: user.username ?? "",
  dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : "",
  gender: user.gender ?? "",
  bio: user.bio ?? "",
  website: user.website ?? "",
  phone: user.phone ?? ""
});

const ProfileInfoForm = ({
  user,
  onDirtyChange,
  onSaved
}: {
  user: TUser;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved?: () => void;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TForm>(() => fromUser(user));
  const [saved, setSaved] = useState<TForm>(() => fromUser(user));
  const [saving, setSaving] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [username] = useDebounce(form.username.trim().toLowerCase(), 500);

  // Fresh details from the api (another device, a refresh) replace an untouched form.
  useEffect(() => {
    const next = fromUser(user);
    setSaved(next);
    setForm((current) => (JSON.stringify(current) === JSON.stringify(saved) ? next : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Is the username free? Only asked when it changes from yours.
  useEffect(() => {
    if (!username || username === user.username) {
      setUsernameState("idle");
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
  }, [username, user.username]);

  const set = (key: keyof TForm) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const changedKeys = (Object.keys(form) as (keyof TForm)[]).filter(
    (key) => form[key].trim() !== saved[key].trim()
  );
  const isDirty = changedKeys.length > 0;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "First name is required";
    if (!form.lastName.trim()) next.lastName = "Last name is required";
    if (!/^[a-z0-9._]{3,30}$/i.test(form.username.trim())) {
      next.username = "3 to 30 letters, numbers, dots or underscores";
    }
    if (usernameState === "taken") next.username = "That username is taken";
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    // Only what changed goes up; cleared bio, website or phone go up empty.
    const body: TProfileUpdate = {};
    for (const key of changedKeys) {
      const value = form[key].trim();
      if (key === "username") body.username = value.toLowerCase();
      else if (key === "gender") body.gender = value as UserGender;
      else if (key === "dateOfBirth") {
        if (value) body.dateOfBirth = value;
      } else body[key] = value;
    }
    setSaving(true);
    try {
      await updateProfile(body);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setSaved(form);
      onSuccess("Profile updated");
      onSaved?.();
    } catch (error) {
      const api = (error as TApiErrorResponseType)?.response?.data as
        | { errors?: Record<string, string> }
        | undefined;
      if (api?.errors) setErrors(api.errors);
      onError(constructErrorMessage(error as TApiErrorResponseType, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-6">
      <View className="gap-4">
        <TextComponent className="px-1 text-xs font-bold text-zinc-500">About you</TextComponent>
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Field label="First Name" value={form.firstName} onChange={set("firstName")} error={errors.firstName} autoCapitalize="words" />
          </View>
          <View className="flex-1">
            <Field label="Last Name" value={form.lastName} onChange={set("lastName")} error={errors.lastName} autoCapitalize="words" />
          </View>
        </View>
        <Field
          label="Username"
          value={form.username}
          onChange={set("username")}
          autoCapitalize="none"
          error={errors.username || (usernameState === "taken" ? "That username is taken" : undefined)}
          note={usernameState === "checking" ? "Checking…" : usernameState === "free" ? "Available" : undefined}
        />
        <Field label="Bio" value={form.bio} onChange={set("bio")} multiline maxLength={160} error={errors.bio} placeholder="A line about you" />
        <Field
          label="Website"
          value={form.website}
          onChange={set("website")}
          keyboard="url"
          autoCapitalize="none"
          error={errors.website}
          placeholder="yoursite.com or a social link"
        />
      </View>

      <View className="gap-4">
        <View className="px-1">
          <TextComponent className="text-xs font-bold text-zinc-500">Private details</TextComponent>
          <TextComponent className="mt-0.5 text-xs text-zinc-400">
            Only you can see these. We use them for your tickets and to keep your account safe.
          </TextComponent>
        </View>
        <Field label="Phone" value={form.phone} onChange={set("phone")} keyboard="phone-pad" error={errors.phone} placeholder="+234 801 234 5678" />
        <View className="gap-1.5">
          <TextComponent className="px-1 text-sm font-semibold text-zinc-700">Date of Birth</TextComponent>
          <Pressable
            onPress={() => setDateOpen(true)}
            accessibilityRole="button"
            className="h-12 justify-center rounded-lg bg-white px-4"
            style={{ borderWidth: 1, borderColor: errors.dateOfBirth ? BRAND.danger : "rgba(0,0,0,0.12)" }}
          >
            <TextComponent className={form.dateOfBirth ? "text-base text-zinc-950" : "text-base text-zinc-400"}>
              {form.dateOfBirth ? format(new Date(form.dateOfBirth), "dd MMM yyyy") : "Select date"}
            </TextComponent>
          </Pressable>
          {!!errors.dateOfBirth && (
            <TextComponent className="px-1 text-xs" style={{ color: BRAND.danger }}>
              {errors.dateOfBirth}
            </TextComponent>
          )}
        </View>
        <SelectFieldComponent
          label="Gender"
          labelClassName="px-1 text-sm font-semibold text-zinc-700"
          placeholder="Select gender"
          options={GENDERS}
          value={form.gender || undefined}
          error={errors.gender}
          onChange={(option) => set("gender")(String(option.value))}
        />
        <Field label="Email" value={user.email ?? ""} onChange={() => undefined} note="Your sign-in email can't be changed here." />
      </View>
      {isDirty && <PrimaryButton label="Save changes" onPress={() => void save()} busy={saving} />}
      <DateModalComponent
        visible={dateOpen}
        value={form.dateOfBirth ? `${form.dateOfBirth}T12:00:00` : null}
        onClose={() => setDateOpen(false)}
        onDateSelected={(date) => set("dateOfBirth")(format(date, "yyyy-MM-dd"))}
      />
    </View>
  );
};

export default memo(ProfileInfoForm);
