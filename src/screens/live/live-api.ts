import { getData, postData } from "@/api";
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

export type TLiveEvent = {
  id: string;
  name: string;
  date: string;
  timezone?: string;
  image?: string;
  medias?: string[];
  description?: string;
  organizerName?: string;
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
  blogPosts?: {
    id: string;
    title: string;
    excerpt?: string;
    body: string;
    image?: string;
  }[];
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
  code?: string;
  qrCodeValue?: string;
  status?: string;
  checkedInAt?: string | null;
  currentHolderName?: string;
  ticket?: TLiveTicket & { event?: TLiveEvent };
};

const PAGE_SIZE = 20;

/** Where an event is, as one line: venue, then the nearest place name. */
export const eventPlace = (event?: TLiveEvent | null) => {
  const venue = event?.venue?.name || event?.venueName;
  const area = event?.eventCity || event?.eventState || event?.eventCountry;
  return [venue, area].filter(Boolean).join(", ") || "Venue to be announced";
};

export const formatPrice = (price?: TPrice | null, quantity = 1) => {
  if (!price || !price.amount) return "Free";
  if (quantity === 1 && price.formatted?.withCurrency) {
    return price.formatted.withCurrency;
  }
  const code = price.currency?.code || "NGN";
  try {
    return new Intl.NumberFormat(price.currency?.locale || "en-NG", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2
    }).format(price.amount * quantity);
  } catch {
    return `${code} ${(price.amount * quantity).toLocaleString()}`;
  }
};

export const useLiveEvents = (search = "") =>
  useInfiniteQuery({
    queryKey: ["live-events", search],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(PAGE_SIZE)
      });
      if (search.trim()) params.set("q", search.trim());
      const { data } = await getData<TLiveEvent[]>(`/events?${params}`);
      return { events: data?.data ?? [], pagination: data?.pagination };
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.nextPage ?? undefined
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
    mutationFn: async (body: { ticketId: string; quantity: number }) => {
      const { data } = await postData<
        typeof body,
        { orderId: string; status: string; redirectUrl?: string }
      >("/order", body);
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["live-user-tickets"] });
    }
  });
};

export const useLiveUserTickets = () =>
  useInfiniteQuery({
    queryKey: ["live-user-tickets"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await getData<TLiveUserTicket[]>(
        `/tickets/user?page=${pageParam}&limit=${PAGE_SIZE}`
      );
      return { tickets: data?.data ?? [], pagination: data?.pagination };
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.nextPage ?? undefined
  });

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
