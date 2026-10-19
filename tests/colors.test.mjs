import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHex, toHex, rgbToHsl, hslToRgb, rgbToHsv, hsvToRgb, formatColor, normalizeHue } from '../src/scripts/colors/convert.ts';
import { INITIAL_HEX, createColorState, updateColor } from '../src/scripts/colors/state.ts';
import { pickScreenColor, supportsEyeDropper } from '../src/scripts/colors/eyedropper.ts';
import { palette } from '../src/data/colors/palette.ts';
import { tools } from '../src/data/tools.ts';
import { createEntityCopier } from '../src/scripts/entities/copy.ts';
import { pointerToSV, keyboardSV } from '../src/scripts/colors/sv.ts';

const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const rgbClose = (actual, expected) => { for (const key of ['r', 'g', 'b', 'a']) close(actual[key], expected[key]); };

test('최초 색상은 보라 팔레트와 일치하고 Alpha·HSL·HSV·출력 동기화', () => {
  assert.equal(INITIAL_HEX, '#8B5CF6');
  const state = createColorState(), formats = formatColor(state.color, state.hsl);
  assert.equal(state.color.a, 1);
  assert.deepEqual(state.color, { r: 139, g: 92, b: 246, a: 1 });
  assert.deepEqual(state.hsl, rgbToHsl(state.color));
  assert.deepEqual(state.hsv, rgbToHsv(state.color));
  assert.equal(formats.hex, INITIAL_HEX);
  assert.equal(formats.hex8, '#8B5CF6FF');
  assert.equal(palette.filter((entry) => entry.hex === formats.hex).length, 1);
});

test('SV 포인터 좌표: 모서리·중앙·영역 밖 드래그·크기 변경', () => {
  const rect = { left: 10, top: 20, width: 200, height: 100 };
  assert.deepEqual(pointerToSV(10, 20, rect), { s: 0, v: 100 });
  assert.deepEqual(pointerToSV(210, 20, rect), { s: 100, v: 100 });
  assert.deepEqual(pointerToSV(110, 70, rect), { s: 50, v: 50 });
  assert.deepEqual(pointerToSV(-100, 500, rect), { s: 0, v: 0 });
  assert.deepEqual(pointerToSV(110, 70, { ...rect, width: 100 }), { s: 100, v: 50 });
  assert.equal(pointerToSV(0, 0, { ...rect, width: 0 }), null);
});

test('SV 방향키와 Shift 조절 및 범위 제한', () => {
  const hsv = { h: 120, s: 50, v: 50 };
  assert.deepEqual(keyboardSV(hsv, 'ArrowRight'), { s: 51, v: 50 });
  assert.deepEqual(keyboardSV(hsv, 'ArrowLeft', true), { s: 40, v: 50 });
  assert.deepEqual(keyboardSV(hsv, 'ArrowUp', true), { s: 50, v: 60 });
  assert.deepEqual(keyboardSV({ ...hsv, v: 0 }, 'ArrowDown'), { s: 50, v: 0 });
  assert.deepEqual(keyboardSV({ ...hsv, s: 100 }, 'ArrowRight'), { s: 100, v: 50 });
  assert.equal(keyboardSV(hsv, 'Tab'), null);
});

test('SV·Hue 변경은 Alpha 유지, 검정·흰색에서 Hue·채도 의도 유지', () => {
  let state = createColorState('#FF000080');
  state = updateColor(state, { type: 'sv', s: 100, v: 0 }).state;
  state = updateColor(state, { type: 'hue', value: 240 }).state;
  assert.equal(toHex(state.color), '#000000');
  assert.equal(state.hsv.h, 240); assert.equal(state.hsv.s, 100);
  state = updateColor(state, { type: 'sv', s: state.hsv.s, v: 100 }).state;
  assert.equal(formatColor(state.color).hex8, '#0000FF80');
  state = updateColor(state, { type: 'sv', s: 0, v: 100 }).state;
  state = updateColor(state, { type: 'hue', value: 120 }).state;
  assert.equal(toHex(state.color), '#FFFFFF');
  state = updateColor(state, { type: 'sv', s: 100, v: 100 }).state;
  assert.equal(formatColor(state.color).hex8, '#00FF0080');
  for (const action of [{ type: 'sv', s: -1, v: 50 }, { type: 'sv', s: 50, v: NaN }, { type: 'hue', value: 361 }]) {
    assert.equal(updateColor(state, action).state, state);
  }
});

