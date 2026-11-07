import {
  CountryCode,
  getCountryCallingCode,
  isSupportedCountry,
  isValidPhoneNumber,
  parsePhoneNumberFromString
} from "libphonenumber-js";
import { COUNTRIES, PRIORITY_COUNTRY_CODES } from "./countries";

export type { CountryCode };

const FALLBACK_COUNTRY: CountryCode = "NG";

/** Where Turnupz runs first, then everyone else. */
export const PHONE_COUNTRIES = [
  ...COUNTRIES.filter((item) => PRIORITY_COUNTRY_CODES.includes(item.code)),
  ...COUNTRIES.filter((item) => !PRIORITY_COUNTRY_CODES.includes(item.code))
].filter((item) => isSupportedCountry(item.code));

export const dialCode = (country: CountryCode) => `+${getCountryCallingCode(country)}`;

export const flagOf = (country: CountryCode) => COUNTRIES.find((item) => item.code === country)?.flag ?? "";

/** A country code we can use, from whatever the profile holds. */
export const phoneCountryFrom = (code?: string | null): CountryCode =>
  code && isSupportedCountry(code) ? code : FALLBACK_COUNTRY;

/** The full number the api stores, from the country picked and what was typed. */
export const fullPhone = (country: CountryCode, typed: string) => {
  if (!typed.trim()) return "";
  return (
    parsePhoneNumberFromString(typed, country)?.number ??
    `${dialCode(country)}${typed.replace(/\D/g, "").replace(/^0+/, "")}`
  );
};

/** A stored number, split back into its country and the rest. */
export const splitPhone = (value: string, fallback: CountryCode) => {
  const parsed = value ? parsePhoneNumberFromString(value, fallback) : undefined;
  return { country: parsed?.country ?? fallback, typed: parsed?.nationalNumber ?? value };
};

export const isValidPhone = (value: string) => isValidPhoneNumber(value.trim());
