import { Platform } from "react-native";
import { useEffect } from "react";
import { createMMKV } from "react-native-mmkv";
import useUserStore from "@/shared/stores/user.store";
import { rememberServerTime } from "@/shared/utils/live-code";
import { useScreenActive } from "@/shared/hooks/use-screen-active";
import { deleteData, getData, patchData, postData } from "@/api";
import {
  TTransferRecipient,
  recipientBody
} from "@/shared/utils/transfer-recipient";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

/**
 * The live data behind the booking flow: the same endpoints and shapes the web
 * uses, so both apps sell tickets by the same rules.
 */

export type TPrice = {
  amount: number;
  currency?: { code?: string; locale?: string };
  formatted?: { withCurrency?: string };
};

/** A post the organiser wrote for an event's attendees. */
export type TBlogPost = {
  id: string;
  title: string;
  excerpt?: string | null;
  body: string;
  /** Picture urls, first is the cover. */
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
};

/** One day of a multi-day event, in order. */
export type TLiveEventDay = {
  id: string;
  startsAt: string;
  endsAt?: string | null;
  /** Shown instead of the date when set, e.g. "Opening night". */
  label?: string | null;
  position: number;
  /** Who performs that day, headliner first (on the event's detail). */
  performers?: TLivePerformerSummary[];
};

/** How an event is selling, for the labels on its card. */
export type TEventMomentum = {
  sellingFast: boolean;
  almostGone: boolean;
  soldOut: boolean;
};

export type TLiveEvent = {
  id: string;
  name: string;
  /** When it starts: the first day, for a multi-day event. */
  date: string;
  /** A multi-day event's days; empty or missing for a one-day event. */
  days?: TLiveEventDay[];
  /** When a multi-day event ends; null for a one-day event. */
  endDate?: string | null;
  timezone?: string;
  image?: string;
  medias?: string[];
  /** The gallery with what each file is (photo or video). */
  mediaDetails?: { url?: string; type?: string | null }[];
  /** The sponsor board, in the organiser's order. */
  sponsors?: {
    id?: string;
    name: string;
    imageDetails?: { url?: string } | null;
    /** Show the name even though there's a logo. */
    showName?: boolean;
  }[];
  description?: string;
  additionalInformation?: string[];
  organizerName?: string;
  /** The organiser's user id: what a planner is followed by. */
  organizerId?: string;
  category?: { id: string; name: string } | null;
  /** Who's on the bill, headliner first (on the event's detail). */
  performers?: TLivePerformerSummary[];
  isFavorite?: boolean;
  saleMethod?: "on_turnup" | "register" | "external_link" | string;
  ticketUrl?: string;
  status?: string;
  isOwner?: boolean;
  venue?: { id?: string; name?: string; address?: string };
  venueName?: string;
  eventCity?: string;
  eventState?: string;
  eventCountry?: string;
  activities?: { name: string; description?: string; date?: string }[];
  blogPosts?: TBlogPost[];
  momentum?: TEventMomentum | null;
  /** A paid boost: shown first and marked Sponsored. */
  sponsored?: boolean;
  boostId?: string;
  eventGuestsOfHonour?: {
    name?: string;
    firstName?: string;
    lastName?: string;
  }[];
};

export type TLiveTicket = {
  id: string;
  name: string;
  type?: string;
  link?: string;
  price: TPrice;
  quantity?: number;
  available?: number;
  visibility?: "public" | "private";
  salesStartAt?: string | null;
  salesEndAt?: string | null;
  maxPerOrder?: number | null;
  isOnSale?: boolean;
  /** For a multi-day event: the days it admits on. Empty means every day. */
  dayIds?: string[];
};

export type TLiveOrder = {
  id: string;
  status: string;
  statusReason?: string | null;
  holdExpiresAt?: string | null;
  quantity: number;
  ticket?: { name?: string; price?: TPrice; event?: TLiveEvent };
  userTickets?: { id: string; code?: string }[];
};

export type TLiveUserTicket = {
  id: string;
  registrationStatus?: string | null;
  /** The order it came from; only on tickets you bought yourself. */
  orderId?: string;
  code?: string;
  qrCodeValue?: string;
  status?: string;
  checkedInAt?: string | null;
  currentHolderName?: string;
  ticket?: TLiveTicket & {
    event?: TLiveEvent;
    transferable?: boolean;
    isTransferable?: boolean;
  };
  /** For the QR that changes every 30 seconds; only on your own tickets. */
  liveCode?: { secret: string; windowSeconds: number; serverTime: string } | null;
  /** Its latest transfer that wasn't cancelled; PENDING means it's on its way to someone. */
  transfer?: {
    id: string;
    status: "PENDING" | "CLAIMED" | "CANCELLED" | string;
    /** Only when they have no account; account holders show by name and @username. */
    toEmail: string | null;
    recipientUsername?: string | null;
    recipientName?: string | null;
    createdAt: string;
  };
};

const PAGE_SIZE = 20;

