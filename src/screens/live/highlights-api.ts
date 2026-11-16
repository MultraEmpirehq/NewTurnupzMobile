import { Platform } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useUserStore from "@/shared/stores/user.store";
import { getData, postData } from "@/api";

/** Mirrors the api's limits (highlights.rules.ts). */
export const HIGHLIGHT_LIMITS = { perAttendee: 10, clipSeconds: 30, fileMb: 10 } as const;

export type THighlight = {
  id: string;
  url: string;
  type: "image" | "video";
  caption: string | null;
  /** "@amaka.o", or "Someone who was there"; null for the organiser's own. */
  by: string | null;
  durationSeconds: number | null;
  isCover: boolean;
  fromOrganiser: boolean;
};

export type TEventHighlights = {
  over: boolean;
  recap: string | null;
  /** "800+", when the organiser shows it. */
  attendance: string | null;
  crowdOpen: boolean;
  organiser: THighlight[];
  crowd: THighlight[];
  me: { holdsTicket: boolean; canAdd: boolean; remaining: number; pending: number } | null;
};

const key = (eventId: string) => ["event-highlights", eventId];

/** An ended event's highlights; signed in, also what you can add. */
export const useEventHighlights = (eventId: string | undefined, enabled: boolean) => {
  const signedIn = !!useUserStore((state) => state.userToken);
  return useQuery({
    queryKey: [...key(eventId ?? ""), signedIn],
    queryFn: async () => {
      const { data } = await getData<TEventHighlights>(`/event/${eventId}/highlights`);
      return data?.data ?? null;
    },
    enabled: !!eventId && enabled,
    // An older api without highlights just shows nothing.
    retry: false
  });
};

export const useRefreshHighlights = (eventId: string) => {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: key(eventId) });
};

/** A photo or clip picked from the library. */
export type TPickedMedia = {
  uri: string;
  type: "image" | "video";
  mimeType?: string | null;
  fileName?: string | null;
  /** Clips only, in milliseconds (as the picker gives it). */
  durationMs?: number | null;
  fileSize?: number | null;
};

const uploadOne = async (item: TPickedMedia) => {
  const type = item.mimeType || (item.type === "video" ? "video/mp4" : "image/jpeg");
  const name = item.fileName || `highlight.${type.split("/")[1] || "jpg"}`;
  const form = new FormData();
  if (Platform.OS === "web") {
    form.append("file", await (await fetch(item.uri)).blob(), name);
  } else {
    form.append("file", { uri: item.uri, name, type } as unknown as Blob);
  }
  form.append("purpose", "EVENT_MEDIA");
  const { data } = await postData<FormData, { id: string }>("/attachment", form, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  const id = data?.data?.id;
  if (!id) throw new Error("Upload failed");
  return id;
};

/** Why a picked file can't be sent, or null when it can. */
export const pickedProblem = (item: TPickedMedia) => {
  if (item.fileSize && item.fileSize > HIGHLIGHT_LIMITS.fileMb * 1024 * 1024) {
    return `Files can be up to ${HIGHLIGHT_LIMITS.fileMb} MB.`;
  }
  if (item.type === "video" && (item.durationMs ?? 0) / 1000 > HIGHLIGHT_LIMITS.clipSeconds + 0.5) {
    return `Clips can be up to ${HIGHLIGHT_LIMITS.clipSeconds} seconds.`;
  }
  return null;
};

/** Uploads the picks and sends them to the organiser for approval. */
export const sendCrowdPhotos = async (
  eventId: string,
  body: { items: TPickedMedia[]; caption: string; showName: boolean }
) => {
  const items = [];
  for (const item of body.items) {
    const attachmentId = await uploadOne(item);
    items.push({
      attachmentId,
      ...(item.type === "video"
        ? { durationSeconds: Math.max(1, Math.min(HIGHLIGHT_LIMITS.clipSeconds, Math.round((item.durationMs ?? 1000) / 1000))) }
        : {})
    });
  }
  return postData(`/event/${eventId}/highlights/crowd`, {
    items,
    caption: body.caption.trim() || undefined,
    showName: body.showName,
    consent: true
  });
};

export const reportHighlight = (eventId: string, highlightId: string) =>
  postData(`/event/${eventId}/highlights/${highlightId}/report`, {});
