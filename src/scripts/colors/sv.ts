import type { HSV } from './convert.ts';

/** Pointer coordinates are clamped even when capture moves outside the palette. */
export function pointerToSV(x: number, y: number, rect: { left: number; top: number; width: number; height: number }) {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return { s: clamp((x - rect.left) / rect.width * 100), v: clamp(100 - (y - rect.top) / rect.height * 100) };
}

export function keyboardSV(hsv: HSV, key: string, shift = false) {
  const step = shift ? 10 : 1;
  let { s, v } = hsv;
  if (key === 'ArrowLeft') s -= step;
  else if (key === 'ArrowRight') s += step;
  else if (key === 'ArrowUp') v += step;
  else if (key === 'ArrowDown') v -= step;
  else return null;
  return { s: Math.max(0, Math.min(100, s)), v: Math.max(0, Math.min(100, v)) };
}