/** Where an event is, as one line: venue, then the nearest place name. */
export const eventPlace = (event?: TLiveEvent | null) => {
  const venue = event?.venue?.name || event?.venueName;
  const area = event?.eventCity || event?.eventState || event?.eventCountry;
  return [venue, area].filter(Boolean).join(", ") || "Venue to be announced";
};

const DOLLAR_CURRENCIES = new Set(["CAD", "USD", "AUD", "NZD", "SGD", "HKD"]);

export const formatPrice = (price?: TPrice | null, quantity = 1) => {
  if (!price || !price.amount) return "Free";
  if (quantity === 1 && price.formatted?.withCurrency) {
    return price.formatted.withCurrency;
  }
  const code = price.currency?.code || "NGN";
  try {
    // Dollars share "$", so they're written CA$50 or US$50, as the API does.
    const locale = DOLLAR_CURRENCIES.has(code.toUpperCase())
      ? "en-GB"
      : price.currency?.locale || "en-NG";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2
    }).format(price.amount * quantity);
  } catch {
    return `${code} ${(price.amount * quantity).toLocaleString()}`;
  }
};

/** Explore's filters, as the api names them (the same ones the web sends). */
export type TLiveEventFilters = {
  q?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  venueId?: string;
  performerId?: string;
  /** One organiser's published events. */
  organizerId?: string;
  /** ISO country code, e.g. "NG". */
  countryCode?: string;
  city?: string;
  priceType?: "FREE" | "PAID";
  /** "true" for the api's trending events. */
  isTrending?: "true";
  /** "true" for the events the signed-in person has saved. */
  isFavorite?: "true";
  /** Upcoming (the api's default) or past events. */
  status?: "UPCOMING" | "PAST";
  /** Page size; the rails ask for a few, the lists for a full page. */
  limit?: string;
};

export const useLiveEvents = (
  filters: string | TLiveEventFilters = {},
  enabled = true
) => {
  const options = typeof filters === "string" ? { q: filters } : filters;
  return useInfiniteQuery({
    enabled,
    queryKey: ["live-events", options],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(PAGE_SIZE)
      });
      // Set entries (including a limit) override the defaults above.
      Object.entries(options).forEach(([key, value]) => {
        const text = typeof value === "string" ? value.trim() : "";
        if (text) params.set(key, text);
      });
      const { data } = await getData<TLiveEvent[]>(`/events?${params}`);
      return { events: data?.data ?? [], pagination: data?.pagination };
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextPage ?? undefined
  });
};

export type TLiveCategory = { id: string; name: string };

export type TLiveLocation = {
  countryCode: string;
  country: string;
  count: number;
  cities: { name: string; count: number }[];
};

/** Countries (and their cities) with upcoming events, busiest first. */
export const useLiveEventLocations = () =>
  useQuery({
    queryKey: ["live-event-locations"],
    queryFn: async () => {
      const { data } = await getData<TLiveLocation[]>("/events/locations");
      return data?.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
    // An older api without locations just hides the filter.
    retry: false
  });

export type TPerformerType =
  | "ARTIST"
  | "DJ"
  | "BAND"
  | "SPEAKER"
  | "COMEDIAN"
  | "HOST"
  | "ATHLETE"
  | "CHEF"
  | "OTHER";

export type TLivePerformerSummary = {
  id: string;
  name: string;
  type: TPerformerType;
  image?: string | null;
  /** Approved by the Turnupz team: shown with the verified tick. */
  isVerified?: boolean;
  /** Top of the bill; an event or a day can have several. */
  isHeadliner?: boolean;
};

export type TLivePerformer = TLivePerformerSummary & {
  bio?: string | null;
  countryCode?: string | null;
  country?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  website?: string | null;
  upcomingEventsCount: number;
  /** Position on a chart, when it came from one. */
  rank?: number;
};

export const PERFORMER_TYPE_LABELS: Record<TPerformerType, string> = {
  ARTIST: "Artist",
  DJ: "DJ",
  BAND: "Band",
  SPEAKER: "Speaker",
  COMEDIAN: "Comedian",
  HOST: "Host",
  ATHLETE: "Athlete",
  CHEF: "Chef",
  OTHER: "Performer"
};

export const CHART_REGIONS = [
  { value: "global", label: "Global" },
  { value: "africa", label: "Africa" },
  { value: "europe", label: "Europe" },
  { value: "americas", label: "Americas" },
  { value: "asia", label: "Asia" }
] as const;

export type TChartRegion = (typeof CHART_REGIONS)[number]["value"];

/** A chart: performers ranked by tickets sold for their events. */
export const useLivePerformerChart = (region: TChartRegion, limit = 20) =>
  useQuery({
    queryKey: ["live-performer-chart", region, limit],
    queryFn: async () => {
      const { data } = await getData<{
        region: TChartRegion;
        performers: TLivePerformer[];
      }>(`/performers/charts?region=${region}&limit=${limit}`);
      return data?.data?.performers ?? [];
    },
    staleTime: 5 * 60 * 1000
  });

/**
 * The chart for a country's region (or the world when there's no regional
 * chart yet), with which region it turned out to be.
 */
export const useLivePerformerChartFor = (countryCode?: string, limit = 10) =>
  useQuery({
    queryKey: ["live-performer-chart-for", countryCode ?? "", limit],
    queryFn: async () => {
      const get = (params: string) =>
        getData<{ region: TChartRegion; performers: TLivePerformer[] }>(
          `/performers/charts?${params}&limit=${limit}`
        );
      // An api without country charts yet answers 400: use the world's.
      const { data } = countryCode
        ? await get(`countryCode=${countryCode}`).catch(() =>
            get("region=global")
          )
        : await get("region=global");
      return {
        region: data?.data?.region ?? "global",
        performers: data?.data?.performers ?? []
      };
    },
    staleTime: 5 * 60 * 1000
  });

/** Performers matching a search, by name. */
export const useLivePerformers = (q = "", enabled = true) =>
  useInfiniteQuery({
    queryKey: ["live-performers", q.trim()],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(PAGE_SIZE)
      });
      if (q.trim()) params.set("q", q.trim());
      const { data } = await getData<TLivePerformer[]>(`/performers?${params}`);
      return { performers: data?.data ?? [], pagination: data?.pagination };
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextPage ?? undefined,
    enabled,
    retry: false
  });

