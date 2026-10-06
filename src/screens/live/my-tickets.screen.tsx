import React, { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  View
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import ChevronLeftIcon from "@/shared/assets/icons/chevron-left.icon";
import { formatEventTime } from "@/shared/utils/event-time";
import { eventPlace, TLiveUserTicket, useLiveUserTickets } from "./live-api";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  UN_USED: { label: "Ready", className: "bg-emerald-50 text-emerald-700" },
  USED: { label: "Checked in", className: "bg-zinc-100 text-zinc-600" },
  EXPIRED: { label: "Expired", className: "bg-zinc-100 text-zinc-600" },
  CANCELLED: { label: "Cancelled", className: "bg-red-50 text-red-700" }
};

/** The tickets the signed-in person holds, each with its QR code for the door. */
const LiveMyTicketsScreen = ({ onBack }: { onBack: () => void }) => {
  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useLiveUserTickets();
  const [openTicket, setOpenTicket] = useState<TLiveUserTicket | null>(null);
  const tickets = useMemo(() => data?.pages.flatMap((page) => page.tickets) ?? [], [data]);

  return (
    <View className="flex-1 bg-zinc-50">
      <View className="flex-row items-center border-b border-zinc-100 px-4 py-2">
        <Pressable onPress={onBack} className="size-8 items-center justify-center">
          <ChevronLeftIcon size={18} color="#52525b" />
        </Pressable>
        <TextComponent className="flex-1 text-center font-bold text-zinc-950">
          My Tickets
        </TextComponent>
        <View className="size-8" />
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-10" color="#00B2FF" />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(ticket) => ticket.id}
          contentContainerClassName="gap-3 p-4 pb-10"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
          onEndReached={() => hasNextPage && !isFetchingNextPage && void fetchNextPage()}
          ListEmptyComponent={
            <View className="mt-16 items-center gap-2 px-6">
              <TextComponent className="text-center text-lg font-bold text-zinc-950">
                {error ? "We couldn't load your tickets" : "No tickets yet"}
              </TextComponent>
              <TextComponent className="text-center text-sm text-zinc-500">
                {error
                  ? "Pull down to try again."
                  : "Tickets you buy or register for will show up here."}
              </TextComponent>
            </View>
          }
          renderItem={({ item }) => {
            const event = item.ticket?.event;
            const status = STATUS_LABELS[item.status ?? "UN_USED"] ?? STATUS_LABELS.UN_USED;
            return (
              <Pressable
                onPress={() => setOpenTicket(item)}
                className="flex-row overflow-hidden rounded-xl bg-white shadow-sm"
              >
                {!!event?.image && (
                  <CustomImage
                    className="w-24"
                    imageClassName="size-full"
                    source={{ uri: event.image }}
                    contentFit="cover"
                  />
                )}
                <View className="flex-1 gap-1 p-3">
                  <TextComponent numberOfLines={1} className="font-bold text-zinc-950">
                    {event?.name ?? "Event"}
                  </TextComponent>
                  {!!event?.date && (
                    <TextComponent className="text-xs text-zinc-600">
                      {formatEventTime(event.date, event.timezone)}
                    </TextComponent>
                  )}
                  <TextComponent numberOfLines={1} className="text-xs text-zinc-500">
                    {eventPlace(event)}
                  </TextComponent>
                  <View className="mt-1 flex-row items-center justify-between">
                    <TextComponent className="text-xs font-semibold text-primary">
                      {item.ticket?.name ?? "Ticket"}
                    </TextComponent>
                    <View className={`rounded-full px-2 py-0.5 ${status.className.split(" ")[0]}`}>
                      <TextComponent className={`text-[10px] font-bold ${status.className.split(" ")[1]}`}>
                        {status.label}
                      </TextComponent>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Modal
        visible={!!openTicket}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenTicket(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 px-8"
          onPress={() => setOpenTicket(null)}
        >
          {!!openTicket && (
            <View className="w-full items-center rounded-3xl bg-white p-6">
              <TextComponent className="text-center text-lg font-bold text-zinc-950">
                {openTicket.ticket?.event?.name ?? "Your ticket"}
              </TextComponent>
              <TextComponent className="mt-1 text-center text-sm text-primary">
                {openTicket.ticket?.name}
              </TextComponent>
              <View className="mt-5 rounded-2xl bg-white p-3">
                <QRCode
                  value={openTicket.qrCodeValue || openTicket.code || openTicket.id}
                  size={220}
                />
              </View>
              <TextComponent className="mt-3 text-xs font-semibold tracking-widest text-zinc-500">
                {(openTicket.code || openTicket.id).toUpperCase()}
              </TextComponent>
              <TextComponent className="mt-4 text-center text-xs text-zinc-500">
                Show this at the door. Turn your screen brightness up if it won't scan.
              </TextComponent>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
};

export default memo(LiveMyTicketsScreen);
