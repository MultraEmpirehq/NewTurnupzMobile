import React, { memo, useEffect, useMemo, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
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
import ButtonComponent from "@/shared/components/button/button.component";
import { onError, onSuccess } from "@/shared/components/status/toast";
import useUser from "@/shared/hooks/use-user.hook";
import useUserStore from "@/shared/stores/user.store";
import { BRAND } from "@/shared/utils/brand-colors";
import { adultAgeMessage, isAdultBirthDate } from "@/shared/utils/age";
import { COUNTRIES } from "@/shared/utils/countries";
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

type TVerification = Partial<Omit<TForm, "dateOfBirth" | "plan">> & {
  status?: string;
  plan?: TPlan | null;
  canSellTickets?: boolean;
  dateOfBirth?: string | null;
  rejectionReason?: string | null;
  needsMoreInfoMessage?: string | null;
  idDocumentDetails?: { id?: string } | null;
};

const stepsFor = (plan: TForm["plan"], vendorType: TVendorType): TStep[] =>
  plan === "free"
    ? ["vendorType", "identity", "review"]
    : ["vendorType", "identity", ...(vendorType === "business" ? (["business"] as const) : []), "payout", "review"];

const STEP_TITLE: Record<TStep, string> = {
  vendorType: "What will you host?",
  identity: "About you",
  business: "Your business",
  payout: "Where you're paid",
  review: "Check and send"
};

const digits = (value: string) => value.replace(/[\s-]/g, "");

const Choice = ({ title, note, active, onPress }: { title: string; note: string; active: boolean; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ selected: active }}
    className="rounded-2xl p-4"
    style={{ borderWidth: active ? 2 : 1, borderColor: active ? BRAND.blueDeep : "rgba(0,0,0,0.12)", backgroundColor: active ? BRAND.blueTint : "#fff" }}
  >
    <TextComponent className="text-base font-bold text-zinc-950">{title}</TextComponent>
    <TextComponent className="mt-0.5 text-sm leading-5 text-zinc-600">{note}</TextComponent>
  </Pressable>
);

/** A field that opens a list. */
const PickerField = ({ label, value, placeholder, onPress }: { label: string; value?: string; placeholder: string; onPress: () => void }) => (
  <View>
    <TextComponent className="mb-1.5 text-sm font-medium text-black">{label}</TextComponent>
    <Pressable onPress={onPress} accessibilityRole="button" className="h-12 justify-center rounded-xl bg-[#f7f9fc] px-4">
      <TextComponent className={value ? "text-base text-black" : "text-base text-black/40"}>{value || placeholder}</TextComponent>
    </Pressable>
  </View>
);

