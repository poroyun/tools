import { parseHex, rgbToHsl, rgbToHsv, hslToRgb, hsvToRgb, inRange, normalizeHue, type RGBA, type HSL, type HSV } from './convert.ts';
import { palette } from '../../data/colors/palette.ts';

export const INITIAL_HEX = '#8B5CF6';
export interface ColorState { color: RGBA; hsl: HSL; hsv: HSV }
export type ColorAction = { type: 'hex'; value: string }
  | { type: 'picker'; value: string }
  | { type: 'rgb'; channel: 'r' | 'g' | 'b'; value: number }
  | { type: 'hsl'; channel: keyof HSL; value: number }
  | { type: 'alpha'; value: number }
  | { type: 'sv'; s: number; v: number }
  | { type: 'hue'; value: number }
  | { type: 'palette'; value: string };

export function createColorState(hex = INITIAL_HEX): ColorState {
  const color = parseHex(hex);
  if (!color) throw new Error('잘못된 초기 색상입니다.');
  return { color, hsl: rgbToHsl(color), hsv: rgbToHsv(color) };
}

export function updateColor(state: ColorState, action: ColorAction): { state: ColorState; error?: string } {
  const fail = (error: string) => ({ state, error });
  if (action.type === 'hex' || action.type === 'picker' || action.type === 'palette') {
    if (action.type === 'palette' && !palette.some((entry) => entry.hex === action.value)) return fail('팔레트 색상을 선택해 주세요.');
    if (action.type === 'picker' && !/^#[\da-f]{6}$/i.test(action.value)) return fail('색상 선택 결과를 읽지 못했습니다.');
    const color = parseHex(action.value);
    if (!color) return fail('#RGB, #RRGGBB 또는 #RRGGBBAA 형식으로 입력해 주세요.');
    if (action.type === 'picker') color.a = state.color.a;
    const hsl = rgbToHsl(color), hsv = rgbToHsv(color);
    if (hsv.s === 0) hsl.h = hsv.h = state.hsv.h;
    return { state: { color, hsl, hsv } };
  }
  if (action.type === 'alpha') {
    if (!inRange(action.value, 0, 1)) return fail('Alpha는 0~1 사이의 숫자로 입력해 주세요.');
    return { state: { ...state, color: { ...state.color, a: action.value } } };
  }
  if (action.type === 'sv' || action.type === 'hue') {
    if (action.type === 'sv' && (!inRange(action.s, 0, 100) || !inRange(action.v, 0, 100))) return fail('채도와 명도는 0~100 사이여야 합니다.');
    if (action.type === 'hue' && !inRange(action.value, 0, 360)) return fail('색조는 0~360 사이여야 합니다.');
    const hsv = action.type === 'sv' ? { ...state.hsv, s: action.s, v: action.v }
      : { ...state.hsv, h: normalizeHue(action.value) };
    const color = hsvToRgb(hsv, state.color.a), hsl = rgbToHsl(color);
    hsl.h = hsv.h;
    return { state: { color, hsl, hsv } };
  }
  if (action.type === 'rgb') {
    if (!inRange(action.value, 0, 255)) return fail('RGB는 0~255 사이의 숫자로 입력해 주세요.');
    const color = { ...state.color, [action.channel]: action.value }, hsl = rgbToHsl(color);
    if (hsl.s === 0) hsl.h = state.hsl.h;
    const hsv = rgbToHsv(color);
    if (hsv.s === 0) hsv.h = hsl.h;
    return { state: { color, hsl, hsv } };
  }
  const max = action.channel === 'h' ? 360 : 100;
  if (!inRange(action.value, 0, max)) return fail(`H는 0~360, S/L은 0~100 사이의 숫자로 입력해 주세요.`);
  const hsl = { ...state.hsl, [action.channel]: action.channel === 'h' ? normalizeHue(action.value) : action.value };
  const color = hslToRgb(hsl, state.color.a), hsv = rgbToHsv(color);
  hsv.h = hsl.h;
  return { state: { color, hsl, hsv } };
}
