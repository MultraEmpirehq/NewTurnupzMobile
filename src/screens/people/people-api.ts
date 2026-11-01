import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData } from "@/api";
import { toggleFollow } from "@/screens/profile/profile-api";

/** Someone on Turnupz as others see them. */
export type TPersonCard = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  /** You follow them. */
  isFollowing: boolean;
  /** You've asked to follow them (they're private) and they haven't answered. */
  requested?: boolean;
  /** They follow you. */
  followsYou: boolean;
};

export type TPersonProfile = TPersonCard & {
  bio: string | null;
  /** Only when they've chosen to show it. */
  country: string | null;
  followers: number;
  following: number;
  /** Only approved followers see their followers and following. */
  isPrivate?: boolean;
  /** Private and you're not an approved follower: their lists are hidden. */
  locked?: boolean;
  /** You've blocked them. */
  blockedByMe?: boolean;
  /** Their message setting lets you write to them. */
  canMessage: boolean;
  /** Your first message would wait in their message requests. */
  messageIsRequest?: boolean;
  isMe: boolean;
};

export const usePerson = (username?: string | null) =>
  useQuery({
    queryKey: ["person", username?.toLowerCase()],
    enabled: !!username,
    queryFn: async () => (await getData<TPersonProfile>(`/people/${encodeURIComponent(username!)}`)).data?.data ?? null
  });

export const usePeopleSearch = (q: string) =>
  useQuery({
    queryKey: ["people-search", q.trim().toLowerCase()],
    enabled: q.trim().replace(/^@/, "").length >= 2,
    queryFn: async () =>
      (await getData<TPersonCard[]>(`/people/search?q=${encodeURIComponent(q.trim())}`)).data?.data ?? []
  });

export const useConnections = (username: string | null | undefined, which: "followers" | "following") =>
  useInfiniteQuery({
    queryKey: ["person-connections", username?.toLowerCase(), which],
    enabled: !!username,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await getData<TPersonCard[]>(
        `/people/${encodeURIComponent(username!)}/${which}?page=${pageParam}`
      );
      return { items: data?.data ?? [], pagination: data?.pagination };
    },
    getNextPageParam: (last) => last.pagination?.nextPage ?? undefined
  });

/** Everything that shows who follows or blocks whom, refreshed together. */
const useRefreshPeople = () => {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ["person", "person-connections", "people-search", "follows", "follow-requests", "blocks", "privacy", "live-chats"]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
};

/** Follow or unfollow someone (or ask to, if they're private, or take the request back). */
export const useFollowPerson = () => {
  const refresh = useRefreshPeople();
  return async (personId: string) => {
    const isFollowing = await toggleFollow("PERSON", personId);
    refresh();
    return isFollowing;
  };
};

/* ------------------------------------------------------------------ privacy */

export type TMessagePolicy = "EVERYONE" | "MUTUALS" | "NOBODY";
export type TPrivacy = { isPrivate: boolean; messagePolicy: TMessagePolicy; blockedCount: number };

export const usePrivacy = () =>
  useQuery({
    queryKey: ["privacy"],
    queryFn: async () => (await getData<TPrivacy>("/privacy")).data?.data ?? null
  });

/** Changes privacy settings, showing the change straight away. */
export const useUpdatePrivacy = () => {
  const queryClient = useQueryClient();
  return async (change: Partial<Pick<TPrivacy, "isPrivate" | "messagePolicy">>) => {
    const before = queryClient.getQueryData<TPrivacy>(["privacy"]);
    if (before) queryClient.setQueryData(["privacy"], { ...before, ...change });
    try {
      const saved = (await patchData<typeof change, TPrivacy>("/privacy", change)).data?.data;
      if (saved) queryClient.setQueryData(["privacy"], saved);
      void queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
    } catch (error) {
      queryClient.setQueryData(["privacy"], before);
      throw error;
    }
  };
};

export type TBlockedPerson = { id: string; name: string; username: string | null; image: string | null; blockedAt: string };

export const useBlocks = () =>
  useQuery({
    queryKey: ["blocks"],
    queryFn: async () => (await getData<TBlockedPerson[]>("/privacy/blocks")).data?.data ?? []
  });

/** Block or unblock someone; refreshes everything that shows them. */
export const useBlockPerson = () => {
  const refresh = useRefreshPeople();
  return async (userId: string, block: boolean) => {
    if (block) await postData(`/privacy/blocks/${userId}`, {});
    else await deleteData(`/privacy/blocks/${userId}`);
    refresh();
  };
};

export type TFollowRequest = { id: string; name: string; username: string | null; image: string | null; requestedAt: string };

export const useFollowRequests = (enabled = true) =>
  useQuery({
    queryKey: ["follow-requests"],
    enabled,
    queryFn: async () => (await getData<TFollowRequest[]>("/follows/requests")).data?.data ?? []
  });

export const useAnswerFollowRequest = () => {
  const refresh = useRefreshPeople();
  return async (userId: string, accept: boolean) => {
    await postData(`/follows/requests/${userId}/${accept ? "accept" : "decline"}`, {});
    refresh();
  };
};

/** Opens (or finds) the chat with someone you follow each other with. */
export const startPersonChat = async (userId: string) =>
  (await postData<{ userId: string }, { id: string; isNew: boolean }>("/chats/person", { userId })).data!.data!;
