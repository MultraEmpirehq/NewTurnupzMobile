import { formatEventTime } from "./event-time";

type TSaleWindow = {
  salesStartAt?: string | null;
  salesEndAt?: string | null;
};

export type TTicketSaleState =
  | { status: "open" }
  | { status: "upcoming"; opensAt: Date }
  | { status: "ended" };

/** Whether a ticket can be bought right now, by its sales window. Same rule as the web and API. */
export const ticketSaleState = (
  ticket?: TSaleWindow | null,
  now: Date = new Date()
): TTicketSaleState => {
  if (ticket?.salesStartAt && new Date(ticket.salesStartAt) > now) {
    return { status: "upcoming", opensAt: new Date(ticket.salesStartAt) };
  }
  if (ticket?.salesEndAt && new Date(ticket.salesEndAt) <= now) {
    return { status: "ended" };
  }
  return { status: "open" };
};

/** "Sales open Sat, 1 Nov 2026, 10:00 AM" or "Sales have closed"; null while on sale. */
export const describeTicketSaleState = (
  state: TTicketSaleState,
  timezone?: string | null
) => {
  if (state.status === "upcoming") {
    return `Sales open ${formatEventTime(state.opensAt, timezone)}`;
  }
  if (state.status === "ended") return "Sales have closed";
  return null;
};
