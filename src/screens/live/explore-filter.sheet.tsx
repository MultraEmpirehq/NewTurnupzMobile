import OverlayToast from "@/shared/components/status/toast/overlay-toast";
import React, { memo, useEffect, useMemo, useState } from "react";
import { BRAND } from "@/shared/utils/brand-colors";
import SafeModal from "@/shared/components/modals/safe-modal";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import TextComponent from "@/shared/components/text/text.component";
import { TLiveCategory, TLiveLocation, TLiveVenue } from "./live-api";

/**
 * Explore's full filter, back from the app's original design but wired to what
 * the api can actually filter on: when (quick ranges or any dates on a
 * calendar), category, price, venue, and trending / saved / past. Changes are
 * a draft until "Show events", so browsing the options never reloads the list.
 */

const INK = "#0b1d2a";
// Accents are the deeper brand blue (strictly blue, black, white and grey).
const ACCENT = BRAND.blueDeep;
const BLUE = "#00b2ff";

export const WHEN_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "weekend", label: "This weekend" },
  { value: "week", label: "This week" },
  { value: "next-week", label: "Next week" }
] as const;

export type TWhenPreset = (typeof WHEN_OPTIONS)[number]["value"];
/** A preset, one day from the strip (its start-of-day time), or a custom range. */
export type TWhen = TWhenPreset | number | { start: number; end: number };

export type TExploreFilters = {
  when?: TWhen;
  categoryId?: string;
  priceType?: "FREE" | "PAID";
  venue?: TLiveVenue;
  /** A country (and optionally one of its cities) to look in. */
  location?: { countryCode: string; country: string; city?: string };
  trendingOnly: boolean;
  savedOnly: boolean;
  past: boolean;
};

export const EMPTY_FILTERS: TExploreFilters = {
  trendingOnly: false,
  savedOnly: false,
  past: false
};

/** How many of the sheet's filters are on, for the badge on its button. */
export const countFilters = (filters: TExploreFilters) =>
  [
    filters.when !== undefined,
    filters.categoryId,
    filters.priceType,
    filters.venue,
    filters.location,
    filters.trendingOnly,
    filters.savedOnly,
    filters.past
  ].filter(Boolean).length;

const toKey = (time: number) => {
  const date = new Date(time);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
};

const fromKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
};

