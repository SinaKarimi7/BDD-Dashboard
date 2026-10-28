export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => !el.closest("[inert]") && el.getClientRects().length > 0);
}

// Where Tab should go inside a focus trap. Returns the index to move focus
// to, or null when the browser's default Tab is fine. `current` is -1 when
// focus is outside the list.
export function trapFocusIndex(
  current: number,
  count: number,
  backwards: boolean,
): number | null {
  if (count === 0) return null;
  if (current === -1) return backwards ? count - 1 : 0;
  if (backwards && current === 0) return count - 1;
  if (!backwards && current === count - 1) return 0;
  return null;
}

// Moves focus from one item in a list to the next or previous one, wrapping
// around. `current` is -1 when no item has focus.
export function cycleIndex(
  current: number,
  count: number,
  backwards: boolean,
): number {
  if (count === 0) return -1;
  if (current === -1) return backwards ? count - 1 : 0;
  return (current + (backwards ? -1 : 1) + count) % count;
}
