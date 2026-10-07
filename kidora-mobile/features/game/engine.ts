import type { ComponentType } from 'react';

import type { Island, MapNode } from '@/types';

/**
 * Renderer seam for the game world.
 *
 * The MVP ships a lightweight 2D renderer (Reanimated + SVG). A future
 * Unity-as-a-library view, an R3F/expo-gl scene or a native engine module
 * implements the same contract and is registered here — screens, data
 * hooks and game state never change.
 */
export interface GameSceneProps {
  island: Island;
  nodes: MapNode[];
  reducedMotion: boolean;
  onNodePress: (node: MapNode) => void;
}

export type RendererKind = '2d' | 'unity' | 'r3f' | 'native';

export interface GameRenderer {
  kind: RendererKind;
  /** Is this renderer usable on this device (GPU, memory, module present)? */
  isSupported: () => boolean;
  Scene: ComponentType<GameSceneProps>;
}

const registry = new Map<RendererKind, GameRenderer>();

export function registerRenderer(renderer: GameRenderer): void {
  registry.set(renderer.kind, renderer);
}

/** Highest-fidelity supported renderer, falling back to 2D. */
export function selectRenderer(preferred: RendererKind[] = ['unity', 'r3f', 'native', '2d']): GameRenderer | null {
  for (const kind of preferred) {
    const r = registry.get(kind);
    if (r?.isSupported()) return r;
  }
  return null;
}

/** Messages a 3D engine bridge would exchange with the app. */
export type EngineEvent =
  | { type: 'NODE_SELECTED'; nodeId: string }
  | { type: 'REWARD_COLLECTED'; amount: number }
  | { type: 'READY' };

export type EngineCommand =
  | { type: 'LOAD_ISLAND'; islandKey: string; nodes: MapNode[] }
  | { type: 'CELEBRATE'; xp: number }
  | { type: 'SET_AVATAR'; avatarId: string };