const Section = ({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View className="gap-3 border-b border-black/5 px-5 py-5">
    <TextComponent className="text-[11px] font-bold tracking-widest text-zinc-500">
      {title.toUpperCase()}
    </TextComponent>
    {children}
  </View>
);

const Option = ({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    className="rounded-full px-4 py-2"
    style={{
      backgroundColor: active ? INK : "#f4f5f8",
      borderWidth: 1,
      borderColor: active ? INK : "transparent"
    }}
  >
    <TextComponent
      className="text-sm font-medium"
      style={{ color: active ? "#ffffff" : INK }}
    >
      {label}
    </TextComponent>
  </Pressable>
);

/** Long lists start short; "See all" opens the rest. A picked option always shows. */
const COLLAPSED_COUNT = 6;

function CappedOptions<T>({
  items,
  keyOf,
  labelOf,
  isActive,
  onPick,
  anyLabel,
  anyActive,
  onAny
}: {
  items: T[];
  keyOf: (item: T) => string;
  labelOf: (item: T) => string;
  isActive: (item: T) => boolean;
  onPick: (item: T) => void;
  anyLabel: string;
  anyActive: boolean;
  onAny: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hidden = items.length - COLLAPSED_COUNT;
  const shown = expanded
    ? items
    : [
        ...items.slice(0, COLLAPSED_COUNT),
        // Keep a selection made from the full list visible when collapsed.
        ...items.slice(COLLAPSED_COUNT).filter(isActive)
      ];
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        <Option label={anyLabel} active={anyActive} onPress={onAny} />
        {shown.map((item) => (
          <Option
            key={keyOf(item)}
            label={labelOf(item)}
            active={isActive(item)}
            onPress={() => onPick(item)}
          />
        ))}
      </View>
      {hidden > 0 && (
        <Pressable
          onPress={() => setExpanded((current) => !current)}
          accessibilityRole="button"
          hitSlop={8}
          className="self-start"
        >
          <TextComponent
            className="text-sm font-semibold"
            style={{ color: BLUE }}
          >
            {expanded ? "Show less" : `See all ${items.length}`}
          </TextComponent>
        </Pressable>
      )}
    </View>
  );
}

const ToggleRow = ({
  label,
  hint,
  value,
  onChange
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) => (
  <View className="flex-row items-center gap-3">
    <View className="flex-1">
      <TextComponent className="text-base font-semibold text-zinc-950">
        {label}
      </TextComponent>
      <TextComponent className="text-xs text-zinc-500">{hint}</TextComponent>
    </View>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: BLUE, false: "#e4e4e7" }}
      thumbColor="#ffffff"
    />
  </View>
);

type TExploreFilterSheetProps = {
  visible: boolean;
  value: TExploreFilters;
  categories: TLiveCategory[];
  venues: TLiveVenue[];
  /** Countries and cities with upcoming events; the section hides when empty. */
  locations: TLiveLocation[];
  /** Saved events need an account; the toggle hides without one. */
  canShowSaved: boolean;
  onApply: (filters: TExploreFilters) => void;
  onClose: () => void;
};

const ExploreFilterSheet: React.FC<TExploreFilterSheetProps> = ({
  visible,
  value,
  categories,
  venues,
  locations,
  canShowSaved,
  onApply,
  onClose
}) => {
  const [draft, setDraft] = useState<TExploreFilters>(value);
  const [showCalendar, setShowCalendar] = useState(false);

  // Each opening starts from what's applied.
  useEffect(() => {
    if (visible) {
      setDraft(value);
      setShowCalendar(typeof value.when === "object" && value.when !== null);
    }
  }, [visible, value]);

  const set = (changes: Partial<TExploreFilters>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const custom =
    typeof draft.when === "object" && draft.when !== null
      ? draft.when
      : undefined;

  // The calendar's highlighted range, start to end.
  const markedDates = useMemo(() => {
    if (!custom) return {};
    const marks: Record<string, object> = {};
    const day = 24 * 60 * 60 * 1000;
    for (let time = custom.start; time <= custom.end; time += day) {
      const key = toKey(time);
      marks[key] = {
        color: time === custom.start || time === custom.end ? BLUE : "#d6f1ff",
        textColor:
          time === custom.start || time === custom.end ? "#ffffff" : INK,
        startingDay: time === custom.start,
        endingDay: time === custom.end
      };
    }
    return marks;
  }, [custom]);

  // First tap sets the start; the next sets the end (or restarts if earlier).
  const pickDay = (day: DateData) => {
    const time = fromKey(day.dateString);
    if (!custom || custom.start !== custom.end) {
      set({ when: { start: time, end: time } });
    } else if (time < custom.start) {
      set({ when: { start: time, end: time } });
    } else {
      set({ when: { start: custom.start, end: time } });
    }
  };

  const today = toKey(Date.now());

  return (
    <SafeModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
        <View className="flex-row items-center justify-between border-b border-black/5 px-5 py-4">
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <TextComponent className="text-base text-zinc-500">
              Close
            </TextComponent>
          </Pressable>
          <TextComponent className="text-lg font-bold text-zinc-950">
            Filter
          </TextComponent>
          <Pressable
            onPress={() => {
              setDraft(EMPTY_FILTERS);
              setShowCalendar(false);
            }}
            hitSlop={10}
            accessibilityRole="button"
          >
            <TextComponent
              className="text-base font-semibold"
              style={{ color: ACCENT }}
            >
              Reset
            </TextComponent>
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="pb-6">
          <Section title="When">
            <View className="flex-row flex-wrap gap-2">
              <Option
                label="Any time"
                active={draft.when === undefined}
                onPress={() => {
                  set({ when: undefined });
                  setShowCalendar(false);
                }}
              />
              {WHEN_OPTIONS.map((option) => (
                <Option
                  key={option.value}
                  label={option.label}
                  active={draft.when === option.value}
                  onPress={() => {
                    set({ when: option.value });
                    setShowCalendar(false);
                  }}
                />
              ))}
              <Option
                label="Pick dates"
                active={showCalendar}
                onPress={() => setShowCalendar(true)}
              />
            </View>
            {showCalendar && (
              <View className="gap-2">
                <Calendar
                  minDate={draft.past ? undefined : today}
                  maxDate={draft.past ? today : undefined}
                  markingType="period"
                  markedDates={markedDates}
                  onDayPress={pickDay}
                  theme={{
                    todayTextColor: ACCENT,
                    arrowColor: BLUE,
                    textDayFontFamily: "PlusJakartaSans-Regular",
                    textMonthFontFamily: "PlusJakartaSans-Bold",
                    textDayHeaderFontFamily: "PlusJakartaSans-Medium"
                  }}
                />
                <TextComponent className="text-center text-xs text-zinc-500">
                  {custom
                    ? custom.start === custom.end
                      ? "Tap another day to make it a range."
                      : "Tap a day to start again."
                    : "Tap a start day, then an end day."}
                </TextComponent>
              </View>
            )}
          </Section>

          {locations.length > 0 && (
            <Section title="Location">
              <CappedOptions
                items={locations}
                keyOf={(item) => item.countryCode}
                labelOf={(item) => `${item.country} (${item.count})`}
                isActive={(item) =>
                  draft.location?.countryCode === item.countryCode
                }
                onPick={(item) =>
                  set({
                    location:
                      draft.location?.countryCode === item.countryCode
                        ? undefined
                        : {
                            countryCode: item.countryCode,
                            country: item.country
                          }
                  })
                }
                anyLabel="Anywhere"
                anyActive={!draft.location}
                onAny={() => set({ location: undefined })}
              />
              {(() => {
                const picked = locations.find(
                  (item) => item.countryCode === draft.location?.countryCode
                );
                if (!picked || picked.cities.length < 2) return null;
                return (
                  <View className="gap-2">
                    <TextComponent className="text-xs font-semibold text-zinc-500">
                      City in {picked.country}
                    </TextComponent>
                    <CappedOptions
                      items={picked.cities}
                      keyOf={(item) => item.name}
                      labelOf={(item) => `${item.name} (${item.count})`}
                      isActive={(item) => draft.location?.city === item.name}
                      onPick={(item) =>
                        set({
                          location: {
                            countryCode: picked.countryCode,
                            country: picked.country,
                            city:
                              draft.location?.city === item.name
                                ? undefined
                                : item.name
                          }
                        })
                      }
                      anyLabel="All cities"
                      anyActive={!draft.location?.city}
                      onAny={() =>
                        set({
                          location: {
                            countryCode: picked.countryCode,
                            country: picked.country
                          }
                        })
                      }
                    />
                  </View>
                );
              })()}
            </Section>
          )}

          {categories.length > 0 && (
            <Section title="Category">
              <CappedOptions
                items={categories}
                keyOf={(item) => item.id}
                labelOf={(item) => item.name}
                isActive={(item) => draft.categoryId === item.id}
                onPick={(item) =>
                  set({
                    categoryId:
                      draft.categoryId === item.id ? undefined : item.id
                  })
                }
                anyLabel="All"
                anyActive={!draft.categoryId}
                onAny={() => set({ categoryId: undefined })}
              />
            </Section>
          )}

          <Section title="Price">
            <View className="flex-row flex-wrap gap-2">
              <Option
                label="Any price"
                active={!draft.priceType}
                onPress={() => set({ priceType: undefined })}
              />
              <Option
                label="Free"
                active={draft.priceType === "FREE"}
                onPress={() => set({ priceType: "FREE" })}
              />
              <Option
                label="Paid"
                active={draft.priceType === "PAID"}
                onPress={() => set({ priceType: "PAID" })}
              />
            </View>
          </Section>

          {venues.length > 0 && (
            <Section title="Venue">
              <CappedOptions
                items={venues}
                keyOf={(item) => item.id}
                labelOf={(item) => item.name}
                isActive={(item) => draft.venue?.id === item.id}
                onPick={(item) =>
                  set({ venue: draft.venue?.id === item.id ? undefined : item })
                }
                anyLabel="Any venue"
                anyActive={!draft.venue}
                onAny={() => set({ venue: undefined })}
              />
            </Section>
          )}

          <Section title="Show">
            <View className="gap-5">
              <ToggleRow
                label="Trending only"
                hint="What's getting the most attention right now."
                value={draft.trendingOnly}
                onChange={(trendingOnly) => set({ trendingOnly })}
              />
              {canShowSaved && (
                <ToggleRow
                  label="Saved only"
                  hint="Events you've hearted."
                  value={draft.savedOnly}
                  onChange={(savedOnly) => set({ savedOnly })}
                />
              )}
              <ToggleRow
                label="Past events"
                hint="Look back at what's already happened."
                value={draft.past}
                onChange={(past) =>
                  // Dates picked for upcoming events don't carry over to past ones.
                  set({ past, when: undefined })
                }
              />
            </View>
          </Section>
        </ScrollView>

        <View className="border-t border-black/5 px-5 pb-2 pt-3">
          <Pressable
            onPress={() => onApply(draft)}
            accessibilityRole="button"
            className="h-12 items-center justify-center rounded-full"
            style={{ backgroundColor: BLUE }}
          >
            <TextComponent className="text-base font-bold text-white">
              Show events
              {countFilters(draft) > 0
                ? ` · ${countFilters(draft)} ${countFilters(draft) === 1 ? "filter" : "filters"}`
                : ""}
            </TextComponent>
          </Pressable>
        </View>
      </SafeAreaView>
      <OverlayToast />
    </SafeModal>
  );
};

export default memo(ExploreFilterSheet);