export const useLivePerformer = (performerId?: string) =>
  useQuery({
    queryKey: ["live-performer", performerId],
    queryFn: async () => {
      const { data } = await getData<TLivePerformer>(
        `/performers/${performerId}`
      );
      return data?.data;
    },
    enabled: !!performerId
  });

/** Saves the event, or un-saves it if it was saved (the api toggles). */
export const toggleSavedEvent = (eventId: string) =>
  postData(`/events/favorite/${eventId}`);

/** Platform switches admins can change (the API's GET /features). */
export type TFeatures = { promotion: boolean; creditSpending: boolean; referralRewards: boolean };

/** Until the switches load (or if they can't): the server's defaults. */
const DEFAULT_FEATURES: TFeatures = { promotion: true, creditSpending: false, referralRewards: false };

export const useFeatures = (): TFeatures => {
  const { data } = useQuery({
    queryKey: ["features"],
    queryFn: async () => {
      const { data } = await getData<TFeatures>("/features");
      return data?.data ?? null;
    },
    staleTime: 60 * 1000
  });
  return { ...DEFAULT_FEATURES, ...(data ?? {}) };
};

export const useLiveCategories = () =>
  useQuery({
    queryKey: ["live-categories"],
    queryFn: async () => {
      const { data } = await getData<TLiveCategory[]>("/categories");
      return data?.data ?? [];
    },
    staleTime: 10 * 60 * 1000
  });

export type TLiveVenue = {
  id: string;
  name: string;
  address?: string;
  totalAvailableSeat?: number;
  rating?: number;
  images?: string[];
};

export type TLivePlanner = {
  /** Their user id: the organizerId on events, and what they're followed by. */
  id: string;
  name: string;
  image?: string | null;
  upcomingEvents: number;
};

/** Every planner with something coming up, busiest first. */
export const useLivePlanners = (q = "", limit = PAGE_SIZE) =>
  useInfiniteQuery({
    queryKey: ["live-planners", q.trim(), limit],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(limit)
      });
      if (q.trim()) params.set("q", q.trim());
      const { data } = await getData<TLivePlanner[]>(
        `/events/planners?${params}`
      );
      return { planners: data?.data ?? [], pagination: data?.pagination };
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextPage ?? undefined,
    retry: false
  });

/** One venue, e.g. one you follow. */
export const useLiveVenue = (venueId?: string) =>
  useQuery({
    queryKey: ["live-venue", venueId],
    queryFn: async () => {
      const { data } = await getData<TLiveVenue>(`/venue/${venueId}`);
      return data?.data ?? null;
    },
    enabled: !!venueId
  });

export const useLiveVenues = (
  q = "",
  place?: { country?: string; city?: string }
) =>
  useInfiniteQuery({
    queryKey: [
      "live-venues",
      q.trim(),
      place?.country ?? "",
      place?.city ?? ""
    ],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(PAGE_SIZE)
      });
      if (q.trim()) params.set("q", q.trim());
      if (place?.country) params.set("country", place.country);
      if (place?.city) params.set("city", place.city);
      const { data } = await getData<TLiveVenue[]>(`/venues?${params}`);
      return { venues: data?.data ?? [], pagination: data?.pagination };
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextPage ?? undefined
  });

export const useLiveEvent = (eventId?: string) =>
  useQuery({
    queryKey: ["live-event", eventId],
    queryFn: async () => {
      const { data } = await getData<TLiveEvent>(`/event/${eventId}`);
      return data?.data;
    },
    enabled: !!eventId
  });

export const useLiveTickets = (eventId?: string) =>
  useQuery({
    queryKey: ["live-tickets", eventId],
    queryFn: async () => {
      const { data } = await getData<TLiveTicket[]>(
        `/tickets?eventId=${eventId}`
      );
      return data?.data ?? [];
    },
    enabled: !!eventId
  });

