'use client';

import type { ReactNode } from 'react';
import { CenteredAuthLayout } from './kidora/layouts';

/**
 * Frame for the smaller auth-adjacent screens (payment return, pending
 * approval, OAuth callback): the same centred Kidora card as log in.
 * `title` is announced to screen readers; the page supplies its own heading.
 */
export function AuthShell({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <CenteredAuthLayout wide={wide}>
      <p className="sr-only" role="status">{title}</p>
      {children}
    </CenteredAuthLayout>
  );
}

/** Kept for existing callers; the layout animates the card and its rows. */
export function AuthStep({ children }: { children: ReactNode; back?: boolean }) {
  return <div>{children}</div>;
}
