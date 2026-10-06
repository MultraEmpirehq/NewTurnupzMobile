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

// The web's event page; "/events/:id" doesn't exist there.
export const getEventPublicUrl = (eventId: string) =>
  `https://turnupz.com/explore/event/${encodeURIComponent(eventId)}`;

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
