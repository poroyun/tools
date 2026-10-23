// Run after npm run build:
// node --test --experimental-strip-types tests/static-html.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { documentFromHTML, readBuild, runInitializer, settle } from './helpers/static-dom.mjs';
import * as search from '../src/scripts/characters/search.ts';
import * as button from '../src/scripts/characters/button.ts';
import * as pagination from '../src/scripts/characters/pagination.ts';
import * as clipboard from '../src/scripts/characters/clipboard.ts';
import * as toast from '../src/scripts/characters/toast.ts';
import * as focus from '../src/scripts/characters/dialog-focus.ts';
import * as kaomojiModule from '../src/data/kaomoji/index.ts';
import { supplementalKeywords } from '../src/data/emoji/supplemental.ts';
import * as model from '../src/scripts/entities/model.ts';
import * as row from '../src/scripts/entities/row.ts';
import * as copy from '../src/scripts/entities/copy.ts';

const data = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}/generated.json`, import.meta.url), 'utf8'));
const emoji = data('emoji'), entities = data('entities');
const dependencies = { ...search, ...button, ...pagination, ...clipboard, ...toast, ...focus, ...model, ...row, ...copy, supplementalKeywords, kaomojiModule };
const fetchData = (data) => async () => ({ ok: true, json: async () => data });
const list = (doc, mode) => doc.querySelector(`[data-mode-results="${mode}"]`);
const ids = (items, attr) => items.children.map((child) => child.getAttribute(attr) || child.querySelector('button')?.getAttribute(attr));

function withDocument(t, doc) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; });
}

test('built HTML: ordered 192 emoji, 96 text entries in actual tab panels, names and variant semantics', () => {
  const doc = documentFromHTML(readBuild('characters'));
  for (const [mode, entries, size] of [['emoji', emoji.entries, 192], ['kaomoji', kaomojiModule.kaomoji, 96]]) {
    const items = list(doc, mode);
    assert.deepEqual(ids(items, 'data-character-id'), entries.slice(0, size).map((entry) => entry.id));
    items.children.forEach((li, i) => {
      const target = li.querySelector('button'), entry = entries[i];
      const variants = mode === 'emoji' && entry.variants.length > 0;
      assert.equal(target.getAttribute('aria-label'), button.characterButtonLabel(entry, variants));
      assert.equal(target.getAttribute('aria-haspopup'), variants ? 'dialog' : null);
      assert.equal(target.textContent.trim(), entry.char + (variants ? '⌄' : ''));
      assert.equal(target.disabled, true);
    });
    const tab = doc.querySelector(`#${mode}-tab`), panel = doc.querySelector(`#${mode}-panel`);
    assert.equal(tab.getAttribute('aria-controls'), panel.getAttribute('id'));
    assert.equal(panel.getAttribute('aria-labelledby'), tab.getAttribute('id'));
    assert.equal(panel.hidden, mode !== 'emoji');
    assert.equal(tab.getAttribute('aria-selected'), String(mode === 'emoji'));
  }
  assert.equal(doc.querySelectorAll('h1').length, 1);
});

test('built entities: ordered 48 rows, safe literal characters and all code strings', () => {
  const html = readBuild('entities'), doc = documentFromHTML(html), items = doc.querySelector('[data-results]');
  assert.deepEqual(ids(items, 'data-entity-id'), entities.entries.slice(0, 48).map((entry) => entry.id));
  items.children.forEach((li, i) => {
    const entry = entities.entries[i];
    assert.equal(li.querySelector('h3').textContent, entry.koreanName || entry.englishName);
    assert.deepEqual(li.querySelectorAll('code').map((node) => node.textContent), [...entry.names, entry.decimal, entry.hex]);
    assert.deepEqual(li.querySelectorAll('button').map((node) => node.dataset.copyValue), [...entry.names, entry.decimal, entry.hex]);
    assert.ok(li.querySelectorAll('button').every((node) => node.disabled));
    if (['&', '<', '>', '"', "'"].includes(entry.character)) assert.equal(li.querySelector('.entity-character').textContent, entry.character);
  });
  assert.ok(html.includes('&amp;lt;'));
  assert.equal(doc.querySelectorAll('h1').length, 1);
});

