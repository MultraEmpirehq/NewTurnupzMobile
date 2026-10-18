import { createContext, useContext } from "react";

/**
 * Whether the screen around a component is the one on show. Tabs stay mounted
 * when you leave them (so coming back is instant), and this tells the hidden
 * ones to stand down: no back-button handling, no timed refreshes.
 */
export const ScreenActiveContext = createContext(true);

export const useScreenActive = () => useContext(ScreenActiveContext);
