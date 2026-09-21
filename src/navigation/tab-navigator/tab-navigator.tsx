import React, { memo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "@/screens/home/screen/refined-home-feed-design.screen";
import TicketsScreen from "@/screens/tickets/screen/tickets.screen";
import FavoritesScreen from "../../screens/favorites/screen/favorites.screen";
import ProfileScreen from "@/screens/profile/screen/profile.screen";
import MessagesScreen from "@/screens/messages/screen/messages.screen";
import BottomTabNavComponent from "@/shared/components/nav/bottom-tab-nav/bottom-tab-nav.component";
import HomeFilledIcon from "@/shared/assets/icons/home-filled.icon";
import HomeOutlineIcon from "@/shared/assets/icons/home-outline.icon";
import TicketFilledIcon from "@/shared/assets/icons/ticket-filled.icon";
import TicketOutlineIcon from "@/shared/assets/icons/ticket-outline.icon";
import MessageFilledIcon from "@/shared/assets/icons/message-filled.icon";
import MessageOutlineIcon from "@/shared/assets/icons/message-outline.icon";
import HeartFilledIcon from "@/shared/assets/icons/heart-filled.icon";
import HeartOutlineIcon from "@/shared/assets/icons/heart-outline.icon";
import UserFilledIcon from "@/shared/assets/icons/user-filled.icon";
import UserOutlineIcon from "@/shared/assets/icons/user-outline.icon";

export type TTabNavigatorParamList = {
  home: undefined;
  tickets: undefined;
  messages: undefined;
  favorites: undefined;
  profile: undefined;
};

const Tab = createBottomTabNavigator<TTabNavigatorParamList>();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabNavComponent {...props} />}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        lazy: false,
        sceneStyle: {
          backgroundColor: "#ffffff"
        }
      }}
      initialRouteName="home"
    >
      <Tab.Screen
        name="home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => {
            if (focused) {
              return <HomeFilledIcon color={color} size={size} />;
            }

            return <HomeOutlineIcon color={color} size={size} />;
          }
        }}
      />
      <Tab.Screen
        name="tickets"
        component={TicketsScreen}
        options={{
          tabBarLabel: "Tickets",
          tabBarIcon: ({ color, size, focused }) => {
            if (focused) {
              return <TicketFilledIcon color={color} size={size} />;
            }

            return <TicketOutlineIcon color={color} size={size} />;
          }
        }}
      />
      <Tab.Screen
        name="messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: "Messages",
          tabBarIcon: ({ color, size, focused }) => {
            if (focused) {
              return <MessageFilledIcon color={color} size={size} />;
            }

            return <MessageOutlineIcon color={color} size={size} />;
          }
        }}
      />
      <Tab.Screen
        name="favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: "Favorites",
          tabBarIcon: ({ color, size, focused }) => {
            if (focused) {
              return <HeartFilledIcon color={color} size={size} />;
            }

            return <HeartOutlineIcon color={color} size={size} />;
          }
        }}
      />
      <Tab.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size, focused }) => {
            if (focused) {
              return <UserFilledIcon color={color} size={size} />;
            }

            return <UserOutlineIcon color={color} size={size} />;
          }
        }}
      />
    </Tab.Navigator>
  );
};

export default memo(TabNavigator);
