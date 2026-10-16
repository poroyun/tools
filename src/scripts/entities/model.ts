export interface EntityEntry {
  id: string;
  character: string;
  codepoints: number[];
  names: string[];
  decimal: string;
  hex: string;
  englishName: string;
  koreanName: string;
  keywords: string[];
  category: string;
}

export const ENTITY_PAGE_SIZE = 48;
const normalize = (text: string): string => text.normalize('NFC').trim().toLowerCase();

export function createEntityIndex(entries: EntityEntry[]) {
  return entries.map((entry) => ({ entry, searchable: normalize([
    entry.character, ...entry.names, entry.decimal, entry.hex, entry.englishName,
    entry.koreanName, ...entry.keywords, entry.category,
    ...entry.codepoints.map((cp) => `U+${cp.toString(16).toUpperCase()}`),
  ].join(' ')) }));
}

export function filterEntities(index: ReturnType<typeof createEntityIndex>, query: string): EntityEntry[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return index.filter(({ searchable }) => terms.every((term) => searchable.includes(term))).map(({ entry }) => entry);
}

export function entityPage(entries: EntityEntry[], shown = 0): EntityEntry[] {
  return entries.slice(shown, shown + ENTITY_PAGE_SIZE);
}

export function entityDataURL(base: string): string {
  return `${base.replace(/\/$/, '')}/entities/data.json`;
}
