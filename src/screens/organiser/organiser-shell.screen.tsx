import React, { memo, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import TextComponent from "@/shared/components/text/text.component";
import { ScreenActiveContext } from "@/shared/hooks/use-screen-active";
import { useHardwareBack } from "@/shared/hooks/use-hardware-back";
import { useOrganiserStore } from "@/shared/stores/organiser.store";
import { BRAND } from "@/shared/utils/brand-colors";
import ChatsScreen from "@/screens/chat/chats.screen";
import { useOrganiserAccess, useWeekSales } from "./organiser-api";
import { EventsTab, MeTab, TodayTab } from "./organiser-tabs";
import ScanTab from "./scan.tab";
import WebOnlySheet, { TWebOnlyTask } from "./web-only.sheet";

type TTab = "today" | "events" | "scan" | "chats" | "me";

const ICONS: Record<TTab, (color: string) => React.ReactNode> = {
  today: (color) => (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8} fill="none" stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={3} fill={color} />
    </Svg>
  ),
  events: (color) => (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={4} y={5} width={16} height={15} rx={2} fill="none" stroke={color} strokeWidth={2} />
      <Path d="M4 10h16M9 3v4M15 3v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  ),
  scan: (color) => (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  ),
  chats: (color) => (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M5 18l-1 3 4-1.5A8 8 0 1 0 5 18z" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  ),
  me: (color) => (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} fill="none" stroke={color} strokeWidth={2} />
      <Path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
};
const LABELS: Record<TTab, string> = { today: "Today", events: "Events", scan: "Scan", chats: "Chats", me: "Me" };

/**
 * Organiser mode: its own tabs in dark blue, so it's always clear which mode
 * you're in. What shows depends on what you can do: everything for your own
 * events, what the organiser gave you on their team, only the door for an
 * invited scanner. Setup work (editing, payouts, the team) is on the website.
 */
const OrganiserShellScreen = ({
  onOpenEvent,
  onAttendee
}: {
  onOpenEvent: (eventId: string) => void;
  onAttendee: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const access = useOrganiserAccess();
  const setWorkspace = useOrganiserStore((state) => state.setWorkspace);
  const canSales = access.can("SALES_VIEW");
  const canScan = access.can("TICKETS_SCAN");
  const tabs = useMemo<TTab[]>(
    () => [...(canSales ? (["today", "events"] as TTab[]) : []), ...(canScan ? (["scan"] as TTab[]) : []), "chats", "me"],
    [canSales, canScan]
  );
  const [tab, setTab] = useState<TTab>(tabs[0]);
  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0]);
  }, [tab, tabs]);
  useHardwareBack(() => {
    if (tab === tabs[0]) return false;
    setTab(tabs[0]);
  });

  const sales = useWeekSales(access.workspaceVendorId, canSales);
  const [scanEventId, setScanEventId] = useState<string | null>(null);
  const [webTask, setWebTask] = useState<TWebOnlyTask | null>(null);

  // This workspace's events at the door: their own, or the team's.
  const workspaceScanEvents = access.scanEvents.filter((event) =>
    access.team ? event.vendorId === access.team.vendorId : event.via === "own"
  );
  // The door doesn't depend on the workspace: the Scan tab offers every event
  // they can scan (their own, their teams', door access), each scanned as the
  // organiser it belongs to.
  const scanEvents = access.scanEvents;
  const tonight = workspaceScanEvents.filter((event) => {
    const now = Date.now();
    const start = new Date(event.date).getTime();
    const end = new Date(event.endDate ?? event.date).getTime() + 12 * 60 * 60 * 1000;
    return start - now < 24 * 60 * 60 * 1000 && end > now;
  });
  const openScan = (eventId: string) => {
    setScanEventId(eventId);
    setTab("scan");
  };
  const refresh = () => void Promise.all([sales.refetch(), access.refetch()]);

  const workspaces = [
    ...(access.isVendor ? [{ vendorId: null, name: "Your events", note: "Everything you organise" }] : []),
    ...access.teams.map((team) => ({
      vendorId: team.vendorId as string | null,
      name: team.name,
      note: team.permissions.includes("SALES_VIEW") ? "Team member" : "Scanning tickets"
    }))
  ];

  const content: Record<TTab, React.ReactNode> = {
    today: (
      <TodayTab
        insights={sales.data}
        loading={sales.isLoading}
        refreshing={sales.isRefetching}
        onRefresh={refresh}
        tonight={tonight}
        canScan={canScan}
        canManage={access.can("EVENTS_MANAGE")}
        onScan={openScan}
        onWebOnly={setWebTask}
      />
    ),
    events: (
      <EventsTab
        insights={sales.data}
        loading={sales.isLoading}
        refreshing={sales.isRefetching}
        onRefresh={refresh}
        scannableIds={scanEvents.map((event) => event.id)}
        canScan={canScan}
        onScan={openScan}
        onWebOnly={setWebTask}
      />
    ),
    scan: <ScanTab events={scanEvents} initialEventId={scanEventId} />,
    chats: <ChatsScreen onOpenEvent={onOpenEvent} onOpenTickets={onAttendee} />,
    me: (
      <MeTab
        workspaces={workspaces}
        activeVendorId={access.workspaceVendorId}
        canFinance={access.can("FINANCE_VIEW")}
        isOwner={!access.team && access.isVendor}
        onPickWorkspace={(vendorId) => {
          setWorkspace(vendorId);
          setTab("today");
        }}
        onAttendee={onAttendee}
        onWebOnly={setWebTask}
      />
    )
  };
  const dark = tab === "scan";

  return (
    <View className="flex-1" style={{ backgroundColor: BRAND.ink }}>
      <View className="flex-row items-center justify-between px-4 pb-3" style={{ paddingTop: 8 }}>
        <Pressable
          onPress={() => workspaces.length > 1 && setTab("me")}
          accessibilityRole="button"
          accessibilityLabel={`Organiser mode, ${access.workspaceName}${workspaces.length > 1 ? ". Change" : ""}`}
          className="flex-1"
        >
          <TextComponent className="text-[11px] font-bold tracking-widest text-white/50">ORGANISER</TextComponent>
          <TextComponent numberOfLines={1} className="text-base font-extrabold text-white">
            {access.workspaceName}
            {workspaces.length > 1 ? " ▾" : ""}
          </TextComponent>
        </Pressable>
        <Pressable
          onPress={onAttendee}
          accessibilityRole="button"
          accessibilityLabel="Switch to attendee"
          className="rounded-full px-3 py-1.5"
          style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
        >
          <TextComponent className="text-xs font-bold text-white">⇄ Attendee</TextComponent>
        </Pressable>
      </View>

      <View className="flex-1">
        {tabs.map((id) => (
          <ScreenActiveContext.Provider key={id} value={tab === id}>
            <View style={tab === id ? { flex: 1 } : { display: "none" }}>{tab === id ? content[id] : null}</View>
          </ScreenActiveContext.Provider>
        ))}
      </View>

      <View
        className="flex-row justify-around border-t pt-2"
        style={{
          paddingBottom: insets.bottom + 6,
          backgroundColor: dark ? BRAND.ink : "#ffffff",
          borderColor: dark ? "#1f2f3c" : "#E4E4E7"
        }}
      >
        {tabs.map((id) => {
          const on = tab === id;
          const color = on ? (dark ? BRAND.blue : BRAND.blueDeep) : dark ? "#8796a3" : "#71717A";
          return (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={LABELS[id]}
              className="min-w-14 items-center gap-1 py-1"
            >
              {ICONS[id](color)}
              <TextComponent className="text-[10px] font-bold" style={{ color }}>
                {LABELS[id]}
              </TextComponent>
            </Pressable>
          );
        })}
      </View>
      <WebOnlySheet task={webTask} onClose={() => setWebTask(null)} />
    </View>
  );
};

export default memo(OrganiserShellScreen);