test('HEX·팔레트·스포이드·RGB·HSL에서 HSV 핸들 위치 동기화', () => {
  let state = createColorState();
  for (const action of [{ type: 'hex', value: '#00FF0080' }, { type: 'palette', value: '#3056D3' },
    { type: 'picker', value: '#FF00FF' }, { type: 'rgb', channel: 'g', value: 128 },
    { type: 'hsl', channel: 'l', value: 35 }]) {
    state = updateColor(state, action).state;
    const expected = rgbToHsv(state.color);
    close(state.hsv.h, expected.h); close(state.hsv.s, expected.s); close(state.hsv.v, expected.v);
  }
  state = updateColor(state, { type: 'alpha', value: 0.1234 }).state;
  const before = state.hsv;
  state = updateColor(state, { type: 'alpha', value: 0.8 }).state;
  assert.deepEqual(state.hsv, before);
});

test('HEX 3/6/8자리, 공백·대소문자, Alpha 파싱', () => {
  assert.deepEqual(parseHex(' #aBc '), { r: 170, g: 187, b: 204, a: 1 });
  assert.deepEqual(parseHex('#3056d3'), { r: 48, g: 86, b: 211, a: 1 });
  assert.deepEqual(parseHex('#FF000080'), { r: 255, g: 0, b: 0, a: 128 / 255 });
  assert.equal(parseHex('#00000000').a, 0);
  assert.equal(parseHex('#FFFFFFFF').a, 1);
});

test('불완전·잘못된 HEX 입력 거부', () => {
  for (const value of ['', '#', '#1', '#12', '#1234', '#12345', '#1234567', '#123456789', '#GG0000', 'red', '3056D3', 'rgb(0,0,0)', '#12 3456']) {
    assert.equal(parseHex(value), null, value);
  }
});

test('HEX ↔ RGB 및 256개 Alpha 바이트의 정확한 왕복', () => {
  for (const hex of ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#3056D3', '#AABBCC']) assert.equal(toHex(parseHex(hex)), hex);
  for (let alpha = 0; alpha <= 255; alpha++) {
    const hex = '#123456' + alpha.toString(16).padStart(2, '0').toUpperCase();
    assert.equal(toHex(parseHex(hex), true), hex);
  }
});

test('대표 색상 및 무채색 HSL/HSV', () => {
  for (const [hex, h, s, l, v] of [
    ['#FF0000', 0, 100, 50, 100], ['#FFFF00', 60, 100, 50, 100], ['#00FF00', 120, 100, 50, 100],
    ['#00FFFF', 180, 100, 50, 100], ['#0000FF', 240, 100, 50, 100], ['#FF00FF', 300, 100, 50, 100],
    ['#000000', 0, 0, 0, 0], ['#FFFFFF', 0, 0, 100, 100], ['#808080', 0, 0, 128 / 255 * 100, 128 / 255 * 100],
  ]) {
    const color = parseHex(hex), hsl = rgbToHsl(color), hsv = rgbToHsv(color);
    close(hsl.h, h); close(hsl.s, s); close(hsl.l, l);
    close(hsv.h, h); close(hsv.s, s); close(hsv.v, v);
    rgbClose(hslToRgb(hsl), color); rgbClose(hsvToRgb(hsv), color);
  }
});

test('RGB ↔ HSL/HSV 표본 격자 왕복 및 Alpha 보존', () => {
  for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 51) for (let b = 0; b <= 255; b += 85) {
    const color = { r, g, b, a: 0.37123 };
    rgbClose(hslToRgb(rgbToHsl(color), color.a), color);
    rgbClose(hsvToRgb(rgbToHsv(color), color.a), color);
  }
});

