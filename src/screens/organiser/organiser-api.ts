import { getData, postData } from "@/api";
import useUserStore from "@/shared/stores/user.store";
import { useOrganiserStore } from "@/shared/stores/organiser.store";
import { useQuery } from "@tanstack/react-query";
import { TPrice } from "@/screens/live/live-api";

/**
 * Organiser mode's data, from the same endpoints the web uses. A team member
 * acts for an organiser by sending their id as X-Vendor-Workspace; the API
 * then allows only what the organiser gave them.
 */

export type TVendorPermission =
  | "EVENTS_MANAGE"
  | "TICKETS_SCAN"
  | "SCANNERS_MANAGE"
  | "REGISTRATIONS_REVIEW"
  | "SALES_VIEW"
  | "FINANCE_VIEW"
  | "CHATS_MANAGE"
  // Newer permissions the API may add, without breaking older apps.
  | (string & {});

export type TWorkspace = {
  membershipId: string;
  vendorId: string;
  name: string;
  username?: string | null;
  image?: string | null;
  permissions: TVendorPermission[];
};

/** An event the signed-in person can check tickets in for. */
export type TScanEvent = {
  id: string;
  name: string;
  date: string;
  endDate: string | null;
  timezone?: string | null;
  image: string | null;
  place: string;
  days: number;
  /** Their own, a team they're on, or one event they were given door access to. */
  via: "own" | "team" | "door";
  /** For team events: send as X-Vendor-Workspace. */
  vendorId: string | null;
};

/** Requests made for a team: the API acts as that organiser. */
export const asWorkspace = (vendorId?: string | null) =>
  vendorId ? { headers: { "X-Vendor-Workspace": vendorId } } : undefined;

export const useWorkspaces = (enabled = true) =>
  useQuery({
    queryKey: ["workspaces"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await getData<TWorkspace[]>("/vendor/workspaces");
      return data?.data ?? [];
    }
  });

export const useScanEvents = (enabled = true) =>
  useQuery({
    queryKey: ["scan-events"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await getData<TScanEvent[]>("/scanning/events");
      return data?.data ?? [];
    }
  });

/** On now or starting within a day, so the door is what matters. */
export const isAtTheDoor = (event: TScanEvent) => {
  const now = Date.now();
  const start = new Date(event.date).getTime();
  const end = new Date(event.endDate ?? event.date).getTime() + 12 * 60 * 60 * 1000;
  return start - now < 24 * 60 * 60 * 1000 && end > now;
};

export const ALL_PERMISSIONS: TVendorPermission[] = [
  "EVENTS_MANAGE",
  "TICKETS_SCAN",
  "SCANNERS_MANAGE",
  "REGISTRATIONS_REVIEW",
  "SALES_VIEW",
  "FINANCE_VIEW",
  "CHATS_MANAGE"
];

/**
 * Whether this person sees organiser mode at all, and what they can do in the
 * workspace they're in: everything for their own events, what they were given
 * for a team, scanning only for single events they can scan.
 */
