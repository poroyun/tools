// Run after npm run build: node --test tests/accessibility.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';
import { documentFromHTML, readBuild } from './helpers/static-dom.mjs';

const routes = ['', 'characters', 'entities', 'colors', 'about', 'contact', 'privacy'];
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const descendants = (node) => [node, ...node.children.flatMap(descendants)];

test('all built pages have a first skip link, focusable main, landmarks and valid ARIA references', () => {
  for (const route of routes) {
    const doc = documentFromHTML(readBuild(route)), nodes = descendants(doc);
    const skip = doc.querySelector('a');
    assert.equal(skip.textContent, '본문 바로가기');
    assert.equal(skip.getAttribute('href'), '#main-content');
    assert.equal(doc.querySelector('#main-content').tagName, 'main');
    assert.equal(doc.querySelector('#main-content').getAttribute('tabindex'), '-1');
    for (const tag of ['header', 'nav', 'main', 'footer']) assert.ok(doc.querySelector(tag), `${route}: ${tag}`);
    assert.equal(doc.querySelectorAll('h1').length, 1);
    const ids = nodes.map((node) => node.getAttribute('id')).filter(Boolean);
    assert.equal(ids.length, new Set(ids).size);
    for (const node of nodes) {
      for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
        for (const id of (node.getAttribute(attr) || '').split(/\s+/).filter(Boolean)) assert.ok(ids.includes(id), `${route}: ${attr}=${id}`);
      }
    }
  }
});

test('form controls have labels and buttons have accessible names in built HTML', () => {
  for (const route of routes) {
    const doc = documentFromHTML(readBuild(route));
    const labelTargets = doc.querySelectorAll('label').map((node) => node.getAttribute('for'));
    for (const tag of ['input', 'textarea']) {
      for (const field of doc.querySelectorAll(tag)) assert.ok(labelTargets.includes(field.getAttribute('id')) || field.getAttribute('aria-label'));
    }
    for (const button of doc.querySelectorAll('button')) {
      assert.ok(button.getAttribute('aria-label') || button.textContent.trim(), `${route}: unnamed button`);
    }
  }
});

test('available home cards omit badges while keeping three destination links', () => {
  const doc = documentFromHTML(readBuild(''));
  assert.equal(doc.querySelectorAll('.tool-card__status').length, 0);
  assert.ok(!doc.querySelector('.tools-grid').textContent.includes('이용 가능'));
  assert.deepEqual(doc.querySelector('.tools-grid').querySelectorAll('a').map((node) => node.getAttribute('href')).sort(),
    ['/tools/characters/', '/tools/colors/', '/tools/entities/'].sort());
  assert.match(read('src/components/ToolCard.astro'), /status === 'coming-soon' && <span class="tool-card__status">준비 중/);
});

test('text items use wrapping flex with 8px padding; Unicode emoji retain their grid', () => {
  const css = compile(fileURLToPath(new URL('../src/styles/characters.scss', import.meta.url))).css;
  assert.match(css, /\.character-grid\s*\{[^}]*display: grid;/);
  assert.match(css, /\.character-grid:not\(\.character-grid--text\)\s*\{[^}]*grid-template-columns: repeat\(auto-fill, minmax\(3rem, 1fr\)\)/);
  assert.match(css, /\.character-grid--text\s*\{[^}]*display: flex;[^}]*flex-wrap: wrap;/);
  assert.match(css, /\.character-grid--text \.character-copy\s*\{[^}]*max-width: 100%;[^}]*padding-inline: 8px;[^}]*white-space: pre-wrap;[^}]*overflow-wrap: anywhere;/);
  for (const rule of css.matchAll(/\.character-grid--text\s*\{([^}]+)\}/g)) assert.ok(!rule[1].includes('grid-template-columns'));
});

test('text and accent color pairs meet contrast thresholds; light borders retain a documented limitation', () => {
  const variables = read('src/styles/abstracts/_variables.scss');
  const color = (name) => variables.match(new RegExp(`\\$color-${name}: (#[a-fA-F0-9]+);`))[1];
  const luminance = (hex) => {
    const full = hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex;
    const values = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return values.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  };
  assert.equal(color('border'), '#dce2ec');
  // Design restoration is deliberate. These borders do NOT meet 3:1 for
  // controls whose only identifying cue is their boundary (e.g. empty inputs).
  // Do not treat passing text contrast tests as full non-text AA conformance.
  for (const background of ['surface', 'background']) {
    const [dark, light] = [luminance(color('border')), luminance(color(background))].sort((a, b) => a - b);
    assert.ok((light + 0.05) / (dark + 0.05) < 3);
  }
  for (const background of ['surface', 'background']) {
    for (const [foreground, threshold] of [['text', 4.5], ['accent', 4.5]]) {
      const [dark, light] = [luminance(color(foreground)), luminance(color(background))].sort((a, b) => a - b);
      assert.ok((light + 0.05) / (dark + 0.05) >= threshold, `${foreground} on ${background}`);
    }
  }
});

test('tool controls restore light default borders without changing selection, focus or error cues', () => {
  for (const file of ['characters', 'entities', 'colors']) {
    const css = compile(fileURLToPath(new URL(`../src/styles/${file}.scss`, import.meta.url))).css;
    assert.ok(!css.includes('#838fa3'));
    assert.match(css, /border: 1px solid #dce2ec/);
  }
  const characters = compile(fileURLToPath(new URL('../src/styles/characters.scss', import.meta.url))).css;
  assert.match(characters, /button\[aria-selected=true\][^{]*\{[^}]*background: #3056d3/);
  const global = compile(fileURLToPath(new URL('../src/styles/global.scss', import.meta.url))).css;
  assert.match(global, /:focus-visible\s*\{[^}]*outline: 2px solid #3056d3/);
  const colors = compile(fileURLToPath(new URL('../src/styles/colors.scss', import.meta.url))).css;
  assert.match(colors, /input\[aria-invalid=true\][^{]*\{[^}]*border-style: dashed;[^}]*border-width: 2px/);
});
