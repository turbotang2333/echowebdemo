// Trigger browser fullscreen on the first user gesture so the address/nav
// bars get out of the way. Browser policy requires this be tied to a user
// activation event — we can't request fullscreen automatically on load.
//
// Coverage:
//   Chrome Android       — works, hides chrome on first touch.
//   iOS Safari (iPhone)  — no Fullscreen API; rely on apple-mobile-web-app-*
//                          meta tags + "Add to Home Screen".
//   iPad Safari          — works.
//   Desktop              — works (mostly noop since chrome is fine).

function requestFs() {
  const el = document.documentElement;
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  const req = el.requestFullscreen
    || el.webkitRequestFullscreen
    || el.mozRequestFullScreen
    || el.msRequestFullscreen;
  if (!req) return;
  try {
    const r = req.call(el);
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch {}
}

export function initFullscreenOnFirstTouch() {
  const handler = () => { requestFs(); };
  // capture: true ensures we run before any handler that might stopPropagation.
  // once: true so we only fire on the very first interaction of the session.
  window.addEventListener('pointerdown', handler, { capture: true, once: true });
  window.addEventListener('touchstart', handler, { capture: true, once: true });
  window.addEventListener('mousedown', handler, { capture: true, once: true });
}
