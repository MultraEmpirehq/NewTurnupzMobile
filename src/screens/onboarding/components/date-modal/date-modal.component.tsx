import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { memo } from "react";
import ModalLayout from "@/shared/components/modals/modal-layout/modal.layout";
import ContainerComponent from "@/shared/components/container/container.component";
import TextComponent from "@/shared/components/text/text.component";
import { Calendar } from "react-native-calendars";
import { latestAdultBirthDate, toCalendarDay } from "@/shared/utils/age";

const DateModalComponent: React.FC<{
  onDateSelected: (date: Date) => void;
  visible: boolean;
  onClose: () => void;
}> = ({ onDateSelected, visible, onClose }) => {
  return (
    <ModalLayout onClose={onClose} visible={visible} transparent>
      <ContainerComponent className="items-center justify-center">
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={onClose}
          className="absolute inset-0 flex-1 bg-black opacity-50"
        />
        <View className="bg-white rounded-lg p-4 w-[90%]">
          <TextComponent>Select your date of birth</TextComponent>
          <Calendar
            enableSwipeMonths
            // Days that would make you under 18 can't be picked; it opens on the latest allowed month.
            maxDate={toCalendarDay(latestAdultBirthDate())}
            current={toCalendarDay(latestAdultBirthDate())}
            onDayPress={(day) => {
              onDateSelected(new Date(day?.dateString || ""));
              onClose();
            }}
          />
        </View>
      </ContainerComponent>
    </ModalLayout>
  );
};

export default memo(DateModalComponent);

const styles = StyleSheet.create({});
