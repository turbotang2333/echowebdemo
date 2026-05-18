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

// Scene-jump cancellation: ArrowLeft/Right interrupts the current beat by
// rejecting all pending waits + any registered cancellable waiter (swipe / ring).
// Caught at the runScene boundary in player.js.
export class SceneJumpError extends Error {
  constructor() {
    super('SceneJump');
    this.name = 'SceneJumpError';
  }
}

// Turbo-aware wait: pending waits are flushed when turbo turns on, and
// rejected with SceneJumpError when the user requests a scene jump.
const _pendingWaits = new Set();
const _cancellables = new Set();

export const wait = (ms) => new Promise((resolve, reject) => {
  if (isTurbo() || ms <= 0) { resolve(); return; }
  const entry = { resolve, reject, timer: null };
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

// Register an external waiter (swipe, ring) so it can be rejected on jump.
// Returns a deregister function — call it from a finally to clean up.
export function registerCancellable(rejectFn) {
  _cancellables.add(rejectFn);
  return () => _cancellables.delete(rejectFn);
}

// Reject every pending wait + cancellable waiter with SceneJumpError.
export function cancelPendingWaits() {
  for (const e of _pendingWaits) {
    clearTimeout(e.timer);
    e.reject(new SceneJumpError());
  }
  _pendingWaits.clear();
  const fns = [..._cancellables];
  _cancellables.clear();
  for (const fn of fns) {
    try { fn(new SceneJumpError()); } catch {}
  }
}

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