export const fetchOrder = async (orderId: string) => {
  const { data } = await getData<TLiveOrder>(`/order/${orderId}`);
  return data?.data;
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      /** One ticket type… */
      ticketId?: string;
      quantity?: number;
      /** …or several for the same event. */
      items?: { ticketId: string; quantity: number }[];
      /** Spend Turnupz Credit first; the rest goes to the payment page. */
      useCredit?: boolean;
      /** Pay with a saved card: charged straight away, no payment page. */
      cardId?: string;
      /** Keep the card used on the payment page for next time. */
      saveCard?: boolean;
      /** The organiser's promo code, checked again when the order is made. */
      promoCode?: string;
      /** What brought them here (a boost, a reminder…), for the organiser's results. */
      source?: string;
    }) => {
      const { data } = await postData<
        typeof body,
        { orderId: string; status: string; redirectUrl?: string; holdExpiresAt?: string | null }
      >("/order", body);
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["live-user-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["credit"] });
      queryClient.invalidateQueries({ queryKey: ["saved-cards"] });
    }
  });
};

export type TPromoCheck = {
  code: string;
  label: string;
  discountPercent: number | null;
  discountAmount: { amount: number } | null;
};

/** Checkout's "Apply": the code and what it takes off, or the API's reason it can't be used. */
export const checkPromoCode = async (eventId: string, code: string) => {
  const { data } = await getData<TPromoCheck>(
    `/promo-codes/check?eventId=${eventId}&code=${encodeURIComponent(code)}`
  );
  return data?.data ?? null;
};

/** Counts the event page being opened, for the organiser's views. Never throws. */
export const recordEventView = (eventId: string) => {
  void postData(`/event/${eventId}/view`, {}).catch(() => undefined);
};

/** Counts the ticket page being opened, for the sales funnel. Never throws. */
export const recordTicketPageView = (eventId: string) => {
  void postData(`/event/${eventId}/view`, { page: "tickets" }).catch(() => undefined);
};

/** A card kept for next time. Only its brand and last 4 digits are ever shown. */
export type TSavedCard = {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  /** Picked first at checkout. */
  isDefault: boolean;
  isExpired: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export const useSavedCards = (enabled = true) =>
  useQuery({
    queryKey: ["saved-cards"],
    enabled,
    queryFn: async () => {
      const { data } = await getData<TSavedCard[]>("/saved-cards");
      return data?.data ?? [];
    }
  });

/** "Visa ending 4242" */
export const cardLabel = (card: Pick<TSavedCard, "brand" | "last4">) =>
  `${card.brand} ending ${card.last4}`;

/** "08/28" */
export const cardExpiry = (card: Pick<TSavedCard, "expiryMonth" | "expiryYear">) =>
  `${String(card.expiryMonth).padStart(2, "0")}/${String(card.expiryYear).slice(-2)}`;

export const makeCardDefault = async (cardId: string) =>
  (await patchData<undefined, TSavedCard[]>(`/saved-cards/${cardId}/default`, undefined)).data?.data ?? [];

export const removeSavedCard = async (cardId: string) =>
  (await deleteData<TSavedCard[]>(`/saved-cards/${cardId}`)).data?.data ?? [];

export type TCreditBalance = {
  currency: string;
  /** Spendable now. */
  available: TPrice;
  /** Earned, released after the waiting period. */
  pending: TPrice;
  nextExpiry: string | null;
};

/** Turnupz Credit per currency: what can be spent now and what's on the way. */
export const useCreditBalance = (enabled = true) =>
  useQuery({
    queryKey: ["credit", "balance"],
    enabled,
    queryFn: async () => {
      const { data } = await getData<TCreditBalance[]>("/credit");
      return data?.data ?? [];
    }
  });

export type TCreditGrant = {
  id: string;
  currency: string;
  amount: TPrice;
  remaining: TPrice;
  state: "PENDING" | "AVAILABLE" | "SPENT" | "EXPIRED" | "CANCELLED";
  description: string;
  availableAt: string | null;
  releaseAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

/** Every credit grant, newest first. */
export const useCreditHistory = (enabled = true) =>
  useQuery({
    queryKey: ["credit", "history"],
    enabled,
    queryFn: async () => {
      const { data } = await getData<TCreditGrant[]>("/credit/history?limit=50");
      return data?.data ?? [];
    }
  });

/** An amount in major units as money, in that currency's style. */
/** Nothing, written as money: "₦0.00" (not "Free"), in a price's currency or Naira. */
export const formatZero = (like?: { currency?: { code?: string; locale?: string } } | null) => {
  const code = like?.currency?.code || "NGN";
  try {
    return new Intl.NumberFormat(like?.currency?.locale || "en-NG", {
      style: "currency",
      currency: code
    }).format(0);
  } catch {
    return `${code} 0`;
  }
};

export const formatMoney = (amount: number, like?: TPrice | null) =>
  formatPrice(
    like
      ? { ...like, amount, formatted: undefined }
      : ({ amount, currency: { code: "NGN" } } as TPrice)
  );

/** Your tickets, kept on the phone so they open at the door with no signal. */
const savedTickets = createMMKV({ id: "turnup-saved-tickets" });
type TSavedTickets = {
  pages: { tickets: TLiveUserTicket[]; pagination?: { nextPage?: number | null } }[];
  pageParams: unknown[];
};
export const clearSavedTickets = () => savedTickets.clearAll();
const readSavedTickets = (userId?: string) => {
  if (!userId) return undefined;
  try {
    const raw = savedTickets.getString(`tickets:${userId}`);
    return raw ? (JSON.parse(raw) as TSavedTickets) : undefined;
  } catch {
    return undefined;
  }
};

const fetchUserTicketsPage = async ({ pageParam }: { pageParam: unknown }) => {
  const { data } = await getData<TLiveUserTicket[]>(
    `/tickets/user?page=${pageParam}&limit=${PAGE_SIZE}`
  );
  return { tickets: data?.data ?? [], pagination: data?.pagination };
};

export const useLiveUserTickets = (enabled = true) => {
  const userId = useUserStore((state) => state.user?.id);
  const query = useInfiniteQuery({
    queryKey: ["live-user-tickets"],
    enabled: enabled && !!userId,
    // Always checked again on opening: a purchase or transfer may have just landed.
    staleTime: 0,
    // The copy kept on the phone shows at once (and offline) until fresh ones arrive.
    initialData: () => readSavedTickets(userId),
    initialDataUpdatedAt: 0,
    initialPageParam: 1,
    queryFn: fetchUserTicketsPage,
    getNextPageParam: (lastPage) => lastPage.pagination?.nextPage ?? undefined
  });
  // Each fresh copy replaces the one on the phone.
  useEffect(() => {
    if (!userId || !query.data || !query.isSuccess || query.isFetching) return;
    if (query.dataUpdatedAt === 0) return;
    // Fresh from Turnupz: learn how far this phone's clock is out, for live codes.
    const serverTime = query.data.pages[0]?.tickets.find((ticket) => ticket.liveCode)?.liveCode?.serverTime;
    if (serverTime) rememberServerTime(serverTime, query.dataUpdatedAt);
    try {
      savedTickets.set(`tickets:${userId}`, JSON.stringify(query.data));
    } catch {
      // Keeping a copy is a bonus; never break the screen over it.
    }
  }, [userId, query.data, query.isSuccess, query.isFetching, query.dataUpdatedAt]);
  return query;
};

/** Report reasons; the keys are the API's. */
export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "scam", label: "Scam or fraud" },
  { value: "misleading", label: "Misleading details" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "cancelled", label: "Event cancelled" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "other", label: "Something else" }
];

