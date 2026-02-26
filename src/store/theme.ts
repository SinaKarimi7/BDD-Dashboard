import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** The resolved theme (always "light" or "dark") */
  resolved: "light" | "dark";
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode: ThemeMode): "light" | "dark" {
  const resolved = mode === "system" ? getSystemTheme() : mode;
  const root = document.documentElement;

  if (resolved === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.setAttribute("data-theme", "light");
  }

  return resolved;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system" as ThemeMode,
      resolved: typeof window !== "undefined" ? getSystemTheme() : "light",
      setMode: (mode: ThemeMode) => {
        const resolved = applyTheme(mode);
        set({ mode, resolved });
      },
    }),
    {
      name: "bdd-dashboard-theme",
    },
  ),
);

// Listen for system theme changes when mode is "system"
if (typeof window !== "undefined") {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", () => {
    const { mode } = useThemeStore.getState();
    if (mode === "system") {
      const resolved = applyTheme("system");
      useThemeStore.setState({ resolved });
    }
  });

  // Apply theme after store rehydrates from localStorage
  useThemeStore.persist.onFinishHydration((state) => {
    applyTheme(state.mode);
    useThemeStore.setState({
      resolved: state.mode === "system" ? getSystemTheme() : state.mode,
    });
  });

  // Also apply immediately for first load (before hydration)
  applyTheme(useThemeStore.getState().mode);
}
