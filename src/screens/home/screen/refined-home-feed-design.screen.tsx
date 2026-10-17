import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { ImageSource } from "expo-image";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Circle, Path, Rect, Svg } from "react-native-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import ContainerComponent from "@/shared/components/container/container.component";
import TextComponent from "@/shared/components/text/text.component";
import MessageIcon from "@/shared/assets/icons/message.icon";
import SendIcon from "@/shared/assets/icons/send.icon";
import HeartOutlineIcon from "@/shared/assets/icons/heart-outline.icon";
import UserOutlineIcon from "@/shared/assets/icons/user-outline.icon";
import HomeIcon from "@/shared/assets/icons/home.icon";
import SearchIcon from "@/shared/assets/icons/search.icon";
import CopyIcon from "@/shared/assets/icons/copy.icon";
import CircleExclamationIcon from "@/shared/assets/icons/circle-exclamation.icon";
import CheckIcon from "@/shared/assets/icons/check.icon";
import ChevronLeftIcon from "@/shared/assets/icons/chevron-left.icon";
import LocationIcon from "@/shared/assets/icons/location.icon";
import GlobalChartImage from "@/shared/assets/images/Top Charts/Global/Global.png";
import AfricanChartImage from "@/shared/assets/images/Top Charts/Africa/African.png";
import AsianChartImage from "@/shared/assets/images/Top Charts/Asian/Asian.png";
import NorthAmericanChartImage from "@/shared/assets/images/Top Charts/north america/North American.png";
import EuropeanChartImage from "@/shared/assets/images/Top Charts/European/European.png";
import SouthAmericanChartImage from "@/shared/assets/images/Top Charts/South American/South American.png";
import AustralianChartImage from "@/shared/assets/images/Top Charts/Australian/Australian.png";
import { TEventDetailsType } from "@/shared/utils/types";
import { create } from "zustand";
import TurnupzWordmark from "@/shared/assets/images/turnupz.png blue.png";
import GalleryActionIcon from "@/shared/assets/images/gallery-action-icon.png";
import ContactAccessHero from "@/shared/assets/images/contact-access-hero.png";
import EmptyChatHero from "@/shared/assets/images/empty-chat-hero.png";
import EmptyWalletHero from "@/shared/assets/images/empty-wallet-hero.png";
import GenericSuccessHero from "@/shared/assets/images/generic-success-hero.png";
import AddContactNetworkBanner from "@/shared/assets/images/add-contact-network-banner.png";
import { onError, onInfo, onSuccess } from "@/shared/components/status/toast";
import { useAccessibilityStore } from "@/shared/stores/accessibility.store";
import { useWalletStore } from "@/shared/stores/wallet.store";
import {
  createOrganizerConversationDraft,
  getEventPublicUrl
} from "@/screens/home/service/event-actions.service";
import {
  formatEventClock,
  formatEventDay
} from "@/shared/utils/event-time";
import LiveEventDetailScreen from "@/screens/live/event-detail.screen";
import LiveTicketCheckoutScreen from "@/screens/live/ticket-checkout.screen";
import LiveMyTicketsScreen from "@/screens/live/my-tickets.screen";
import LiveExploreScreen from "@/screens/live/explore.screen";
import ProfileScreen from "@/screens/profile/profile.screen";
import NotificationsScreen from "@/screens/notifications/notifications.screen";
import ChatsScreen from "@/screens/chat/chats.screen";
import PeopleModal from "@/screens/people/people-modal";
import { useUnreadNotifications } from "@/screens/notifications/notifications-api";
import EventOptionsSheet, {
  TEventOptionsTarget
} from "@/screens/live/event-options.sheet";
import { useHiddenEventsStore } from "@/shared/stores/hidden-events.store";
import useUserStore from "@/shared/stores/user.store";
import { PerformerProfileScreen as LivePerformerProfileScreen } from "@/screens/live/explore-details";
import BrandRefreshList, {
  TBrandRefreshListHandle
} from "@/shared/components/brand-refresh/brand-refresh-list.component";
import BrandLoader from "@/shared/components/brand-loader/brand-loader.component";
import EventTicketCard, {
  TICKET_LIST_BACKGROUND
} from "@/screens/live/event-ticket-card";
import {
  eventPlace,
  TLiveEvent,
  useLiveEvents
} from "@/screens/live/live-api";

type TFeedMediaKind = "image" | "video";
type TMediaSource = string | number | ImageSource;
type TExploreMode =
  | "feed"
  | "charts"
  | "chart-detail"
  | "map"
  | "filter"
  | "event-list"
  | "venue-list"
  | "planner-list"
  | "venue-detail"
  | "planner-detail";

type TFeedEvent = Omit<TEventDetailsType, "date"> & {
  date: Date;
  organizerName: string;
  venueName: string;
  venueAddress: string;
  mediaKind?: TFeedMediaKind;
  /** Set on live events; times then read on the venue's clock. */
  timezone?: string;
  /** The event's category name, shown as a tag on the card's poster. */
  category?: string;
  /** Saved by the signed-in person (live events). */
  isFavorite?: boolean;
};

type TBottomNavId =
  "home" | "search" | "tickets" | "messages" | "favorites" | "profile";

type TBottomNavItem = {
  id: TBottomNavId;
  label: string;
  renderIcon: (color: string) => React.ReactNode;
};

type TTopChart = {
  id: string;
  title: string;
  subtitle: string;
  image: TMediaSource;
};

type TPerformerFilter =
  | "All Performers"
  | "DJs"
  | "Producers"
  | "Artists"
  | "Comedy"
  | "Live Band"
  | "Public Speaker";

type TPerformer = {
  id: string;
  name: string;
  role: string;
  events: number;
  avatar: string | null;
};

type TBookingType = "ticket" | "register" | "external";

type TPerformerEvent = {
  id: string;
  title: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  image: string;
  status: string;
  bookingType: TBookingType;
};

type TBookedTicketCategory = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

type TBookedEvent = {
  id: string;
  event: TPerformerEvent;
  kind: "ticket" | "registration";
  categories: TBookedTicketCategory[];
  bookedAt: string;
};

type TTicketTransfer = {
  id: string;
  bookingId: string;
  categoryId: string;
  event: TPerformerEvent;
  categoryName: string;
  ticketNumber: number;
  recipient: string;
  recipientIsUser: boolean;
  status: "waiting" | "accepted" | "rejected";
};

type TPrototypeSocialState = {
  followedPerformers: TPerformer[];
  followedLocations: TVenue[];
  followedPlanners: TEventPlanner[];
  savedEvents: TFeedEvent[];
  hiddenEventIds: string[];
  blockedUserIds: string[];
  subscribedEventIds: string[];
  togglePerformer: (performer: TPerformer) => void;
  toggleLocation: (venue: TVenue) => void;
  togglePlanner: (planner: TEventPlanner) => void;
  toggleSavedEvent: (event: TFeedEvent) => void;
  toggleHiddenEvent: (eventId: string) => void;
  toggleBlockedUser: (userId: string) => void;
  toggleEventSubscription: (eventId: string) => void;
  subscribeToEvent: (eventId: string) => void;
};

const usePrototypeSocialStore = create<TPrototypeSocialState>((set) => ({
  followedPerformers: [],
  followedLocations: [],
  followedPlanners: [],
  savedEvents: [],
  hiddenEventIds: [],
  blockedUserIds: [],
  subscribedEventIds: [],
  togglePerformer: (performer) =>
    set((state) => ({
      followedPerformers: state.followedPerformers.some(
        (item) => item.id === performer.id
      )
        ? state.followedPerformers.filter((item) => item.id !== performer.id)
        : [...state.followedPerformers, performer]
    })),
  toggleLocation: (venue) =>
    set((state) => ({
      followedLocations: state.followedLocations.some(
        (item) => item.id === venue.id
      )
        ? state.followedLocations.filter((item) => item.id !== venue.id)
        : [...state.followedLocations, venue]
    })),
  togglePlanner: (planner) =>
    set((state) => ({
      followedPlanners: state.followedPlanners.some(
        (item) => item.id === planner.id
      )
        ? state.followedPlanners.filter((item) => item.id !== planner.id)
        : [...state.followedPlanners, planner]
    })),
  toggleSavedEvent: (event) =>
    set((state) => ({
      savedEvents: state.savedEvents.some((item) => item.id === event.id)
        ? state.savedEvents.filter((item) => item.id !== event.id)
        : [...state.savedEvents, event]
    })),
  toggleHiddenEvent: (eventId) =>
    set((state) => ({
      hiddenEventIds: state.hiddenEventIds.includes(eventId)
        ? state.hiddenEventIds.filter((id) => id !== eventId)
        : [...state.hiddenEventIds, eventId]
    })),
  toggleBlockedUser: (userId) =>
    set((state) => ({
      blockedUserIds: state.blockedUserIds.includes(userId)
        ? state.blockedUserIds.filter((id) => id !== userId)
        : [...state.blockedUserIds, userId]
    })),
  toggleEventSubscription: (eventId) =>
    set((state) => ({
      subscribedEventIds: state.subscribedEventIds.includes(eventId)
        ? state.subscribedEventIds.filter((id) => id !== eventId)
        : [...state.subscribedEventIds, eventId]
    })),
  subscribeToEvent: (eventId) =>
    set((state) => ({
      subscribedEventIds: state.subscribedEventIds.includes(eventId)
        ? state.subscribedEventIds
        : [...state.subscribedEventIds, eventId]
    }))
}));

type TExploreCategory = (typeof CATEGORIES)[number];

type TExploreEvent = {
  id: string;
  title: string;
  venue: string;
  location: string;
  time: string;
  image: string;
  badge?: string;
};

type TEventPlanner = {
  id: string;
  name: string;
  location: string;
  specialty: string;
  events: string;
  image: string;
};

type TCalendarEvent = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  date: Date;
  image?: string;
  sourceEvent: TPerformerEvent;
};

type TBlogPost = {
  title: string;
  category: string;
  image: string;
  text: string;
};

type TChatMode =
  | "list"
  | "access"
  | "contacts"
  | "new-group"
  | "add-contact"
  | "success"
  | "thread"
  | "settings"
  | "story-compose"
  | "story-view"
  | "story-profile"
  | "story-insights"
  | "story-settings"
  | "story-hide-contacts";

type TEventShareIntent = "organizer" | "community" | "conversation";

type TChatContact = {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  online?: boolean;
};

type TInviteTarget = {
  id: string;
  name: string;
  phone?: string;
};

type TConversation = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  avatar: string;
  unread?: number;
  kind: "private" | "user-group" | "event-group";
  members?: number;
  isCreator?: boolean;
};

type TChatMessage = {
  id: string;
  text: string;
  mine: boolean;
  time: string;
  attachmentUri?: string;
  attachmentType?: "image" | "video" | "document";
  attachmentName?: string;
};

type TVenue = {
  id: string;
  title: string;
  location: string;
  image: string;
  capacity: string;
  rating: string;
  activeEvents: string;
  concessions: string;
  wifi: string;
};

const FEED_EVENTS: TFeedEvent[] = [
  {
    id: "nexus-club-summer-set",
    name: "Lagos Summer Concert Series",
    date: new Date("2026-10-01T20:00:00"),
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    medias: [
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80"
    ],
    totalTickets: 800,
    organizerName: "Nexus Live",
    venueName: "The Arena",
    venueAddress: "Downtown",
    mediaKind: "image",
    venue: {
      id: "arena",
      name: "The Arena",
      address: "Downtown",
      totalAvailableSeat: 800,
      images: []
    }
  },
  {
    id: "urban-gallery-private-viewing",
    name: "Urban Gallery Private Viewing",
    date: new Date("2026-10-04T19:00:00"),
    image:
      "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=1200&q=80",
    medias: [
      "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=1200&q=80"
    ],
    totalTickets: 120,
    organizerName: "Urban Gallery",
    venueName: "The Warehouse",
    venueAddress: "Arts District",
    mediaKind: "image",
    venue: {
      id: "warehouse",
      name: "The Warehouse",
      address: "Arts District",
      totalAvailableSeat: 120,
      images: []
    }
  },
  {
    id: "neon-sky-lounge",
    name: "Neon Sky Lounge",
    date: new Date("2026-10-11T22:00:00"),
    image:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    medias: [
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80"
    ],
    totalTickets: 240,
    organizerName: "Neon Sky",
    venueName: "Skyline Terrace",
    venueAddress: "Marina District",
    mediaKind: "video",
    venue: {
      id: "skyline-terrace",
      name: "Skyline Terrace",
      address: "Marina District",
      totalAvailableSeat: 240,
      images: []
    }
  }
];

const SHARE_TARGETS = [
  {
    id: "mira",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "ade",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "zoe",
    image:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "jay",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "nia",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80"
  }
];

const CATEGORIES = [
  "All",
  "Music",
  "Food",
  "Sports",
  "Art",
  "Conference",
  "Religious"
];

const EXPLORE_EVENTS_BY_CATEGORY: Record<string, TExploreEvent[]> = {
  All: [
    {
      id: "summer-solstice",
      title: "Summer Solstice Festival",
      venue: "Sunset Park",
      location: "Manhattan",
      time: "Today, 06:00 PM",
      badge: "Selling Soon",
      image:
        "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "abstract-visions",
      title: "Abstract Visions Gala",
      venue: "The White Cube Gallery",
      location: "Arts Quarter",
      time: "Today, 08:30 PM",
      badge: "Exclusive",
      image:
        "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "neon-pulse",
      title: "Lagos Startup Summit",
      venue: "Landmark Centre",
      location: "Victoria Island",
      time: "Today, 10:00 AM",
      badge: "Live Now",
      image:
        "https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=900&q=80"
    }
  ],
  Music: [
    {
      id: "lagos-freedom",
      title: "Lagos Freedom Fest 2024",
      venue: "Eko Hotel",
      location: "Victoria Island",
      time: "10:00 PM - 2:00 AM",
      badge: "Happening Now",
      image:
        "https://images.unsplash.com/photo-1507901747481-84a4f64fda6d?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "chocolate-city",
      title: "Chocolate City Unsigned",
      venue: "Lagos Travel Inn",
      location: "Ikeja",
      time: "10:00 AM",
      badge: "In 8 Hours",
      image:
        "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "bassline-sessions",
      title: "Bassline Sessions",
      venue: "Harbour Stage",
      location: "Lekki",
      time: "Today, 09:00 PM",
      image:
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80"
    }
  ],
  Food: [
    {
      id: "taste-market",
      title: "Taste Market Weekend",
      venue: "Open Yard",
      location: "Lekki Phase 1",
      time: "Today, 04:00 PM",
      badge: "Family Friendly",
      image:
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "burger-fair",
      title: "Burger & Grill Fair",
      venue: "Food Court",
      location: "Victoria Island",
      time: "Today, 06:30 PM",
      badge: "Popular",
      image:
        "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "street-bites",
      title: "Street Bites Night",
      venue: "Market Square",
      location: "Yaba",
      time: "Today, 07:00 PM",
      image:
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80"
    }
  ],
  Sports: [
    {
      id: "city-5k",
      title: "City Lights 5K",
      venue: "Freedom Park",
      location: "Lagos Island",
      time: "Today, 05:00 PM",
      badge: "Open Entry",
      image:
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "court-night",
      title: "City Hoops Finals",
      venue: "Arena Court",
      location: "Surulere",
      time: "Today, 08:00 PM",
      badge: "Finals",
      image:
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "beach-volley",
      title: "Beach Volley Social",
      venue: "Shoreline Courts",
      location: "Oniru",
      time: "Today, 03:00 PM",
      image:
        "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=80"
    }
  ],
  Art: [
    {
      id: "gallery-crawl",
      title: "Gallery Crawl Lagos",
      venue: "The White Cube Gallery",
      location: "Ikoyi",
      time: "Today, 06:00 PM",
      badge: "Curated",
      image:
        "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "canvas-night",
      title: "Canvas & Cocktails",
      venue: "Studio 14",
      location: "Victoria Island",
      time: "Today, 07:30 PM",
      badge: "Few Seats",
      image:
        "https://images.unsplash.com/photo-1545987796-200677ee1011?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: "design-forum",
      title: "Design Forum Live",
      venue: "Creative Hall",
      location: "Yaba",
      time: "Today, 05:30 PM",
      image:
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80"
    }
  ]
};

const TOP_CHARTS: TTopChart[] = [
  {
    id: "global",
    title: "Global",
    subtitle: "Global Top 100",
    image: GlobalChartImage
  },
  {
    id: "african",
    title: "African",
    subtitle: "African Top 100",
    image: AfricanChartImage
  },
  {
    id: "asian",
    title: "Asian",
    subtitle: "Asian Top 100",
    image: AsianChartImage
  },
  {
    id: "north-american",
    title: "North American",
    subtitle: "North American Top 100",
    image: NorthAmericanChartImage
  },
  {
    id: "european",
    title: "European",
    subtitle: "European Top 100",
    image: EuropeanChartImage
  },
  {
    id: "south-american",
    title: "South American",
    subtitle: "South American Top 100",
    image: SouthAmericanChartImage
  },
  {
    id: "australian",
    title: "Australian",
    subtitle: "Australian Top 100",
    image: AustralianChartImage
  }
];

const PERFORMER_FILTERS: TPerformerFilter[] = [
  "All Performers",
  "DJs",
  "Producers",
  "Artists",
  "Comedy",
  "Live Band",
  "Public Speaker"
];

const PERFORMER_FILTER_LIBRARY: Record<
  TPerformerFilter,
  {
    names: string[];
    roles: string[];
    avatars: string[];
    eventStart: number;
  }
> = {
  "All Performers": {
    names: [
      "Kemi Adé",
      "Elena Rose",
      "Marcus K.",
      "Zara Moon",
      "The Nomads",
      "Luna Bliss",
      "Astro Beat",
      "Nova Saints",
      "Kairo Flux",
      "Maya Vale"
    ],
    roles: ["Vocalist", "Soul Artist", "Live Band", "Comedian", "Speaker"],
    avatars: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=180&q=80"
    ],
    eventStart: 96
  },
  DJs: {
    names: [
      "DJ Vector",
      "Kairo Flux",
      "Nova Pulse",
      "Mira Decks",
      "Tempo Saint",
      "Apex Stereo",
      "Luca Bass",
      "Vera Mix"
    ],
    roles: ["DJ", "Club DJ", "Afro House DJ", "Electronic DJ"],
    avatars: [
      "https://images.unsplash.com/photo-1549213783-8284d0336c4f?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1524650359799-842906ca1c06?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=180&q=80"
    ],
    eventStart: 104
  },
  Producers: {
    names: [
      "Astro Beat",
      "The Signal Lab",
      "Mason Keys",
      "Echo Forge",
      "Nia Tempo",
      "Studio Vale",
      "Orbit Sound",
      "Luxe Frequency"
    ],
    roles: ["Producer", "Beat Maker", "Sound Designer", "Music Director"],
    avatars: [
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=180&q=80"
    ],
    eventStart: 91
  },
  Artists: {
    names: [
      "Elena Rose",
      "Luna Bliss",
      "Maya Vale",
      "Aria Stone",
      "Zion Grey",
      "Noa Bloom",
      "Jules Aire",
      "Sola Ray"
    ],
    roles: ["Vocalist", "Recording Artist", "Soul Artist", "Performer"],
    avatars: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=180&q=80"
    ],
    eventStart: 88
  },
  Comedy: {
    names: [
      "Tobi Laughs",
      "Mara Quick",
      "Jason Punchline",
      "Amaka Set",
      "Noah Mic",
      "Ruby Riff",
      "Kelvin Crowd",
      "Sasha Jest"
    ],
    roles: ["Comedian", "Stand-up Comic", "Comedy Host", "Improv Artist"],
    avatars: [
      "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1522556189639-b150ed9c4330?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=180&q=80"
    ],
    eventStart: 82
  },
  "Live Band": {
    names: [
      "The Nomads",
      "Velvet Brass",
      "Midnight Strings",
      "Pulse Avenue",
      "The Blue Set",
      "Solar Choir",
      "Riverline Band",
      "Cedar Sound"
    ],
    roles: ["Live Band", "Jazz Band", "Afro Fusion Band", "Acoustic Band"],
    avatars: [
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=180&q=80"
    ],
    eventStart: 93
  },
  "Public Speaker": {
    names: [
      "Dr. Ava North",
      "Marcus K.",
      "Nora Summit",
      "Elliot Cole",
      "Grace Forum",
      "Tariq Prime",
      "Mina Keynote",
      "Leo Stage"
    ],
    roles: ["Public Speaker", "Keynote Speaker", "Panel Host", "Workshop Lead"],
    avatars: [
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=180&q=80",
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=180&q=80"
    ],
    eventStart: 79
  }
};

