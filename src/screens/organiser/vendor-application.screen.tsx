import ModalKeyboardAvoider from "@/shared/components/modals/modal-keyboard-avoider";
import React, { memo, useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { format } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WEB_APP_URL } from "@env";
import { getData, patchData, postData, putData } from "@/api";
import { constructErrorMessage } from "@/api/functions";
import SafeModal from "@/shared/components/modals/safe-modal";
import TextComponent from "@/shared/components/text/text.component";
import InputFieldComponent from "@/shared/components/form/input-field/input-field.component";
import LabelComponent from "@/shared/components/form/label/label.component";
import ButtonComponent from "@/shared/components/button/button.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import OverlayToast from "@/shared/components/status/toast/overlay-toast";
import useUser from "@/shared/hooks/use-user.hook";
import useUserStore from "@/shared/stores/user.store";
import { useOrganiserStore } from "@/shared/stores/organiser.store";
import { BRAND } from "@/shared/utils/brand-colors";
import { adultAgeMessage, isAdultBirthDate } from "@/shared/utils/age";
import { COUNTRIES } from "@/shared/utils/countries";
import { isValidPhone } from "@/shared/utils/phone";
import PhoneField from "@/shared/components/form/phone-field/phone-field.component";
import ListSheet from "@/shared/components/modals/list-sheet";
import DateModalComponent from "@/screens/onboarding/components/date-modal/date-modal.component";

/* The same steps and endpoints as the website's vendor verification. Hosting
   abroad and Stripe's bank screens stay on the website. */

type TPlan = "free" | "paid";
type TVendorType = "individual" | "business";
type TStep = "vendorType" | "identity" | "business" | "payout" | "review";

type TPayoutCountry = {
  code: string;
  name: string;
  currency: string;
  fields: ("routingNumber" | "sortCode" | "iban" | "swiftCode" | "bankName" | "accountNumber")[];
  direct?: boolean;
  stripe?: boolean;
};

const PAYOUT_COUNTRIES: TPayoutCountry[] = [
  { code: "NG", name: "Nigeria", currency: "NGN", fields: ["bankName", "accountNumber"], direct: true },
  { code: "ZA", name: "South Africa", currency: "ZAR", fields: ["bankName", "routingNumber", "accountNumber"], direct: true },
  { code: "CA", name: "Canada", currency: "CAD", fields: [], stripe: true },
  { code: "GB", name: "United Kingdom", currency: "GBP", fields: ["bankName", "sortCode", "accountNumber"] },
  { code: "US", name: "United States", currency: "USD", fields: ["bankName", "routingNumber", "accountNumber"] },
  { code: "AE", name: "United Arab Emirates", currency: "AED", fields: ["bankName", "iban", "swiftCode"] }
];

const FIELD_LABEL: Record<string, string> = {
  bankName: "Bank name",
  accountNumber: "Account number",
  routingNumber: "Routing or branch code",
  sortCode: "Sort code",
  iban: "IBAN",
  swiftCode: "SWIFT code"
};

type TForm = {
  plan: TPlan | "";
  vendorType: TVendorType;
  organiserName: string;
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: Date | null;
  phoneNumber: string;
  countryOfResidence: string;
  address: string;
  idType: string;
  /** Typed only to add or change it; blank keeps the one on file. */
  idNumber: string;
  /** If printed on the ID. */
  idIssuedOn: Date | null;
  /** Passports, licences and permits always have one; a voter's card doesn't. */
  idExpiresOn: Date | null;
  representativeRole: string;
  businessDocumentType: string;
  businessName: string;
  businessRegistrationNumber: string;
  businessAddress: string;
  authorizedRepresentative: string;
  taxId: string;
  payoutCountry: string;
  accountHolderName: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  routingNumber: string;
  sortCode: string;
  iban: string;
  swiftCode: string;
  acceptedTerms: boolean;
};

type TVerification = Partial<Omit<TForm, "dateOfBirth" | "plan" | "idIssuedOn" | "idExpiresOn">> & {
  idIssuedOn?: string | null;
  idExpiresOn?: string | null;
  status?: string;
  plan?: TPlan | null;
  canSellTickets?: boolean;
  dateOfBirth?: string | null;
  rejectionReason?: string | null;
  needsMoreInfoMessage?: string | null;
  idDocumentDetails?: { id?: string } | null;
  idNumberLast4?: string | null;
};

const ID_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_licence", label: "Driver's licence" },
  { value: "national_id", label: "National ID" },
  { value: "voters_card", label: "Voter's card" },
  { value: "residence_permit", label: "Residence permit" },
  { value: "other", label: "Other" }
];
/** Passports, licences and permits always expire; a voter's card never does (as the API). */
const idNeedsExpiry = (type?: string | null) =>
  type === "passport" || type === "drivers_licence" || type === "residence_permit";
const idHasNoExpiry = (type?: string | null) => type === "voters_card";

const REPRESENTATIVE_ROLES = [
  { value: "director", label: "Director" },
  { value: "owner", label: "Owner" },
  { value: "partner", label: "Partner" },
  { value: "manager", label: "Manager" },
  { value: "other", label: "Other" }
];
const BUSINESS_DOCUMENT_TYPES = [
  { value: "registration_certificate", label: "Registration certificate" },
  { value: "status_report", label: "Status report" },
  { value: "memorandum_and_articles", label: "Memorandum & articles" },
  { value: "trade_licence", label: "Trade licence" },
  { value: "other", label: "Other" }
];

