/** Non-cryptographic local id (queue items, optimistic messages). */
export function localId(prefix = 'local'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
