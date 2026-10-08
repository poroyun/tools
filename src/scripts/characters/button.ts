import type { CharacterEntry, CharacterVariant } from './types';

// 선택창에서는 onSelectVariants를 전달하지 않아 기본 문자도 바로 복사합니다.
export function createCharacterButton(
  item: CharacterVariant,
  onCopy: (item: CharacterVariant) => void,
  onSelectVariants?: (entry: CharacterEntry, opener: HTMLButtonElement) => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'character-copy';
  button.textContent = item.char;
  const entry = 'variants' in item ? item as CharacterEntry : undefined;
  const hasVariants = Boolean(onSelectVariants && entry?.variants.length);
  const label = `${item.koName || item.name}: ${item.char} ${hasVariants ? '변형 선택' : '복사'}`;
  button.setAttribute('aria-label', label);
  button.title = label;

  if (hasVariants && entry && onSelectVariants) {
    button.setAttribute('aria-haspopup', 'dialog');
    const indicator = document.createElement('span');
    indicator.className = 'character-variant-indicator';
    indicator.textContent = '⌄';
    indicator.setAttribute('aria-hidden', 'true');
    button.append(indicator);
    button.addEventListener('click', () => onSelectVariants(entry, button));
  } else {
    button.addEventListener('click', () => onCopy(item));
  }
  return button;
}
