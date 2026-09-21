import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import FullNameComponent from "../full-name/full-name.component";
import UsernameComponent from "../username/username.component";
import GenderComponent from "../gender/gender.component";
import DateOfBirthComponent from "../date-of-birth/date-of-birth.component";

const SlideContentComponent = () => {
  return (
    <ContainerComponent className="px-horizontal">
      <FullNameComponent />
      <UsernameComponent />
      <DateOfBirthComponent />
      <GenderComponent />
    </ContainerComponent>
  );
};

export default memo(SlideContentComponent);

const styles = StyleSheet.create({});
