// 현재 변형 선택창의 조작 요소는 닫기·문자 버튼입니다.
// native dialog에서도 Tab 경계에서 브라우저 UI로 포커스가 빠지는 경우를 막습니다.
export function keepDialogFocus(dialog: HTMLDialogElement, event: KeyboardEvent): void {
  if (!dialog.open || event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
  const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  const first = buttons[0], last = buttons.at(-1);
  if (!first || !last) return;
  const active = dialog.ownerDocument.activeElement;
  const target = event.shiftKey && active === first ? last : !event.shiftKey && active === last ? first : undefined;
  if (target) {
    event.preventDefault();
    target.focus();
  }
}
