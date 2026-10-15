/**
 * The game's state machine. Every screen of a play session is one of these
 * states, and only the listed transitions exist — so the UI can never be,
 * say, paused and showing results at once.
 *
 *   LOADING ─► TUTORIAL ─► READY ─► PLAYING ⇄ CHALLENGE
 *      │                              │  ▲        │
 *      ▼                              ▼  │        │
 *    ERROR                          PAUSED ◄──────┘
 *                                     PLAYING ─► COMPLETED ─► RESULTS
 *
 * RETRY (from ERROR, PAUSED or RESULTS) starts a fresh session: LOADING.
 */
export type GameState =
  | "LOADING" | "TUTORIAL" | "READY" | "PLAYING" | "CHALLENGE"
  | "PAUSED" | "COMPLETED" | "RESULTS" | "ERROR";

export type GameEvent =
  | { type: "LOADED"; firstTime: boolean }
  | { type: "FAILED" }
  | { type: "TUTORIAL_DONE" }
  | { type: "START" }
  | { type: "REACHED_GATE" }
  | { type: "GATE_CLEARED" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "ALL_CLEARED" }
  | { type: "SHOW_RESULTS" }
  | { type: "RETRY" };

export interface Machine {
  state: GameState;
  /** Where PAUSED returns to. */
  resumeTo: GameState | null;
}

export const initialMachine: Machine = { state: "LOADING", resumeTo: null };

export function gameReducer(m: Machine, e: GameEvent): Machine {
  const to = (state: GameState, resumeTo: GameState | null = null): Machine => ({ state, resumeTo });
  switch (m.state) {
    case "LOADING":
      if (e.type === "LOADED") return to(e.firstTime ? "TUTORIAL" : "READY");
      if (e.type === "FAILED") return to("ERROR");
      break;
    case "TUTORIAL":
      if (e.type === "TUTORIAL_DONE") return to("READY");
      break;
    case "READY":
      if (e.type === "START") return to("PLAYING");
      break;
    case "PLAYING":
      if (e.type === "REACHED_GATE") return to("CHALLENGE");
      if (e.type === "ALL_CLEARED") return to("COMPLETED");
      if (e.type === "PAUSE") return to("PAUSED", "PLAYING");
      break;
    case "CHALLENGE":
      if (e.type === "GATE_CLEARED") return to("PLAYING");
      if (e.type === "PAUSE") return to("PAUSED", "CHALLENGE");
      break;
    case "PAUSED":
      if (e.type === "RESUME") return to(m.resumeTo ?? "PLAYING");
      if (e.type === "RETRY") return to("LOADING"); // "Restart level"
      break;
    case "COMPLETED":
      if (e.type === "SHOW_RESULTS") return to("RESULTS");
      if (e.type === "FAILED") return to("ERROR");
      break;
    case "ERROR":
      if (e.type === "RETRY") return to("LOADING");
      break;
    case "RESULTS":
      if (e.type === "RETRY") return to("LOADING"); // "Practice again" / next level
      break;
  }
  return m; // any other event is ignored, never half-applied
}
