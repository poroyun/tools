// Run after npm run build: node --test --experimental-strip-types tests/analytics-consent.test.mjs
import test from 'node:test';
import { documentFromHTML, readBuild } from './helpers/static-dom.mjs';
import assert from 'node:assert/strict';
import { createAnalyticsConsent, CONSENT_KEY, MEASUREMENT_ID, readConsent } from '../src/scripts/analytics/consent.ts';

function environment(saved = null) {
  const values = new Map(saved ? [[CONSENT_KEY, saved]] : []), session = new Map();
  const storage = (map) => ({ getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key) });
  const win = { localStorage: storage(values), sessionStorage: storage(session), location: { hostname: 'poroyun.github.io' } };
  const scripts = [], writes = [];
  let cookies = '';
  const doc = {
    get cookie() { return cookies; },
    set cookie(value) { writes.push(value); },
    createElement: () => ({ remove() { this.removed = true; } }),
    head: { append: (script) => scripts.push(script) },
  };
  return { win, doc, scripts, values, session, writes, cookies: (value) => { cookies = value; } };
}
const commands = (env, command) => (env.win.dataLayer || []).map((args) => [...args]).filter((args) => args[0] === command);
const controller = (env) => createAnalyticsConsent(env.win, env.doc, '/tools/');

test('no choice, invalid choice and denial never inject a Google tag or initialize measurement', () => {
  for (const value of [null, 'true', 'denied']) {
    const env = environment(value), consent = controller(env);
    assert.equal(env.scripts.length, 0);
    assert.equal(env.win.dataLayer, undefined);
    consent.choose('denied');
    assert.equal(env.scripts.length, 0);
    assert.equal(env.win.dataLayer, undefined);
    assert.equal(env.win[`ga-disable-${MEASUREMENT_ID}`], true);
    assert.equal(readConsent(env.win), 'denied');
  }
});

