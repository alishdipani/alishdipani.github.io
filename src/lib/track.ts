// Analytics (Umami Cloud). Every event on the site goes through this file, so switching to another
// tool means editing only this file and the script tag in src/layouts/Base.astro.
//
// - track(name, props): sends an event if the tracker is loaded; otherwise does nothing. The tracker
//   itself skips sends on other hostnames (data-domains) and in browsers that opted out (?notrack).
// - initClickTracking(): one delegated click listener for the whole page. A tracked element says what
//   to send with data-event="name" and data-event-<prop>="value" ("true"/"false" become booleans),
//   e.g. <a data-event="profile-click" data-event-profile="scholar">. Copying text from inside an
//   element with data-copy-event="name" sends that event.

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
  const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-event]');
  if (!el?.dataset.event) return;
  const props = propsFrom(el);
  track(el.dataset.event, Object.keys(props).length ? props : undefined);
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
