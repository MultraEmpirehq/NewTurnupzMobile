import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, Vibration, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useQueryClient } from "@tanstack/react-query";
import TextComponent from "@/shared/components/text/text.component";
import { constructErrorMessage } from "@/api/functions";
import { formatEventClock, formatEventDay } from "@/shared/utils/event-time";
import { BRAND } from "@/shared/utils/brand-colors";
import { useScreenActive } from "@/shared/hooks/use-screen-active";
import { TScanEvent, TScanResult, readmitTicket, scanTicket, useScanSummary } from "./organiser-api";

const NIGHT = "#05111b";
/** How long a result stays on screen before the next scan. */
const RESULT_MS = 2600;
/** The same code read again within this long is the camera seeing it twice. */
const SAME_CODE_MS = 4000;

type TLogEntry = TScanResult & { code: string; at: number };

/** Reasons staff usually have for letting someone in again; they can write their own. */
const READMIT_REASONS = ["Checked ID: the first scan was a screenshot", "Stepped out and came back"];

const timeOf = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;

const TONE = {
  approved: { background: "#10b981", title: "✓ Welcome in" },
  already_checked_in: { background: "#f59e0b", title: "Already checked in" },
  denied: { background: "#ef4444", title: "✕ Not valid" }
} as const;

/** Starts within the next day, or is on now (with a day's grace after the end). */
const isTonight = (event: TScanEvent, now = Date.now()) => {
  const start = new Date(event.date).getTime();
  const end = new Date(event.endDate ?? event.date).getTime() + 12 * 60 * 60 * 1000;
  return start - now < 24 * 60 * 60 * 1000 && end > now;
};

/**
 * The door: pick the event (tonight's first), then point the camera at tickets.
 * The API checks every scan, so a ticket can't get in twice, even with several
 * phones at the door. Codes can be typed when a QR won't read.
 */