const createTopPerformers = (
  chartId: string,
  filter: TPerformerFilter
): TPerformer[] => {
  const source = PERFORMER_FILTER_LIBRARY[filter];
  const chartOffset = TOP_CHARTS.findIndex((chart) => chart.id === chartId) * 3;

  return Array.from({ length: 100 }, (_, index) => ({
    id: `${chartId}-${filter.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
    name: source.names[(index + chartOffset) % source.names.length],
    role: source.roles[(index + chartOffset) % source.roles.length],
    events: Math.max(7, source.eventStart - index - chartOffset),
    avatar: source.avatars[(index + chartOffset) % source.avatars.length]
  }));
};

const VENUES_NEAR_YOU: TVenue[] = [
  {
    id: "grand-stadium",
    title: "The Grand Stadium",
    location: "London, IK",
    capacity: "80,000",
    rating: "4.8",
    activeEvents: "12+",
    concessions: "45",
    wifi: "Free",
    image:
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "velvet-lounge",
    title: "Velvet Lounge",
    location: "Victoria Island",
    capacity: "900",
    rating: "4.7",
    activeEvents: "8",
    concessions: "12",
    wifi: "Free",
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "aura-arena",
    title: "Aura Arena",
    location: "Downtown",
    capacity: "6,500",
    rating: "4.6",
    activeEvents: "15",
    concessions: "24",
    wifi: "Free",
    image:
      "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=600&q=80"
  }
];

const EVENT_PLANNERS: TEventPlanner[] = [
  {
    id: "pulse-experiences",
    name: "Pulse Experiences",
    location: "Lagos, Nigeria",
    specialty: "Concerts & live music",
    events: "24 upcoming events",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "city-social",
    name: "City Social Events",
    location: "Abuja, Nigeria",
    specialty: "Festivals & community",
    events: "12 upcoming events",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "after-dark",
    name: "Open Arts Collective",
    location: "London, UK",
    specialty: "Arts & culture",
    events: "9 upcoming events",
    image:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80"
  }
];

const VENUE_EVENTS: TExploreEvent[] = [
  {
    id: "manchester-derby-live-finals",
    title: "Manchester Derby: Live Finals",
    venue: "The Grand Stadium",
    location: "Football",
    time: "Oct 24 - 19:30 PM",
    badge: "Available",
    image:
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "neon-nights-electric-festival",
    title: "Neon Nights: Electric Festival",
    venue: "The Grand Stadium",
    location: "Concert",
    time: "Oct 26 - 16:00 PM",
    badge: "Selling Fast",
    image:
      "https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "world-tour-skyline",
    title: "The World Tour: Skyline",
    venue: "The Grand Stadium",
    location: "Concert",
    time: "Oct 28 - 20:00 PM",
    badge: "Sold Out",
    image:
      "https://images.unsplash.com/photo-1507901747481-84a4f64fda6d?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "national-athletics-qualifier",
    title: "National Athletics Qualifier",
    venue: "The Grand Stadium",
    location: "Sports",
    time: "Oct 30 - 09:00 AM",
    badge: "Available",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80"
  }
];

const FEATURED_EVENTS = [
  {
    id: "electric-dreams",
    title: "Electric Dreams World Tour",
    meta: "Sat, Nov 24 - Olympic Plaza",
    image:
      "https://images.unsplash.com/photo-1507901747481-84a4f64fda6d?auto=format&fit=crop&w=900&q=80"
  }
];

const PERFORMER_EVENTS: TPerformerEvent[] = [
  {
    id: "neon-pulse-festival",
    title: "Neon Pulse Festival",
    venue: "O2 Academy",
    location: "London",
    date: "Oct 24",
    time: "8:00 PM",
    status: "Available",
    bookingType: "ticket",
    image:
      "https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "underground-echoes",
    title: "Underground Echoes",
    venue: "The Warehouse",
    location: "Berlin",
    date: "Nov 02",
    time: "11:00 PM",
    status: "Selling Fast",
    bookingType: "external",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "winter-solstice",
    title: "Winter Solstice Tour",
    venue: "North America Tour",
    location: "Multiple Cities",
    date: "Dec 15",
    time: "7:00 PM",
    status: "Register",
    bookingType: "register",
    image:
      "https://images.unsplash.com/photo-1507901747481-84a4f64fda6d?auto=format&fit=crop&w=900&q=80"
  }
];

const MAP_EVENTS = [
  {
    id: "vibe-night",
    title: "Jazz in the Park",
    venue: "The Glass House",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=500&q=80",
    style: { left: "55%" as const, top: "42%" as const }
  },
  {
    id: "burger-stadium",
    title: "Burger Stadium",
    venue: "Food Court",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=500&q=80",
    style: { left: "64%" as const, top: "33%" as const }
  },
  {
    id: "fashion-district",
    title: "Fashion District",
    venue: "Market Hall",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=500&q=80",
    style: { left: "37%" as const, top: "58%" as const }
  },
  {
    id: "music-yard",
    title: "Open Decks",
    venue: "Music Yard",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=500&q=80",
    style: { left: "23%" as const, top: "28%" as const }
  }
];

const FILTER_CATEGORIES = [
  "All",
  "Music",
  "Comedy",
  "Arts",
  "Food",
  "Tech",
  "Sports"
];

const FILTER_TIMES = ["All", "Today", "Tomorrow", "This Weekend"];

const CHAT_STORIES: TChatContact[] = [
  {
    id: "sarah",
    name: "Sarah L.",
    subtitle: "Online",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
    online: true
  },
  {
    id: "marc",
    name: "Marc J.",
    subtitle: "Online",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "elena",
    name: "Elena R.",
    subtitle: "Away",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80"
  }
];

const CHAT_CONVERSATIONS: TConversation[] = [
  {
    id: "warehouse-rave",
    title: "Tech Fest Crew",
    subtitle: "Who's bringing the extra power banks tomorrow?",
    time: "12:45 PM",
    avatar:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=160&q=80",
    unread: 3,
    kind: "user-group",
    members: 9,
    isCreator: true
  },
  {
    id: "midnight",
    title: "Saturday Run Club",
    subtitle: "Alex: See you guys at the main entrance.",
    time: "10:20 AM",
    avatar:
      "https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=160&q=80",
    kind: "user-group",
    members: 12,
    isCreator: false
  },
  {
    id: "sarah",
    title: "Sarah Jenkins",
    subtitle: "That talk was brilliant!",
    time: "Yesterday",
    avatar: CHAT_STORIES[0].avatar,
    unread: 1,
    kind: "private"
  },
  {
    id: "sunset",
    title: "Sunset Food Festival",
    subtitle: "You: Sent a photo",
    time: "Yesterday",
    avatar:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=160&q=80",
    kind: "event-group",
    members: 24500,
    isCreator: false
  },
  {
    id: "techno",
    title: "Techno Tuesday",
    subtitle: "Marcus: Any ticket updates?",
    time: "Mon",
    avatar:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=160&q=80",
    kind: "private"
  },
  {
    id: "calabar-official",
    title: "Calabar Carnival 2024 Official",
    subtitle: "Official updates after your registration.",
    time: "Sun",
    avatar: PERFORMER_EVENTS[0].image,
    kind: "event-group",
    members: 24500,
    isCreator: false
  }
];

const INVITE_CONTACTS = [
  { id: "aaron", name: "Aaron Smith", phone: "+1 (555) 012-3456" },
  { id: "alice", name: "Alice Walker", phone: "+1 (555) 987-6543" },
  { id: "ben", name: "Ben Butler", phone: "+1 (555) 234-5678" },
  { id: "beth", name: "Beth Grant", phone: "+1 (555) 345-6789" },
  { id: "carlos", name: "Carlos Casillas", phone: "+1 (555) 456-7890" }
];

const ACTIVE_NAV_COLOR = "#00B2FF";
/** How many events the home feed fetches at a time. */
const HOME_FEED_BATCH = 10;
const INACTIVE_NAV_COLOR = "#27272a";

/** The bottom bar is icons only (labels are an accessibility option). */
const NAV_ICON_SIZE = 27;

const BOTTOM_NAV_ITEMS: TBottomNavItem[] = [
  {
    id: "home",
    label: "Home",
    renderIcon: (color) => <HomeIcon size={NAV_ICON_SIZE} color={color} />
  },
  {
    id: "search",
    label: "Explore",
    renderIcon: (color) => <SearchIcon size={NAV_ICON_SIZE} color={color} />
  },
  {
    id: "messages",
    label: "Messages",
    renderIcon: (color) => <MessageIcon size={NAV_ICON_SIZE} color={color} />
  },
  {
    id: "favorites",
    label: "Notifications",
    renderIcon: (color) => <HeartOutlineIcon size={NAV_ICON_SIZE} color={color} />
  },
  {
    id: "profile",
    label: "Profile",
    renderIcon: (color) => <UserOutlineIcon size={NAV_ICON_SIZE} color={color} />
  }
];

const formatEventDate = (date: Date, timezone?: string) => {
  // Live events carry their zone, so they read on the venue's clock.
  if (timezone) {
    return `${formatEventDay(date, timezone, { withYear: false })} at ${formatEventClock(date, timezone)}`;
  }
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  return `${weekday}, ${month} ${day} at ${time}`;
};

const getEventCountdown = (event: TExploreEvent, index = 0) => {
  if (index === 0 || event.badge?.toLowerCase().includes("now")) {
    return "Happening now";
  }

  if (event.badge?.toLowerCase().includes("hour")) {
    return `Happening in ${event.badge.toLowerCase().replace("in ", "")}`;
  }

  return index === 1 ? "Happening in 8 hours" : "Happening soon";
};

const matchesSearch = (query: string, values: Array<string | undefined>) => {
  const term = query.trim().toLowerCase();

  if (!term) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(term));
};

const toFeedEvent = (event: TExploreEvent, index = 0): TFeedEvent => {
  const date = new Date();
  date.setHours(date.getHours() + index * 4);

  return {
    id: event.id,
    name: event.title,
    date,
    image: event.image,
    medias: [event.image],
    totalTickets: 200,
    organizerName: event.venue,
    venueName: event.venue,
    venueAddress: event.location,
    mediaKind: "image",
    venue: {
      id: `${event.id}-venue`,
      name: event.venue,
      address: event.location,
      totalAvailableSeat: 200,
      images: [event.image]
    }
  };
};

const toBookingEvent = (event: TFeedEvent): TPerformerEvent => {
  const performerEvent = PERFORMER_EVENTS.find((item) => item.id === event.id);

  if (performerEvent) {
    return performerEvent;
  }

  const venueEventIndex = VENUE_EVENTS.findIndex(
    (item) => item.id === event.id
  );
  const venueEvent = VENUE_EVENTS[venueEventIndex];

  if (venueEvent) {
    return {
      id: venueEvent.id,
      title: venueEvent.title,
      venue: venueEvent.venue,
      location: venueEvent.location,
      date: venueEvent.time.split(" - ")[0] || "Oct 24",
      time: venueEvent.time.split(" - ")[1] || "8:00 PM",
      image: venueEvent.image,
      status: venueEvent.badge || "Available",
      bookingType:
        venueEventIndex === 1
          ? "external"
          : venueEventIndex === 2
            ? "register"
            : "ticket"
    };
  }

  return {
    id: event.id,
    title: event.name,
    venue: event.venueName,
    location: event.venueAddress,
    date: event.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    }),
    time: event.date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    }),
    image: event.medias?.[0] || event.image,
    status: "Available",
    bookingType: "ticket"
  };
};

const toFeedMediaEvent = (event: TPerformerEvent): TFeedEvent => ({
  id: event.id,
  name: event.title,
  date: new Date(`${event.date} 2026 ${event.time}`),
  image: event.image,
  medias: [event.image],
  totalTickets: 200,
  organizerName: event.venue,
  venueName: event.venue,
  venueAddress: event.location,
  mediaKind: "image",
  venue: {
    id: `${event.id}-venue`,
    name: event.venue,
    address: event.location,
    totalAvailableSeat: 200,
    images: [event.image]
  }
});

/** A live event in the shape the feed card draws. */
const toLiveFeedEvent = (event: TLiveEvent): TFeedEvent => ({
  id: event.id,
  name: event.name,
  date: new Date(event.date),
  image: event.image ?? "",
  medias: [event.image, ...(event.medias ?? [])].filter(Boolean) as string[],
  totalTickets: 0,
  organizerName: event.organizerName ?? "",
  venueName: eventPlace(event),
  venueAddress: event.venue?.address ?? "",
  mediaKind: "image",
  timezone: event.timezone,
  category: event.category?.name,
  isFavorite: event.isFavorite,
  description: event.description,
  venue: {
    id: event.venue?.id ?? `${event.id}-venue`,
    name: event.venue?.name ?? eventPlace(event),
    address: event.venue?.address ?? "",
    totalAvailableSeat: 0,
    images: event.image ? [event.image] : []
  }
});

const PreviewBottomNav = ({
  activeTab,
  onTabPress,
  unreadNotifications = 0
}: {
  activeTab: TBottomNavId;
  onTabPress: (tab: TBottomNavId) => void;
  /** Shows a blue dot on the notifications tab. */
  unreadNotifications?: number;
}) => {
  const buttonLabels = useAccessibilityStore((state) => state.buttonLabels);
  const screenReaderHints = useAccessibilityStore(
    (state) => state.screenReaderHints
  );
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  return (
    <View
      className={
        highContrast
          ? buttonLabels
            ? "h-[76px] flex-row items-center justify-between border-t-2 border-white bg-black px-3"
            : "h-[68px] flex-row items-center justify-around border-t-2 border-white bg-black px-2"
          : buttonLabels
            ? "h-[76px] flex-row items-center justify-between border-t border-zinc-200 bg-white px-3"
            : "h-[68px] flex-row items-center justify-around border-t border-zinc-200 bg-white px-2"
      }
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        const color = isActive
          ? highContrast
            ? "#38bdf8"
            : ACTIVE_NAV_COLOR
          : highContrast
            ? "#ffffff"
            : INACTIVE_NAV_COLOR;

        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={
              item.id === "favorites" && unreadNotifications > 0
                ? `${item.label}, ${unreadNotifications} unread`
                : item.label
            }
            accessibilityHint={
              screenReaderHints ? `Opens the ${item.label} section` : undefined
            }
            accessibilityState={{ selected: isActive }}
            onPress={() => onTabPress(item.id)}
            className={
              buttonLabels
                ? "h-14 min-w-14 items-center justify-center"
                : "size-14 items-center justify-center rounded-full"
            }
          >
            <View>
              {item.renderIcon(color)}
              {item.id === "favorites" && unreadNotifications > 0 && (
                <View
                  className="absolute -right-1 -top-0.5 size-2.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: "#0577FA" }}
                />
              )}
            </View>
            {/* Icons only: a dot marks where you are. */}
            {!buttonLabels && (
              <View
                className="mt-1 size-1.5 rounded-full"
                style={{ backgroundColor: isActive ? color : "transparent" }}
              />
            )}
            {buttonLabels && (
              <TextComponent
                className={
                  highContrast
                    ? isActive
                      ? "mt-1 text-[10px] font-bold text-sky-300"
                      : "mt-1 text-[10px] text-white"
                    : isActive
                      ? "mt-1 text-[10px] font-bold text-primary"
                      : "mt-1 text-[10px] text-zinc-500"
                }
              >
                {item.label}
              </TextComponent>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const SectionHeader = ({
  title,
  action,
  onActionPress
}: {
  title: string;
  action?: string;
  onActionPress?: () => void;
}) => {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <TextComponent className="text-sm font-bold text-primary">
        {title}
      </TextComponent>
      {action && (
        <Pressable onPress={onActionPress}>
          <TextComponent className="text-xs font-semibold text-primary">
            {action}
          </TextComponent>
        </Pressable>
      )}
    </View>
  );
};

const getMediaSource = (image: TMediaSource) => {
  return typeof image === "string" ? { uri: image } : image;
};

const FilterSlidersIcon = ({
  size = 20,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7H13" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M17 7H20" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={15} cy={7} r={2} stroke={color} strokeWidth={2} />
      <Path d="M4 17H7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M11 17H20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={9} cy={17} r={2} stroke={color} strokeWidth={2} />
    </Svg>
  );
};

const StarVectorIcon = ({
  size = 20,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3.8L14.5 8.9L20.1 9.7L16.1 13.6L17 19.2L12 16.5L7 19.2L7.9 13.6L3.9 9.7L9.5 8.9L12 3.8Z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  </Svg>
);

const TicketVectorIcon = ({
  size = 20,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 7H19V10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14V17H5V14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10V7Z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Path d="M10 8V16" stroke={color} strokeWidth={2} strokeDasharray="2 2" />
  </Svg>
);

const ForkKnifeVectorIcon = ({
  size = 20,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7 4V20" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M5 4V9" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M9 4V9" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M5 9H9" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path
      d="M16 4C18 5.5 19 7.5 19 10.5V20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path d="M15 12H19" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const WifiVectorIcon = ({
  size = 20,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 10C9.2 6.8 14.8 6.8 19 10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M8 13C10.4 11.2 13.6 11.2 16 13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Circle cx={12} cy={17} r={1.5} fill={color} />
  </Svg>
);

const AccessibleVectorIcon = ({
  size = 18,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={5} r={2} stroke={color} strokeWidth={2} />
    <Path d="M12 8V14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M8 11H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path
      d="M11 14L8 20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M13 14L16 20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const ParkingVectorIcon = ({
  size = 18,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 20V4H13.5C16.5 4 18.5 5.8 18.5 8.5C18.5 11.2 16.5 13 13.5 13H10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRightVectorIcon = ({
  size = 16,
  color = "#71717a"
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 6L15 12L9 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CalendarVectorIcon = ({
  size = 16,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7 4V7" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M17 4V7" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path
      d="M5 8H19V19H5V8Z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Path d="M5 12H19" stroke={color} strokeWidth={2} />
  </Svg>
);

const ClockVectorIcon = ({
  size = 16,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={2} />
    <Path
      d="M12 8V12L15 14"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const GroupVectorIcon = ({
  size = 16,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={9} cy={9} r={3} stroke={color} strokeWidth={2} />
    <Circle cx={17} cy={10} r={2} stroke={color} strokeWidth={2} />
    <Path
      d="M4 19C4.7 16.7 6.4 15.5 9 15.5C11.6 15.5 13.3 16.7 14 19"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M14.5 16C16.6 16.1 18.1 17.1 19 19"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const BellVectorIcon = ({
  size = 18,
  color = ACTIVE_NAV_COLOR
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 17H18L16.5 15V11C16.5 8.2 14.7 6 12 6C9.3 6 7.5 8.2 7.5 11V15L6 17Z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Path
      d="M10 19C10.4 20 11.1 20.5 12 20.5C12.9 20.5 13.6 20 14 19"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const ChartRegionIcon = ({
  chartId,
  size = 14,
  color = "#ffffff"
}: {
  chartId: string;
  size?: number;
  color?: string;
}) => {
  if (chartId === "global") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={2} />
        <Path d="M4 12H20" stroke={color} strokeWidth={2} />
        <Path
          d="M12 4C14 6.2 15 8.9 15 12C15 15.1 14 17.8 12 20C10 17.8 9 15.1 9 12C9 8.9 10 6.2 12 4Z"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (chartId === "asian") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={2} />
        <Path
          d="M12 6L14 12L12 18L10 12L12 6Z"
          fill={color}
          stroke={color}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (chartId === "north-american" || chartId === "south-american") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 19V9L12 5L19 9V19"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M8 19V12H16V19"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (chartId === "australian") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 18L9 7L13 18L9 15L5 18Z"
          fill={color}
          stroke={color}
          strokeLinejoin="round"
        />
        <Path
          d="M13 18L16 9L19 18L16 16L13 18Z"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4L20 20H4L12 4Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M8 15H16" stroke={color} strokeWidth={2} />
    </Svg>
  );
};

const SmallMediaCard = ({
  image,
  title,
  icon
}: {
  image: TMediaSource;
  title: string;
  icon?: React.ReactNode;
}) => {
  return (
    <View className="mr-3 w-[124px] overflow-hidden rounded-md bg-zinc-900">
      <View className="relative aspect-square">
        <CustomImage
          className="size-full"
          imageClassName="size-full"
          source={getMediaSource(image)}
          contentFit="cover"
        />
        <View className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1">
          <View className="flex-row items-center gap-1">
            {icon}
            <TextComponent
              numberOfLines={1}
              className="flex-1 text-[10px] font-semibold text-white"
            >
              {title}
            </TextComponent>
          </View>
        </View>
      </View>
    </View>
  );
};

const ChartTitle = ({ chart }: { chart: TTopChart }) => {
  return (
    <View className="flex-row items-center gap-2">
      <ChartRegionIcon chartId={chart.id} size={16} />
      <TextComponent
        numberOfLines={1}
        className="flex-1 text-sm font-bold text-white"
      >
        {chart.title}
      </TextComponent>
    </View>
  );
};

const SearchHeader = ({
  placeholder,
  onBack,
  query,
  onQueryChange
}: {
  placeholder: string;
  onBack: () => void;
  query?: string;
  onQueryChange?: (value: string) => void;
}) => {
  useHardwareBack(onBack);
  const [internalQuery, setInternalQuery] = useState("");
  const value = query ?? internalQuery;
  const handleQueryChange = onQueryChange ?? setInternalQuery;

  return (
    <View className="border-b border-zinc-100 bg-white px-4 py-3">
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          className="size-9 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <View className="h-10 flex-1 flex-row items-center rounded-xl bg-zinc-100 px-3">
          <SearchIcon size={16} color="#8a8f98" />
          <TextInput
            value={value}
            onChangeText={handleQueryChange}
            placeholder={placeholder}
            placeholderTextColor="#8a8f98"
            className="ml-2 flex-1 p-0 text-xs text-zinc-700 outline-none"
          />
        </View>
      </View>
    </View>
  );
};

const TopPerformersChartsScreen = ({
  onBack,
  onSelectChart
}: {
  onBack: () => void;
  onSelectChart: (chart: TTopChart) => void;
}) => {
  useHardwareBack(onBack);
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 380;
  const horizontalPadding = isCompactPhone ? 12 : 16;
  const calendarInnerWidth = Math.min(width, 430) - horizontalPadding * 4;
  const dayCellWidth = Math.max(34, calendarInnerWidth / 7);
  const heroHeight = isCompactPhone ? 118 : 138;
  const charts = TOP_CHARTS;

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
        <Pressable onPress={onBack} className="size-9 items-center justify-center"><ChevronLeftIcon size={18} color="#52525b" /></Pressable>
        <View className="flex-1" /><View className="size-9" />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-6 pt-5"
      >
        <TextComponent className="text-2xl font-bold text-zinc-950">
          Top Performers
        </TextComponent>
        <TextComponent className="mt-1 text-sm text-zinc-600">
          Explore trending talent by region
        </TextComponent>
        <View className="mt-6 flex-row flex-wrap gap-3">
          {charts.map((chart) => (
            <Pressable
              key={chart.id}
              accessibilityRole="button"
              accessibilityLabel={`${chart.title} chart`}
              onPress={() => onSelectChart(chart)}
              className="w-[47%] overflow-hidden rounded-xl bg-zinc-900"
            >
              <View className="relative aspect-square">
                <CustomImage
                  className="size-full"
                  imageClassName="size-full"
                  source={getMediaSource(chart.image)}
                  contentFit="cover"
                />
                <View className="absolute inset-0 justify-end bg-black/20 p-3">
                  <ChartTitle chart={chart} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const PerformerAvatar = ({
  avatar,
  size = 42
}: {
  avatar: string | null;
  size?: number;
}) => {
  if (!avatar) {
    return (
      <View
        className="items-center justify-center rounded-md bg-zinc-100"
        style={{ height: size, width: size }}
      >
        <UserOutlineIcon size={20} color="#a1a1aa" />
      </View>
    );
  }

  return (
    <CustomImage
      className="rounded-md"
      imageClassName="size-full rounded-md"
      source={{ uri: avatar }}
      contentFit="cover"
      style={{ height: size, width: size }}
    />
  );
};

const PodiumPerformer = ({
  performer,
  rank,
  featured = false
}: {
  performer: TPerformer;
  rank: number;
  featured?: boolean;
}) => {
  return (
    <View className="items-center">
      <View
        className={
          featured
            ? "rounded-lg border-4 border-sky-400 p-1"
            : "rounded-lg border-2 border-zinc-300 p-1"
        }
      >
        <PerformerAvatar avatar={performer.avatar} size={featured ? 104 : 72} />
      </View>
      <View
        className={
          featured
            ? "-mt-4 size-9 items-center justify-center rounded-full bg-sky-400"
            : "-mt-3 size-7 items-center justify-center rounded-full bg-zinc-100"
        }
      >
        <TextComponent
          className={
            featured
              ? "text-sm font-bold text-white"
              : "text-[10px] font-bold text-zinc-700"
          }
        >
          {rank}
        </TextComponent>
      </View>
      <TextComponent
        numberOfLines={1}
        className={
          featured
            ? "mt-3 text-xl font-bold text-primary"
            : "mt-3 text-base font-bold text-zinc-950"
        }
      >
        {performer.name}
      </TextComponent>
      <TextComponent className="mt-1 text-sm font-bold text-primary">
        {performer.events} Events
      </TextComponent>
    </View>
  );
};

const PerformerProfileScreen = ({
  performer,
  onBack,
  onOpenEvent
}: {
  performer: TPerformer;
  onBack: () => void;
  onOpenEvent: (event: TPerformerEvent) => void;
}) => {
  useHardwareBack(onBack);
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 380;
  const horizontalPadding = isCompactPhone ? 12 : 16;
  const calendarInnerWidth = Math.min(width, 430) - horizontalPadding * 4;
  const dayCellWidth = Math.max(34, calendarInnerWidth / 7);
  const heroHeight = isCompactPhone ? 118 : 138;
  const [query, setQuery] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const followedPerformers = usePrototypeSocialStore(
    (state) => state.followedPerformers
  );
  const togglePerformer = usePrototypeSocialStore(
    (state) => state.togglePerformer
  );
  const isFollowing = followedPerformers.some(
    (item) => item.id === performer.id
  );
  const events = useMemo(
    () =>
      PERFORMER_EVENTS.filter((event) =>
        matchesSearch(query, [
          event.title,
          event.venue,
          event.location,
          event.status
        ])
      ),
    [query]
  );
  const calendarEvents = useMemo(
    () =>
      PERFORMER_EVENTS.map((event, index) => ({
        id: event.id,
        title: event.title,
        subtitle: `${event.date} - ${event.venue} - ${event.time}`,
        status: event.status,
        date:
          index === 0
            ? new Date(2024, 9, 15)
            : index === 1
              ? new Date(2024, 10, 2)
              : new Date(2024, 11, 15),
        image: event.image,
        sourceEvent: event
      })),
    []
  );

  if (showCalendar) {
    return (
      <CalendarScheduleScreenV2
        title={`${performer.name} - Calendar`}
        subtitle="Modern hub for live appearances"
        image={PERFORMER_EVENTS[0].image}
        events={calendarEvents}
        onOpenEvent={onOpenEvent}
        onBack={() => setShowCalendar(false)}
      />
    );
  }

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
        <Pressable onPress={onBack} className="size-9 items-center justify-center"><ChevronLeftIcon size={18} color="#52525b" /></Pressable>
        <TextComponent className="flex-1 text-center font-bold">Performer</TextComponent><View className="size-9" />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-6"
      >
        <View className="h-[300px]">
          <CustomImage
            className="size-full"
            imageClassName="size-full"
            source={{ uri: PERFORMER_EVENTS[0].image }}
            contentFit="cover"
          />
        </View>
        <View className="-mt-16 mx-4 rounded-xl bg-white p-4 shadow">
          <View className="flex-row">
            <View className="flex-1">
              <TextComponent className="text-2xl font-bold text-primary">
                {performer.name}
              </TextComponent>
              <TextComponent className="text-xs font-semibold text-zinc-700">
                {performer.role}
              </TextComponent>
            </View>
            <View className="items-end gap-2">
              <Pressable onPress={() => togglePerformer(performer)} className={isFollowing ? "h-11 items-center justify-center rounded-lg border border-primary bg-white px-6" : "h-11 items-center justify-center rounded-lg bg-primary px-6"}><TextComponent className={isFollowing ? "font-bold text-primary" : "font-bold text-white"}>{isFollowing ? "Following" : "Follow"}</TextComponent></Pressable>
              <Pressable onPress={() => onInfo(`Opening a private chat with ${performer.name}`)} className="size-10 items-center justify-center rounded-lg bg-blue-50"><MessageIcon size={18} color={ACTIVE_NAV_COLOR} /></Pressable>
            </View>
          </View>
          <TextComponent className="mt-3 text-sm leading-5 text-zinc-600">
            {performer.name} is a multi-instrumentalist and producer known for
            immersive event experiences and rhythmic stage energy.
          </TextComponent>
          <View className="mt-4 flex-row gap-8">
            <View>
              <TextComponent className="text-lg font-bold text-zinc-950">
                {performer.events}
              </TextComponent>
              <TextComponent className="text-[10px] text-zinc-500">
                Events
              </TextComponent>
            </View>
          </View>
        </View>

        <View className="mt-5 px-4">
          <View className="mb-4 h-11 flex-row items-center rounded-xl bg-white px-3 shadow-sm">
            <SearchIcon size={16} color="#8a8f98" /><TextInput value={query} onChangeText={setQuery} placeholder="Search this performer's events" placeholderTextColor="#8a8f98" className="ml-2 flex-1 text-xs outline-none" />
          </View>
          <View className="mb-3 flex-row justify-between">
            <View>
              <TextComponent className="text-base font-bold text-primary">
                Upcoming Appearances
              </TextComponent>
              <TextComponent className="text-xs text-zinc-500">
                Experience the best in live performance
              </TextComponent>
            </View>
            <Pressable onPress={() => setShowCalendar(true)}>
              <TextComponent className="text-xs font-semibold text-primary">
                View Calendar
              </TextComponent>
            </Pressable>
          </View>
          {events.map((event) => (
            <Pressable
              key={event.id}
              onPress={() => onOpenEvent(event)}
              className="mb-3 rounded-xl bg-white p-4 shadow"
            >
              <View className="flex-row justify-between">
                <View className="flex-1">
                  <TextComponent className="font-bold text-zinc-950">
                    {event.title}
                  </TextComponent>
                  <TextComponent className="mt-1 text-xs text-zinc-600">
                    {event.date} • {event.venue}, {event.location}
                  </TextComponent>
                  <TextComponent className="mt-1 text-xs text-zinc-600">
                    {event.time}
                  </TextComponent>
                </View>
                <View
                  className={
                    event.bookingType === "external"
                      ? "self-start rounded-full bg-sky-100 px-3 py-1"
                      : "self-start rounded-full bg-green-100 px-3 py-1"
                  }
                >
                  <TextComponent
                    className={
                      event.bookingType === "external"
                        ? "text-[10px] font-bold text-sky-700"
                        : "text-[10px] font-bold text-green-700"
                    }
                  >
                    {event.status}
                  </TextComponent>
                </View>
              </View>
            </Pressable>
          ))}

          <View className="mt-4 rounded-xl bg-primary p-6">
            <TextComponent className="text-[10px] font-bold uppercase text-blue-100">
              Featured Tour
            </TextComponent>
            <TextComponent className="mt-3 text-2xl font-bold text-white">
              Winter Solstice Tour
            </TextComponent>
            <TextComponent className="mt-2 text-sm text-blue-50">
              15 dates across North America and Europe starting this December.
            </TextComponent>
            <Pressable
              onPress={() => onOpenEvent(PERFORMER_EVENTS[2])}
              className="mt-5 h-11 self-start rounded-lg bg-white px-5 items-center justify-center"
            >
              <TextComponent className="font-bold text-primary">
                Get Early Access
              </TextComponent>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const ArticleDetailScreen = ({
  post,
  event,
  onBack
}: {
  post: TBlogPost;
  event: TPerformerEvent;
  onBack: () => void;
}) => {
  useHardwareBack(onBack);
  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="pb-8"
    >
      <View className="h-12 flex-row items-center border-b border-zinc-100 px-3">
        <Pressable
          onPress={onBack}
          className="size-9 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
      </View>
      <CustomImage
        className="h-56 w-full"
        imageClassName="size-full"
        source={{ uri: post.image }}
        contentFit="cover"
      />
      <View className="px-4 pt-4">
        <View className="self-start rounded-full bg-blue-50 px-3 py-1">
          <TextComponent className="text-[10px] font-bold text-primary">
            {post.category}
          </TextComponent>
        </View>
        <TextComponent className="mt-3 text-xl font-bold text-zinc-950">
          {post.title}
        </TextComponent>
        <TextComponent className="mt-2 text-xs text-zinc-500">
          By Stella - 6 min read
        </TextComponent>
        <TextComponent className="mt-5 text-sm leading-6 text-zinc-700">
          {post.text} This feature looks at the colour, sound, movement, and
          traditions behind {event.title}. From the opening parade to the final
          night performances, guests experience a layered celebration shaped by
          music, costume, food, and community.
        </TextComponent>
        <TextComponent className="mt-5 text-base font-bold text-zinc-950">
          The Rhythm of the Streets
        </TextComponent>
        <CustomImage
          className="mt-3 h-48 w-full rounded-lg"
          imageClassName="size-full rounded-lg"
          source={{ uri: event.image }}
          contentFit="cover"
        />
        <TextComponent className="mt-4 text-sm leading-6 text-zinc-700">
          Each segment of the event gives visitors a new view of the venue,
          performers, and audience energy. It is built for discovery, sharing,
          and returning to the event page when the guest is ready to book.
        </TextComponent>

        <TextComponent className="mt-6 text-base font-bold text-zinc-950">
          More For You
        </TextComponent>
        {[1, 2].map((item) => (
          <View key={item} className="mt-3 flex-row rounded-lg bg-zinc-50 p-2">
            <CustomImage
              className="h-16 w-20 rounded-md"
              imageClassName="size-full rounded-md"
              source={{ uri: item === 1 ? event.image : post.image }}
              contentFit="cover"
            />
            <View className="ml-3 flex-1 justify-center">
              <TextComponent className="text-xs font-bold text-zinc-950">
                {item === 1
                  ? "Highlights Before The Main Event"
                  : "Top Local Experiences To Try"}
              </TextComponent>
              <TextComponent className="mt-1 text-[10px] text-zinc-500">
                4 min read
              </TextComponent>
            </View>
          </View>
        ))}
        <Pressable
          onPress={onBack}
          className="mt-6 h-11 items-center justify-center rounded-lg bg-primary"
        >
          <TextComponent className="font-bold text-white">
            Back to Feed
          </TextComponent>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const EventBookingDetailScreen = ({
  event,
  onBack,
  onTicket,
  onRegister,
  onShareEvent,
  onContactOrganizer
}: {
  event: TPerformerEvent;
  onBack: () => void;
  onTicket: () => void;
  onRegister: () => void;
  onShareEvent?: (event: TFeedEvent) => void;
  onContactOrganizer?: (event: TFeedEvent) => void;
}) => {
  useHardwareBack(onBack);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "Overview" | "Media" | "Activities" | "Blogs"
  >("Overview");
  const [showAllPerformers, setShowAllPerformers] = useState(false);
  const [expandedMedia, setExpandedMedia] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<TBlogPost | null>(null);
  const subscribedEventIds = usePrototypeSocialStore((state) => state.subscribedEventIds);
  const toggleEventSubscription = usePrototypeSocialStore((state) => state.toggleEventSubscription);
  const isSubscribed = subscribedEventIds.includes(event.id);
  const isExternal = event.bookingType === "external";
  const isRegister = event.bookingType === "register";
  const tabs = ["Overview", "Media", "Activities", "Blogs"] as const;
  const mediaItems = [
    event.image,
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1507901747481-84a4f64fda6d?auto=format&fit=crop&w=900&q=80"
  ];
  const blogPosts: TBlogPost[] = [
    {
      title: "The Legacy of Africa's Biggest Street Party",
      category: "Cultural Heritage",
      image: event.image,
      text: "Discover the deep-rooted traditions and the evolution of the Calabar Carnival over the years."
    },
    {
      title: "Top 5 Performances to Watch Out For This Year",
      category: "Entertainment",
      image:
        "https://images.unsplash.com/photo-1507901747481-84a4f64fda6d?auto=format&fit=crop&w=900&q=80",
      text: "From Afrobeat superstars to world-class acrobatic displays, this year's lineup is packed."
    }
  ];
  const performers = [
    { name: "Wizkid", image: SHARE_TARGETS[0].image },
    { name: "Burnaboy", image: null },
    { name: "Rema", image: SHARE_TARGETS[2].image },
    { name: "Mavido", image: null },
    { name: "Tiwa", image: SHARE_TARGETS[4].image },
    { name: "Vector", image: null },
    { name: "Simi", image: SHARE_TARGETS[1].image },
    { name: "Adekunle", image: null },
    { name: "Asake", image: SHARE_TARGETS[3].image },
    { name: "Tems", image: null },
    { name: "Flavour", image: SHARE_TARGETS[0].image },
    { name: "Ayra", image: null }
  ];
  const visiblePerformers = showAllPerformers
    ? performers
    : performers.slice(0, 4);
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 380;
  const horizontalPadding = isCompactPhone ? 12 : 16;
  const heroHeight = isCompactPhone ? 190 : 220;
  const mediaTallHeight = isCompactPhone ? 220 : 260;
  const mediaShortHeight = isCompactPhone ? 150 : 170;
  const mediaLongHeight = isCompactPhone ? 285 : 350;
  const performerCardWidth = isCompactPhone ? "100%" : "48%";

  if (selectedPost) {
    return (
      <ArticleDetailScreen
        post={selectedPost}
        event={event}
        onBack={() => setSelectedPost(null)}
      />
    );
  }

  return (
    <View className="flex-1 bg-zinc-50">
      <View
        className="z-10 flex-row items-center border-b border-zinc-100 bg-zinc-50"
        style={{
          paddingHorizontal: horizontalPadding,
          paddingVertical: 8
        }}
      >
        <Pressable
          onPress={onBack}
          className="size-8 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 32,
          paddingHorizontal: horizontalPadding,
          paddingTop: 8
        }}
      >
        <CustomImage
          className="w-full rounded-xl"
          imageClassName="size-full rounded-xl"
          source={{ uri: event.image }}
          contentFit="cover"
          style={{ height: heroHeight }}
        />
        <View className="mt-4 flex-row items-start">
          <View className="flex-1">
            <TextComponent className="text-xl font-bold text-primary">
              {event.title}
            </TextComponent>
            <View className="mt-3 gap-2">
              <View className="flex-row items-center">
                <LocationIcon size={15} color={ACTIVE_NAV_COLOR} />
                <TextComponent className="ml-2 text-sm text-zinc-700">
                  {event.venue}, {event.location}
                </TextComponent>
              </View>
              <View className="flex-row items-center">
                <CalendarVectorIcon size={15} color={ACTIVE_NAV_COLOR} />
                <TextComponent className="ml-2 text-sm text-zinc-700">
                  {event.date}
                </TextComponent>
              </View>
              <View className="flex-row items-center">
                <ClockVectorIcon size={15} color={ACTIVE_NAV_COLOR} />
                <TextComponent className="ml-2 text-sm text-zinc-700">
                  {event.time}
                </TextComponent>
              </View>
              <Pressable onPress={() => onContactOrganizer ? onContactOrganizer(toFeedMediaEvent(event)) : onInfo(`Opening a private chat with ${event.venue}`)} className="flex-row items-center">
                <GroupVectorIcon size={15} color={ACTIVE_NAV_COLOR} />
                <TextComponent className="ml-2 text-sm font-semibold text-primary">
                  Contact Us
                </TextComponent>
              </Pressable>
            </View>
          </View>
          <Pressable onPress={() => toggleEventSubscription(event.id)} className={isSubscribed ? "size-10 items-center justify-center rounded-lg bg-primary" : "size-10 items-center justify-center rounded-lg bg-blue-50"}>
            {isSubscribed ? <CheckIcon size={18} color="#ffffff" /> : <BellVectorIcon size={18} color={ACTIVE_NAV_COLOR} />}
          </Pressable>
        </View>
        <TextComponent className="hidden">{event.title}</TextComponent>
        <TextComponent className="hidden">
          {event.venue}, {event.location}
        </TextComponent>
        <TextComponent className="hidden">
          {event.date} • {event.time}
        </TextComponent>
        <View className="mt-5 flex-row gap-3">
          <Pressable
            onPress={() =>
              isExternal
                ? setShowExternalModal(true)
                : isRegister
                  ? onRegister()
                  : onTicket()
            }
            className={
              isExternal
                ? "h-12 flex-1 items-center justify-center rounded-lg bg-red-500"
                : "h-12 flex-1 items-center justify-center rounded-lg bg-primary"
            }
          >
            <TextComponent className="font-bold text-white">
              {isExternal
                ? "External Link"
                : isRegister
                  ? "Register"
                  : "Book Now"}
            </TextComponent>
          </Pressable>
          <Pressable
            onPress={() => setShowShareOptions(true)}
            className="h-12 flex-1 items-center justify-center rounded-lg border border-primary"
          >
            <TextComponent className="font-bold text-primary">
              Share
            </TextComponent>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 py-4"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab;

            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{ minWidth: isCompactPhone ? 82 : 92 }}
                className={
                  isActive
                    ? "items-center rounded-full bg-primary px-4 py-2"
                    : "items-center rounded-full border border-zinc-300 bg-white px-4 py-2"
                }
              >
                <TextComponent
                  className={
                    isActive
                      ? "text-xs font-bold text-white"
                      : "text-xs font-bold text-zinc-600"
                  }
                >
                  {tab}
                </TextComponent>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === "Overview" && (
          <View>
            <TextComponent className="text-lg font-bold text-primary">
              Description
            </TextComponent>
            <TextComponent className="mt-2 text-sm leading-5 text-zinc-950">
              An annual carnival held in Cross River State, Nigeria. Also known
              as Africa's Biggest Street Party, this event brings together
              performers, immersive production, culture, and community access.
            </TextComponent>

            <View className="mt-6 flex-row items-center justify-between">
              <TextComponent className="text-base font-bold text-primary">
                Feature Performer
              </TextComponent>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showAllPerformers
                    ? "Hide performers"
                    : "View all 12 performers"
                }
                onPress={() => setShowAllPerformers((current) => !current)}
              >
                <TextComponent className="text-xs font-semibold text-primary">
                  {showAllPerformers ? "Hide" : "View all 12 performers"}
                </TextComponent>
              </Pressable>
            </View>
            <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
              {visiblePerformers.map((performer) => (
                <View
                  key={performer.name}
                  className="flex-row items-center rounded-lg bg-white p-3 shadow-sm"
                  style={{ width: performerCardWidth }}
                >
                  {performer.image ? (
                    <CustomImage
                      className="size-9 rounded-md"
                      imageClassName="size-full rounded-md"
                      source={{ uri: performer.image }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="size-9 items-center justify-center rounded-md bg-blue-50">
                      <TextComponent className="text-sm font-bold text-primary">
                        {performer.name.charAt(0)}
                      </TextComponent>
                    </View>
                  )}
                  <TextComponent className="ml-3 text-xs font-bold text-zinc-700">
                    {performer.name}
                  </TextComponent>
                </View>
              ))}
            </View>

            <TextComponent className="mt-6 text-base font-bold text-primary">
              Sponsors
            </TextComponent>
            <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
              {[
                "Access",
                "Peak",
                "Guo",
                "Rokko",
                "Hotels",
                "Terra",
                "Ups",
                "Tech"
              ].map((sponsor) => (
                <View
                  key={sponsor}
                  className="h-14 items-center justify-center rounded-md bg-white shadow-sm"
                  style={{ width: isCompactPhone ? "48%" : "23%" }}
                >
                  <TextComponent className="text-[9px] font-bold uppercase text-primary">
                    {sponsor}
                  </TextComponent>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === "Media" && (
          <View>
            <View className="mb-4 flex-row items-center">
              <TextComponent className="text-lg font-bold text-zinc-950">
                Moments
              </TextComponent>
            </View>
            <View className="flex-row flex-wrap justify-between gap-y-1.5">
              {mediaItems.map((imageItem) => (
                <Pressable
                  key={imageItem}
                  onPress={() => setExpandedMedia(imageItem)}
                  className="w-[49%] overflow-hidden rounded-md bg-white"
                  style={{ height: isCompactPhone ? 150 : 178 }}
                >
                  <CustomImage
                    className="size-full"
                    imageClassName="size-full"
                    source={{ uri: imageItem }}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {activeTab === "Activities" && (
          <View>
            <View className="mb-4 flex-row items-center justify-between">
              <TextComponent className="text-lg font-bold text-zinc-950">
                Today's Schedule
              </TextComponent>
              <TextComponent className="text-xs font-bold text-primary">
                Dec 26 - Dec 27
              </TextComponent>
            </View>
            {[
              {
                date: "Dec 26",
                category: "Culture",
                title: "Main Cultural Parade",
                time: "10:00 AM - 02:00 PM",
                location: "Stadium Road Circuit",
                text: "Traditional dancers from across 18 LGAs showcasing the rich Efik heritage at the U.J. Esuene Stadium."
              },
              {
                date: "Dec 26",
                category: "Entertainment",
                title: "Klint D Drunk Comedy Special",
                time: "08:00 PM - 10:00 PM",
                location: "Cultural Centre Main Hall",
                text: "An evening of premium laughter and rib-cracking comedy with the legendary Klint D Drunk and friends."
              },
              {
                date: "Dec 26",
                category: "Music",
                title: "Afrobeats Street Jam",
                time: "10:30 PM - 12:00 AM",
                location: "Festival Main Stage",
                text: "A late-night set featuring rising DJs, dancers, and guest vocalists from across the continent."
              },
              {
                date: "Dec 26",
                category: "Food",
                title: "Taste of Calabar",
                time: "04:00 PM - 07:00 PM",
                location: "Marina Food Court",
                text: "Local chefs host a tasting route with traditional meals, grills, and festival street food."
              },
              {
                date: "Dec 27",
                category: "Culture",
                title: "Heritage Costume Showcase",
                time: "09:00 AM - 11:00 AM",
                location: "Carnival Pavilion",
                text: "Costume bands reveal hand-built pieces inspired by regional folklore and modern design."
              },
              {
                date: "Dec 27",
                category: "Sports",
                title: "Community Beach Games",
                time: "12:00 PM - 03:00 PM",
                location: "Marina Beach Arena",
                text: "Team contests, fan games, and family activities hosted by local sports organizers."
              },
              {
                date: "Dec 27",
                category: "Entertainment",
                title: "Comedy and Spoken Word Night",
                time: "06:00 PM - 08:00 PM",
                location: "Cultural Centre Hall B",
                text: "Comedians, poets, and storytellers take the stage for a relaxed evening showcase."
              },
              {
                date: "Dec 27",
                category: "Music",
                title: "Closing Night Concert",
                time: "09:00 PM - 12:30 AM",
                location: "Main Festival Ground",
                text: "Headline performers close the celebration with live bands, DJs, and fireworks."
              }
            ].map((activity, index) => (
              <View key={activity.title} className="flex-row">
                <View className="mr-3 items-center">
                  <View className="size-4 rounded-full border-2 border-primary bg-white" />
                  {index < 7 && <View className="h-32 w-0.5 bg-zinc-200" />}
                </View>
                <View className="mb-4 flex-1 rounded-xl bg-white p-4 shadow-sm">
                  <View className="flex-row flex-wrap justify-between gap-2">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <View className="rounded-full bg-sky-50 px-3 py-1">
                        <TextComponent className="text-[10px] font-bold text-sky-600">
                          {activity.category}
                        </TextComponent>
                      </View>
                      <TextComponent className="text-[10px] font-bold text-primary">
                        {activity.date}
                      </TextComponent>
                    </View>
                    <TextComponent className="text-[10px] font-semibold text-zinc-500">
                      {activity.time}
                    </TextComponent>
                  </View>
                  <TextComponent className="mt-3 text-base font-bold text-zinc-950">
                    {activity.title}
                  </TextComponent>
                  <TextComponent className="mt-1 text-sm leading-5 text-zinc-600">
                    {activity.text}
                  </TextComponent>
                  <TextComponent className="mt-2 text-xs font-bold text-primary">
                    {activity.location}
                  </TextComponent>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === "Blogs" && (
          <View className="gap-4">
            {blogPosts.map((post) => (
              <Pressable
                key={post.title}
                onPress={() => setSelectedPost(post)}
                className="overflow-hidden rounded-xl bg-white shadow-sm"
              >
                <CustomImage
                  className="h-40 w-full"
                  imageClassName="size-full"
                  source={{ uri: post.image }}
                  contentFit="cover"
                />
                <View className="p-4">
                  <View className="self-start rounded-full bg-zinc-100 px-3 py-1">
                    <TextComponent className="text-[10px] font-semibold text-zinc-500">
                      {post.category}
                    </TextComponent>
                  </View>
                  <TextComponent className="mt-3 text-lg font-bold text-zinc-950">
                    {post.title}
                  </TextComponent>
                  <TextComponent className="mt-2 text-sm leading-5 text-zinc-600">
                    {post.text}
                  </TextComponent>
                  <TextComponent className="mt-3 text-xs font-bold text-primary">
                    Read More
                  </TextComponent>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {showExternalModal && (
        <View className="absolute inset-0 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-2xl bg-white p-5">
            <View className="self-center rounded-full bg-red-100 p-3">
              <CircleExclamationIcon size={26} color="#ef4444" />
            </View>
            <TextComponent className="mt-3 text-center text-lg font-bold text-zinc-950">
              Leaving Turnupz
            </TextComponent>
            <TextComponent className="mt-2 text-center text-sm text-zinc-600">
              This link is taking you to an external website. Are you sure you
              want to continue?
            </TextComponent>
            <View className="my-4 rounded-lg bg-zinc-100 px-3 py-3">
              <TextComponent className="text-xs text-primary">
                https://tickets.turnupz-partner.com
              </TextComponent>
            </View>
            <Pressable className="h-11 items-center justify-center rounded-lg bg-primary">
              <TextComponent className="font-bold text-white">
                Continue
              </TextComponent>
            </Pressable>
            <Pressable
              onPress={() => setShowExternalModal(false)}
              className="mt-3 h-11 items-center justify-center rounded-lg border border-zinc-300"
            >
              <TextComponent className="font-bold text-zinc-700">
                Go Back
              </TextComponent>
            </Pressable>
          </View>
        </View>
      )}
      {showShareOptions && (
        <View className="absolute inset-0 justify-end bg-black/45">
          <Pressable className="flex-1" onPress={() => setShowShareOptions(false)} />
          <View className="rounded-t-3xl bg-white p-5 pb-8">
            <TextComponent className="text-lg font-bold text-zinc-950">Share event</TextComponent>
            <Pressable
              onPress={() => {
                setShowShareOptions(false);
                onShareEvent?.(toFeedMediaEvent(event));
              }}
              className="mt-4 flex-row items-center rounded-xl bg-blue-50 p-4"
            >
              <MessageIcon size={20} color={ACTIVE_NAV_COLOR} />
              <View className="ml-3 flex-1">
                <TextComponent className="font-bold text-primary">Share with a Turnupz user</TextComponent>
                <TextComponent className="text-xs text-zinc-500">Choose a person or group chat</TextComponent>
              </View>
            </Pressable>
            <Pressable
              onPress={async () => {
                setShowShareOptions(false);
                await Share.share({ title: event.title, message: `${event.title}\n${event.date} · ${event.venue}, ${event.location}\n${getEventPublicUrl(event.id)}` });
              }}
              className="mt-3 flex-row items-center rounded-xl bg-zinc-100 p-4"
            >
              <SendIcon size={20} color="#52525b" />
              <View className="ml-3 flex-1">
                <TextComponent className="font-bold text-zinc-800">Share externally</TextComponent>
                <TextComponent className="text-xs text-zinc-500">Use your phone’s sharing options</TextComponent>
              </View>
            </Pressable>
          </View>
        </View>
      )}
      {expandedMedia && (
        <View className="absolute inset-0 items-center justify-center bg-black/80 p-4">
          <Pressable
            onPress={() => setExpandedMedia(null)}
            className="absolute right-4 top-4 z-10 size-10 items-center justify-center rounded-full bg-white"
          >
            <TextComponent className="text-lg font-bold text-zinc-950">
              ×
            </TextComponent>
          </Pressable>
          <CustomImage
            className="h-[72%] w-full rounded-xl"
            imageClassName="size-full rounded-xl"
            source={{ uri: expandedMedia }}
            contentFit="contain"
          />
        </View>
      )}
    </View>
  );
};

const TicketSelectionScreen = ({
  event,
  onBack,
  onBookingComplete,
  onViewTickets
}: {
  event: TPerformerEvent;
  onBack: () => void;
  onBookingComplete?: (
    event: TPerformerEvent,
    categories: TBookedTicketCategory[]
  ) => void;
  onViewTickets?: () => void;
}) => {
  useHardwareBack(onBack);
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 380;
  const horizontalPadding = isCompactPhone ? 12 : 16;
  const [step, setStep] = useState<"tickets" | "payment" | "success">(
    "tickets"
  );
  const tickets = [
    {
      id: "general",
      name: "General Admission",
      price: 0,
      label: "Free",
      description: "Access to the main carnival route and street performances.",
      perks: [] as string[]
    },
    {
      id: "vip",
      name: "VIP Experience",
      price: 25000,
      label: "N25,000",
      description: "",
      perks: [
        "Fast track entry points",
        "Exclusive VIP Lounge access",
        "Complimentary welcome drinks"
      ]
    },
    {
      id: "vvip",
      name: "VVIP Table",
      price: 150000,
      label: "N150,000",
      description: "",
      perks: [
        "Premium frontline seating",
        "Full course buffet dinner",
        "Dedicated valet parking",
        "Personal table host"
      ]
    }
  ];
  const [quantities, setQuantities] = useState<Record<string, number>>({
    general: 0,
    vip: 0,
    vvip: 0
  });
  const subtotal = tickets.reduce(
    (sum, ticket) => sum + ticket.price * (quantities[ticket.id] || 0),
    0
  );
  const tax = Math.round(subtotal * 0.075);
  const total = subtotal + tax;
  const selectedCount = Object.values(quantities).reduce(
    (sum, quantity) => sum + quantity,
    0
  );
  const formatNaira = (amount: number) =>
    amount === 0 ? "N0" : `N${amount.toLocaleString("en-US")}`;
  const updateQuantity = (ticketId: string, value: number) => {
    setQuantities((current) => ({
      ...current,
      [ticketId]: Math.max(0, value)
    }));
  };
  const completePayment = () => {
    const purchasedCategories = tickets
      .filter((ticket) => (quantities[ticket.id] || 0) > 0)
      .map((ticket) => ({
        id: ticket.id,
        name: ticket.name,
        quantity: quantities[ticket.id] || 0,
        price: ticket.price
      }));
    onBookingComplete?.(event, purchasedCategories);
    setStep("success");
  };

  if (step === "payment") {
    return (
      <PaymentMethodScreen
        event={event}
        total={total}
        selectedCount={selectedCount}
        formatNaira={formatNaira}
        onBack={() => setStep("tickets")}
        onPay={completePayment}
      />
    );
  }

  if (step === "success") {
    return (
      <PaymentSuccessScreen
        event={event}
        total={total}
        selectedCount={selectedCount}
        formatNaira={formatNaira}
        onEventPage={onBack}
        onViewTickets={onViewTickets}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-zinc-50"
      stickyHeaderIndices={[0]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 32,
        paddingHorizontal: horizontalPadding,
        paddingTop: horizontalPadding
      }}
    >
      <View className="z-10 mb-4 flex-row items-center bg-zinc-50 py-2">
        <Pressable
          onPress={onBack}
          className="size-8 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <TextComponent className="flex-1 text-center font-bold text-zinc-950">
          Select Ticket
        </TextComponent>
      </View>
      <CustomImage
        className="w-full rounded-xl"
        imageClassName="size-full rounded-xl"
        source={{ uri: event.image }}
        contentFit="cover"
        style={{ height: isCompactPhone ? 124 : 144 }}
      />
      <TextComponent className="mt-4 text-lg font-bold text-zinc-950">
        Available Tickets
      </TextComponent>
      {tickets.map((ticket, index) => (
        <View key={ticket.id} className="mt-3 rounded-xl bg-white p-4 shadow">
          <View className={isCompactPhone ? "gap-3" : "flex-row items-center"}>
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <TextComponent
                  numberOfLines={2}
                  className="font-bold text-zinc-950"
                >
                  {ticket.name}
                </TextComponent>
                {index === 1 && (
                  <View className="rounded-full bg-sky-400 px-2 py-0.5">
                    <TextComponent className="text-[8px] font-bold text-white">
                      POPULAR
                    </TextComponent>
                  </View>
                )}
              </View>
              <TextComponent className="mt-1 text-sm font-bold text-primary">
                {ticket.label}
              </TextComponent>
              {!!ticket.description && (
                <TextComponent className="mt-2 text-xs leading-4 text-zinc-500">
                  {ticket.description}
                </TextComponent>
              )}
            </View>
            <View
              className={
                isCompactPhone
                  ? "self-end flex-row items-center gap-3"
                  : "flex-row items-center gap-3"
              }
            >
              <Pressable
                onPress={() =>
                  updateQuantity(ticket.id, (quantities[ticket.id] || 0) - 1)
                }
                className="size-7 items-center justify-center rounded-full bg-zinc-100"
              >
                <TextComponent className="font-bold text-zinc-500">
                  -
                </TextComponent>
              </Pressable>
              <TextInput
                value={String(quantities[ticket.id] || 0)}
                onChangeText={(value) =>
                  updateQuantity(
                    ticket.id,
                    Number.parseInt(value || "0", 10) || 0
                  )
                }
                keyboardType="number-pad"
                className="h-8 w-10 rounded-md bg-zinc-50 p-0 text-center font-bold text-zinc-950 outline-none"
              />
              <Pressable
                onPress={() =>
                  updateQuantity(ticket.id, (quantities[ticket.id] || 0) + 1)
                }
                className="size-7 items-center justify-center rounded-full bg-primary"
              >
                <TextComponent className="font-bold text-white">
                  +
                </TextComponent>
              </Pressable>
            </View>
          </View>
          {ticket.perks.length > 0 && (
            <View className="mt-3 border-t border-zinc-100 pt-3">
              {ticket.perks.map((perk) => (
                <TextComponent
                  key={perk}
                  className="mb-1 text-xs leading-4 text-zinc-600"
                >
                  {perk}
                </TextComponent>
              ))}
            </View>
          )}
        </View>
      ))}
      <View className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <View className="flex-row justify-between">
          <TextComponent className="text-xs text-zinc-500">
            Subtotal
          </TextComponent>
          <TextComponent className="text-sm font-bold text-zinc-950">
            {formatNaira(subtotal)}
          </TextComponent>
        </View>
        <View className="mt-2 flex-row justify-between">
          <TextComponent className="text-xs text-zinc-500">Tax</TextComponent>
          <TextComponent className="text-sm font-bold text-zinc-950">
            {formatNaira(tax)}
          </TextComponent>
        </View>
        <View className="mt-3 flex-row flex-wrap justify-between gap-2 border-t border-zinc-100 pt-3">
          <View>
            <TextComponent className="text-xs text-zinc-500">
              Total Price
            </TextComponent>
            <TextComponent className="text-xl font-bold text-zinc-950">
              {formatNaira(total)}
            </TextComponent>
          </View>
          <TextComponent className="self-end text-xs text-zinc-500">
            {selectedCount} tickets selected
          </TextComponent>
        </View>
      </View>
      <Pressable
        disabled={selectedCount === 0}
        onPress={() => selectedCount > 0 && setStep("payment")}
        className={
          selectedCount === 0
            ? "mt-5 h-12 items-center justify-center rounded-lg bg-zinc-300"
            : "mt-5 h-12 items-center justify-center rounded-lg bg-primary"
        }
      >
        <TextComponent className="font-bold text-white">
          Proceed to Payment - {formatNaira(total)}
        </TextComponent>
      </Pressable>
    </ScrollView>
  );
};

const PaymentMethodScreen = ({
  event,
  total,
  selectedCount,
  formatNaira,
  onBack,
  onPay
}: {
  event: TPerformerEvent;
  total: number;
  selectedCount: number;
  formatNaira: (amount: number) => string;
  onBack: () => void;
  onPay: () => void;
}) => {
  useHardwareBack(onBack);
  const [cardNumber, setCardNumber] = useState("3614");
  const [expiryDate, setExpiryDate] = useState("12/27");
  const [cvv, setCvv] = useState("123");
  const [cardName, setCardName] = useState("Francis Chimezie");
  const [isCardSaved, setIsCardSaved] = useState(false);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "card" | "turnupz-credit" | "refund-credit"
  >("card");
  const [cardSearch, setCardSearch] = useState("");
  const savedCards = useWalletStore((state) => state.cards);
  const addWalletCard = useWalletStore((state) => state.addCard);
  const addWalletTransaction = useWalletStore((state) => state.addTransaction);
  const refundCredits = useWalletStore((state) => state.refundCredits);
  const turnupzCredits = useWalletStore((state) => state.promotionalCredits);
  const [selectedCardId, setSelectedCardId] = useState(savedCards[0]?.id || "");
  const visibleSavedCards = savedCards.filter((card) =>
    matchesSearch(cardSearch, [card.brand, card.lastFour, card.holder])
  );
  const lastFour = cardNumber.replace(/\D/g, "").slice(-4) || "0000";
  const selectedCreditBalance =
    paymentMethod === "turnupz-credit" ? turnupzCredits : refundCredits;
  const canPay =
    paymentMethod === "card"
      ? Boolean(selectedCardId)
      : selectedCreditBalance >= total;
  const saveAndSelectCard = () => {
    if (
      cardNumber.replace(/\D/g, "").length < 4 ||
      !expiryDate ||
      !cardName.trim()
    )
      return;
    const id = `card-${Date.now()}`;
    if (isCardSaved) {
      addWalletCard({
        id,
        brand: "Card",
        lastFour,
        expiry: expiryDate,
        holder: cardName.trim()
      });
    }
    setSelectedCardId(id);
    setShowNewCardForm(false);
  };
  const completeCardPayment = () => {
    addWalletTransaction({
      id: `payment-${Date.now()}`,
      title: event.title,
      detail: `${selectedCount} ticket${selectedCount === 1 ? "" : "s"}`,
      amount: -total,
      createdAt: new Date().toISOString()
    });
    onPay();
  };

  return (
    <ScrollView
      className="flex-1 bg-zinc-50"
      stickyHeaderIndices={[0]}
      showsVerticalScrollIndicator={false}
      contentContainerClassName="p-4 pb-8"
    >
      <View className="z-10 mb-6 flex-row items-center bg-zinc-50 py-2">
        <Pressable
          onPress={onBack}
          className="size-8 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <TextComponent className="flex-1 text-center font-bold text-zinc-950">
          Payment Methods
        </TextComponent>
      </View>

      <TextComponent className="mb-3 text-sm font-bold text-zinc-950">
        Credit & Debit Card
      </TextComponent>
      <View className="mb-5 overflow-hidden rounded-xl bg-white shadow-sm">
        <View className="flex-row items-center justify-between border-b border-zinc-100 px-4 py-3">
          <TextComponent className="text-sm font-semibold text-zinc-700">
            My Cards
          </TextComponent>
          <Pressable
            onPress={() => {
              setPaymentMethod("card");
              setShowNewCardForm((current) => !current);
            }}
            accessibilityRole="button"
            accessibilityLabel="Add another payment card"
          >
            <TextComponent className="text-xs font-bold text-primary">
              {showNewCardForm ? "Cancel" : "+ Add Card"}
            </TextComponent>
          </Pressable>
        </View>
        <View className="mx-4 mt-3 h-10 flex-row items-center rounded-lg bg-zinc-100 px-3">
          <SearchIcon size={14} color="#a1a1aa" />
          <TextInput
            value={cardSearch}
            onChangeText={setCardSearch}
            onFocus={() => setPaymentMethod("card")}
            placeholder="Search saved cards"
            placeholderTextColor="#a1a1aa"
            className="ml-2 flex-1 text-xs outline-none"
          />
        </View>
        {savedCards.length === 0 && !showNewCardForm && (
          <View className="items-center px-5 py-8">
            <TextComponent className="font-bold text-zinc-800">
              No saved cards
            </TextComponent>
            <TextComponent className="mt-2 text-center text-xs text-zinc-500">
              Add a card and select Save card details to use it for future
              ticket purchases.
            </TextComponent>
          </View>
        )}
        {visibleSavedCards.map((card) => {
          const selected =
            paymentMethod === "card" && selectedCardId === card.id;
          return (
            <Pressable
              key={card.id}
              onPress={() => {
                setPaymentMethod("card");
                setSelectedCardId(card.id);
                setShowNewCardForm(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className="flex-row items-center border-b border-zinc-100 px-4 py-4"
            >
              <View className="size-10 items-center justify-center rounded-lg bg-blue-50">
                <TextComponent className="text-[10px] font-bold text-primary">
                  {card.brand}
                </TextComponent>
              </View>
              <View className="ml-3 flex-1">
                <TextComponent className="text-sm font-bold text-zinc-800">
                  •••• {card.lastFour}
                </TextComponent>
                <TextComponent className="mt-1 text-[10px] text-zinc-500">
                  Expires {card.expiry} · {card.holder}
                </TextComponent>
              </View>
              <View
                className={
                  selected
                    ? "size-5 items-center justify-center rounded-full border border-primary"
                    : "size-5 rounded-full border border-zinc-300"
                }
              >
                {selected && (
                  <View className="size-3 rounded-full bg-primary" />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {showNewCardForm && (
        <>
          <TextComponent className="mb-3 mt-3 text-sm font-bold text-zinc-950">
            Add another card
          </TextComponent>
          <View className="rounded-2xl bg-[#006b99] p-5">
            <TextComponent className="text-[10px] uppercase text-sky-100">
              Name
            </TextComponent>
            <TextComponent className="mt-1 text-sm font-bold text-white">
              {cardName || "Name on card"}
            </TextComponent>
            <TextComponent className="mt-8 text-lg font-bold tracking-widest text-white">
              **** **** **** {lastFour}
            </TextComponent>
            <TextComponent className="mt-5 text-[10px] text-sky-100">
              CVV {cvv || "***"} EXP {expiryDate || "MM/YY"}
            </TextComponent>
          </View>

          <View className="mt-5">
            <View className="mb-4">
              <TextComponent className="mb-2 text-xs font-bold text-zinc-600">
                Card Number
              </TextComponent>
              <TextInput
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="number-pad"
                placeholder="0123456789012345"
                placeholderTextColor="#a1a1aa"
                className="h-12 rounded-lg bg-white px-4 text-sm text-zinc-950 outline-none"
              />
            </View>
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1">
                <TextComponent className="mb-2 text-xs font-bold text-zinc-600">
                  Exp Date
                </TextComponent>
                <TextInput
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="MM / YY"
                  placeholderTextColor="#a1a1aa"
                  className="h-12 rounded-lg bg-white px-4 text-sm text-zinc-950 outline-none"
                />
              </View>
              <View className="flex-1">
                <TextComponent className="mb-2 text-xs font-bold text-zinc-600">
                  CVV
                </TextComponent>
                <TextInput
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="number-pad"
                  placeholder="123"
                  placeholderTextColor="#a1a1aa"
                  className="h-12 rounded-lg bg-white px-4 text-sm text-zinc-950 outline-none"
                />
              </View>
            </View>
            <View className="mb-4">
              <TextComponent className="mb-2 text-xs font-bold text-zinc-600">
                Name on card
              </TextComponent>
              <TextInput
                value={cardName}
                onChangeText={setCardName}
                placeholder="Enter your name"
                placeholderTextColor="#a1a1aa"
                className="h-12 rounded-lg bg-white px-4 text-sm text-zinc-950 outline-none"
              />
            </View>
            <Pressable
              onPress={() => setIsCardSaved((current) => !current)}
              className="mb-5 flex-row items-center"
            >
              <View
                className={
                  isCardSaved
                    ? "size-5 items-center justify-center rounded bg-primary"
                    : "size-5 rounded border border-zinc-300 bg-white"
                }
              >
                {isCardSaved && (
                  <TextComponent className="text-xs font-bold text-white">
                    ✓
                  </TextComponent>
                )}
              </View>
              <TextComponent className="ml-3 text-xs font-semibold text-zinc-600">
                Save card details
              </TextComponent>
            </Pressable>
            <Pressable
              onPress={saveAndSelectCard}
              className="mb-5 h-11 items-center justify-center rounded-lg border border-primary bg-blue-50"
            >
              <TextComponent className="font-bold text-primary">
                Use This Card
              </TextComponent>
            </Pressable>
          </View>
        </>
      )}

      <View className="mb-3 mt-5">
        <Pressable
          onPress={() => {
            setPaymentMethod("turnupz-credit");
            setShowNewCardForm(false);
          }}
          className={
            paymentMethod === "turnupz-credit"
              ? "rounded-xl border border-primary bg-blue-50 p-4"
              : "rounded-xl border border-zinc-200 bg-white p-4"
          }
        >
          <View className="flex-row items-center">
            <View
              className={
                paymentMethod === "turnupz-credit"
                  ? "size-5 items-center justify-center rounded-full border border-primary"
                  : "size-5 rounded-full border border-zinc-300"
              }
            >
              {paymentMethod === "turnupz-credit" && (
                <View className="size-3 rounded-full bg-primary" />
              )}
            </View>
            <View className="ml-3 flex-1">
              <TextComponent className="font-bold text-zinc-800">
                Turnupz Credit
              </TextComponent>
              <TextComponent className="mt-1 text-xs text-zinc-500">
                Available: {formatNaira(turnupzCredits)}
              </TextComponent>
            </View>
          </View>
          {paymentMethod === "turnupz-credit" && turnupzCredits < total && (
            <View className="mt-3 rounded-lg bg-white/80 p-3">
              <TextComponent className="text-xs leading-5 text-red-500">
                Payment cannot proceed because your Turnupz Credit is{" "}
                {formatNaira(total - turnupzCredits)} below the order total.
              </TextComponent>
            </View>
          )}
        </Pressable>
      </View>
      <View className="mb-5">
        <Pressable
          onPress={() => {
            setPaymentMethod("refund-credit");
            setShowNewCardForm(false);
          }}
          className={
            paymentMethod === "refund-credit"
              ? "rounded-xl border border-primary bg-blue-50 p-4"
              : "rounded-xl border border-zinc-200 bg-white p-4"
          }
        >
          <View className="flex-row items-center">
            <View
              className={
                paymentMethod === "refund-credit"
                  ? "size-5 items-center justify-center rounded-full border border-primary"
                  : "size-5 rounded-full border border-zinc-300"
              }
            >
              {paymentMethod === "refund-credit" && (
                <View className="size-3 rounded-full bg-primary" />
              )}
            </View>
            <View className="ml-3 flex-1">
              <TextComponent className="font-bold text-zinc-800">
                Refund Credit
              </TextComponent>
              <TextComponent className="mt-1 text-xs text-zinc-500">
                Available: {formatNaira(refundCredits)}
              </TextComponent>
            </View>
          </View>
          {paymentMethod === "refund-credit" && refundCredits < total && (
            <View className="mt-3 rounded-lg bg-white/80 p-3">
              <TextComponent className="text-xs leading-5 text-red-500">
                Payment cannot proceed because your Refund Credit is{" "}
                {formatNaira(total - refundCredits)} below the order total.
              </TextComponent>
            </View>
          )}
        </Pressable>
      </View>

      <View className="mb-4 flex-row justify-between">
        <TextComponent className="text-xs text-zinc-500">
          {selectedCount} tickets selected
        </TextComponent>
        <TextComponent className="text-sm font-bold text-zinc-950">
          {event.title}
        </TextComponent>
      </View>
      <Pressable
        disabled={!canPay}
        onPress={completeCardPayment}
        className={
          canPay
            ? "h-12 items-center justify-center rounded-lg bg-primary"
            : "h-12 items-center justify-center rounded-lg bg-zinc-300"
        }
      >
        <TextComponent className="font-bold text-white">
          {paymentMethod !== "card" && !canPay
            ? `Insufficient ${paymentMethod === "turnupz-credit" ? "Turnupz" : "Refund"} Credit`
            : `Pay ${formatNaira(total)}`}
        </TextComponent>
      </Pressable>
    </ScrollView>
  );
};

const PaymentSuccessScreen = ({
  event,
  total,
  selectedCount,
  formatNaira,
  onEventPage,
  onViewTickets
}: {
  event: TPerformerEvent;
  total: number;
  selectedCount: number;
  formatNaira: (amount: number) => string;
  onEventPage: () => void;
  onViewTickets?: () => void;
}) => {
  return (
    <ScrollView
      className="flex-1 bg-zinc-50"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="items-center px-5 pb-10 pt-16"
    >
      <View className="size-24 items-center justify-center rounded-full bg-sky-400">
        <TextComponent className="text-4xl font-bold text-white">
          ✓
        </TextComponent>
      </View>
      <TextComponent className="mt-6 text-2xl font-bold text-zinc-950">
        Payment Successful!
      </TextComponent>
      <TextComponent className="mt-2 text-center text-sm leading-5 text-zinc-500">
        Your tickets for {event.title} have been secured. A confirmation email
        has been sent to you.
      </TextComponent>

      <View className="mt-8 w-full rounded-xl bg-white p-4 shadow-sm">
        <View className="flex-row justify-between">
          <TextComponent className="text-xs text-zinc-500">
            Transaction ID
          </TextComponent>
          <TextComponent className="text-xs font-bold text-zinc-950">
            Order #TK-99261
          </TextComponent>
        </View>
        <View className="mt-5 flex-row items-center">
          <CustomImage
            className="size-14 rounded-md"
            imageClassName="size-full rounded-md"
            source={{ uri: event.image }}
            contentFit="cover"
          />
          <View className="ml-3 flex-1">
            <TextComponent className="text-sm font-bold text-primary">
              {event.title}
            </TextComponent>
            <TextComponent className="mt-1 text-xs text-zinc-500">
              {selectedCount} Tickets - VIP Access
            </TextComponent>
          </View>
        </View>
        <View className="mt-5 flex-row justify-between border-t border-zinc-100 pt-4">
          <TextComponent className="text-sm text-zinc-600">
            Total Paid
          </TextComponent>
          <TextComponent className="text-lg font-bold text-zinc-950">
            {formatNaira(total)}
          </TextComponent>
        </View>
      </View>

      <Pressable
        onPress={onViewTickets}
        className="mt-6 h-12 w-full items-center justify-center rounded-lg bg-primary"
      >
        <TextComponent className="font-bold text-white">
          View My Ticket
        </TextComponent>
      </Pressable>
      <Pressable onPress={onEventPage} className="mt-4">
        <TextComponent className="text-sm font-bold text-primary">
          Event Page
        </TextComponent>
      </Pressable>
      <View className="mt-8 rounded-full bg-zinc-950 px-5 py-3">
        <TextComponent className="text-xs font-semibold text-white">
          See you at {event.venue}!
        </TextComponent>
      </View>
    </ScrollView>
  );
};

const RegistrationFormScreen = ({
  event,
  onBack,
  onRegistrationComplete,
  onViewTickets
}: {
  event: TPerformerEvent;
  onBack: () => void;
  onRegistrationComplete?: (event: TPerformerEvent) => void;
  onViewTickets?: () => void;
}) => {
  useHardwareBack(onBack);
  const [isComplete, setIsComplete] = useState(false);

  if (isComplete) {
    return (
      <RegistrationSuccessScreen
        event={event}
        onEventPage={onBack}
        onViewTickets={onViewTickets}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      stickyHeaderIndices={[0]}
      contentContainerClassName="p-4 pb-8"
    >
      <View className="z-10 mb-4 flex-row items-center bg-white py-2">
        <Pressable
          onPress={onBack}
          className="size-8 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <TextComponent className="flex-1 text-center font-bold text-zinc-950">
          Register
        </TextComponent>
      </View>
      <CustomImage
        className="h-44 w-full rounded-xl"
        imageClassName="size-full rounded-xl"
        source={{ uri: event.image }}
        contentFit="cover"
      />
      <TextComponent className="mt-4 text-xl font-bold text-zinc-950">
        {event.title}
      </TextComponent>
      {["Full Name", "Email Address", "Phone Number"].map((label) => (
        <View key={label} className="mt-4">
          <TextComponent className="mb-2 text-xs font-bold text-zinc-600">
            {label}
          </TextComponent>
          <View className="h-12 justify-center rounded-md bg-zinc-100 px-4">
            <TextComponent className="text-sm text-zinc-400">
              {label === "Full Name"
                ? "Enter your full name"
                : label === "Email Address"
                  ? "example@domain.com"
                  : "+234 000 000 0000"}
            </TextComponent>
          </View>
        </View>
      ))}
      <Pressable
        onPress={() => {
          onRegistrationComplete?.(event);
          setIsComplete(true);
        }}
        className="mt-6 h-12 items-center justify-center rounded-lg bg-primary"
      >
        <TextComponent className="font-bold text-white">
          Complete Registration
        </TextComponent>
      </Pressable>
    </ScrollView>
  );
};

const RegistrationSuccessScreen = ({
  event,
  onEventPage,
  onViewTickets
}: {
  event: TPerformerEvent;
  onEventPage: () => void;
  onViewTickets?: () => void;
}) => {
  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="items-center px-5 pb-10 pt-12"
    >
      <View className="size-40 items-center justify-center rounded-full bg-blue-100">
        <View className="size-28 items-center justify-center rounded-full bg-blue-200">
          <CustomImage
            className="size-20 rounded-xl"
            imageClassName="size-full rounded-xl"
            source={{ uri: event.image }}
            contentFit="cover"
          />
          <View className="absolute size-10 items-center justify-center rounded-full bg-primary">
            <TextComponent className="text-lg font-bold text-white">
              ✓
            </TextComponent>
          </View>
        </View>
      </View>
      <TextComponent className="mt-6 text-center text-xl font-bold text-zinc-950">
        You're going to {event.title}!
      </TextComponent>
      <TextComponent className="mt-2 text-center text-sm leading-5 text-zinc-500">
        Your registration is confirmed. Get ready for an unforgettable event
        experience.
      </TextComponent>

      <View className="mt-6 w-full rounded-xl bg-zinc-50 p-4">
        <TextComponent className="text-[10px] font-bold uppercase text-zinc-500">
          Ticket Type
        </TextComponent>
        <TextComponent className="mt-1 text-base font-bold text-zinc-950">
          Premium All-Access Pass
        </TextComponent>
        <View className="mt-4 flex-row justify-between">
          <View>
            <TextComponent className="text-[10px] font-bold uppercase text-zinc-500">
              Date
            </TextComponent>
            <TextComponent className="mt-1 text-xs font-bold text-zinc-950">
              {event.date}
            </TextComponent>
          </View>
          <View>
            <TextComponent className="text-[10px] font-bold uppercase text-zinc-500">
              Order ID
            </TextComponent>
            <TextComponent className="mt-1 text-xs font-bold text-zinc-950">
              #CC-829410
            </TextComponent>
          </View>
        </View>
        <View className="mt-4 h-20 items-center justify-center rounded-lg bg-zinc-300">
          <View className="rounded-full bg-white px-4 py-1">
            <TextComponent className="text-xs font-bold text-zinc-600">
              {event.venue}
            </TextComponent>
          </View>
        </View>
      </View>

      <Pressable
        onPress={onViewTickets}
        className="mt-6 h-12 w-full items-center justify-center rounded-lg bg-primary"
      >
        <TextComponent className="font-bold text-white">
          View My Ticket
        </TextComponent>
      </Pressable>
      <Pressable onPress={onEventPage} className="mt-4">
        <TextComponent className="text-sm font-bold text-primary">
          Event Page
        </TextComponent>
      </Pressable>
      <View className="mt-8 rounded-full bg-zinc-950 px-5 py-3">
        <TextComponent className="text-xs font-semibold text-white">
          See you at {event.venue}!
        </TextComponent>
      </View>
    </ScrollView>
  );
};

const TopPerformersDetailScreen = ({
  chart,
  onBack
}: {
  chart: TTopChart;
  onBack: () => void;
}) => {
  useHardwareBack(onBack);
  const [activeFilter, setActiveFilter] =
    useState<TPerformerFilter>("All Performers");
  const [selectedPerformer, setSelectedPerformer] = useState<TPerformer | null>(
    null
  );
  const [selectedEvent, setSelectedEvent] = useState<TPerformerEvent | null>(
    null
  );
  const [bookingMode, setBookingMode] = useState<
    "detail" | "ticket" | "register"
  >("detail");
  const [query, setQuery] = useState("");
  const performers = useMemo(
    () =>
      createTopPerformers(chart.id, activeFilter).filter((performer) =>
        matchesSearch(query, [performer.name, performer.role])
      ),
    [activeFilter, chart.id, query]
  );
  const activeLabel =
    activeFilter === "All Performers" ? "performers" : activeFilter;

  if (selectedEvent && bookingMode === "ticket") {
    return (
      <TicketSelectionScreen
        event={selectedEvent}
        onBack={() => setBookingMode("detail")}
      />
    );
  }

  if (selectedEvent && bookingMode === "register") {
    return (
      <RegistrationFormScreen
        event={selectedEvent}
        onBack={() => setBookingMode("detail")}
      />
    );
  }

  if (selectedEvent) {
    return (
      <EventBookingDetailScreen
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
        onTicket={() => setBookingMode("ticket")}
        onRegister={() => setBookingMode("register")}
      />
    );
  }

  if (selectedPerformer) {
    return (
      <PerformerProfileScreen
        performer={selectedPerformer}
        onBack={() => setSelectedPerformer(null)}
        onOpenEvent={(event) => {
          setSelectedEvent(event);
          setBookingMode("detail");
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
        <Pressable onPress={onBack} className="size-9 items-center justify-center"><ChevronLeftIcon size={18} color="#52525b" /></Pressable>
        <TextComponent className="flex-1 text-center font-bold">Performers</TextComponent><View className="size-9" />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-6 pt-5"
      >
        <TextComponent className="text-2xl font-bold text-zinc-950">
          {chart.subtitle}
        </TextComponent>
        <TextComponent className="mt-1 text-sm text-zinc-600">
          Trending {activeLabel.toLowerCase()} by industry strength
        </TextComponent>

        <View className="mt-5 h-11 flex-row items-center rounded-xl bg-white px-3 shadow-sm">
          <SearchIcon size={16} color="#8a8f98" /><TextInput value={query} onChangeText={setQuery} placeholder="Search performers" placeholderTextColor="#8a8f98" className="ml-2 flex-1 text-xs outline-none" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 py-5"
        >
          {PERFORMER_FILTERS.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={
                  isActive
                    ? "rounded-full bg-primary px-5 py-3"
                    : "rounded-full bg-zinc-100 px-5 py-3"
                }
              >
                <TextComponent
                  className={
                    isActive
                      ? "text-xs font-bold text-white"
                      : "text-xs font-bold text-zinc-600"
                  }
                >
                  {filter}
                </TextComponent>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="mb-6 flex-row items-end justify-between px-1">
          {performers[1] && (
            <Pressable onPress={() => setSelectedPerformer(performers[1])}>
              <PodiumPerformer performer={performers[1]} rank={2} />
            </Pressable>
          )}
          {performers[0] && (
            <Pressable onPress={() => setSelectedPerformer(performers[0])}>
              <PodiumPerformer performer={performers[0]} rank={1} featured />
            </Pressable>
          )}
          {performers[2] && (
            <Pressable onPress={() => setSelectedPerformer(performers[2])}>
              <PodiumPerformer performer={performers[2]} rank={3} />
            </Pressable>
          )}
        </View>

        <View className="gap-3">
          {performers.slice(3).map((performer, index) => (
            <Pressable
              key={`${chart.id}-${performer.id}`}
              onPress={() => setSelectedPerformer(performer)}
              className="flex-row items-center rounded-xl bg-white px-4 py-3"
            >
              <TextComponent className="w-8 text-base font-bold text-zinc-500">
                {index + 4}
              </TextComponent>
              <PerformerAvatar avatar={performer.avatar} />
              <View className="ml-3 flex-1">
                <TextComponent
                  numberOfLines={1}
                  className="text-base font-bold text-zinc-950"
                >
                  {performer.name}
                </TextComponent>
                <TextComponent className="text-[10px] uppercase text-zinc-500">
                  {performer.role}
                </TextComponent>
              </View>
              <View className="items-end">
                <TextComponent className="text-sm font-bold text-primary">
                  {performer.events}
                </TextComponent>
                <TextComponent className="text-[10px] text-zinc-400">
                  Events
                </TextComponent>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const ExploreMapScreen = ({ onBack }: { onBack: () => void }) => {
  useHardwareBack(onBack);
  const [query, setQuery] = useState("");
  const mapEvents = useMemo(
    () =>
      MAP_EVENTS.filter((event) =>
        matchesSearch(query, [event.title, event.venue])
      ),
    [query]
  );
  const featuredMapEvent = mapEvents[0] || MAP_EVENTS[0];

  return (
    <View className="flex-1 bg-white">
      <SearchHeader
        placeholder="Search venues or events"
        onBack={onBack}
        query={query}
        onQueryChange={setQuery}
      />
      <View className="relative flex-1 overflow-hidden bg-[#f1f2f5]">
        <View className="absolute inset-0">
          <View className="absolute left-[-10%] top-[13%] h-5 w-[125%] rotate-[-12deg] bg-white/90" />
          <View className="absolute left-[-15%] top-[32%] h-4 w-[130%] rotate-[18deg] bg-white/90" />
          <View className="absolute left-[44%] top-[-5%] h-[110%] w-4 rotate-[8deg] bg-white/90" />
          <View className="absolute left-[14%] top-[-10%] h-[120%] w-3 rotate-[-22deg] bg-[#c8def0]" />
          <View className="absolute left-[72%] top-[-8%] h-[120%] w-3 rotate-[22deg] bg-[#c8def0]" />
          <View className="absolute left-[4%] top-[7%] h-20 w-32 rounded-full bg-green-100" />
          <View className="absolute right-[-7%] top-[19%] h-24 w-36 rounded-full bg-green-100" />
          <View className="absolute bottom-[9%] left-[-8%] h-28 w-44 rounded-full bg-green-100" />
        </View>

        <TextComponent className="absolute left-[24%] top-[38%] text-3xl font-bold text-zinc-700/70">
          Victoria Island
        </TextComponent>
        <TextComponent className="absolute left-[9%] top-[9%] text-base font-semibold text-green-700/60">
          Current Area
        </TextComponent>

        {mapEvents.map((event) => (
          <Pressable
            key={event.id}
            className="absolute size-12 items-center justify-center rounded-full bg-primary shadow"
            style={event.style}
          >
            <CustomImage
              className="size-9 rounded-md border-2 border-white"
              imageClassName="size-full rounded-md"
              source={{ uri: event.image }}
              contentFit="cover"
            />
          </Pressable>
        ))}

        <View className="absolute bottom-5 left-4 right-4 rounded-xl bg-white p-3 shadow">
          <View className="flex-row">
            <CustomImage
              className="h-24 w-28 rounded-md"
              imageClassName="size-full rounded-md"
              source={{ uri: featuredMapEvent.image }}
              contentFit="cover"
            />
            <View className="ml-3 flex-1">
              <View className="mb-1 self-start rounded bg-primary px-2 py-1">
                <TextComponent className="text-[10px] font-bold text-white">
                  TODAY
                </TextComponent>
              </View>
              <TextComponent className="text-base font-bold text-zinc-950">
                {featuredMapEvent.title}
              </TextComponent>
              <TextComponent className="mt-1 text-xs font-semibold text-zinc-700">
                {featuredMapEvent.venue}
              </TextComponent>
              <TextComponent className="mt-2 text-[10px] text-zinc-500">
                0.8 mi | Fast Selling
              </TextComponent>
            </View>
            <HeartOutlineIcon size={20} color="#71717a" />
          </View>
        </View>

        <View className="absolute bottom-36 right-4 size-12 items-center justify-center rounded-xl bg-white shadow">
          <LocationIcon size={24} color={ACTIVE_NAV_COLOR} />
        </View>
      </View>
    </View>
  );
};

const FilterPill = ({
  label,
  isActive,
  onPress
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) => {
  return (
    <Pressable
      onPress={onPress}
      className={
        isActive
          ? "rounded-full bg-primary px-4 py-2"
          : "rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2"
      }
    >
      <TextComponent
        className={
          isActive
            ? "text-xs font-bold text-white"
            : "text-xs font-semibold text-zinc-700"
        }
      >
        {label}
      </TextComponent>
    </Pressable>
  );
};

const ExploreFilterScreen = ({
  onBack,
  onApply
}: {
  onBack: () => void;
  onApply: (categories: string[]) => void;
}) => {
  useHardwareBack(onBack);
  const [range, setRange] = useState(50);
  const [sortBy, setSortBy] = useState("All");
  const [priceLevel, setPriceLevel] = useState(50);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [time, setTime] = useState("All");

  const resetFilters = () => {
    setRange(50);
    setSortBy("All");
    setPriceLevel(50);
    setCategories(["All"]);
    setTime("All");
  };

  const toggleCategory = (category: string) => {
    if (category === "All") {
      setCategories(["All"]);
      return;
    }

    setCategories((current) => {
      const withoutAll = current.filter((item) => item !== "All");
      const next = withoutAll.includes(category)
        ? withoutAll.filter((item) => item !== category)
        : [...withoutAll, category];

      return next.length > 0 ? next : ["All"];
    });
  };

  return (
    <View className="flex-1 bg-white">
      <View className="h-16 flex-row items-center justify-between border-b border-zinc-100 px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => onApply(categories)}
          className="size-9 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <TextComponent className="text-xl font-bold text-zinc-950">
          Filter
        </TextComponent>
        <Pressable
          onPress={resetFilters}
          className="rounded-md border border-primary px-4 py-2"
        >
          <TextComponent className="text-xs font-bold text-primary">
            Reset
          </TextComponent>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-6 pt-5"
      >
        <TextComponent className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          Near
        </TextComponent>
        <View className="mb-6 h-12 flex-row items-center rounded-md border border-zinc-300 bg-zinc-50 px-3">
          <LocationIcon size={16} color="#71717a" />
          <TextComponent className="ml-3 text-sm text-zinc-700">
            Victoria Island, Lagos
          </TextComponent>
        </View>

        <View className="mb-6">
          <View className="mb-3 flex-row justify-between">
            <TextComponent className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Range
            </TextComponent>
            <TextComponent className="text-xs font-bold text-primary">
              within {range}km
            </TextComponent>
          </View>
          <View className="h-1 rounded-full bg-zinc-200">
            <View
              className="h-1 rounded-full bg-primary"
              style={{ width: `${range}%` }}
            />
            <Pressable
              onPress={() => setRange(range === 50 ? 75 : 50)}
              className="absolute -top-2 size-5 rounded-full bg-primary"
              style={{ left: `${range - 3}%` }}
            />
          </View>
        </View>

        <View className="mb-6">
          <TextComponent className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            Sort By
          </TextComponent>
          <View className="flex-row rounded-md bg-zinc-100 p-1">
            {["All", "Popularity", "Nearest"].map((item) => {
              const isActive = sortBy === item;

              return (
                <Pressable
                  key={item}
                  onPress={() => setSortBy(item)}
                  className={
                    isActive
                      ? "flex-1 rounded-md bg-zinc-600 py-3"
                      : "flex-1 rounded-md py-3"
                  }
                >
                  <TextComponent
                    className={
                      isActive
                        ? "text-center text-xs font-bold text-white"
                        : "text-center text-xs font-bold text-zinc-600"
                    }
                  >
                    {item}
                  </TextComponent>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mb-6">
          <TextComponent className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            Price Range
          </TextComponent>
          <View className="flex-row items-center gap-3">
            <TextComponent className="text-xs text-zinc-500">
              Free
            </TextComponent>
            <View className="h-1 flex-1 rounded-full bg-zinc-200">
              <View
                className="h-1 rounded-full bg-primary"
                style={{ width: `${priceLevel}%` }}
              />
              <Pressable
                onPress={() => setPriceLevel(priceLevel === 50 ? 70 : 50)}
                className="absolute -top-2 size-5 rounded-full bg-primary"
                style={{ left: `${priceLevel - 3}%` }}
              />
            </View>
            <TextComponent className="text-xs text-zinc-500">
              Paid
            </TextComponent>
          </View>
        </View>

        <View className="mb-6">
          <TextComponent className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            Categories
          </TextComponent>
          <View className="flex-row flex-wrap gap-3">
            {FILTER_CATEGORIES.map((category) => (
              <FilterPill
                key={category}
                label={category}
                isActive={categories.includes(category)}
                onPress={() => toggleCategory(category)}
              />
            ))}
          </View>
        </View>

        <View className="mb-6">
          <TextComponent className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            Time
          </TextComponent>
          <View className="mb-3 h-12 flex-row items-center rounded-md border border-zinc-300 px-4">
            <TextComponent className="w-14 text-xs text-zinc-500">
              From
            </TextComponent>
            <TextComponent className="flex-1 text-sm text-zinc-500">
              Select date range
            </TextComponent>
          </View>
          <View className="mb-3 h-12 flex-row items-center rounded-md border border-zinc-300 px-4">
            <TextComponent className="w-14 text-xs text-zinc-500">
              To
            </TextComponent>
            <TextComponent className="flex-1 text-sm text-zinc-500">
              Select date range
            </TextComponent>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {FILTER_TIMES.map((item) => (
              <FilterPill
                key={item}
                label={item}
                isActive={time === item}
                onPress={() => setTime(item)}
              />
            ))}
          </View>
        </View>

        <Pressable
          onPress={onBack}
          className="h-14 items-center justify-center rounded-lg bg-primary"
        >
          <TextComponent className="font-bold text-white">
            Apply Filters
          </TextComponent>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const HappeningTodayCard = ({
  event,
  onOpenSettings
}: {
  event: TExploreEvent;
  onOpenSettings: (event: TFeedEvent) => void;
}) => {
  return (
    <Pressable className="mb-4 overflow-hidden rounded-xl bg-white shadow">
      <View className="relative h-[190px]">
        <CustomImage
          className="size-full"
          imageClassName="size-full"
          source={{ uri: event.image }}
          contentFit="cover"
        />
        {event.badge && (
          <View className="absolute right-3 top-3 rounded-full bg-sky-200 px-3 py-1">
            <TextComponent className="text-[10px] font-bold text-sky-950">
              {event.badge}
            </TextComponent>
          </View>
        )}
      </View>
      <View className="p-4">
        <View className="flex-row">
          <View className="flex-1">
            <TextComponent className="text-lg font-bold text-zinc-950">
              {event.title}
            </TextComponent>
            <TextComponent className="mt-1 text-xs text-zinc-600">
              {event.venue}, {event.location}
            </TextComponent>
            <TextComponent className="mt-1 text-xs text-zinc-600">
              {event.time}
            </TextComponent>
          </View>
          <MoreButton onPress={() => onOpenSettings(toFeedEvent(event))} />
        </View>
      </View>
    </Pressable>
  );
};

const EventFeedListScreen = ({
  title,
  description,
  events,
  onBack,
  onMessageOrganizer,
  onShareWithCommunity
}: {
  title: string;
  description: string;
  events: TExploreEvent[];
  onBack: () => void;
  onMessageOrganizer: (event: TFeedEvent) => void;
  onShareWithCommunity: (event: TFeedEvent) => void;
}) => {
  useHardwareBack(onBack);
  const [selectedEvent, setSelectedEvent] = useState<TFeedEvent | null>(null);
  const [selectedBookingEvent, setSelectedBookingEvent] =
    useState<TPerformerEvent | null>(null);
  const [bookingMode, setBookingMode] = useState<
    "detail" | "ticket" | "register"
  >("detail");
  const [query, setQuery] = useState("");
  const feedEvents = useMemo(
    () =>
      events
        .filter((event) =>
          matchesSearch(query, [
            event.title,
            event.venue,
            event.location,
            event.time,
            event.badge
          ])
        )
        .map(toFeedEvent),
    [events, query]
  );

  if (selectedBookingEvent && bookingMode === "ticket") {
    return (
      <TicketSelectionScreen
        event={selectedBookingEvent}
        onBack={() => setBookingMode("detail")}
      />
    );
  }

  if (selectedBookingEvent && bookingMode === "register") {
    return (
      <RegistrationFormScreen
        event={selectedBookingEvent}
        onBack={() => setBookingMode("detail")}
      />
    );
  }

  if (selectedBookingEvent) {
    return (
      <EventBookingDetailScreen
        event={selectedBookingEvent}
        onBack={() => setSelectedBookingEvent(null)}
        onTicket={() => setBookingMode("ticket")}
        onRegister={() => setBookingMode("register")}
        onShareEvent={onShareWithCommunity}
        onContactOrganizer={onMessageOrganizer}
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <SearchHeader
        placeholder="Search events..."
        onBack={onBack}
        query={query}
        onQueryChange={setQuery}
      />
      <View className="px-4 pb-3 pt-5">
        <TextComponent className="text-2xl font-bold text-zinc-950">
          {title}
        </TextComponent>
        <TextComponent className="mt-1 text-sm text-zinc-600">
          {description}
        </TextComponent>
      </View>
      <FlatList
        data={events.filter((event) => matchesSearch(query, [event.title, event.venue, event.location, event.time, event.badge])).slice(0, 10)}
        keyExtractor={(event) => event.id}
        renderItem={({ item, index }) => (
          <UpcomingEventSummary
            event={item}
            index={index}
            onOpenEvent={() => {
              setSelectedBookingEvent(toBookingEvent(toFeedEvent(item, index)));
              setBookingMode("detail");
            }}
            onMessageOrganizer={() => onMessageOrganizer(toFeedEvent(item, index))}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-5 pt-2"
      />
      <SettingsSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onMessageOrganizer={onMessageOrganizer}
        onShareWithCommunity={onShareWithCommunity}
      />
    </View>
  );
};

const UpcomingEventSummary = ({
  event,
  index,
  onOpenEvent,
  onMessageOrganizer
}: {
  event: TExploreEvent;
  index: number;
  onOpenEvent: () => void;
  onMessageOrganizer: () => void;
}) => {
  const isActive =
    index === 0 || /happening|live now/i.test(event.badge || "");

  return (
    <View className="mb-5 flex-row">
      <View className="mr-3 items-center">
        {isActive ? (
          <View className="size-7 items-center justify-center rounded-full bg-primary">
            <View className="size-2.5 rounded-full bg-white" />
          </View>
        ) : (
          <View className="size-4 rounded-full border-2 border-primary bg-white" />
        )}
        <View className="mt-1 h-16 w-0.5 bg-zinc-200" />
      </View>
      <View className="flex-1">
        <TextComponent
          className={
            isActive
              ? "self-start rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-white"
              : "text-[10px] text-zinc-500"
          }
        >
          {getEventCountdown(event, index)}
        </TextComponent>
        <Pressable onPress={onOpenEvent}>
          <TextComponent className="mt-1 text-base font-bold uppercase text-zinc-950">
            {event.title}
          </TextComponent>
        </Pressable>
        <TextComponent className="mt-1 text-xs text-zinc-600">
          {event.venue}, {event.location}
        </TextComponent>
        <TextComponent className="mt-1 text-xs text-zinc-600">
          {event.time}
        </TextComponent>
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={onOpenEvent}
            className={
              isActive
                ? "size-8 items-center justify-center rounded-md bg-primary"
                : "size-8 items-center justify-center rounded-md bg-blue-50"
            }
          >
            <CircleExclamationIcon
              size={14}
              color={isActive ? "#ffffff" : ACTIVE_NAV_COLOR}
            />
          </Pressable>
          <Pressable
            onPress={onMessageOrganizer}
            className="size-8 items-center justify-center rounded-md bg-blue-50"
          >
            <MessageIcon size={14} color={ACTIVE_NAV_COLOR} />
          </Pressable>
          <Pressable
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${event.venue}, ${event.location}`
                )}`
              )
            }
            className="size-8 items-center justify-center rounded-md bg-blue-50"
          >
            <LocationIcon size={14} color={ACTIVE_NAV_COLOR} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const EventMosaic = ({
  events,
  onOpen
}: {
  events: TExploreEvent[];
  onOpen: (event: TExploreEvent, index: number) => void;
}) => {
  const images = [...events, ...EXPLORE_EVENTS_BY_CATEGORY.All].slice(0, 4);

  return (
    <View className="h-[280px] overflow-hidden rounded-xl">
      <View className="flex-1 flex-row justify-between">
        <View className="w-[48%] gap-1.5">
          {[images[0], images[2]].map((event, index) => (
            <Pressable key={event.id} onPress={() => onOpen(event, index)}>
              <CustomImage
                className={
                  index === 0
                    ? "h-[152px] w-full rounded-lg"
                    : "h-[122px] w-full rounded-lg"
                }
                imageClassName="size-full rounded-lg"
                source={{ uri: event.image }}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </View>
        <View className="w-[48%] gap-1.5">
          {[images[1], images[3]].map((event, index) => (
            <Pressable key={event.id} onPress={() => onOpen(event, index + 2)}>
              <CustomImage
                className={
                  index === 0
                    ? "h-[126px] w-full rounded-lg"
                    : "h-[148px] w-full rounded-lg"
                }
                imageClassName="size-full rounded-lg"
                source={{ uri: event.image }}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
};

const CalendarScheduleScreen = ({
  title,
  subtitle,
  image,
  events,
  onBack
}: {
  title: string;
  subtitle: string;
  image: string;
  events: TCalendarEvent[];
  onBack: () => void;
}) => {
  useHardwareBack(onBack);
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 380;
  const horizontalPadding = isCompactPhone ? 12 : 16;
  const calendarInnerWidth = Math.min(width, 430) - horizontalPadding * 4;
  const dayCellWidth = Math.max(34, calendarInnerWidth / 7);
  const heroHeight = isCompactPhone ? 118 : 138;
  const [query, setQuery] = useState("");
  const scheduledEvents = useMemo(
    () =>
      events.filter((event) =>
        matchesSearch(query, [event.title, event.subtitle, event.status])
      ),
    [events, query]
  );
  const calendarDays = Array.from({ length: 26 }, (_, index) => index + 1);

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
        <Pressable
          onPress={onBack}
          className="size-9 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <TextComponent className="flex-1 text-center font-bold">
          Location
        </TextComponent>
        <View className="size-9" />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 28,
          paddingHorizontal: horizontalPadding,
          paddingTop: 20
        }}
      >
        <View
          className="relative overflow-hidden rounded-xl"
          style={{ height: heroHeight }}
        >
          <CustomImage
            className="size-full"
            imageClassName="size-full"
            source={{ uri: image }}
            contentFit="cover"
          />
          <View className="absolute inset-0 justify-end bg-black/35 p-4">
            <TextComponent className="text-xl font-bold text-white">
              {title}
            </TextComponent>
            <TextComponent className="mt-1 text-xs font-bold text-white">
              {subtitle}
            </TextComponent>
          </View>
        </View>

        <View className="mt-5 rounded-xl bg-white p-4 shadow-sm">
          <View className="mb-4 flex-row items-center justify-between">
            <TextComponent className="text-lg font-bold text-zinc-950">
              October 2024
            </TextComponent>
            <View className="flex-row gap-2">
              <View className="size-8 items-center justify-center rounded-lg bg-zinc-100">
                <ChevronLeftIcon size={16} color="#71717a" />
              </View>
              <View className="size-8 items-center justify-center rounded-lg bg-zinc-100">
                <TextComponent className="text-lg font-bold text-zinc-500">
                  ›
                </TextComponent>
              </View>
            </View>
          </View>

          <View className="mb-3 flex-row">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <TextComponent
                key={`${day}-${index}`}
                className="text-center text-xs font-semibold text-zinc-400"
                style={{ width: dayCellWidth }}
              >
                {day}
              </TextComponent>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {calendarDays.map((day) => {
              const isSelected = day === 15;
              const hasDot = [3, 8, 12].includes(day);

              return (
                <View
                  key={day}
                  className="mb-3 items-center justify-center"
                  style={{ width: dayCellWidth }}
                >
                  <View
                    className={
                      isSelected
                        ? "size-8 items-center justify-center rounded-lg bg-primary"
                        : "size-8 items-center justify-center rounded-lg"
                    }
                  >
                    <TextComponent
                      className={
                        isSelected
                          ? "text-xs font-bold text-white"
                          : "text-xs font-semibold text-zinc-600"
                      }
                    >
                      {day}
                    </TextComponent>
                  </View>
                  {hasDot && (
                    <View className="mt-1 size-1 rounded-full bg-primary" />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View className="mt-5">
          <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
            <TextComponent className="text-lg font-bold text-zinc-950">
              Events on Oct 15
            </TextComponent>
            <TextComponent className="text-[10px] font-bold uppercase text-primary">
              {scheduledEvents.length} Scheduled
            </TextComponent>
          </View>
          <View className="gap-3">
            {scheduledEvents.map((event) => (
              <View
                key={event.id}
                className="flex-row flex-wrap items-center rounded-xl bg-white p-4 shadow-sm"
              >
                <View className="flex-1">
                  <TextComponent className="text-sm font-semibold text-zinc-950">
                    {event.title}
                  </TextComponent>
                  <TextComponent className="mt-1 text-xs text-zinc-600">
                    {event.subtitle}
                  </TextComponent>
                </View>
                <VenueStatusPill status={event.status} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const CalendarScheduleScreenV2 = ({
  title,
  subtitle,
  image,
  events,
  onOpenEvent,
  onBack
}: {
  title: string;
  subtitle: string;
  image: string;
  events: TCalendarEvent[];
  onOpenEvent: (event: TPerformerEvent) => void;
  onBack: () => void;
}) => {
  useHardwareBack(onBack);
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    events[0]?.date || new Date(2024, 9, 15)
  );
  const [viewMonth, setViewMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const monthName = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
  const selectedDateLabel = selectedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  const firstDayOfMonth = viewMonth.getDay();
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0
  ).getDate();
  const calendarDays: Array<number | null> = [
    ...Array.from({ length: firstDayOfMonth }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];

  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  const eventDateKeys = useMemo(
    () =>
      new Set(
        events.map(
          (event) =>
            `${event.date.getFullYear()}-${event.date.getMonth()}-${event.date.getDate()}`
        )
      ),
    [events]
  );
  const scheduledEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event.date.getFullYear() === selectedDate.getFullYear() &&
          event.date.getMonth() === selectedDate.getMonth() &&
          event.date.getDate() === selectedDate.getDate() &&
          matchesSearch(query, [event.title, event.subtitle, event.status])
      ),
    [events, query, selectedDate]
  );
  const changeMonth = (direction: -1 | 1) => {
    const nextMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + direction,
      1
    );

    setViewMonth(nextMonth);
    setSelectedDate(nextMonth);
  };

  return (
    <View className="flex-1 bg-zinc-50">
      <SearchHeader
        placeholder="Search events, artists..."
        onBack={onBack}
        query={query}
        onQueryChange={setQuery}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-7 pt-5"
      >
        <View className="relative h-[138px] overflow-hidden rounded-xl">
          <CustomImage
            className="size-full"
            imageClassName="size-full"
            source={{ uri: image }}
            contentFit="cover"
          />
          <View className="absolute inset-0 justify-end bg-black/35 p-4">
            <TextComponent className="text-xl font-bold text-white">
              {title}
            </TextComponent>
            <TextComponent className="mt-1 text-xs font-bold text-white">
              {subtitle}
            </TextComponent>
          </View>
        </View>

        <View className="mt-5 rounded-xl bg-white p-4 shadow-sm">
          <View className="mb-4 flex-row items-center justify-between">
            <TextComponent className="text-lg font-bold text-zinc-950">
              {monthName}
            </TextComponent>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() => changeMonth(-1)}
                className="size-8 items-center justify-center rounded-lg bg-zinc-100"
              >
                <ChevronLeftIcon size={16} color="#71717a" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => changeMonth(1)}
                className="size-8 items-center justify-center rounded-lg bg-zinc-100"
              >
                <ChevronRightVectorIcon size={16} color="#71717a" />
              </Pressable>
            </View>
          </View>

          <View className="mb-3 flex-row justify-between px-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <TextComponent
                key={`${day}-${index}`}
                className="w-8 text-center text-xs font-semibold text-zinc-400"
              >
                {day}
              </TextComponent>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {calendarDays.map((day, index) => {
              const dateKey = day
                ? `${viewMonth.getFullYear()}-${viewMonth.getMonth()}-${day}`
                : "";
              const isSelected =
                day === selectedDate.getDate() &&
                viewMonth.getMonth() === selectedDate.getMonth() &&
                viewMonth.getFullYear() === selectedDate.getFullYear();
              const hasDot = eventDateKeys.has(dateKey);

              return (
                <Pressable
                  key={`${dateKey || "empty"}-${index}`}
                  disabled={!day}
                  accessibilityRole={day ? "button" : undefined}
                  accessibilityLabel={day ? `Select day ${day}` : undefined}
                  onPress={() =>
                    day &&
                    setSelectedDate(
                      new Date(
                        viewMonth.getFullYear(),
                        viewMonth.getMonth(),
                        day
                      )
                    )
                  }
                  className="mb-3 w-[14.28%] items-center justify-center"
                >
                  <View
                    className={
                      isSelected
                        ? "size-8 items-center justify-center rounded-lg bg-primary"
                        : "size-8 items-center justify-center rounded-lg"
                    }
                  >
                    <TextComponent
                      className={
                        isSelected
                          ? "text-xs font-bold text-white"
                          : "text-xs font-semibold text-zinc-600"
                      }
                    >
                      {day || ""}
                    </TextComponent>
                  </View>
                  {hasDot && (
                    <View className="mt-1 size-1 rounded-full bg-primary" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-5">
          <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
            <TextComponent className="text-lg font-bold text-zinc-950">
              Events on {selectedDateLabel}
            </TextComponent>
            <TextComponent className="text-[10px] font-bold uppercase text-primary">
              {scheduledEvents.length} Scheduled
            </TextComponent>
          </View>
          <View className="gap-3">
            {scheduledEvents.map((event) => (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${event.title}`}
                onPress={() => onOpenEvent(event.sourceEvent)}
                className="flex-row flex-wrap items-center rounded-xl bg-white p-4 shadow-sm"
              >
                <View className="flex-1">
                  <TextComponent className="text-sm font-semibold text-zinc-950">
                    {event.title}
                  </TextComponent>
                  <TextComponent className="mt-1 text-xs text-zinc-600">
                    {event.subtitle}
                  </TextComponent>
                </View>
                <VenueStatusPill status={event.status} />
              </Pressable>
            ))}
            {scheduledEvents.length === 0 && (
              <View className="rounded-xl bg-white p-5 shadow-sm">
                <TextComponent className="text-sm font-semibold text-zinc-950">
                  No events scheduled
                </TextComponent>
                <TextComponent className="mt-1 text-xs text-zinc-500">
                  Pick another highlighted day or change the month.
                </TextComponent>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const VenueStatCard = ({
  icon,
  value,
  label
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) => {
  return (
    <View className="h-[132px] w-[47%] items-center justify-center rounded-lg bg-zinc-100 px-3">
      {icon}
      <TextComponent className="mt-4 text-3xl font-bold text-zinc-950">
        {value}
      </TextComponent>
      <TextComponent className="mt-2 text-center text-sm font-semibold text-zinc-500">
        {label}
      </TextComponent>
    </View>
  );
};

const VenueStatusPill = ({ status }: { status?: string }) => {
  const toneClasses =
    status === "Sold Out"
      ? { wrapper: "bg-red-50", text: "text-red-600" }
      : status === "Selling Fast"
        ? { wrapper: "bg-sky-50", text: "text-sky-700" }
        : { wrapper: "bg-green-50", text: "text-green-600" };

  return (
    <View className={`rounded-full px-3 py-1 ${toneClasses.wrapper}`}>
      <TextComponent className={`text-[10px] font-bold ${toneClasses.text}`}>
        {status || "Available"}
      </TextComponent>
    </View>
  );
};

const VenueEventCard = ({
  event,
  onPress
}: {
  event: TExploreEvent;
  onPress: () => void;
}) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${event.title}`}
      onPress={onPress}
      className="flex-row items-center rounded-xl bg-white p-4 shadow-sm"
    >
      <View className="flex-1">
        <TextComponent className="text-base font-semibold text-zinc-950">
          {event.title}
        </TextComponent>
        <TextComponent className="mt-1 text-xs text-zinc-600">
          {event.time} - {event.location}
        </TextComponent>
      </View>
      <VenueStatusPill status={event.badge} />
    </Pressable>
  );
};

const VenueFacilityChip = ({
  label,
  icon
}: {
  label: string;
  icon: React.ReactNode;
}) => {
  return (
    <View className="mr-3 flex-row items-center rounded-lg bg-zinc-100 px-3 py-3">
      {icon}
      <TextComponent className="ml-2 text-xs font-bold text-zinc-700">
        {label}
      </TextComponent>
    </View>
  );
};

const VenueDetailScreen = ({
  venue,
  onBack
}: {
  venue: TVenue;
  onBack: () => void;
}) => {
  useHardwareBack(onBack);
  const [query, setQuery] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const followedLocations = usePrototypeSocialStore(
    (state) => state.followedLocations
  );
  const toggleLocation = usePrototypeSocialStore(
    (state) => state.toggleLocation
  );
  const isFollowingLocation = followedLocations.some(
    (item) => item.id === venue.id
  );
  const [selectedEvent, setSelectedEvent] = useState<TPerformerEvent | null>(
    null
  );
  const [bookingMode, setBookingMode] = useState<
    "detail" | "ticket" | "register"
  >("detail");
  const events = useMemo(
    () =>
      VENUE_EVENTS.filter((event) =>
        matchesSearch(query, [
          event.title,
          event.venue,
          event.location,
          event.time,
          event.badge
        ])
      ),
    [query]
  );
  const calendarEvents = useMemo(
    () =>
      VENUE_EVENTS.map((event, index) => {
        const sourceEvent: TPerformerEvent = {
          id: event.id,
          title: event.title,
          venue: event.venue,
          location: venue.location,
          date: event.time.split(" - ")[0] || "Oct 24",
          time: event.time.split(" - ")[1] || "8:00 PM",
          image: event.image,
          status: event.badge || "Available",
          bookingType:
            index === 1 ? "external" : index === 2 ? "register" : "ticket"
        };

        return {
          id: event.id,
          title: event.title,
          subtitle: `${event.time} - ${event.location}`,
          status: event.badge || "Available",
          date:
            index === 0
              ? new Date(2024, 9, 24)
              : index === 1
                ? new Date(2024, 9, 15)
                : index === 2
                  ? new Date(2024, 9, 28)
                  : new Date(2024, 10, 15),
          image: event.image,
          sourceEvent
        };
      }),
    [venue.location]
  );

  if (selectedEvent && bookingMode === "ticket") {
    return (
      <TicketSelectionScreen
        event={selectedEvent}
        onBack={() => setBookingMode("detail")}
      />
    );
  }

  if (selectedEvent && bookingMode === "register") {
    return (
      <RegistrationFormScreen
        event={selectedEvent}
        onBack={() => setBookingMode("detail")}
      />
    );
  }

  if (selectedEvent) {
    return (
      <EventBookingDetailScreen
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
        onTicket={() => setBookingMode("ticket")}
        onRegister={() => setBookingMode("register")}
      />
    );
  }

  if (showCalendar) {
    return (
      <CalendarScheduleScreenV2
        title={`${venue.title} - Calendar`}
        subtitle="Modern hub for Elite Events"
        image={venue.image}
        events={calendarEvents}
        onOpenEvent={(event) => {
          setSelectedEvent(event);
          setShowCalendar(false);
        }}
        onBack={() => setShowCalendar(false)}
      />
    );
  }

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
        <Pressable onPress={onBack} className="size-9 items-center justify-center"><ChevronLeftIcon size={18} color="#52525b" /></Pressable>
        <TextComponent className="flex-1 text-center font-bold">Venue</TextComponent><View className="size-9" />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-6"
      >
        <View className="relative h-[220px]">
          <CustomImage
            className="size-full"
            imageClassName="size-full"
            source={{ uri: venue.image }}
            contentFit="cover"
          />
        </View>

        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <TextComponent className="text-[10px] font-bold uppercase text-primary">Featured Venue</TextComponent>
              <TextComponent className="mt-1 text-xl font-bold text-zinc-950">{venue.title}</TextComponent>
              <TextComponent className="mt-1 text-xs text-zinc-600">{venue.capacity} Capacity</TextComponent>
              <TextComponent className="mt-1 text-xs text-zinc-600">{venue.location}</TextComponent>
            </View>
            <View className="items-end gap-2">
              <Pressable onPress={() => toggleLocation(venue)} className={isFollowingLocation ? "h-10 items-center justify-center rounded-lg border border-primary bg-white px-5" : "h-10 items-center justify-center rounded-lg bg-primary px-5"}><TextComponent className={isFollowingLocation ? "font-bold text-primary" : "font-bold text-white"}>{isFollowingLocation ? "Following" : "Follow"}</TextComponent></Pressable>
              <Pressable onPress={() => onInfo(`Opening a private chat with ${venue.title}`)} className="size-10 items-center justify-center rounded-lg bg-blue-50"><MessageIcon size={18} color={ACTIVE_NAV_COLOR} /></Pressable>
            </View>
          </View>
        </View>

        <View className="mx-4 mt-4 h-11 flex-row items-center rounded-xl bg-white px-3 shadow-sm">
          <SearchIcon size={16} color="#8a8f98" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search events at this location"
            placeholderTextColor="#8a8f98"
            className="ml-2 flex-1 text-xs outline-none"
          />
        </View>

        <View className="px-4 pt-5">
          <View className="flex-row flex-wrap justify-between gap-y-4">
            <VenueStatCard
              icon={<StarVectorIcon size={20} color={ACTIVE_NAV_COLOR} />}
              value={venue.rating}
              label="Avg Rating"
            />
            <VenueStatCard
              icon={<TicketVectorIcon size={20} color={ACTIVE_NAV_COLOR} />}
              value={venue.activeEvents}
              label="Active Events"
            />
            <VenueStatCard
              icon={<ForkKnifeVectorIcon size={20} color={ACTIVE_NAV_COLOR} />}
              value={venue.concessions}
              label="Concessions"
            />
            <VenueStatCard
              icon={<WifiVectorIcon size={20} color={ACTIVE_NAV_COLOR} />}
              value={venue.wifi}
              label="Stadium WiFi"
            />
          </View>

          <View className="mt-7">
            <SectionHeader
              title="Events at this Venue"
              action="View Calendar"
              onActionPress={() => setShowCalendar(true)}
            />
            <TextComponent className="-mt-2 mb-4 text-xs text-zinc-600">
              Experience the best in live entertainment
            </TextComponent>
            <View className="gap-3">
              {events.map((event, index) => (
                <VenueEventCard
                  key={event.id}
                  event={event}
                  onPress={() =>
                    setSelectedEvent({
                      id: event.id,
                      title: event.title,
                      venue: event.venue,
                      location: venue.location,
                      date: event.time.split(" - ")[0] || "Oct 24",
                      time: event.time.split(" - ")[1] || "8:00 PM",
                      image: event.image,
                      status: event.badge || "Available",
                      bookingType:
                        index === 1
                          ? "external"
                          : index === 2
                            ? "register"
                            : "ticket"
                    })
                  }
                />
              ))}
            </View>
          </View>

          <View className="mt-7">
            <SectionHeader title="Venue Facilities" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <VenueFacilityChip
                label="Accessible"
                icon={
                  <AccessibleVectorIcon size={18} color={ACTIVE_NAV_COLOR} />
                }
              />
              <VenueFacilityChip
                label="Parking available"
                icon={<ParkingVectorIcon size={18} color={ACTIVE_NAV_COLOR} />}
              />
              <VenueFacilityChip
                label="Free WiFi"
                icon={<WifiVectorIcon size={18} color={ACTIVE_NAV_COLOR} />}
              />
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const EventPlannerDetailScreen = ({
  planner,
  onBack
}: {
  planner: TEventPlanner;
  onBack: () => void;
}) => {
  useHardwareBack(onBack);
  const followedPlanners = usePrototypeSocialStore(
    (state) => state.followedPlanners
  );
  const togglePlanner = usePrototypeSocialStore((state) => state.togglePlanner);
  const isFollowing = followedPlanners.some((item) => item.id === planner.id);
  const [query, setQuery] = useState("");
  const plannerEvents = VENUE_EVENTS.filter((event) =>
    matchesSearch(query, [event.title, event.venue, event.location, event.time])
  );

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
        <Pressable
          onPress={onBack}
          className="size-9 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <TextComponent className="flex-1 text-center font-bold text-zinc-950">
          Event Planner
        </TextComponent>
        <View className="size-9" />
      </View>
      <ScrollView contentContainerClassName="pb-8">
        <CustomImage
          className="h-56 w-full"
          imageClassName="size-full"
          source={{ uri: planner.image }}
          contentFit="cover"
        />
        <View className="px-4 py-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <TextComponent className="text-xl font-bold text-zinc-950">
                {planner.name}
              </TextComponent>
              <TextComponent className="mt-1 text-xs text-zinc-500">
                {planner.location}
              </TextComponent>
            </View>
            <View className="items-end gap-2">
              <Pressable onPress={() => togglePlanner(planner)} className={isFollowing ? "rounded-lg border border-primary bg-blue-50 px-5 py-2.5" : "rounded-lg bg-primary px-5 py-2.5"}><TextComponent className={isFollowing ? "font-bold text-primary" : "font-bold text-white"}>{isFollowing ? "Following" : "Follow"}</TextComponent></Pressable>
              <Pressable onPress={() => onInfo(`Opening a private chat with ${planner.name}`)} className="size-10 items-center justify-center rounded-lg bg-blue-50"><MessageIcon size={18} color={ACTIVE_NAV_COLOR} /></Pressable>
            </View>
          </View>
          <View className="mt-5 rounded-xl bg-white p-4">
            <TextComponent className="font-bold text-zinc-950">
              About
            </TextComponent>
            <TextComponent className="mt-2 text-sm leading-5 text-zinc-600">
              {planner.specialty}
            </TextComponent>
            <TextComponent className="mt-2 text-xs font-bold text-primary">
              {planner.events}
            </TextComponent>
          </View>
          <View className="mt-5">
            <View className="mb-4 h-11 flex-row items-center rounded-xl bg-white px-3 shadow-sm"><SearchIcon size={16} color="#8a8f98" /><TextInput value={query} onChangeText={setQuery} placeholder="Search events by this planner" placeholderTextColor="#8a8f98" className="ml-2 flex-1 text-xs outline-none" /></View>
            <SectionHeader title="Events by this planner" />
            <View className="gap-3">{plannerEvents.slice(0, 10).map((event) => <VenueEventCard key={event.id} event={event} onPress={() => onInfo(`${event.title} opened`)} />)}</View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const ExploreDirectoryHeader = ({
  title,
  query,
  onQueryChange,
  onBack
}: {
  title: string;
  query: string;
  onQueryChange: (value: string) => void;
  onBack: () => void;
}) => {
  useHardwareBack(onBack);
  return (
  <View className="bg-white">
    <View className="h-14 flex-row items-center border-b border-zinc-100 px-3">
      <Pressable onPress={onBack} className="size-9 items-center justify-center">
        <ChevronLeftIcon size={18} color="#52525b" />
      </Pressable>
      <TextComponent className="flex-1 text-center font-bold text-zinc-950">{title}</TextComponent>
      <View className="size-9" />
    </View>
    <View className="mx-4 mb-3 mt-3 h-11 flex-row items-center rounded-xl bg-zinc-100 px-3">
      <SearchIcon size={16} color="#8a8f98" />
      <TextInput value={query} onChangeText={onQueryChange} placeholder={`Search ${title.toLowerCase()}...`} placeholderTextColor="#8a8f98" className="ml-2 flex-1 text-xs outline-none" />
    </View>
  </View>
  );
};

const ExploreDirectoryCard = ({ image, title, subtitle, onPress }: { image: string; title: string; subtitle: string; onPress: () => void }) => (
  <Pressable onPress={onPress} className="mb-4 w-[48%] overflow-hidden rounded-xl bg-white shadow-sm">
    <CustomImage className="h-36 w-full" imageClassName="size-full" source={{ uri: image }} contentFit="cover" />
    <View className="p-3">
      <TextComponent numberOfLines={1} className="font-bold text-zinc-950">{title}</TextComponent>
      <TextComponent numberOfLines={2} className="mt-1 text-xs text-zinc-500">{subtitle}</TextComponent>
    </View>
  </Pressable>
);


const ChatSearch = ({
  value,
  onChangeText,
  placeholder = "Search conversations..."
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) => (
  <View className="h-11 flex-row items-center rounded-xl bg-zinc-100 px-3">
    <SearchIcon size={16} color="#8a8f98" />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#8a8f98"
      className="ml-2 flex-1 p-0 text-xs text-zinc-700 outline-none"
    />
  </View>
);

const ChatAvatar = ({
  image,
  size = 48,
  online
}: {
  image: string;
  size?: number;
  online?: boolean;
}) => (
  <View className="relative">
    <CustomImage
      className="rounded-lg"
      imageClassName="size-full rounded-lg"
      source={{ uri: image }}
      contentFit="cover"
      style={{ height: size, width: size }}
    />
    {online && (
      <View className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-green-500" />
    )}
  </View>
);

const StoryActionIcon = ({
  type,
  color = "#ffffff",
  size = 20
}: {
  type:
    | "close"
    | "flash"
    | "text"
    | "sticker"
    | "effects"
    | "camera"
    | "send"
    | "more"
    | "plus"
    | "email"
    | "share"
    | "message";
  color?: string;
  size?: number;
}) => {
  const paths: Record<string, string> = {
    close: "M6 6l12 12M18 6 6 18",
    flash: "M13 2 5 14h6l-1 8 9-13h-6V2Z",
    text: "M5 5h14M12 5v14M8 19h8",
    sticker: "M5 4h14v12l-4 4H5V4Zm10 12v4M8 9h.01M12 9h.01M16 9h.01",
    effects:
      "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
    camera:
      "M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    send: "M3 11.5 21 3l-7.5 18-2.2-7.3L3 11.5Zm8.3 2.2L21 3",
    more: "M12 6h.01M12 12h.01M12 18h.01",
    plus: "M12 5v14M5 12h14",
    email: "M3 6h18v12H3V6Zm0 1 9 7 9-7",
    share: "M12 3v12M7 8l5-5 5 5M5 13v7h14v-7",
    message: "M4 5h16v12H9l-5 4V5Z"
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={paths[type]}
        stroke={color}
        strokeWidth={type === "more" ? 3 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const ChatListScreen = ({
  hasChats,
  conversations,
  onOpenAccess,
  onOpenThread,
  onOpenYourStory,
  onOpenMyPostedStory,
  onOpenStory,
  hasMyStory,
  viewedStoryIds,
  mutedStoryIds,
  myStoryImage,
  blockedUserIds
}: {
  hasChats: boolean;
  conversations: TConversation[];
  onOpenAccess: () => void;
  onOpenThread: (conversation: TConversation) => void;
  onOpenYourStory: () => void;
  onOpenMyPostedStory: () => void;
  onOpenStory: (story: TChatContact) => void;
  hasMyStory: boolean;
  viewedStoryIds: string[];
  mutedStoryIds: string[];
  myStoryImage: string | null;
  blockedUserIds: string[];
}) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [showMutedStories, setShowMutedStories] = useState(false);
  const visibleStories = CHAT_STORIES.filter(
    (story) => !blockedUserIds.includes(story.id)
  );
  const activeStories = visibleStories.filter(
    (story) =>
      !viewedStoryIds.includes(story.id) && !mutedStoryIds.includes(story.id)
  );
  const viewedStories = visibleStories.filter(
    (story) =>
      viewedStoryIds.includes(story.id) && !mutedStoryIds.includes(story.id)
  );
  const mutedStories = visibleStories.filter((story) =>
    mutedStoryIds.includes(story.id)
  );
  const visibleConversations = conversations.filter((conversation) => {
    const matchesFilter =
      filter === "All" ||
      (filter === "Groups" && conversation.kind !== "private") ||
      (filter === "Private" && conversation.kind === "private");

    return (
      !blockedUserIds.includes(conversation.id) &&
      matchesFilter &&
      matchesSearch(query, [conversation.title, conversation.subtitle])
    );
  });

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="mx-4 mt-4">
        <ChatSearch value={query} onChangeText={setQuery} />
      </View>

      <View className="mx-4 mt-5">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable onPress={onOpenYourStory} className="mr-4 items-center">
            <View className="size-14 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white">
              <UserOutlineIcon size={24} color="#a1a1aa" />
            </View>
            <TextComponent className="mt-2 text-[10px] text-zinc-500">
              Your Story
            </TextComponent>
          </Pressable>
          {hasMyStory && myStoryImage && (
            <Pressable
              onPress={onOpenMyPostedStory}
              className="mr-4 items-center"
            >
              <View className="size-14 overflow-hidden rounded-lg border-2 border-primary">
                <CustomImage
                  className="size-full"
                  imageClassName="size-full"
                  source={{ uri: myStoryImage }}
                  contentFit="cover"
                />
              </View>
              <TextComponent className="mt-2 text-[10px] text-zinc-700">
                My Story
              </TextComponent>
            </Pressable>
          )}
          {hasChats &&
            [...activeStories, ...viewedStories].map((story) => (
                <Pressable
                  onPress={() => onOpenStory(story)}
                  key={story.id}
                  className="mr-4 items-center"
                >
                  <View
                    className={
                      viewedStoryIds.includes(story.id)
                        ? "rounded-xl border-2 border-zinc-300 p-0.5"
                        : "rounded-xl border-2 border-sky-400 p-0.5"
                    }
                  >
                    <ChatAvatar
                      image={story.avatar}
                      size={52}
                      online={story.online}
                    />
                  </View>
                  <TextComponent className="mt-2 text-[10px] text-zinc-700">
                    {story.name}
                  </TextComponent>
                </Pressable>
              ))}
          {hasChats && mutedStories.length > 0 && (
            <Pressable onPress={() => setShowMutedStories((visible) => !visible)} className="mr-4 items-center justify-center">
              <View className="size-14 items-center justify-center rounded-lg bg-zinc-200">
                <TextComponent className="text-[10px] font-bold text-zinc-600">Muted</TextComponent>
              </View>
              <TextComponent className="mt-2 text-[10px] text-zinc-500">{showMutedStories ? "Hide" : "Muted"}</TextComponent>
            </Pressable>
          )}
          {hasChats && showMutedStories && mutedStories.map((story) => (
            <Pressable onPress={() => onOpenStory(story)} key={`muted-${story.id}`} className="mr-4 items-center opacity-60">
              <View className="rounded-xl border-2 border-zinc-300 p-0.5"><ChatAvatar image={story.avatar} size={52} online={story.online} /></View>
              <TextComponent className="mt-2 text-[10px] text-zinc-500">{story.name}</TextComponent>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View className="mx-4 mt-5 flex-row gap-3">
        {["All", "Groups", "Private"].map((item) => {
          const isActive = filter === item;

          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              className={
                isActive
                  ? "rounded-full bg-primary px-5 py-2"
                  : "rounded-full bg-zinc-100 px-5 py-2"
              }
            >
              <TextComponent
                className={
                  isActive
                    ? "text-xs font-bold text-white"
                    : "text-xs font-bold text-zinc-600"
                }
              >
                {item}
              </TextComponent>
            </Pressable>
          );
        })}
      </View>

      {hasChats ? (
        <ScrollView showsVerticalScrollIndicator={false} className="mx-4 mt-5">
          {visibleConversations.map((conversation) => (
            <Pressable
              key={conversation.id}
              onPress={() => onOpenThread(conversation)}
              className="mb-4 flex-row items-center"
            >
              <ChatAvatar
                image={conversation.avatar}
                online={!!conversation.unread}
              />
              <View className="ml-3 flex-1 border-b border-zinc-100 pb-3">
                <TextComponent className="font-bold text-zinc-950">
                  {conversation.title}
                </TextComponent>
                <TextComponent
                  numberOfLines={1}
                  className="mt-1 text-xs text-zinc-600"
                >
                  {conversation.subtitle}
                </TextComponent>
              </View>
              <View className="ml-2 items-end self-stretch pb-3">
                <TextComponent className="text-[10px] font-semibold text-primary">
                  {conversation.time}
                </TextComponent>
                {!!conversation.unread && (
                  <View className="mt-1 size-5 items-center justify-center rounded-md bg-primary">
                    <TextComponent className="text-[10px] font-bold text-white">
                      {conversation.unread}
                    </TextComponent>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <CustomImage
            className="size-44"
            imageClassName="size-full"
            source={EmptyChatHero}
            contentFit="contain"
          />
          <TextComponent className="mt-5 text-center text-sm text-zinc-600">
            No conversations yet. Your active chats and groups will appear here.
          </TextComponent>
          <TextComponent className="mt-2 text-center text-sm text-zinc-600">
            Start a conversation now!
          </TextComponent>
        </View>
      )}

      <Pressable
        onPress={onOpenAccess}
        className="absolute bottom-6 right-5 size-12 items-center justify-center rounded-full bg-primary shadow"
      >
        <TextComponent className="-mt-0.5 text-2xl font-semibold leading-6 text-white">
          +
        </TextComponent>
      </Pressable>
    </View>
  );
};

const ContactAccessScreen = ({
  onAllow,
  onBack
}: {
  onAllow: () => void;
  onBack: () => void;
}) => (
  <View className="flex-1 justify-center bg-white px-8">
    <View className="items-center">
      <CustomImage
        className="size-48"
        imageClassName="size-full"
        source={ContactAccessHero}
        contentFit="contain"
      />
      <TextComponent className="mt-10 text-xl font-bold text-zinc-950">
        Find your friends on Turnupz
      </TextComponent>
      <TextComponent className="mt-3 text-center text-sm leading-5 text-zinc-600">
        Enable contact access to see which of your friends are already here and
        invite others.
      </TextComponent>
      <Pressable
        onPress={onAllow}
        className="mt-8 h-12 w-full items-center justify-center rounded-lg bg-primary"
      >
        <TextComponent className="font-bold text-white">
          Allow Access
        </TextComponent>
      </Pressable>
      <Pressable
        onPress={onBack}
        className="mt-5 h-10 items-center justify-center"
      >
        <TextComponent className="text-sm font-bold text-zinc-600">
          Back
        </TextComponent>
      </Pressable>
      <TextComponent className="mt-8 text-center text-[10px] text-zinc-400">
        Your contacts are never stored without permission.
      </TextComponent>
    </View>
  </View>
);

const ContactsScreen = ({
  onBack,
  onAddContact,
  onNewGroup,
  onInviteSuccess,
  onMessageFriend
}: {
  onBack: () => void;
  onAddContact: () => void;
  onNewGroup: () => void;
  onInviteSuccess: () => void;
  onMessageFriend: (friend: TChatContact) => void;
}) => {
  useHardwareBack(onBack);
  const [query, setQuery] = useState("");
  const [messageContact, setMessageContact] = useState<TInviteTarget | null>(
    null
  );
  const [inviteMessage, setInviteMessage] = useState(
    "Hey! Join me on Turnupz to discover the best live events and follow your favorite performers. Download it here: tnpz.io/invite"
  );
  const [showAllFriends, setShowAllFriends] = useState(false);
  const contacts = INVITE_CONTACTS.filter((contact) =>
    matchesSearch(query, [contact.name, contact.phone])
  );

  if (showAllFriends) {
    return (
      <View className="flex-1 bg-zinc-50">
        <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
          <Pressable onPress={() => setShowAllFriends(false)} className="size-9 items-center justify-center"><ChevronLeftIcon size={18} color="#52525b" /></Pressable>
          <TextComponent className="flex-1 text-center font-bold">Friends on Turnupz</TextComponent>
          <View className="size-9" />
        </View>
        <ScrollView contentContainerClassName="p-4 pb-8">
          {CHAT_STORIES.map((friend) => (
            <Pressable key={friend.id} onPress={() => onMessageFriend(friend)} className="mb-3 flex-row items-center rounded-xl border border-zinc-100 bg-white p-3 shadow-sm">
              <View className="relative">
                <CustomImage className="size-12 overflow-hidden rounded-lg" imageClassName="size-full rounded-lg" source={{ uri: friend.avatar }} contentFit="cover" />
                {friend.online && <View className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-white bg-green-500" />}
              </View>
              <View className="ml-3 flex-1"><TextComponent className="font-bold">{friend.name}</TextComponent><TextComponent className="text-xs text-zinc-500">{friend.subtitle}</TextComponent></View>
              <View className="h-9 items-center justify-center rounded-lg bg-primary px-4"><TextComponent className="text-xs font-bold text-white">Message</TextComponent></View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 bg-zinc-50"
        contentContainerClassName="p-4 pb-8"
      >
        <View className="mb-5 flex-row items-center gap-2">
          <Pressable
            onPress={onBack}
            className="size-9 items-center justify-center"
          >
            <ChevronLeftIcon size={18} color="#52525b" />
          </Pressable>
          <TextComponent className="flex-1 text-center text-lg font-bold text-zinc-950">
            Contacts
          </TextComponent>
          <View className="size-9" />
        </View>
        <Pressable
          onPress={onAddContact}
          className="mb-3 flex-row items-center rounded-xl bg-white p-4 shadow-sm"
        >
          <View className="size-10 items-center justify-center rounded-full bg-primary">
            <TextComponent className="text-xl font-bold text-white">
              +
            </TextComponent>
          </View>
          <View className="ml-3 flex-1">
            <TextComponent className="font-bold text-zinc-950">
              Add Contact
            </TextComponent>
            <TextComponent className="mt-1 text-xs text-zinc-500">
              Add someone new to your list
            </TextComponent>
          </View>
          <ChevronRightVectorIcon size={16} color="#a1a1aa" />
        </Pressable>
        <Pressable
          onPress={onNewGroup}
          className="mb-6 flex-row items-center rounded-xl bg-white p-4 shadow-sm"
        >
          <View className="size-10 items-center justify-center rounded-full bg-primary">
            <GroupVectorIcon size={18} color="#ffffff" />
          </View>
          <View className="ml-3 flex-1">
            <TextComponent className="font-bold text-zinc-950">
              New Group
            </TextComponent>
            <TextComponent className="mt-1 text-xs text-zinc-500">
              Chat with multiple people
            </TextComponent>
          </View>
          <ChevronRightVectorIcon size={16} color="#a1a1aa" />
        </Pressable>
        <View className="mb-6">
          <ChatSearch
            value={query}
            onChangeText={setQuery}
            placeholder="Search contacts..."
          />
        </View>

        <View className="mb-3 flex-row items-center justify-between">
          <TextComponent className="font-bold text-zinc-950">
            Friends on Turnupz
          </TextComponent>
          <Pressable onPress={() => setShowAllFriends(true)}>
            <TextComponent className="text-xs font-bold text-primary">
              See all
            </TextComponent>
          </Pressable>
        </View>
        <View className="mb-6 flex-row justify-between">
          {CHAT_STORIES.slice(0, 3).map((friend) => {
            const nameParts = friend.name.trim().split(/\s+/);
            const shortName =
              nameParts.length > 1
                ? `${nameParts[0]} ${nameParts[1][0]}.`
                : friend.name;
            return (
              <View
                key={friend.id}
                className="w-[31.5%] rounded-xl border border-zinc-100 bg-white px-3 pb-3 pt-3 shadow-sm"
              >
                <View className="relative self-center rounded-xl border-2 border-sky-500 p-0.5">
                  <CustomImage
                    className="size-[58px] overflow-hidden rounded-lg bg-zinc-100"
                    imageClassName="size-full rounded-lg"
                    source={{ uri: friend.avatar }}
                    contentFit="cover"
                  />
                  {friend.online && (
                    <View className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-green-500" />
                  )}
                </View>
                <TextComponent
                  numberOfLines={1}
                  className="mt-2 text-center text-xs font-bold text-zinc-700"
                >
                  {shortName}
                </TextComponent>
                <Pressable
                  onPress={() => onMessageFriend(friend)}
                  className="mt-2 h-10 items-center justify-center rounded-md bg-primary"
                >
                  <TextComponent className="text-xs font-bold text-white">
                    Message
                  </TextComponent>
                </Pressable>
              </View>
            );
          })}
        </View>

        <TextComponent className="mb-3 font-bold text-zinc-950">
          Invite to Turnupz
        </TextComponent>
        {contacts.map((contact) => (
          <View key={contact.id} className="mb-3 flex-row items-center">
            <View className="size-10 items-center justify-center rounded-lg bg-blue-100">
              <TextComponent className="text-xs font-bold text-primary">
                {contact.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </TextComponent>
            </View>
            <View className="ml-3 flex-1">
              <TextComponent className="text-sm font-bold text-zinc-950">
                {contact.name}
              </TextComponent>
              <TextComponent className="text-xs text-zinc-500">
                {contact.phone}
              </TextComponent>
            </View>
            <Pressable
              onPress={() => setMessageContact(contact)}
              className="rounded-full bg-zinc-200 px-4 py-2"
            >
              <TextComponent className="text-xs font-bold text-primary">
                Invite
              </TextComponent>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      {messageContact && (
        <View className="absolute inset-0 justify-center bg-black/45 px-5">
          <View className="rounded-2xl bg-white p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <TextComponent className="text-lg font-bold text-zinc-950">
                New Message
              </TextComponent>
              <Pressable onPress={() => setMessageContact(null)}>
                <TextComponent className="text-xl text-zinc-500">
                  ×
                </TextComponent>
              </Pressable>
            </View>
            <View className="mb-4 flex-row items-center">
              <TextComponent className="mr-2 text-sm text-zinc-500">
                To:
              </TextComponent>
              <View className="rounded-full bg-primary px-3 py-1">
                <TextComponent className="text-xs font-bold text-white">
                  {messageContact.phone || messageContact.name}
                </TextComponent>
              </View>
            </View>
            <TextInput
              value={inviteMessage}
              onChangeText={setInviteMessage}
              multiline
              className="min-h-[118px] rounded-xl bg-primary px-4 py-3 text-sm text-white outline-none"
            />
            <TextComponent className="mt-2 text-[10px] font-bold uppercase text-zinc-400">
              Delivered
            </TextComponent>
            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setMessageContact(null)}
                className="h-12 flex-1 items-center justify-center rounded-lg"
              >
                <TextComponent className="font-bold text-primary">
                  Cancel
                </TextComponent>
              </Pressable>
              <Pressable
                onPress={() => {
                  setMessageContact(null);
                  onInviteSuccess();
                }}
                className="h-12 flex-1 items-center justify-center rounded-lg bg-primary"
              >
                <TextComponent className="font-bold text-white">
                  Send
                </TextComponent>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const AddContactScreen = ({
  onBack,
  onSuccess
}: {
  onBack: () => void;
  onSuccess: () => void;
}) => {
  useHardwareBack(onBack);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const validPhone = /^\+?[\d\s()-]{8,}$/.test(phone.trim());
  const canSubmit = Boolean(name.trim() && (validEmail || validPhone));
  const isTurnupzUser =
    email.trim().toLowerCase().endsWith("@turnupz.app") ||
    email.trim().toLowerCase().includes("sarah") ||
    phone.replace(/\D/g, "").endsWith("3456");

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="p-4 pb-8"
    >
      <View className="mb-5 flex-row items-center">
        <Pressable
          onPress={onBack}
          className="size-9 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <TextComponent className="flex-1 text-center font-bold text-zinc-950">
          Add New Contact
        </TextComponent>
      </View>
      <View className="h-44 justify-end overflow-hidden rounded-xl bg-primary">
        <CustomImage className="absolute inset-0 size-full" imageClassName="size-full" source={AddContactNetworkBanner} contentFit="cover" />
        <View className="bg-black/35 p-4">
          <TextComponent className="text-lg font-bold text-white">Grow your network</TextComponent>
          <TextComponent className="mt-1 text-xs leading-5 text-white/90">
            Your friend will receive a link to create an account and accept your request.
          </TextComponent>
        </View>
      </View>
      {[
        {
          label: "Full Name",
          value: name,
          setValue: setName,
          placeholder: "e.g. Alex Johnson"
        },
        {
          label: "Email Address",
          value: email,
          setValue: setEmail,
          placeholder: "alex@example.com"
        },
        {
          label: "Phone Number",
          value: phone,
          setValue: setPhone,
          placeholder: "+1 (555) 000-0000"
        }
      ].map((field) => (
        <View key={field.label} className="mt-4">
          <TextComponent className="mb-2 text-xs font-bold text-zinc-600">
            {field.label}
          </TextComponent>
          <TextInput
            value={field.value}
            onChangeText={field.setValue}
            placeholder={field.placeholder}
            placeholderTextColor="#a1a1aa"
            className="h-12 rounded-lg bg-zinc-100 px-4 text-sm text-zinc-950 outline-none"
          />
        </View>
      ))}
      {(email.trim() || phone.trim()) && (
        <View
          className={
            canSubmit
              ? "mt-3 rounded-lg bg-blue-50 p-3"
              : "mt-3 rounded-lg bg-red-50 p-3"
          }
        >
          <TextComponent
            className={
              canSubmit ? "text-xs text-primary" : "text-xs text-red-600"
            }
          >
            {!canSubmit
              ? "Enter a valid email address or phone number."
              : isTurnupzUser
                ? "Turnupz user verified. You can message this user directly."
                : "No Turnupz account found. We will notify this contact by both available email and phone channels."}
          </TextComponent>
        </View>
      )}
      <View className="mt-4">
        <TextComponent className="mb-2 text-xs font-bold text-zinc-600">
          Message (Optional)
        </TextComponent>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Add a personal note to your invitation..."
          placeholderTextColor="#a1a1aa"
          className="min-h-[84px] rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-950 outline-none"
        />
      </View>
      <Pressable
        disabled={!canSubmit}
        onPress={onSuccess}
        className={
          canSubmit
            ? "mt-6 h-12 items-center justify-center rounded-lg bg-primary"
            : "mt-6 h-12 items-center justify-center rounded-lg bg-zinc-300"
        }
      >
        <TextComponent className="font-bold text-white">
          {isTurnupzUser ? "Send to User" : "Send Email & SMS Invitation"}
        </TextComponent>
      </Pressable>
    </ScrollView>
  );
};

const CreateNewGroupScreen = ({
  onBack,
  onNext
}: {
  onBack: () => void;
  onNext: (groupName: string, memberCount: number) => void;
}) => {
  useHardwareBack(onBack);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(["sarah", "marcus"]);
  const [step, setStep] = useState<"select" | "name">("select");
  const [groupName, setGroupName] = useState("");
  const allContacts = [
    {
      id: "sarah",
      name: "Sarah",
      status: "Online",
      avatar: CHAT_STORIES[0].avatar
    },
    {
      id: "marcus",
      name: "Marcus",
      status: "Available",
      avatar: CHAT_STORIES[1].avatar
    },
    {
      id: "elena",
      name: "Elena Rodriguez",
      status: "Active now",
      avatar: CHAT_STORIES[2].avatar
    },
    {
      id: "david",
      name: "David Kim",
      status: "Available",
      avatar:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=160&q=80"
    },
    { id: "chloe", name: "Chloe Smith", status: "In a meeting", avatar: "" },
    {
      id: "james",
      name: "James Wilson",
      status: "Away",
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80"
    },
    {
      id: "maria",
      name: "Maria Garcia",
      status: "Online",
      avatar:
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80"
    },
    { id: "thomas", name: "Thomas Brown", status: "Busy", avatar: "" }
  ];
  const contacts = allContacts.filter((contact) =>
    matchesSearch(query, [contact.name, contact.status])
  );
  const selectedContacts = allContacts.filter((contact) =>
    selectedIds.includes(contact.id)
  );
  const canContinue = selectedIds.length > 2;
  const canCreate = canContinue && groupName.trim().length > 1;
  const toggleContact = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  if (step === "name") {
    return (
      <View className="flex-1 bg-zinc-50 px-4 pt-4">
        <View className="h-12 flex-row items-center">
          <Pressable
            onPress={() => setStep("select")}
            className="size-9 items-center justify-center"
          >
            <ChevronLeftIcon size={18} color="#52525b" />
          </Pressable>
          <TextComponent className="flex-1 text-center text-lg font-bold text-zinc-950">
            Name Group
          </TextComponent>
          <View className="size-9" />
        </View>
        <View className="mt-6 items-center">
          <View className="flex-row">
            {selectedContacts.slice(0, 4).map((contact, index) => (
              <View key={contact.id} className={index > 0 ? "-ml-2" : ""}>
                {contact.avatar ? (
                  <ChatAvatar image={contact.avatar} size={54} />
                ) : (
                  <View className="size-14 items-center justify-center rounded-lg bg-zinc-200">
                    <TextComponent className="font-bold text-zinc-700">
                      {contact.name.charAt(0)}
                    </TextComponent>
                  </View>
                )}
              </View>
            ))}
          </View>
          <TextComponent className="mt-4 text-sm text-zinc-500">
            {selectedIds.length} members selected
          </TextComponent>
        </View>
        <View className="mt-8">
          <TextComponent className="mb-2 text-xs font-bold uppercase text-zinc-500">
            Group Name
          </TextComponent>
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g. Festival Squad 2024"
            placeholderTextColor="#a1a1aa"
            className="h-12 rounded-xl bg-white px-4 text-base font-semibold text-zinc-950 outline-none"
          />
          <TextComponent className="mt-3 text-xs leading-5 text-zinc-500">
            Groups need more than 2 members before they can be created.
          </TextComponent>
        </View>
        <Pressable
          disabled={!canCreate}
          onPress={() => onNext(groupName.trim(), selectedIds.length)}
          className={
            canCreate
              ? "mt-auto mb-5 h-12 items-center justify-center rounded-lg bg-primary"
              : "mt-auto mb-5 h-12 items-center justify-center rounded-lg bg-zinc-300"
          }
        >
          <TextComponent className="font-bold text-white">
            Create Group
          </TextComponent>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="h-14 flex-row items-center px-4">
        <Pressable
          onPress={onBack}
          className="size-9 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <TextComponent className="flex-1 text-center text-lg font-bold text-zinc-950">
          New Group
        </TextComponent>
        <View className="size-9" />
      </View>
      <View className="px-4">
        <ChatSearch
          value={query}
          onChangeText={setQuery}
          placeholder="Search contacts"
        />
        <TextComponent className="mt-4 text-xs font-bold text-zinc-500">
          Selected
        </TextComponent>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
        >
          {selectedContacts.map((contact) => (
            <View key={contact.id} className="mr-4 items-center">
              {contact.avatar ? (
                <ChatAvatar image={contact.avatar} size={52} online />
              ) : (
                <View
                  className="items-center justify-center rounded-lg bg-sky-400"
                  style={{ height: 52, width: 52 }}
                >
                  <TextComponent className="font-bold text-white">
                    {contact.name.charAt(0)}
                  </TextComponent>
                </View>
              )}
              <TextComponent className="mt-2 text-[10px] text-zinc-600">
                {contact.name.split(" ")[0]}
              </TextComponent>
            </View>
          ))}
          <View className="items-center">
            <View
              className="items-center justify-center rounded-lg border border-dashed border-zinc-300"
              style={{ height: 52, width: 52 }}
            >
              <TextComponent className="text-xl text-zinc-400">+</TextComponent>
            </View>
            <TextComponent className="mt-2 text-[10px] text-zinc-500">
              Add
            </TextComponent>
          </View>
        </ScrollView>
        <View className="mt-5 flex-row items-center justify-between">
          <TextComponent className="text-xs font-bold text-zinc-500">
            Contacts
          </TextComponent>
          <TextComponent className="text-xs font-bold text-primary">
            All contacts
          </TextComponent>
        </View>
      </View>
      <ScrollView
        className="mt-2 flex-1 px-4"
        showsVerticalScrollIndicator={false}
      >
        {contacts.map((contact) => {
          const isSelected = selectedIds.includes(contact.id);

          return (
            <Pressable
              key={contact.id}
              onPress={() => toggleContact(contact.id)}
              className="flex-row items-center border-b border-zinc-100 py-3"
            >
              {contact.avatar ? (
                <ChatAvatar
                  image={contact.avatar}
                  size={42}
                  online={contact.status === "Online"}
                />
              ) : (
                <View className="size-11 items-center justify-center rounded-lg bg-zinc-200">
                  <TextComponent className="font-bold text-zinc-700">
                    {contact.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </TextComponent>
                </View>
              )}
              <View className="ml-3 flex-1">
                <TextComponent className="text-sm font-bold text-zinc-950">
                  {contact.name}
                </TextComponent>
                <TextComponent className="mt-1 text-xs text-zinc-500">
                  {contact.status}
                </TextComponent>
              </View>
              <View
                className={
                  isSelected
                    ? "size-6 items-center justify-center rounded-full bg-primary"
                    : "size-6 rounded-full border border-zinc-300"
                }
              >
                {isSelected && (
                  <TextComponent className="text-xs font-bold text-white">
                    ✓
                  </TextComponent>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <View className="m-4 flex-row items-center rounded-xl bg-white p-3 shadow">
        <View className="flex-row flex-1">
          {selectedContacts.slice(0, 3).map((contact, index) => (
            <View key={contact.id} className={index > 0 ? "-ml-3" : ""}>
              {contact.avatar ? (
                <ChatAvatar image={contact.avatar} size={36} />
              ) : (
                <View className="size-9 items-center justify-center rounded-lg bg-zinc-200">
                  <TextComponent className="text-xs font-bold text-zinc-600">
                    {contact.name.charAt(0)}
                  </TextComponent>
                </View>
              )}
            </View>
          ))}
          {selectedIds.length > 3 && (
            <View className="-ml-3 size-9 items-center justify-center rounded-lg bg-primary">
              <TextComponent className="text-xs font-bold text-white">
                +{selectedIds.length - 3}
              </TextComponent>
            </View>
          )}
        </View>
        <Pressable
          disabled={!canContinue}
          onPress={() => setStep("name")}
          className={
            canContinue
              ? "h-12 w-28 items-center justify-center rounded-lg bg-primary"
              : "h-12 w-28 items-center justify-center rounded-lg bg-zinc-300"
          }
        >
          <TextComponent className="font-bold text-white">Next</TextComponent>
        </Pressable>
      </View>
    </View>
  );
};

const InviteSuccessScreen = ({
  onBackToChats
}: {
  onBackToChats: () => void;
}) => (
  <View className="flex-1 bg-zinc-50 px-5 pt-8">
    <View className="flex-row items-center justify-between">
      <Pressable
        onPress={onBackToChats}
        className="size-9 items-center justify-center"
      >
        <TextComponent className="text-xl text-zinc-700">×</TextComponent>
      </Pressable>
      <TextComponent className="font-semibold text-zinc-700">
        Invite Sent
      </TextComponent>
      <View className="size-9" />
    </View>
    <View className="flex-1 items-center justify-center">
      <CustomImage
        className="size-44"
        imageClassName="size-full"
        source={GenericSuccessHero}
        contentFit="contain"
      />
      <TextComponent className="mt-8 text-2xl font-bold text-zinc-950">
        Invitation Sent!
      </TextComponent>
      <TextComponent className="mt-3 text-center text-sm leading-5 text-zinc-500">
        We've sent a link to your contact. You'll be notified once they accept.
      </TextComponent>
      <Pressable
        onPress={onBackToChats}
        className="mt-8 h-12 w-full items-center justify-center rounded-lg bg-primary"
      >
        <TextComponent className="font-bold text-white">
          Back to Chats
        </TextComponent>
      </Pressable>
    </View>
  </View>
);

const PrivateChatScreen = ({
  conversation,
  onBack,
  onOpenSettings,
  onOpenProfile,
  transfer,
  contextualEvent,
  onOpenContextualEvent
}: {
  conversation: TConversation;
  onBack: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  transfer?: TTicketTransfer;
  contextualEvent?: TFeedEvent | null;
  onOpenContextualEvent?: (event: TFeedEvent) => void;
}) => {
  useHardwareBack(onBack);
  const [message, setMessage] = useState("");
  const [showAttachments, setShowAttachments] = useState(false);
  const isGroup = conversation.kind !== "private";
  const isEventGroup = conversation.kind === "event-group";
  const [messages, setMessages] = useState<TChatMessage[]>(() =>
    isGroup
      ? [
          {
            id: "1",
            mine: false,
            text: "Just checked the set times! Doors start at 9 PM on the main stage.",
            time: "10:42 AM"
          },
          {
            id: "2",
            mine: false,
            text: "Perfect! I'm bringing the portable chargers and some snacks.",
            time: "10:45 AM"
          },
          {
            id: "3",
            mine: true,
            text: "Sounds like a plan! I'll grab the tickets from the box office on my way.",
            time: "10:48 AM"
          },
          {
            id: "4",
            mine: false,
            text: "Look at the stage setup they just finished. It's going to be amazing today.",
            time: "10:52 AM"
          }
        ]
      : [
          {
            id: "1",
            mine: true,
            text: "That looks insane! I'm definitely down. Should I grab the early bird tickets now?",
            time: "10:45 AM"
          },
          {
            id: "2",
            mine: false,
            text: "Yes! They're almost sold out. I already got mine!",
            time: "10:47 AM"
          },
          { id: "3", mine: true, text: "On it!", time: "10:48 AM" },
          ...(conversation.subtitle.startsWith("You:")
            ? [
                {
                  id: "story-reply",
                  mine: true,
                  text: conversation.subtitle.replace(/^You:\s*/, ""),
                  time: "Now"
                }
              ]
            : [])
        ]
  );
  const sendMessage = () => {
    if (!message.trim()) {
      return;
    }
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        mine: true,
        text: message.trim(),
        time: "Now"
      }
    ]);
    setMessage("");
  };
  const pickChatMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError("Allow photo-library access to share photos and videos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.9
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setMessages((current) => [...current, {
        id: `${Date.now()}`,
        mine: true,
        text: "",
        time: "Now",
        attachmentUri: asset.uri,
        attachmentType: asset.type === "video" ? "video" : "image",
        attachmentName: asset.fileName || (asset.type === "video" ? "Video" : "Photo")
      }]);
    }
    setShowAttachments(false);
  };
  const pickChatDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv"
      ],
      copyToCacheDirectory: true,
      multiple: false
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMessages((current) => [...current, {
        id: `${Date.now()}`,
        mine: true,
        text: "",
        time: "Now",
        attachmentUri: asset.uri,
        attachmentType: "document",
        attachmentName: asset.name
      }]);
    }
    setShowAttachments(false);
  };

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
        <Pressable
          onPress={onBack}
          className="size-9 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <Pressable onPress={onOpenProfile} className="flex-1 flex-row items-center">
          <ChatAvatar image={conversation.avatar} size={34} online />
          <View className="ml-2">
            <TextComponent className="text-sm font-bold text-zinc-950">
              {conversation.title}
            </TextComponent>
            <TextComponent className="text-[10px] text-green-600">
              {isGroup ? `${conversation.members || 12} members` : "Online"}
            </TextComponent>
          </View>
        </Pressable>
        <Pressable onPress={onOpenSettings} className="size-9 items-center justify-center" accessibilityLabel="Open chat settings">
          <StoryActionIcon type="more" size={18} color="#52525b" />
        </Pressable>
      </View>
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-4 pt-4">
        <View className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm">
          <CustomImage
            className="h-44 w-full"
            imageClassName="size-full"
            source={{
              uri:
                contextualEvent?.image ||
                (isEventGroup
                  ? PERFORMER_EVENTS[0].image
                  : FEED_EVENTS[1].image)
            }}
            contentFit="cover"
          />
          <View className="p-3">
            <TextComponent className="font-bold text-zinc-950">
              {contextualEvent?.name ||
                (isEventGroup
                  ? "Calabar Carnival 2024"
                  : "Summer Concert Series")}
            </TextComponent>
            <TextComponent className="mt-1 text-xs text-zinc-500">
              {contextualEvent
                ? `${formatEventDate(contextualEvent.date, contextualEvent.timezone)} · ${contextualEvent.venueName}`
                : isEventGroup
                  ? "Official event group after booking"
                  : "Saturday, Aug 12 - 8:00 PM"}
            </TextComponent>
            <Pressable
              onPress={() =>
                contextualEvent && onOpenContextualEvent?.(contextualEvent)
              }
              className="mt-3 h-10 items-center justify-center rounded-lg bg-primary"
            >
              <TextComponent className="font-bold text-white">
                {isEventGroup ? "View Event Details" : "View Event"}
              </TextComponent>
            </Pressable>
          </View>
        </View>
        {transfer && (
          <View className="mb-4">
            <TextComponent className="mb-2 text-[10px] text-zinc-400">
              Ticket sent to {transfer.recipient}
            </TextComponent>
            <TicketTransferCard transfer={transfer} />
          </View>
        )}
        {messages.map((item) => (
          <View
            key={item.id}
            className={item.mine ? "mb-3 items-end" : "mb-3 items-start"}
          >
            {isGroup && !item.mine && (
              <TextComponent className="mb-1 text-[10px] font-bold text-zinc-500">
                {item.id === "1"
                  ? "Emmanuel Duke"
                  : item.id === "2"
                    ? "Sarah Jenkins"
                    : "Tunde"}
              </TextComponent>
            )}
            <View
              className={
                item.mine
                  ? "max-w-[82%] rounded-2xl bg-primary px-4 py-3"
                  : "max-w-[82%] rounded-2xl bg-zinc-200 px-4 py-3"
              }
            >
              {item.attachmentType === "image" && item.attachmentUri && (
                <CustomImage className="mb-2 h-48 w-56 overflow-hidden rounded-xl" imageClassName="size-full" source={{ uri: item.attachmentUri }} contentFit="cover" />
              )}
              {item.attachmentType === "video" && item.attachmentUri && (
                <Pressable onPress={() => Linking.openURL(item.attachmentUri!)} className="mb-2 h-40 w-56 items-center justify-center rounded-xl bg-zinc-900">
                  <View className="size-12 items-center justify-center rounded-full bg-white/90"><TextComponent className="text-xl text-primary">▶</TextComponent></View>
                </Pressable>
              )}
              {item.attachmentType === "document" && item.attachmentUri && (
                <Pressable onPress={() => Linking.openURL(item.attachmentUri!)} className="mb-2 w-56 flex-row items-center rounded-xl bg-white/15 p-3">
                  <View className="size-10 items-center justify-center rounded-lg bg-white"><TextComponent className="text-xs font-bold text-primary">DOC</TextComponent></View>
                  <TextComponent numberOfLines={2} className={item.mine ? "ml-3 flex-1 text-xs font-bold text-white" : "ml-3 flex-1 text-xs font-bold text-zinc-800"}>{item.attachmentName}</TextComponent>
                </Pressable>
              )}
              {!!item.text && (
              <TextComponent
                className={
                  item.mine ? "text-sm text-white" : "text-sm text-zinc-800"
                }
              >
                {item.text}
              </TextComponent>
              )}
            </View>
            <TextComponent className="mt-1 text-[10px] text-zinc-400">
              {item.time}
            </TextComponent>
          </View>
        ))}
      </ScrollView>
      <View className="flex-row items-center gap-2 border-t border-zinc-100 bg-white px-3 py-2">
        <Pressable
          onPress={() => setShowAttachments(true)}
          className="size-10 items-center justify-center rounded-full bg-zinc-100"
        >
          <StoryActionIcon type="plus" size={20} color="#71717a" />
        </Pressable>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor="#a1a1aa"
          className="h-10 flex-1 rounded-full bg-zinc-100 px-4 text-sm text-zinc-950 outline-none"
        />
        <Pressable
          onPress={sendMessage}
          className="size-10 items-center justify-center rounded-full bg-primary"
        >
          <SendIcon size={18} color="#ffffff" />
        </Pressable>
      </View>
      <Modal visible={showAttachments} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            className="flex-1"
            onPress={() => setShowAttachments(false)}
          />
          <View className="rounded-t-3xl bg-white p-5 pb-8">
            <TextComponent className="text-lg font-bold">
              Share to chat
            </TextComponent>
            <Pressable
              onPress={pickChatMedia}
              className="mt-4 flex-row items-center rounded-xl bg-zinc-50 p-4"
            >
              <CustomImage
                className="size-8"
                imageClassName="size-full"
                source={GalleryActionIcon}
                contentFit="contain"
              />
              <View className="ml-3 flex-1">
                <TextComponent className="font-bold">Gallery</TextComponent>
                <TextComponent className="text-xs text-zinc-500">
                  Photos and videos
                </TextComponent>
              </View>
            </Pressable>
            <Pressable
              onPress={pickChatDocument}
              className="mt-3 flex-row items-center rounded-xl bg-zinc-50 p-4"
            >
              <View className="size-8 items-center justify-center rounded-lg bg-blue-50">
                <TextComponent className="text-xs font-bold text-primary">
                  DOC
                </TextComponent>
              </View>
              <View className="ml-3 flex-1">
                <TextComponent className="font-bold">Document</TextComponent>
                <TextComponent className="text-xs text-zinc-500">
                  PDF, DOC, PPT and spreadsheets
                </TextComponent>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const PrivateChatSettingsScreen = ({
  conversation,
  onBack,
  onAddNew,
  onOpenMemberChat,
  onRemoveGroup
}: {
  conversation: TConversation;
  onBack: () => void;
  onAddNew: () => void;
  onOpenMemberChat: (member: { name: string; image: string }) => void;
  onRemoveGroup: () => void;
}) => {
  useHardwareBack(onBack);
  const isGroup = conversation.kind !== "private";
  const isOfficial = conversation.kind === "event-group";
  const members = [
    {
      name: "Sarah Jenkins",
      role: "Your friend",
      image: CHAT_STORIES[0].avatar
    },
    {
      name: "Emmanuel Duke",
      role: "Parade Coordinator",
      image: CHAT_STORIES[1].avatar
    },
    { name: "Tunde Cole", role: "Busy organizing the floats", image: "" }
  ];
  const [settingsView, setSettingsView] = useState<
    "main" | "media" | "notifications" | "members" | "member-profile" | "report"
  >("main");
  const [mediaTab, setMediaTab] = useState<
    "All" | "Photos" | "Videos" | "Documents" | "Links"
  >("All");
  const [muted, setMuted] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    messages: true,
    groups: true,
    mentions: true,
    sound: true,
    vibration: true
  });
  const [tone, setTone] = useState("Default Electric Echo");
  const [vibration, setVibration] = useState("Rhythmic Pulse");
  const [selectedMember, setSelectedMember] = useState(members[0]);
  const [settingsImageOpen, setSettingsImageOpen] = useState<string | null>(
    null
  );
  const [confirmExit, setConfirmExit] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const [mediaSharing, setMediaSharing] = useState(true);
  const [sendPermission, setSendPermission] = useState("Everyone");
  const [invitePermission, setInvitePermission] = useState("Everyone");

  const settingsSubHeader = (title: string, back: () => void) => (
    <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
      <Pressable onPress={back} className="size-9 items-center justify-center">
        <ChevronLeftIcon size={18} color="#52525b" />
      </Pressable>
      <TextComponent className="flex-1 text-center font-bold">
        {title}
      </TextComponent>
      <View className="size-9" />
    </View>
  );

  if (settingsView === "media") {
    const images = [
      FEED_EVENTS[0].image,
      FEED_EVENTS[1].image,
      FEED_EVENTS[2].image,
      PERFORMER_EVENTS[0].image,
      PERFORMER_EVENTS[1].image,
      PERFORMER_EVENTS[2].image
    ];
    return (
      <View className="flex-1 bg-zinc-50">
        {settingsSubHeader("Event Gallery", () => setSettingsView("main"))}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 p-4"
        >
          {(["All", "Photos", "Videos", "Documents", "Links"] as const).map(
            (tab) => (
              <Pressable
                key={tab}
                onPress={() => setMediaTab(tab)}
                className={
                  mediaTab === tab
                    ? "h-9 items-center justify-center rounded-full bg-primary px-5"
                    : "h-9 items-center justify-center rounded-full bg-zinc-200 px-5"
                }
              >
                <TextComponent
                  className={
                    mediaTab === tab
                      ? "text-xs font-bold text-white"
                      : "text-xs text-zinc-600"
                  }
                >
                  {tab}
                </TextComponent>
              </Pressable>
            )
          )}
        </ScrollView>
        {mediaTab === "All" ? (
          <ScrollView contentContainerClassName="p-4 pb-8">
            <View className="flex-row flex-wrap gap-2">
              {images.slice(0, 4).map((image, index) => (
                <Pressable
                  key={`${image}-all-${index}`}
                  onPress={() => setSettingsImageOpen(image)}
                  className="aspect-square w-[48%] overflow-hidden rounded-xl"
                >
                  <CustomImage
                    className="size-full"
                    imageClassName="size-full"
                    source={{ uri: image }}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => setMediaTab("Documents")}
              className="mt-4 flex-row items-center rounded-xl bg-white p-4"
            >
              <View className="size-10 items-center justify-center rounded-lg bg-blue-50">
                <TextComponent className="font-bold text-primary">
                  PDF
                </TextComponent>
              </View>
              <TextComponent className="ml-3 flex-1 font-bold">
                EventGuide.pdf
              </TextComponent>
              <TextComponent className="text-primary">View</TextComponent>
            </Pressable>
            <Pressable
              onPress={() => setMediaTab("Links")}
              className="mt-3 rounded-xl bg-white p-4"
            >
              <TextComponent className="font-bold">
                Main Stage Performance Schedule
              </TextComponent>
              <TextComponent className="mt-1 text-xs text-zinc-500">
                turnupz.app
              </TextComponent>
            </Pressable>
          </ScrollView>
        ) : mediaTab === "Photos" ? (
          <ScrollView contentContainerClassName="flex-row flex-wrap p-1">
            {images.map((image, index) => (
              <Pressable
                key={`${image}-${index}`}
                onPress={() => setSettingsImageOpen(image)}
                className="w-1/2 border border-white"
                style={{ aspectRatio: index % 3 === 0 ? 1.2 : 0.9 }}
              >
                <CustomImage
                  className="size-full"
                  imageClassName="size-full"
                  source={{ uri: image }}
                  contentFit="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : mediaTab === "Videos" ? (
          <ScrollView contentContainerClassName="flex-row flex-wrap gap-2 p-4">
            {images.slice(0, 4).map((image, index) => (
              <Pressable
                key={image}
                onPress={() => onInfo(`Playing video ${index + 1}`)}
                className="w-[48%] overflow-hidden rounded-xl"
              >
                <CustomImage
                  className="h-40 w-full"
                  imageClassName="size-full"
                  source={{ uri: image }}
                  contentFit="cover"
                />
                <View className="absolute inset-0 items-center justify-center">
                  <View className="size-11 items-center justify-center rounded-full bg-white/80">
                    <TextComponent className="text-primary">▶</TextComponent>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : mediaTab === "Documents" ? (
          <View className="gap-3 p-4">
            {[
              "EventGuide.pdf",
              "Itinerary.docx",
              "VenueMap.pdf",
              "GuestList_Final.csv"
            ].map((doc) => (
              <Pressable
                key={doc}
                onPress={() => onInfo(`${doc} opened`)}
                className="flex-row items-center rounded-xl bg-white p-4"
              >
                <View className="size-10 items-center justify-center rounded-lg bg-blue-50">
                  <TextComponent className="font-bold text-primary">
                    DOC
                  </TextComponent>
                </View>
                <TextComponent className="ml-3 flex-1 text-sm font-bold">
                  {doc}
                </TextComponent>
                <TextComponent className="text-xs text-primary">
                  View
                </TextComponent>
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="gap-3 p-4">
            {[
              "Calabar Carnival History Blog",
              "Main Stage Performance Schedule",
              "Route Map",
              "VIP Access"
            ].map((link) => (
              <Pressable
                key={link}
                onPress={() => Linking.openURL("https://turnupz.app")}
                className="rounded-xl bg-white p-4"
              >
                <TextComponent className="text-sm font-bold">
                  {link}
                </TextComponent>
                <TextComponent className="mt-1 text-[10px] text-zinc-500">
                  turnupz.app
                </TextComponent>
              </Pressable>
            ))}
          </View>
        )}
        {settingsImageOpen && (
          <View className="absolute inset-0 bg-black">
            <Pressable
              onPress={() => setSettingsImageOpen(null)}
              className="absolute left-4 top-4 z-10 size-10 items-center justify-center rounded-full bg-black/60"
            >
              <StoryActionIcon type="close" />
            </Pressable>
            <CustomImage
              className="size-full"
              imageClassName="size-full"
              source={{ uri: settingsImageOpen }}
              contentFit="contain"
            />
          </View>
        )}
      </View>
    );
  }

  if (settingsView === "notifications") {
    return (
      <View className="flex-1 bg-zinc-50">
        {settingsSubHeader("Notification settings", () =>
          setSettingsView("main")
        )}
        <ScrollView contentContainerClassName="p-4 pb-8">
          <TextComponent className="mb-2 text-[10px] font-bold text-primary">
            ACTIVITY ALERTS
          </TextComponent>
          <View className="rounded-xl bg-white">
            {(
              [
                { key: "messages", label: "Message Notifications" },
                { key: "groups", label: "Group Alerts" },
                { key: "mentions", label: "Mention Notifications" }
              ] as const
            ).map((item) => (
              <View
                key={item.key}
                className="flex-row items-center border-b border-zinc-100 p-4"
              >
                <TextComponent className="flex-1 text-sm">
                  {item.label}
                </TextComponent>
                <SettingsSwitch
                  enabled={notificationSettings[item.key]}
                  onPress={() =>
                    setNotificationSettings((v) => ({
                      ...v,
                      [item.key]: !v[item.key]
                    }))
                  }
                  label={item.label}
                />
              </View>
            ))}
          </View>
          <TextComponent className="mb-2 mt-5 text-[10px] font-bold text-primary">
            MANAGEMENT
          </TextComponent>
          <View className="flex-row items-center rounded-xl bg-white p-4">
            <TextComponent className="flex-1 text-sm">
              Mute notifications
            </TextComponent>
            <SettingsSwitch
              enabled={muted}
              onPress={() => {
                setMuted((value) => !value);
                if (!muted)
                  setNotificationSettings((v) => ({
                    ...v,
                    sound: false,
                    vibration: false
                  }));
              }}
              label="Mute notifications"
            />
          </View>
          <TextComponent className="mb-2 mt-5 text-[10px] font-bold text-primary">
            SOUND & VIBRATION
          </TextComponent>
          <View
            className={
              muted ? "rounded-xl bg-white opacity-40" : "rounded-xl bg-white"
            }
          >
            <Pressable
              disabled={muted}
              onPress={() =>
                setTone((value) =>
                  value === "Default Electric Echo"
                    ? "Bright Bell"
                    : "Default Electric Echo"
                )
              }
              className="border-b border-zinc-100 p-4"
            >
              <TextComponent className="text-sm font-bold">
                Notification Tone
              </TextComponent>
              <TextComponent className="mt-1 text-[10px] text-zinc-500">
                {tone}
              </TextComponent>
            </Pressable>
            <Pressable
              disabled={muted}
              onPress={() =>
                setVibration((value) =>
                  value === "Rhythmic Pulse" ? "Short Pulse" : "Rhythmic Pulse"
                )
              }
              className="p-4"
            >
              <TextComponent className="text-sm font-bold">
                Vibration Pattern
              </TextComponent>
              <TextComponent className="mt-1 text-[10px] text-zinc-500">
                {vibration}
              </TextComponent>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (settingsView === "members") {
    const allMembers = [
      ...members,
      ...CHAT_STORIES.map((story) => ({
        name: story.name,
        role: story.subtitle,
        image: story.avatar
      }))
    ];
    return (
      <View className="flex-1 bg-zinc-50">
        {settingsSubHeader("Group Members", () => setSettingsView("main"))}
        <ScrollView contentContainerClassName="p-4 pb-8">
          <TextComponent className="mb-3 text-[10px] font-bold text-primary">
            ADMIN
          </TextComponent>
          {allMembers.map((member, index) => (
            <Pressable
              key={`${member.name}-${index}`}
              onPress={() => {
                setSelectedMember(member);
                setSettingsView("member-profile");
              }}
              className="flex-row items-center border-b border-zinc-100 bg-white p-3"
            >
              <ChatAvatar
                image={member.image || CHAT_STORIES[index % 3].avatar}
                size={42}
              />
              <View className="ml-3 flex-1">
                <TextComponent className="text-sm font-bold">
                  {member.name}
                </TextComponent>
                <TextComponent className="text-[10px] text-zinc-500">
                  {member.role}
                </TextComponent>
              </View>
              {index === 0 ? (
                <TextComponent className="text-[10px] font-bold text-primary">
                  ADMIN
                </TextComponent>
              ) : (
                <Pressable
                  onPress={() =>
                    onOpenMemberChat({
                      name: member.name,
                      image: member.image || CHAT_STORIES[index % 3].avatar
                    })
                  }
                  className="rounded-full bg-primary px-4 py-2"
                >
                  <TextComponent className="text-xs font-bold text-white">
                    Message
                  </TextComponent>
                </Pressable>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (settingsView === "member-profile") {
    return (
      <View className="flex-1 bg-white">
        {settingsSubHeader("Profile", () => setSettingsView("members"))}
        <ScrollView contentContainerClassName="p-5">
          <Pressable
            onPress={() =>
              setSettingsImageOpen(
                selectedMember.image || CHAT_STORIES[0].avatar
              )
            }
          >
            <ChatAvatar
              image={selectedMember.image || CHAT_STORIES[0].avatar}
              size={108}
            />
          </Pressable>
          <TextComponent className="mt-4 text-xl font-bold">
            {selectedMember.name}
          </TextComponent>
          <TextComponent className="mt-1 text-xs text-zinc-500">
            {selectedMember.role}
          </TextComponent>
          <View className="mt-5 flex-row gap-2">
            <Pressable
              onPress={() =>
                onOpenMemberChat({
                  name: selectedMember.name,
                  image: selectedMember.image || CHAT_STORIES[0].avatar
                })
              }
              className="h-11 flex-1 items-center justify-center rounded-lg bg-primary"
            >
              <TextComponent className="font-bold text-white">
                Message
              </TextComponent>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL("mailto:support@turnupz.app")}
              className="h-11 flex-1 items-center justify-center rounded-lg border border-primary"
            >
              <TextComponent className="font-bold text-primary">
                Email
              </TextComponent>
            </Pressable>
            <Pressable
              onPress={() =>
                Share.share({
                  message: `View ${selectedMember.name} on Turnupz`
                })
              }
              className="h-11 flex-1 items-center justify-center rounded-lg border border-primary"
            >
              <TextComponent className="font-bold text-primary">
                Share
              </TextComponent>
            </Pressable>
          </View>
        </ScrollView>
        {settingsImageOpen && (
          <View className="absolute inset-0 bg-black">
            <Pressable
              onPress={() => setSettingsImageOpen(null)}
              className="absolute left-4 top-4 z-10 size-10 items-center justify-center rounded-full bg-black/60"
            >
              <StoryActionIcon type="close" />
            </Pressable>
            <CustomImage
              className="size-full"
              imageClassName="size-full"
              source={{ uri: settingsImageOpen }}
              contentFit="contain"
            />
          </View>
        )}
      </View>
    );
  }

  if (settingsView === "report") {
    return (
      <View className="flex-1 bg-zinc-50">
        {settingsSubHeader(isGroup ? "Report Group" : "Report User", () =>
          setSettingsView("main")
        )}
        <ScrollView contentContainerClassName="p-4 pb-8">
          <View className="flex-row items-center rounded-xl bg-white p-4">
            <ChatAvatar image={conversation.avatar} size={54} />
            <View className="ml-3">
              <TextComponent className="font-bold">
                {conversation.title}
              </TextComponent>
              <TextComponent className="text-[10px] text-zinc-500">
                {isGroup
                  ? `${conversation.members || 12} members`
                  : "Turnupz user"}
              </TextComponent>
            </View>
          </View>
          <TextComponent className="mb-2 mt-5 text-[10px] font-bold text-zinc-500">
            WHY ARE YOU REPORTING?
          </TextComponent>
          {[
            "Spam",
            "Inappropriate Content",
            "Harassment",
            "Safety Concerns",
            "Misleading or Scam"
          ].map((reason) => (
            <Pressable
              key={reason}
              onPress={() => setReportReason(reason)}
              className="flex-row items-center border-b border-zinc-100 bg-white p-4"
            >
              <TextComponent className="flex-1 text-sm">{reason}</TextComponent>
              <View
                className={
                  reportReason === reason
                    ? "size-4 rounded-full border-[5px] border-primary"
                    : "size-4 rounded-full border border-zinc-400"
                }
              />
            </Pressable>
          ))}
          <TextInput
            value={reportDetails}
            onChangeText={setReportDetails}
            multiline
            placeholder="Tell us more about what's happening..."
            className="mt-5 min-h-28 rounded-xl bg-white p-4 text-sm outline-none"
          />
          <Pressable
            onPress={() => {
              onSuccess("Report submitted");
              setSettingsView("main");
            }}
            className="mt-6 h-12 items-center justify-center rounded-lg bg-primary"
          >
            <TextComponent className="font-bold text-white">
              Submit Report
            </TextComponent>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-zinc-50" contentContainerClassName="pb-8">
      <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
        <Pressable
          onPress={onBack}
          className="size-9 items-center justify-center"
        >
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <TextComponent className="flex-1 text-center font-bold text-zinc-950">
          {isGroup ? "Group Info" : "Settings"}
        </TextComponent>
        <View className="size-9" />
      </View>

      <View className="items-center py-8">
        <Pressable onPress={() => setSettingsImageOpen(conversation.avatar)}>
          <ChatAvatar image={conversation.avatar} size={88} online={!isGroup} />
        </Pressable>
        <TextComponent className="mt-4 text-xl font-bold text-zinc-950">
          {conversation.title}
        </TextComponent>
        <TextComponent className="mt-1 text-sm text-zinc-500">
          {isOfficial
            ? "Official Group"
            : isGroup
              ? `Private Group - ${conversation.members || 12} Members`
              : "Online"}
        </TextComponent>
        {isOfficial && (
          <Pressable className="mt-4 h-11 items-center justify-center rounded-full bg-primary px-6">
            <TextComponent className="font-bold text-white">
              View Event Details
            </TextComponent>
          </Pressable>
        )}
      </View>

      {isGroup && conversation.isCreator && (
        <View className="mx-4 rounded-xl bg-white p-4 shadow-sm">
          <TextComponent className="text-xs font-bold uppercase text-zinc-400">
            Group Link
          </TextComponent>
          <View className="mt-3 flex-row items-center">
            <View className="size-10 items-center justify-center rounded-lg bg-blue-50">
              <CopyIcon size={16} color={ACTIVE_NAV_COLOR} />
            </View>
            <TextComponent className="ml-3 flex-1 text-sm text-zinc-700">
              turnupz.app/g/summer-vibes-24
            </TextComponent>
            <TextComponent className="text-xs font-bold text-primary">
              Copy
            </TextComponent>
          </View>
        </View>
      )}

      <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <TextComponent className="font-bold text-zinc-950">
            Media, Links, and Docs
          </TextComponent>
          <Pressable onPress={() => setSettingsView("media")}>
            <TextComponent className="text-xs font-bold text-primary">
              View all
            </TextComponent>
          </Pressable>
        </View>
        <View className="mt-3 flex-row gap-3">
          {[
            FEED_EVENTS[0].image,
            FEED_EVENTS[1].image,
            FEED_EVENTS[2].image
          ].map((image) => (
            <CustomImage
              key={image}
              className="size-16 rounded-md"
              imageClassName="size-full rounded-md"
              source={{ uri: image }}
              contentFit="cover"
            />
          ))}
          <View className="size-16 items-center justify-center rounded-md bg-zinc-100">
            <TextComponent className="text-xs font-bold text-zinc-500">
              +24
            </TextComponent>
          </View>
        </View>
      </View>

      {isGroup && (
        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
          <View className="mb-3 flex-row items-center justify-between">
            <TextComponent className="font-bold text-zinc-950">
              Members ({conversation.members || 12})
            </TextComponent>
            {conversation.isCreator && (
              <Pressable onPress={onAddNew}>
                <TextComponent className="text-xs font-bold text-primary">
                  Add New
                </TextComponent>
              </Pressable>
            )}
          </View>
          {members.map((member, index) => (
            <Pressable
              onPress={() => {
                setSelectedMember(member);
                setSettingsView("member-profile");
              }}
              key={member.name}
              className="mb-3 flex-row items-center"
            >
              {member.image ? (
                <ChatAvatar
                  image={member.image}
                  size={38}
                  online={index === 0}
                />
              ) : (
                <View className="size-10 items-center justify-center rounded-lg bg-sky-100">
                  <TextComponent className="text-xs font-bold text-sky-700">
                    TC
                  </TextComponent>
                </View>
              )}
              <View className="ml-3 flex-1">
                <TextComponent className="text-sm font-bold text-zinc-950">
                  {member.name}
                </TextComponent>
                <TextComponent className="text-[10px] text-zinc-500">
                  {member.role}
                </TextComponent>
              </View>
              {index === 0 && (
                <View className="rounded bg-blue-50 px-2 py-1">
                  <TextComponent className="text-[9px] font-bold text-primary">
                    Admin
                  </TextComponent>
                </View>
              )}
            </Pressable>
          ))}
          <Pressable onPress={() => setSettingsView("members")}>
            <TextComponent className="text-center text-xs font-bold text-zinc-500">
              View all 14 members
            </TextComponent>
          </Pressable>
        </View>
      )}

      <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
        <View className="flex-row items-center border-b border-zinc-100 py-3">
          <TextComponent className="flex-1 text-sm font-semibold text-zinc-700">
            Mute Notifications
          </TextComponent>
          <SettingsSwitch
            enabled={muted}
            onPress={() => setMuted((value) => !value)}
            label="Mute notifications"
          />
        </View>
        <Pressable
          onPress={() => setSettingsView("notifications")}
          className="flex-row items-center border-b border-zinc-100 py-3"
        >
          <TextComponent className="flex-1 text-sm font-semibold text-zinc-700">
            Custom Notifications
          </TextComponent>
          <ChevronRightVectorIcon size={14} color="#71717a" />
        </Pressable>
        {conversation.isCreator && (
          <>
            <Pressable
              onPress={() =>
                setSendPermission((value) =>
                  value === "Everyone" ? "Admins" : "Everyone"
                )
              }
              className="flex-row items-center border-b border-zinc-100 py-3"
            >
              <TextComponent className="flex-1 text-sm font-semibold text-zinc-700">
                Who can send messages
              </TextComponent>
              <TextComponent className="text-xs font-bold text-zinc-500">
                {sendPermission}
              </TextComponent>
            </Pressable>
            <View className="flex-row items-center border-b border-zinc-100 py-3">
              <TextComponent className="flex-1 text-sm font-semibold text-zinc-700">
                Allow media sharing
              </TextComponent>
              <SettingsSwitch
                enabled={mediaSharing}
                onPress={() => setMediaSharing((value) => !value)}
                label="Allow media sharing"
              />
            </View>
            <Pressable
              onPress={() =>
                setInvitePermission((value) =>
                  value === "Everyone" ? "Admin" : "Everyone"
                )
              }
              className="flex-row items-center py-3"
            >
              <TextComponent className="flex-1 text-sm font-semibold text-zinc-700">
                Who can invite others
              </TextComponent>
              <TextComponent className="text-xs font-bold text-zinc-500">
                {invitePermission}
              </TextComponent>
            </Pressable>
          </>
        )}
      </View>

      <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm">
        {isGroup ? (
          <>
            <Pressable onPress={() => setConfirmExit(true)}>
              <TextComponent className="py-3 text-sm font-bold text-red-500">
                {conversation.isCreator ? "Delete Group" : "Exit Group"}
              </TextComponent>
            </Pressable>
            {!conversation.isCreator && (
              <Pressable onPress={() => setSettingsView("report")}>
                <TextComponent className="border-t border-zinc-100 py-3 text-sm font-bold text-red-500">
                  Report Group
                </TextComponent>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <TextComponent className="py-3 text-sm font-bold text-red-500">
              Block {conversation.title}
            </TextComponent>
            <Pressable onPress={() => setSettingsView("report")}>
              <TextComponent className="border-t border-zinc-100 py-3 text-sm font-bold text-red-500">
                Report {conversation.title}
              </TextComponent>
            </Pressable>
          </>
        )}
      </View>
      <Modal visible={!!settingsImageOpen} transparent animationType="fade">
        <View className="flex-1 bg-black">
          <Pressable
            onPress={() => setSettingsImageOpen(null)}
            className="absolute left-4 top-12 z-10 size-10 items-center justify-center rounded-full bg-black/60"
          >
            <StoryActionIcon type="close" />
          </Pressable>
          {settingsImageOpen && (
            <CustomImage
              className="size-full"
              imageClassName="size-full"
              source={{ uri: settingsImageOpen }}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
      <Modal visible={confirmExit} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/45 px-5">
          <View className="w-full rounded-2xl bg-white p-5">
            <ChatAvatar image={conversation.avatar} size={64} />
            <TextComponent className="mt-4 text-lg font-bold">
              {conversation.isCreator
                ? `Delete ${conversation.title}?`
                : `Exit ${conversation.title}?`}
            </TextComponent>
            <TextComponent className="mt-2 text-xs leading-5 text-zinc-500">
              {conversation.isCreator
                ? "Deleting this group removes all members and permanently erases its chat history and media."
                : "You will no longer receive updates or be able to participate in discussions."}
            </TextComponent>
            <Pressable
              onPress={() => {
                setConfirmExit(false);
                onRemoveGroup();
                onSuccess(
                  conversation.isCreator
                    ? "Group deleted"
                    : "You left the group"
                );
              }}
              className="mt-5 h-12 items-center justify-center rounded-lg bg-red-600"
            >
              <TextComponent className="font-bold text-white">
                {conversation.isCreator ? "Delete Group" : "Exit"}
              </TextComponent>
            </Pressable>
            <Pressable
              onPress={() => setConfirmExit(false)}
              className="mt-3 h-11 items-center justify-center rounded-lg bg-zinc-100"
            >
              <TextComponent className="font-bold text-zinc-700">
                Cancel
              </TextComponent>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const ChatContent = ({
  sharedEvent,
  shareIntent,
  onSharedEventHandled,
  transfers,
  onOpenEvent,
  onFullScreenChange
}: {
  sharedEvent: TFeedEvent | null;
  shareIntent: TEventShareIntent;
  onSharedEventHandled: () => void;
  transfers: TTicketTransfer[];
  onOpenEvent: (event: TFeedEvent) => void;
  onFullScreenChange: (fullScreen: boolean) => void;
}) => {
  const [mode, setMode] = useState<TChatMode>("list");
  const [hasChats, setHasChats] = useState(false);
  const [conversations, setConversations] = useState<TConversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<TConversation | null>(null);
  const [eventContext, setEventContext] = useState<TFeedEvent | null>(null);
  const latestTransferId = useRef<string | null>(null);
  const [myStoryImage, setMyStoryImage] = useState<string | null>(null);
  const [myStoryImages, setMyStoryImages] = useState<string[]>([]);
  const [myStoryIndex, setMyStoryIndex] = useState(0);
  const [storyDraft, setStoryDraft] = useState<string | null>(null);
  const [storyFlash, setStoryFlash] = useState(false);
  const [storyTextVisible, setStoryTextVisible] = useState(false);
  const [storyOverlayText, setStoryOverlayText] = useState("");
  const [storyTextLower, setStoryTextLower] = useState(false);
  const [storyStickerVisible, setStoryStickerVisible] = useState(false);
  const [storyEffect, setStoryEffect] = useState(0);
  const [selectedStory, setSelectedStory] = useState<TChatContact | null>(null);
  const [viewedStoryIds, setViewedStoryIds] = useState<string[]>([]);
  const [mutedStoryIds, setMutedStoryIds] = useState<string[]>([]);
  const [storyMenuOpen, setStoryMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [storyReportDetails, setStoryReportDetails] = useState("");
  const [storyReply, setStoryReply] = useState("");
  const [storyLiked, setStoryLiked] = useState(false);
  const [storyLikes, setStoryLikes] = useState(124);
  const [storyViewers, setStoryViewers] = useState(
    CHAT_CONVERSATIONS.slice(0, 10)
  );
  const [storyPrivacy, setStoryPrivacy] = useState("Everyone");
  const [storyRepliesEnabled, setStoryRepliesEnabled] = useState(true);
  const [hiddenStoryContactIds, setHiddenStoryContactIds] = useState<string[]>(
    []
  );
  const [publicProfileTab, setPublicProfileTab] = useState<
    "Posts" | "Tagged" | "Following"
  >("Posts");
  const [profileImageOpen, setProfileImageOpen] = useState(false);
  const [storyOptions, setStoryOptions] = useState({
    shareStories: true,
    shareMessages: true,
    saveGallery: false,
    saveArchive: true
  });
  const blockedUserIds = usePrototypeSocialStore(
    (state) => state.blockedUserIds
  );
  const toggleBlockedUser = usePrototypeSocialStore(
    (state) => state.toggleBlockedUser
  );
  useEffect(() => {
    const fullScreenModes: TChatMode[] = [
      "access",
      "contacts",
      "new-group",
      "add-contact",
      "success",
      "story-compose",
      "story-view",
      "story-profile",
      "story-insights",
      "story-settings",
      "story-hide-contacts"
    ];
    onFullScreenChange(fullScreenModes.includes(mode));
    return () => onFullScreenChange(false);
  }, [mode, onFullScreenChange]);
  useEffect(() => {
    if (!sharedEvent) {
      return;
    }

    setEventContext(sharedEvent);
    setHasChats(true);
    if (shareIntent === "community") {
      setConversations(CHAT_CONVERSATIONS);
      setSelectedConversation(null);
      setMode("list");
    } else {
      const organizerName = sharedEvent.organizerName || sharedEvent.venueName;
      const existingConversation = CHAT_CONVERSATIONS.find(
        (conversation) =>
          conversation.kind === "private" &&
          conversation.title.toLowerCase().includes(organizerName.toLowerCase())
      );
      const organizerConversation: TConversation =
        existingConversation ||
        createOrganizerConversationDraft({
          eventId: sharedEvent.id,
          eventName: sharedEvent.name,
          organizerName,
          eventImage: sharedEvent.image
        });
      setConversations(
        existingConversation
          ? CHAT_CONVERSATIONS
          : [organizerConversation, ...CHAT_CONVERSATIONS]
      );
      setSelectedConversation(organizerConversation);
      setMode("thread");
    }
    onSharedEventHandled();
  }, [onSharedEventHandled, shareIntent, sharedEvent]);

  useEffect(() => {
    const latest = transfers[0];
    const transferStateKey = latest ? `${latest.id}:${latest.status}` : null;
    if (!latest || latestTransferId.current === transferStateKey) return;
    latestTransferId.current = transferStateKey;
    const transferConversation: TConversation = {
      id: `ticket-transfer-${latest.id}`,
      title: latest.recipient,
      subtitle: `${latest.event.title} ticket · ${latest.status === "waiting" ? "Waiting" : latest.status}`,
      time: "Now",
      avatar: CHAT_STORIES[0].avatar,
      unread: 1,
      kind: "private"
    };
    setHasChats(true);
    setConversations((current) => [
      transferConversation,
      ...current.filter((item) => item.id !== transferConversation.id)
    ]);
  }, [transfers]);

  const openThread = (conversation: TConversation) => {
    const updatedConversation = eventContext
      ? { ...conversation, subtitle: `Shared event: ${eventContext.name}`, time: "Now", unread: undefined }
      : { ...conversation, unread: undefined };
    setConversations((current) => [updatedConversation, ...current.filter((item) => item.id !== conversation.id)]);
    setSelectedConversation(updatedConversation);
    setMode("thread");
  };
  const backToChatsWithData = () => {
    setHasChats(true);
    setConversations(CHAT_CONVERSATIONS);
    setMode("list");
  };
  const createGroup = (groupName: string, memberCount: number) => {
    const newGroup: TConversation = {
      id: `group-${Date.now()}`,
      title: groupName,
      subtitle: "You created this private group.",
      time: "Now",
      avatar: FEED_EVENTS[1].image,
      kind: "user-group",
      members: memberCount,
      isCreator: true
    };
    setHasChats(true);
    setConversations([newGroup, ...CHAT_CONVERSATIONS]);
    setSelectedConversation(newGroup);
    setMode("thread");
  };

  const pickStory = async (camera: boolean) => {
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError(
        `Allow ${camera ? "camera" : "photo-library"} access to add a story.`
      );
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.9
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.9
        });
    if (!result.canceled && result.assets[0]?.uri) {
      setStoryDraft(result.assets[0].uri);
      setMode("story-compose");
    }
  };

  if (mode === "story-compose") {
    return (
      <View className="flex-1 bg-black">
        {storyDraft ? (
          <CustomImage
            className="absolute inset-0 size-full"
            imageClassName="size-full"
            source={{ uri: storyDraft }}
            contentFit="cover"
          />
        ) : (
          <View className="absolute inset-0 bg-white" />
        )}
        {storyDraft && storyEffect > 0 && (
          <View
            className={
              storyEffect === 1
                ? "absolute inset-0 bg-blue-500/20"
                : storyEffect === 2
                  ? "absolute inset-0 bg-sky-500/20"
                  : "absolute inset-0 bg-sky-400/20"
            }
          />
        )}
        {!!storyOverlayText && !storyTextVisible && (
          <Pressable
            onPress={() => setStoryTextVisible(true)}
            onLongPress={() => setStoryTextLower((lower) => !lower)}
            className={
              storyTextLower
                ? "absolute inset-x-8 bottom-1/3"
                : "absolute inset-x-8 top-1/2"
            }
          >
            <TextComponent className="text-center text-2xl font-bold text-white">
              {storyOverlayText}
            </TextComponent>
          </Pressable>
        )}
        {storyStickerVisible && (
          <View className="absolute right-20 top-1/3 rounded-full bg-primary px-4 py-2">
            <TextComponent className="font-bold text-white">
              TURN UP!
            </TextComponent>
          </View>
        )}
        {storyTextVisible && (
          <View className="absolute inset-x-6 top-1/3 z-10 rounded-xl bg-black/60 p-3">
            <TextInput
              value={storyOverlayText}
              onChangeText={setStoryOverlayText}
              autoFocus
              placeholder="Type on your story"
              placeholderTextColor="#d4d4d8"
              className="text-center text-lg font-bold text-white outline-none"
            />
            <Pressable
              onPress={() => {
                setStoryTextVisible(false);
                const tags = storyOverlayText.match(/@[a-z0-9_.]+/gi) || [];
                if (tags.length) onInfo(`${tags.join(", ")} added to Tagged`);
              }}
              className="mt-2 self-end rounded-lg bg-primary px-4 py-2"
            >
              <TextComponent className="font-bold text-white">
                Done
              </TextComponent>
            </Pressable>
          </View>
        )}
        <View className="flex-row items-start justify-between p-4">
          <Pressable
            onPress={() => setMode("list")}
            className="size-10 items-center justify-center rounded-full bg-zinc-800/80"
          >
            <StoryActionIcon type="close" />
          </Pressable>
          <View className="gap-3">
            <Pressable
              onPress={() => setStoryFlash((active) => !active)}
              className={
                storyFlash
                  ? "size-10 items-center justify-center rounded-full bg-primary"
                  : "size-10 items-center justify-center rounded-full bg-zinc-800/80"
              }
            >
              <StoryActionIcon type="flash" />
            </Pressable>
            <Pressable
              onPress={() => setStoryTextVisible(true)}
              className="size-10 items-center justify-center rounded-full bg-primary"
            >
              <StoryActionIcon type="text" />
            </Pressable>
            <Pressable
              onPress={() => setStoryEffect((effect) => (effect + 1) % 4)}
              className={
                storyEffect
                  ? "size-10 items-center justify-center rounded-full bg-primary"
                  : "size-10 items-center justify-center rounded-full bg-zinc-800/80"
              }
            >
              <StoryActionIcon type="effects" />
            </Pressable>
          </View>
        </View>
        <View className="absolute inset-x-0 bottom-8 flex-row items-center justify-around px-6">
          <Pressable
            onPress={() => pickStory(false)}
            className="size-12 items-center justify-center overflow-hidden rounded-full bg-white shadow"
          >
            <CustomImage
              className="size-7"
              imageClassName="size-full"
              source={GalleryActionIcon}
              contentFit="contain"
            />
          </Pressable>
          <Pressable
            onPress={() => pickStory(true)}
            className="size-20 items-center justify-center rounded-full border-4 border-white bg-primary"
          >
            <StoryActionIcon type="camera" size={34} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (storyDraft) {
                setMyStoryImage(storyDraft);
                setMyStoryImages((stories) => [...stories, storyDraft]);
                setMyStoryIndex(myStoryImages.length);
                setStoryViewers([]);
                setStoryLikes(0);
                setStoryLiked(false);
                setMode("story-view");
                setSelectedStory(null);
              }
            }}
            className="size-12 items-center justify-center rounded-full bg-primary"
          >
            <StoryActionIcon type="send" size={22} />
          </Pressable>
        </View>
      </View>
    );
  }

  if (mode === "story-insights") {
    return (
      <View className="flex-1 bg-zinc-50">
        <View className="h-14 flex-row items-center bg-white px-3">
          <Pressable
            onPress={() => setMode("story-view")}
            className="size-9 items-center justify-center"
          >
            <ChevronLeftIcon size={18} color="#52525b" />
          </Pressable>
          <TextComponent className="flex-1 text-center font-bold">
            Story Insights
          </TextComponent>
          <View className="size-9" />
        </View>
        <ScrollView contentContainerClassName="p-4 pb-8">
          {myStoryImage && (
            <CustomImage
              className="h-40 w-full overflow-hidden rounded-xl"
              imageClassName="size-full"
              source={{ uri: myStoryImage }}
              contentFit="cover"
            />
          )}
          <View className="mt-4 flex-row gap-3">
            {[
              { label: "Likes", value: storyLikes },
              { label: "Comments", value: 45 },
              { label: "Shares", value: 12 }
            ].map((item) => (
              <View
                key={item.label}
                className="flex-1 items-center rounded-xl bg-white p-4"
              >
                <TextComponent className="text-lg font-bold text-primary">
                  {item.value}
                </TextComponent>
                <TextComponent className="text-[10px] text-zinc-500">
                  {item.label}
                </TextComponent>
              </View>
            ))}
          </View>
          <View className="mt-5 flex-row justify-between">
            <TextComponent className="font-bold">Viewers</TextComponent>
            <TextComponent className="text-xs font-bold text-primary">
              {storyViewers.length} total
            </TextComponent>
          </View>
          <View className="mt-3 rounded-xl bg-white">
            {storyViewers.map((viewer, index) => (
              <View
                key={viewer.id}
                className="flex-row items-center border-b border-zinc-100 p-3"
              >
                <ChatAvatar image={viewer.avatar} size={40} />
                <View className="ml-3 flex-1">
                  <TextComponent className="text-xs font-bold">
                    {viewer.title}
                  </TextComponent>
                  <TextComponent className="text-[10px] text-zinc-400">
                    Viewed {index + 2} min ago
                  </TextComponent>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (mode === "story-settings") {
    return (
      <View className="flex-1 bg-zinc-50">
        <View className="h-14 flex-row items-center bg-white px-3">
          <Pressable
            onPress={() => setMode("story-view")}
            className="size-9 items-center justify-center"
          >
            <ChevronLeftIcon size={18} color="#52525b" />
          </Pressable>
          <TextComponent className="flex-1 text-center font-bold">
            Story Settings
          </TextComponent>
          <View className="size-9" />
        </View>
        <ScrollView contentContainerClassName="pb-8">
          <TextComponent className="px-4 pb-2 pt-5 text-[10px] font-bold text-primary">
            PRIVACY
          </TextComponent>
          <Pressable
            onPress={() => setMode("story-hide-contacts")}
            className="flex-row items-center border-b border-zinc-100 bg-white p-4"
          >
            <TextComponent className="flex-1 text-sm">
              Hide Story From
            </TextComponent>
            <TextComponent className="mr-2 text-xs text-zinc-400">
              {hiddenStoryContactIds.length}
            </TextComponent>
            <ChevronRightVectorIcon size={14} color="#71717a" />
          </Pressable>
          <TextComponent className="px-4 pb-2 pt-5 text-[10px] font-bold text-primary">
            ALLOW MESSAGE REPLIES
          </TextComponent>
          <View className="flex-row items-center border-b border-zinc-100 bg-white p-4">
            <TextComponent className="flex-1 text-sm">
              Allow message replies
            </TextComponent>
            <SettingsSwitch
              enabled={storyRepliesEnabled}
              onPress={() => setStoryRepliesEnabled((enabled) => !enabled)}
              label="Allow message replies"
            />
          </View>
          <TextComponent className="px-4 pb-2 pt-5 text-[10px] font-bold text-primary">
            SHARING & SAVING
          </TextComponent>
          {(
            [
              { key: "shareStories", label: "Allow Sharing to Stories" },
              { key: "shareMessages", label: "Allow Sharing to Messages" },
              { key: "saveGallery", label: "Save Story to Gallery" },
              { key: "saveArchive", label: "Save Story to Archive" }
            ] as const
          ).map((item) => (
            <View
              key={item.key}
              className="flex-row items-center border-b border-zinc-100 bg-white p-4"
            >
              <TextComponent className="flex-1 text-sm">
                {item.label}
              </TextComponent>
              <SettingsSwitch
                enabled={storyOptions[item.key]}
                onPress={() =>
                  setStoryOptions((v) => ({ ...v, [item.key]: !v[item.key] }))
                }
                label={item.label}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (mode === "story-hide-contacts") {
    const contacts = [
      ...CHAT_STORIES,
      ...INVITE_CONTACTS.map((contact, index) => ({
        id: `contact-${index}`,
        name: contact.name,
        subtitle: contact.phone,
        avatar: ""
      }))
    ];
    return (
      <View className="flex-1 bg-zinc-50">
        <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
          <Pressable
            onPress={() => setMode("story-settings")}
            className="size-9 items-center justify-center"
          >
            <ChevronLeftIcon size={18} color="#52525b" />
          </Pressable>
          <TextComponent className="flex-1 text-center font-bold">
            Hide Story From
          </TextComponent>
          <View className="size-9" />
        </View>
        <ScrollView contentContainerClassName="p-4 pb-8">
          {contacts.map((contact) => {
            const hidden = hiddenStoryContactIds.includes(contact.id);
            return (
              <Pressable
                key={contact.id}
                onPress={() =>
                  setHiddenStoryContactIds((ids) =>
                    hidden
                      ? ids.filter((id) => id !== contact.id)
                      : [...ids, contact.id]
                  )
                }
                className="mb-2 flex-row items-center rounded-xl bg-white p-3"
              >
                <ChatAvatar image={contact.avatar} size={42} />
                <View className="ml-3 flex-1">
                  <TextComponent className="font-bold">
                    {contact.name}
                  </TextComponent>
                  <TextComponent className="text-xs text-zinc-500">
                    {contact.subtitle}
                  </TextComponent>
                </View>
                <View
                  className={
                    hidden
                      ? "size-5 items-center justify-center rounded-md bg-primary"
                      : "size-5 rounded-md border border-zinc-300"
                  }
                >
                  {hidden && <CheckIcon size={12} color="#fff" />}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  if (mode === "story-profile" && selectedStory) {
    const blocked = blockedUserIds.includes(selectedStory.id);
    return (
      <View className="flex-1 bg-white">
        <View className="h-14 flex-row items-center px-3">
          <Pressable
            onPress={() => setMode("story-view")}
            className="size-9 items-center justify-center"
          >
            <ChevronLeftIcon size={18} color="#52525b" />
          </Pressable>
          <TextComponent className="flex-1 text-center font-bold">
            Profile
          </TextComponent>
          <View className="size-9" />
        </View>
        <ScrollView contentContainerClassName="p-5 pb-10">
          <View className="flex-row">
            <Pressable
              disabled={blocked}
              onPress={() => setProfileImageOpen(true)}
              className="w-28 self-stretch overflow-hidden rounded-lg bg-zinc-100"
            >
              {blocked ? (
                <View className="min-h-[132px] flex-1 items-center justify-center">
                  <UserOutlineIcon size={34} color="#a1a1aa" />
                </View>
              ) : (
                <CustomImage
                  className="min-h-[132px] flex-1 w-full"
                  imageClassName="size-full"
                  source={{ uri: selectedStory.avatar }}
                  contentFit="cover"
                />
              )}
            </Pressable>
            <View className="ml-4 flex-1">
              <TextComponent className="text-lg font-bold">
                {selectedStory.name}
              </TextComponent>
              <TextComponent className="mt-1 text-xs text-zinc-500">
                @{selectedStory.id}.turnupz
              </TextComponent>
              <TextComponent className="mt-3 text-xs leading-5 text-zinc-600">
                Event lover, creator, and member of the Turnupz community.
              </TextComponent>
              <TextComponent className="mt-2 text-xs font-bold text-primary">
                turnupz.app/{selectedStory.id}
              </TextComponent>
            </View>
          </View>
          <View className="mt-5 flex-row gap-2">
            <Pressable
              disabled={blocked}
              onPress={() => {
                const conversation =
                  CHAT_CONVERSATIONS.find(
                    (item) => item.id === selectedStory.id
                  ) || CHAT_CONVERSATIONS[2];
                setSelectedConversation(conversation);
                setMode("thread");
              }}
              className={
                blocked
                  ? "h-11 flex-1 flex-row items-center justify-center rounded-lg bg-zinc-200"
                  : "h-11 flex-1 flex-row items-center justify-center rounded-lg bg-primary"
              }
            >
              <StoryActionIcon type="message" size={16} />
              <TextComponent
                className={
                  blocked
                    ? "ml-2 text-xs font-bold text-zinc-400"
                    : "ml-2 text-xs font-bold text-white"
                }
              >
                Message
              </TextComponent>
            </Pressable>
            <Pressable
              onPress={() =>
                Linking.openURL(`mailto:${selectedStory.id}@turnupz.app`)
              }
              className="h-11 flex-1 flex-row items-center justify-center rounded-lg border border-primary bg-white"
            >
              <StoryActionIcon
                type="email"
                size={16}
                color={ACTIVE_NAV_COLOR}
              />
              <TextComponent className="ml-2 text-xs font-bold text-primary">
                Email
              </TextComponent>
            </Pressable>
            <Pressable
              onPress={() =>
                Share.share({
                  message: `View ${selectedStory.name} on Turnupz: https://turnupz.app/${selectedStory.id}`
                })
              }
              className="h-11 flex-1 flex-row items-center justify-center rounded-lg border border-primary bg-white"
            >
              <StoryActionIcon
                type="share"
                size={16}
                color={ACTIVE_NAV_COLOR}
              />
              <TextComponent className="ml-2 text-xs font-bold text-primary">
                Share
              </TextComponent>
            </Pressable>
          </View>
          {blocked && (
            <TextComponent className="mt-5 text-center text-xs text-zinc-500">
              This user cannot view your profile image or message you.
            </TextComponent>
          )}
          <View className="mt-6 flex-row gap-2">
            {(["Posts", "Tagged", "Following"] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setPublicProfileTab(tab)}
                className={
                  publicProfileTab === tab
                    ? "h-10 flex-1 items-center justify-center rounded-full bg-primary"
                    : "h-10 flex-1 items-center justify-center rounded-full bg-zinc-100"
                }
              >
                <TextComponent
                  className={
                    publicProfileTab === tab
                      ? "text-xs font-bold text-white"
                      : "text-xs font-bold text-zinc-500"
                  }
                >
                  {tab}
                </TextComponent>
              </Pressable>
            ))}
          </View>
          {publicProfileTab === "Following" ? (
            <View className="mt-4 gap-2">
              {["Lagos Tech Fest", "Open Arts Collective", "Kemi Adé"].map(
                (name) => (
                  <View
                    key={name}
                    className="flex-row items-center rounded-xl bg-zinc-50 p-4"
                  >
                    <TextComponent className="flex-1 text-sm font-bold">
                      {name}
                    </TextComponent>
                    <TextComponent className="text-xs font-bold text-primary">
                      Following
                    </TextComponent>
                  </View>
                )
              )}
            </View>
          ) : (
            <View className="mt-4 flex-row flex-wrap justify-between gap-y-2">
              {[
                FEED_EVENTS[0].image,
                FEED_EVENTS[1].image,
                FEED_EVENTS[2].image,
                PERFORMER_EVENTS[0].image
              ].map((item, index) => (
                <CustomImage
                  key={`${item}-${index}`}
                  className="aspect-square w-[49%] overflow-hidden rounded-lg"
                  imageClassName="size-full"
                  source={{ uri: item }}
                  contentFit="cover"
                />
              ))}
            </View>
          )}
        </ScrollView>
        {profileImageOpen && (
          <View className="absolute inset-0 bg-black">
            <Pressable
              onPress={() => setProfileImageOpen(false)}
              className="absolute left-4 top-4 z-10 size-10 items-center justify-center rounded-full bg-black/60"
            >
              <StoryActionIcon type="close" />
            </Pressable>
            <CustomImage
              className="size-full"
              imageClassName="size-full"
              source={{ uri: selectedStory.avatar }}
              contentFit="contain"
            />
          </View>
        )}
      </View>
    );
  }

  if (mode === "story-view") {
    const own = !selectedStory;
    const image = own ? myStoryImage : FEED_EVENTS[1].image;
    return (
      <View className="flex-1 bg-black">
        {image && (
          <CustomImage
            className="absolute inset-0 size-full"
            imageClassName="size-full"
            source={{ uri: image }}
            contentFit="cover"
          />
        )}
        {own && myStoryImages.length > 1 && (
          <Pressable
            onPress={() => {
              const next = (myStoryIndex + 1) % myStoryImages.length;
              setMyStoryIndex(next);
              setMyStoryImage(myStoryImages[next]);
            }}
            className="absolute inset-0"
            accessibilityLabel="View next story"
          />
        )}
        {own && myStoryImages.length > 0 && (
          <View className="absolute inset-x-3 top-2 flex-row gap-1">
            {myStoryImages.map((_, index) => (
              <View
                key={index}
                className={
                  index === myStoryIndex
                    ? "h-0.5 flex-1 bg-white"
                    : "h-0.5 flex-1 bg-white/40"
                }
              />
            ))}
          </View>
        )}
        <View className="flex-row items-center p-4">
          <ChatAvatar
            image={own ? CHAT_STORIES[1].avatar : selectedStory?.avatar || ""}
            size={38}
          />
          <Pressable
            disabled={own}
            onPress={() => setMode("story-profile")}
            className="ml-3 flex-1"
          >
            <TextComponent className="text-xs font-bold text-white">
              {own ? "My Story" : selectedStory?.name}
            </TextComponent>
          </Pressable>
          <Pressable
            onPress={() => setStoryMenuOpen(true)}
            className="size-9 items-center justify-center rounded-full bg-black/55"
          >
            <StoryActionIcon type="more" size={18} />
          </Pressable>
          <Pressable
            onPress={() => setMode("list")}
            className="ml-2 size-9 items-center justify-center rounded-full bg-black/55"
          >
            <StoryActionIcon type="close" size={18} />
          </Pressable>
        </View>
        {own ? (
          <View className="absolute inset-x-0 bottom-8 flex-row items-center justify-between px-4">
            <Pressable
              onPress={() => setMode("story-insights")}
              className="rounded-lg bg-black/60 px-4 py-3"
            >
              <TextComponent className="text-xs font-bold text-white">
                ◉ {storyViewers.length} Viewers
              </TextComponent>
            </Pressable>
            <View className="size-11" />
          </View>
        ) : (
          <View className="absolute inset-x-0 bottom-6 flex-row items-center gap-3 px-4">
            <TextInput
              value={storyReply}
              onChangeText={setStoryReply}
              onSubmitEditing={() => {
                if (storyReply.trim()) {
                  setHasChats(true);
                  setConversations(CHAT_CONVERSATIONS);
                  setStoryReply("");
                  onSuccess("Reply sent to Messages");
                }
              }}
              placeholder="Send a message"
              placeholderTextColor="#71717a"
              className="h-11 flex-1 rounded-full bg-white px-4 text-xs outline-none"
            />
            <Pressable
              onPress={() => {
                if (!storyReply.trim() || !selectedStory) return;
                const base = CHAT_CONVERSATIONS.find(
                  (item) => item.id === selectedStory.id
                ) || {
                  ...CHAT_CONVERSATIONS[2],
                  id: selectedStory.id,
                  title: selectedStory.name,
                  avatar: selectedStory.avatar
                };
                const replied = {
                  ...base,
                  subtitle: `You: ${storyReply.trim()}`,
                  time: "Now"
                };
                setHasChats(true);
                setConversations((items) => [
                  replied,
                  ...items.filter((item) => item.id !== replied.id)
                ]);
                setSelectedConversation(replied);
                setStoryReply("");
                setMode("thread");
              }}
              className="size-11 items-center justify-center rounded-full bg-primary"
            >
              <SendIcon size={18} color="#ffffff" />
            </Pressable>
            <Pressable
              onPress={() => {
                setStoryLiked((v) => !v);
                setStoryLikes((count) => (storyLiked ? count - 1 : count + 1));
              }}
              className="size-11 items-center justify-center rounded-full bg-black/35"
            >
              <TextComponent
                className={
                  storyLiked
                    ? "text-[24px] text-sky-300"
                    : "text-[24px] text-white"
                }
              >
                ♥
              </TextComponent>
            </Pressable>
          </View>
        )}
        {storyMenuOpen && (
          <View className="absolute inset-0 justify-end bg-black/45">
            <Pressable
              className="flex-1"
              onPress={() => setStoryMenuOpen(false)}
            />
            <View className="rounded-t-3xl bg-white p-5">
              {own ? (
                <Pressable
                  onPress={() => {
                    setStoryMenuOpen(false);
                    setMode("story-settings");
                  }}
                  className="py-4"
                >
                  <TextComponent className="font-bold">
                    Story Settings
                  </TextComponent>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      Share.share({ message: "View this Turnupz story" });
                      setStoryMenuOpen(false);
                    }}
                    className="border-b border-zinc-100 py-4"
                  >
                    <TextComponent>Share Story</TextComponent>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setStoryMenuOpen(false);
                      if (selectedStory) {
                        const conversation =
                          CHAT_CONVERSATIONS.find(
                            (item) => item.id === selectedStory.id
                          ) || CHAT_CONVERSATIONS[2];
                        setSelectedConversation(conversation);
                        setMode("settings");
                      }
                    }}
                    className="border-b border-zinc-100 py-4"
                  >
                    <TextComponent>User Settings</TextComponent>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (selectedStory)
                        setMutedStoryIds((ids) => [
                          ...new Set([...ids, selectedStory.id])
                        ]);
                      setStoryMenuOpen(false);
                      setMode("list");
                    }}
                    className="border-b border-zinc-100 py-4"
                  >
                    <TextComponent>Mute Story</TextComponent>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setReportOpen(true);
                      setStoryMenuOpen(false);
                    }}
                    className="py-4"
                  >
                    <TextComponent className="font-bold text-red-500">
                      Report Story
                    </TextComponent>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}
        {reportOpen && (
          <View className="absolute inset-0 items-center justify-center bg-black/60 px-5">
            <View className="w-full rounded-2xl bg-white p-5">
              <TextComponent className="text-lg font-bold">
                Report Story
              </TextComponent>
              <View className="mt-4">
                {[
                  "Spam",
                  "Inappropriate Content",
                  "Harassment",
                  "Safety Concerns",
                  "Misleading or Scam"
                ].map((reason) => (
                  <Pressable
                    key={reason}
                    onPress={() => setReportReason(reason)}
                    className="flex-row items-center border-b border-zinc-100 py-3"
                  >
                    <TextComponent className="flex-1 text-xs">
                      {reason}
                    </TextComponent>
                    <View
                      className={
                        reportReason === reason
                          ? "size-4 rounded-full border-[5px] border-primary"
                          : "size-4 rounded-full border border-zinc-400"
                      }
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={storyReportDetails}
                onChangeText={setStoryReportDetails}
                multiline
                placeholder="Tell us what is wrong with this story"
                className="mt-4 min-h-28 rounded-xl bg-zinc-100 p-3 text-sm outline-none"
              />
              <View className="mt-4 flex-row gap-3">
                <Pressable
                  onPress={() => setReportOpen(false)}
                  className="h-11 flex-1 items-center justify-center rounded-lg bg-zinc-100"
                >
                  <TextComponent>Cancel</TextComponent>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setReportOpen(false);
                    setReportReason("");
                    setStoryReportDetails("");
                    onSuccess("Story reported");
                    setMode("list");
                  }}
                  className="h-11 flex-1 items-center justify-center rounded-lg bg-red-500"
                >
                  <TextComponent className="font-bold text-white">
                    Submit
                  </TextComponent>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (mode === "access") {
    return (
      <ContactAccessScreen
        onAllow={() => setMode("contacts")}
        onBack={() => setMode("list")}
      />
    );
  }

  if (mode === "contacts") {
    return (
      <ContactsScreen
        onBack={() => setMode("list")}
        onAddContact={() => setMode("add-contact")}
        onNewGroup={() => setMode("new-group")}
        onInviteSuccess={() => setMode("success")}
        onMessageFriend={(friend) => {
          const conversation = CHAT_CONVERSATIONS.find(
            (item) => item.id === friend.id
          ) || {
            ...CHAT_CONVERSATIONS[2],
            id: friend.id,
            title: friend.name,
            avatar: friend.avatar
          };
          setSelectedConversation(conversation);
          setMode("thread");
        }}
      />
    );
  }

  if (mode === "new-group") {
    return (
      <CreateNewGroupScreen
        onBack={() => setMode("contacts")}
        onNext={createGroup}
      />
    );
  }

  if (mode === "add-contact") {
    return (
      <AddContactScreen
        onBack={() => setMode("contacts")}
        onSuccess={() => setMode("success")}
      />
    );
  }

  if (mode === "success") {
    return <InviteSuccessScreen onBackToChats={backToChatsWithData} />;
  }

  if (mode === "thread" && selectedConversation) {
    return (
      <PrivateChatScreen
        conversation={selectedConversation}
        onBack={() => setMode("list")}
        onOpenSettings={() => setMode("settings")}
        onOpenProfile={() => {
          if (selectedConversation.kind !== "private") {
            setMode("settings");
            return;
          }
          const contact = CHAT_STORIES.find((item) => item.id === selectedConversation.id) || {
            id: selectedConversation.id,
            name: selectedConversation.title,
            subtitle: selectedConversation.subtitle,
            avatar: selectedConversation.avatar,
            online: true
          };
          setSelectedStory(contact);
          setMode("story-profile");
        }}
        transfer={transfers.find((item) => selectedConversation.id === `ticket-transfer-${item.id}`)}
        contextualEvent={eventContext}
        onOpenContextualEvent={onOpenEvent}
      />
    );
  }

  if (mode === "settings" && selectedConversation) {
    return (
      <PrivateChatSettingsScreen
        conversation={selectedConversation}
        onBack={() => setMode("thread")}
        onAddNew={() => setMode("new-group")}
        onOpenMemberChat={(member) => {
          const conversation = {
            ...CHAT_CONVERSATIONS[2],
            id: `member-${member.name}`,
            title: member.name,
            avatar: member.image,
            kind: "private" as const
          };
          setSelectedConversation(conversation);
          setMode("thread");
        }}
        onRemoveGroup={() => {
          setConversations((items) =>
            items.filter((item) => item.id !== selectedConversation.id)
          );
          setSelectedConversation(null);
          setMode("list");
        }}
      />
    );
  }

  return (
    <ChatListScreen
      hasChats={hasChats}
      conversations={conversations}
      onOpenAccess={() => setMode("access")}
      onOpenThread={openThread}
      onOpenYourStory={() => {
        setSelectedStory(null);
        setStoryDraft(null);
        setStoryOverlayText("");
        setStoryStickerVisible(false);
        setStoryEffect(0);
        setMode("story-compose");
      }}
      onOpenMyPostedStory={() => {
        const index = Math.max(0, myStoryImages.length - 1);
        setSelectedStory(null);
        setMyStoryIndex(index);
        setMyStoryImage(myStoryImages[index] || myStoryImage);
        setMode("story-view");
      }}
      onOpenStory={(story) => {
        setSelectedStory(story);
        setViewedStoryIds((ids) =>
          ids.includes(story.id) ? ids : [...ids, story.id]
        );
        setMode("story-view");
      }}
      hasMyStory={!!myStoryImage}
      myStoryImage={myStoryImage}
      viewedStoryIds={viewedStoryIds}
      mutedStoryIds={mutedStoryIds}
      blockedUserIds={blockedUserIds}
    />
  );
};

const TicketEventCard = ({
  booking,
  onPress
}: {
  booking: TBookedEvent;
  onPress: () => void;
}) => {
  const ticketCount = booking.categories.reduce(
    (total, category) => total + category.quantity,
    0
  );

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-xl bg-white shadow-sm"
    >
      <View className="min-h-[88px] flex-row items-start px-4 py-3">
        <View className="flex-1 pr-3">
          <TextComponent className="font-bold text-zinc-950" numberOfLines={2}>
            {booking.event.title}
          </TextComponent>
          <TextComponent
            className="mt-1 text-[11px] text-zinc-600"
            numberOfLines={1}
          >
            {booking.event.date} · {booking.event.venue},{" "}
            {booking.event.location}
          </TextComponent>
          <TextComponent className="mt-1 text-[11px] text-zinc-600">
            {booking.event.time}
          </TextComponent>
        </View>
        <View className="items-end">
          <View className="rounded-full bg-green-100 px-3 py-1">
            <TextComponent className="text-[10px] font-semibold text-green-700">
              {booking.kind === "registration" ? "Registered" : "Paid"}
            </TextComponent>
          </View>
          <TextComponent className="mt-2 text-right text-[9px] font-semibold text-primary">
            {ticketCount}{" "}
            {booking.kind === "registration"
              ? ticketCount === 1
                ? "pass"
                : "passes"
              : ticketCount === 1
                ? "ticket"
                : "tickets"}{" "}
            · {booking.categories.length} categor
            {booking.categories.length === 1 ? "y" : "ies"}
          </TextComponent>
        </View>
      </View>
    </Pressable>
  );
};

const UniqueTicketQr = ({
  value,
  size = 58
}: {
  value: string;
  size?: number;
}) => {
  const gridSize = 13;
  let seed = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  const finderCell = (row: number, column: number) => {
    const inFinder = (originRow: number, originColumn: number) => {
      const localRow = row - originRow;
      const localColumn = column - originColumn;
      return (
        localRow >= 0 &&
        localRow < 5 &&
        localColumn >= 0 &&
        localColumn < 5 &&
        (localRow === 0 ||
          localRow === 4 ||
          localColumn === 0 ||
          localColumn === 4 ||
          (localRow >= 2 &&
            localRow <= 2 &&
            localColumn >= 2 &&
            localColumn <= 2))
      );
    };
    return (
      inFinder(0, 0) || inFinder(0, gridSize - 5) || inFinder(gridSize - 5, 0)
    );
  };
  const cells = Array.from({ length: gridSize * gridSize }, (_, index) => {
    const row = Math.floor(index / gridSize);
    const column = index % gridSize;
    const generated =
      ((seed >>> ((index % 4) * 8)) + index * 31 + row * 17) % 5 < 2;
    return finderCell(row, column) || generated ? { row, column } : null;
  }).filter((cell): cell is { row: number; column: number } => Boolean(cell));

  return (
    <View
      className="items-center justify-center rounded bg-white p-1"
      style={{ height: size, width: size }}
    >
      <Svg
        height={size - 8}
        width={size - 8}
        viewBox={`0 0 ${gridSize} ${gridSize}`}
      >
        <Rect width={gridSize} height={gridSize} fill="#ffffff" />
        {cells.map((cell) => (
          <Rect
            key={`${cell.row}-${cell.column}`}
            x={cell.column}
            y={cell.row}
            width={1}
            height={1}
            fill="#111827"
          />
        ))}
      </Svg>
    </View>
  );
};

const TicketTransferCard = ({
  transfer,
  receiverView = false,
  onRespond
}: {
  transfer: TTicketTransfer;
  receiverView?: boolean;
  onRespond?: (status: "accepted" | "rejected") => void;
}) => (
  <View className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
    <CustomImage
      className="h-24 w-full"
      imageClassName="size-full"
      source={{ uri: transfer.event.image }}
      contentFit="cover"
    />
    <View className="p-3">
      <View className="self-start rounded bg-sky-400 px-2 py-0.5">
        <TextComponent className="text-[8px] font-bold text-white">
          TICKET TRANSFER
        </TextComponent>
      </View>
      <TextComponent className="mt-2 font-bold text-zinc-950">
        {transfer.event.title}
      </TextComponent>
      <View className="mt-3 flex-row justify-between">
        <View>
          <TextComponent className="text-[8px] font-bold uppercase text-zinc-400">
            Date & time
          </TextComponent>
          <TextComponent className="text-[10px] text-zinc-700">
            {transfer.event.date} · {transfer.event.time}
          </TextComponent>
        </View>
        <View className="items-end">
          <TextComponent className="text-[8px] font-bold uppercase text-zinc-400">
            Category
          </TextComponent>
          <TextComponent className="text-[10px] text-zinc-700">
            {transfer.categoryName}
          </TextComponent>
        </View>
      </View>
      <View className="mt-3 rounded-lg bg-blue-50 p-3">
        <TextComponent className="text-[8px] uppercase text-zinc-400">
          Ticket ID
        </TextComponent>
        <TextComponent className="mt-1 text-xs font-bold text-primary">
          #{transfer.id.toUpperCase()}
        </TextComponent>
      </View>
      {receiverView && transfer.status === "waiting" && onRespond ? (
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => onRespond("accepted")}
            className="h-10 flex-1 items-center justify-center rounded-lg bg-primary"
          >
            <TextComponent className="text-xs font-bold text-white">
              Accept
            </TextComponent>
          </Pressable>
          <Pressable
            onPress={() => onRespond("rejected")}
            className="h-10 flex-1 items-center justify-center rounded-lg bg-zinc-200"
          >
            <TextComponent className="text-xs font-bold text-zinc-700">
              Reject
            </TextComponent>
          </Pressable>
        </View>
      ) : (
        <View
          className={
            transfer.status === "accepted"
              ? "mt-3 rounded-lg bg-green-50 p-2"
              : transfer.status === "rejected"
                ? "mt-3 rounded-lg bg-red-50 p-2"
                : "mt-3 rounded-lg bg-zinc-100 p-2"
          }
        >
          <TextComponent className="text-xs font-bold capitalize text-zinc-700">
            {transfer.status === "waiting" ? "🕒 Waiting" : transfer.status}
          </TextComponent>
        </View>
      )}
    </View>
  </View>
);

