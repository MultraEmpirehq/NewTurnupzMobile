import { create } from "zustand";

/**
 * Where the people stack is: someone's profile, who follows them, search, or
 * the follow requests waiting for you.
 * Any screen can open it; the stack itself lives in people-modal.
 */
export type TPeoplePage =
  | { kind: "person"; username: string }
  | { kind: "connections"; username: string; which: "followers" | "following" }
  | { kind: "search" }
  | { kind: "requests" };

type TPeopleNav = {
  stack: TPeoplePage[];
  openPerson: (username: string) => void;
  openConnections: (username: string, which: "followers" | "following") => void;
  openSearch: () => void;
  openFollowRequests: () => void;
  back: () => void;
  close: () => void;
};

export const usePeopleNav = create<TPeopleNav>((set) => ({
  stack: [],
  openPerson: (username) => set((state) => ({ stack: [...state.stack, { kind: "person", username }] })),
  openConnections: (username, which) =>
    set((state) => ({ stack: [...state.stack, { kind: "connections", username, which }] })),
  openSearch: () => set((state) => ({ stack: [...state.stack, { kind: "search" }] })),
  openFollowRequests: () => set((state) => ({ stack: [...state.stack, { kind: "requests" }] })),
  back: () => set((state) => ({ stack: state.stack.slice(0, -1) })),
  close: () => set({ stack: [] })
}));