export const useOrganiserAccess = () => {
  const user = useUserStore((state) => state.user);
  const signedIn = !!useUserStore((state) => state.userToken);
  const workspaceVendorId = useOrganiserStore((state) => state.workspaceVendorId);
  const workspaces = useWorkspaces(signedIn);
  const scanEvents = useScanEvents(signedIn);
  const isVendor = user?.role === "VENDOR";
  const teams = workspaces.data ?? [];
  const doorEvents = (scanEvents.data ?? []).filter((event) => event.via === "door");
  const canOrganise = isVendor || teams.length > 0 || doorEvents.length > 0;
  // A team that was removed falls back to their own events, or the first team.
  const team = teams.find((item) => item.vendorId === workspaceVendorId) ?? (isVendor ? null : teams[0] ?? null);
  const permissions: TVendorPermission[] = team
    ? team.permissions
    : isVendor
      ? ALL_PERMISSIONS
      : doorEvents.length
        ? ["TICKETS_SCAN"]
        : [];
  return {
    ready: !signedIn || (!workspaces.isPending && !scanEvents.isPending),
    canOrganise,
    isVendor,
    teams,
    /** The team being looked at, or null for their own events. */
    team,
    workspaceVendorId: team?.vendorId ?? null,
    workspaceName: team?.name ?? (user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your events"),
    can: (permission: TVendorPermission) => permissions.includes(permission),
    scanEvents: scanEvents.data ?? [],
    refetch: () => Promise.all([workspaces.refetch(), scanEvents.refetch()])
  };
};

/* ------------------------------------------------------------------- sales */

export type TInsightsEvent = {
  id: string;
  name: string;
  date: string;
  endDate: string | null;
  status: string;
  isPast: boolean;
  hasStarted: boolean;
  capacity: number | null;
  sold: number;
  soldInPeriod: number;
  revenue: TPrice;
  checkedIn: number;
};

export type TInsights = {
  summary: {
    ticketsSold: number;
    buyers: number;
    revenue: { code: string; total: TPrice }[];
  };
  series: { start: string; tickets: number }[];
  events: TInsightsEvent[];
  /** Page views to paid orders on their events in the period (newer APIs). */
  funnel?: { views: number; ticketViews: number; started: number; bought: number };
  /** What brought each paid order, most first. */
  sources?: { key: string; label: string; orders: number; tickets: number; share: number | null }[];
};

export type TEarnings = {
  currencies: {
    currency: string;
    sales: TPrice;
    fees: TPrice;
    processingFees?: TPrice;
    earnings: TPrice;
    owed: TPrice;
  }[];
};

/** What they kept in the last 30 days, after fees (needs "See the wallet"). */
export const useEarnings = (vendorId: string | null, enabled = true) =>
  useQuery({
    queryKey: ["organiser-earnings", vendorId ?? "own"],
    enabled,
    queryFn: async () => {
      const { data } = await getData<TEarnings>("/vendor/wallet?days=30", asWorkspace(vendorId));
      return data?.data ?? null;
    }
  });

/** The last 7 days' sales and every event's numbers, for Today and Events. */
export const useWeekSales = (vendorId: string | null, enabled = true) =>
  useQuery({
    queryKey: ["organiser-insights", vendorId ?? "own"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await getData<TInsights>("/vendor/tickets/insights?days=7", asWorkspace(vendorId));
      return data?.data ?? null;
    }
  });

/* -------------------------------------------------------------------- door */

export type TScanResult = {
  status: "approved" | "denied" | "already_checked_in";
  message: string;
  attendeeName?: string;
  ticketCategory?: string;
  /** When it was first checked in, and by whom (for "already checked in"). */
  checkedInAt?: string | null;
  scannerEmail?: string | null;
  dayName?: string;
  dayId?: string;
  /** A typed code: check their ID matches the name. */
  checkId?: boolean;
  /** Let in again by the team, with a reason. */
  readmitted?: boolean;
};

export type TScanSummary = {
  eventId: string;
  eventName: string;
  total: number;
  checkedIn: number;
  days: { id: string; name: string; label: string | null; expected: number; checkedIn: number }[];
  todayDayId: string | null;
};

export const useScanSummary = (event?: TScanEvent | null) =>
  useQuery({
    queryKey: ["scan-summary", event?.id],
    enabled: !!event,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data } = await getData<TScanSummary>(`/event/${event!.id}/scan/summary`, asWorkspace(event!.vendorId));
      return data?.data ?? null;
    }
  });

/** `typed`: staff typed the code in, so the answer asks them to check ID. */
export const scanTicket = async (event: TScanEvent, code: string, dayId?: string, typed = false) => {
  const { data } = await postData<{ code: string; dayId?: string; typed?: boolean }, TScanResult>(
    `/event/${event.id}/scan`,
    { code, ...(dayId ? { dayId } : {}), ...(typed ? { typed: true } : {}) },
    asWorkspace(event.vendorId)
  );
  return data?.data as TScanResult;
};

/** Letting someone in again whose ticket shows as used; the reason is recorded. */
export const readmitTicket = async (event: TScanEvent, code: string, reason: string, dayId?: string) => {
  const { data } = await postData<{ code: string; reason: string; dayId?: string }, TScanResult>(
    `/event/${event.id}/scan/readmit`,
    { code, reason, ...(dayId ? { dayId } : {}) },
    asWorkspace(event.vendorId)
  );
  return data?.data as TScanResult;
};

/* ------------------------------------------------------------ bigger screen */

/** "Email me the link": the page on the website, sent to their own email. */
export const emailMeLink = async (path: string, what: string) => {
  const { data } = await postData<{ path: string; what: string }, { sentTo: string; url: string }>(
    "/user/email-link",
    { path, what }
  );
  return data?.data ?? null;
};
