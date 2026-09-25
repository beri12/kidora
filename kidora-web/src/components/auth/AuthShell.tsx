'use client';

import type { ReactNode } from 'react';
import { KidoraAuthScene } from './scene/KidoraAuthScene';

export { AuthStep } from './scene/KidoraAuthScene';

/**
 * Shared frame for every auth screen — /login, /join, /register,
 * /auth/callback, /onboarding/role — so they read as one continuous world.
 * `title` is what the fox says in its speech bubble; keep it short.
 */
export function AuthShell({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return <KidoraAuthScene greeting={title} wide={wide}>{children}</KidoraAuthScene>;
}