test('Hue 순환과 경계값, 유효하지 않은 범위 검증', () => {
  assert.equal(normalizeHue(360), 0); assert.equal(normalizeHue(-60), 300);
  for (const h of [0, 360, 720, -360]) rgbClose(hslToRgb({ h, s: 100, l: 50 }), parseHex('#FF0000'));
  rgbClose(hsvToRgb({ h: -120, s: 100, v: 100 }), parseHex('#0000FF'));
  assert.throws(() => hslToRgb({ h: NaN, s: 100, l: 50 }), RangeError);
  assert.throws(() => hslToRgb({ h: 0, s: 101, l: 50 }), RangeError);
  assert.throws(() => hsvToRgb({ h: 0, s: 50, v: -1 }), RangeError);
  assert.throws(() => toHex({ r: 256, g: 0, b: 0, a: 1 }), RangeError);
  assert.throws(() => toHex({ r: 0, g: 0, b: 0, a: Infinity }), RangeError);
});

test('출력 반올림 정책과 HSV를 CSS 함수로 출력하지 않음', () => {
  const formats = formatColor({ r: 0.5, g: 127.5, b: 254.5, a: 0.5 });
  assert.equal(formats.hex, '#0180FF');
  assert.equal(formats.hex8, '#0180FF80');
  assert.equal(formats.rgb, 'rgb(1, 128, 255)');
  assert.equal(formats.rgba, 'rgba(1, 128, 255, 0.5)');
  assert.equal(formatColor(parseHex('#FF000080')).rgba, 'rgba(255, 0, 0, 0.502)');
  assert.equal(formatColor(parseHex('#0000FF')).hsv, 'HSV: 240°, 100%, 100%');
  assert.equal(formatColor(hslToRgb({ h: 359.9999, s: 100, l: 50 })).hsl, 'hsl(0, 100%, 50%)');
  assert.equal(Object.keys(formats).length, 7);
});

test('입력 변경 시 동일 상태에서 모든 형식 동기화 및 잘못된 입력 시 상태 유지', () => {
  let state = createColorState();
  state = updateColor(state, { type: 'hex', value: '#00FF0080' }).state;
  assert.equal(formatColor(state.color).hex8, '#00FF0080');
  state = updateColor(state, { type: 'rgb', channel: 'r', value: 255 }).state;
  assert.equal(formatColor(state.color).hex8, '#FFFF0080');
  state = updateColor(state, { type: 'hsl', channel: 'h', value: 240 }).state;
  assert.equal(formatColor(state.color, state.hsl).hex8, '#0000FF80');
  state = updateColor(state, { type: 'alpha', value: 0.25 }).state;
  assert.equal(formatColor(state.color).hex8, '#0000FF40');
  for (const action of [{ type: 'hex', value: '#12' }, { type: 'rgb', channel: 'r', value: NaN },
    { type: 'rgb', channel: 'g', value: -1 }, { type: 'hsl', channel: 'h', value: 361 },
    { type: 'hsl', channel: 's', value: 101 }, { type: 'alpha', value: 1.01 }]) {
    const result = updateColor(state, action);
    assert.equal(result.state, state); assert.ok(result.error);
  }
});

test('HSL 내부 정밀도 및 검정·흰색의 조정 의도 유지', () => {
  let state = createColorState('#000');
  for (const [channel, value] of [['h', 217.12345678], ['s', 63.12345678], ['l', 0]]) state = updateColor(state, { type: 'hsl', channel, value }).state;
  assert.equal(state.hsl.h, 217.12345678); assert.equal(state.hsl.s, 63.12345678);
  state = updateColor(state, { type: 'hsl', channel: 'l', value: 48.12345678 }).state;
  const original = { ...state.color };
  for (let i = 0; i < 100; i++) {
    formatColor(state.color, state.hsl);
    state = updateColor(state, { type: 'alpha', value: i % 2 ? 1 : 0.25 }).state;
  }
  for (const key of ['r', 'g', 'b']) assert.equal(state.color[key], original[key]);
  state = updateColor(state, { type: 'hsl', channel: 'l', value: 100 }).state;
  assert.equal(toHex(state.color), '#FFFFFF'); assert.equal(state.hsl.s, 63.12345678);
  state = updateColor(state, { type: 'hsl', channel: 'l', value: 48.12345678 }).state;
  for (const key of ['r', 'g', 'b']) close(state.color[key], original[key]);
  assert.equal(updateColor(state, { type: 'hsl', channel: 'h', value: 360 }).state.hsl.h, 0);
});

