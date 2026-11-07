import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeModal from "@/shared/components/modals/safe-modal";
import TextComponent from "@/shared/components/text/text.component";

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

export default ListSheet;
