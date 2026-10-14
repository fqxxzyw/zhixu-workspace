"use client";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
export type Theme = "system" | "light" | "dark";
type NativeAppearance = {
  accent: string | null;
  material: boolean;
  titlebar: boolean;
  preferences?: { theme: Theme; reduce: boolean; systemAccent: boolean };
};
export type DesktopBridge = {
  chooseDirectory: () => Promise<{ grant: string; path: string } | null>;
  showFile: (id: string) => Promise<boolean>;
  showDataDirectory: () => Promise<void>;
  getAppearance: () => Promise<NativeAppearance>;
  setTheme: (theme: Theme) => Promise<void>;
  setPreferences?: (v: {
    theme: Theme;
    reduce: boolean;
    systemAccent: boolean;
  }) => Promise<void>;
  onAppearanceChanged: (
    callback: (appearance: NativeAppearance) => void,
  ) => () => void;
};
declare global {
  interface Window {
    zhixuDesktop?: DesktopBridge;
  }
}
const Context = createContext<{
  theme: Theme;
  setTheme: (v: Theme) => void;
  reduce: boolean;
  setReduce: (v: boolean) => void;
  systemAccent: boolean;
  setSystemAccent: (v: boolean) => void;
  native: NativeAppearance;
}>({
  theme: "system",
  setTheme: () => {},
  reduce: false,
  setReduce: () => {},
  systemAccent: true,
  setSystemAccent: () => {},
  native: { accent: null, material: false, titlebar: false },
});
function luminance(hex: string) {
  const v = hex
    .match(/\w\w/g)!
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
}
// Keep both accent text and its filled-button label readable in each theme.
function accessibleAccent(hex: string, dark: boolean) {
  let rgb = hex.match(/\w\w/g)!.map((c) => parseInt(c, 16));
  for (let i = 0; i < 30; i++) {
    const color = rgb
      .map((c) => Math.round(c).toString(16).padStart(2, "0"))
      .join("");
    const l = luminance(color);
    if (dark ? l >= 0.32 : l <= 0.16) return "#" + color;
    rgb = rgb.map((c) => (dark ? c + (255 - c) * 0.1 : c * 0.9));
  }
  return dark ? "#60cdff" : "#005fb8";
}
const preferenceMemory: Record<string, string> = {};
function readPreference(name: string, fallback: string) {
  try {
    return localStorage.getItem(name) ?? preferenceMemory[name] ?? fallback;
  } catch {
    return preferenceMemory[name] ?? fallback;
  }
}
function writePreference(name: string, value: string) {
  preferenceMemory[name] = value;
  try {
    localStorage.setItem(name, value);
  } catch {}
  window.dispatchEvent(new Event("zhixu-appearance-change"));
}
function subscribePreferences(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("zhixu-appearance-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("zhixu-appearance-change", callback);
  };
}
function readTheme(): Theme {
  const value = readPreference("zhixu-theme", "system");
  return value === "dark" || value === "light" ? value : "system";
}
const readReduce = () => readPreference("zhixu-reduce", "false") === "true";
const readAccent = () =>
  readPreference("zhixu-system-accent", "true") !== "false";
function subscribeDark(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const readDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
const subscribeHydration = () => () => {};
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const initialized = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const theme = useSyncExternalStore(
    subscribePreferences,
    readTheme,
    () => "system" as Theme,
  );
  const reduce = useSyncExternalStore(
    subscribePreferences,
    readReduce,
    () => false,
  );
  const systemAccent = useSyncExternalStore(
    subscribePreferences,
    readAccent,
    () => true,
  );
  const dark = useSyncExternalStore(subscribeDark, readDark, () => false);
  const setTheme = (v: Theme) => writePreference("zhixu-theme", v);
  const setReduce = (v: boolean) => writePreference("zhixu-reduce", String(v));
  const setSystemAccent = (v: boolean) =>
    writePreference("zhixu-system-accent", String(v));
  const [native, setNative] = useState<NativeAppearance>({
    accent: null,
    material: false,
    titlebar: false,
  });
  const [nativeReady, setNativeReady] = useState(false);
  useEffect(() => {
    const bridge = window.zhixuDesktop;
    void bridge
      ?.getAppearance()
      .then((appearance) => {
        const p = appearance.preferences;
        if (p) {
          writePreference("zhixu-theme", p.theme);
          writePreference("zhixu-reduce", String(p.reduce));
          writePreference("zhixu-system-accent", String(p.systemAccent));
        }
        setNative(appearance);
      })
      .catch(() => {})
      .finally(() => setNativeReady(true));
    if (!bridge) setNativeReady(true);
    return bridge?.onAppearanceChanged(setNative);
  }, []);
  useEffect(() => {
    if (!initialized || !nativeReady) return;
    const isDark = theme === "dark" || (theme === "system" && dark);
    const el = document.documentElement;
    el.classList.toggle("dark", isDark);
    el.dataset.reduce = String(reduce);
    el.dataset.material = native.material ? "mica" : "solid";
    el.dataset.titlebar = String(native.titlebar);
    el.style.colorScheme = isDark ? "dark" : "light";
    const accent =
      systemAccent && native.accent && /^[\da-f]{6}$/i.test(native.accent)
        ? accessibleAccent(native.accent, isDark)
        : null;
    el.style.removeProperty("--primary");
    el.style.removeProperty("--primary-foreground");
    if (accent) {
      el.style.setProperty("--primary", accent);
      el.style.setProperty(
        "--primary-foreground",
        luminance(accent.slice(1)) > 0.179 ? "#000000" : "#ffffff",
      );
    }
    void window.zhixuDesktop?.setTheme(theme).catch(() => {});
  }, [theme, reduce, systemAccent, initialized, nativeReady, dark, native]);
  useEffect(() => {
    if (nativeReady)
      void window.zhixuDesktop
        ?.setPreferences?.({ theme, reduce, systemAccent })
        .catch(() => {});
  }, [nativeReady, theme, reduce, systemAccent]);
  return (
    <Context.Provider
      value={{
        theme,
        setTheme,
        reduce,
        setReduce,
        systemAccent,
        setSystemAccent,
        native,
      }}
    >
      <TooltipProvider delayDuration={500}>{children}</TooltipProvider>
    </Context.Provider>
  );
}
export const useAppearance = () => useContext(Context);

/** Navigation must remain interruptible. CSS animates the entering content only;
 * document snapshots captured the entire editor and blocked rapid clicks. */
export function useFluentView(initial: string) {
  const [view, updateView] = useState(initial);
  return [view, updateView] as const;
}
