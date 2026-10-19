import { createColorState, updateColor, type ColorAction } from './state';
import { formatColor, displayNumber } from './convert';
import { pickScreenColor, supportsEyeDropper, type EyeDropperConstructor } from './eyedropper';
import { createCopyToast } from '../characters/toast';
import { createEntityCopier } from '../entities/copy';
import { pointerToSV, keyboardSV } from './sv';

function initialize(): void {
  const root = document.querySelector<HTMLElement>('[data-color-tool]');
  if (!root) return;
  function element<T extends HTMLElement>(selector: string): T {
    const found = root!.querySelector<T>(selector);
    if (!found) throw new Error(`Missing color UI: ${selector}`);
    return found;
  }
  const hex = element<HTMLInputElement>('#color-hex');
  const alpha = element<HTMLInputElement>('#color-alpha');
  const sv = element<HTMLElement>('[data-sv]'), handle = element<HTMLElement>('[data-sv-handle]');
  const hue = element<HTMLInputElement>('#color-hue');
  const summary = element<HTMLElement>('[data-color-summary]');
  const hexError = element<HTMLElement>('[data-hex-error]'), adjustError = element<HTMLElement>('[data-adjust-error]');
  const eyeButton = element<HTMLButtonElement>('[data-eyedropper]'), eyeStatus = element<HTMLElement>('[data-eye-status]');
  const toast = createCopyToast(element<HTMLElement>('[data-copy-toast]'));
  const feedback = element<HTMLElement>('[data-copy-feedback]'), fallback = element<HTMLElement>('[data-copy-fallback]');
  const manual = element<HTMLTextAreaElement>('#color-manual-copy');
  const fields = [...root.querySelectorAll<HTMLInputElement>('[data-rgb], [data-hsl], #color-alpha')];
  const errors = new Map<HTMLInputElement, string>();
  let state = createColorState(), formats = formatColor(state.color, state.hsl);

  function showErrors(): void {
    hexError.textContent = errors.get(hex) ?? '';
    adjustError.textContent = [...errors].filter(([field]) => field !== hex).map(([, message]) => message).filter((v, i, all) => all.indexOf(v) === i).join(' ');
  }
  function clearError(field: HTMLInputElement): void {
    errors.delete(field);
    field.removeAttribute('aria-invalid');
  }
  function write(field: HTMLInputElement, value: string, source?: HTMLInputElement): void {
    if (field !== source) { field.value = value; clearError(field); }
  }
  function render(source?: HTMLInputElement): void {
    formats = formatColor(state.color, state.hsl);
    sv.style.setProperty('--color-hue', String(state.hsv.h));
    handle.style.left = `${state.hsv.s}%`;
    handle.style.top = `${100 - state.hsv.v}%`;
    hue.setAttribute('aria-valuetext', `${displayNumber(state.hsv.h)}도`);
    write(hue, String(state.hsv.h), source);
    summary.textContent = `현재 색상 ${formats.hex}`;
    write(hex, state.color.a === 1 ? formats.hex : formats.hex8, source);
    write(alpha, displayNumber(state.color.a, 4), source);
    for (const field of fields) {
      const rgb = field.dataset.rgb, hsl = field.dataset.hsl;
      if (rgb === 'r' || rgb === 'g' || rgb === 'b') write(field, displayNumber(state.color[rgb], 4), source);
      if (hsl === 'h' || hsl === 's' || hsl === 'l') write(field, displayNumber(state.hsl[hsl], 4), source);
    }
    for (const output of root!.querySelectorAll<HTMLElement>('[data-format]')) {
      const key = output.dataset.format;
      if (key && key in formats) output.textContent = formats[key as keyof typeof formats];
    }
    for (const button of root!.querySelectorAll<HTMLButtonElement>('[data-palette]')) {
      const selected = state.color.a === 1 && button.dataset.palette === formats.hex;
      button.setAttribute('aria-pressed', String(selected));
    }
    showErrors();
  }
  function apply(action: ColorAction, source?: HTMLInputElement): void {
    const result = updateColor(state, action);
    if (result.error) {
      if (source) { errors.set(source, result.error); source.setAttribute('aria-invalid', 'true'); showErrors(); }
      return;
    }
    state = result.state;
    if (source) clearError(source);
    render(source);
  }
  const copy = createEntityCopier({
    reset() { toast.hide(); feedback.textContent = ''; fallback.hidden = true; },
    success() { toast.show(); },
    failure(text) {
      feedback.textContent = '복사하지 못했어요. 아래 코드를 직접 선택해 복사해 주세요.';
      fallback.hidden = false; manual.value = text; manual.focus(); manual.select();
    },
  }, navigator.clipboard?.writeText ? (text) => navigator.clipboard.writeText(text) : undefined);

  for (const control of root.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button')) control.disabled = false;
  hex.addEventListener('input', () => apply({ type: 'hex', value: hex.value }, hex));
  hue.addEventListener('input', () => apply({ type: 'hue', value: Number(hue.value) }, hue));
  let activePointer: number | null = null;
  const selectAt = (event: PointerEvent) => {
    const value = pointerToSV(event.clientX, event.clientY, sv.getBoundingClientRect());
    if (value) apply({ type: 'sv', ...value });
  };
  sv.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || activePointer !== null) return;
    event.preventDefault();
    activePointer = event.pointerId;
    sv.focus({ preventScroll: true });
    sv.setPointerCapture(event.pointerId);
    selectAt(event);
  });
  sv.addEventListener('pointermove', (event) => {
    if (event.pointerId === activePointer) selectAt(event);
  });
  sv.addEventListener('pointerup', (event) => {
    if (event.pointerId !== activePointer) return;
    selectAt(event);
    activePointer = null;
    if (sv.hasPointerCapture(event.pointerId)) sv.releasePointerCapture(event.pointerId);
  });
  for (const name of ['pointercancel', 'lostpointercapture']) sv.addEventListener(name, () => { activePointer = null; });
  sv.addEventListener('keydown', (event) => {
    const value = keyboardSV(state.hsv, event.key, event.shiftKey);
    if (value) { event.preventDefault(); apply({ type: 'sv', ...value }); }
  });
  for (const field of fields) field.addEventListener('input', () => {
    const value = field.value.trim() === '' ? NaN : Number(field.value), rgb = field.dataset.rgb, hsl = field.dataset.hsl;
    if (rgb === 'r' || rgb === 'g' || rgb === 'b') apply({ type: 'rgb', channel: rgb, value }, field);
    else if (hsl === 'h' || hsl === 's' || hsl === 'l') apply({ type: 'hsl', channel: hsl, value }, field);
    else apply({ type: 'alpha', value }, field);
  });
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-palette]')) {
    button.addEventListener('click', () => apply({ type: 'palette', value: button.dataset.palette ?? '' }));
  }
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-copy]')) button.addEventListener('click', () => {
    const key = button.dataset.copy;
    if (key && key in formats) void copy(formats[key as keyof typeof formats]);
  });
  const env = { isSecureContext: window.isSecureContext, EyeDropper: (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper };
  eyeButton.hidden = !supportsEyeDropper(env);
  eyeButton.disabled = eyeButton.hidden;
  eyeButton.addEventListener('click', async () => {
    eyeButton.disabled = true;
    eyeStatus.textContent = '화면에서 색상을 선택하세요. Escape로 취소할 수 있습니다.';
    const result = await pickScreenColor(env);
    if (result.status === 'selected') { apply({ type: 'picker', value: result.hex }); eyeStatus.textContent = '화면 색상을 선택했습니다.'; }
    else if (result.status === 'error') eyeStatus.textContent = '화면 색상을 선택하지 못했습니다. 다른 색상 입력 방식을 사용해 주세요.';
    else eyeStatus.textContent = '';
    eyeButton.disabled = !supportsEyeDropper(env);
  });
  render();
}

initialize();
