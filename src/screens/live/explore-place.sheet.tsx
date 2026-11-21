import OverlayToast from "@/shared/components/status/toast/overlay-toast";
import { BRAND } from "@/shared/utils/brand-colors";
import React, { memo, useMemo, useState } from "react";
import SafeModal from "@/shared/components/modals/safe-modal";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Path, Svg } from "react-native-svg";
import TextComponent from "@/shared/components/text/text.component";
import { TExplorePlace } from "@/shared/stores/explore-place.store";
import { TLiveLocation } from "./live-api";

/**
 * Picks where Explore looks: everywhere, a country, or one of its cities.
 * Only places with upcoming events are listed, busiest first.
 */

const INK = "#0b1d2a";
const BLUE = "#00b2ff";

const Tick = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path
      d="M5 12.5l4.5 4.5L19 7.5"
      fill="none"
      stroke={BLUE}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const Option = ({
  label,
  count,
  selected,
  indent,
  onPress
}: {
  label: string;
  count?: number;
  selected: boolean;
  indent?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    className="flex-row items-center gap-3 border-b border-black/5 py-3.5"
    style={{ paddingLeft: indent ? 20 : 0 }}
  >
    <TextComponent
      className={
        indent
          ? "flex-1 text-base text-zinc-800"
          : "flex-1 text-base font-semibold text-zinc-950"
      }
      style={selected ? { color: BRAND.link, fontWeight: "700" } : undefined}
    >
      {label}
    </TextComponent>
    {count !== undefined && (
      <TextComponent className="text-xs text-zinc-400">
        {count} {count === 1 ? "event" : "events"}
      </TextComponent>
    )}
    <View className="w-5 items-center">{selected && <Tick />}</View>
  </Pressable>
);

const ExplorePlaceSheet = ({
  visible,
  locations,
  current,
  homeCountryCode,
  onPick,
  onClose
}: {
  visible: boolean;
  locations: TLiveLocation[];
  current: TExplorePlace | null;
  /** The phone's own country, listed first. */
  homeCountryCode?: string;
  onPick: (place: TExplorePlace | null) => void;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();

  const list = useMemo(() => {
    const ordered = [...locations].sort(
      (a, b) =>
        Number(b.countryCode === homeCountryCode) -
          Number(a.countryCode === homeCountryCode) || b.count - a.count
    );
    if (!term) return ordered;
    return ordered
      .map((item) => {
        const countryHit =
          item.country.toLowerCase().includes(term) ||
          item.countryCode.toLowerCase() === term;
        const cities = countryHit
          ? item.cities
          : item.cities.filter((city) =>
              city.name.toLowerCase().includes(term)
            );
        return countryHit || cities.length ? { ...item, cities } : null;
      })
      .filter(Boolean) as TLiveLocation[];
  }, [locations, term, homeCountryCode]);

  const pick = (place: TExplorePlace | null) => {
    setSearch("");
    onPick(place);
    onClose();
  };

  return (
    <SafeModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/40"
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <SafeAreaView
        edges={["bottom"]}
        className="max-h-[80%] rounded-t-3xl bg-white"
      >
        <View className="flex-shrink px-5">
          <View className="items-center pb-3 pt-3">
            <View className="h-1.5 w-10 rounded-full bg-zinc-200" />
          </View>
          <TextComponent className="text-lg font-bold" style={{ color: INK }}>
            Where are you looking?
          </TextComponent>
          <TextComponent className="mb-3 text-sm text-zinc-500">
            Explore's sections show what's on there.
          </TextComponent>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search a country or city"
            placeholderTextColor="#a1a1aa"
            className="mb-1 h-11 rounded-full bg-zinc-100 px-4 text-base text-zinc-950"
            style={{ fontFamily: "PlusJakartaSans-Regular" }}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!term && (
              <Option
                label="Everywhere"
                selected={current === null}
                onPress={() => pick(null)}
              />
            )}
            {list.map((item) => (
              <View key={item.countryCode}>
                <Option
                  label={item.country}
                  count={item.count}
                  selected={
                    current?.countryCode === item.countryCode && !current?.city
                  }
                  onPress={() =>
                    pick({
                      countryCode: item.countryCode,
                      country: item.country
                    })
                  }
                />
                {item.cities.map((city) => (
                  <Option
                    key={city.name}
                    label={city.name}
                    count={city.count}
                    indent
                    selected={
                      current?.countryCode === item.countryCode &&
                      current?.city === city.name
                    }
                    onPress={() =>
                      pick({
                        countryCode: item.countryCode,
                        country: item.country,
                        city: city.name
                      })
                    }
                  />
                ))}
              </View>
            ))}
            {!list.length && (
              <TextComponent className="py-8 text-center text-sm text-zinc-500">
                No upcoming events there yet.
              </TextComponent>
            )}
            <View className="h-6" />
          </ScrollView>
        </View>
      </SafeAreaView>
      <OverlayToast />
    </SafeModal>
  );
};

export default memo(ExplorePlaceSheet);
