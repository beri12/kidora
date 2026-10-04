// A one-shot message carried across a navigation, e.g. "Your pilot access is
// now active." set on the pricing page and shown on the dashboard it redirects
// to. sessionStorage, so it never outlives the tab.
const KEY = "kidora.flash";

export function setFlash(message: string) {
  try { sessionStorage.setItem(KEY, message); } catch { /* storage disabled */ }
}

export function takeFlash(): string | null {
  try {
    const message = sessionStorage.getItem(KEY);
    if (message) sessionStorage.removeItem(KEY);
    return message;
  } catch {
    return null;
  }
}