test('grant loads one official tag; config and page_view occur once only after load', () => {
  const env = environment(), consent = controller(env);
  assert.equal(consent.choose('granted'), true);
  consent.choose('granted');
  assert.equal(env.scripts.length, 1);
  assert.equal(env.scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`);
  assert.equal(commands(env, 'config').length, 0);
  env.scripts[0].onload(); env.scripts[0].onload(); consent.choose('granted');
  assert.equal(commands(env, 'config').length, 1);
  assert.equal(commands(env, 'config')[0][2].send_page_view, false);
  assert.equal(commands(env, 'config')[0][2].cookie_path, '/tools');
  assert.equal(commands(env, 'event').filter((args) => args[1] === 'page_view').length, 1);
  assert.equal(readConsent(env.win), 'granted');
  const next = environment(env.values.get(CONSENT_KEY)); controller(next);
  assert.equal(next.scripts.length, 1);
});

test('withdrawal disables before consent update, deletes only owned cookies and does not repeat a page_view on regrant', () => {
  const env = environment('granted'), consent = controller(env);
  env.scripts[0].onload();
  env.cookies('tools_ga4_ga=abc; tools_ga4_ga_SSGW5S1X9W=def; _ga=other-project; unrelated=x');
  consent.choose('denied');
  assert.equal(env.win[`ga-disable-${MEASUREMENT_ID}`], true);
  assert.equal(commands(env, 'consent').at(-1)[2].analytics_storage, 'denied');
  assert.ok(env.writes.some((value) => value.startsWith('tools_ga4_ga=;') && value.includes('Path=/tools;')));
  assert.ok(env.writes.every((value) => value.startsWith('tools_ga4_')));
  consent.choose('granted');
  assert.equal(env.win[`ga-disable-${MEASUREMENT_ID}`], false);
  assert.equal(env.scripts.length, 1);
  assert.equal(commands(env, 'config').length, 1);
  assert.equal(commands(env, 'event').length, 1);
});

test('withdrawal during loading blocks late initialization and a later grant can start safely', () => {
  const env = environment(), consent = controller(env);
  consent.choose('granted'); const old = env.scripts[0];
  consent.choose('denied'); assert.equal(old.removed, true);
  old.onload(); assert.equal(commands(env, 'config').length, 0);
  consent.choose('granted'); old.onload();
  assert.equal(commands(env, 'config').length, 0);
  env.scripts[1].onload();
  assert.equal(commands(env, 'config').length, 1);
  assert.equal(commands(env, 'event').length, 1);
});

test('storage failures are handled; session fallback overrides a stale persistent grant', () => {
  const env = environment('granted'), consent = controller(env);
  env.win.localStorage.setItem = () => { throw new Error('read-only'); };
  env.win.localStorage.removeItem = () => { throw new Error('read-only'); };
  assert.equal(consent.choose('denied'), false);
  assert.equal(readConsent(env.win), 'denied');
  const next = createAnalyticsConsent(env.win, env.doc, '/tools');
  assert.equal(next.choice, 'denied');
  const blocked = environment();
  Object.defineProperty(blocked.win, 'localStorage', { get() { throw new Error('blocked'); } });
  Object.defineProperty(blocked.win, 'sessionStorage', { get() { throw new Error('blocked'); } });
  const memory = controller(blocked);
  assert.equal(memory.choice, null);
  assert.equal(memory.choose('granted'), false);
  assert.equal(memory.choose('denied'), false);
  assert.equal(blocked.win[`ga-disable-${MEASUREMENT_ID}`], true);
});

test('storage synchronization revokes measurement without loading another tag', () => {
  const env = environment('granted'), consent = controller(env);
  env.scripts[0].onload(); env.values.set(CONSENT_KEY, 'denied'); consent.sync();
  assert.equal(consent.choice, 'denied');
  assert.equal(env.win[`ga-disable-${MEASUREMENT_ID}`], true);
  env.values.delete(CONSENT_KEY); consent.sync(); assert.equal(consent.choice, null);
  assert.equal(env.scripts.length, 1);
});

test('a failed external tag can be retried after a fresh grant without duplicate configuration', () => {
  const env = environment(), consent = controller(env);
  consent.choose('granted'); env.scripts[0].onerror();
  assert.equal(env.scripts[0].removed, true);
  consent.choose('granted'); env.scripts[1].onload();
  assert.equal(commands(env, 'config').length, 1);
  assert.equal(commands(env, 'event').length, 1);
});

test('a stale grant in read-only storage is not honored when all fallback writes are blocked', () => {
  const env = environment('granted');
  env.win.localStorage.setItem = () => { throw new Error('read-only'); };
  Object.defineProperty(env.win, 'sessionStorage', { get() { throw new Error('blocked'); } });
  assert.equal(readConsent(env.win), null);
  controller(env);
  assert.equal(env.scripts.length, 0);
});

test('all four built pages share one consent panel/settings entry and preserve SEO verification without loading Google tags', () => {
  for (const route of ['', 'characters', 'entities', 'colors']) {
    const doc = documentFromHTML(readBuild(route));
    assert.equal(doc.querySelectorAll('[data-consent-panel]').length, 1);
    assert.equal(doc.querySelectorAll('[data-cookie-settings]').length, 1);
    assert.equal(doc.querySelector('[data-consent-panel]').hidden, true);
    assert.equal(doc.querySelectorAll('[data-consent-choice]').length, 2);
    assert.ok(doc.querySelectorAll('script').every((script) => !(script.getAttribute('src') || '').includes('googletagmanager.com')));
    const verify = doc.querySelectorAll('meta').filter((node) => node.getAttribute('name') === 'google-site-verification');
    assert.equal(verify.length, 1);
    assert.equal(verify[0].getAttribute('content'), 'Dtmf2I2OOJ282y9TESuvOAZINwaIzNX6GmqlOz_bD-I');
    assert.equal(doc.querySelectorAll('link').filter((node) => node.getAttribute('rel') === 'canonical').length, 1);
  }
});
