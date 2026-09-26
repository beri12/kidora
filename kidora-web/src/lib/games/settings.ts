"use client";

import { useEffect, useState } from "react";

export type Quality = "LOW" | "MEDIUM" | "HIGH";

export interface GameSettings {
  sound: boolean;
  quality: Quality;
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
}

const KEY = "kidora.games.settings";

/**
 * A starting quality from what the device reports. Phones and older laptops
 * start LOW or MEDIUM; the player can always change it in the pause menu.
 */
export function detectQuality(): Quality {
  if (typeof navigator === "undefined") return "MEDIUM";
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  if (cores <= 4 || memory <= 3) return "LOW";
  if (touch || cores <= 6) return "MEDIUM";
  return "HIGH";
}

function defaults(): GameSettings {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return { sound: true, quality: detectQuality(), largeText: false, highContrast: false, reducedMotion: Boolean(reduce) };
}

/** Per-device settings, remembered in localStorage (a convenience, not state that matters). */
export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(() => ({ sound: true, quality: "MEDIUM", largeText: false, highContrast: false, reducedMotion: false }));

  useEffect(() => {
    let stored: Partial<GameSettings> = {};
    try { stored = JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { /* private mode */ }
    setSettings({ ...defaults(), ...stored });
  }, []);

  const update = (patch: Partial<GameSettings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });

  return [settings, update] as const;
}

/** First visit to a game shows the tutorial; later visits skip it. */
export function tutorialSeen(slug: string): boolean {
  try { return localStorage.getItem(`kidora.games.tutorial.${slug}`) === "1"; } catch { return false; }
}
export function markTutorialSeen(slug: string) {
  try { localStorage.setItem(`kidora.games.tutorial.${slug}`, "1"); } catch { /* private mode */ }
}
