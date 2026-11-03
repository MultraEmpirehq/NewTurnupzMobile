import { WEB_APP_URL } from "@env";
import useUserStore from "@/shared/stores/user.store";
import { reportEvent } from "@/screens/live/live-api";

export type TEventReportPayload = {
  eventId: string;
  reason: string;
  comment?: string;
  submittedAt: string;
};

export type TOrganizerConversationDraft = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  avatar: string;
  kind: "private";
};

// The web's event page; "/events/:id" doesn't exist there. It carries the
// sharer's username, so a purchase through it earns them share-link credit.
export const getEventPublicUrl = (eventId: string) => {
  const base = `${(WEB_APP_URL ?? "https://turnupz.app").replace(/\/$/, "")}/explore/event/${encodeURIComponent(eventId)}`;
  const username = useUserStore.getState().user?.username;
  return username ? `${base}?ref=${encodeURIComponent(username)}` : base;
};

export const createOrganizerConversationDraft = ({
  eventId,
  eventName,
  organizerName,
  eventImage
}: {
  eventId: string;
  eventName: string;
  organizerName: string;
  eventImage: string;
}): TOrganizerConversationDraft => ({
  id: `organizer-${eventId}`,
  title: organizerName,
  subtitle: `Event organizer · ${eventName}`,
  time: "Now",
  avatar: eventImage,
  kind: "private"
});

/**
 * The feed menu offers more specific reasons than the API keeps, so each maps to
 * the closest API reason and its own wording goes in the details for moderators.
 */
const REASON_TO_API: Record<string, string> = {
  "Spam or misleading content": "misleading",
  "Scam or suspected fraud": "scam",
  "Inappropriate content": "inappropriate",
  "False event information": "misleading",
  "Duplicate event": "duplicate",
  "Safety concern": "other",
  "Harassment or discrimination": "inappropriate",
  "Event does not exist": "scam",
  Other: "other"
};

export const submitEventReport = async (payload: TEventReportPayload) => {
  const reason = REASON_TO_API[payload.reason] ?? "other";
  const details = [payload.reason !== "Other" ? payload.reason : null, payload.comment]
    .filter(Boolean)
    .join(": ")
    .slice(0, 1000);
  await reportEvent(payload.eventId, {
    reason,
    details: details || undefined
  });
};
