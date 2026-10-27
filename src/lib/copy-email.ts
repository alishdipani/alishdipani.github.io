// Email links that copy the address instead of opening a mail app (Home contact row, post endings).
// The link keeps its real mailto: href, so it still works without JavaScript; if copying fails
// (no clipboard access), the mailto opens instead. "Copied" shows in the note for about 2 s; the note
// is a role="status" element, so screen readers announce it. Works with the keyboard (Enter on a link).
export function copyEmailOnClick(
  link: HTMLAnchorElement | null,
  note: HTMLElement | null,
  on: { copied?: () => void; fallback?: () => void } = {},
) {
  if (!link) return;
  let timer: number | undefined;
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(link.dataset.copyEmail ?? '');
    } catch {
      on.fallback?.();
      location.href = link.href;
      return;
    }
    on.copied?.();
    if (note) note.textContent = 'Copied';
    clearTimeout(timer);
    timer = window.setTimeout(() => note && (note.textContent = ''), 2000);
  });
}
