// Run after npm run build: node --test tests/sitemap.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sax from 'sax';
import { parse, walkSync } from 'ultrahtml';

const dist = new URL('../dist/', import.meta.url);
const site = 'https://poroyun.github.io/tools/';
const namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const expected = ['', 'characters/', 'entities/', 'colors/'].map((path) => site + path).sort();
const read = (path) => readFileSync(new URL(path, dist), 'utf8');

function parseSitemap(xml) {
  const parser = sax.parser(true, { xmlns: true });
  const stack = [], locations = [], tags = [];
  let root, text = '';
  parser.onopentag = (node) => {
    root ??= node.local;
    assert.equal(node.uri, namespace, `Unexpected XML namespace for ${node.name}`);
    stack.push(node.local);
    tags.push(node.local);
    if (node.local === 'loc') text = '';
  };
  parser.ontext = (value) => { if (stack.at(-1) === 'loc') text += value; };
  parser.onclosetag = () => {
    if (stack.pop() === 'loc') locations.push(text.trim());
  };
  parser.write(xml).close(); // Strict parser throws on malformed XML.
  return { root, locations, tags };
}

function builtPath(url) {
  const parsed = new URL(url);
  assert.equal(parsed.origin, new URL(site).origin);
  assert.ok(parsed.pathname.startsWith('/tools/'));
  assert.ok(!parsed.pathname.includes('/tools/tools/'));
  assert.equal(parsed.search, '');
  assert.equal(parsed.hash, '');
  return parsed.pathname.slice('/tools/'.length);
}

function sitemapURLs() {
  const index = parseSitemap(read('sitemap-index.xml'));
  assert.equal(index.root, 'sitemapindex');
  assert.deepEqual(index.locations, [site + 'sitemap-0.xml']);
  const urls = [];
  for (const url of index.locations) {
    const child = parseSitemap(read(builtPath(url)));
    assert.equal(child.root, 'urlset');
    assert.ok(child.tags.every((tag) => ['urlset', 'url', 'loc'].includes(tag)),
      'Do not invent lastmod, priority, changefreq, or other metadata');
    urls.push(...child.locations);
  }
  assert.ok(index.tags.every((tag) => ['sitemapindex', 'sitemap', 'loc'].includes(tag)));
  return urls;
}

test('valid sitemap index and child XML contain exactly four unique canonical page URLs', () => {
  const urls = sitemapURLs();
  assert.equal(urls.length, 4);
  assert.equal(new Set(urls).size, 4);
  assert.deepEqual([...urls].sort(), expected);
  for (const url of urls) {
    assert.ok(url.endsWith('/'));
    const html = read(builtPath(url) + 'index.html');
    const canonicals = [];
    walkSync(parse(html), (node) => {
      if (node.name === 'link' && node.attributes.rel === 'canonical') canonicals.push(node.attributes.href);
    });
    assert.deepEqual(canonicals, [url]);
  }
});

test('all built HTML pages are included; JSON, text, scripts and duplicate sitemap.xml are absent', () => {
  const htmlURLs = readdirSync(dist, { recursive: true })
    .filter((path) => path.endsWith('.html'))
    .map((path) => site + path.replace(/index\.html$/, ''));
  assert.deepEqual(htmlURLs.sort(), expected);
  assert.deepEqual(sitemapURLs().sort(), htmlURLs);
  assert.deepEqual(readdirSync(dist).filter((path) => /^sitemap.*\.xml$/.test(path)).sort(),
    ['sitemap-0.xml', 'sitemap-index.xml']);
});

test('project robots.txt is copied to dist and points to the actual absolute sitemap index', () => {
  const robots = read('robots.txt');
  assert.equal(robots, readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8'));
  const directives = robots.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  assert.deepEqual(directives, ['User-agent: *', 'Allow: /', `Sitemap: ${site}sitemap-index.xml`]);
  assert.equal(fileURLToPath(new URL(builtPath(site + 'robots.txt'), dist)), fileURLToPath(new URL('robots.txt', dist)));
  sitemapURLs(); // Sitemap referenced by robots.txt and its child must exist.
});
