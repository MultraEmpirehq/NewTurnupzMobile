import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { getData, patchData } from "@/api";

/** What a notification is about; the filters group these. */
export type TNotificationCategory =
  | "EVENT_UPDATES"
  | "ORDER_UPDATES"
  | "TICKET_TRANSFERS"
  | "ACCOUNT"
  | "VENDOR_VERIFICATION"
  | "CREDIT";

export type TNotification = {
  id: string;
  title: string;
  content: string;
  category: TNotificationCategory;
  createdAt: string;
  isRead: boolean;
  href?: string;
  eventId?: string;
  /** e.g. { action: "accept_transfer", transferId } for a ticket sent to you. */
  data?: { action?: string; transferId?: string; postId?: string } & Record<string, unknown>;
};

/** The chips at the top of the list, and which kinds each one shows. */
export const NOTIFICATION_FILTERS = [
  { id: "all", label: "All", categories: null },
  { id: "tickets", label: "Tickets", categories: ["ORDER_UPDATES", "TICKET_TRANSFERS"] },
  { id: "events", label: "Events", categories: ["EVENT_UPDATES"] },
  { id: "credit", label: "Credit", categories: ["CREDIT"] },
  { id: "account", label: "Account", categories: ["ACCOUNT", "VENDOR_VERIFICATION"] }
] as const;
export type TNotificationFilter = (typeof NOTIFICATION_FILTERS)[number]["id"];

const PAGE_SIZE = 20;

export const useNotifications = (filter: TNotificationFilter, enabled = true) =>
  useInfiniteQuery({
    queryKey: ["notifications", filter],
    enabled,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const categories = NOTIFICATION_FILTERS.find((item) => item.id === filter)?.categories;
      const params = new URLSearchParams({ page: String(pageParam), limit: String(PAGE_SIZE) });
      if (categories) params.set("categories", categories.join(","));
      const { data } = await getData<TNotification[]>(`/notifications?${params.toString()}`);
      return { items: data?.data ?? [], pagination: data?.pagination };
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextPage ?? undefined
  });

/** For the dot on the notifications tab. */
export const useUnreadNotifications = (enabled = true) =>
  useQuery({
    queryKey: ["notifications", "unread-count"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () =>
      (await getData<{ count: number }>("/notifications/unread-count")).data?.data?.count ?? 0
  });

/** Marks some read on the server, and in every cached list straight away. */
export const useMarkRead = () => {
  const queryClient = useQueryClient();
  const markLocally = (ids: string[] | "all") => {
    queryClient.setQueriesData<{ pages: { items: TNotification[] }[] }>(
      { queryKey: ["notifications"] },
      (old) =>
        old?.pages
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  ids === "all" || ids.includes(item.id) ? { ...item, isRead: true } : item
                )
              }))
            }
          : old
    );
  };
  const refreshCount = () =>
    void queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });

  return {
    markRead: async (ids: string[]) => {
      if (!ids.length) return;
      markLocally(ids);
      await patchData("/notification", { notificationIds: ids }).catch(() => undefined);
      refreshCount();
    },
    markAllRead: async () => {
      markLocally("all");
      await patchData("/notifications/read-all", undefined).catch(() => undefined);
      refreshCount();
    }
  };
};
