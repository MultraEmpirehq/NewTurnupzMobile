import { create } from "zustand";

/** A chat to open as soon as Messages is showing (e.g. from a notification). */
type TOpenChatStore = {
  pendingChatId: string | null;
  openChatWhenReady: (chatId: string | null) => void;
};

export const useOpenChatStore = create<TOpenChatStore>()((set) => ({
  pendingChatId: null,
  openChatWhenReady: (chatId) => set({ pendingChatId: chatId })
}));
