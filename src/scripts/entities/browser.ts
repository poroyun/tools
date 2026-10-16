import type dataShape from '../../data/entities/generated.json';
import { createEntityIndex, filterEntities, entityPage, entityDataURL } from './model';
import { createEntityRow } from './row';
import { createEntityCopier } from './copy';
import { createCopyToast } from '../characters/toast';

async function initialize(): Promise<void> {
  const root = document.querySelector<HTMLElement>('[data-entity-browser]');
  if (!root) return;
  function element<T extends HTMLElement>(selector: string): T {
    const found = root!.querySelector<T>(selector);
    if (!found) throw new Error(`Missing entity UI ${selector}`);
    return found;
  }
  const input = element<HTMLInputElement>('#entity-query');
  const clear = element<HTMLButtonElement>('[data-clear]');
  const list = element<HTMLUListElement>('[data-results]');
  const count = element<HTMLElement>('[data-count]');
  const more = element<HTMLButtonElement>('[data-more]');
  const empty = element<HTMLElement>('[data-empty]');
  const feedback = element<HTMLElement>('[data-feedback]');
  const fallback = element<HTMLElement>('[data-fallback]');
  const manual = element<HTMLTextAreaElement>('#entity-manual-copy');
  const toast = createCopyToast(element<HTMLElement>('[data-copy-toast]'));

  try {
    const response = await fetch(entityDataURL(import.meta.env.BASE_URL));
    if (!response.ok) throw new Error(`Entity data HTTP ${response.status}`);
    const data: typeof dataShape = await response.json();
    if (!Array.isArray(data.entries)) throw new Error('Invalid entity data');
    const index = createEntityIndex(data.entries);
    let filtered = data.entries;
    let shown = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const writer = navigator.clipboard?.writeText
      ? (text: string) => navigator.clipboard.writeText(text) : undefined;
    const copy = createEntityCopier({
      reset() { toast.hide(); feedback.textContent = ''; fallback.hidden = true; },
      success() { toast.show(); },
      failure(text) {
        feedback.textContent = '복사하지 못했어요. 아래 코드를 직접 선택해 복사해 주세요.';
        fallback.hidden = false;
        manual.value = text;
        manual.focus();
        manual.select();
      },
    }, writer);

    function append(): void {
      const fragment = document.createDocumentFragment();
      const next = entityPage(filtered, shown);
      for (const entry of next) fragment.append(createEntityRow(entry, (text) => { void copy(text); }));
      list.append(fragment);
      shown += next.length;
      more.hidden = shown >= filtered.length;
      count.textContent = `검색 결과 ${filtered.length.toLocaleString('ko-KR')}개 · ${shown.toLocaleString('ko-KR')}개 표시 (별칭은 한 항목으로 묶음)`;
    }
    function update(): void {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      filtered = filterEntities(index, input.value);
      shown = 0;
      list.replaceChildren();
      empty.hidden = filtered.length > 0;
      append();
    }
    input.disabled = false;
    clear.disabled = false;
    input.addEventListener('input', () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(update, 80);
    });
    clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
    more.addEventListener('click', () => {
      if (timer !== undefined) { update(); return; }
      const previous = shown;
      append();
      list.children[previous]?.querySelector<HTMLButtonElement>('button')?.focus();
    });
    update();
  } catch (error) {
    count.textContent = '엔티티 목록을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
    console.error('Entity browser initialization failed', error);
  }
}

void initialize();