export const reportEvent = (
  eventId: string,
  body: { reason: string; details?: string }
) => postData(`/event/${eventId}/report`, body);

/* ---------------------------------------------------------------- chats */

export type TLiveChat = {
  id: string;
  eventId?: string | null;
  /** What to call the chat: the event, the group, or the other person. */
  eventName: string;
  title?: string | null;
  preview?: string | null;
  type: "EVENT_GROUP" | "DIRECT" | "SUPPORT" | string;
  /** ACTIVE, or ARCHIVED once an event's chat has closed (read-only). */
  status?: "ACTIVE" | "ARCHIVED" | string;
  memberCount?: number;
  lastActivityAt?: string;
  /** Only the organiser can post (others can react). */
  announcementMode?: boolean;
  muted?: boolean;
  unreadCount?: number;
  eventImage?: string | null;
  eventDate?: string | null;
  eventTimezone?: string | null;
  /** One-to-one chats: when the other person last read it, for "Seen". */
  otherLastReadAt?: string | null;
  /** The event's organiser (the chat's owner). */
  vendor?: { id?: string; name?: string; firstName?: string; lastName?: string };
  /** Chats between two people: the other person. */
  person?: { id: string; username: string | null; image: string | null } | null;
  /** A message request: incoming waits for you to accept, outgoing for them. */
  request?: "incoming" | "outgoing" | null;
};

export type TSharedEvent = {
  id: string;
  name: string;
  date: string;
  timezone?: string;
  image?: string | null;
  place?: string | null;
  organizerName?: string | null;
};

export type TLiveChatMessage = {
  id: string;
  senderId?: string | null;
  senderName?: string | null;
  /** "vendor" for the organiser. */
  senderRole?: string | null;
  /** "text", "image", "event-update", "event-share", … */
  kind: string;
  assetUrl?: string | null;
  attachmentDetails?: { url?: string | null } | null;
  body?: string | null;
  href?: string | null;
  metadata?: { sharedEvent?: TSharedEvent } | null;
  /** Each emoji, how many reacted, and whether you did. */
  reactions?: { reaction: string; count: number; mine?: boolean }[];
  createdAt: string;
};

