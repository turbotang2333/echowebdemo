// Gesture engine. Listens for long-press / tap on the ring zone (and via Space key),
// taps on arbitrary anchors, and exposes a Promise-based "wait for gesture" API
// that the player uses at user input points.

import { $ } from './util.js';

const LONG_PRESS_MS = 250;

let _longPressTimer = null;
let _isPressing = false;
let _pressTarget = null;
let _pressMeta = null;

const _waiters = []; // each: { type, target?, resolve }

function fire(type, target) {
  for (let i = 0; i < _waiters.length; i++) {
    const w = _waiters[i];
    if (w.type !== type) continue;
    if (w.target && w.target !== target) continue;
    _waiters.splice(i, 1);
    w.resolve({ type, target });
    return true;
  }
  return false;
}

export function waitForLongPress(targetId) {
  return new Promise((resolve) => {
    _waiters.push({ type: 'longpress', target: targetId, resolve });
  });
}
export function waitForTap(targetId) {
  return new Promise((resolve) => {
    _waiters.push({ type: 'tap', target: targetId, resolve });
  });
}
export function waitForRelease(targetId) {
  return new Promise((resolve) => {
    _waiters.push({ type: 'release', target: targetId, resolve });
  });
}
export function waitForRingLongPress() { return waitForLongPress('ring'); }
export function waitForRingRelease()   { return waitForRelease('ring'); }

// ---------------- listeners ----------------

function startPress(target, e) {
  _isPressing = true;
  _pressTarget = target;
  _pressMeta = { startX: e.clientX, startY: e.clientY, startTime: Date.now(), longPressed: false };
  _longPressTimer = setTimeout(() => {
    if (_isPressing && _pressTarget === target) {
      _pressMeta.longPressed = true;
      fire('longpress', target);
    }
  }, LONG_PRESS_MS);
}

function endPress(target) {
  if (!_isPressing) return;
  const meta = _pressMeta;
  const wasLong = meta && meta.longPressed;
  if (_longPressTimer) clearTimeout(_longPressTimer);
  _longPressTimer = null;
  _isPressing = false;
  _pressTarget = null;
  _pressMeta = null;

  if (wasLong) {
    fire('release', target);
  } else {
    fire('tap', target);
  }
}

function bindPressable(node, targetId) {
  if (!node) return;

  // Pointer Events (modern desktop + recent iOS / Android)
  node.addEventListener('pointerdown', (e) => {
    if (_isPressing) return; // already started via touch event
    e.preventDefault();
    startPress(targetId, e);
  });
  window.addEventListener('pointerup', () => {
    if (_isPressing && _pressTarget === targetId) endPress(targetId);
  });
  window.addEventListener('pointercancel', () => {
    if (_isPressing && _pressTarget === targetId) endPress(targetId);
  });

  // Touch Events fallback — some mobile browsers fire these but not pointer events
  // when touch-action / iOS native gestures interfere.
  node.addEventListener('touchstart', (e) => {
    if (_isPressing) return; // pointerdown already started one
    e.preventDefault();
    const t = e.touches[0] || { clientX: 0, clientY: 0 };
    startPress(targetId, t);
  }, { passive: false });
  node.addEventListener('touchend', () => {
    if (_isPressing && _pressTarget === targetId) endPress(targetId);
  });
  node.addEventListener('touchcancel', () => {
    if (_isPressing && _pressTarget === targetId) endPress(targetId);
  });
}

// Keyboard fallbacks:
//   Space (hold) = long-press the ring
//   Enter        = tap whatever is the most active interactive (opening glow / run-anchor)
//   J            = toggle journal (debug)
let _spaceHeld = false;
function initKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!_spaceHeld) {
        _spaceHeld = true;
        startPress('ring', { clientX: 0, clientY: 0 });
      }
    } else if (e.code === 'Enter') {
      const opening = document.getElementById('opening-glow');
      const runAnchor = document.getElementById('run-anchor');
      if (opening && !opening.hidden) {
        startPress('opening-glow', { clientX: 0, clientY: 0 });
        setTimeout(() => endPress('opening-glow'), 600);
      } else if (runAnchor && !runAnchor.hidden) {
        startPress('run-anchor', { clientX: 0, clientY: 0 });
        setTimeout(() => endPress('run-anchor'), 50);
      }
    } else if (e.code === 'KeyJ') {
      import('./journal.js').then((m) => {
        if (m.isJournalOpen()) m.closeJournal();
        else m.openJournal();
      });
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && _spaceHeld) {
      _spaceHeld = false;
      endPress('ring');
    }
  });
}

export function initInput() {
  bindPressable($('#ring-zone'), 'ring');
  bindPressable($('#opening-glow'), 'opening-glow');
  bindPressable($('#run-anchor'), 'run-anchor');
  initKeyboard();

  // Block the browser's right-click / long-press context menu so it doesn't
  // pop while the user is holding the recording arc. Demo is a closed
  // experience — no copy / save / inspect affordances expected.
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  // Belt-and-suspenders: explicitly block on the press targets too,
  // for browsers that fire contextmenu before bubbling reaches window.
  ['#ring-zone', '#opening-glow', '#run-anchor', '#stage'].forEach((sel) => {
    const node = document.querySelector(sel);
    if (node) node.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}
