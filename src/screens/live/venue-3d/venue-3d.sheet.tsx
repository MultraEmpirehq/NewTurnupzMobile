import { BRAND } from "@/shared/utils/brand-colors";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, View, useWindowDimensions } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import SafeModal from "@/shared/components/modals/safe-modal";
import TextComponent from "@/shared/components/text/text.component";
import type { TVenueScene } from "./venue-scene";
import type { TVenueLayout } from "./venue-layouts";

const ACCENT = "#00B2FF";

export type TVenueZoneTicket = {
  zone: string;
  ticketId: string;
  title: string;
  subtitle: string;
  note?: string;
  color: string;
  soldOut: boolean;
};

/**
 * expo-gl ships in the app binary. An older build without it (updated over
 * the air) shows a note instead of crashing.
 */
const loadGl = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-gl") as typeof import("expo-gl");
  } catch {
    return null;
  }
};

/**
 * "View in 3D" in the app: the venue with each ticket's area in its colour.
 * Drag to turn, pinch to zoom, tap an area, then "View from here" or "Pick
 * this". Areas are listed below as well, for anyone who'd rather tap a name.
 */
const Venue3DSheet = ({
  visible,
  onClose,
  layout,
  zones,
  onPick
}: {
  visible: boolean;
  onClose: () => void;
  layout: TVenueLayout;
  zones: TVenueZoneTicket[];
  onPick: (ticketId: string) => void;
}) => {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const height = Math.round(width * 0.8);
  const venue = useRef<TVenueScene | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [inside, setInside] = useState(false);
  const expoGl = useMemo(loadGl, []);

  useEffect(() => {
    if (visible) return;
    venue.current?.dispose();
    venue.current = null;
    setZone(null);
    setInside(false);
  }, [visible]);

  const choose = (next: string | null) => {
    setZone(next);
    venue.current?.select(next);
  };

  // Drag turns, two fingers zoom, a short touch picks an area.
  const gesture = useRef({ x: 0, y: 0, pinch: 0, moved: false });
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          gesture.current = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY, pinch: 0, moved: false };
        },
        onPanResponderMove: (event, state) => {
          const touches = event.nativeEvent.touches;
          if (touches.length === 2) {
            const distance = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
            if (gesture.current.pinch) venue.current?.zoom(distance / gesture.current.pinch);
            gesture.current.pinch = distance;
            gesture.current.moved = true;
            return;
          }
          if (Math.abs(state.dx) + Math.abs(state.dy) > 4) gesture.current.moved = true;
          venue.current?.rotate(state.vx * 12, state.vy * 12);
        },
        onPanResponderRelease: () => {
          if (!gesture.current.moved && venue.current) {
            choose(venue.current.pick(gesture.current.x, gesture.current.y));
          }
        }
      }),
    // `choose` only touches refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const current = zones.find((item) => item.zone === zone) ?? null;

  return (
    <SafeModal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white pt-4">
        <View className="flex-row items-center justify-between px-4 pb-3">
          <TextComponent className="text-lg font-bold text-zinc-950">Where you&apos;ll be</TextComponent>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
            <TextComponent className="text-sm font-bold" style={{ color: BRAND.link }}>
              Done
            </TextComponent>
          </Pressable>
        </View>

        <View style={{ width, height }} className="bg-zinc-100" {...responder.panHandlers}>
          {expoGl && visible ? (
            <expoGl.GLView
              style={{ width, height }}
              onContextCreate={(gl) => {
                void import("./venue-scene").then(({ createVenueScene }) => {
                  venue.current = createVenueScene(gl, {
                    layout,
                    zones: zones.map(({ zone: key, color, soldOut }) => ({ zone: key, color, soldOut })),
                    width,
                    height,
                    reduceMotion
                  });
                });
              }}
            />
          ) : (
            <View className="flex-1 items-center justify-center p-6">
              <TextComponent className="text-center text-sm text-zinc-500">
                Update the app to see the venue in 3D. You can still pick an area below.
              </TextComponent>
            </View>
          )}
          <View className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5">
            <TextComponent className="text-xs text-zinc-600">
              {inside && current ? `The view from ${current.title}` : "Drag to turn · tap an area"}
            </TextComponent>
          </View>
        </View>

        <View className="gap-3 px-4 pt-4">
          {current ? (
            <View className="gap-2 rounded-2xl border border-zinc-200 p-4">
              <TextComponent className="text-base font-bold text-zinc-950">
                {current.title} · {current.soldOut ? "Sold out" : current.subtitle}
              </TextComponent>
              {!!current.note && <TextComponent className="text-sm text-zinc-500">{current.note}</TextComponent>}
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => {
                    const next = !inside;
                    setInside(next);
                    venue.current?.viewFrom(next ? current.zone : null);
                  }}
                  className="h-11 flex-1 items-center justify-center rounded-full border border-zinc-300"
                >
                  <TextComponent className="text-sm font-bold text-zinc-800">
                    {inside ? "Whole venue" : "View from here"}
                  </TextComponent>
                </Pressable>
                <Pressable
                  disabled={current.soldOut}
                  onPress={() => {
                    onPick(current.ticketId);
                    onClose();
                  }}
                  className="h-11 flex-1 items-center justify-center rounded-full"
                  style={{ backgroundColor: current.soldOut ? "#bae6fd" : ACCENT }}
                >
                  <TextComponent className="text-sm font-bold text-white">Pick this</TextComponent>
                </Pressable>
              </View>
            </View>
          ) : (
            <TextComponent className="text-sm text-zinc-500">Tap an area, or choose one here:</TextComponent>
          )}
          <View className="flex-row flex-wrap gap-2">
            {zones.map((item) => (
              <Pressable
                key={item.zone}
                onPress={() => choose(item.zone)}
                accessibilityRole="button"
                accessibilityState={{ selected: item.zone === zone }}
                className="flex-row items-center gap-2 rounded-full border px-3 py-2"
                style={{ borderColor: item.zone === zone ? item.color : "#e4e4e7" }}
              >
                <View className="size-3 rounded-sm" style={{ backgroundColor: item.soldOut ? "#8a949e" : item.color }} />
                <TextComponent className="text-sm font-semibold text-zinc-800">{item.title}</TextComponent>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeModal>
  );
};

export default memo(Venue3DSheet);