/** The chats the signed-in person is in, most recent first. */
/** Messages from people you don't follow back, waiting for you to accept. */
export const useMessageRequests = (enabled = true) =>
  useQuery({
    queryKey: ["live-chats", "requests"],
    queryFn: async () => {
      const { data } = await getData<TLiveChat[]>("/chats?requests=true&limit=50");
      return data?.data ?? [];
    },
    enabled
  });

/** Accept (it moves into your chats) or decline (it's removed; they aren't told). */
export const answerMessageRequest = (chatId: string, accept: boolean) =>
  postData(`/chats/${chatId}/request/${accept ? "accept" : "decline"}`, {});

export const useLiveChats = (enabled = true) => {
  // Checked for new messages every 20 seconds, but only while it's on screen.
  const onScreen = useScreenActive();
  return useQuery({
    queryKey: ["live-chats"],
    queryFn: async () => {
      const { data } = await getData<TLiveChat[]>("/chats?limit=50");
      return data?.data ?? [];
    },
    enabled,
    refetchInterval: onScreen ? 20000 : false
  });
};

const MESSAGE_PAGE = 50;

/** A chat's latest messages in reading order. Opening it marks it read. */
export const useLiveChatMessages = (chatId?: string | null) =>
  useQuery({
    queryKey: ["live-chat-messages", chatId],
    queryFn: async () => {
      const { data } = await getData<TLiveChatMessage[]>(
        `/chats/${chatId}/messages?order=latest&limit=${MESSAGE_PAGE}`
      );
      return data?.data ?? [];
    },
    enabled: !!chatId,
    refetchInterval: 5000
  });

/**
 * Sends a photo: shrunk on the phone first (1080px wide, compressed) so it
 * uploads fast and costs little to keep, then posted as an image message.
 */
export const sendChatPhoto = async (
  chatId: string,
  photo: { uri: string; width?: number; mimeType?: string | null; fileName?: string | null },
  caption?: string
) => {
  const { manipulateAsync, SaveFormat } = await import("expo-image-manipulator");
  const shrunk = await manipulateAsync(
    photo.uri,
    photo.width && photo.width > 1080 ? [{ resize: { width: 1080 } }] : [],
    { compress: 0.7, format: SaveFormat.JPEG }
  );
  const form = new FormData();
  const name = (photo.fileName || "photo").replace(/\.[^.]+$/, "") + ".jpg";
  if (Platform.OS === "web") {
    form.append("file", await (await fetch(shrunk.uri)).blob(), name);
  } else {
    form.append("file", { uri: shrunk.uri, name, type: "image/jpeg" } as unknown as Blob);
  }
  const upload = await postData<FormData, { id: string; assetUrl: string }>("/chats/upload", form, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  const attachmentId = upload.data?.data?.id;
  if (!attachmentId) throw new Error("Upload failed");
  return postData(`/chats/${chatId}/messages`, {
    body: caption?.trim() || "Photo",
    kind: "IMAGE",
    attachmentId
  });
};

/** Opens (or reopens) a private chat with the organiser of an event. */
export const startOrganizerChat = async (eventId: string) => {
  const { data } = await postData<
    { eventId: string },
    { id: string; title: string; isNew: boolean }
  >("/chats/direct", { eventId });
  return data!.data!;
};

/** Adds your reaction to a message, or takes it off if it's there. */
export const toggleChatReaction = (chatId: string, messageId: string, reaction: string) =>
  postData<{ reaction: string }, unknown>(
    `/event-chat/${chatId}/messages/${messageId}/reactions`,
    { reaction }
  );

/** Sends a message; with an event attached it shows as that event's card. */
export const sendChatMessage = (
  chatId: string,
  body: { body: string; sharedEventId?: string }
) => postData(`/chats/${chatId}/messages`, body);

/* ---------------------------------------------------------------- transfers */

export type TSentTransfer = {
  id: string;
  /** Only when they have no account; account holders show by name and @username. */
  toEmail: string | null;
  recipientUsername?: string | null;
  status: "PENDING" | "CLAIMED" | "CANCELLED";
  createdAt: string;
  claimedAt?: string | null;
  recipientName?: string | null;
  userTicket: TLiveUserTicket;
};

/** A ticket can be sent on when its category allows it and it hasn't been used or sent. */
/** Free tickets can't be passed on: your friend can get their own. */
export const isFreeTicket = (ticket: TLiveUserTicket) =>
  ticket.ticket?.type === "FREE" ||
  ticket.ticket?.event?.saleMethod === "register" ||
  !(ticket.ticket?.price?.amount && ticket.ticket.price.amount > 0);

/** A free ticket or registration not yet used can be given up before the event. */
export const canCancelPlace = (ticket: TLiveUserTicket) =>
  isFreeTicket(ticket) &&
  (ticket.status ?? "UN_USED") === "UN_USED" &&
  ticket.registrationStatus !== "REJECTED" &&
  ticket.transfer?.status !== "PENDING";

export const cancelFreePlace = (ticketId: string) =>
  postData(`/ticket/${ticketId}/cancel-place`, {});

export const canTransfer = (ticket: TLiveUserTicket) =>
  !isFreeTicket(ticket) &&
  (ticket.ticket?.isTransferable ?? ticket.ticket?.transferable ?? false) &&
  (ticket.status ?? "UN_USED") === "UN_USED" &&
  ticket.transfer?.status !== "PENDING";

/** Tickets you've sent: waiting to be claimed, claimed or cancelled. */
export const useSentTransfers = () =>
  useQuery({
    queryKey: ["live-sent-transfers"],
    queryFn: async () => {
      const { data } = await getData<TSentTransfer[]>(
        "/ticket/transfers?limit=50"
      );
      return data?.data ?? [];
    }
  });

const useRefreshTicketLists = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["live-user-tickets"] });
    void queryClient.invalidateQueries({ queryKey: ["live-sent-transfers"] });
  };
};

