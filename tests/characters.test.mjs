import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createSearchIndex, filterCharacters } from '../src/scripts/characters/search.ts';
import { copyCharacter } from '../src/scripts/characters/clipboard.ts';
import { kaomoji } from '../src/data/kaomoji/index.ts';
import { supplementalKeywords } from '../src/data/emoji/supplemental.ts';
import { createCharacterButton } from '../src/scripts/characters/button.ts';
import { PAGE_SIZES, nextPage } from '../src/scripts/characters/pagination.ts';
import { COPY_TOAST_DURATION, createCopyToast } from '../src/scripts/characters/toast.ts';

const data = JSON.parse(readFileSync(new URL('../src/data/emoji/generated.json', import.meta.url), 'utf8'));
const aliases = JSON.parse(readFileSync(new URL('../scripts/data-sources/variant-aliases.json', import.meta.url), 'utf8'));
const emojiIndex = createSearchIndex(data.entries, supplementalKeywords);
const textIndex = createSearchIndex(kaomoji);
const normalize = (char) => char.replace(/\uFE0F/g, '');
const noTone = (char) => normalize(char).replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
const withoutSkinToneName = (name) => {
  const [prefix, qualifiers] = name.split(': ');
  if (!qualifiers) return name;
  const remaining = qualifiers.split(', ').filter((part) => !/^(?:light|medium-light|medium|medium-dark|dark) skin tone$/.test(part));
  return remaining.length ? `${prefix}: ${remaining.join(', ')}` : prefix;
};

