import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildEntityEntries } from './entities-data.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const sourcePath = 'scripts/data-sources/entities/whatwg-2026-10-15.json';
const unicodePath = 'scripts/data-sources/entities/UnicodeData-17.0.txt';
const koreanPath = 'scripts/data-sources/entities/korean.json';
const source = JSON.parse(read(sourcePath));
const unicodeNames = new Map(read(unicodePath).trim().split(/\r?\n/).map((line) => {
  const [code, name, , , , , , , , , unicode1Name] = line.split(';');
  return [parseInt(code, 16), name.startsWith('<') ? unicode1Name || name : name];
}));
const entries = buildEntityEntries(source, unicodeNames, JSON.parse(read(koreanPath)));
const metadata = {
  source: 'https://html.spec.whatwg.org/entities.json', snapshotDate: '2026-10-15',
  unicodeVersion: '17.0', rawCount: Object.keys(source).length,
  namedCount: entries.reduce((sum, entry) => sum + entry.names.length, 0),
  entryCount: entries.length, multiCodepointCount: entries.filter((e) => e.codepoints.length > 1).length,
  koreanNameCount: entries.filter((e) => e.koreanName).length,
  attribution: 'Copyright © WHATWG (Apple, Google, Mozilla, Microsoft). Grouped and enriched by Tools.',
  license: 'CC-BY-4.0; source-code portions BSD-3-Clause; Unicode names Unicode-3.0',
  hashes: Object.fromEntries([sourcePath, unicodePath, koreanPath].map((path) =>
    [path, createHash('sha256').update(read(path).replace(/\r\n/g, '\n')).digest('hex')])),
};
mkdirSync(new URL('src/data/entities/', root), { recursive: true });
writeFileSync(new URL('src/data/entities/generated.json', root), JSON.stringify({ metadata, entries }) + '\n');
console.log(JSON.stringify(metadata, null, 2));