test('팔레트 선택 및 스포이드 RGB 변경 시 Alpha 유지', () => {
  assert.equal(palette.length, 20);
  assert.equal(new Set(palette.map((p) => p.hex)).size, 20);
  for (const entry of palette) {
    const state = updateColor(createColorState('#00000000'), { type: 'palette', value: entry.hex }).state;
    assert.equal(toHex(state.color), entry.hex); assert.equal(state.color.a, 1);
  }
  const before = createColorState('#FF000080');
  const after = updateColor(before, { type: 'picker', value: '#00FF00' }).state;
  assert.equal(after.color.a, 128 / 255); assert.equal(toHex(after.color), '#00FF00');
  assert.ok(updateColor(before, { type: 'palette', value: '#BADBAD' }).error);
  assert.ok(updateColor(before, { type: 'picker', value: '#FFF' }).error);
});

test('EyeDropper 미지원·비보안 환경에서는 실행하지 않음', async () => {
  let constructed = 0;
  class Fake { constructor() { constructed++; } open() { return Promise.resolve({ sRGBHex: '#FFFFFF' }); } }
  assert.equal(supportsEyeDropper({ isSecureContext: true }), false);
  assert.equal(supportsEyeDropper({ isSecureContext: false, EyeDropper: Fake }), false);
  assert.deepEqual(await pickScreenColor({ isSecureContext: true }), { status: 'unsupported' });
  assert.deepEqual(await pickScreenColor({ isSecureContext: false, EyeDropper: Fake }), { status: 'unsupported' });
  assert.equal(constructed, 0);
});

test('EyeDropper open은 호출 직후 실행, 선택·취소·오류 처리', async () => {
  let opened = false;
  class Selected { open() { opened = true; return Promise.resolve({ sRGBHex: '#abcdef' }); } }
  const promise = pickScreenColor({ isSecureContext: true, EyeDropper: Selected });
  assert.equal(opened, true);
  assert.deepEqual(await promise, { status: 'selected', hex: '#abcdef' });
  class Cancelled { open() { return Promise.reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' })); } }
  class Failed { open() { return Promise.reject(new Error('Denied')); } }
  class Invalid { open() { return Promise.resolve({ sRGBHex: 'bad' }); } }
  assert.deepEqual(await pickScreenColor({ isSecureContext: true, EyeDropper: Cancelled }), { status: 'cancelled' });
  assert.deepEqual(await pickScreenColor({ isSecureContext: true, EyeDropper: Failed }), { status: 'error' });
  assert.deepEqual(await pickScreenColor({ isSecureContext: true, EyeDropper: Invalid }), { status: 'error' });
});

test('색상 코드 복사 성공·실패 및 수동 복사 대안', async () => {
  const events = [], value = formatColor(createColorState().color).hsla;
  const ui = { reset() {}, success() { events.push('toast'); }, failure(text) { events.push(['manual', text]); } };
  await createEntityCopier(ui, async (text) => events.push(text))(value);
  assert.deepEqual(events, [value, 'toast']); events.length = 0;
  await createEntityCopier(ui)(value);
  assert.deepEqual(events, [['manual', value]]);
});

test('공개 도구 경로 및 기존 PC 12px / 모바일 13px 칩 폰트 유지', () => {
  const entry = tools.find((tool) => tool.href === '/colors/');
  assert.equal(entry.status, 'available');
  assert.equal('/tools' + entry.href, '/tools/colors/');
  assert.equal(tools.find((tool) => tool.href === '/characters/').status, 'available');
  assert.equal(tools.find((tool) => tool.href === '/entities/').status, 'available');
  const css = readFileSync(new URL('../src/styles/global.scss', import.meta.url), 'utf8');
  const nav = css.slice(css.indexOf('.site-nav__item {'), css.indexOf('a.site-nav__item:'));
  assert.ok(nav.includes('font-size: 0.8125rem;'));
  assert.match(nav, /@include mixins\.from\(vars\.\$breakpoint-tablet\)\s*\{\s*font-size: 0\.75rem;/);
});
