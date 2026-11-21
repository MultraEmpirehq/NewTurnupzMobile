import { deleteData, getData, patchData, postData } from "@/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WEB_APP_URL } from "@env";

/** Friends' group chats (not tied to an event). Messages use the usual chat calls. */
export type TGroupMember = {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  bio: string | null;
  isAdmin: boolean;
  isOwner: boolean;
};

export type TGroupInfo = {
  id: string;
  name: string;
  image: string | null;
  memberCount: number;
  closed: boolean;
  me: { isAdmin: boolean; isOwner: boolean; muted: boolean };
  /** Admins only: the invite link's token (null: no link). */
  inviteToken?: string | null;
  members: TGroupMember[];
  media: { id: string; url: string; name: string | null; kind?: string }[];
};

export const groupKey = (id?: string | null) => ["group-chat", id];

/** The link people open to join; the website turns it into a join. */
export const groupInviteUrl = (token: string) => `${(WEB_APP_URL || "https://turnupz.app").replace(/\/$/, "")}/groups/join/${token}`;

export const useGroupInfo = (id?: string | null) =>
  useQuery({
    queryKey: groupKey(id),
    enabled: !!id,
    queryFn: async () => (await getData<TGroupInfo>(`/chats/groups/${id}`)).data?.data ?? null
  });

/** After any change: the group, and the chat list (name, picture, members). */
export const useRefreshGroup = (id?: string | null) => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: groupKey(id) });
    void queryClient.invalidateQueries({ queryKey: ["live-chats"] });
  };
};

export const createGroup = async (body: { name: string; memberIds: string[] }) =>
  (await postData<typeof body, { id: string; added: number; skipped: number }>("/chats/groups", body)).data?.data;

export const groupActions = (id: string) => ({
  rename: (name: string) => patchData(`/chats/groups/${id}`, { name }),
  addMembers: async (userIds: string[]) =>
    (await postData<{ userIds: string[] }, { added: number; skipped: number }>(`/chats/groups/${id}/members`, { userIds })).data?.data,
  remove: (userId: string) => deleteData(`/chats/groups/${id}/members/${userId}`),
  setAdmin: (userId: string, isAdmin: boolean) => patchData(`/chats/groups/${id}/members/${userId}`, { isAdmin }),
  leave: () => postData(`/chats/groups/${id}/leave`, undefined),
  makeInvite: async () => (await postData<undefined, { inviteToken: string }>(`/chats/groups/${id}/invite`, undefined)).data?.data,
  revokeInvite: () => deleteData(`/chats/groups/${id}/invite`),
  report: (reason: string) => postData(`/chats/groups/${id}/report`, { reason }),
  mute: (muted: boolean) => patchData(`/chats/${id}/mute`, { muted })
});
