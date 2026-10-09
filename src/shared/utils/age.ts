import { format, subYears } from "date-fns";

/** Turnupz accounts are for adults only. */
export const MINIMUM_AGE = 18;

/** The latest birthday that is old enough today. */
export const latestAdultBirthDate = (today = new Date()) => {
  const date = subYears(today, MINIMUM_AGE);
  date.setHours(23, 59, 59, 999);
  return date;
};

/** The same day as the calendar's "YYYY-MM-DD" strings. */
export const toCalendarDay = (date: Date) => format(date, "yyyy-MM-dd");

export const isAdultBirthDate = (date: Date) => date <= latestAdultBirthDate();

export const adultAgeMessage = `You must be at least ${MINIMUM_AGE} to use Turnupz`;
