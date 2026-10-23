import type { EntityEntry } from './model';

export function entityPresentation(entry: EntityEntry) {
  const invisible = /^[\s\u00AD\u034F\u200B-\u200F\u202A-\u202E\u2060-\u206F]+$/u.test(entry.character);
  return {
    character: invisible ? '공백·제어' : entry.character,
    name: entry.koreanName || entry.englishName,
    detail: entry.koreanName ? entry.englishName : entry.category,
    points: entry.codepoints.map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`).join(' '),
    groups: [['Named Entity', entry.names], ['Decimal', [entry.decimal]], ['Hex', [entry.hex]]] as const,
  };
}