test('모든 fully-qualified 원본을 중복 없이 보존하고 변형에 실제 Unicode 문자만 사용', () => {
  const source = readFileSync(new URL('../scripts/data-sources/emoji-test-17.0.txt', import.meta.url), 'utf8');
  const official = [...source.matchAll(/^([A-F0-9 ]+)\s*; fully-qualified\s*#/gm)]
    .map((match) => String.fromCodePoint(...match[1].trim().split(/\s+/).map((n) => parseInt(n, 16))));
  const flattened = data.entries.flatMap((e) => [e, ...e.variants]);
  assert.equal(flattened.length, official.length);
  assert.equal(new Set(flattened.map((e) => e.char)).size, official.length);
  assert.deepEqual(new Set(flattened.map((e) => e.char)), new Set(official));
  for (const entry of data.entries) for (const variant of entry.variants) {
    assert.equal(variant.category, entry.category);
    assert.equal(variant.subgroup, entry.subgroup);
    const bare = noTone(variant.char);
    const neutral = bare.replace(/\u200D[\u2640\u2642]$/, '').replace(/^[\u{1F468}\u{1F469}]/u, '🧑');
    const namedNeutral = withoutSkinToneName(variant.name);
    const sameOfficialName = namedNeutral === entry.name
      || aliases[`${variant.subgroup}:${namedNeutral}`] === `${entry.subgroup}:${entry.name}`
      || entry.variants.some((v) =>
      !/[\u{1F3FB}-\u{1F3FF}]/u.test(v.char) && v.name === namedNeutral);
    assert.ok(bare === normalize(entry.char) || neutral === normalize(entry.char) || sameOfficialName, `${variant.char} -> ${entry.char}`);
  }
  assert.equal(data.entries.filter((e) => /[\u{1F3FB}-\u{1F3FF}]/u.test(e.char)).length, 0);
  for (const [file, hash] of Object.entries(data.metadata.hashes)) {
    const contents = readFileSync(new URL(`../scripts/data-sources/${file}`, import.meta.url), 'utf8');
    assert.equal(createHash('sha256').update(contents.replace(/\r\n/g, '\n')).digest('hex'), hash);
  }
});

test('한국어 이름 커버리지 및 대표 검색어', () => {
  assert.equal(data.metadata.koreanNameCount, data.metadata.fullyQualifiedCount);
  const examples = { 웃음: ['😀', '😆', '😂'], 하트: ['❤️', '💕', '💖'], 고양이: ['🐱', '🐈'],
    꽃: ['🌸', '🌹', '🌻'], 음식: ['🍕', '🍔', '🍎'], 생일: ['🎂', '🎉', '🎁'] };
  for (const [query, expected] of Object.entries(examples)) {
    const matches = filterCharacters(emojiIndex, query, 'all').map((e) => e.char);
    for (const char of expected) assert.ok(matches.includes(char), `${query} -> ${char}`);
  }
});

test('검색 정규화, 카테고리 결합, 결과 없음, 변형 문자 검색', () => {
  assert.deepEqual(filterCharacters(emojiIndex, '  HEART  ', 'all'), filterCharacters(emojiIndex, 'heart', 'all'));
  assert.equal(filterCharacters(emojiIndex, 'not-a-character-result-123456', 'all').length, 0);
  assert.ok(filterCharacters(emojiIndex, '', 'Flags').every((e) => e.category === 'Flags'));
  const thumbs = data.entries.find((e) => e.char === '👍');
  assert.ok(thumbs.variants.some((e) => e.char === '👍🏽'));
  assert.ok(filterCharacters(emojiIndex, '👍🏽', 'all').some((e) => e.id === thumbs.id));
  const runner = data.entries.find((e) => e.char === '🏃');
  assert.ok(runner.variants.some((e) => e.char === '🏃‍♀️'));
});

test('텍스트 이모티콘 150개 이상, 중복 없음, 역슬래시 보존 및 한국어 검색', () => {
  assert.ok(kaomoji.length >= 150);
  assert.equal(new Set(kaomoji.map((e) => e.char)).size, kaomoji.length);
  assert.ok(kaomoji.some((e) => e.char === '¯\\_(ツ)_/¯'));
  assert.ok(filterCharacters(textIndex, '슬픔', 'all').some((e) => e.char === 'ㅠㅠ'));
  assert.ok(filterCharacters(textIndex, '화남', 'all').some((e) => e.char.includes('┻━┻')));
  assert.ok(filterCharacters(textIndex, '고양이', 'animals').length > 0);
});

test('복사 성공·실패·API 미지원 및 원문 시퀀스 보존', async () => {
  for (const char of ['🇰🇷', '👩🏽‍💻', '¯\\_(ツ)_/¯']) {
    let copied;
    assert.equal(await copyCharacter(char, async (text) => { copied = text; }), true);
    assert.equal(copied, char);
  }
  assert.equal(await copyCharacter('😀'), false);
  assert.equal(await copyCharacter('😀', async () => { throw new Error('Permission denied'); }), false);
});

test('대규모 검색 로직 처리 시간 측정', () => {
  const start = performance.now();
  for (let i = 0; i < 100; i++) filterCharacters(emojiIndex, '하트', 'all');
  console.log(`이모지 ${data.entries.length}개에서 검색 100회: ${(performance.now() - start).toFixed(1)}ms`);
});

// DOM 대역으로 버튼 이벤트 분기를 검사합니다. 실제 브라우저 dialog/포커스 검증은 별도입니다.
function withButtonDOM(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const createElement = (tag) => {
    const attributes = new Map();
    const handlers = new Map();
    return {
      tag, children: [], textContent: '',
      setAttribute(name, value) { attributes.set(name, value); },
      getAttribute(name) { return attributes.get(name); },
      append(child) { this.children.push(child); },
      addEventListener(event, handler) { handlers.set(event, handler); },
      click() { handlers.get('click')?.(); },
    };
  };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement } });
  try { run(); }
  finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  }
}

