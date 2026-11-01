/** Events are set in Lagos unless the organiser picked another zone. */
export const DEFAULT_EVENT_TIMEZONE = "Africa/Lagos";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type TWallClock = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
};

const viewerZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

/**
 * What a clock in `zone` shows at `instant`. Done by hand from the parts so the
 * output is the same on Android and iOS, whose Intl formatting differs. Falls back
 * to the phone's own clock if the zone isn't supported.
 */
const wallClock = (instant: Date, zone: string): TWallClock => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric"
    }).formatToParts(instant);
    const get = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value);
    const year = get("year");
    const month = get("month") - 1;
    const day = get("day");
    if ([year, month, day].some(Number.isNaN)) throw new Error("no parts");
    return {
      year,
      month,
      day,
      weekday: new Date(Date.UTC(year, month, day)).getUTCDay(),
      hour: get("hour") % 24,
      minute: get("minute")
    };
  } catch {
    return {
      year: instant.getFullYear(),
      month: instant.getMonth(),
      day: instant.getDate(),
      weekday: instant.getDay(),
      hour: instant.getHours(),
      minute: instant.getMinutes()
    };
  }
};

const zoneOf = (timezone?: string | null) => timezone || DEFAULT_EVENT_TIMEZONE;

/** "8:00 PM" on the venue's clock. */
export const formatEventClock = (
  value: Date | string,
  timezone?: string | null
) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const { hour, minute } = wallClock(date, zoneOf(timezone));
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
};

/** "Sat, 1 Nov 2026" on the venue's clock. */
export const formatEventDay = (
  value: Date | string,
  timezone?: string | null,
  { withYear = true }: { withYear?: boolean } = {}
) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const { year, month, day, weekday } = wallClock(date, zoneOf(timezone));
  return `${WEEKDAYS[weekday]}, ${day} ${MONTHS[month]}${withYear ? ` ${year}` : ""}`;
};

/** The card's date block, on the venue's clock: { month: "NOV", day: "01" }. */
export const formatEventDateBlock = (
  value: Date | string,
  timezone?: string | null
) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const { month, day } = wallClock(date, zoneOf(timezone));
  return {
    month: MONTHS[month].toUpperCase(),
    day: String(day).padStart(2, "0")
  };
};

/** "Sat, 1 Nov 2026, 8:00 PM". */
export const formatEventTime = (
  value: Date | string,
  timezone?: string | null
) => `${formatEventDay(value, timezone)}, ${formatEventClock(value, timezone)}`;

/**
 * For a phone whose clock differs from the venue's: "Lagos time · 8:00 PM your
 * time" (with the day when that differs too), so someone abroad knows when it
 * starts for them. Null when the phone shows the same time as the venue.
 */
export const eventZoneNote = (
  timezone?: string | null,
  at?: Date | string
) => {
  const zone = zoneOf(timezone);
  const mine = viewerZone();
  if (!mine || zone === mine) return null;
  const city = zone.split("/").pop()?.replace(/_/g, " ") ?? zone;
  const when = at ? new Date(at) : null;
  if (!when || Number.isNaN(when.getTime())) return `Times in ${city} time`;
  const there = wallClock(when, zone);
  const here = wallClock(when, mine);
  // Same clock under another name (Lagos and Douala): nothing to add.
  if (there.day === here.day && there.hour === here.hour && there.minute === here.minute) {
    return null;
  }
  const yours =
    there.day === here.day
      ? formatEventClock(when, mine)
      : `${WEEKDAYS[here.weekday]} ${here.day} ${MONTHS[here.month]}, ${formatEventClock(when, mine)}`;
  return `${city} time · ${yours} your time`;
};
