import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteData, getData, patchData, postData } from "@/api";

/** Mirrors the backend's post shape (posts.service.ts). */
export type TPost = {
  id: string;
  caption: string | null;
  createdAt: string;
  author: { id: string; name: string; username: string | null; image: string | null };
  event: { id: string; name: string } | null;
  showName: boolean;
  media: { id: string; url: string; type: "image" | "video"; durationSeconds: number | null }[];
  mine: boolean;
  /** The author and admins only: taken down, and why. */
  removed: { at: string; reason: string | null; byTeam: boolean } | null;
  /** The author's own: the organiser took it off the event page. */
  hiddenFromEvent?: boolean;
  likes: number;
  comments: number;
  likedByMe: boolean;
  /** People tagged in it. */
  tags: { id: string; name: string; username: string | null }[];
  /** You're tagged in it: whether you hid it from your Tagged tab. */
  myTag: { hidden: boolean } | null;
};

type TPostsPage = { locked: boolean; total: number; items: TPost[]; nextCursor: string | null };

const key = (username?: string | null, which: "posts" | "tagged" = "posts") =>
  which === "posts" ? ["posts", "user", username] : ["posts", "user", username, "tagged"];

/** Someone's posts, newest first (locked when their profile is private to you). */
export const useProfilePosts = (username?: string | null, which: "posts" | "tagged" = "posts") =>
  useInfiniteQuery({
    queryKey: key(username, which),
    enabled: !!username,
    initialPageParam: "",
    queryFn: async ({ pageParam }) => {
      const { data } = await getData<TPostsPage>(
        `/posts/user/${encodeURIComponent(username!)}${which === "tagged" ? "/tagged" : ""}${pageParam ? `?cursor=${pageParam}` : ""}`
      );
      return data?.data ?? { locked: false, total: 0, items: [], nextCursor: null };
    },
    getNextPageParam: (last) => last.nextCursor || undefined,
    // An older api without posts just shows none.
    retry: false
  });

export const useRefreshPosts = (username?: string | null) => {
  const queryClient = useQueryClient();
  // The person's posts and Tagged lists (and the feed, which shows the same posts).
  return () => void queryClient.invalidateQueries({ queryKey: ["posts"] });
};

export const deletePost = (id: string) => deleteData(`/posts/${id}`);



export type TComment = {
  id: string;
  parentId: string | null;
  /** null once removed. */
  body: string | null;
  removed: boolean;
  createdAt: string;
  author: { id: string; name: string; username: string | null; image: string | null };
  mine: boolean;
  byPostAuthor: boolean;
  canRemove: boolean;
};

export const togglePostLike = async (id: string) =>
  (await postData<object, { liked: boolean; likes: number }>(`/posts/${id}/like`, {})).data?.data;

/** A post's comments, oldest first; replies carry what they answer. */
export const usePostComments = (postId: string | null) =>
  useInfiniteQuery({
    queryKey: ["posts", postId, "comments"],
    enabled: !!postId,
    initialPageParam: "",
    queryFn: async ({ pageParam }) => {
      const { data } = await getData<{ items: TComment[]; nextCursor: string | null }>(
        `/posts/${postId}/comments${pageParam ? `?cursor=${pageParam}` : ""}`
      );
      return data?.data ?? { items: [], nextCursor: null };
    },
    getNextPageParam: (last) => last.nextCursor || undefined
  });

export const addPostComment = async (postId: string, body: string, parentId?: string) =>
  (await postData<object, TComment>(`/posts/${postId}/comments`, { body, ...(parentId ? { parentId } : {}) })).data?.data;

export const removePostComment = (commentId: string) => deleteData(`/posts/comments/${commentId}`);

/** Take yourself off a post you're tagged in. */
export const removeMyTag = (postId: string) => deleteData(`/posts/${postId}/tags/me`);

/** Keep a post you're tagged in off your Tagged tab, or show it again. */
export const setMyTagHidden = (postId: string, hidden: boolean) => patchData(`/posts/${postId}/tags/me`, { hidden });

/** "with Ada", "with Ada and Chidi", "with Ada and 2 others". */
export const taggedLine = (tags: TPost["tags"]) =>
  !tags.length
    ? ""
    : tags.length === 1
      ? `with ${tags[0].name}`
      : tags.length === 2
        ? `with ${tags[0].name} and ${tags[1].name}`
        : `with ${tags[0].name} and ${tags.length - 1} others`;

/** A circle at the top of Home: someone (or you) who posted lately. */
export type TCircle = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  /** Posts in the last week. */
  posts: number;
  latestAt: string | null;
  /** Posted in the last day: a blue ring. */
  fresh: boolean;
};

/** You, then the people you follow who posted in the last week, most recent first. */
export const usePostCircles = (enabled: boolean) =>
  useQuery({
    queryKey: ["posts", "circles"],
    enabled,
    queryFn: async () => {
      const { data } = await getData<{ me: TCircle | null; people: TCircle[] }>("/posts/circles");
      return data?.data ?? { me: null, people: [] };
    },
    // An older api without circles just shows none.
    retry: false
  });
