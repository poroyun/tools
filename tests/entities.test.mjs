import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { numericReferences } from '../scripts/entities-data.mjs';
import { createEntityIndex, filterEntities, entityPage, ENTITY_PAGE_SIZE, entityDataURL } from '../src/scripts/entities/model.ts';
import { createEntityCopier } from '../src/scripts/entities/copy.ts';
import { createEntityRow } from '../src/scripts/entities/row.ts';
import { tools } from '../src/data/tools.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const data = JSON.parse(read('src/data/entities/generated.json'));
const source = JSON.parse(read('scripts/data-sources/entities/whatwg-2026-10-15.json'));
const index = createEntityIndex(data.entries);
const byName = (name) => data.entries.find((entry) => entry.names.includes(name));

test('WHATWG 스냅샷의 모든 세미콜론 포함 이름·별칭·시퀀스를 정확히 수록', () => {
  const names = Object.keys(source).filter((name) => name.endsWith(';'));
  const actual = data.entries.flatMap((entry) => entry.names);
  assert.equal(names.length, 2125);
  assert.equal(data.entries.length, 1511);
  assert.deepEqual(new Set(actual), new Set(names));
  assert.equal(actual.length, new Set(actual).size);
  assert.equal(new Set(data.entries.map((e) => e.character)).size, data.entries.length);
  for (const entry of data.entries) for (const name of entry.names) {
    assert.equal(entry.character, source[name].characters);
    assert.deepEqual(entry.codepoints, source[name].codepoints);
    assert.equal(String.fromCodePoint(...entry.codepoints), entry.character);
  }
  for (const [path, expectedHash] of Object.entries(data.metadata.hashes)) {
    assert.equal(createHash('sha256').update(read(path).replace(/\r\n/g, '\n')).digest('hex'), expectedHash);
  }
});

test('주요 코드 및 보조 평면 문자: UTF-16 surrogate가 아닌 코드포인트 변환', () => {
  for (const [name, character, decimal, hex] of [
    ['&amp;', '&', '&#38;', '&#x26;'],
    ['&lt;', '<', '&#60;', '&#x3C;'],
    ['&gt;', '>', '&#62;', '&#x3E;'],
    ['&quot;', '"', '&#34;', '&#x22;'],
    ['&apos;', "'", '&#39;', '&#x27;'],
    ['&copy;', '©', '&#169;', '&#xA9;'],
    ['&hearts;', '♥', '&#9829;', '&#x2665;'],
    ['&Afr;', '𝔄', '&#120068;', '&#x1D504;'],
  ]) {
    const entry = byName(name);
    assert.equal(entry.character, character);
    assert.equal(entry.decimal, decimal);
    assert.equal(entry.hex, hex);
  }
  assert.deepEqual(numericReferences([0x1d504]), { decimal: '&#120068;', hex: '&#x1D504;' });
});

test('다중 코드포인트 65개를 정규화 없이 순서대로 변환', () => {
  assert.equal(data.entries.filter((e) => e.codepoints.length > 1).length, 65);
  const combining = byName('&NotEqualTilde;');
  assert.deepEqual(combining.codepoints, [0x2242, 0x338]);
  assert.equal(combining.decimal, '&#8770;&#824;');
  assert.equal(combining.hex, '&#x2242;&#x338;');
  const ligature = byName('&fjlig;');
  assert.equal(ligature.character, 'fj');
  assert.equal(ligature.decimal, '&#102;&#106;');
  assert.equal(ligature.hex, '&#x66;&#x6A;');
});

test('별칭을 한 항목으로 묶되 대소문자 의미와 세미콜론 보존', () => {
  const amp = byName('&amp;');
  assert.deepEqual(amp.names, ['&amp;', '&AMP;']);
  assert.equal(byName('&AMP;'), amp);
  assert.equal(byName('&amp'), undefined);
  assert.notEqual(byName('&Not;').character, byName('&not;').character);
  assert.equal(byName('&madeup;'), undefined);
});

test('문자·한국어·Unicode 영문 이름·별칭·숫자 참조 검색과 결과 없음', () => {
  for (const [query, name] of [['저작권', '&copy;'], ['하트', '&hearts;'], ['꺾쇠', '&lt;'],
    ['AMPERSAND', '&amp;'], ['<', '&lt;'], ['&AMP;', '&amp;'], ['&#x1D504;', '&Afr;'],
    ['U+2242', '&NotEqualTilde;'], ['화살표', '&rarr;']]) {
    assert.ok(filterEntities(index, query).some((entry) => entry.names.includes(name)), query);
  }
  assert.deepEqual(filterEntities(index, '   COPYRIGHT   '), filterEntities(index, 'copyright'));
  assert.equal(filterEntities(index, '결과없는검색어-93847').length, 0);
  assert.equal(filterEntities(index, '').length, 1511);
  assert.ok(filterEntities(index, '그리스 알파').every((entry) => entry.koreanName.includes('알파')));
});