test('character initializer: reuses static nodes, copy/dialog, tabs/keyboard, Korean search, categories, pagination', async (t) => {
  const doc = documentFromHTML(readBuild('characters')); withDocument(t, doc);
  const initial = [...list(doc, 'emoji').children], textInitial = [...list(doc, 'kaomoji').children], copied = [];
  await runInitializer('characters', doc, dependencies, fetchData(emoji), { clipboard: { writeText: async (value) => copied.push(value) } });
  assert.deepEqual(list(doc, 'emoji').children, initial);
  assert.equal(list(doc, 'emoji').children.length, 192);
  initial[0].querySelector('button').click(); await settle();
  assert.equal(copied.at(-1), emoji.entries[0].char);
  const variant = emoji.entries.slice(0, 192).find((entry) => entry.variants.length);
  const variantButton = doc.querySelector(`[data-character-id="${variant.id}"]`);
  assert.equal(variantButton.querySelectorAll('.character-variant-indicator').length, 1);
  variantButton.click();
  const dialog = doc.querySelector('[data-variants]'); assert.equal(dialog.open, true);
  const choices = doc.querySelector('[data-variant-results]').children;
  assert.equal(choices.length, variant.variants.length + 1);
  choices[1].querySelector('button').click(); await settle();
  assert.equal(copied.at(-1), variant.variants[0].char); assert.equal(dialog.open, false);
  doc.querySelector('[data-more]').click(); assert.equal(list(doc, 'emoji').children.length, 384);
  assert.ok(doc.querySelector('[data-result-count]').textContent.includes('384개 표시'));
  const emojiTab = doc.querySelector('#emoji-tab'), textTab = doc.querySelector('#kaomoji-tab');
  emojiTab.dispatch('keydown', { key: 'ArrowRight' });
  assert.deepEqual(list(doc, 'kaomoji').children, textInitial);
  assert.equal(doc.querySelector('#kaomoji-panel').hidden, false);
  assert.equal(doc.querySelector('#emoji-panel').hidden, true);
  assert.equal(textTab.getAttribute('aria-selected'), 'true');
  textInitial[0].querySelector('button').click(); await settle();
  assert.equal(copied.at(-1), kaomojiModule.kaomoji[0].char);
  doc.querySelector('[data-more]').click(); assert.equal(list(doc, 'kaomoji').children.length, kaomojiModule.kaomoji.length);
  emojiTab.click(); assert.equal(list(doc, 'emoji').children.length, 192);
  const input = doc.querySelector('#character-query'); input.value = '하트'; input.dispatch('input'); await settle();
  const matches = search.filterCharacters(search.createSearchIndex(emoji.entries, supplementalKeywords), '하트', 'all');
  assert.equal(list(doc, 'emoji').children.length, Math.min(matches.length, 192));
  assert.ok(list(doc, 'emoji').textContent.includes('❤️'));
  doc.querySelector('[data-clear]').click();
  const category = doc.querySelector('[data-categories]').children[1]; category.click();
  assert.equal(list(doc, 'emoji').children.length, Math.min(192, emoji.entries.filter((entry) => entry.category === emoji.categories[0].id).length));
  input.value = 'no-result-93847'; input.dispatch('input'); await settle();
  assert.equal(list(doc, 'emoji').children.length, 0); assert.equal(doc.querySelector('[data-empty]').hidden, false);
  textTab.click(); assert.equal(doc.querySelector('[data-empty]').hidden, true);
  assert.equal(list(doc, 'kaomoji').children.length, 96);
});

