import { create } from "zustand";

type TSearchStoreState = {
  searchText: string;
};

type TSearchStoreActions = {
  setSearchText: (searchText: string) => void;
};

export const useSearchStore = create<TSearchStoreState & TSearchStoreActions>(
  (set) => ({
    searchText: "",
    setSearchText: (searchText) => set({ searchText })
  })
);
