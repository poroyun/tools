import { CONSENT_KEY, createAnalyticsConsent } from './consent';

export function initializeConsent(base: string): void {
  const panel = document.querySelector<HTMLElement>('[data-consent-panel]');
  const settings = document.querySelector<HTMLButtonElement>('[data-cookie-settings]');
  const status = document.querySelector<HTMLElement>('[data-consent-status]');
  if (!panel || !settings || !status || window.toolsConsentInitialized) return;
  window.toolsConsentInitialized = true;
  const controller = createAnalyticsConsent(window, document, base);
  const heading = panel.querySelector<HTMLElement>('#analytics-consent-title')!;
  const current = panel.querySelector<HTMLElement>('[data-consent-current]')!;
  const close = panel.querySelector<HTMLButtonElement>('[data-consent-close]')!;
  let openedFromSettings = false;

  function render(): void {
    current.textContent = controller.choice === 'granted' ? '현재 선택: 동의' : controller.choice === 'denied' ? '현재 선택: 거부' : '아직 선택하지 않았습니다.';
    close.hidden = controller.choice === null;
  }
  const hide = (): void => {
    const hadFocus = panel.contains(document.activeElement);
    panel.hidden = true;
    if (hadFocus) {
      if (openedFromSettings) settings!.focus();
      else document.querySelector<HTMLElement>('#main-content')?.focus({ preventScroll: true });
    }
    openedFromSettings = false;
  };
  settings.hidden = false;
  settings.addEventListener('click', () => {
    openedFromSettings = true;
    render();
    panel.hidden = false;
    heading.focus();
  });
  for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-consent-choice]')) {
    button.addEventListener('click', () => {
      const choice = button.dataset.consentChoice;
      if (choice !== 'granted' && choice !== 'denied') return;
      const saved = controller.choose(choice);
      status!.textContent = (choice === 'granted' ? '분석 쿠키 사용에 동의했습니다.' : '분석 수집을 중지했습니다.')
        + (saved ? ' 쿠키 설정에서 변경할 수 있습니다.' : ' 선택을 저장하지 못했습니다. 다음 페이지에서 다시 확인할 수 있습니다.');
      render();
      hide();
    });
  }
  close.addEventListener('click', hide);
  window.addEventListener('storage', (event) => {
    if (event.key !== CONSENT_KEY && event.key !== null) return;
    controller.sync();
    render();
    if (controller.choice !== null) hide();
    else panel.hidden = false;
  });
  // Reconcile restored documents and tabs after a choice changes elsewhere.
  window.addEventListener('pageshow', () => { controller.sync(); render(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { controller.sync(); render(); }
  });
  render();
  panel.hidden = controller.choice !== null;
}