/**
 * Sends a ticket to someone by email. They claim it from the link we email
 * them (on the web, so it works whether or not they have the app).
 */
export const useTransferTicket = () => {
  const refresh = useRefreshTicketLists();
  return useMutation({
    mutationFn: ({
      userTicketId,
      recipient,
      claimBaseUrl
    }: {
      userTicketId: string;
      recipient: TTransferRecipient;
      claimBaseUrl: string;
    }) =>
      postData("/ticket/transfer", {
        userTicketId,
        ...recipientBody(recipient),
        claimUrl: `${claimBaseUrl}/tickets/claim/{{transferId}}`
      }),
    onSuccess: refresh
  });
};

/** Takes back a ticket that hasn't been claimed yet. */
export const useCancelTransfer = () => {
  const refresh = useRefreshTicketLists();
  return useMutation({
    mutationFn: (transferId: string) =>
      postData(`/ticket/transfer/${transferId}/cancel`),
    onSuccess: refresh
  });
};

export type TTransferRecipientPreview = {
  username: string;
  name: string | null;
  avatar: string | null;
  isYou: boolean;
};

/** Who a username belongs to, so the sender sees who they're sending to. */
export const useTransferRecipient = (username?: string) =>
  useQuery({
    queryKey: ["live-transfer-recipient", username?.toLowerCase()],
    queryFn: async () => {
      const { data } = await getData<TTransferRecipientPreview>(
        `/ticket/transfer/recipient?username=${encodeURIComponent(username ?? "")}`
      );
      return data?.data ?? null;
    },
    enabled: !!username,
    retry: false,
    staleTime: 60_000
  });

/** How a recipient reads: their name, else @username, else the email typed. */
export const recipientLabel = (recipient: {
  recipientName?: string | null;
  recipientUsername?: string | null;
  toEmail?: string | null;
}) =>
  recipient.recipientName ||
  (recipient.recipientUsername ? `@${recipient.recipientUsername}` : null) ||
  recipient.toEmail ||
  "them";

export type TReceivedTransfer = {
  id: string;
  status: "PENDING" | "CLAIMED" | "CANCELLED";
  createdAt: string;
  senderName: string;
  senderUsername?: string | null;
  userTicket: TLiveUserTicket;
};

/** Tickets sent to you, waiting for you to accept. */
export const useReceivedTransfers = () =>
  useQuery({
    queryKey: ["live-received-transfers"],
    queryFn: async () => {
      const { data } = await getData<TReceivedTransfer[]>(
        "/ticket/transfers/received"
      );
      return data?.data ?? [];
    }
  });

const useRefreshAfterReceiving = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["live-received-transfers"]
    });
    void queryClient.invalidateQueries({ queryKey: ["live-user-tickets"] });
  };
};

/** Accepts a ticket sent to you; it moves into your tickets. */
export const useAcceptTransfer = () => {
  const refresh = useRefreshAfterReceiving();
  return useMutation({
    mutationFn: (transferId: string) =>
      postData(`/ticket/transfer/${transferId}/claim`),
    onSuccess: refresh
  });
};

/** Turns down a ticket sent to you; it goes back to the sender. */
export const useDeclineTransfer = () => {
  const refresh = useRefreshAfterReceiving();
  return useMutation({
    mutationFn: (transferId: string) =>
      postData(`/ticket/transfer/${transferId}/decline`),
    onSuccess: refresh
  });
};

export type TOrderRefund = {
  status: "processing" | "completed" | "failed";
  tickets: number;
  toCard: TPrice;
  asCredit: TPrice;
  requestedAt: string;
  completedAt: string | null;
};

export type TRefundedOrder = {
  id: string;
  quantity: number;
  createdAt: string;
  ticket?: { name?: string; event?: { data?: { name?: string } } };
  refunds: TOrderRefund[];
  refundedTickets: number;
};

/** Orders with tickets refunded: refunded tickets leave the ticket list. */
export const useRefundedOrders = () =>
  useQuery({
    queryKey: ["live-refunded-orders"],
    queryFn: async () => {
      const { data } = await getData<TRefundedOrder[]>("/orders?limit=50");
      return (data?.data ?? []).filter((order) => order.refundedTickets > 0);
    }
  });

