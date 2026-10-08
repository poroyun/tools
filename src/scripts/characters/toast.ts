export const COPY_TOAST_DURATION = 1800;

export function createCopyToast(element: HTMLElement): { show: () => void; hide: () => void } {
  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  function hide(): void {
    if (announceTimer !== undefined) clearTimeout(announceTimer);
    if (hideTimer !== undefined) clearTimeout(hideTimer);
    announceTimer = undefined;
    hideTimer = undefined;
    element.dataset.visible = 'false';
    element.textContent = '';
  }

  function show(): void {
    hide();
    // 반복 복사에서도 live region의 텍스트 변경이 별도 작업으로 전달됩니다.
    announceTimer = setTimeout(() => {
      announceTimer = undefined;
      element.textContent = '복사했어요!';
      element.dataset.visible = 'true';
      hideTimer = setTimeout(hide, COPY_TOAST_DURATION);
    }, 0);
  }

  return { show, hide };
}
