export interface EyeDropperConstructor {
  new(): { open(): Promise<{ sRGBHex: string }> };
}
export interface EyeDropperEnvironment { isSecureContext: boolean; EyeDropper?: EyeDropperConstructor }
export type EyeDropperResult = { status: 'selected'; hex: string }
  | { status: 'cancelled' | 'unsupported' | 'error' };

export function supportsEyeDropper(env: EyeDropperEnvironment): boolean {
  return env.isSecureContext && typeof env.EyeDropper === 'function';
}

export async function pickScreenColor(env: EyeDropperEnvironment): Promise<EyeDropperResult> {
  if (!supportsEyeDropper(env) || !env.EyeDropper) return { status: 'unsupported' };
  try {
    // 사용자 클릭에서 첫 await 전에 open()을 호출합니다.
    const result = await new env.EyeDropper().open();
    if (!/^#[\da-f]{6}$/i.test(result.sRGBHex)) return { status: 'error' };
    return { status: 'selected', hex: result.sRGBHex };
  } catch (error) {
    return { status: typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError' ? 'cancelled' : 'error' };
  }
}
