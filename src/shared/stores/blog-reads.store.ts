import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";

/**
 * Which event blog posts you've opened (for the NEW badge), and a post to open
 * once its event page is showing (from a notification). Kept on this phone.
 */
type TBlogReadsStore = {
  readPostIds: string[];
  markRead: (postId: string) => void;
  /** Set by "posted a blog" notifications; the event page opens it, then clears it. */
  pendingPostId: string | null;
  openPostWhenReady: (postId: string | null) => void;
};

const storage = createMMKV({ id: "turnup-blog-reads" });

export const useBlogReadsStore = create<TBlogReadsStore>()(
  persist(
    (set) => ({
      readPostIds: [],
      markRead: (postId) =>
        set((state) =>
          state.readPostIds.includes(postId)
            ? state
            : { readPostIds: [postId, ...state.readPostIds].slice(0, 500) }
        ),
      pendingPostId: null,
      openPostWhenReady: (postId) => set({ pendingPostId: postId })
    }),
    {
      name: "blog-reads",
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.remove(key)
      })),
      partialize: ({ readPostIds }) => ({ readPostIds })
    }
  )
);
