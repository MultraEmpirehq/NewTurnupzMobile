import { createMMKV } from "react-native-mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const storage = createMMKV({
  id: "search-store"
});

const zustandStorage = createJSONStorage(() => ({
  setItem: (name, value) => {
    return storage.set(name, value);
  },
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    return storage.remove(name);
  }
}));

type TSearchStoreState = {
  recentSearches: string[];
};

type TSearchStoreActions = {
  addToRecentList: (searchText: string) => void;
  removeFromRecentList: (searchText: string) => void;
};

const initialState: TSearchStoreState = {
  recentSearches: []
};

interface ISearchStore extends TSearchStoreState, TSearchStoreActions {}

const MAX_RECENT_SEARCHES = 10;

const stripRecentSearches = (recentSearches: string[]) => {
  return recentSearches.slice(0, MAX_RECENT_SEARCHES);
};

export const useSearchStore = create<ISearchStore>()(
  persist(
    (set) => ({
      ...initialState,
      addToRecentList: (searchText) =>
        set((state) => {
          const doSearchTextExist = state.recentSearches.includes(searchText);
          if (doSearchTextExist) {
            const newRecentSearches = state.recentSearches.filter(
              (item) => item !== searchText
            );
            return {
              recentSearches: stripRecentSearches([
                searchText,
                ...newRecentSearches
              ])
            };
          }
          return {
            recentSearches: stripRecentSearches([
              searchText,
              ...state.recentSearches
            ])
          };
        }),
      removeFromRecentList: (searchText) =>
        set((state) => {
          const newRecentSearches = state.recentSearches.filter(
            (item) => item !== searchText
          );
          return {
            recentSearches: stripRecentSearches(newRecentSearches)
          };
        })
    }),
    {
      name: "search-store",
      storage: zustandStorage,
      partialize: (state) => ({
        recentSearches: state.recentSearches
      })
    }
  )
);
