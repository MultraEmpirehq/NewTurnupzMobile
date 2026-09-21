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

export const getEventPublicUrl = (eventId: string) =>
  `https://turnupz.com/events/${encodeURIComponent(eventId)}`;

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

export const submitEventReport = async (_payload: TEventReportPayload) => {
  // Frontend boundary for the report endpoint. Replace this resolved promise
  // with the existing API client call when the backend endpoint is available.
  await Promise.resolve();
};