const ScanTab = ({ events, initialEventId }: { events: TScanEvent[]; initialEventId?: string | null }) => {
  const active = useScreenActive();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const sorted = useMemo(
    () => [...events].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [events]
  );
  const [chosenId, setChosenId] = useState<string | null>(initialEventId ?? null);
  useEffect(() => {
    if (initialEventId) setChosenId(initialEventId);
  }, [initialEventId]);
  const event = sorted.find((item) => item.id === chosenId) ?? sorted.find((item) => isTonight(item)) ?? sorted[0] ?? null;
  const { data: summary } = useScanSummary(event);
  const [chosenDayId, setChosenDayId] = useState<string | null>(null);
  const dayId = summary?.days.length
    ? summary.days.some((day) => day.id === chosenDayId)
      ? chosenDayId!
      : summary.todayDayId ?? summary.days[0]?.id
    : undefined;
  const day = summary?.days.find((item) => item.id === dayId);

  const [result, setResult] = useState<TLogEntry | null>(null);
  const [log, setLog] = useState<TLogEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const last = useRef<{ code: string; at: number } | null>(null);

  const check = useCallback(
    async (raw: string, typedIn = false) => {
      const code = raw.trim();
      if (!event || !code || pending) return;
      const now = Date.now();
      if (last.current && last.current.code === code && now - last.current.at < SAME_CODE_MS) return;
      last.current = { code, at: now };
      setPending(true);
      let entry: TLogEntry;
      try {
        entry = { ...(await scanTicket(event, code, dayId, typedIn)), code, at: now };
      } catch (error) {
        entry = {
          status: "denied",
          message: constructErrorMessage(
            error as TApiErrorResponseType,
            "Couldn't check that ticket. Check your connection and try again."
          ),
          code,
          at: now
        };
      }
      setPending(false);
      setResult(entry);
      setLog((current) => [entry, ...current].slice(0, 8));
      Vibration.vibrate(entry.status === "approved" ? 80 : [0, 90, 70, 90]);
      void queryClient.invalidateQueries({ queryKey: ["scan-summary", event.id] });
      // "Already checked in" stays up: there's a decision to make.
      if (entry.status !== "already_checked_in") {
        setTimeout(() => setResult((current) => (current?.at === entry.at ? null : current)), RESULT_MS);
      }
    },
    [dayId, event, pending, queryClient]
  );

  // Letting the real holder in again: the organiser's team only, with a reason.
  const [readmitting, setReadmitting] = useState(false);
  const [reason, setReason] = useState("");
  const canReadmit = !!event && event.via !== "door";
  const letInAgain = async (why: string) => {
    if (!event || !result || !why.trim()) return;
    setPending(true);
    try {
      const answer = await readmitTicket(event, result.code, why.trim(), dayId);
      const entry: TLogEntry = { ...answer, code: result.code, at: Date.now() };
      setResult(entry);
      setLog((current) => [entry, ...current].slice(0, 8));
      Vibration.vibrate(80);
      setTimeout(() => setResult((current) => (current?.at === entry.at ? null : current)), RESULT_MS);
    } catch (error) {
      setResult({
        ...result,
        status: "denied",
        message: constructErrorMessage(error as TApiErrorResponseType, "Couldn't let them in again. Try once more."),
        at: Date.now()
      });
    } finally {
      setPending(false);
      setReadmitting(false);
      setReason("");
    }
  };

  if (!sorted.length) {
    return (
      <View className="flex-1 items-center justify-center gap-2 px-8" style={{ backgroundColor: NIGHT }}>
        <TextComponent className="text-center text-lg font-extrabold text-white">No events to scan</TextComponent>
        <TextComponent className="text-center text-sm text-white/60">
          Live and upcoming events you can check tickets in for show here.
        </TextComponent>
      </View>
    );
  }

  const tone = result ? TONE[result.status] : null;
  const cameraOn = active && !!permission?.granted && !typing;

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: NIGHT }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      {/* Which event, and which day of a multi-day one. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
        {sorted.map((item) => {
          const on = item.id === event?.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setChosenId(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className="rounded-full px-3.5 py-2"
              style={{ backgroundColor: on ? BRAND.blue : "rgba(255,255,255,0.1)" }}
            >
              <TextComponent numberOfLines={1} className="max-w-[220px] text-xs font-bold text-white">
                {isTonight(item) ? "● " : ""}
                {item.name}
              </TextComponent>
            </Pressable>
          );
        })}
      </ScrollView>
      {!!summary?.days.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 8 }}>
          {summary.days.map((item) => {
            const on = item.id === dayId;
            return (
              <Pressable
                key={item.id}
                onPress={() => setChosenDayId(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className="rounded-full border px-3 py-1.5"
                style={{ borderColor: on ? BRAND.blue : "rgba(255,255,255,0.2)" }}
              >
                <TextComponent className="text-[11px] font-bold" style={{ color: on ? BRAND.blue : "rgba(255,255,255,0.7)" }}>
                  {item.label || item.name}
                </TextComponent>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View className="px-4 pt-4">
        <TextComponent className="text-xs font-bold text-white/60">
          {event ? `${formatEventDay(event.date, event.timezone, { withYear: false })} · ${formatEventClock(event.date, event.timezone)}` : ""}
          {event?.via === "door" ? " · Door access" : event?.via === "team" ? " · For your team" : ""}
        </TextComponent>
        <TextComponent className="text-lg font-extrabold text-white">
          {summary
            ? `Checked in ${(day?.checkedIn ?? summary.checkedIn).toLocaleString()} of ${(day?.expected ?? summary.total).toLocaleString()}`
            : "Loading the door count…"}
        </TextComponent>
      </View>

      {/* The camera, or why it isn't on. */}
      <View className="mx-4 mt-3 overflow-hidden rounded-3xl" style={{ height: 320, backgroundColor: "#12212c" }}>
        {!permission ? (
          <ActivityIndicator color="#ffffff" className="flex-1" />
        ) : !permission.granted ? (
          <View className="flex-1 items-center justify-center gap-3 px-6">
            <TextComponent className="text-center text-sm text-white/80">
              Turnupz needs the camera to read ticket QR codes.
            </TextComponent>
            <Pressable onPress={() => void requestPermission()} className="rounded-full px-5 py-2.5" style={{ backgroundColor: BRAND.blue }}>
              <TextComponent className="text-sm font-bold text-white">Allow camera</TextComponent>
            </Pressable>
          </View>
        ) : cameraOn ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={pending || result ? undefined : ({ data }) => void check(data)}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <TextComponent className="text-sm text-white/60">Camera paused</TextComponent>
          </View>
        )}
        {cameraOn && !result && (
          <View pointerEvents="none" className="absolute inset-12 rounded-2xl border-4" style={{ borderColor: BRAND.blue }} />
        )}
        {pending && (
          <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: "rgba(5,17,27,0.5)" }}>
            <ActivityIndicator color="#ffffff" size="large" />
          </View>
        )}
      </View>

      {/* The answer, big enough to read at arm's length. */}
      {result && tone ? (
        <View className="mx-4 mt-3 rounded-2xl p-4" style={{ backgroundColor: tone.background }} accessibilityLiveRegion="assertive">
          <TextComponent className="text-xl font-extrabold text-white">{tone.title}</TextComponent>
          <TextComponent className="mt-0.5 text-sm text-white">
            {[result.attendeeName, result.ticketCategory, result.dayName].filter(Boolean).join(" · ") || result.message}
          </TextComponent>
          {result.status === "already_checked_in" && !!result.checkedInAt && (
            <TextComponent className="mt-1 text-sm font-bold text-white">
              Checked in at {timeOf(result.checkedInAt)}
              {result.scannerEmail ? ` by ${result.scannerEmail}` : ""}
            </TextComponent>
          )}
          {(result.status !== "approved" || result.checkId || result.readmitted) && !!result.attendeeName && (
            <TextComponent className="mt-0.5 text-xs text-white/90">{result.message}</TextComponent>
          )}
          {result.checkId && (
            <View className="mt-2 self-start rounded-full bg-white/25 px-3 py-1">
              <TextComponent className="text-xs font-extrabold text-white">Check their ID says {result.attendeeName}</TextComponent>
            </View>
          )}
          {result.status === "already_checked_in" && (
            <View className="mt-3 gap-2">
              {canReadmit && readmitting ? (
                <View className="gap-2">
                  <TextComponent className="text-xs font-bold text-white">Why are you letting them in again?</TextComponent>
                  {READMIT_REASONS.map((item) => (
                    <Pressable key={item} onPress={() => void letInAgain(item)} disabled={pending} className="rounded-xl bg-white/20 px-3 py-2.5" accessibilityRole="button">
                      <TextComponent className="text-sm font-bold text-white">{item}</TextComponent>
                    </Pressable>
                  ))}
                  <View className="flex-row gap-2">
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="Or say why"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      maxLength={200}
                      accessibilityLabel="Reason for letting them in again"
                      className="h-10 flex-1 rounded-xl px-3 text-sm text-white"
                      style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
                    />
                    <Pressable
                      onPress={() => void letInAgain(reason)}
                      disabled={reason.trim().length < 3 || pending}
                      className="h-10 items-center justify-center rounded-xl bg-white px-3"
                      style={{ opacity: reason.trim().length < 3 ? 0.5 : 1 }}
                    >
                      <TextComponent className="text-sm font-extrabold" style={{ color: "#b45309" }}>Let in</TextComponent>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View className="flex-row gap-2">
                  {canReadmit && (
                    <Pressable onPress={() => setReadmitting(true)} className="flex-1 items-center rounded-xl bg-white py-2.5" accessibilityRole="button">
                      <TextComponent className="text-sm font-extrabold" style={{ color: "#b45309" }}>Let in again</TextComponent>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => {
                      setResult(null);
                      setReadmitting(false);
                    }}
                    className="flex-1 items-center rounded-xl bg-white/25 py-2.5"
                    accessibilityRole="button"
                  >
                    <TextComponent className="text-sm font-extrabold text-white">Next scan</TextComponent>
                  </Pressable>
                </View>
              )}
              {!canReadmit && (
                <TextComponent className="text-[11px] text-white/90">
                  If this is the real holder, ask the organiser's team to let them in again.
                </TextComponent>
              )}
            </View>
          )}
        </View>
      ) : (
        <TextComponent className="mx-4 mt-3 text-center text-xs text-white/60">
          Point the camera at the ticket's QR code
        </TextComponent>
      )}

      {/* When a QR won't read: type the code from under it. */}
      {typing ? (
        <View className="mx-4 mt-3 flex-row gap-2">
          <TextInput
            value={typed}
            onChangeText={(text) => setTyped(text.toUpperCase())}
            onSubmitEditing={() => {
              void check(typed, true);
              setTyped("");
            }}
            placeholder="Ticket code"
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            accessibilityLabel="Ticket code"
            className="h-11 flex-1 rounded-xl px-3 text-sm text-white"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
          />
          <Pressable
            onPress={() => {
              void check(typed, true);
              setTyped("");
            }}
            disabled={!typed.trim() || pending}
            className="h-11 items-center justify-center rounded-xl px-4"
            style={{ backgroundColor: typed.trim() ? BRAND.blue : "rgba(255,255,255,0.15)" }}
          >
            <TextComponent className="text-sm font-bold text-white">Check</TextComponent>
          </Pressable>
          <Pressable onPress={() => setTyping(false)} className="h-11 items-center justify-center px-2" accessibilityLabel="Back to the camera">
            <TextComponent className="text-sm font-bold text-white/70">Camera</TextComponent>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setTyping(true)} className="mt-3 self-center px-4 py-2" accessibilityRole="button">
          <TextComponent className="text-sm font-bold" style={{ color: BRAND.blue }}>
            Type a code instead
          </TextComponent>
        </Pressable>
      )}

      {log.length > 0 && (
        <View className="mx-4 mt-4 gap-1.5">
          <TextComponent className="text-[11px] font-extrabold tracking-widest text-white/40">LAST SCANS</TextComponent>
          {log.map((entry) => (
            <View key={entry.at} className="flex-row items-center gap-2">
              <View className="size-2 rounded-full" style={{ backgroundColor: TONE[entry.status].background }} />
              <TextComponent numberOfLines={1} className="flex-1 text-xs text-white/80">
                {entry.attendeeName ?? entry.code} · {TONE[entry.status].title.replace(/^[✓✕] /, "")}
              </TextComponent>
              <TextComponent className="text-[11px] text-white/40">
                {new Date(entry.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </TextComponent>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default memo(ScanTab);
