import type { EntityEntry } from './model';

export function createEntityRow(entry: EntityEntry, onCopy: (text: string) => void): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'entity-row';
  const identity = document.createElement('div');
  identity.className = 'entity-identity';
  const character = document.createElement('span');
  character.className = 'entity-character';
  const invisible = /^[\s\u00AD\u034F\u200B-\u200F\u202A-\u202E\u2060-\u206F]+$/u.test(entry.character);
  character.textContent = invisible ? '공백·제어' : entry.character;
  character.setAttribute('dir', 'auto');
  const title = document.createElement('h3');
  title.textContent = entry.koreanName || entry.englishName;
  const english = document.createElement('p');
  english.textContent = entry.koreanName ? entry.englishName : entry.category;
  const points = document.createElement('small');
  points.textContent = entry.codepoints.map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`).join(' ');
  identity.append(character, title, english, points);

  const codes = document.createElement('dl');
  codes.className = 'entity-codes';
  for (const [label, values] of [['Named Entity', entry.names], ['Decimal', [entry.decimal]], ['Hex', [entry.hex]]] as const) {
    const group = document.createElement('div');
    const term = document.createElement('dt');
    term.textContent = label;
    const definition = document.createElement('dd');
    for (const value of values) {
      const button = document.createElement('button');
      button.type = 'button';
      const code = document.createElement('code');
      code.textContent = value;
      const action = document.createElement('span');
      action.className = 'entity-copy-label';
      action.textContent = '복사';
      button.append(code, action);
      button.setAttribute('aria-label', `${entry.koreanName || entry.englishName} ${label} ${value} 복사`);
      button.addEventListener('click', () => onCopy(value));
      definition.append(button);
    }
    group.append(term, definition);
    codes.append(group);
  }
  li.append(identity, codes);
  return li;
}