/** One of your purchases: what you bought, what it cost, how you paid, and its tickets. */
export type TMyOrder = {
  id: string;
  /** The order number to quote to support, e.g. ORD-D7YS-YYKJ. */
  reference?: string | null;
  status: string;
  statusReason?: string | null;
  /** For an order waiting for payment: when its held seats are let go. */
  holdExpiresAt?: string | null;
  quantity: number;
  createdAt: string;
  ticket?: { name?: string; event?: TLiveEvent };
  items?: { ticketId: string; name: string; quantity: number; unitPrice: TPrice }[];
  total?: TPrice;
  /** Tax, as sold, and whether it's part of the prices rather than on top. */
  tax?: { label: string; amount: TPrice }[];
  taxIncluded?: boolean;
  payment?: { card: TPrice | null; cardLabel: string | null; credit: TPrice | null };
  refunds?: {
    status: string;
    kind?: string;
    reason?: string | null;
    feeKept?: TPrice;
    tickets: number;
    toCard: TPrice;
    asCredit: TPrice;
    requestedAt: string;
    completedAt?: string | null;
  }[];
  userTickets?: { id: string; code?: string; status?: string; ticket?: { name?: string } }[];
};

/** Every order you've made, newest first. */
export const useMyOrders = (enabled = true) =>
  useInfiniteQuery({
    queryKey: ["my-orders"],
    enabled,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await getData<TMyOrder[]>(`/orders?page=${pageParam}&limit=${PAGE_SIZE}`);
      return { orders: data?.data ?? [], pagination: data?.pagination };
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextPage ?? undefined
  });

/** One order of yours, e.g. the one a ticket came from. */
export const useMyOrder = (orderId?: string | null) =>
  useQuery({
    queryKey: ["my-orders", orderId],
    enabled: !!orderId,
    queryFn: async () =>
      (await getData<TMyOrder[]>(`/orders?orderId=${orderId}`)).data?.data?.[0] ?? null
  });

/**
 * Your chat with the Turnupz team (made the first time). A message sends
 * straight away; replies come back in Messages.
 */
export const openSupportChat = async (message?: string) =>
  (await postData<{ message?: string }, { id: string; isNew: boolean }>("/chats/support", {
    ...(message ? { message } : {})
  })).data?.data;

/**
 * How many tickets you hold for an event (0 if none). It only reads the tickets
 * already loaded (or kept on the phone); it never fetches, so every card can
 * ask without a request each.
 */
export const useTicketsHeldFor = (eventId?: string | null) => {
  const userId = useUserStore((state) => state.user?.id);
  const { data } = useInfiniteQuery({
    queryKey: ["live-user-tickets"],
    enabled: false,
    initialData: () => readSavedTickets(userId),
    initialDataUpdatedAt: 0,
    initialPageParam: 1,
    queryFn: fetchUserTicketsPage,
    getNextPageParam: (lastPage) => lastPage.pagination?.nextPage ?? undefined,
    select: (tickets) =>
      eventId
        ? tickets.pages
            .flatMap((page) => page.tickets)
            .filter(
              (ticket) =>
                ticket.ticket?.event?.id === eventId &&
                (ticket.status === "UN_USED" || ticket.status === "USED" || !ticket.status)
            ).length
        : 0
  });
  return userId ? (data ?? 0) : 0;
};

/* ------------------------------------------------------------------- tax */

export type TEventTaxRates = {
  taxInclusive: boolean;
  rates: { code: string; label: string; ppm: number }[];
};

/** The taxes on an event's tickets; none unless a decision is approved. */
export const useEventTaxRates = (eventId?: string, currency?: string) =>
  useQuery({
    queryKey: ["event-tax-rates", eventId, currency],
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await getData<TEventTaxRates>(
        `/event/${eventId}/tax-rates${currency ? `?currency=${currency}` : ""}`,
      );
      return data?.data ?? null;
    },
  });

/**
 * Tax shown at checkout, the same sum the api does when the order is made.
 * Amounts in main units (naira, dollars).
 */
export const checkoutTax = (priced: number, tax?: TEventTaxRates | null) => {
  const lines: { code: string; label: string; amount: number }[] = [];
  if (!tax?.rates.length || priced <= 0) return { gross: priced, lines, included: false };
  const minor = Math.round(priced * 100);
  const halfUp = (value: number) => Math.floor(value + 0.5);
  if (!tax.taxInclusive) {
    let added = 0;
    for (const rate of tax.rates) {
      const amount = halfUp((minor * rate.ppm) / 1_000_000);
      added += amount;
      lines.push({ code: rate.code, label: rate.label, amount: amount / 100 });
    }
    return { gross: (minor + added) / 100, lines, included: false };
  }
  const totalPpm = tax.rates.reduce((sum, rate) => sum + rate.ppm, 0);
  const net = halfUp((minor * 1_000_000) / (1_000_000 + totalPpm));
  for (const rate of tax.rates) {
    lines.push({
      code: rate.code,
      label: rate.label,
      amount: halfUp((net * rate.ppm) / 1_000_000) / 100,
    });
  }
  return { gross: priced, lines, included: true };
};