test('이모지 192개·텍스트 96개 표시, 더 보기와 필터 결과 초기 페이지', () => {
  assert.deepEqual(PAGE_SIZES, { emoji: 192, kaomoji: 96 });
  assert.equal(nextPage(data.entries, 0, 'emoji').length, 192);
  assert.deepEqual(nextPage(data.entries, 192, 'emoji'), data.entries.slice(192, 384));
  assert.equal(nextPage(kaomoji, 0, 'kaomoji').length, 96);
  assert.equal(nextPage(kaomoji, 96, 'kaomoji').length, kaomoji.length - 96);
  const filtered = filterCharacters(emojiIndex, '하트', 'all');
  assert.deepEqual(nextPage(filtered, 0, 'emoji'), filtered.slice(0, 192));
  assert.deepEqual(nextPage([], 0, 'emoji'), []);
});

test('단일 성공 토스트 자동 닫힘, 연속 표시 타이머 재설정 및 숨김', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const element = { textContent: '', dataset: { visible: 'false' } };
  const toast = createCopyToast(element);
  toast.show();
  t.mock.timers.tick(0);
  assert.equal(element.textContent, '복사했어요!');
  assert.equal(element.dataset.visible, 'true');
  t.mock.timers.tick(1000);
  toast.show();
  t.mock.timers.tick(0);
  t.mock.timers.tick(COPY_TOAST_DURATION - 1);
  assert.equal(element.dataset.visible, 'true');
  t.mock.timers.tick(1);
  assert.equal(element.dataset.visible, 'false');
  assert.equal(element.textContent, '');
  toast.show();
  toast.hide();
  t.mock.timers.tick(COPY_TOAST_DURATION);
  assert.equal(element.textContent, '');
});

test('192개 버튼 생성 로직 시간 측정 (DOM 대역, 실제 레이아웃 제외)', () => withButtonDOM(() => {
  const start = performance.now();
  const buttons = nextPage(data.entries, 0, 'emoji').map((entry) => createCharacterButton(entry, () => {}, () => {}));
  assert.equal(buttons.length, 192);
  console.log(`192개 버튼 생성 로직: ${(performance.now() - start).toFixed(1)}ms (DOM 대역)`);
}));

test('그리드: 변형 없으면 복사, 변형 있으면 복사 없이 선택창 요청', () => withButtonDOM(() => {
  const simple = data.entries.find((e) => e.char === '😀');
  const thumbs = data.entries.find((e) => e.char === '👍');
  const copied = [], opened = [];
  const onCopy = (item) => copied.push(item.char);
  const onVariants = (entry, opener) => opened.push({ entry, opener });
  const simpleButton = createCharacterButton(simple, onCopy, onVariants);
  simpleButton.click();
  assert.deepEqual(copied, ['😀']);
  assert.equal(opened.length, 0);
  assert.equal(simpleButton.children.length, 0);

  const variantButton = createCharacterButton(thumbs, onCopy, onVariants);
  variantButton.click();
  assert.deepEqual(copied, ['😀']);
  assert.equal(opened[0].entry, thumbs);
  assert.equal(opened[0].opener, variantButton);
  assert.ok(variantButton.getAttribute('aria-label').includes('변형 선택'));
  assert.equal(variantButton.getAttribute('aria-haspopup'), 'dialog');
  assert.equal(variantButton.children.length, 1);
  assert.equal(variantButton.children[0].tag, 'span');
  assert.equal(variantButton.children[0].getAttribute('aria-hidden'), 'true');
}));

test('선택창의 기본·변형과 텍스트 이모티콘은 선택창 재호출 없이 복사 요청', () => withButtonDOM(() => {
  const thumbs = data.entries.find((e) => e.char === '👍');
  const skinTone = thumbs.variants.find((e) => e.char === '👍🏽');
  const text = kaomoji.find((e) => e.char === 'ㅠㅠ');
  const copied = [];
  for (const item of [thumbs, skinTone, text]) {
    const button = createCharacterButton(item, (chosen) => copied.push(chosen.char));
    button.click();
    assert.ok(button.getAttribute('aria-label').endsWith('복사'));
    assert.equal(button.getAttribute('aria-haspopup'), undefined);
    assert.equal(button.children.length, 0);
  }
  assert.deepEqual(copied, ['👍', '👍🏽', 'ㅠㅠ']);
}));
