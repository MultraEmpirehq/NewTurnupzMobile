import { deleteData, getData, patchData, postData } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";
import useUserStore, { TUser } from "@/shared/stores/user.store";

/**
 * The signed-in person's own account: their details and photo, password,
 * notification settings, signed-in devices, who they follow, their wallet,
 * and the help pages. All of it is the api's; nothing here is made up.
 */

/** The person's details, kept in step with the user store. */
export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await getData<TUser>("/user");
      if (data?.data) useUserStore.getState().setUser(data.data);
      return data?.data ?? null;
    },
    initialData: () => useUserStore.getState().user ?? undefined,
    initialDataUpdatedAt: 0
  });

export type TProfileUpdate = Partial<
  Pick<
    TUser,
    "firstName" | "lastName" | "username" | "bio" | "website" | "phone" | "gender"
  > & { dateOfBirth: string }
>;

export const updateProfile = async (body: TProfileUpdate) => {
  const { data } = await patchData<TProfileUpdate, TUser>("/user", body);
  if (data?.data) useUserStore.getState().setUser(data.data);
  return data?.data;
};

/** Uploads a photo from the phone and makes it the profile picture. */
export const uploadProfilePhoto = async (photo: {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}) => {
  const type = photo.mimeType || "image/jpeg";
  const name = photo.fileName || `avatar.${type.split("/")[1] || "jpg"}`;
  const form = new FormData();
  if (Platform.OS === "web") {
    form.append("file", await (await fetch(photo.uri)).blob(), name);
  } else {
    form.append("file", { uri: photo.uri, name, type } as unknown as Blob);
  }
  form.append("purpose", "AVATAR");
  const upload = await postData<FormData, { id: string }>("/attachment", form, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  const attachmentId = upload.data?.data?.id;
  if (!attachmentId) throw new Error("Upload failed");
  const { data } = await postData<{ attachmentId: string }, TUser>(
    "/user/avatar",
    { attachmentId }
  );
  if (data?.data) useUserStore.getState().setUser(data.data);
  return data?.data;
};

export const changePassword = (body: { oldPassword: string; password: string }) =>
  patchData("/user/password", body);

/** Ends this session on the api (it leaves the devices list), then here. */
export const logOut = async () => {
  try {
    await postData("/user/logout");
  } catch {
    // Signed out on the phone regardless.
  }
};

/* ----------------------------------------------------------- notifications */

export type TNotificationPreferences = {
  push: boolean;
  eventUpdates: boolean;
  orderUpdates: boolean;
  ticketTransfers: boolean;
  email: boolean;
};

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data } = await getData<TNotificationPreferences>(
        "/user/notification-preferences"
      );
      return data?.data ?? null;
    }
  });

export const updateNotificationPreferences = async (
  body: Partial<TNotificationPreferences>
) => {
  const { data } = await patchData<
    Partial<TNotificationPreferences>,
    TNotificationPreferences
  >("/user/notification-preferences", body);
  return data?.data;
};

/* ----------------------------------------------------------------- devices */

export type TSession = {
  id: string;
  device: string;
  platform: "app" | "web" | string;
  ip: string;
  signedInAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

export const useSessions = () =>
  useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data } = await getData<TSession[]>("/user/sessions");
      return data?.data ?? [];
    }
  });

export const signOutDevice = (sessionId: string) =>
  deleteData(`/user/sessions/${sessionId}`);

export const signOutOtherDevices = async () => {
  const { data } = await deleteData<{ revoked: number }>("/user/sessions");
  return data?.data?.revoked ?? 0;
};

/* --------------------------------------------------------------- following */

export type TFollowTargetType = "PERFORMER" | "VENUE" | "PLANNER";

export type TFollowedItem = {
  targetType: TFollowTargetType;
  targetId: string;
  name: string;
  image: string | null;
  subtitle: string | null;
  upcomingEvents: number;
  followedAt: string;
};

export const useFollows = (enabled = true) =>
  useQuery({
    queryKey: ["follows"],
    queryFn: async () => {
      const { data } = await getData<TFollowedItem[]>("/follows");
      return data?.data ?? [];
    },
    enabled
  });

export const toggleFollow = async (
  targetType: TFollowTargetType,
  targetId: string
) => {
  const { data } = await postData<
    { targetType: TFollowTargetType; targetId: string },
    { isFollowing: boolean }
  >("/follows", { targetType, targetId });
  return !!data?.data?.isFollowing;
};

/* ------------------------------------------------------------ wallet, help */

export type TWallet = {
  balance: { formatted: { withCurrency: string } };
};

export const useWallet = () =>
  useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const { data } = await getData<TWallet>("/wallet");
      return data?.data ?? null;
    }
  });

export type TFaq = { id: string; question: string; answer: string };

export const useFaqs = () =>
  useQuery({
    queryKey: ["faqs"],
    queryFn: async () => {
      const { data } = await getData<TFaq[]>("/faqs?limit=50");
      return data?.data ?? [];
    },
    staleTime: 30 * 60 * 1000
  });

export const sendSupportMessage = (body: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}) => postData("/contact", body);

/** Turnupz Credit earned through invites, one row per currency. */
type TReferralEarnings = {
  currency: string;
  earned: { amount: number; formatted: { withCurrency: string } };
  pending: { amount: number; formatted: { withCurrency: string } };
};

export type TReferralMe = {
  /** Their invite code, which is their username. */
  code: string | null;
  /** They can still add who invited them (new enough, no purchase yet). */
  canAddCode: boolean;
  addCodeUntil: string | null;
  counts: { invited: number; pending: number; rewarded: number };
  earnings: TReferralEarnings[];
  referredBy: string | null;
};

/** Their invite code, who they've brought in and what it's earned. */
export const useReferralMe = () =>
  useQuery({
    queryKey: ["referrals", "me"],
    queryFn: async () =>
      (await getData<TReferralMe>("/referrals/me")).data?.data ?? null
  });

/** Adds the code of whoever invited them; returns that person's name. */
export const applyInviteCode = async (code: string) =>
  (
    await postData<{ code: string }, { invitedBy: string }>(
      "/referrals/apply",
      { code: code.trim() }
    )
  ).data?.data;
