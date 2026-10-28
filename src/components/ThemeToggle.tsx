"use client";

import { useSyncExternalStore } from "react";

export type UiMode = "dark" | "light";
const KEY = "aigis-ui";

export function readUiMode(): UiMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  return "dark";
}

const listeners = new Set<() => void>();
export function applyUiMode(mode: UiMode) {
  document.documentElement.dataset.theme = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function snapshot(): UiMode {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

// Light/dark switch for the application chrome (panels, timeline, landing).
// The basemap look is chosen separately.
export function ThemeToggle({ className = "" }: { className?: string }) {
  const mode = useSyncExternalStore(subscribe, snapshot, () => "dark" as UiMode);
  const next: UiMode = mode === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => {
        applyUiMode(next);
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-mist hover:bg-ink-3 hover:text-fog ${className}`}
      title={`Switch to ${next} mode`}
      aria-label={`Switch to ${next} mode`}
    >
      {mode === "dark" ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

