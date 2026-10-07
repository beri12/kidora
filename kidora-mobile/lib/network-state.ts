/**
 * Last-known connectivity, written by NetworkProvider and read by
 * non-React code (API client, sync engine).
 */
type Listener = (online: boolean) => void;

let online = true;
const listeners = new Set<Listener>();

export const networkState = {
  isOnline(): boolean {
    return online;
  },
  set(next: boolean): void {
    if (next === online) return;
    online = next;
    listeners.forEach((l) => l(next));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
