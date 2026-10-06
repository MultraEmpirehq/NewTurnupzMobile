import React from "react";
import { Circle, Path, Rect } from "react-native-svg";

/** Line icons for each kind of event, on a 24-unit grid. */
export const EVENT_ICONS = {
  music: (
    <>
      <Path d="M9 18V5l12-2v13" />
      <Circle cx="6" cy="18" r="3" />
      <Circle cx="18" cy="16" r="3" />
    </>
  ),
  sport: (
    <>
      <Circle cx="12" cy="12" r="9.5" />
      <Path d="M12 2.5c3 2.6 3 16.4 0 19M12 2.5c-3 2.6-3 16.4 0 19M2.5 12h19" />
    </>
  ),
  food: (
    <>
      <Path d="M17 8h1a4 4 0 0 1 0 8h-1" />
      <Path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
      <Path d="M6 2v3M10 2v3M14 2v3" />
    </>
  ),
  comedy: (
    <>
      <Rect x="9" y="2" width="6" height="12" rx="3" />
      <Path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8" />
    </>
  ),
  tech: (
    <>
      <Rect x="4" y="4" width="16" height="12" rx="2" />
      <Path d="M2 20h20M9 9l-2 2 2 2M15 9l2 2-2 2" />
    </>
  ),
  business: (
    <>
      <Rect x="2.5" y="7" width="19" height="13" rx="2" />
      <Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2.5 12.5h19" />
    </>
  ),
  family: (
    <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  )
};

export type TEventIcon = keyof typeof EVENT_ICONS;
