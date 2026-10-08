import type { CharacterEntry } from './types';

export interface SearchItem {
  entry: CharacterEntry;
  searchable: string;
}

export const normalizeQuery = (value: string): string => value.normalize('NFC').trim().toLocaleLowerCase();

export function createSearchIndex(entries: CharacterEntry[], supplemental: Record<string, string[]> = {}): SearchItem[] {
  return entries.map((entry) => ({
    entry,
    searchable: normalizeQuery([entry, ...entry.variants].flatMap((item) =>
      [item.char, item.name, item.koName, ...item.keywords, item.category, item.categoryLabel,
        item.subgroup, ...(supplemental[item.char] ?? [])]).join(' ')),
  }));
}

export function filterCharacters(index: SearchItem[], query: string, category: string): CharacterEntry[] {
  const terms = normalizeQuery(query).split(/\s+/).filter(Boolean);
  return index.filter(({ entry, searchable }) =>
    (category === 'all' || entry.category === category) && terms.every((term) => searchable.includes(term))
  ).map(({ entry }) => entry);
}