/** Pick one of a few options, as chips. */
const ChoiceChips = ({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) => (
  <View className="gap-2">
    <TextComponent className="text-sm font-semibold text-zinc-800">{label}</TextComponent>
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            className="rounded-full border px-3.5 py-2"
            style={{ borderColor: selected ? BRAND.blueDeep : "rgba(0,0,0,0.15)", backgroundColor: selected ? BRAND.blueTint : "#ffffff" }}
          >
            <TextComponent className="text-sm font-semibold" style={{ color: selected ? BRAND.blueDeep : "#3f3f46" }}>
              {option.label}
            </TextComponent>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const stepsFor = (plan: TForm["plan"], vendorType: TVendorType): TStep[] =>
  plan === "free"
    ? ["vendorType", "identity", "review"]
    : ["vendorType", "identity", ...(vendorType === "business" ? (["business"] as const) : []), "payout", "review"];

const STEP_LABEL: Record<TStep, string> = {
  vendorType: "Hosting",
  identity: "You",
  business: "Business",
  payout: "Payout",
  review: "Review"
};

const STEP_TITLE: Record<TStep, string> = {
  vendorType: "What will you host?",
  identity: "About you",
  business: "Your business",
  payout: "Where you're paid",
  review: "Check and send"
};

const stepNote = (step: TStep, isFree: boolean) => {
  if (step === "vendorType") return "Start with free events if you like. You can verify to sell tickets later.";
  if (step === "identity") return isFree ? "So people know who's behind your events." : "As they appear on your government ID. We check them against the document.";
  if (step === "business") return "As they appear on your registration documents.";
  if (step === "payout") return "Where your ticket money is sent.";
  return isFree ? "One last look, then you can start hosting." : "One last look before our team checks your details.";
};

const digits = (value: string) => value.replace(/[\s-]/g, "");

const ICONS = {
  gift: "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
  ticket: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2zM13 5v2M13 17v2M13 11v2",
  person: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  business: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01",
  id: "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM9 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5.5 16a3.5 3.5 0 0 1 7 0M15 10h4M15 14h4",
  check: "M5 12l5 5L20 7",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  close: "M18 6 6 18M6 6l12 12",
  down: "M6 9l6 6 6-6"
};

const Icon = ({ name, color = BRAND.ink, size = 22 }: { name: keyof typeof ICONS; color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d={ICONS[name]} stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

/** Where they are: done steps can be tapped to go back to. */
const Stepper = ({ steps, index, onJump }: { steps: TStep[]; index: number; onJump: (step: TStep) => void }) => (
  <View
    className="flex-row px-3 pb-4 pt-2"
    accessibilityRole="progressbar"
    accessibilityLabel={`Step ${index + 1} of ${steps.length}: ${STEP_TITLE[steps[index]]}`}
  >
    {steps.map((item, position) => {
      const done = position < index;
      const current = position === index;
      return (
        <Pressable key={item} onPress={() => done && onJump(item)} disabled={!done} className="flex-1 items-center">
          {position < steps.length - 1 && (
            <View
              style={{ position: "absolute", top: 13, left: "50%", right: "-50%", height: 2, backgroundColor: done ? BRAND.blueDeep : "#E4E4E7" }}
            />
          )}
          <View
            className="size-7 items-center justify-center rounded-full"
            style={{
              backgroundColor: done || current ? BRAND.blueDeep : "#FFFFFF",
              borderWidth: done || current ? 0 : 2,
              borderColor: "#E4E4E7"
            }}
          >
            {done ? (
              <Icon name="check" color="#FFFFFF" size={15} />
            ) : (
              <TextComponent className={`text-xs font-bold ${current ? "text-white" : "text-zinc-400"}`}>{position + 1}</TextComponent>
            )}
          </View>
          <TextComponent numberOfLines={1} className={`mt-1.5 text-[11px] ${current ? "font-bold text-zinc-950" : "text-zinc-500"}`}>
            {STEP_LABEL[item]}
          </TextComponent>
        </Pressable>
      );
    })}
  </View>
);

const Choice = ({ title, note, icon, active, onPress }: { title: string; note: string; icon: keyof typeof ICONS; active: boolean; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ selected: active }}
    className="flex-row items-center gap-3 rounded-2xl p-4"
    style={{ borderWidth: active ? 2 : 1, borderColor: active ? BRAND.blueDeep : "rgba(0,0,0,0.12)", backgroundColor: active ? BRAND.blueTint : "#fff" }}
  >
    <View className="size-11 items-center justify-center rounded-xl" style={{ backgroundColor: active ? "#FFFFFF" : BRAND.blueTint }}>
      <Icon name={icon} color={BRAND.blueDeep} />
    </View>
    <View className="flex-1">
      <TextComponent className="text-base font-bold text-zinc-950">{title}</TextComponent>
      <TextComponent className="mt-0.5 text-sm leading-5 text-zinc-600">{note}</TextComponent>
    </View>
    <View
      className="size-5 items-center justify-center rounded-full"
      style={{ borderWidth: 2, borderColor: active ? BRAND.blueDeep : "#D4D4D8", backgroundColor: active ? BRAND.blueDeep : "transparent" }}
    >
      {active && <Icon name="check" color="#FFFFFF" size={12} />}
    </View>
  </Pressable>
);

/** Related fields, grouped so a long step doesn't read as one long list. */
const Section = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <View className="gap-4 rounded-2xl border border-black/10 bg-white p-4">
    {!!title && <TextComponent className="text-xs font-bold tracking-widest text-zinc-500">{title.toUpperCase()}</TextComponent>}
    {children}
  </View>
);

/** A field that opens a list. */
const PickerField = ({ label, value, placeholder, onPress }: { label: string; value?: string; placeholder: string; onPress: () => void }) => (
  <View className="gap-3">
    <LabelComponent label={label} />
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || placeholder}`}
      className="min-h-14 flex-row items-center justify-between gap-2 rounded-md border border-black/20 px-4 py-3"
    >
      <TextComponent className={`flex-1 text-base ${value ? "text-black" : "text-black/40"}`}>{value || placeholder}</TextComponent>
      <Icon name="down" color={BRAND.grey} size={18} />
    </Pressable>
  </View>
);

/** A block of answers on the review step, with a way back to change them. */
const ReviewCard = ({ title, rows, onEdit }: { title: string; rows: (string | undefined)[][]; onEdit: () => void }) => (
  <View className="rounded-2xl border border-black/10 bg-white p-4">
    <View className="mb-1 flex-row items-center justify-between">
      <TextComponent className="text-xs font-bold tracking-widest text-zinc-500">{title.toUpperCase()}</TextComponent>
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Edit ${title}`} hitSlop={10}>
        <TextComponent className="text-sm font-bold" style={{ color: BRAND.blueDeep }}>Edit</TextComponent>
      </Pressable>
    </View>
    {rows.map(([label, value]) => (
      <View key={label} className="flex-row justify-between gap-4 py-2">
        <TextComponent className="text-sm text-zinc-500">{label}</TextComponent>
        <TextComponent className="flex-1 text-right text-sm font-semibold text-zinc-950">{value || "Not added"}</TextComponent>
      </View>
    ))}
  </View>
);

