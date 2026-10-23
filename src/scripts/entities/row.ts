import type { EntityEntry } from './model';
import { entityPresentation } from './presentation.ts';

export function createEntityRow(entry: EntityEntry, onCopy: (text: string) => void): HTMLLIElement {
  const view = entityPresentation(entry);
  const li = document.createElement('li');
  li.className = 'entity-row';
  const identity = document.createElement('div');
  identity.className = 'entity-identity';
  const character = document.createElement('span');
  character.className = 'entity-character';
  character.textContent = view.character;
  character.setAttribute('dir', 'auto');
  const title = document.createElement('h3');
  title.textContent = view.name;
  const english = document.createElement('p');
  english.textContent = view.detail;
  const points = document.createElement('small');
  points.textContent = view.points;
  identity.append(character, title, english, points);

  const codes = document.createElement('dl');
  codes.className = 'entity-codes';
  for (const [label, values] of view.groups) {
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
      button.setAttribute('aria-label', `${view.name} ${label} ${value} 복사`);
      button.addEventListener('click', () => onCopy(value));
      definition.append(button);
    }
    group.append(term, definition);
    codes.append(group);
  }
  li.append(identity, codes);
  return li;
}