/** A searchable list in a sheet: countries, banks. */
const ListSheet = ({ title, items, onPick, onClose }: { title: string; items: { key: string; label: string }[] | null; onPick: (key: string) => void; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (items ?? []).filter((item) => item.label.toLowerCase().includes(query));
  }, [items, search]);
  return (
    <SafeModal visible={!!items} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1" style={{ backgroundColor: "rgba(7,20,29,0.45)" }} onPress={onClose} accessibilityLabel="Close" />
      <View className="h-[70%] rounded-t-3xl bg-white px-5 pt-4" style={{ paddingBottom: insets.bottom + 8 }}>
        <TextComponent className="text-xl font-extrabold text-zinc-950">{title}</TextComponent>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search"
          placeholderTextColor="#9aa5b1"
          className="mt-3 h-12 rounded-xl bg-[#f7f9fc] px-4 text-base text-black"
        />
        <ScrollView className="mt-2" keyboardShouldPersistTaps="handled">
          {shown.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                onPick(item.key);
                setSearch("");
                onClose();
              }}
              accessibilityRole="button"
              className="rounded-xl px-3 py-3"
            >
              <TextComponent className="text-base text-zinc-950">{item.label}</TextComponent>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </SafeModal>
  );
};

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
      phoneNumber: saved?.phoneNumber || user?.phone || current.phoneNumber,
      countryOfResidence:
        saved?.countryOfResidence ||
        COUNTRIES.find((item) => item.code === (user?.countryCode ?? user?.country))?.name ||
        current.countryOfResidence,
      address: saved?.address ?? current.address,
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
      if (!/^\+[\d\s()-]{7,}$/.test(form.phoneNumber.trim())) return "Enter your phone with its country code, e.g. +234 801 234 5678";
      if (!form.countryOfResidence) return "Choose your country";
      if (!isFree) {
        if (!form.dateOfBirth) return "Choose your date of birth";
        if (!isAdultBirthDate(form.dateOfBirth)) return adultAgeMessage;
        if (form.address.trim().length < 5) return "Enter your address";
        if (!idPhoto && !idDocumentId) return "Add a photo of your government ID";
      }
    }
    if (step === "business") {
      if (!form.businessName.trim()) return "Enter the registered business name";
      if (!form.businessRegistrationNumber.trim()) return "Enter the registration number";
      if (!form.authorizedRepresentative.trim()) return "Enter who can act for the business";
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
              idDocumentId: await uploadId()
            })
      };
    }
    if (current === "business") {
      return {
        businessName: form.businessName.trim(),
        businessRegistrationNumber: form.businessRegistrationNumber.trim(),
        businessAddress: form.businessAddress.trim(),
        authorizedRepresentative: form.authorizedRepresentative.trim(),
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

  const body = showStatus ? (
    <View className="gap-3">
      <TextComponent className="text-2xl font-extrabold text-zinc-950">
        {status === "submitted" ? "We're checking your details" : canSell ? "You're verified" : "You can host free events"}
      </TextComponent>
      <TextComponent className="text-base leading-6 text-zinc-600">
        {status === "submitted"
          ? "We'll let you know the outcome, usually within a couple of days."
          : canSell
            ? "You can create events and sell tickets. Manage events and payouts on the website."
            : "To sell tickets, finish verifying with your ID and bank details."}
      </TextComponent>
      {status === "approved" && !canSell && (
        <ButtonComponent
          onPress={() => {
            set("plan")("paid");
            setStep("vendorType");
            setUpgrading(true);
          }}
          className="h-12 rounded-full bg-[#00b2ff] py-0"
        >
          Verify to sell tickets
        </ButtonComponent>
      )}
    </View>
  ) : (
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
      <TextComponent className="text-xs font-bold tracking-widest" style={{ color: BRAND.blueDeep }}>
        STEP {index + 1} OF {steps.length}
      </TextComponent>
      <TextComponent className="text-2xl font-extrabold text-zinc-950">{STEP_TITLE[step]}</TextComponent>

      {step === "vendorType" && (
        <>
          <Choice active={form.plan === "free"} title="Free events only" note="Your name, phone and country, and you can start hosting straight away." onPress={() => set("plan")("free")} />
          <Choice active={form.plan === "paid"} title="Sell tickets" note="Full verification with your ID and bank details, checked by our team." onPress={() => set("plan")("paid")} />
          {form.plan === "paid" && (
            <>
              <TextComponent className="mt-1 text-sm font-semibold text-zinc-950">Who runs your events?</TextComponent>
              <Choice active={form.vendorType === "individual"} title="Individual" note="You run events yourself and are paid to a personal account." onPress={() => set("vendorType")("individual")} />
              <Choice active={form.vendorType === "business"} title="Registered business" note="A company runs them and is paid to a business account." onPress={() => set("vendorType")("business")} />
            </>
          )}
          {!!form.plan && (
            <View>
            <InputFieldComponent
              label="Organiser name"
              placeholder={form.vendorType === "business" && !isFree ? "e.g. Afrobeat Live" : "e.g. DJ Kemi"}
              value={form.organiserName}
              onChangeText={set("organiserName")}
            />
            <TextComponent className="mt-1 text-xs text-zinc-500">
              Shown as "Organised by" on your events. A brand or stage name is fine.
            </TextComponent>
            </View>
          )}
        </>
      )}

      {step === "identity" && (
        <>
          <InputFieldComponent label={isFree ? "First name" : "Legal first name"} value={form.legalFirstName} onChangeText={set("legalFirstName")} />
          <InputFieldComponent label={isFree ? "Last name" : "Legal last name"} value={form.legalLastName} onChangeText={set("legalLastName")} />
          <InputFieldComponent label="Phone number" placeholder="+234 801 234 5678" keyboardType="phone-pad" value={form.phoneNumber} onChangeText={set("phoneNumber")} />
          <PickerField label="Country of residence" value={form.countryOfResidence} placeholder="Select a country" onPress={() => setSheet("residence")} />
          {!isFree && (
            <>
              <PickerField
                label="Date of birth"
                value={form.dateOfBirth ? format(form.dateOfBirth, "d MMMM yyyy") : undefined}
                placeholder="Select your birthday"
                onPress={() => setPickingDate(true)}
              />
              <InputFieldComponent label="Residential address" placeholder="House number, street, city" value={form.address} onChangeText={set("address")} />
              <View>
                <TextComponent className="mb-1.5 text-sm font-medium text-black">Government ID</TextComponent>
                <Pressable onPress={() => void pickId()} accessibilityRole="button" className="rounded-xl border border-dashed border-black/20 bg-[#f7f9fc] p-4">
                  <TextComponent className="text-base font-semibold text-zinc-950">
                    {idPhoto ? idPhoto.fileName || "Photo added" : idDocumentId ? "On file. Tap to replace" : "Add a photo"}
                  </TextComponent>
                  <TextComponent className="mt-0.5 text-xs text-zinc-500">
                    Passport, national ID, driver's licence or voter's card. The name and date of birth must match.
                  </TextComponent>
                </Pressable>
              </View>
            </>
          )}
        </>
      )}

      {step === "business" && (
        <>
          <InputFieldComponent label="Registered business name" value={form.businessName} onChangeText={set("businessName")} />
          <InputFieldComponent label="Registration number" placeholder="e.g. RC 1234567" value={form.businessRegistrationNumber} onChangeText={set("businessRegistrationNumber")} />
          <InputFieldComponent label="Authorised representative" value={form.authorizedRepresentative} onChangeText={set("authorizedRepresentative")} />
          <InputFieldComponent label="Registered business address" value={form.businessAddress} onChangeText={set("businessAddress")} />
          <InputFieldComponent label="Tax ID (optional)" value={form.taxId} onChangeText={set("taxId")} />
        </>
      )}

      {step === "payout" && (
        <>
          <PickerField label="Country you're paid in" value={form.payoutCountry} placeholder="Select a country" onPress={() => setSheet("payoutCountry")} />
          {payoutCountry?.stripe && (
            <View className="rounded-2xl p-4" style={{ backgroundColor: BRAND.blueTint }}>
              <TextComponent className="text-sm leading-5 text-zinc-800">
                In {payoutCountry.name} you add your bank with Stripe, on the website, once you're approved.
              </TextComponent>
            </View>
          )}
          {payoutCountry && !payoutCountry.stripe && (
            <>
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
              <View>
                <InputFieldComponent
                  label="Name on the account"
                  value={form.accountHolderName}
                  onChangeText={set("accountHolderName")}
                />
                <TextComponent className="mt-1 text-xs text-zinc-500">
                  {accountName.isFetching ? "Checking with the bank…" : accountName.data ? `The bank says: ${accountName.data}` : "It must be yours or your business's."}
                </TextComponent>
              </View>
            </>
          )}
        </>
      )}

      {step === "review" && (
        <>
          {[
            ["Hosting", isFree ? "Free events only" : "Sell tickets"],
            ["Organiser name", form.organiserName],
            ["Name", `${form.legalFirstName} ${form.legalLastName}`],
            ["Phone", form.phoneNumber],
            ["Country", form.countryOfResidence],
            ...(!isFree && form.vendorType === "business" ? [["Business", form.businessName]] : []),
            ...(!isFree ? [["Paid in", form.payoutCountry]] : [])
          ].map(([label, value]) => (
            <View key={label} className="flex-row justify-between gap-4 border-b border-black/5 py-2.5">
              <TextComponent className="text-sm text-zinc-500">{label}</TextComponent>
              <TextComponent className="flex-1 text-right text-sm font-semibold text-zinc-950">{value}</TextComponent>
            </View>
          ))}
          <Pressable
            onPress={() => set("acceptedTerms")(!form.acceptedTerms)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.acceptedTerms }}
            className="flex-row gap-3 rounded-2xl bg-[#f7f9fc] p-4"
          >
            <View className="mt-0.5 size-5 items-center justify-center rounded" style={{ borderWidth: 2, borderColor: BRAND.blueDeep, backgroundColor: form.acceptedTerms ? BRAND.blueDeep : "transparent" }}>
              {form.acceptedTerms && <TextComponent className="text-xs font-bold text-white">✓</TextComponent>}
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

      <View className="mt-2 flex-row gap-3">
        {index > 0 && (
          <Pressable onPress={() => setStep(steps[index - 1])} accessibilityRole="button" className="h-12 flex-1 items-center justify-center rounded-full border border-black/15">
            <TextComponent className="text-base font-semibold text-zinc-950">Back</TextComponent>
          </Pressable>
        )}
        <View className="flex-1">
          <ButtonComponent onPress={() => void next()} disabled={busy} isLoading={busy} className="h-12 rounded-full bg-[#00b2ff] py-0">
            {step === "review" ? (isFree ? "Start hosting" : "Send for review") : "Continue"}
          </ButtonComponent>
        </View>
      </View>
    </View>
  );

  return (
    <SafeModal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-5 pb-2">
          <TextComponent className="text-base font-bold text-zinc-950">Host on Turnupz</TextComponent>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
            <TextComponent className="text-sm font-semibold" style={{ color: BRAND.blueDeep }}>Close</TextComponent>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
          {verification.isLoading ? <TextComponent className="text-sm text-zinc-500">Loading…</TextComponent> : body}
        </ScrollView>
      </View>

      <DateModalComponent
        visible={pickingDate}
        value={form.dateOfBirth}
        onClose={() => setPickingDate(false)}
        onDateSelected={set("dateOfBirth")}
      />
      <ListSheet
        title={sheet === "bank" ? "Your bank" : "Choose a country"}
        items={
          sheet === "residence"
            ? (markets.data ?? []).map((item) => ({ key: item.name, label: item.name }))
            : sheet === "payoutCountry"
              ? PAYOUT_COUNTRIES.map((item) => ({ key: item.name, label: item.name }))
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
    </SafeModal>
  );
};

export default memo(VendorApplicationScreen);
