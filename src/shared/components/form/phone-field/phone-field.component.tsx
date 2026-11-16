import React, { memo, useEffect, useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import LabelComponent from "@/shared/components/form/label/label.component";
import ListSheet from "@/shared/components/modals/list-sheet";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";
import { CountryCode, PHONE_COUNTRIES, dialCode, flagOf, fullPhone, phoneCountryFrom, splitPhone } from "@/shared/utils/phone";

/**
 * A phone number: pick the country, type the rest. `value` and `onChange` deal
 * in the full number the api stores (+2348012345678), or "" when it's empty.
 * `look` matches the form it sits in: "form" for labelled forms, "settings" for
 * the plain fields on the profile screens.
 */
const PhoneField = ({
  label = "Phone number",
  value,
  onChange,
  defaultCountry,
  error,
  look = "form"
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** ISO code to start from when there's no number yet, e.g. from their profile. */
  defaultCountry?: string | null;
  error?: string;
  look?: "form" | "settings";
}) => {
  const fallback = phoneCountryFrom(defaultCountry);
  const [country, setCountry] = useState<CountryCode>(() => splitPhone(value, fallback).country);
  const [typed, setTyped] = useState(() => splitPhone(value, fallback).typed);
  const [picking, setPicking] = useState(false);

  // A number loaded later (a saved application, say) replaces what's showing.
  useEffect(() => {
    if (value === fullPhone(country, typed)) return;
    const next = splitPhone(value, fallback);
    setCountry(next.country);
    setTyped(next.typed);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (nextCountry: CountryCode, nextTyped: string) => {
    // Someone pasted a whole number: its own code decides the country.
    const pasted = nextTyped.trim().startsWith("+") ? splitPhone(nextTyped.trim(), nextCountry) : null;
    const resolvedCountry = pasted?.country ?? nextCountry;
    const resolvedTyped = pasted && pasted.typed !== nextTyped.trim() ? pasted.typed : nextTyped;
    setCountry(resolvedCountry);
    setTyped(resolvedTyped);
    onChange(fullPhone(resolvedCountry, resolvedTyped));
  };

  const items = useMemo(
    () =>
      PHONE_COUNTRIES.map((item) => ({
        key: item.code,
        label: `${item.flag}  ${item.name} (${dialCode(item.code as CountryCode)})`
      })),
    []
  );

  const isForm = look === "form";
  const borderColor = error ? BRAND.danger : isForm ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.12)";
  const shape = isForm ? "h-14 rounded-md" : "h-12 rounded-lg bg-white";

  return (
    <View className={isForm ? "gap-3" : "gap-1.5"}>
      {isForm ? (
        <LabelComponent label={label} />
      ) : (
        <TextComponent className="px-1 text-sm font-semibold text-zinc-700">{label}</TextComponent>
      )}
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={`Country code ${dialCode(country)}. Change`}
          className={`flex-row items-center gap-1.5 px-3 ${shape}`}
          style={{ borderWidth: 1, borderColor }}
        >
          <TextComponent className="text-base">{flagOf(country)}</TextComponent>
          <TextComponent className="text-base text-black">{dialCode(country)}</TextComponent>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M6 9l6 6 6-6" stroke={BRAND.grey} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <TextInput
          value={typed}
          onChangeText={(text) => change(country, text)}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          accessibilityLabel={label}
          placeholder="Your number"
          placeholderTextColor="#a1a1aa"
          className={`flex-1 px-4 text-base text-black ${shape}`}
          style={{ fontFamily: "PlusJakartaSans-Regular", borderWidth: 1, borderColor }}
        />
      </View>
      {!!error && (
        <TextComponent className="px-1 text-xs" style={{ color: BRAND.danger }}>
          {error}
        </TextComponent>
      )}
      <ListSheet
        title="Country code"
        items={picking ? items : null}
        onPick={(key) => change(key as CountryCode, typed)}
        onClose={() => setPicking(false)}
      />
    </View>
  );
};

export default memo(PhoneField);
