import { FlatList, Pressable, TouchableOpacity, View } from "react-native";
import React, { memo, useEffect, useMemo, useState } from "react";
import ModalLayout from "@/shared/components/modals/modal-layout/modal.layout";
import ContainerComponent from "@/shared/components/container/container.component";
import TextComponent from "@/shared/components/text/text.component";
import { Calendar } from "react-native-calendars";
import { format } from "date-fns";
import { latestAdultBirthDate, toCalendarDay } from "@/shared/utils/age";
import { BRAND } from "@/shared/utils/brand-colors";

/** How far back the year list goes. */
const YEARS_SHOWN = 100;
const YEAR_COLUMNS = 4;
const YEAR_ROW_HEIGHT = 52;
/** With nothing chosen yet, the year list opens around this age. */
const TYPICAL_AGE = 25;

const pad = (value: number) => String(value).padStart(2, "0");

type TStep = "year" | "day";

/**
 * A birthday picker: the month's calendar, with its month and year as a button
 * that opens a grid of years, so a birthday decades back is two taps away
 * rather than hundreds of swipes. Days that would make someone under 18 can't
 * be picked.
 */
const DateModalComponent: React.FC<{
  onDateSelected: (date: Date) => void;
  visible: boolean;
  onClose: () => void;
  /** The date already chosen, to open on. */
  value?: Date | string | null;
}> = ({ onDateSelected, visible, onClose, value }) => {
  const latest = useMemo(() => latestAdultBirthDate(), []);
  const maxYear = latest.getFullYear();
  const years = useMemo(
    () => Array.from({ length: YEARS_SHOWN }, (_, index) => maxYear - index),
    [maxYear]
  );
  const chosen = value ? new Date(value) : null;

  const [step, setStep] = useState<TStep>("day");
  const [year, setYear] = useState(maxYear - (TYPICAL_AGE - 18));
  const [month, setMonth] = useState(latest.getMonth());

  // Each time it opens: on the chosen date's month, or this month some years back.
  useEffect(() => {
    if (!visible) return;
    setStep("day");
    if (chosen && !Number.isNaN(chosen.getTime())) {
      setYear(chosen.getFullYear());
      setMonth(chosen.getMonth());
    } else {
      setYear(maxYear - (TYPICAL_AGE - 18));
      setMonth(latest.getMonth());
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickYear = (picked: number) => {
    setYear(picked);
    // The latest year only goes up to this month.
    if (picked === maxYear && month > latest.getMonth()) setMonth(latest.getMonth());
    setStep("day");
  };

  const yearIndex = Math.max(0, years.indexOf(year));

  return (
    <ModalLayout onClose={onClose} visible={visible} transparent>
      <ContainerComponent className="items-center justify-center">
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={onClose}
          className="absolute inset-0 flex-1 bg-black opacity-50"
        />
        <View className="w-[90%] rounded-2xl bg-white p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <TextComponent className="text-base font-bold text-zinc-950">
              {step === "year" ? "Pick the year" : "Your date of birth"}
            </TextComponent>
            {step === "year" && (
              <Pressable onPress={() => setStep("day")} hitSlop={8} accessibilityRole="button">
                <TextComponent className="text-sm font-semibold" style={{ color: BRAND.blueDeep }}>
                  Back
                </TextComponent>
              </Pressable>
            )}
          </View>

          {step === "year" && (
            <FlatList
              data={years}
              keyExtractor={(item) => String(item)}
              numColumns={YEAR_COLUMNS}
              style={{ height: YEAR_ROW_HEIGHT * 6 }}
              initialScrollIndex={Math.floor(yearIndex / YEAR_COLUMNS)}
              getItemLayout={(_, index) => ({
                length: YEAR_ROW_HEIGHT,
                offset: YEAR_ROW_HEIGHT * Math.floor(index / YEAR_COLUMNS),
                index
              })}
              renderItem={({ item }) => {
                const selected = item === year;
                return (
                  <Pressable
                    onPress={() => pickYear(item)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="m-1 flex-1 items-center justify-center rounded-full"
                    style={{
                      height: YEAR_ROW_HEIGHT - 8,
                      backgroundColor: selected ? BRAND.blueDeep : "#f4f6fa"
                    }}
                  >
                    <TextComponent className={`text-base font-semibold ${selected ? "text-white" : "text-zinc-900"}`}>
                      {item}
                    </TextComponent>
                  </Pressable>
                );
              }}
            />
          )}

          {step === "day" && (
            <Calendar
              key={`${year}-${month}`}
              current={`${year}-${pad(month + 1)}-01`}
              maxDate={toCalendarDay(latest)}
              markedDates={
                chosen && !Number.isNaN(chosen.getTime())
                  ? { [toCalendarDay(chosen)]: { selected: true, selectedColor: BRAND.blueDeep } }
                  : undefined
              }
              // The month and year: tap to pick another year.
              renderHeader={() => (
                <Pressable
                  onPress={() => setStep("year")}
                  accessibilityRole="button"
                  accessibilityLabel={`${format(new Date(year, month, 1), "MMMM yyyy")}, change year`}
                  hitSlop={8}
                  className="rounded-full px-3 py-1.5"
                  style={{ backgroundColor: BRAND.blueTint }}
                >
                  <TextComponent className="text-base font-bold" style={{ color: BRAND.blueDeep }}>
                    {format(new Date(year, month, 1), "MMMM yyyy")} ▾
                  </TextComponent>
                </Pressable>
              )}
              onMonthChange={(changed) => {
                setYear(changed.year);
                setMonth(changed.month - 1);
              }}
              onDayPress={(day) => {
                // Midday local time, so it's the same day in every time zone.
                onDateSelected(new Date(day.year, day.month - 1, day.day, 12));
                onClose();
              }}
            />
          )}
        </View>
      </ContainerComponent>
    </ModalLayout>
  );
};

export default memo(DateModalComponent);
