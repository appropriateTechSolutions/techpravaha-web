export type EventName =
  | 'view_tier'
  | 'begin_checkout'
  | 'purchase'
  | 'whatsapp_click'
  | 'book_click'
  | 'lead_submit'
  | 'lab_play';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function track(name: EventName, params?: Record<string, string | number>): void {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  } catch {
    // analytics must never break the page
  }
}

// An id is usable when set and not a `.env.example` placeholder (a run of X's).
const usable = (id: unknown): id is string =>
  typeof id === 'string' && id.trim() !== '' && !/x{4,}/i.test(id);

let loaded = false;

export function loadAnalytics(): void {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const ga = import.meta.env.VITE_GA_ID;
    const clarity = import.meta.env.VITE_CLARITY_ID;

    if (usable(ga)) {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        // gtag.js requires the real `arguments` object, not a rest array.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', ga);
    }

    if (usable(clarity)) {
      const s = document.createElement('script');
      s.textContent = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", ${JSON.stringify(clarity)});`;
      document.head.appendChild(s);
    }
  } catch {
    // analytics must never break the page
  }
}
