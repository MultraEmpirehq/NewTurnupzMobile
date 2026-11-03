import { WEB_APP_URL } from "@env";
import { getData, patchData, postData } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TPrice } from "./live-api";

/**
 * The organiser's promotion tools, the same endpoints the web uses: whether an
 * event is ready to promote, how it's selling, promoter codes and boosts.
 */

export type TEventPromotion = {
  eventId: string;
  ready: boolean;
  score: { done: number; total: number };
  checklist: { id: string; label: string; done: boolean; optional?: boolean }[];
  isUpcoming: boolean;
  labels: { sellingFast: boolean; almostGone: boolean; soldOut: boolean };
  /** What Turnupz sends for them: done, or when it will go. */
  automations: {
    key: string;
    kind: "followers" | "savers" | "holders";
    title: string;
    audience: number;
    status: "sent" | "scheduled";
    at: string;
  }[];
  sales: {
    total: number;
    lastWeek: number;
    capacity: number | null;
    left: number | null;
    sources: {
      yourLink: number;
      attendeeShares: number;
      promoCodes: number;
      followers: number;
      turnupz: number;
    };
    views: number;
    visitors: number;
    conversion: number | null;
  };
  share: { ref: string | null; fromPrice: TPrice | null; city: string | null };
};

export const useEventPromotion = (eventId?: string, enabled = true) =>
  useQuery({
    queryKey: ["event-promotion", eventId],
    enabled: !!eventId && enabled,
    queryFn: async () => {
      const { data } = await getData<TEventPromotion>(`/event/${eventId}/promotion`);
      return data?.data ?? null;
    }
  });

/** The event's page on the web, tagged with the organiser so their sales show as theirs. */
export const eventShareUrl = (eventId: string, ref?: string | null, code?: string) => {
  const base = `${(WEB_APP_URL ?? "https://turnupz.app").replace(/\/$/, "")}/explore/event/${encodeURIComponent(eventId)}`;
  const params = [ref ? `ref=${encodeURIComponent(ref)}` : null, code ? `code=${encodeURIComponent(code)}` : null]
    .filter(Boolean)
    .join("&");
  return params ? `${base}?${params}` : base;
};

/* ---------------------------------------------------------- promoter codes */

export type TPromoCode = {
  id: string;
  code: string;
  promoterName: string;
  discountLabel: string | null;
  discountPercent: number | null;
  maxUses: number | null;
  isActive: boolean;
  status: "live" | "paused" | "ended" | "scheduled" | "used_up";
  stats: { tickets: number; revenue: TPrice; discountGiven: TPrice };
};

export type TNewPromoCode = {
  code: string;
  promoterName: string;
  eventId?: string;
  discountPercent?: number;
  maxUses?: number;
};

export const usePromoCodes = (eventId?: string, enabled = true) =>
  useQuery({
    queryKey: ["promo-codes", eventId],
    enabled: !!eventId && enabled,
    queryFn: async () => {
      const { data } = await getData<TPromoCode[]>(`/vendor/promo-codes?eventId=${eventId}`);
      return data?.data ?? [];
    }
  });

export const usePromoCodeActions = () => {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
    void queryClient.invalidateQueries({ queryKey: ["event-promotion"] });
  };
  const create = useMutation({
    mutationFn: (body: TNewPromoCode) => postData<TNewPromoCode, TPromoCode>("/vendor/promo-codes", body),
    onSuccess: refresh
  });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      patchData<{ isActive: boolean }, TPromoCode>(`/vendor/promo-codes/${id}`, { isActive }),
    onSuccess: refresh
  });
  return { create, setActive };
};

/* ------------------------------------------------------------------ boosts */

export type TBoostPlacement = "HOME" | "EXPLORE" | "SEARCH";

export type TBoostRequest = {
  eventId: string;
  placements: TBoostPlacement[];
  area: "city" | "country";
  days: number;
  startsAt?: string;
};

export type TBoostQuote = {
  currency: string;
  startsAt: string;
  endsAt: string;
  days: number;
  shortened: boolean;
  lines: { placement: TBoostPlacement; label: string; perDay: TPrice; total: TPrice }[];
  discount: TPrice;
  total: TPrice;
  eligible?: boolean;
  missing?: string[];
};

export type TBoost = {
  id: string;
  placements: { placement: TBoostPlacement; label: string }[];
  area: { kind: "city" | "country"; name: string };
  startsAt: string;
  endsAt: string;
  amount: TPrice;
  refunded: TPrice;
  phase:
    | "awaiting_payment"
    | "in_review"
    | "scheduled"
    | "live"
    | "ended"
    | "paused"
    | "stopped"
    | "rejected"
    | "payment_failed";
  reviewReasons: string[];
  reviewNote: string | null;
  pausedReason: string | null;
  stats: { impressions: number; clicks: number; tickets: number; sales: TPrice };
};

export const useBoostQuote = (request: TBoostRequest | null) =>
  useQuery({
    queryKey: ["boost-quote", request],
    enabled: !!request && request.placements.length > 0,
    placeholderData: (previous) => previous,
    retry: false,
    queryFn: async () => {
      const { data } = await postData<TBoostRequest, TBoostQuote>("/vendor/boosts/quote", request!);
      return data?.data ?? null;
    }
  });

export const useCreateBoost = () =>
  useMutation({
    mutationFn: async (request: TBoostRequest & { callbackUrl: string }) => {
      const { data } = await postData<typeof request, TBoostQuote & { boostId: string; url: string }>(
        "/vendor/boosts",
        request
      );
      return data?.data;
    }
  });

export const useEventBoosts = (eventId?: string, enabled = true) =>
  useQuery({
    queryKey: ["boosts", eventId],
    enabled: !!eventId && enabled,
    queryFn: async () => {
      const { data } = await getData<TBoost[]>(`/vendor/boosts?eventId=${eventId}`);
      return data?.data ?? [];
    }
  });

/** One boost; asking also confirms a payment the webhook hasn't reported yet. */
export const fetchBoost = async (boostId: string) => {
  const { data } = await getData<TBoost>(`/vendor/boosts/${boostId}`);
  return data?.data ?? null;
};

export const useStopBoost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boostId: string) => postData(`/vendor/boosts/${boostId}/stop`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["boosts"] })
  });
};
