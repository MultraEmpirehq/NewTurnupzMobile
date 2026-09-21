import { StyleSheet, Text, View } from "react-native";
import React, { memo } from "react";
import ContainerComponent from "@/shared/components/container/container.component";
import LoggedinHeaderComponent from "@/shared/components/headers/loggedin-header/loggedin-header.component";
import SearchBoxComponent from "../components/search-box/search-box.component";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import TicketListComponent, {
  ETicketStatus
} from "../components/ticket-list/ticket-list.component";
import TabNavComponent from "../components/tab-nav/tab-nav.component";

type TTicketsScreenParamList = {
  all: undefined;
  pending: undefined;
  transferred: undefined;
  past: undefined;
};

const Tab = createMaterialTopTabNavigator<TTicketsScreenParamList>();

const TicketsScreen = () => {
  return (
    <ContainerComponent isSafeAreaView className="">
      <LoggedinHeaderComponent
        title="Tickets"
        className="px-horizontal py-4 pb-2"
      />
      <SearchBoxComponent />
      <ContainerComponent>
        <Tab.Navigator
          screenOptions={{
            lazy: false,
            swipeEnabled: true,
            sceneStyle: {
              backgroundColor: "#ffffff"
            }
          }}
          tabBar={(props) => <TabNavComponent {...props} />}
        >
          <Tab.Screen
            name="all"
            component={() => <TicketListComponent status={ETicketStatus.ALL} />}
            options={{
              tabBarLabel: "All"
            }}
          />
          <Tab.Screen
            name="pending"
            component={() => (
              <TicketListComponent status={ETicketStatus.PENDING} />
            )}
            options={{
              tabBarLabel: "Pending"
            }}
          />
          <Tab.Screen
            name="transferred"
            component={() => (
              <TicketListComponent status={ETicketStatus.TRANSFERRED} />
            )}
            options={{
              tabBarLabel: "Transferred"
            }}
          />
          <Tab.Screen
            name="past"
            component={() => (
              <TicketListComponent status={ETicketStatus.PAST} />
            )}
            options={{
              tabBarLabel: "Past"
            }}
          />
        </Tab.Navigator>
      </ContainerComponent>
    </ContainerComponent>
  );
};

export default memo(TicketsScreen);

const styles = StyleSheet.create({});
