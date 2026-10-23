import type { CharacterEntry, CharacterVariant, Category } from './types';
import { createSearchIndex, filterCharacters } from './search';
import { copyCharacter } from './clipboard';
import { createCharacterButton, configureCharacterButton } from './button';
import { nextPage } from './pagination';
import { createCopyToast } from './toast';
import { keepDialogFocus } from './dialog-focus';
import { supplementalKeywords } from '../../data/emoji/supplemental';
import type emojiDataset from '../../data/emoji/generated.json';

async function initialize(): Promise<void> {
  const root = document.querySelector<HTMLElement>('[data-character-browser]');
  if (!root) return;
  function element<T extends HTMLElement>(selector: string): T {
    const found = root!.querySelector<T>(selector);
    if (!found) throw new Error(`Missing character UI: ${selector}`);
    return found;
  }
  const input = element<HTMLInputElement>('#character-query');
  const clear = element<HTMLButtonElement>('[data-clear]');
  const categoryList = element<HTMLElement>('[data-categories]');
  let results = element<HTMLUListElement>('[data-mode-results="emoji"]');
  const count = element<HTMLElement>('[data-result-count]');
  const empty = element<HTMLElement>('[data-empty]');
  const more = element<HTMLButtonElement>('[data-more]');
  const feedback = element<HTMLElement>('[data-feedback]');
  const toast = createCopyToast(element<HTMLElement>('[data-copy-toast]'));
  const fallback = element<HTMLElement>('[data-fallback]');
  const manual = element<HTMLTextAreaElement>('#manual-copy');
  const dialog = element<HTMLDialogElement>('[data-variants]');
  const variantResults = element<HTMLUListElement>('[data-variant-results]');
  const variantName = element<HTMLElement>('[data-variant-name]');
  const close = element<HTMLButtonElement>('[data-close]');
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')];

  try {
    async function loadEmoji(): Promise<typeof emojiDataset> {
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      const response = await fetch(`${base}/characters/emoji.json`);
      if (!response.ok) throw new Error(`Emoji data HTTP ${response.status}`);
      const data: typeof emojiDataset = await response.json();
      if (!Array.isArray(data.entries) || data.metadata.unicodeVersion !== '17.0') throw new Error('Unexpected emoji data');
      return data;
    }
    const [emojiData, kaomojiData] = await Promise.all([
      loadEmoji(), import('../../data/kaomoji/index'),
    ]);
    const catalogs = {
      emoji: { index: createSearchIndex(emojiData.entries, supplementalKeywords), categories: emojiData.categories },
      kaomoji: { index: createSearchIndex(kaomojiData.kaomoji), categories: kaomojiData.kaomojiCategories },
    };
    let mode: 'emoji' | 'kaomoji' = 'emoji';
    let category = 'all';
    let filtered: CharacterEntry[] = [];
    let shown = 0;
    let searchTimer: ReturnType<typeof setTimeout> | undefined;
    let copySequence = 0;
    let dialogOpener: HTMLButtonElement | undefined;

    async function copy(item: CharacterVariant): Promise<void> {
      const request = ++copySequence;
      toast.hide();
      feedback.textContent = '';
      fallback.hidden = true;
      const writer = navigator.clipboard?.writeText
        ? (text: string) => navigator.clipboard.writeText(text) : undefined;
      const success = await copyCharacter(item.char, writer);
      if (request !== copySequence) return;
      if (dialog.open) dialog.close();
      if (success) toast.show();
      else {
        feedback.textContent = '복사하지 못했어요. 문자를 직접 선택해 복사해 주세요.';
        fallback.hidden = false;
        manual.value = item.char;
        manual.focus();
        manual.select();
      }
    }

    function openVariants(entry: CharacterEntry, opener: HTMLButtonElement): void {
      dialogOpener = opener;
      variantName.textContent = `${entry.char} ${entry.koName || entry.name}`;
      variantResults.replaceChildren();
      for (const variant of [entry, ...entry.variants]) {
        const li = document.createElement('li');
        li.append(createCharacterButton(variant, (item) => { void copy(item); }));
        variantResults.append(li);
      }
      dialog.showModal();
      close.focus();
    }

    function appendResults(): void {
      const fragment = document.createDocumentFragment();
      const next = nextPage(filtered, shown, mode);
      for (const entry of next) {
        const li = document.createElement('li');
        li.append(createCharacterButton(entry, (item) => { void copy(item); }, mode === 'emoji' ? openVariants : undefined));
        fragment.append(li);
      }
      results.append(fragment);
      shown += next.length;
      count.textContent = `검색 결과 ${filtered.length.toLocaleString('ko-KR')}개 · ${shown.toLocaleString('ko-KR')}개 표시`;
      more.hidden = shown >= filtered.length;
    }

    function update(reuseInitial = false): void {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = undefined;
      filtered = filterCharacters(catalogs[mode].index, input.value, category);
      empty.hidden = filtered.length > 0;
      if (reuseInitial && results.hasAttribute('data-initial')) {
        results.removeAttribute('data-initial');
        shown = results.children.length;
        count.textContent = `검색 결과 ${filtered.length.toLocaleString('ko-KR')}개 · ${shown.toLocaleString('ko-KR')}개 표시`;
        more.hidden = shown >= filtered.length;
        return;
      }
      results.removeAttribute('data-initial');
      results.replaceChildren();
      shown = 0;
      results.classList.toggle('character-grid--text', mode === 'kaomoji');
      appendResults();
    }

    function renderCategories(categories: Category[]): void {
      categoryList.replaceChildren();
      for (const item of [{ id: 'all', label: '전체' }, ...categories]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.label;
        button.setAttribute('aria-pressed', String(item.id === category));
        button.addEventListener('click', () => {
          category = item.id;
          for (const child of categoryList.querySelectorAll('button')) child.setAttribute('aria-pressed', String(child === button));
          update();
        });
        categoryList.append(button);
      }
    }

    for (const button of modeButtons) {
      button.disabled = false;
      button.addEventListener('click', () => {
        if (button.dataset.mode !== 'emoji' && button.dataset.mode !== 'kaomoji') return;
        if (mode === button.dataset.mode) return;
        mode = button.dataset.mode;
        category = 'all';
        input.value = '';
        for (const tab of modeButtons) {
          const selected = tab === button;
          tab.setAttribute('aria-selected', String(selected));
          tab.tabIndex = selected ? 0 : -1;
          element<HTMLElement>(`#${tab.getAttribute('aria-controls')}`).hidden = !selected;
        }
        results = element<HTMLUListElement>(`[data-mode-results="${mode}"]`);
        renderCategories(catalogs[mode].categories);
        update(true);
      });
    }
    // Bind the build-time DOM without replacing it, including the inactive text panel.
    for (const staticMode of ['emoji', 'kaomoji'] as const) {
      const byId = new Map(catalogs[staticMode].index.map(({ entry }) => [entry.id, entry]));
      for (const button of element<HTMLUListElement>(`[data-mode-results="${staticMode}"]`).querySelectorAll<HTMLButtonElement>('[data-character-id]')) {
        const entry = byId.get(button.dataset.characterId!);
        if (!entry) throw new Error('Unknown static character');
        configureCharacterButton(button, entry, (item) => { void copy(item); }, staticMode === 'emoji' ? openVariants : undefined);
        button.disabled = false;
      }
    }
    modeButtons.forEach((button, index) => button.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      let target: number;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') target = (index + 1) % modeButtons.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = modeButtons.length - 1;
      else return;
      event.preventDefault();
      modeButtons[target].focus();
      modeButtons[target].click();
    }));
    input.disabled = false;
    clear.disabled = false;
    input.addEventListener('input', () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(update, 80);
    });
    clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
    more.addEventListener('click', () => {
      // 입력 직후 더 보기를 눌러도 이전 검색 결과를 추가하지 않습니다.
      if (searchTimer) { clearTimeout(searchTimer); searchTimer = undefined; update(); return; }
      const previous = shown;
      appendResults();
      results.children[previous]?.querySelector<HTMLButtonElement>('button')?.focus();
    });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', (event) => keepDialogFocus(dialog, event));
    // Escape는 native dialog의 기본 cancel 동작을 사용합니다.
    // 실패 시 수동 복사 입력란으로 이동한 포커스는 덮어쓰지 않습니다.
    dialog.addEventListener('close', () => {
      if (fallback.hidden && dialogOpener?.isConnected) dialogOpener.focus();
      dialogOpener = undefined;
    });
    renderCategories(catalogs[mode].categories);
    update(true);
  } catch (error) {
    count.textContent = '추가 데이터를 불러오지 못했습니다. 기본 목록은 볼 수 있습니다. 페이지를 새로고침해 주세요.';
    console.error('Character browser initialization failed', error);
  }
}

void initialize();
