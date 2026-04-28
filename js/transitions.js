import { $, wait } from './util.js';
import { isFastForward } from './signal.js';

// Eye-blink transition: 0.8s close + brief hold + 0.8s open.
// In fast-forward mode, collapse to a near-instant flicker.
export async function blinkTransition(midAction) {
  const fast = isFastForward();
  const t = fast ? 80 : 800;
  const veil = $('#blink-veil');
  veil.classList.add('dark');
  await wait(t);
  if (midAction) await midAction();
  await wait(fast ? 20 : 120);
  veil.classList.remove('dark');
  await wait(t);
}

export async function whiteFlash(midAction, opts = {}) {
  const fast = isFastForward();
  const veil = $('#white-veil');
  veil.classList.add('lit');
  await wait(fast ? 80 : (opts.in || 700));
  if (midAction) await midAction();
  veil.classList.remove('lit');
  await wait(fast ? 80 : (opts.out || 700));
}

export function setBackground(color) {
  document.documentElement.style.setProperty('--bg-current', color);
}

export function shake(target = '#stage') {
  const node = document.querySelector(target);
  if (!node) return;
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
}
