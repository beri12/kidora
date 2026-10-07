import { registerRenderer } from '@/features/game/engine';

import { IslandMap } from './IslandMap';

/** Register the built-in 2D renderer. Future engines register alongside it. */
registerRenderer({ kind: '2d', isSupported: () => true, Scene: IslandMap });
