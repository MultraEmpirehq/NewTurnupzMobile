import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { getData, postData } from "@/api";
import { toggleFollow } from "@/screens/profile/profile-api";

/** Someone on Turnupz as others see them. */
export type TPersonCard = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  /** You follow them. */
  isFollowing: boolean;
  /** They follow you. */
  followsYou: boolean;
};

export type TPersonProfile = TPersonCard & {
  bio: string | null;
  /** Only when they've chosen to show it. */
  country: string | null;
  followers: number;
  following: number;
  /** You follow each other. */
  canMessage: boolean;
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

/** Follow or unfollow someone; refreshes every profile and list it touches. */
export const useFollowPerson = () => {
  const queryClient = useQueryClient();
  return async (personId: string) => {
    const isFollowing = await toggleFollow("PERSON", personId);
    void queryClient.invalidateQueries({ queryKey: ["person"] });
    void queryClient.invalidateQueries({ queryKey: ["person-connections"] });
    void queryClient.invalidateQueries({ queryKey: ["people-search"] });
    void queryClient.invalidateQueries({ queryKey: ["follows"] });
    return isFollowing;
  };
};

/** Opens (or finds) the chat with someone you follow each other with. */
export const startPersonChat = async (userId: string) =>
  (await postData<{ userId: string }, { id: string; isNew: boolean }>("/chats/person", { userId })).data!.data!;