const TicketsContent = ({
  bookings,
  transfers,
  onTransfer,
  onOpenEvent,
  onBack
}: {
  bookings: TBookedEvent[];
  transfers: TTicketTransfer[];
  onTransfer: (transfer: TTicketTransfer) => void;
  onOpenEvent: (event: TPerformerEvent) => void;
  onBack: () => void;
}) => {
  useHardwareBack(onBack);
  const [mode, setMode] = useState<"list" | "details" | "transfer">("list");
  const [selectedBooking, setSelectedBooking] = useState<TBookedEvent | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] =
    useState<TBookedTicketCategory | null>(null);
  const [selectedTicketNumber, setSelectedTicketNumber] = useState(1);
  const [recipient, setRecipient] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [showAddNew, setShowAddNew] = useState(false);
  const [ticketQuery, setTicketQuery] = useState("");
  const [ticketFilter, setTicketFilter] = useState<
    "All" | "Recent" | "Transferred" | "Past"
  >("All");
  const normalizedRecipient = recipient.trim().toLowerCase();
  const frequentContacts = [
    {
      id: "sarah",
      name: "Sarah Jenkins",
      detail: "sarah.j@turnupz.app",
      avatar: CHAT_STORIES[0].avatar
    },
    {
      id: "marcus",
      name: "Marcus Chen",
      detail: "m.chen@turnupz.app",
      avatar: CHAT_STORIES[1].avatar
    },
    {
      id: "elena",
      name: "Elena Rodriguez",
      detail: "elena.rod@turnupz.app",
      avatar: CHAT_STORIES[2]?.avatar || CHAT_STORIES[0].avatar
    }
  ];
  const visibleFrequentContacts = selectedRecipientId
    ? frequentContacts
    : frequentContacts.filter((contact) =>
        matchesSearch(recipient, [contact.name, contact.detail])
      );
  const hasValidContact =
    /^\+?[\d\s()-]{8,}$/.test(recipient.trim()) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedRecipient);
  const recipientIsUser =
    normalizedRecipient.endsWith("@turnupz.app") ||
    normalizedRecipient.includes("sarah") ||
    recipient.replace(/\D/g, "").endsWith("3456");
  const visibleBookings = bookings.filter((booking, index) => {
    const matchesQuery = matchesSearch(ticketQuery, [
      booking.event.title,
      booking.event.venue,
      booking.event.location,
      ...booking.categories.map((category) => category.name)
    ]);
    if (!matchesQuery) {
      return false;
    }
    if (ticketFilter === "Recent") {
      return index < 5;
    }
    if (ticketFilter === "Transferred") {
      return transfers.some((transfer) => transfer.bookingId === booking.id);
    }
    if (ticketFilter === "Past") {
      return booking.event.status.toLowerCase().includes("past");
    }
    return true;
  });

  const openBooking = (booking: TBookedEvent) => {
    setSelectedBooking(booking);
    setMode("details");
  };
  const beginTransfer = (
    category: TBookedTicketCategory,
    ticketNumber: number
  ) => {
    setSelectedCategory(category);
    setSelectedTicketNumber(ticketNumber);
    setRecipient("");
    setSelectedRecipientId(null);
    setMessage("");
    setMode("transfer");
  };
  const submitTransfer = () => {
    if (!selectedBooking || !selectedCategory || !hasValidContact) {
      return;
    }
    onTransfer({
      id: `tr-${Date.now().toString().slice(-6)}`,
      bookingId: selectedBooking.id,
      categoryId: selectedCategory.id,
      event: selectedBooking.event,
      categoryName: selectedCategory.name,
      ticketNumber: selectedTicketNumber,
      recipient: recipient.trim(),
      recipientIsUser,
      status: "waiting"
    });
    setMode("details");
  };

  if (mode === "transfer" && selectedBooking && selectedCategory) {
    return (
      <ScrollView
        className="flex-1 bg-zinc-50"
        stickyHeaderIndices={[0]}
        contentContainerClassName="pb-8"
      >
        <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
          <Pressable
            onPress={() => setMode("details")}
            className="size-9 items-center justify-center"
          >
            <ChevronLeftIcon size={18} color="#52525b" />
          </Pressable>
          <TextComponent className="flex-1 text-center font-bold text-zinc-950">
            Transfer Ticket
          </TextComponent>
          <View className="size-9" />
        </View>
        <View className="p-4">
          <View className="overflow-hidden rounded-xl bg-white shadow-sm">
            <CustomImage
              className="h-32 w-full"
              imageClassName="size-full"
              source={{ uri: selectedBooking.event.image }}
              contentFit="cover"
            />
            <View className="p-3">
              <View className="self-start rounded bg-sky-400 px-2 py-0.5">
                <TextComponent className="text-[8px] font-bold uppercase text-white">
                  {selectedCategory.name}
                </TextComponent>
              </View>
              <TextComponent className="font-bold text-zinc-950">
                {selectedBooking.event.title}
              </TextComponent>
              <TextComponent className="mt-1 text-xs text-zinc-500">
                {selectedBooking.event.date} · {selectedBooking.event.time} ·{" "}
                {selectedBooking.event.venue}
              </TextComponent>
              <View className="mt-3 flex-row items-center justify-between rounded-lg bg-blue-50 p-3">
                <TextComponent className="text-xs font-bold text-primary">
                  Ticket #{selectedBooking.id.slice(-6).toUpperCase()}-
                  {selectedTicketNumber}
                </TextComponent>
                <TextComponent className="text-[9px] font-bold text-zinc-400">
                  TURNUPZ
                </TextComponent>
              </View>
            </View>
          </View>
          <View className="mt-5 flex-row items-center justify-between">
            <TextComponent className="font-bold text-zinc-950">
              Select Contact
            </TextComponent>
            <Pressable onPress={() => setShowAddNew((current) => !current)}>
              <TextComponent className="text-xs font-bold text-primary">
                Add New
              </TextComponent>
            </Pressable>
          </View>
          <TextInput
            value={recipient}
            onChangeText={(value) => {
              setRecipient(value);
              setSelectedRecipientId(null);
            }}
            placeholder="Search by name, email or phone..."
            placeholderTextColor="#a1a1aa"
            className="mt-3 h-12 rounded-xl bg-white px-4 text-sm text-zinc-950 outline-none"
          />
          {!showAddNew && (
            <View className="mt-5">
              <TextComponent className="mb-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                Frequent Contacts
              </TextComponent>
              {visibleFrequentContacts.map((contact) => {
                const isSelected = selectedRecipientId === contact.id;
                return (
                  <Pressable
                    key={contact.id}
                    onPress={() => {
                      setSelectedRecipientId(contact.id);
                      setRecipient(contact.detail);
                    }}
                    className="flex-row items-center border-b border-zinc-100 py-3"
                  >
                    <ChatAvatar image={contact.avatar} size={40} online />
                    <View className="ml-3 flex-1">
                      <TextComponent className="text-sm font-bold text-zinc-950">
                        {contact.name}
                      </TextComponent>
                      <TextComponent className="mt-0.5 text-[10px] text-zinc-500">
                        {contact.detail}
                      </TextComponent>
                    </View>
                    <View
                      className={
                        isSelected
                          ? "size-5 items-center justify-center rounded-full border border-primary"
                          : "size-5 rounded-full border border-zinc-300"
                      }
                    >
                      {isSelected && (
                        <View className="size-3 rounded-full bg-primary" />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
          {recipient.trim().length > 2 && (
            <View
              className={
                hasValidContact
                  ? "mt-2 rounded-lg bg-blue-50 p-3"
                  : "mt-2 rounded-lg bg-red-50 p-3"
              }
            >
              <TextComponent
                className={
                  hasValidContact
                    ? "text-xs text-primary"
                    : "text-xs text-red-600"
                }
              >
                {!hasValidContact
                  ? "Enter a valid email address or phone number."
                  : recipientIsUser
                    ? "Verified Turnupz user. The ticket will appear in their account."
                    : "Not a Turnupz user. We will send an email/SMS claim notification."}
              </TextComponent>
            </View>
          )}
          {showAddNew && (
            <View className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
              <TextComponent className="font-bold text-zinc-950">
                Add transfer recipient
              </TextComponent>
              <TextComponent className="mt-2 text-xs leading-5 text-zinc-500">
                Enter their email or phone above. Existing users receive the
                ticket in Turnupz; new users receive a secure claim link by
                email or SMS.
              </TextComponent>
            </View>
          )}
          <TextComponent className="mt-5 text-xs font-bold text-zinc-600">
            Message (Optional)
          </TextComponent>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Write a quick note to your friend..."
            placeholderTextColor="#a1a1aa"
            className="mt-2 min-h-[100px] rounded-xl bg-white px-4 py-3 text-sm text-zinc-950 outline-none"
          />
          <Pressable
            disabled={!hasValidContact}
            onPress={submitTransfer}
            className={
              hasValidContact
                ? "mt-6 h-12 items-center justify-center rounded-lg bg-primary"
                : "mt-6 h-12 items-center justify-center rounded-lg bg-zinc-300"
            }
          >
            <TextComponent className="font-bold text-white">
              {selectedRecipientId
                ? "Transfer Ticket"
                : recipientIsUser
                  ? "Send to User"
                  : "Send Claim Notification"}
            </TextComponent>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (mode === "details" && selectedBooking) {
    const bookingTransfers = transfers.filter(
      (transfer) => transfer.bookingId === selectedBooking.id
    );
    const individualTickets = selectedBooking.categories.flatMap((category) =>
      Array.from({ length: category.quantity }, (_, index) => ({
        category,
        ticketNumber: index + 1,
        ticketId: `${selectedBooking.id}-${category.id}-${index + 1}`
      }))
    );
    return (
      <View className="flex-1 bg-zinc-50">
        <View className="h-14 flex-row items-center border-b border-zinc-100 bg-white px-3">
          <Pressable
            onPress={() => setMode("list")}
            className="size-9 items-center justify-center"
          >
            <ChevronLeftIcon size={18} color="#52525b" />
          </Pressable>
          <TextComponent className="flex-1 text-center font-bold text-zinc-950">
            View Tickets
          </TextComponent>
          <View className="size-9" />
        </View>
        <ScrollView contentContainerClassName="p-4 pb-8">
          {individualTickets.map(({ category, ticketNumber, ticketId }) => {
            const ticketTransfer = bookingTransfers.find(
              (transfer) =>
                transfer.categoryId === category.id &&
                transfer.ticketNumber === ticketNumber
            );
            return (
              <View key={ticketId} className="mb-4">
                <View className="overflow-hidden rounded-xl bg-[#0577fa] shadow-sm">
                  <View className="relative h-32">
                    <CustomImage
                      className="absolute inset-0 size-full opacity-40"
                      imageClassName="size-full"
                      source={{ uri: selectedBooking.event.image }}
                      contentFit="cover"
                    />
                    <View className="flex-1 flex-row items-center p-3">
                      <View className="flex-1 pr-3">
                        <View className="self-start rounded bg-white/20 px-2 py-0.5">
                          <TextComponent className="text-[8px] font-bold uppercase text-white">
                            {selectedBooking.kind === "registration"
                              ? "Registered"
                              : category.name}
                          </TextComponent>
                        </View>
                        <TextComponent
                          className="mt-2 font-bold text-white"
                          numberOfLines={2}
                        >
                          {selectedBooking.event.title}
                        </TextComponent>
                        <TextComponent className="mt-2 text-[9px] text-white/80">
                          {selectedBooking.event.date} ·{" "}
                          {selectedBooking.event.time}
                        </TextComponent>
                        <TextComponent className="mt-1 text-[9px] text-white/80">
                          {selectedBooking.event.venue}
                        </TextComponent>
                        <TextComponent className="mt-2 text-[8px] font-bold text-white">
                          #{ticketId.toUpperCase()}
                        </TextComponent>
                      </View>
                      <View className="items-center border-l border-dashed border-white/50 pl-3">
                        <TextComponent className="mb-1 text-[8px] font-bold text-white">
                          {ticketNumber}/{category.quantity}
                        </TextComponent>
                        <UniqueTicketQr value={ticketId} />
                      </View>
                    </View>
                  </View>
                </View>
                <View className="mt-2 flex-row gap-2">
                  <Pressable
                    onPress={() => onOpenEvent(selectedBooking.event)}
                    className="h-10 flex-1 items-center justify-center rounded-lg bg-primary"
                  >
                    <TextComponent className="text-xs font-bold text-white">
                      View Event
                    </TextComponent>
                  </Pressable>
                  {selectedBooking.kind === "ticket" &&
                    category.quantity > 0 && (
                      <Pressable
                        disabled={Boolean(ticketTransfer)}
                        onPress={() => beginTransfer(category, ticketNumber)}
                        className={
                          ticketTransfer
                            ? "h-10 flex-1 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-100"
                            : "h-10 flex-1 items-center justify-center rounded-lg border border-primary"
                        }
                      >
                        <TextComponent
                          className={
                            ticketTransfer
                              ? "text-xs font-bold text-zinc-400"
                              : "text-xs font-bold text-primary"
                          }
                        >
                          {ticketTransfer ? "Transferred" : "Transfer"}
                        </TextComponent>
                      </Pressable>
                    )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="border-b border-zinc-100 bg-white px-4 pb-3 pt-3">
        <View className="h-10 flex-row items-center">
          <Pressable
            onPress={onBack}
            className="size-9 items-center justify-center"
          >
            <ChevronLeftIcon size={18} color="#52525b" />
          </Pressable>
          <TextComponent className="flex-1 text-center font-bold text-zinc-950">
            My Tickets
          </TextComponent>
          <View className="size-9" />
        </View>
        <View className="mt-3 h-11 flex-row items-center rounded-xl bg-zinc-100 px-3">
          <SearchIcon size={16} color="#8a8f98" />
          <TextInput
            value={ticketQuery}
            onChangeText={setTicketQuery}
            placeholder="Search events, venues..."
            placeholderTextColor="#8a8f98"
            className="ml-2 flex-1 p-0 text-xs text-zinc-700 outline-none"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pt-3"
        >
          {(["All", "Recent", "Transferred", "Past"] as const).map((filter) => {
            const isActive = ticketFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setTicketFilter(filter)}
                className={
                  isActive
                    ? "rounded-full bg-primary px-5 py-2"
                    : "rounded-full border border-zinc-300 bg-white px-5 py-2"
                }
              >
                <TextComponent
                  className={
                    isActive
                      ? "text-xs font-bold text-white"
                      : "text-xs font-semibold text-zinc-600"
                  }
                >
                  {filter}
                </TextComponent>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView
        contentContainerClassName="p-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <TextComponent className="mb-3 text-xs font-bold text-primary">
          Recent Events
        </TextComponent>
        {visibleBookings.length > 0 ? (
          visibleBookings.map((booking) => (
            <TicketEventCard
              key={booking.id}
              booking={booking}
              onPress={() => openBooking(booking)}
            />
          ))
        ) : (
          <View className="items-center rounded-xl bg-white px-6 py-12">
            <TicketVectorIcon size={42} color="#cbd5e1" />
            <TextComponent className="mt-4 text-center text-sm text-zinc-500">
              {ticketQuery || ticketFilter !== "All"
                ? "No tickets match this search or filter."
                : "Your paid tickets and registrations will appear here."}
            </TextComponent>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const NotificationIconBadge = ({
  children,
  tone = "blue"
}: {
  children: React.ReactNode;
  tone?: "blue" | "orange" | "gray";
}) => {
  const bg =
    tone === "orange"
      ? "bg-sky-400"
      : tone === "gray"
        ? "bg-zinc-100"
        : "bg-primary";
  return (
    <View className={`size-12 items-center justify-center rounded-full ${bg}`}>
      {children}
    </View>
  );
};

const NotificationsContent = ({
  transfers,
  subscribedEvents,
  onRespond,
  onOpenChat
}: {
  transfers: TTicketTransfer[];
  subscribedEvents: TFeedEvent[];
  onRespond: (id: string, status: "accepted" | "rejected") => void;
  onOpenChat: () => void;
}) => {
  return (
    <View className="flex-1 bg-zinc-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-8"
      >
        <View className="bg-white">
          {subscribedEvents.map((event) => (
            <View key={`subscription-${event.id}`} className="flex-row border-b border-zinc-100 px-4 py-4">
              <NotificationIconBadge><BellVectorIcon size={20} color="#ffffff" /></NotificationIconBadge>
              <View className="ml-3 flex-1">
                <TextComponent className="font-bold text-zinc-950">Event updates enabled</TextComponent>
                <TextComponent className="mt-1 text-sm leading-5 text-zinc-600">You’ll receive blog, activity and media updates for {event.name}.</TextComponent>
              </View>
              <TextComponent className="text-[10px] text-zinc-400">Now</TextComponent>
            </View>
          ))}
          {transfers.map((transfer) => (
            <React.Fragment key={transfer.id}>
              <Pressable
                onPress={onOpenChat}
                className="flex-row border-b border-zinc-100 px-4 py-4"
              >
                <NotificationIconBadge tone="gray">
                  <SendIcon size={20} color={ACTIVE_NAV_COLOR} />
                </NotificationIconBadge>
                <View className="ml-3 flex-1">
                  <TextComponent className="font-bold text-zinc-950">
                    Ticket Sent
                  </TextComponent>
                  <TextComponent className="mt-1 text-xs leading-5 text-zinc-500">
                    Your {transfer.categoryName} ticket for{" "}
                    {transfer.event.title} was sent to {transfer.recipient}.
                  </TextComponent>
                </View>
                <TextComponent className="text-[10px] text-zinc-400">
                  Now
                </TextComponent>
              </Pressable>
              {transfer.status !== "waiting" && (
                <Pressable
                  onPress={onOpenChat}
                  className="flex-row border-b border-zinc-100 px-4 py-4"
                >
                  <NotificationIconBadge
                    tone={transfer.status === "accepted" ? "blue" : "orange"}
                  >
                    <TicketVectorIcon size={20} color="#ffffff" />
                  </NotificationIconBadge>
                  <View className="ml-3 flex-1">
                    <TextComponent className="font-bold text-zinc-950">
                      Ticket{" "}
                      {transfer.status === "accepted" ? "Accepted" : "Rejected"}
                    </TextComponent>
                    <TextComponent className="mt-1 text-xs leading-5 text-zinc-500">
                      {transfer.recipient} {transfer.status} your ticket
                      transfer for {transfer.event.title}.
                    </TextComponent>
                  </View>
                  <TextComponent className="text-[10px] text-zinc-400">
                    Now
                  </TextComponent>
                </Pressable>
              )}
              <Pressable
                onPress={onOpenChat}
                className="border-b border-zinc-100 px-4 py-4"
              >
                <View className="flex-row items-center">
                  <NotificationIconBadge>
                    <TicketVectorIcon size={22} color="#ffffff" />
                  </NotificationIconBadge>
                  <View className="ml-3 flex-1">
                    <TextComponent className="font-bold text-zinc-950">
                      Ticket Transfer Request
                    </TextComponent>
                    <TextComponent className="mt-1 text-xs text-zinc-500">
                      A {transfer.categoryName} ticket is waiting for your
                      response.
                    </TextComponent>
                  </View>
                  <TextComponent className="text-[10px] text-zinc-400">
                    Now
                  </TextComponent>
                </View>
                {transfer.status === "waiting" && (
                  <View className="ml-[60px] mt-3 flex-row gap-3">
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        onRespond(transfer.id, "accepted");
                      }}
                      className="h-10 flex-1 items-center justify-center rounded-lg bg-primary"
                    >
                      <TextComponent className="font-bold text-white">
                        Accept
                      </TextComponent>
                    </Pressable>
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        onRespond(transfer.id, "rejected");
                      }}
                      className="h-10 flex-1 items-center justify-center rounded-lg bg-zinc-200"
                    >
                      <TextComponent className="font-bold text-zinc-700">
                        Reject
                      </TextComponent>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            </React.Fragment>
          ))}
          <View className="flex-row border-b border-zinc-100 px-4 py-4">
            <CustomImage
              className="size-12 rounded-full"
              imageClassName="size-full rounded-full"
              source={{ uri: PERFORMER_EVENTS[2].image }}
              contentFit="cover"
            />
            <View className="ml-3 flex-1">
              <View className="flex-row justify-between">
                <TextComponent className="font-bold text-zinc-950">
                  Blog Post
                </TextComponent>
                <TextComponent className="text-[10px] text-zinc-400">
                  1h ago
                </TextComponent>
              </View>
              <TextComponent className="mt-1 text-sm leading-5 text-zinc-600">
                New Story: "The Evolution of Carnival Costumes" is now live.
              </TextComponent>
            </View>
          </View>

          <Pressable onPress={onOpenChat} className="flex-row border-b border-zinc-100 px-4 py-4">
            <NotificationIconBadge><MessageIcon size={20} color="#ffffff" /></NotificationIconBadge>
            <View className="ml-3 flex-1"><TextComponent className="font-bold text-zinc-950">Festival Squad</TextComponent><TextComponent className="mt-1 text-sm text-zinc-600">Emmanuel: The group meetup point has changed.</TextComponent></View>
            <TextComponent className="text-[10px] text-zinc-400">Now</TextComponent>
          </Pressable>

          <View className="flex-row border-b border-zinc-100 px-4 py-4">
            <NotificationIconBadge tone="orange"><CircleExclamationIcon size={20} color="#ffffff" /></NotificationIconBadge>
            <View className="ml-3 flex-1"><TextComponent className="font-bold text-zinc-950">Security Login Alert</TextComponent><TextComponent className="mt-1 text-sm text-zinc-600">A new login was detected on Windows Desktop.</TextComponent></View>
            <TextComponent className="text-[10px] text-zinc-400">10m</TextComponent>
          </View>

          <View className="flex-row border-b border-zinc-100 px-4 py-4">
            <ChatAvatar image={CHAT_STORIES[0].avatar} size={48} online />
            <View className="ml-3 flex-1">
              <View className="flex-row justify-between">
                <TextComponent className="font-bold text-zinc-950">
                  Sarah Jenkins
                </TextComponent>
                <TextComponent className="text-[10px] text-zinc-400">
                  3h ago
                </TextComponent>
              </View>
              <TextComponent className="mt-1 text-sm italic leading-5 text-zinc-600">
                "Hey, are we still meeting at the stadium entrance?"
              </TextComponent>
            </View>
          </View>

          <View className="flex-row border-b border-zinc-100 px-4 py-4">
            <NotificationIconBadge tone="orange">
              <CircleExclamationIcon size={22} color="#ffffff" />
            </NotificationIconBadge>
            <View className="ml-3 flex-1">
              <View className="flex-row justify-between">
                <TextComponent className="font-bold text-zinc-950">
                  New Event Alert
                </TextComponent>
                <TextComponent className="text-[10px] text-zinc-400">
                  5h ago
                </TextComponent>
              </View>
              <TextComponent className="mt-1 text-sm leading-5 text-zinc-600">
                Burna Boy just announced a new concert at Grand Stadium!
              </TextComponent>
            </View>
          </View>
        </View>

        <TextComponent className="px-4 pb-2 pt-5 text-[10px] font-bold uppercase text-zinc-400">
          Earlier This Week
        </TextComponent>
        <View className="bg-white">
          <View className="flex-row px-4 py-4">
            <NotificationIconBadge tone="gray">
              <ClockVectorIcon size={22} color="#94a3b8" />
            </NotificationIconBadge>
            <View className="ml-3 flex-1">
              <View className="flex-row justify-between">
                <TextComponent className="font-bold text-zinc-500">
                  System Update
                </TextComponent>
                <TextComponent className="text-[10px] text-zinc-400">
                  2d ago
                </TextComponent>
              </View>
              <TextComponent className="mt-1 text-sm leading-5 text-zinc-400">
                Your profile was successfully updated. Explore new events
                nearby!
              </TextComponent>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const ProfileStat = ({
  label,
  value,
  onPress
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    className="flex-1 items-center rounded-lg bg-blue-50 py-3"
  >
    <TextComponent className="text-sm font-bold text-primary">
      {value}
    </TextComponent>
    <TextComponent className="mt-1 text-[10px] font-semibold text-zinc-500">
      {label}
    </TextComponent>
  </Pressable>
);


const SettingsSwitch = ({
  enabled,
  onPress,
  label
}: {
  enabled: boolean;
  onPress: () => void;
  label: string;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="switch"
    accessibilityLabel={label}
    accessibilityState={{ checked: enabled }}
    className={
      enabled
        ? "h-6 w-11 justify-center rounded-full bg-primary px-1"
        : "h-6 w-11 justify-center rounded-full bg-zinc-300 px-1"
    }
  >
    <View
      className={
        enabled
          ? "size-4 self-end rounded-full bg-white"
          : "size-4 self-start rounded-full bg-white"
      }
    />
  </Pressable>
);

const MoreButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open event settings"
      onPress={onPress}
      className="h-9 w-8 items-center justify-center"
    >
      <View className="gap-0.5">
        <View className="size-1 rounded-full bg-zinc-700" />
        <View className="size-1 rounded-full bg-zinc-700" />
        <View className="size-1 rounded-full bg-zinc-700" />
      </View>
    </Pressable>
  );
};

/** The feed's background; the card's ticket notches are cut in it. */
const FEED_BACKGROUND = TICKET_LIST_BACKGROUND;

/** A feed event as a web-style ticket stub; the dots open its options. */
const FeedCard = ({
  event,
  onOpenSettings,
  onOpenDetails
}: {
  event: TFeedEvent;
  onOpenSettings: (event: TFeedEvent) => void;
  onOpenDetails?: (event: TFeedEvent) => void;
}) => (
  <EventTicketCard
    name={event.name}
    date={event.date}
    timezone={event.timezone}
    image={event.medias?.[0] || event.image}
    category={event.category}
    place={event.venueName}
    badge={event.mediaKind === "video" ? "Video" : undefined}
    onPress={() => onOpenDetails?.(event)}
    onMore={() => onOpenSettings(event)}
  />
);


// Every card's dots open the one shared sheet (see EventOptionsSheet).
const SettingsSheet = ({
  event,
  onClose
}: {
  event: TFeedEvent | null;
  onClose: () => void;
  onMessageOrganizer?: (event: TFeedEvent) => void;
  onShareWithCommunity?: (event: TFeedEvent) => void;
}) => (
  <EventOptionsSheet
    event={
      event && {
        id: event.id,
        name: event.name,
        date: event.date,
        timezone: event.timezone,
        image: event.medias?.[0] || event.image,
        place: event.venueName,
        isFavorite: event.isFavorite
      }
    }
    onClose={onClose}
  />
);

const RefinedHomeFeedDesignScreen = () => {
  const [activeTab, setActiveTab] = useState<TBottomNavId>("home");
  // Android back on another tab returns to Home; on Home it leaves the app.
  // Pages opened on top answer first (each has its own back handling).
  useHardwareBack(() => {
    if (activeTab === "home") return false;
    setActiveTab("home");
  });
  // Tapping the tab you're on takes that screen back to its top.
  const homeListRef = useRef<TBrandRefreshListHandle>(null);
  const [exploreTopSignal, setExploreTopSignal] = useState(0);
  const onTabPress = (tab: TBottomNavId) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      return;
    }
    if (tab === "home") {
      homeListRef.current?.scrollToTop();
    }
    if (tab === "search") setExploreTopSignal((count) => count + 1);
  };
  const [hideMessageNav, setHideMessageNav] = useState(false);
  const [ticketsReturnTab, setTicketsReturnTab] =
    useState<TBottomNavId>("profile");
  const [selectedEvent, setSelectedEvent] = useState<TFeedEvent | null>(null);
  const [selectedHomeEvent, setSelectedHomeEvent] =
    useState<TPerformerEvent | null>(null);
  const [sharedChatEvent, setSharedChatEvent] = useState<TFeedEvent | null>(
    null
  );
  const [eventShareIntent, setEventShareIntent] =
    useState<TEventShareIntent>("organizer");
  // Hidden events and the card dots: the same store and sheet as Explore.
  const hiddenEventIds = useHiddenEventsStore((state) => state.hiddenEventIds);
  const syncHiddenEvents = useHiddenEventsStore((state) => state.sync);
  const isSignedIn = !!useUserStore((state) => state.userToken);
  const unreadNotifications = useUnreadNotifications(isSignedIn);
  useEffect(() => {
    if (isSignedIn) void syncHiddenEvents();
  }, [isSignedIn, syncHiddenEvents]);
  const [optionsEvent, setOptionsEvent] = useState<TEventOptionsTarget | null>(
    null
  );
  const subscribedEventIds = usePrototypeSocialStore((state) => state.subscribedEventIds);
  const subscribeToEvent = usePrototypeSocialStore((state) => state.subscribeToEvent);
  const [homeBookingMode, setHomeBookingMode] = useState<
    "detail" | "ticket" | "register"
  >("detail");
  const [bookings, setBookings] = useState<TBookedEvent[]>(() => [
    {
      id: "sample-paid-event",
      event: { ...PERFORMER_EVENTS[1], bookingType: "ticket" },
      kind: "ticket",
      bookedAt: "2026-08-27T12:00:00.000Z",
      categories: [
        { id: "general", name: "General Admission", quantity: 2, price: 0 },
        { id: "vip", name: "VIP Experience", quantity: 3, price: 25000 },
        { id: "vvip", name: "VVIP Table", quantity: 4, price: 150000 }
      ]
    },
    {
      id: "sample-registration",
      event: { ...PERFORMER_EVENTS[0], bookingType: "register" },
      kind: "registration",
      bookedAt: "2026-08-26T12:00:00.000Z",
      categories: [
        { id: "registration", name: "Registration Pass", quantity: 1, price: 0 }
      ]
    }
  ]);
  const [transfers, setTransfers] = useState<TTicketTransfer[]>([]);
  // The home feed is live: published events from the API, ten at a time,
  // the next ten fetched as you scroll towards the end.
  const liveEvents = useLiveEvents({ limit: String(HOME_FEED_BATCH) });
  // The loader shows only while the feed's first page is on its way.
  const isSplashVisible = liveEvents.isLoading && !liveEvents.data;
  const feedEvents = useMemo(
    () =>
      (liveEvents.data?.pages ?? [])
        .flatMap((page) => page.events)
        .map(toLiveFeedEvent)
        .filter((event) => !hiddenEventIds.includes(event.id)),
    [hiddenEventIds, liveEvents.data]
  );
  const [liveEventId, setLiveEventId] = useState<string | null>(null);
  // A performer opened from an event's line-up on the home feed.
  const [livePerformerId, setLivePerformerId] = useState<string | null>(null);
  const [liveBookingEvent, setLiveBookingEvent] = useState<TLiveEvent | null>(
    null
  );
  const isExploreTab = activeTab === "search";
  const isTicketsTab = activeTab === "tickets";
  const isMessagesTab = activeTab === "messages";
  const isNotificationsTab = activeTab === "favorites";
  const isProfileTab = activeTab === "profile";
  const openHomeEventDetails = (event: TFeedEvent) => {
    setLiveEventId(event.id);
  };
  const openLiveTickets = () => {
    setLiveBookingEvent(null);
    setLiveEventId(null);
    setTicketsReturnTab("home");
    setActiveTab("tickets");
  };
  const openOrganizerChat = (event: TFeedEvent) => {
    setEventShareIntent("organizer");
    setSharedChatEvent(event);
    setActiveTab("messages");
  };
  const shareEventWithCommunity = (event: TFeedEvent) => {
    setEventShareIntent("community");
    setSharedChatEvent(event);
    setActiveTab("messages");
  };
  const addTicketBooking = (
    event: TPerformerEvent,
    categories: TBookedTicketCategory[]
  ) => {
    subscribeToEvent(event.id);
    setBookings((current) => [
      {
        id: `${event.id}-${Date.now()}`,
        event: { ...event, bookingType: "ticket" },
        kind: "ticket",
        categories,
        bookedAt: new Date().toISOString()
      },
      ...current
    ]);
  };
  const addRegistration = (event: TPerformerEvent) => {
    subscribeToEvent(event.id);
    setBookings((current) => [
      {
        id: `${event.id}-${Date.now()}`,
        event: { ...event, bookingType: "register" },
        kind: "registration",
        categories: [
          {
            id: "registration",
            name: "Registration Pass",
            quantity: 1,
            price: 0
          }
        ],
        bookedAt: new Date().toISOString()
      },
      ...current
    ]);
  };
  const openMyTickets = () => {
    setSelectedHomeEvent(null);
    setTicketsReturnTab("home");
    setActiveTab("tickets");
  };
  const ticketCount = bookings.reduce(
    (total, booking) =>
      total +
      booking.categories.reduce((sum, category) => sum + category.quantity, 0),
    0
  );

  if (isSplashVisible) {
    return (
      <ContainerComponent isSafeAreaView className="bg-white">
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center bg-white">
          <BrandLoader />
        </View>
      </ContainerComponent>
    );
  }

  if (liveBookingEvent) {
    return (
      <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
        <View
          className="flex-1 w-full self-center bg-white"
          style={{ maxWidth: 430 }}
        >
          <LiveTicketCheckoutScreen
            event={liveBookingEvent}
            onBack={() => setLiveBookingEvent(null)}
            onViewTickets={openLiveTickets}
          />
        </View>
      </ContainerComponent>
    );
  }

  if (liveEventId) {
    return (
      <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
        <View
          className="flex-1 w-full self-center bg-white"
          style={{ maxWidth: 430 }}
        >
          <LiveEventDetailScreen
            eventId={liveEventId}
            onBack={() => setLiveEventId(null)}
            onBook={setLiveBookingEvent}
            onOpenPerformer={(id) => {
              setLivePerformerId(id);
              setLiveEventId(null);
            }}
          />
        </View>
      </ContainerComponent>
    );
  }
  if (livePerformerId) {
    return (
      <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
        <View
          className="flex-1 w-full self-center bg-white"
          style={{ maxWidth: 430 }}
        >
          <LivePerformerProfileScreen
            performerId={livePerformerId}
            onBack={() => setLivePerformerId(null)}
            onOpenEvent={(id) => {
              setLivePerformerId(null);
              setLiveEventId(id);
            }}
          />
        </View>
      </ContainerComponent>
    );
  }


  if (!isExploreTab && selectedHomeEvent && homeBookingMode === "ticket") {
    return (
      <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
        <View
          className="flex-1 w-full self-center bg-white"
          style={{ maxWidth: 430 }}
        >
          <TicketSelectionScreen
            event={selectedHomeEvent}
            onBack={() => setHomeBookingMode("detail")}
            onBookingComplete={addTicketBooking}
            onViewTickets={openMyTickets}
          />
        </View>
      </ContainerComponent>
    );
  }

  if (!isExploreTab && selectedHomeEvent && homeBookingMode === "register") {
    return (
      <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
        <View
          className="flex-1 w-full self-center bg-white"
          style={{ maxWidth: 430 }}
        >
          <RegistrationFormScreen
            event={selectedHomeEvent}
            onBack={() => setHomeBookingMode("detail")}
            onRegistrationComplete={addRegistration}
            onViewTickets={openMyTickets}
          />
        </View>
      </ContainerComponent>
    );
  }

  if (!isExploreTab && selectedHomeEvent) {
    return (
      <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
        <View
          className="flex-1 w-full self-center bg-white"
          style={{ maxWidth: 430 }}
        >
          <EventBookingDetailScreen
            event={selectedHomeEvent}
            onBack={() => setSelectedHomeEvent(null)}
            onTicket={() => setHomeBookingMode("ticket")}
            onRegister={() => setHomeBookingMode("register")}
            onShareEvent={shareEventWithCommunity}
            onContactOrganizer={openOrganizerChat}
          />
        </View>
      </ContainerComponent>
    );
  }

  return (
    <ContainerComponent isSafeAreaView className="bg-white" edges={["top"]}>
      <StatusBar style="dark" />
      <View
        className="flex-1 w-full self-center bg-white"
        style={{ maxWidth: 430 }}
      >
        {isExploreTab ? (
          <LiveExploreScreen
            onBook={setLiveBookingEvent}
            scrollToTopSignal={exploreTopSignal}
          />
        ) : isTicketsTab ? (
          <LiveMyTicketsScreen onBack={() => setActiveTab(ticketsReturnTab)} />
        ) : isMessagesTab ? (
          <ChatsScreen
            onOpenEvent={(eventId) => setLiveEventId(eventId)}
            onOpenTickets={() => {
              setTicketsReturnTab("messages");
              setActiveTab("tickets");
            }}
          />
        ) : isNotificationsTab ? (
          <NotificationsScreen
            onOpenEvent={(eventId) => setLiveEventId(eventId)}
            onOpenTickets={() => {
              setTicketsReturnTab("favorites");
              setActiveTab("tickets");
            }}
          />
        ) : isProfileTab ? (
          <ProfileScreen
            onOpenEvent={(eventId) => setLiveEventId(eventId)}
            onOpenTickets={() => {
              setTicketsReturnTab("profile");
              setActiveTab("tickets");
            }}
          />
        ) : (
          <>
            <View className="h-14 items-center justify-center border-b border-zinc-100 bg-white px-4">
              <CustomImage
                className="h-9 w-28"
                imageClassName="size-full"
                source={TurnupzWordmark}
                contentFit="contain"
              />
            </View>
            <BrandRefreshList
              listRef={homeListRef}
              data={feedEvents}
              keyExtractor={(event) => event.id}
              style={{ backgroundColor: FEED_BACKGROUND }}
              contentContainerStyle={{ paddingTop: 16 }}
              renderItem={({ item }) => (
                <FeedCard
                  event={item}
                  onOpenSettings={(event) =>
                    setOptionsEvent({
                      id: event.id,
                      name: event.name,
                      date: event.date,
                      timezone: event.timezone,
                      image: event.medias?.[0] || event.image,
                      place: event.venueName,
                      isFavorite: event.isFavorite
                    })
                  }
                  onOpenDetails={openHomeEventDetails}
                />
              )}
              refreshing={liveEvents.isRefetching}
              onRefresh={() => void liveEvents.refetch()}
              // The next ten load well before the end is reached, so scrolling
              // never has to stop and wait.
              onEndReached={() =>
                liveEvents.hasNextPage &&
                !liveEvents.isFetchingNextPage &&
                void liveEvents.fetchNextPage()
              }
              onEndReachedThreshold={2}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={9}
              ListFooterComponent={
                liveEvents.isFetchingNextPage ? (
                  <View className="items-center pb-8 pt-2">
                    <BrandLoader height={22} hideLabel />
                  </View>
                ) : !liveEvents.hasNextPage &&
                  feedEvents.length > HOME_FEED_BATCH ? (
                  <TextComponent className="mb-6 text-center text-sm text-zinc-400">
                    You're all caught up
                  </TextComponent>
                ) : null
              }
              ListEmptyComponent={
                <View className="mt-24 items-center gap-2 px-8">
                  <TextComponent className="text-center text-lg font-bold text-zinc-950">
                    {liveEvents.isLoading
                      ? "Finding events..."
                      : liveEvents.error
                        ? "We couldn't load events"
                        : "No events yet"}
                  </TextComponent>
                  {!liveEvents.isLoading && (
                    <TextComponent className="text-center text-sm text-zinc-500">
                      {liveEvents.error
                        ? "Pull down to try again."
                        : "New events will show up here."}
                    </TextComponent>
                  )}
                </View>
              }
              showsVerticalScrollIndicator={false}
              contentContainerClassName="pb-4"
            />
          </>
        )}
        {!isTicketsTab && !(isMessagesTab && hideMessageNav) && (
          <PreviewBottomNav
            activeTab={activeTab}
            onTabPress={onTabPress}
            unreadNotifications={unreadNotifications.data ?? 0}
          />
        )}
        <SettingsSheet
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onMessageOrganizer={openOrganizerChat}
          onShareWithCommunity={shareEventWithCommunity}
        />
        <EventOptionsSheet
          event={optionsEvent}
          onClose={() => setOptionsEvent(null)}
          onOpenEvent={(eventId) => setLiveEventId(eventId)}
        />
        {/* Someone's profile, their followers, finding people: opened from anywhere. */}
        <PeopleModal />
      </View>
    </ContainerComponent>
  );
};

export default memo(RefinedHomeFeedDesignScreen);
