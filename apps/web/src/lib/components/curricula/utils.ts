/**
 * Utility functions for curricula feature
 */

/**
 * Debounce a function call
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs = 300
): (...args: TArgs) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Sort elements by ord field
 */
export function sortByOrd<T extends { ord: number }>(elements: T[]): T[] {
  return elements.slice().sort((a, b) => a.ord - b.ord);
}
