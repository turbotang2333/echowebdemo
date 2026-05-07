// Tiny helpers shared across modules.
import { isTurbo, onTurboChange } from './turbo.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.cls) node.className = opts.cls;
  if (opts.text) node.textContent = opts.text;
  if (opts.html) node.innerHTML = opts.html;
  if (opts.attrs) for (const k in opts.attrs) node.setAttribute(k, opts.attrs[k]);
  if (opts.style) Object.assign(node.style, opts.style);
  return node;
}

// Turbo-aware wait: pending waits are flushed when turbo turns on.
const _pendingWaits = new Set();
export const wait = (ms) => new Promise((resolve) => {
  if (isTurbo() || ms <= 0) { resolve(); return; }
  const entry = { resolve, timer: null };
  entry.timer = setTimeout(() => {
    _pendingWaits.delete(entry);
    resolve();
  }, ms);
  _pendingWaits.add(entry);
});

onTurboChange((on) => {
  if (!on) return;
  for (const e of _pendingWaits) {
    clearTimeout(e.timer);
    e.resolve();
  }
  _pendingWaits.clear();
});

export const raf = () => new Promise(requestAnimationFrame);

export function waitFor(cond, interval = 50) {
  return new Promise((resolve) => {
    const tick = () => {
      if (cond()) resolve();
      else setTimeout(tick, interval);
    };
    tick();
  });
}

// A simple deferred — promise + external resolve/reject.
export function defer() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// AbortController wrapper that cancels a pending promise on abort.
export function abortable(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject);
  });
}