test('48개씩 더 보기, 마지막 페이지, 필터 변경 후 초기 표시', () => {
  assert.equal(ENTITY_PAGE_SIZE, 48);
  assert.equal(entityPage(data.entries).length, 48);
  assert.deepEqual(entityPage(data.entries, 48), data.entries.slice(48, 96));
  let collected = [];
  while (collected.length < data.entries.length) collected = collected.concat(entityPage(data.entries, collected.length));
  assert.deepEqual(collected, data.entries);
  const filtered = filterEntities(index, '하트');
  assert.deepEqual(entityPage(filtered), filtered.slice(0, 48));
  assert.deepEqual(entityPage([]), []);
});

test('코드 원문 복사 성공과 실패·API 미지원 시 수동 복사 대안 요청', async () => {
  const events = [];
  const ui = { reset: () => events.push('reset'), success: () => events.push('success'), failure: (text) => events.push(['manual', text]) };
  const copier = createEntityCopier(ui, async (text) => events.push(['clipboard', text]));
  for (const text of ['&amp;', '&#8770;&#824;', '&#x2242;&#x338;']) await copier(text);
  assert.deepEqual(events.slice(0, 3), ['reset', ['clipboard', '&amp;'], 'success']);
  assert.equal(events.filter((e) => e === 'success').length, 3);
  events.length = 0;
  await createEntityCopier(ui, async () => { throw new Error('Denied'); })('&copy;');
  assert.deepEqual(events, ['reset', ['manual', '&copy;']]);
  events.length = 0;
  await createEntityCopier(ui)('&#169;');
  assert.deepEqual(events, ['reset', ['manual', '&#169;']]);
});

test('연속 복사에서 늦게 완료된 이전 실패가 최신 성공을 덮어쓰지 않음', async () => {
  const events = [];
  let rejectFirst;
  const copy = createEntityCopier({ reset() {}, success: () => events.push('success'), failure: () => events.push('failure') },
    (text) => text === 'old' ? new Promise((_, reject) => { rejectFirst = reject; }) : Promise.resolve());
  const first = copy('old');
  await copy('new');
  rejectFirst(new Error('Delayed denial'));
  await first;
  assert.deepEqual(events, ['success']);
});

test('/tools base 및 홈 도구 링크·다른 도구 상태 유지', () => {
  assert.equal(entityDataURL('/tools'), '/tools/entities/data.json');
  assert.equal(entityDataURL('/tools/'), '/tools/entities/data.json');
  assert.equal(entityDataURL('/'), '/entities/data.json');
  const entry = tools.find((tool) => tool.href === '/entities/');
  assert.equal(entry.status, 'available');
  assert.equal(tools.find((tool) => tool.href === '/characters/').status, 'available');
  assert.equal(tools.find((tool) => tool.href === '/colors/').status, 'coming-soon');
});

test('행 렌더러는 엔티티를 HTML로 해석하지 않고 코드별 버튼에서 원문 전달 (DOM 대역)', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  function createElement(tag) {
    const events = new Map(), attrs = new Map();
    return { tag, children: [], textContent: '', append(...children) { this.children.push(...children); },
      setAttribute(name, value) { attrs.set(name, value); }, getAttribute(name) { return attrs.get(name); },
      addEventListener(name, callback) { events.set(name, callback); }, click() { events.get('click')?.(); },
      set innerHTML(_) { assert.fail('innerHTML must not be used'); } };
  }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement } });
  try {
    const copied = [], row = createEntityRow(byName('&lt;'), (text) => copied.push(text));
    const walk = (node) => [node, ...node.children.flatMap(walk)];
    const nodes = walk(row), buttons = nodes.filter((node) => node.tag === 'button');
    assert.ok(nodes.some((node) => node.tag === 'code' && node.textContent === '&lt;'));
    assert.equal(buttons.length, byName('&lt;').names.length + 2);
    for (const button of buttons) {
      assert.ok(button.getAttribute('aria-label').endsWith('복사'));
      button.click();
    }
    assert.deepEqual(copied, [...byName('&lt;').names, '&#60;', '&#x3C;']);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  }
});
