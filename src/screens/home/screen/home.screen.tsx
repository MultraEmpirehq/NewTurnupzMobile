import { StyleSheet, Text, View, ScrollView } from "react-native";
import React, { memo } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import HeaderComponent from "../component/header/header.component";
import SearchComponent from "../component/search/search.component";
import HappeningTodayComponent from "../component/happening-today/happening-today.component";
import TrendingEventsComponent from "../component/trending-events/trending-events.component";
import UpcomingEventsComponent from "../component/upcoming-events/upcoming-events.component";
import FeaturedVenuesComponent from "../component/featured-venues/featured-venues.component";

const HomeScreen = () => {
  return (
    <ContainerComponent isSafeAreaView className="gap-3">
      <HeaderComponent />
      <SearchComponent />
      <ScrollView
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-horizontal py-4 gap-6"
      >
        <HappeningTodayComponent />
        <TrendingEventsComponent />
        <UpcomingEventsComponent />
        <FeaturedVenuesComponent />
      </ScrollView>
    </ContainerComponent>
  );
};

export default memo(HomeScreen);

const styles = StyleSheet.create({});
