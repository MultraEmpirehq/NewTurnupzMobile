import React, { memo, useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeModal from "@/shared/components/modals/safe-modal";
import TextComponent from "@/shared/components/text/text.component";
import { BRAND } from "@/shared/utils/brand-colors";
import {
  COUNTRIES,
  PRIORITY_COUNTRY_CODES,
  TCountry
} from "@/shared/utils/countries";

// Where Turnupz runs first, then everyone else A to Z.
const ORDERED: TCountry[] = [
  ...PRIORITY_COUNTRY_CODES.map((code) => COUNTRIES.find((country) => country.code === code)!),
  ...COUNTRIES.filter((country) => !PRIORITY_COUNTRY_CODES.includes(country.code))
];

/** Pick a country from the full list, with a search box. */
const CountryPickerSheet = ({
  visible,
  value,
  onSelect,
  onClose
}: {
  visible: boolean;
  value?: string;
  onSelect: (country: TCountry) => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ORDERED;
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase() === query
    );
  }, [search]);

  const close = () => {
    setSearch("");
    onClose();
  };

  return (
    <SafeModal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable
        className="flex-1"
        style={{ backgroundColor: "rgba(7,20,29,0.45)" }}
        onPress={close}
        accessibilityLabel="Close"
      />
      <View
        className="h-[75%] rounded-t-3xl bg-white px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-zinc-200" />
        <TextComponent className="text-xl font-extrabold text-zinc-950">Your country</TextComponent>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search countries"
          placeholderTextColor="#9aa5b1"
          autoCorrect={false}
          className="mt-3 h-12 rounded-xl bg-[#f7f9fc] px-4 text-base text-black"
        />
        <FlatList
          data={matches}
          keyExtractor={(country) => country.code}
          keyboardShouldPersistTaps="handled"
          className="mt-2"
          ListEmptyComponent={
            <TextComponent className="py-6 text-center text-sm text-zinc-500">
              No country matches “{search.trim()}”
            </TextComponent>
          }
          renderItem={({ item }) => {
            const selected = item.code === value;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  close();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className="flex-row items-center gap-3 rounded-xl px-3 py-3"
                style={selected ? { backgroundColor: BRAND.blueTint } : undefined}
              >
                <TextComponent className="text-xl">{item.flag}</TextComponent>
                <TextComponent className="flex-1 text-base text-zinc-950">{item.name}</TextComponent>
                {selected && (
                  <TextComponent className="text-sm font-bold" style={{ color: BRAND.blueDeep }}>
                    Selected
                  </TextComponent>
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </SafeModal>
  );
};

export default memo(CountryPickerSheet);