/**
 * Applying to host, in the app: what they'll host, who they are, their
 * business, where they're paid, then send. Free hosting is approved straight
 * away; selling tickets goes to the team for review.
 */
const VendorApplicationScreen = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const { getUserDetails } = useUser();
  const setOrganiserMode = useOrganiserStore((state) => state.setMode);

  const verification = useQuery({
    queryKey: ["vendor-verification"],
    enabled: visible,
    queryFn: async () => (await getData<TVerification>("/vendor/verification")).data?.data ?? null
  });
  const markets = useQuery({
    queryKey: ["markets"],
    enabled: visible,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => (await getData<{ code: string; name: string }[]>("/markets")).data?.data ?? []
  });

  const [form, setForm] = useState<TForm>({
    plan: "",
    vendorType: "individual",
    organiserName: "",
    legalFirstName: "",
    legalLastName: "",
    dateOfBirth: null,
    phoneNumber: "",
    countryOfResidence: "",
    address: "",
    idType: "",
    idNumber: "",
    idIssuedOn: null,
    idExpiresOn: null,
    representativeRole: "",
    businessDocumentType: "",
    businessName: "",
    businessRegistrationNumber: "",
    businessAddress: "",
    authorizedRepresentative: "",
    taxId: "",
    payoutCountry: "",
    accountHolderName: "",
    bankName: "",
    bankCode: "",
    accountNumber: "",
    routingNumber: "",
    sortCode: "",
    iban: "",
    swiftCode: "",
    acceptedTerms: false
  });
  const set = <K extends keyof TForm>(key: K) => (value: TForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const [step, setStep] = useState<TStep>("vendorType");
  const [busy, setBusy] = useState(false);
  const [idPhoto, setIdPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [idDocumentId, setIdDocumentId] = useState<string | undefined>();
  const [pickingDate, setPickingDate] = useState(false);
  // The ID's issue or expiry date being picked.
  const [pickingIdDate, setPickingIdDate] = useState<"idIssuedOn" | "idExpiresOn" | null>(null);
  const [sheet, setSheet] = useState<"residence" | "payoutCountry" | "bank" | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  // What's saved, then what the profile already knows, so nothing is asked twice.
  useEffect(() => {
    const saved = verification.data;
    if (!visible || verification.isLoading) return;
    setForm((current) => ({
      ...current,
      plan: saved?.plan ?? current.plan,
      vendorType: (saved?.vendorType as TVendorType) ?? current.vendorType,
      organiserName: saved?.organiserName ?? current.organiserName,
      legalFirstName: saved?.legalFirstName || user?.firstName || current.legalFirstName,
      legalLastName: saved?.legalLastName || user?.lastName || current.legalLastName,
      dateOfBirth: saved?.dateOfBirth ? new Date(saved.dateOfBirth) : user?.dateOfBirth ? new Date(user.dateOfBirth) : current.dateOfBirth,
      idIssuedOn: saved?.idIssuedOn ? new Date(saved.idIssuedOn) : current.idIssuedOn,
      idExpiresOn: saved?.idExpiresOn ? new Date(saved.idExpiresOn) : current.idExpiresOn,
      phoneNumber: saved?.phoneNumber || user?.phone || current.phoneNumber,
      countryOfResidence:
        saved?.countryOfResidence ||
        COUNTRIES.find((item) => item.code === (user?.countryCode ?? user?.country))?.name ||
        current.countryOfResidence,
      address: saved?.address ?? current.address,
      idType: (saved?.idType as string) ?? current.idType,
      representativeRole: (saved?.representativeRole as string) ?? current.representativeRole,
      businessDocumentType: (saved?.businessDocumentType as string) ?? current.businessDocumentType,
      businessName: saved?.businessName ?? current.businessName,
      businessRegistrationNumber: saved?.businessRegistrationNumber ?? current.businessRegistrationNumber,
      businessAddress: saved?.businessAddress ?? current.businessAddress,
      authorizedRepresentative: saved?.authorizedRepresentative ?? current.authorizedRepresentative,
      taxId: saved?.taxId ?? current.taxId,
      payoutCountry: saved?.payoutCountry ?? current.payoutCountry,
      accountHolderName: saved?.accountHolderName ?? current.accountHolderName,
      bankName: saved?.bankName ?? current.bankName,
      bankCode: saved?.bankCode ?? current.bankCode
    }));
    if (saved?.idDocumentDetails?.id) setIdDocumentId(saved.idDocumentDetails.id);
  }, [visible, verification.isLoading, verification.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const payoutCountry = PAYOUT_COUNTRIES.find((item) => item.name === form.payoutCountry);
  const banks = useQuery({
    queryKey: ["payout-banks", payoutCountry?.code],
    enabled: visible && !!payoutCountry?.direct,
    staleTime: 60 * 60 * 1000,
    queryFn: async () =>
      (await getData<{ code: string; name: string }[]>(`/vendor/verification/banks?country=${payoutCountry?.code}`)).data?.data ?? []
  });

  // Nigerian accounts: the bank says whose account it is, so typos show up.
  const accountToCheck = payoutCountry?.code === "NG" && form.bankCode && digits(form.accountNumber).length === 10 ? `${digits(form.accountNumber)}:${form.bankCode}` : null;
  const accountName = useQuery({
    queryKey: ["resolve-account", accountToCheck],
    enabled: !!accountToCheck,
    retry: false,
    staleTime: Infinity,
    queryFn: async () => {
      const [accountNumber, bankCode] = (accountToCheck ?? "").split(":");
      const { data } = await postData<{ accountNumber: string; bankCode: string }, { accountName: string }>(
        "/vendor/verification/resolve-account",
        { accountNumber, bankCode }
      );
      return data?.data?.accountName ?? null;
    }
  });
  useEffect(() => {
    if (accountName.data && !form.accountHolderName.trim()) set("accountHolderName")(accountName.data);
  }, [accountName.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = stepsFor(form.plan, form.vendorType);
  const index = Math.max(steps.indexOf(step), 0);
  const isFree = form.plan === "free";

  const problem = (): string | null => {
    if (step === "vendorType") {
      if (!form.plan) return "Choose what you'll host";
      if (form.organiserName.trim().length < 2) return "Enter the name your events go out under";
    }
    if (step === "identity") {
      if (!form.legalFirstName.trim() || !form.legalLastName.trim()) return "Enter your first and last name";
      if (!isValidPhone(form.phoneNumber)) return "Check your phone number. It doesn't look right for that country.";
      if (!form.countryOfResidence) return "Choose your country";
      if (!isFree) {
        if (!form.dateOfBirth) return "Choose your date of birth";
        if (!isAdultBirthDate(form.dateOfBirth)) return adultAgeMessage;
        if (form.address.trim().length < 5) return "Enter your address";
        if (!idPhoto && !idDocumentId) return "Add a photo of your government ID";
        if (!form.idType) return "Choose the kind of ID";
        if (!form.idNumber.trim() && !verification.data?.idNumberLast4) return "Enter the number on your ID";
        if (idNeedsExpiry(form.idType) && !form.idExpiresOn) return "Add the expiry date on your ID";
        if (form.idExpiresOn && !idHasNoExpiry(form.idType) && form.idExpiresOn.getTime() < Date.now())
          return "This ID has expired. Use one that's still valid.";
      }
    }
    if (step === "business") {
      if (!form.businessName.trim()) return "Enter the registered business name";
      if (!form.businessRegistrationNumber.trim()) return "Enter the registration number";
      if (!form.authorizedRepresentative.trim()) return "Enter who can act for the business";
      if (!form.representativeRole) return "Choose your role in the business";
      if (!form.businessDocumentType) return "Choose the document that proves the business exists";
      if (form.businessAddress.trim().length < 5) return "Enter the business address";
    }
    if (step === "payout") {
      if (!payoutCountry) return "Choose where you're paid";
      if (!payoutCountry.stripe) {
        if (!form.accountHolderName.trim()) return "Enter the name on the account";
        for (const field of payoutCountry.fields) {
          if (!form[field].trim()) return `Enter the ${FIELD_LABEL[field].toLowerCase()}`;
        }
      }
    }
    if (step === "review" && !form.acceptedTerms) return "Tick the box to confirm your details";
    return null;
  };

  /** The photo goes up first, the application then points at it. */
  const uploadId = async () => {
    if (!idPhoto) return idDocumentId;
    const type = idPhoto.mimeType || "image/jpeg";
    const name = idPhoto.fileName || `id.${type.split("/")[1] || "jpg"}`;
    const body = new FormData();
    if (Platform.OS === "web") body.append("file", await (await fetch(idPhoto.uri)).blob(), name);
    else body.append("file", { uri: idPhoto.uri, name, type } as unknown as Blob);
    body.append("purpose", "ID_DOCUMENT");
    const { data } = await postData<FormData, { id: string }>("/attachment", body, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    const id = data?.data?.id;
    if (!id) throw new Error("Upload failed");
    setIdDocumentId(id);
    setIdPhoto(null);
    return id;
  };

  const fieldsFor = async (current: TStep): Promise<Record<string, unknown>> => {
    if (current === "vendorType") {
      return { plan: form.plan, vendorType: form.vendorType, organiserName: form.organiserName.trim() };
    }
    if (current === "identity") {
      return {
        legalFirstName: form.legalFirstName.trim(),
        legalLastName: form.legalLastName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        countryOfResidence: form.countryOfResidence,
        ...(isFree
          ? {}
          : {
              dateOfBirth: form.dateOfBirth?.toISOString(),
              address: form.address.trim(),
              idDocumentId: await uploadId(),
              idType: form.idType || undefined,
              ...(form.idNumber.trim() ? { idNumber: form.idNumber.trim() } : {}),
              ...(form.idIssuedOn ? { idIssuedOn: form.idIssuedOn.toISOString() } : {}),
              ...(form.idExpiresOn && !idHasNoExpiry(form.idType) ? { idExpiresOn: form.idExpiresOn.toISOString() } : {})
            })
      };
    }
    if (current === "business") {
      return {
        businessName: form.businessName.trim(),
        businessRegistrationNumber: form.businessRegistrationNumber.trim(),
        businessAddress: form.businessAddress.trim(),
        authorizedRepresentative: form.authorizedRepresentative.trim(),
        representativeRole: form.representativeRole || undefined,
        businessDocumentType: form.businessDocumentType || undefined,
        ...(form.taxId.trim() ? { taxId: form.taxId.trim() } : {})
      };
    }
    if (current === "payout") {
      const account = digits(form.accountNumber) || undefined;
      const iban = digits(form.iban) || undefined;
      return {
        payoutCountry: payoutCountry?.name,
        payoutCurrency: payoutCountry?.currency,
        ...(payoutCountry?.stripe
          ? {}
          : {
              accountHolderName: form.accountHolderName.trim(),
              bankName: form.bankName.trim() || undefined,
              bankCode: form.bankCode || undefined,
              accountNumber: account,
              payoutAccount: account ?? iban,
              routingNumber: digits(form.routingNumber) || undefined,
              sortCode: digits(form.sortCode) || undefined,
              iban,
              swiftCode: form.swiftCode.trim() || undefined
            })
      };
    }
    return { acceptedTerms: form.acceptedTerms };
  };

  const next = async () => {
    const issue = problem();
    if (issue) {
      onError(issue);
      return;
    }
    setBusy(true);
    try {
      if (step === "review") {
        await putData("/vendor/verification", { acceptedTerms: true });
        const { data } = await postData<Record<string, never>, TVerification>("/vendor/verification/submit", {});
        await queryClient.invalidateQueries({ queryKey: ["vendor-verification"] });
        const approved = data?.data?.status === "approved";
        if (approved) void getUserDetails();
        setUpgrading(false);
        onSuccess(approved ? "You're all set to host free events." : "Sent for review. We'll let you know the outcome.");
        return;
      }
      const fields = await fieldsFor(step);
      // Free hosting's details are checked together when it's sent.
      if (isFree && step === "identity") await putData("/vendor/verification", fields);
      else await patchData(`/vendor/verification/steps/${step}/submit`, { fields, status: "submitted" });
      setStep(steps[index + 1]);
    } catch (error) {
      onError(constructErrorMessage(error as TApiErrorResponseType, "We couldn't save that. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const pickId = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!result.canceled && result.assets?.[0]) setIdPhoto(result.assets[0]);
  };

  const web = (path: string) => void Linking.openURL(`${(WEB_APP_URL ?? "https://turnupz.app").replace(/\/$/, "")}${path}`);

  const status = verification.data?.status;
  const needsChanges = status === "rejected" || status === "needs_more_info";
  const canSell = !!verification.data?.canSellTickets;
  const showStatus = !upgrading && (status === "submitted" || status === "approved");

  // The phone's back button goes back a step before it leaves.
  const onBack = () => {
    if (!showStatus && index > 0) setStep(steps[index - 1]);
    else onClose();
  };
  const lastDigits = digits(form.accountNumber || form.iban).slice(-4);

  const statusScreen = (
    <View className="items-center gap-3 pt-10">
      <View className="mb-2 size-20 items-center justify-center rounded-full" style={{ backgroundColor: BRAND.blueTint }}>
        <Icon name={status === "submitted" ? "clock" : "check"} color={BRAND.blueDeep} size={36} />
      </View>
      <TextComponent className="text-center text-2xl font-extrabold text-zinc-950">
        {status === "submitted" ? "We're checking your details" : canSell ? "You're verified" : "You can host free events"}
      </TextComponent>
      <TextComponent className="text-center text-base leading-6 text-zinc-600">
        {status === "submitted"
          ? "We'll let you know the outcome, usually within a couple of days."
          : canSell
            ? "You can create events and sell tickets. Manage events and payouts on the website."
            : "To sell tickets, finish verifying with your ID and bank details."}
      </TextComponent>
    </View>
  );

  const formScreen = (
    <View className="gap-4">
      {needsChanges && (
        <View className="rounded-2xl bg-amber-50 p-4">
          <TextComponent className="text-sm font-bold text-amber-900">
            {status === "rejected" ? "Your application needs changes" : "We need a little more"}
          </TextComponent>
          <TextComponent className="mt-1 text-sm leading-5 text-amber-900">
            {verification.data?.needsMoreInfoMessage || verification.data?.rejectionReason || "Check your details and send them again."}
          </TextComponent>
        </View>
      )}
      <View>
        <TextComponent className="text-2xl font-extrabold text-zinc-950">{STEP_TITLE[step]}</TextComponent>
        <TextComponent className="mt-1 text-sm leading-5 text-zinc-600">{stepNote(step, isFree)}</TextComponent>
      </View>

      {step === "vendorType" && (
        <>
          <Choice icon="gift" active={form.plan === "free"} title="Free events only" note="Your name, phone and country, and you can start hosting straight away." onPress={() => set("plan")("free")} />
          <Choice icon="ticket" active={form.plan === "paid"} title="Sell tickets" note="Full verification with your ID and bank details, checked by our team." onPress={() => set("plan")("paid")} />
          {form.plan === "paid" && (
            <>
              <TextComponent className="mt-2 text-base font-bold text-zinc-950">Who runs your events?</TextComponent>
              <Choice icon="person" active={form.vendorType === "individual"} title="Individual" note="You run events yourself and are paid to a personal account." onPress={() => set("vendorType")("individual")} />
              <Choice icon="business" active={form.vendorType === "business"} title="Registered business" note="A company runs them and is paid to a business account." onPress={() => set("vendorType")("business")} />
            </>
          )}
          {!!form.plan && (
            <Section>
              <InputFieldComponent
                label="Organiser name"
                placeholder={form.vendorType === "business" && !isFree ? "e.g. Afrobeat Live" : "e.g. DJ Kemi"}
                value={form.organiserName}
                onChangeText={set("organiserName")}
              />
              <TextComponent className="-mt-2 text-xs text-zinc-500">
                Shown as "Organised by" on your events. A brand or stage name is fine.
              </TextComponent>
            </Section>
          )}
        </>
      )}

      {step === "identity" && (
        <>
          <Section title="Your name">
            <InputFieldComponent label={isFree ? "First name" : "Legal first name"} value={form.legalFirstName} onChangeText={set("legalFirstName")} />
            <InputFieldComponent label={isFree ? "Last name" : "Legal last name"} value={form.legalLastName} onChangeText={set("legalLastName")} />
            {!isFree && (
              <PickerField
                label="Date of birth"
                value={form.dateOfBirth ? format(form.dateOfBirth, "d MMMM yyyy") : undefined}
                placeholder="Select your birthday"
                onPress={() => setPickingDate(true)}
              />
            )}
          </Section>
          <Section title="Contact">
            <PhoneField value={form.phoneNumber} onChange={set("phoneNumber")} defaultCountry={user?.countryCode ?? user?.country} />
            <PickerField label="Country of residence" value={form.countryOfResidence} placeholder="Select a country" onPress={() => setSheet("residence")} />
            {!isFree && (
              <InputFieldComponent label="Residential address" placeholder="House number, street, city" value={form.address} onChangeText={set("address")} />
            )}
          </Section>
          {!isFree && (
            <Section title="Government ID">
              <Pressable
                onPress={() => void pickId()}
                accessibilityRole="button"
                accessibilityLabel={idPhoto || idDocumentId ? "Replace your ID photo" : "Add a photo of your ID"}
                className="flex-row items-center gap-3 rounded-xl border border-dashed border-black/20 p-3"
              >
                {idPhoto ? (
                  <Image source={{ uri: idPhoto.uri }} style={{ width: 64, height: 64, borderRadius: 10 }} accessibilityIgnoresInvertColors />
                ) : (
                  <View className="size-16 items-center justify-center rounded-xl" style={{ backgroundColor: BRAND.blueTint }}>
                    <Icon name={idDocumentId ? "check" : "id"} color={BRAND.blueDeep} size={28} />
                  </View>
                )}
                <View className="flex-1">
                  <TextComponent className="text-base font-bold text-zinc-950">
                    {idPhoto ? "Photo added" : idDocumentId ? "ID on file" : "Add a photo"}
                  </TextComponent>
                  <TextComponent className="mt-0.5 text-sm font-semibold" style={{ color: BRAND.blueDeep }}>
                    {idPhoto || idDocumentId ? "Tap to replace" : "Choose from your photos"}
                  </TextComponent>
                </View>
              </Pressable>
              <TextComponent className="-mt-1 text-xs leading-4 text-zinc-500">
                Passport, national ID, driver's licence or voter's card. The name and date of birth must match.
              </TextComponent>
              <ChoiceChips label="Type of ID" options={ID_TYPES} value={form.idType} onChange={set("idType")} />
              <InputFieldComponent
                label="ID number"
                placeholder={verification.data?.idNumberLast4 ? `On file: ending ${verification.data.idNumberLast4}` : "As printed on the ID"}
                value={form.idNumber}
                onChangeText={set("idNumber")}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TextComponent className="-mt-2 text-xs leading-4 text-zinc-500">
                Kept encrypted. Only the last 4 are shown, and only our verification team can see it in full.
              </TextComponent>
              <PickerField
                label="Issue date (valid from)"
                value={form.idIssuedOn ? format(form.idIssuedOn, "d MMMM yyyy") : undefined}
                placeholder="If it's printed on the ID"
                onPress={() => setPickingIdDate("idIssuedOn")}
              />
              {!idHasNoExpiry(form.idType) && (
                <PickerField
                  label={idNeedsExpiry(form.idType) ? "Expiry date" : "Expiry date (if it has one)"}
                  value={form.idExpiresOn ? format(form.idExpiresOn, "d MMMM yyyy") : undefined}
                  placeholder="As printed on the ID"
                  onPress={() => setPickingIdDate("idExpiresOn")}
                />
              )}
            </Section>
          )}
        </>
      )}

      {step === "business" && (
        <>
          <Section title="Registration">
            <InputFieldComponent label="Registered business name" value={form.businessName} onChangeText={set("businessName")} />
            <InputFieldComponent label="Registration number" placeholder="e.g. RC 1234567" value={form.businessRegistrationNumber} onChangeText={set("businessRegistrationNumber")} />
            <InputFieldComponent label="Tax ID (optional)" value={form.taxId} onChangeText={set("taxId")} />
            <ChoiceChips label="Registration document" options={BUSINESS_DOCUMENT_TYPES} value={form.businessDocumentType} onChange={set("businessDocumentType")} />
          </Section>
          <Section title="Contact">
            <InputFieldComponent label="Authorised representative" placeholder="Your full name, as on your ID" value={form.authorizedRepresentative} onChangeText={set("authorizedRepresentative")} />
            <ChoiceChips label="Your role in the business" options={REPRESENTATIVE_ROLES} value={form.representativeRole} onChange={set("representativeRole")} />
            <InputFieldComponent label="Registered business address" value={form.businessAddress} onChangeText={set("businessAddress")} />
          </Section>
        </>
      )}

      {step === "payout" && (
        <>
          <Section>
            <PickerField label="Country you're paid in" value={form.payoutCountry} placeholder="Select a country" onPress={() => setSheet("payoutCountry")} />
          </Section>
          {payoutCountry?.stripe && (
            <View className="rounded-2xl p-4" style={{ backgroundColor: BRAND.blueTint }}>
              <TextComponent className="text-sm leading-5 text-zinc-800">
                In {payoutCountry.name} you add your bank on the website, once you're approved.
              </TextComponent>
            </View>
          )}
          {payoutCountry && !payoutCountry.stripe && (
            <Section title="Bank account">
              {payoutCountry.direct ? (
                <PickerField label="Bank" value={form.bankName} placeholder={banks.isLoading ? "Loading banks…" : "Select your bank"} onPress={() => setSheet("bank")} />
              ) : (
                <InputFieldComponent label="Bank name" value={form.bankName} onChangeText={set("bankName")} />
              )}
              {payoutCountry.fields
                .filter((field) => field !== "bankName")
                .map((field) => (
                  <InputFieldComponent
                    key={field}
                    label={FIELD_LABEL[field]}
                    autoCapitalize="characters"
                    keyboardType={field === "iban" || field === "swiftCode" ? "default" : "number-pad"}
                    value={form[field]}
                    onChangeText={set(field)}
                  />
                ))}
              <InputFieldComponent
                label="Name on the account"
                value={form.accountHolderName}
                onChangeText={set("accountHolderName")}
              />
              <TextComponent className="-mt-2 text-xs text-zinc-500">
                {accountName.isFetching ? "Checking with the bank…" : accountName.data ? `The bank says: ${accountName.data}` : "It must be yours or your business's."}
              </TextComponent>
            </Section>
          )}
        </>
      )}

      {step === "review" && (
        <>
          <ReviewCard
            title="Hosting"
            onEdit={() => setStep("vendorType")}
            rows={[
              ["Hosting", isFree ? "Free events only" : "Sell tickets"],
              ...(!isFree ? [["Run by", form.vendorType === "business" ? "Registered business" : "Individual"]] : []),
              ["Organiser name", form.organiserName]
            ]}
          />
          <ReviewCard
            title="About you"
            onEdit={() => setStep("identity")}
            rows={[
              ["Name", `${form.legalFirstName} ${form.legalLastName}`],
              ...(!isFree && form.dateOfBirth ? [["Date of birth", format(form.dateOfBirth, "d MMMM yyyy")]] : []),
              ["Phone", form.phoneNumber],
              ["Country", form.countryOfResidence],
              ...(!isFree
                ? [
                    ["Address", form.address],
                    ["Government ID", "Added"],
                    ...(form.idExpiresOn && !idHasNoExpiry(form.idType)
                      ? [["ID expires", format(form.idExpiresOn, "d MMMM yyyy")]]
                      : [])
                  ]
                : [])
            ]}
          />
          {!isFree && form.vendorType === "business" && (
            <ReviewCard
              title="Business"
              onEdit={() => setStep("business")}
              rows={[
                ["Name", form.businessName],
                ["Registration", form.businessRegistrationNumber],
                ["Representative", form.authorizedRepresentative],
                ["Address", form.businessAddress]
              ]}
            />
          )}
          {!isFree && (
            <ReviewCard
              title="Payout"
              onEdit={() => setStep("payout")}
              rows={[
                ["Paid in", form.payoutCountry],
                ...(payoutCountry?.stripe
                  ? [["Bank", "Added on the website, once approved"]]
                  : [
                      ["Bank", form.bankName],
                      ["Account", lastDigits ? `•••• ${lastDigits}` : undefined],
                      ["Name on account", form.accountHolderName]
                    ])
              ]}
            />
          )}
          <Pressable
            onPress={() => set("acceptedTerms")(!form.acceptedTerms)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.acceptedTerms }}
            className="flex-row gap-3 rounded-2xl border border-black/10 bg-white p-4"
          >
            <View className="mt-0.5 size-5 items-center justify-center rounded" style={{ borderWidth: 2, borderColor: BRAND.blueDeep, backgroundColor: form.acceptedTerms ? BRAND.blueDeep : "transparent" }}>
              {form.acceptedTerms && <Icon name="check" color="#FFFFFF" size={13} />}
            </View>
            <TextComponent className="flex-1 text-sm leading-5 text-zinc-700">
              {isFree
                ? "I confirm these details are accurate and belong to me. I'll only run free events, and I agree that Turnupz may check my events and remove ones that break the rules."
                : "I confirm these details are accurate and belong to me or my business. I agree that Turnupz may check my identity, bank account and events before enabling paid tickets and payouts."}
            </TextComponent>
          </Pressable>
          {!isFree && (
            <Pressable onPress={() => web("/app/settings/vendor-verification")} accessibilityRole="link">
              <TextComponent className="text-sm font-semibold" style={{ color: BRAND.blueDeep }}>
                Hosting outside your country? Add that on the website.
              </TextComponent>
            </Pressable>
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeModal visible={visible} animationType="slide" onRequestClose={onBack}>
      <ModalKeyboardAvoider className="flex-1 bg-zinc-50">
        <View className="bg-white" style={{ paddingTop: insets.top + 8 }}>
          <View className="flex-row items-center justify-between px-5 pb-2">
            <TextComponent className="text-base font-bold text-zinc-950">Host on Turnupz</TextComponent>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
              <Icon name="close" color={BRAND.ink} size={22} />
            </Pressable>
          </View>
          {!showStatus && !verification.isLoading && (
            <Stepper steps={steps} index={index} onJump={setStep} />
          )}
          <View className="h-px bg-black/5" />
        </View>

        {/* Its own for each step, so each starts from the top. */}
        <ScrollView key={showStatus ? "status" : step} className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
          {verification.isLoading ? (
            <View className="items-center pt-16">
              <ActivityIndicator color={BRAND.blueDeep} accessibilityLabel="Loading" />
            </View>
          ) : showStatus ? (
            statusScreen
          ) : (
            formScreen
          )}
        </ScrollView>

        {/* Always in reach, above the keyboard, however long the step is. */}
        {!verification.isLoading && (
          <View className="flex-row gap-3 border-t border-black/5 bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
            {showStatus ? (
              <View className="flex-1 gap-2">
                {status === "approved" && (
                  <ButtonComponent
                    onPress={() => {
                      onClose();
                      setOrganiserMode("organiser");
                    }}
                    className="h-12 rounded-full bg-[#00b2ff] py-0"
                  >
                    Open Organiser tools
                  </ButtonComponent>
                )}
                {status === "approved" && !canSell && (
                  <Pressable
                    onPress={() => {
                      set("plan")("paid");
                      setStep("vendorType");
                      setUpgrading(true);
                    }}
                    accessibilityRole="button"
                    className="h-12 items-center justify-center rounded-full border border-black/15"
                  >
                    <TextComponent className="text-base font-semibold text-zinc-950">Verify to sell tickets</TextComponent>
                  </Pressable>
                )}
                {/* Once approved, the buttons above lead on; Done is only for leaving. */}
                {status === "approved" ? (
                  <Pressable onPress={onClose} accessibilityRole="button" className="h-10 items-center justify-center">
                    <TextComponent className="text-sm font-semibold text-zinc-600">Done</TextComponent>
                  </Pressable>
                ) : (
                  <Pressable onPress={onClose} accessibilityRole="button" className="h-12 items-center justify-center rounded-full border border-black/15">
                    <TextComponent className="text-base font-semibold text-zinc-950">Done</TextComponent>
                  </Pressable>
                )}
              </View>
            ) : (
              <>
                {index > 0 && (
                  <Pressable onPress={() => setStep(steps[index - 1])} accessibilityRole="button" className="h-12 flex-1 items-center justify-center rounded-full border border-black/15">
                    <TextComponent className="text-base font-semibold text-zinc-950">Back</TextComponent>
                  </Pressable>
                )}
                <View style={{ flex: index > 0 ? 2 : 1 }}>
                  <ButtonComponent onPress={() => void next()} disabled={busy} isLoading={busy} className="h-12 rounded-full bg-[#00b2ff] py-0">
                    {step === "review" ? (isFree ? "Start hosting" : "Send for review") : "Continue"}
                  </ButtonComponent>
                </View>
              </>
            )}
          </View>
        )}
      </ModalKeyboardAvoider>

      <DateModalComponent
        visible={pickingDate}
        value={form.dateOfBirth}
        onClose={() => setPickingDate(false)}
        onDateSelected={set("dateOfBirth")}
      />
      <DateModalComponent
        visible={!!pickingIdDate}
        title={pickingIdDate === "idExpiresOn" ? "When the ID expires" : "When the ID was issued"}
        value={pickingIdDate ? form[pickingIdDate] : null}
        latestDate={pickingIdDate === "idExpiresOn" ? new Date(new Date().getFullYear() + 20, 11, 31) : new Date()}
        earliestDate={pickingIdDate === "idExpiresOn" ? new Date() : new Date(new Date().getFullYear() - 50, 0, 1)}
        startDate={pickingIdDate === "idExpiresOn" ? new Date(new Date().getFullYear() + 2, new Date().getMonth(), 1) : new Date(new Date().getFullYear() - 3, new Date().getMonth(), 1)}
        onClose={() => setPickingIdDate(null)}
        onDateSelected={(date) => pickingIdDate && set(pickingIdDate)(date)}
      />
      <ListSheet
        title={sheet === "bank" ? "Your bank" : "Choose a country"}
        items={
          sheet === "residence"
            ? (markets.data ?? []).map((item) => ({ key: item.name, label: item.name }))
            : sheet === "payoutCountry"
              ? // Only where Turnupz is open, as on the website: the api refuses the rest.
                PAYOUT_COUNTRIES.filter((item) => markets.data?.some((market) => market.code === item.code)).map((item) => ({ key: item.name, label: item.name }))
              : sheet === "bank"
                ? (banks.data ?? []).map((item) => ({ key: item.code, label: item.name }))
                : null
        }
        onPick={(key) => {
          if (sheet === "residence") set("countryOfResidence")(key);
          if (sheet === "payoutCountry") {
            setForm((current) => ({ ...current, payoutCountry: key, bankName: "", bankCode: "" }));
          }
          if (sheet === "bank") {
            const bank = banks.data?.find((item) => item.code === key);
            setForm((current) => ({ ...current, bankCode: key, bankName: bank?.name ?? "" }));
          }
        }}
        onClose={() => setSheet(null)}
      />
      {/* This is its own window: without this, messages show behind it, unseen. */}
      <OverlayToast />
    </SafeModal>
  );
};

export default memo(VendorApplicationScreen);
