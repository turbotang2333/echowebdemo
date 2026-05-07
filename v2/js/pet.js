// Pet placeholder. Real "持续移动 + 敏感区" 玩法 will replace this later.
// For now, long-press anywhere on the character ≥ 1s to advance.

import { $, defer, wait } from './util.js';
import { setRingActive } from './input.js';
import { setPetableGlow } from './fx.js';
import { isTurbo, onTurboChange } from './turbo.js';

const HOLD_MS = 1000;

export async function runPetPlaceholder() {
  const charEl = $('#character');
  if (!charEl) return;

  setPetableGlow(true);
  setRingActive(true); // Block swipe-up/tap during pet

  const promptNode = document.createElement('div');
  promptNode.style.cssText = `
    position: absolute;
    bottom: 14vh;
    left: 0; right: 0;
    text-align: center;
    font-family: var(--sans);
    font-size: 13px;
    letter-spacing: 0.24em;
    color: rgba(255,235,210,0.65);
    pointer-events: none;
    z-index: 9;
    animation: boot-breath 2.4s ease-in-out infinite;
  `;
  promptNode.textContent = '长按立绘 · 抚摸';
  $('#stage').appendChild(promptNode);

  const w = defer();
  let timer = null;
  let pressing = false;

  const onDown = (e) => {
    if (pressing) return;
    e.preventDefault();
    pressing = true;
    timer = setTimeout(() => {
      pressing = false;
      cleanup();
      w.resolve();
    }, HOLD_MS);
  };

  const onUp = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pressing = false;
  };

  function cleanup() {
    charEl.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    charEl.removeEventListener('touchstart', onDown);
    window.removeEventListener('touchend', onUp);
    window.removeEventListener('touchcancel', onUp);
  }

  charEl.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  charEl.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('touchend', onUp);
  window.addEventListener('touchcancel', onUp);

  // Turbo: auto-pet so the player walks itself.
  let _resolved = false;
  const autoFinish = () => {
    if (_resolved) return;
    _resolved = true;
    if (timer) { clearTimeout(timer); timer = null; }
    cleanup();
    w.resolve();
  };
  if (isTurbo()) Promise.resolve().then(autoFinish);
  const offTurbo = onTurboChange((on) => { if (on) autoFinish(); });

  await w.promise;
  offTurbo();

  promptNode.remove();
  setPetableGlow(false);
  setRingActive(false);
}
