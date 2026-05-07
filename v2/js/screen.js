// Screen stack: each scene is a single .screen element. We mount the
// next screen behind the host before swiping, then animate the old one
// out (translateY -100%) and the new one in (translateY 0). Heavy
// transition is the default; "soft" inside-screen paragraph swaps live
// inside paragraph.js, not here.

import { $, el, raf, wait } from './util.js';

let _host;
let _current = null; // { node, bg, paraZone }

export function initScreen() {
  _host = $('#screen-host');
}

function buildScreen({ bg, bgColor }) {
  const node = el('div', { cls: 'screen entering' });
  const bgNode = el('div', { cls: 'screen-bg' });
  if (bgColor) bgNode.style.backgroundColor = bgColor;
  if (bg) bgNode.style.backgroundImage = `url("../src/images/${bg}")`;
  node.appendChild(bgNode);

  const paraZone = el('div', { cls: 'para-zone' });
  node.appendChild(paraZone);

  return { node, bg: bgNode, paraZone };
}

// Mount the very first screen with a gentle rise (no old screen to push out).
export async function mountFirstScreen(spec) {
  if (!_host) initScreen();
  const next = buildScreen(spec);
  _host.appendChild(next.node);
  await raf();
  await raf();
  next.node.classList.remove('entering');
  next.node.classList.add('active');
  await wait(700);
  _current = next;
  return next;
}

// Heavy transition: old slides up, new slides up from below.
export async function transitionToScreen(spec, { duration = 700 } = {}) {
  if (!_host) initScreen();
  const old = _current;
  const next = buildScreen(spec);

  // Mount next behind (entering = translateY 100%, opacity 0.6)
  _host.appendChild(next.node);
  await raf();
  await raf();

  // Drive both at once.
  if (old) {
    old.node.classList.remove('active');
    old.node.classList.add('leaving');
  }
  next.node.classList.remove('entering');
  next.node.classList.add('active');

  await wait(duration);

  if (old) old.node.remove();
  _current = next;
  return next;
}

export function getCurrentScreen() { return _current; }
export function getCurrentParaZone() { return _current ? _current.paraZone : null; }
export function getCurrentBg() { return _current ? _current.bg : null; }
