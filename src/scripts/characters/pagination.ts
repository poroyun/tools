export const PAGE_SIZES = { emoji: 192, kaomoji: 96 } as const;

export function nextPage<T>(entries: T[], shown: number, mode: keyof typeof PAGE_SIZES): T[] {
  return entries.slice(shown, shown + PAGE_SIZES[mode]);
}