test('entity initializer: retains first 48 nodes, exact literal copy, more, Korean search and reset', async (t) => {
  const doc = documentFromHTML(readBuild('entities')); withDocument(t, doc);
  const items = doc.querySelector('[data-results]'), initial = [...items.children], copied = [];
  await runInitializer('entities', doc, dependencies, fetchData(entities), { clipboard: { writeText: async (value) => copied.push(value) } });
  assert.deepEqual(items.children, initial);
  const target = items.querySelector('[data-copy-value="&lt;"]'); target.click(); await settle();
  assert.equal(copied.at(-1), '&lt;');
  doc.querySelector('[data-more]').click(); assert.equal(items.children.length, 96);
  assert.ok(doc.querySelector('[data-count]').textContent.includes('96개 표시'));
  const input = doc.querySelector('#entity-query'); input.value = '저작권'; input.dispatch('input'); await settle();
  assert.ok(items.textContent.includes('&copy;'));
  items.querySelector('button').click(); await settle();
  assert.equal(copied.at(-1), items.querySelector('code').textContent);
  input.value = 'no-result-93847'; input.dispatch('input'); await settle();
  assert.equal(items.children.length, 0); assert.equal(doc.querySelector('[data-empty]').hidden, false);
  doc.querySelector('[data-clear]').click(); assert.equal(items.children.length, 48);
});

test('failed data loading preserves disabled static lists and inactive text panel', async (t) => {
  for (const [route, selector, count] of [['characters', '[data-mode-results="emoji"]', 192], ['entities', '[data-results]', 48]]) {
    const doc = documentFromHTML(readBuild(route)); withDocument(t, doc);
    const items = doc.querySelector(selector), initial = [...items.children];
    await runInitializer(route, doc, dependencies, async () => { throw new Error('offline'); });
    assert.deepEqual(items.children, initial); assert.equal(items.children.length, count);
    assert.ok(items.querySelectorAll('button').every((node) => node.disabled));
  }
});

test('first text-panel activation after empty emoji search clears empty state without replacing static text', async (t) => {
  const doc = documentFromHTML(readBuild('characters')); withDocument(t, doc);
  const initial = [...list(doc, 'kaomoji').children];
  await runInitializer('characters', doc, dependencies, fetchData(emoji));
  const input = doc.querySelector('#character-query');
  input.value = 'no-result-93847'; input.dispatch('input'); await settle();
  assert.equal(doc.querySelector('[data-empty]').hidden, false);
  doc.querySelector('#kaomoji-tab').click();
  assert.equal(doc.querySelector('[data-empty]').hidden, true);
  assert.deepEqual(list(doc, 'kaomoji').children, initial);
  assert.equal(input.value, '');
});

test('all built pages retain unique canonical, OG/Twitter metadata and valid JSON-LD', () => {
  for (const route of ['', 'characters', 'entities', 'colors']) {
    const doc = documentFromHTML(readBuild(route));
    const canonical = doc.querySelectorAll('link').filter((node) => node.getAttribute('rel') === 'canonical');
    const expected = `https://poroyun.github.io/tools/${route ? route + '/' : ''}`;
    assert.equal(canonical.length, 1); assert.equal(canonical[0].getAttribute('href'), expected);
    const metadata = doc.querySelectorAll('meta');
    const title = doc.querySelector('title').textContent;
    const description = metadata.find((node) => node.getAttribute('name') === 'description').getAttribute('content');
    const values = { 'og:type': 'website', 'og:site_name': 'Tools', 'og:title': title, 'og:description': description,
      'og:url': expected, 'twitter:card': 'summary', 'twitter:title': title, 'twitter:description': description };
    for (const [key, value] of Object.entries(values)) {
      const matches = metadata.filter((node) => (node.getAttribute('property') || node.getAttribute('name')) === key);
      assert.equal(matches.length, 1); assert.equal(matches[0].getAttribute('content'), value);
    }
    const schemas = doc.querySelectorAll('script').filter((node) => node.getAttribute('type') === 'application/ld+json');
    assert.equal(schemas.length, 1);
    const schema = JSON.parse(schemas[0].textContent);
    assert.equal(schema.url, expected); assert.equal(schema.description, description);
    assert.equal(schema['@type'], route ? 'WebApplication' : 'WebSite');
    assert.deepEqual(Object.keys(schema).sort(), ['@context', '@type', 'description', 'name', 'url']);
  }
});
