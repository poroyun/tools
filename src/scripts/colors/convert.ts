export interface RGBA { r: number; g: number; b: number; a: number }
export interface HSL { h: number; s: number; l: number }
export interface HSV { h: number; s: number; v: number }

export function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}
export const normalizeHue = (h: number): number => {
  const remainder = h % 360;
  return remainder === 0 ? 0 : remainder < 0 ? remainder + 360 : remainder;
};
export const displayNumber = (n: number, digits = 2): string => String(Number(n.toFixed(digits)));
const percent = (fraction: number): number => Math.min(100, Math.max(0, fraction * 100));

export function parseHex(input: string): RGBA | null {
  const hex = input.trim();
  if (!/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(hex)) return null;
  const full = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1);
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16), a: full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1 };
}

function validRGB(color: RGBA): void {
  if (![color.r, color.g, color.b].every((v) => inRange(v, 0, 255)) || !inRange(color.a, 0, 1)) {
    throw new RangeError('RGB는 0~255, Alpha는 0~1이어야 합니다.');
  }
}

export function toHex(color: RGBA, alpha = false): string {
  validRGB(color);
  const values = alpha ? [color.r, color.g, color.b, color.a * 255] : [color.r, color.g, color.b];
  return '#' + values.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function hueOf(r: number, g: number, b: number, max: number, delta: number): number {
  if (delta === 0) return 0;
  return normalizeHue(60 * (max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4));
}

export function rgbToHsl(color: RGBA): HSL {
  validRGB(color);
  const r = color.r / 255, g = color.g / 255, b = color.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const l = (max + min) / 2;
  return { h: hueOf(r, g, b, max, delta), s: delta === 0 ? 0 : percent(delta / (1 - Math.abs(2 * l - 1))), l: percent(l) };
}

export function rgbToHsv(color: RGBA): HSV {
  validRGB(color);
  const r = color.r / 255, g = color.g / 255, b = color.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  return { h: hueOf(r, g, b, max, delta), s: max === 0 ? 0 : percent(delta / max), v: percent(max) };
}

function fromChroma(h: number, c: number, m: number, alpha: number): RGBA {
  const sector = normalizeHue(h) / 60, x = c * (1 - Math.abs(sector % 2 - 1));
  const [r, g, b] = sector < 1 ? [c, x, 0] : sector < 2 ? [x, c, 0]
    : sector < 3 ? [0, c, x] : sector < 4 ? [0, x, c] : sector < 5 ? [x, 0, c] : [c, 0, x];
  // 부동소수점 연산으로 생긴 경계의 미세 오차만 보정합니다.
  return { r: Math.min(255, Math.max(0, (r + m) * 255)), g: Math.min(255, Math.max(0, (g + m) * 255)),
    b: Math.min(255, Math.max(0, (b + m) * 255)), a: alpha };
}

export function hslToRgb(hsl: HSL, alpha = 1): RGBA {
  if (!Number.isFinite(hsl.h) || !inRange(hsl.s, 0, 100) || !inRange(hsl.l, 0, 100) || !inRange(alpha, 0, 1)) throw new RangeError('잘못된 HSL 값입니다.');
  const l = hsl.l / 100, c = (1 - Math.abs(2 * l - 1)) * hsl.s / 100;
  return fromChroma(hsl.h, c, l - c / 2, alpha);
}

export function hsvToRgb(hsv: HSV, alpha = 1): RGBA {
  if (!Number.isFinite(hsv.h) || !inRange(hsv.s, 0, 100) || !inRange(hsv.v, 0, 100) || !inRange(alpha, 0, 1)) throw new RangeError('잘못된 HSV 값입니다.');
  const v = hsv.v / 100, c = v * hsv.s / 100;
  return fromChroma(hsv.h, c, v - c, alpha);
}

export function formatColor(color: RGBA, hsl = rgbToHsl(color)) {
  validRGB(color);
  const hsv = rgbToHsv(color), rgb = [color.r, color.g, color.b].map(Math.round).join(', ');
  const hue = (h: number) => displayNumber(normalizeHue(Number(h.toFixed(2))));
  const hslText = `${hue(hsl.h)}, ${displayNumber(hsl.s)}%, ${displayNumber(hsl.l)}%`;
  const alpha = displayNumber(color.a, 4);
  return { hex: toHex(color), hex8: toHex(color, true), rgb: `rgb(${rgb})`, rgba: `rgba(${rgb}, ${alpha})`,
    hsl: `hsl(${hslText})`, hsla: `hsla(${hslText}, ${alpha})`,
    hsv: `HSV: ${hue(hsv.h)}°, ${displayNumber(hsv.s)}%, ${displayNumber(hsv.v)}%` };
}
