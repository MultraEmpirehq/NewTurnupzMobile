import type { TLiveEvent, TLiveEventDay } from "@/screens/live/live-api";
import { formatEventDay } from "./event-time";

/** Runs over more than one day. */
export const isMultiDay = (event?: Pick<TLiveEvent, "days"> | null) =>
  (event?.days?.length ?? 0) > 1;

/** A day as people say it: its name, else "Sat, 24 Oct". */
export const eventDayName = (
  day: Pick<TLiveEventDay, "startsAt" | "label">,
  timezone?: string | null
) => day.label || formatEventDay(day.startsAt, timezone, { withYear: false });

/** When the event is over: the last day's end (or start), else its start. */
export const eventEndsAt = (event: Pick<TLiveEvent, "date" | "endDate">) =>
  new Date(event.endDate ?? event.date);

/** "Fri, 23 Oct – Sun, 25 Oct" for a multi-day event. */
export const eventDateRange = (
  event: Pick<TLiveEvent, "date" | "endDate" | "timezone">
) =>
  `${formatEventDay(event.date, event.timezone, { withYear: false })} – ${formatEventDay(
    event.endDate ?? event.date,
    event.timezone,
    { withYear: false }
  )}`;

/** The event's days a ticket admits on; a ticket with none listed is for every day. */
export const ticketDays = (
  dayIds: string[] | undefined,
  event?: Pick<TLiveEvent, "days"> | null
) => {
  const days = event?.days ?? [];
  return dayIds?.length ? days.filter((day) => dayIds.includes(day.id)) : days;
};

/** "Every day" or "Sat, 24 Oct" / "Opening night, Sat, 24 Oct", for a ticket. */
export const ticketDaysLabel = (
  dayIds: string[] | undefined,
  event?: Pick<TLiveEvent, "days" | "timezone"> | null
) => {
  if (!isMultiDay(event)) return null;
  const covered = ticketDays(dayIds, event);
  if (covered.length === (event?.days?.length ?? 0)) {
    return `Every day · ${covered.length} days`;
  }
  return covered.map((day) => eventDayName(day, event?.timezone)).join(" · ");
};
