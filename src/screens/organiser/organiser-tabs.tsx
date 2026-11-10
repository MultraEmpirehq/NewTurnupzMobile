import React, { memo, useMemo } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import CustomImage from "@/shared/components/images/custom-image/custom-image.component";
import TextComponent from "@/shared/components/text/text.component";
import { formatEventClock, formatEventDay } from "@/shared/utils/event-time";
import { BRAND } from "@/shared/utils/brand-colors";
import { TInsights, TInsightsEvent, TScanEvent } from "./organiser-api";
import { TWebOnlyTask } from "./web-only.sheet";

const BG = "#F7F8FB";

const sectionLabel = (text: string) => (
  <TextComponent className="mx-4 mb-2 mt-5 text-[11px] font-extrabold tracking-widest text-zinc-400">{text}</TextComponent>
);

/** "1,280 of 2,300 sold", or "1,280 sold" with no cap. */
const soldLine = (event: TInsightsEvent) =>
  event.capacity ? `${event.sold.toLocaleString()} of ${event.capacity.toLocaleString()} sold` : `${event.sold.toLocaleString()} sold`;

const SoldBar = ({ event }: { event: TInsightsEvent }) =>
  event.capacity ? (
    <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
      <View className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (event.sold / event.capacity) * 100)}%`, backgroundColor: BRAND.blue }} />
    </View>
  ) : null;

const WebRow = ({ title, body, onPress }: { title: string; body: string; onPress: () => void }) => (
  <Pressable onPress={onPress} accessibilityRole="button" className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl bg-white p-3.5">
    <View className="flex-1">
      <TextComponent className="text-sm font-bold text-zinc-950">{title}</TextComponent>
      <TextComponent className="text-xs text-zinc-500">{body}</TextComponent>
    </View>
    <TextComponent className="text-base text-zinc-400">↗</TextComponent>
  </Pressable>
);

/* ------------------------------------------------------------------ Today */

/**
 * The organiser's day at a glance: what sold, tonight's events with a way to
 * the door, and what's coming up. Setup work is a tap away on the website.
 */
export const TodayTab = memo(
  ({
    insights,
    loading,
    refreshing,
    onRefresh,
    tonight,
    canScan,
    canManage,
    onScan,
    onWebOnly
  }: {
    insights: TInsights | null | undefined;
    loading: boolean;
    refreshing: boolean;
    onRefresh: () => void;
    /** Their events on now or within the day, with pictures. */
    tonight: TScanEvent[];
    canScan: boolean;
    canManage: boolean;
    onScan: (eventId: string) => void;
    onWebOnly: (task: TWebOnlyTask) => void;
  }) => {
    const byId = useMemo(() => new Map((insights?.events ?? []).map((event) => [event.id, event])), [insights]);
    const today = insights?.series[insights.series.length - 1]?.tickets ?? 0;
    const revenue = insights?.summary.revenue ?? [];
    const coming = (insights?.events ?? [])
      .filter((event) => event.status === "published" && !event.isPast && !tonight.some((item) => item.id === event.id))
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      .slice(0, 5);

    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: BG }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.blue} />}
      >
        <View className="flex-row gap-2 px-4 pt-4">
          {[
            { value: today.toLocaleString(), label: "tickets today" },
            { value: (insights?.summary.ticketsSold ?? 0).toLocaleString(), label: "this week" },
            {
              value: revenue[0]?.total.formatted?.withCurrency?.replace(/[.,]00$/, "") ?? "—",
              label: revenue.length > 1 ? `sales · +${revenue.length - 1} more` : "sales this week"
            }
          ].map((stat) => (
            <View key={stat.label} className="flex-1 rounded-2xl bg-white px-3 py-3">
              <TextComponent numberOfLines={1} className="text-lg font-extrabold text-zinc-950">
                {loading ? "…" : stat.value}
              </TextComponent>
              <TextComponent numberOfLines={1} className="text-[11px] text-zinc-500">
                {stat.label}
              </TextComponent>
            </View>
          ))}
        </View>

        {tonight.length > 0 && sectionLabel("ON NOW AND TONIGHT")}
        {tonight.map((event) => {
          const numbers = byId.get(event.id);
          return (
            <View key={event.id} className="mx-4 mb-2.5 rounded-2xl bg-white p-3">
              <View className="flex-row items-center gap-3">
                <CustomImage className="size-12 rounded-xl" imageClassName="size-full rounded-xl" source={{ uri: event.image ?? undefined }} contentFit="cover" />
                <View className="flex-1">
                  <TextComponent numberOfLines={1} className="text-sm font-extrabold text-zinc-950">
                    {event.name}
                  </TextComponent>
                  <TextComponent numberOfLines={1} className="text-[11px] text-zinc-500">
                    {formatEventClock(event.date, event.timezone)}
                    {numbers ? ` · ${soldLine(numbers)} · ${numbers.checkedIn.toLocaleString()} in` : ` · ${event.place}`}
                  </TextComponent>
                </View>
              </View>
              {numbers && <SoldBar event={numbers} />}
              {canScan && (
                <Pressable onPress={() => onScan(event.id)} accessibilityRole="button" className="mt-3 h-10 items-center justify-center rounded-xl" style={{ backgroundColor: BRAND.blue }}>
                  <TextComponent className="text-sm font-extrabold text-white">Scan tickets</TextComponent>
                </Pressable>
              )}
            </View>
          );
        })}

        {coming.length > 0 && sectionLabel("COMING UP")}
        {coming.map((event) => (
          <View key={event.id} className="mx-4 mb-2 rounded-2xl bg-white p-3">
            <View className="flex-row justify-between gap-2">
              <TextComponent numberOfLines={1} className="flex-1 text-sm font-bold text-zinc-950">
                {event.name}
              </TextComponent>
              <TextComponent className="text-xs text-zinc-500">{formatEventDay(event.date, undefined, { withYear: false })}</TextComponent>
            </View>
            <TextComponent className="mt-0.5 text-[11px] text-zinc-500">
              {soldLine(event)}
              {event.soldInPeriod ? ` · ${event.soldInPeriod} this week` : ""}
            </TextComponent>
            <SoldBar event={event} />
          </View>
        ))}

        {loading && !insights && <ActivityIndicator color={BRAND.blue} className="py-8" />}
        {!loading && !tonight.length && !coming.length && (
          <TextComponent className="mx-8 mt-8 text-center text-sm text-zinc-500">
            No upcoming events yet. Create one on the website and it shows here.
          </TextComponent>
        )}

        {canManage && (
          <>
            {sectionLabel("ON THE WEBSITE")}
            <WebRow
              title="Create an event"
              body="Tickets, pictures and the line-up are easier on a laptop"
              onPress={() =>
                onWebOnly({
                  title: "Create an event",
                  reason: "There's a lot to fill in, from tickets to pictures, and it's easier on a bigger screen.",
                  path: "/app/events/create"
                })
              }
            />
          </>
        )}
      </ScrollView>
    );
  }
);
TodayTab.displayName = "TodayTab";

/* ----------------------------------------------------------------- Events */

const STATUS_STYLE: Record<string, { label: string; background: string; color: string }> = {
  published: { label: "On sale", background: "#E8F8EF", color: "#15803D" },
  draft: { label: "Draft", background: "#F4F4F5", color: "#52525B" },
  cancelled: { label: "Cancelled", background: "#FEE2E2", color: "#B91C1C" }
};

/** Every event in the workspace with how it's selling; editing is on the website. */
export const EventsTab = memo(
  ({
    insights,
    loading,
    refreshing,
    onRefresh,
    scannableIds,
    canScan,
    onScan,
    onWebOnly
  }: {
    insights: TInsights | null | undefined;
    loading: boolean;
    refreshing: boolean;
    onRefresh: () => void;
    scannableIds: string[];
    canScan: boolean;
    onScan: (eventId: string) => void;
    onWebOnly: (task: TWebOnlyTask) => void;
  }) => {
    const events = insights?.events ?? [];
    const groups = [
      { title: "LIVE AND UPCOMING", items: events.filter((event) => event.status === "published" && !event.isPast) },
      { title: "DRAFTS", items: events.filter((event) => event.status === "draft") },
      { title: "PAST", items: events.filter((event) => event.isPast && event.status !== "draft") }
    ].filter((group) => group.items.length);

    return (
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: BG }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.blue} />}
      >
        {loading && !insights && <ActivityIndicator color={BRAND.blue} className="py-10" />}
        {!loading && !events.length && (
          <TextComponent className="mx-8 mt-10 text-center text-sm text-zinc-500">No events yet.</TextComponent>
        )}
        {groups.map((group) => (
          <View key={group.title}>
            {sectionLabel(group.title)}
            {group.items.map((event) => {
              const status = STATUS_STYLE[event.status] ?? STATUS_STYLE.draft;
              const scannable = canScan && scannableIds.includes(event.id);
              return (
                <View key={event.id} className="mx-4 mb-2 rounded-2xl bg-white p-3">
                  <View className="flex-row items-center gap-2">
                    <TextComponent numberOfLines={1} className="flex-1 text-sm font-bold text-zinc-950">
                      {event.name}
                    </TextComponent>
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: event.isPast ? "#F4F4F5" : status.background }}>
                      <TextComponent className="text-[10px] font-extrabold" style={{ color: event.isPast ? "#71717A" : status.color }}>
                        {event.isPast ? "Ended" : status.label}
                      </TextComponent>
                    </View>
                  </View>
                  <TextComponent className="mt-0.5 text-[11px] text-zinc-500">
                    {formatEventDay(event.date, undefined, { withYear: false })} · {soldLine(event)}
                    {event.revenue?.amount ? ` · ${event.revenue.formatted?.withCurrency?.replace(/[.,]00$/, "")}` : ""}
                  </TextComponent>
                  <SoldBar event={event} />
                  <View className="mt-2.5 flex-row gap-2">
                    {scannable && (
                      <Pressable onPress={() => onScan(event.id)} accessibilityRole="button" className="h-9 flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: BRAND.blueTint }}>
                        <TextComponent className="text-xs font-extrabold" style={{ color: BRAND.blueDeep }}>
                          Scan tickets
                        </TextComponent>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() =>
                        onWebOnly({
                          title: `Manage ${event.name}`,
                          reason: "Editing details, tickets and refunds is easier on a bigger screen, where nothing gets missed.",
                          path: `/app/events/${event.id}/edit`
                        })
                      }
                      accessibilityRole="button"
                      className="h-9 flex-1 items-center justify-center rounded-xl border border-zinc-200"
                    >
                      <TextComponent className="text-xs font-bold text-zinc-950">Manage ↗</TextComponent>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  }
);
EventsTab.displayName = "EventsTab";

/* --------------------------------------------------------------------- Me */

/** Which organiser they're working for, the way back to attendee, and the website's tools. */
export const MeTab = memo(
  ({
    workspaces,
    activeVendorId,
    canFinance,
    isOwner,
    onPickWorkspace,
    onAttendee,
    onWebOnly
  }: {
    /** Their own events first (vendorId null), then teams. */
    workspaces: { vendorId: string | null; name: string; note: string }[];
    activeVendorId: string | null;
    canFinance: boolean;
    isOwner: boolean;
    onPickWorkspace: (vendorId: string | null) => void;
    onAttendee: () => void;
    onWebOnly: (task: TWebOnlyTask) => void;
  }) => (
    <ScrollView className="flex-1" style={{ backgroundColor: BG }} contentContainerStyle={{ paddingBottom: 32 }}>
      {workspaces.length > 1 && (
        <>
          {sectionLabel("WORKING FOR")}
          {workspaces.map((item) => {
            const on = item.vendorId === activeVendorId;
            return (
              <Pressable
                key={item.vendorId ?? "own"}
                onPress={() => onPickWorkspace(item.vendorId)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl bg-white p-3.5"
                style={on ? { borderWidth: 2, borderColor: BRAND.blue } : undefined}
              >
                <View className="flex-1">
                  <TextComponent className="text-sm font-bold text-zinc-950">{item.name}</TextComponent>
                  <TextComponent className="text-xs text-zinc-500">{item.note}</TextComponent>
                </View>
                {on && <TextComponent style={{ color: BRAND.blue }}>✓</TextComponent>}
              </Pressable>
            );
          })}
        </>
      )}

      {sectionLabel("ON THE WEBSITE")}
      {canFinance && (
        <WebRow
          title="Payouts and wallet"
          body="Bank details and payouts are kept to a bigger screen"
          onPress={() =>
            onWebOnly({ title: "Payouts and wallet", reason: "Money settings deserve a careful look, so they're on the website.", path: "/app/wallet" })
          }
        />
      )}
      {isOwner && (
        <WebRow
          title="Your team"
          body="Who can scan, see sales or manage events"
          onPress={() =>
            onWebOnly({ title: "Your team", reason: "Deciding who can see money or scan tickets is easier on a bigger screen.", path: "/app/team" })
          }
        />
      )}
      <WebRow
        title="Analytics"
        body="Charts, ticket types and where buyers came from"
        onPress={() => onWebOnly({ title: "Analytics", reason: "The charts and tables need room.", path: "/app/analytics" })}
      />

      <Pressable onPress={onAttendee} accessibilityRole="button" className="mx-4 mt-6 h-12 items-center justify-center rounded-full" style={{ backgroundColor: BRAND.ink }}>
        <TextComponent className="text-[15px] font-bold text-white">⇄ Switch to attendee</TextComponent>
      </Pressable>
      <TextComponent className="mx-8 mt-2 text-center text-xs text-zinc-500">
        Buy tickets and explore as usual. Switch back from your profile any time.
      </TextComponent>
    </ScrollView>
  )
);
MeTab.displayName = "MeTab";
