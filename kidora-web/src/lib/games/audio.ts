"use client";

/**
 * Soft, short sound effects made with WebAudio — no files to download, quiet
 * by design, and nothing plays when the player has muted sound.
 */
type Sfx = "tap" | "correct" | "wrong" | "complete" | "open";

const NOTES: Record<Sfx, { f: number; t: number }[]> = {
  tap: [{ f: 660, t: 0 }],
  correct: [{ f: 523, t: 0 }, { f: 784, t: 0.09 }],
  // A gentle low note, not a buzzer: a wrong answer is part of learning.
  wrong: [{ f: 330, t: 0 }],
  open: [{ f: 440, t: 0 }, { f: 554, t: 0.07 }, { f: 659, t: 0.14 }],
  complete: [{ f: 523, t: 0 }, { f: 659, t: 0.1 }, { f: 784, t: 0.2 }, { f: 1047, t: 0.3 }],
};

let ctx: AudioContext | null = null;

export function playSfx(kind: Sfx, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    const now = ctx.currentTime;
    for (const n of NOTES[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.08, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + 0.25);
    }
  } catch {
    // Sound is decoration; never let it break the game.
  }
}
