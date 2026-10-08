import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const normalize = (text) => text.replace(/\uFE0F/g, '');
const decode = (text) => text.replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const annotations = new Map();
for (const file of ['ko-48.xml', 'ko-derived-48.xml']) {
  for (const match of read(`scripts/data-sources/${file}`).matchAll(/<annotation\s+([^>]+)>([^<]*)<\/annotation>/g)) {
    const cp = /\bcp="([^"]+)"/.exec(match[1])?.[1];
    if (!cp) continue;
    const key = normalize(decode(cp));
    const item = annotations.get(key) ?? { koName: '', keywords: [] };
    if (/\btype="tts"/.test(match[1])) item.koName = decode(match[2]).trim();
    else item.keywords = decode(match[2]).split('|').map((s) => s.trim()).filter(Boolean);
    annotations.set(key, item);
  }
}

const groups = {
  'Smileys & Emotion': '표정·감정', 'People & Body': '사람·신체',
  'Animals & Nature': '동물·자연', 'Food & Drink': '음식·음료',
  'Travel & Places': '여행·장소', Activities: '활동', Objects: '사물',
  Symbols: '기호', Flags: '국기',
};
let group = '', subgroup = '';
const all = [];
const source = read('scripts/data-sources/emoji-test-17.0.txt');
if (!source.includes('# Version: 17.0')) throw new Error('Unexpected Unicode version');
for (const line of source.split(/\r?\n/)) {
  if (line.startsWith('# group: ')) group = line.slice(9);
  if (line.startsWith('# subgroup: ')) subgroup = line.slice(12);
  const match = /^([A-F0-9 ]+)\s*; fully-qualified\s*# \S+ E([\d.]+) (.+)$/.exec(line);
  if (!match) continue;
  const points = match[1].trim().split(/\s+/);
  const char = String.fromCodePoint(...points.map((n) => parseInt(n, 16)));
  const ko = annotations.get(normalize(char));
  if (!groups[group]) throw new Error(`Unknown group ${group}`);
  all.push({ id: points.join('-').toLowerCase(), char, name: match[3], koName: ko?.koName ?? '',
    keywords: ko?.keywords ?? [], category: group, categoryLabel: groups[group], subgroup,
    emojiVersion: match[2], variants: [] });
}
const byChar = new Map(all.map((e) => [normalize(e.char), e]));
const byName = new Map(all.filter((e) => !/[\u{1F3FB}-\u{1F3FF}]/u.test(e.char))
  .map((e) => [`${e.subgroup}:${e.name}`, e]));
// Unicode modifier chart의 kiss/couple with heart 계열에서 사용하는 명시적 별칭.
// 피부색 없는 person-person ZWJ 대신 기존 단일 문자 💏 / 💑가 기본 문자입니다.
const variantAliases = JSON.parse(read('scripts/data-sources/variant-aliases.json'));
function withoutSkinToneName(name) {
  const [prefix, qualifiers] = name.split(': ');
  if (!qualifiers) return name;
  const remaining = qualifiers.split(', ').filter((part) => !/^(?:light|medium-light|medium|medium-dark|dark) skin tone$/.test(part));
  return remaining.length ? `${prefix}: ${remaining.join(', ')}` : prefix;
}
const parent = new Map();
for (const entry of all) {
  const bare = normalize(entry.char).replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
  if (bare !== normalize(entry.char) && byChar.has(bare)) {
    parent.set(entry.id, byChar.get(bare));
    continue;
  }
  // 명시적 성별 접미사와 같은 subgroup의 단일 person/man/woman만 연결합니다.
  // 여러 인물의 성별이나 가족 관계는 추측하지 않습니다.
  if (/[\u{1F3FB}-\u{1F3FF}]/u.test(entry.char)) {
    // 코드포인트의 기본형이 다른 다중 인물 조합은 공식 이름의 피부색 한정어만
    // 제거한 이름과 subgroup이 정확히 일치할 때 연결합니다. 문자는 생성하지 않습니다.
    const key = `${entry.subgroup}:${withoutSkinToneName(entry.name)}`;
    const namedBase = byName.get(variantAliases[key] ?? key);
    if (namedBase) parent.set(entry.id, namedBase);
    continue;
  }
  const candidates = [];
  if (/\u200D[\u2640\u2642]$/.test(bare)) candidates.push(bare.replace(/\u200D[\u2640\u2642]$/, ''));
  if (/^[\u{1F468}\u{1F469}](?:\u200D|$)/u.test(bare)
    && !/[\u{1F468}\u{1F469}\u{1F466}\u{1F467}\u{1F9D1}]/u.test(bare.slice(2))) {
    candidates.push(bare.replace(/^[\u{1F468}\u{1F469}]/u, '🧑'));
  }
  const neutral = candidates.map((c) => byChar.get(c)).find((e) => e && e.subgroup === entry.subgroup);
  if (neutral && neutral.id !== entry.id) parent.set(entry.id, neutral);
}
function baseOf(entry) {
  const seen = new Set();
  while (parent.has(entry.id)) {
    if (seen.has(entry.id)) throw new Error('Variant cycle');
    seen.add(entry.id); entry = parent.get(entry.id);
  }
  return entry;
}
for (const entry of all) {
  const base = baseOf(entry);
  if (entry !== base) {
    const { variants, ...variant } = entry;
    base.variants.push(variant);
  }
}
const entries = all.filter((e) => !parent.has(e.id));
const files = ['emoji-test-17.0.txt', 'ko-48.xml', 'ko-derived-48.xml', 'UNICODE-LICENSE.txt', 'variant-aliases.json'];
const metadata = {
  unicodeVersion: '17.0', cldrVersion: '48', license: 'Unicode-3.0',
  source: 'https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt',
  cldrSource: 'https://github.com/unicode-org/cldr/tree/release-48/common',
  fullyQualifiedCount: all.length, baseCount: entries.length, variantCount: parent.size,
  koreanNameCount: all.filter((e) => e.koName).length,
  koreanMetadataCount: all.filter((e) => e.koName || e.keywords.length).length,
  // Git의 LF/CRLF 체크아웃 차이와 무관하게 원본 텍스트를 검증합니다.
  hashes: Object.fromEntries(files.map((f) => [f, createHash('sha256').update(read(`scripts/data-sources/${f}`).replace(/\r\n/g, '\n')).digest('hex')])),
};
mkdirSync(new URL('src/data/emoji/', root), { recursive: true });
writeFileSync(new URL('src/data/emoji/generated.json', root), `${JSON.stringify({ metadata, categories: Object.entries(groups).map(([id, label]) => ({ id, label })), entries })}\n`);
console.log(JSON.stringify(metadata, null, 2));
