// Analytics (Umami Cloud). Every event on the site goes through this file, so switching to another
// tool means editing only this file and the script tag in src/layouts/Base.astro.
//
// - track(name, props): sends an event if the tracker is loaded; otherwise does nothing. The tracker
//   itself skips sends on other hostnames (data-domains) and in browsers that opted out (?notrack).
// - initClickTracking(): one click listener for the whole page. Links tell it what to send with
//   data-event="name" and data-event-<prop>="value" ("true"/"false" become booleans), and a few
//   kinds of links are recognized by their address: CV links, mailto links and profile links.
//   Copying text from inside an element with data-copy-event="name" sends that event.

type Props = Record<string, string | number | boolean>;
type Umami = { track: (name: string, data?: Props) => void };

function tracker(): Umami | undefined {
  const u = (window as unknown as { umami?: Umami }).umami;
  return u && typeof u.track === 'function' ? u : undefined;
}

export function track(name: string, props?: Props) {
  try {
    const u = tracker();
    if (u) u.track(name, props);
    else if (document.readyState !== 'complete') {
      // The tracker script may still be loading: try once more when the page has loaded.
      window.addEventListener('load', () => { try { tracker()?.track(name, props); } catch {} }, { once: true });
    }
  } catch {
    // Analytics must never break the page.
  }
}

const PROFILES: [RegExp, string][] = [
  [/^https:\/\/scholar\.google\.com\//, 'google-scholar'],
  [/^https:\/\/github\.com\/alishdipani\/?$/, 'github'],
  [/^https:\/\/(x|twitter)\.com\/alishdipani\/?$/, 'x'],
];

function propsFrom(el: HTMLElement): Props {
  const props: Props = {};
  for (const [key, value] of Object.entries(el.dataset)) {
    if (!key.startsWith('event') || key === 'event' || value === undefined) continue;
    // data-event-link_type → dataset.eventLink_type → "link_type"
    const name = key.slice(5).replace(/^./, (c) => c.toLowerCase());
    props[name] = value === 'true' ? true : value === 'false' ? false : value;
  }
  return props;
}

function onClick(e: MouseEvent) {
  const a = (e.target as Element | null)?.closest?.('a');
  if (!a) return;
  if (a.dataset.event) return track(a.dataset.event, propsFrom(a));
  const href = a.getAttribute('href') ?? '';
  if (href.startsWith('mailto:')) {
    // The post-ending "Email me" link copies the address instead; it sends email-copy itself.
    if (!a.hasAttribute('data-copy-email')) track('email-click');
    return;
  }
  const path = a.pathname.replace(/^\/website-preview(?=\/)/, '');
  if (a.origin === location.origin && /^\/cv\/(Alish_Dipani_CV\.pdf)?$/.test(path)) return track('cv-open');
  for (const [re, profile] of PROFILES) if (re.test(a.href)) return track('profile-click', { profile });
}

function onCopy() {
  const node = document.getSelection()?.anchorNode;
  const el = (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>('[data-copy-event]');
  if (el?.dataset.copyEvent) track(el.dataset.copyEvent);
}

let started = false;
export function initClickTracking() {
  if (started) return;
  started = true;
  // Capture phase, so links whose own handlers stop the event are still counted.
  document.addEventListener('click', onClick, true);
  document.addEventListener('copy', onCopy);
}
