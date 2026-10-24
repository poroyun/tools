export const MEASUREMENT_ID = 'G-SSGW5S1X9W';
export const CONSENT_KEY = 'tools.analytics-consent.v1';
export type Consent = 'granted' | 'denied';
const FALLBACK_KEY = `${CONSENT_KEY}.session`;
const DISABLE_KEY = 'ga-disable-G-SSGW5S1X9W';
const COOKIE_PREFIX = 'tools_ga4';
const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
    'ga-disable-G-SSGW5S1X9W'?: boolean;
    toolsConsentInitialized?: boolean;
  }
}

function valid(value: string | null): Consent | null {
  return value === 'granted' || value === 'denied' ? value : null;
}

export function readConsent(win: Window): Consent | null {
  // A session denial overrides a stale grant if persistent storage became read-only.
  try { if (win.sessionStorage.getItem(FALLBACK_KEY) === 'denied') return 'denied'; } catch { /* optional storage */ }
  try {
    const choice = valid(win.localStorage.getItem(CONSENT_KEY));
    // Do not honor an old grant in read-only storage: a withdrawal could not persist.
    if (choice === 'granted') win.localStorage.setItem(CONSENT_KEY, choice);
    return choice;
  } catch { return null; }
}

function saveConsent(win: Window, choice: Consent): boolean {
  try {
    win.localStorage.setItem(CONSENT_KEY, choice);
    try { win.sessionStorage.removeItem(FALLBACK_KEY); } catch { /* optional storage */ }
    return true;
  } catch {
    // Never persist a fallback grant. A later document must fail closed.
    try { win.localStorage.removeItem(CONSENT_KEY); } catch { /* storage may be read-only */ }
    try { win.sessionStorage.setItem(FALLBACK_KEY, 'denied'); } catch { /* current document still works */ }
    return false;
  }
}

export function createAnalyticsConsent(win: Window, doc: Document, base: string) {
  const cookiePath = base.replace(/\/$/, '') || '/';
  let choice = readConsent(win);
  let script: HTMLScriptElement | undefined;
  let configured = false;
  let pageViewSent = false;
  let prepared = false;
  let ready = false;
  win[DISABLE_KEY] = true;

  function clearCookies(): void {
    // Only this project's prefixed cookies; other github.io projects are untouched.
    try {
      const names = doc.cookie.split(';').map((part) => part.trim().split('=')[0])
        .filter((name) => name.startsWith(`${COOKIE_PREFIX}_`));
      for (const name of names) {
        for (const path of new Set([cookiePath, `${cookiePath}/`, '/'])) {
          for (const domain of ['', `; Domain=${win.location.hostname}`, `; Domain=.${win.location.hostname}`]) {
            doc.cookie = `${name}=; Max-Age=0; Path=${path}${domain}; SameSite=Lax`;
          }
        }
      }
    } catch { /* Cookie access may also be blocked; the disable flag still applies. */ }
  }

  function initializeTag(): void {
    if (choice !== 'granted') return;
    win[DISABLE_KEY] = false;
    if (!configured) {
      configured = true;
      win.gtag!('js', new Date());
      win.gtag!('config', MEASUREMENT_ID, {
        send_page_view: false,
        cookie_prefix: COOKIE_PREFIX,
        cookie_path: cookiePath,
        cookie_domain: 'none',
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    }
    if (!pageViewSent) {
      pageViewSent = true;
      win.gtag!('event', 'page_view', { send_to: MEASUREMENT_ID });
    }
  }

  function enable(): void {
    win[DISABLE_KEY] = false;
    if (!prepared) {
      prepared = true;
      win.dataLayer ??= [];
      win.gtag = function (..._args: unknown[]) { win.dataLayer!.push(arguments); };
      win.gtag('consent', 'default', { ...denied });
    }
    win.gtag!('consent', 'update', { ...denied, analytics_storage: 'granted' });
    if (ready) { initializeTag(); return; }
    if (script) return;
    const pending = doc.createElement('script');
    script = pending;
    pending.id = 'tools-google-tag';
    pending.async = true;
    pending.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    pending.onload = () => {
      if (script !== pending || choice !== 'granted') return;
      ready = true;
      initializeTag();
    };
    pending.onerror = () => {
      if (script === pending) { script = undefined; pending.remove(); }
    };
    doc.head.append(pending);
  }

  function disable(): void {
    // Disable first: a consent update alone could allow cookieless measurement.
    win[DISABLE_KEY] = true;
    if (prepared) win.gtag!('consent', 'update', { ...denied });
    if (!ready && script) { script.remove(); script = undefined; }
    clearCookies();
  }

  if (choice === 'granted') enable();
  else clearCookies();

  return {
    get choice() { return choice; },
    choose(next: Consent): boolean {
      choice = next;
      const saved = saveConsent(win, next);
      if (next === 'granted') enable(); else disable();
      return saved;
    },
    sync(): void {
      const next = readConsent(win);
      if (next === choice) return;
      choice = next;
      if (next === 'granted') enable(); else disable();
    },
  };
}
