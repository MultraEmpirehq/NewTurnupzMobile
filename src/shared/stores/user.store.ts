import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createMMKV } from "react-native-mmkv";
import { USER_AUTH_STORAGE_ID, USER_AUTH_STORAGE_KEY } from "@env";
import { DEFAULT_STORAGE_ENCRYPTION_KEY } from "../utils/constant";

const storage = createMMKV({
  id: USER_AUTH_STORAGE_ID,
  encryptionKey: USER_AUTH_STORAGE_KEY || DEFAULT_STORAGE_ENCRYPTION_KEY
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

export enum UserGender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER"
}

export type TUser = {
  email?: string;
  id: string;
  name?: string;
  firstName?: string;
  username?: string;
  lastName?: string;
  mobileNumber?: string;
  isMobileNumberVerified?: boolean;
  isEmailVerified?: boolean;
  role?: "";
  createdAt?: Date;
  gender?: UserGender;
  dateOfBirth?: Date;
};

type TUserStoreState = {
  user: TUser | null;
  fetchingUserDetailsError: string | null;
  userToken: string | null;
  userNotVerifiedDetails: TUser | null;
};

type TUserStoreActions = {
  setUser: (user: TUser) => void;
  setFetchingUserDetailsError: (
    fetchingUserDetailsError: string | null
  ) => void;
  setUserToken: (userToken: string) => void;
  clearUserStore: () => void;
  setUserNotVerifiedDetails: (userNotVerifiedDetails: TUser) => void;
};

const initialState: TUserStoreState = {
  user: null,
  fetchingUserDetailsError: null,
  userToken: null,
  userNotVerifiedDetails: null
};

interface IUserStore extends TUserStoreState, TUserStoreActions {}

const useUserStore = create<IUserStore>()(
  persist(
    (set) => ({
      ...initialState,
      setUser: (user) => set({ user }),
      setFetchingUserDetailsError: (fetchingUserDetailsError) =>
        set({ fetchingUserDetailsError }),
      setUserToken: (userToken) => set({ userToken }),
      clearUserStore: () => set(initialState),
      setUserNotVerifiedDetails: (userNotVerifiedDetails) =>
        set({ userNotVerifiedDetails })
    }),
    {
      name: "user-store",
      storage: zustandStorage,
      partialize: (state) => ({
        user: state?.user,
        userToken: state?.userToken
      }),
      onRehydrateStorage: () => (state) => {}
    }
  )
);

export default useUserStore;
