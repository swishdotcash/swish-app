import { Easing } from "react-native-reanimated";

// Entrance: fast start, gentle settle — the golden curve
export const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1);
// Exit: ease-in, quick off
export const EASE_EXIT = Easing.bezier(0.4, 0, 1, 1);
// Micro-interaction: press/hover
export const EASE_MICRO = Easing.bezier(0.2, 0, 0, 1);

// Timing durations (ms)
export const DURATION_ENTER = 380;
export const DURATION_EXIT = 250;
export const DURATION_MICRO = 120;

// Spring presets
export const SPRING_SMOOTH = { damping: 30, stiffness: 200 } as const;
export const SPRING_BOUNCY = { damping: 20, stiffness: 300 } as const;
export const SPRING_SNAPPY = { damping: 12, stiffness: 400 } as const;
