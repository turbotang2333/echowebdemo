import { $ } from './util.js';
import { recordTouchY } from './ring.js';
import { setSpeed } from './signal.js';

const LONG_PRESS_MS = 250;

let _longPressTimer = null;
let _isPressing = false;
let _pressTarget = null;
let _pressMeta = null;

const _waiters = [];

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
  return new Promise((resolve) => { _waiters.push({ type: 'longpress', target: targetId, resolve }); });
}
export function waitForTap(targetId) {
  return new Promise((resolve) => { _waiters.push({ type: 'tap', target: targetId, resolve }); });
}
export function waitForRelease(targetId) {
  return new Promise((resolve) => { _waiters.push({ type: 'release', target: targetId, resolve }); });
}
export function waitForRingLongPress() { return waitForLongPress('edge'); }
export function waitForRingRelease()   { return waitForRelease('edge'); }

const PET_HOLD_MS = 800;
let _petWaiterResolver = null;

export function waitForPet() {
  return new Promise((resolve) => {
    const charEl = document.querySelector('.character');
    if (!charEl) { resolve(); return; }

    let timer = null;
    let startX = 0;
    let startY = 0;

    function onDown(e) {
      e.preventDefault();
      const pt = e.touches ? e.touches[0] : e;
      startX = pt.clientX;
      startY = pt.clientY;
      timer = setTimeout(() => {
        cleanup();
        resolve();
      }, PET_HOLD_MS);
    }

    function onMove(e) {
      if (!timer) return;
      const pt = e.touches ? e.touches[0] : e;
      const dx = pt.clientX - startX;
      const dy = pt.clientY - startY;
      if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function onUp() {
      if (timer) { clearTimeout(timer); timer = null; }
    }

    function cleanup() {
      clearTimeout(timer);
      timer = null;
      charEl.removeEventListener('pointerdown', onDown);
      charEl.removeEventListener('pointermove', onMove);
      charEl.removeEventListener('pointerup', onUp);
      charEl.removeEventListener('pointercancel', onUp);
      charEl.removeEventListener('touchstart', onDown);
      charEl.removeEventListener('touchmove', onMove);
      charEl.removeEventListener('touchend', onUp);
      charEl.removeEventListener('touchcancel', onUp);
    }

    charEl.addEventListener('pointerdown', onDown);
    charEl.addEventListener('pointermove', onMove);
    charEl.addEventListener('pointerup', onUp);
    charEl.addEventListener('pointercancel', onUp);
    charEl.addEventListener('touchstart', onDown, { passive: false });
    charEl.addEventListener('touchmove', onMove, { passive: false });
    charEl.addEventListener('touchend', onUp);
    charEl.addEventListener('touchcancel', onUp);

    _petWaiterResolver = () => {
      cleanup();
      resolve();
    };
  });
}

export function cancelPet() {
  if (_petWaiterResolver) {
    _petWaiterResolver();
    _petWaiterResolver = null;
  }
}

function startPress(target, e) {
  _isPressing = true;
  _pressTarget = target;
  _pressMeta = { startX: e.clientX, startY: e.clientY, startTime: Date.now(), longPressed: false };
  if (target === 'edge' && typeof e.clientY === 'number') {
    recordTouchY(e.clientY);
  }
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

  if (wasLong) fire('release', target);
  else fire('tap', target);
}

function bindPressable(node, targetId) {
  if (!node) return;

  node.addEventListener('pointerdown', (e) => {
    if (_isPressing) return;
    e.preventDefault();
    startPress(targetId, e);
  });
  window.addEventListener('pointerup', () => {
    if (_isPressing && _pressTarget === targetId) endPress(targetId);
  });
  window.addEventListener('pointercancel', () => {
    if (_isPressing && _pressTarget === targetId) endPress(targetId);
  });

  node.addEventListener('touchstart', (e) => {
    if (_isPressing) return;
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

const FF_SPEED = 5;

let _spaceHeld = false;
let _shiftHeld = false;
function initKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!_spaceHeld) {
        _spaceHeld = true;
        startPress('edge', { clientX: 0, clientY: window.innerHeight * 0.55 });
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
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (!_shiftHeld) {
        _shiftHeld = true;
        setSpeed(FF_SPEED);
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && _spaceHeld) {
      _spaceHeld = false;
      endPress('edge');
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      _shiftHeld = false;
      setSpeed(1);
    }
  });
}

export function initInput() {
  bindPressable($('#edge-zone'), 'edge');
  bindPressable($('#opening-glow'), 'opening-glow');
  bindPressable($('#run-anchor'), 'run-anchor');
  initKeyboard();

  window.addEventListener('contextmenu', (e) => e.preventDefault());
  ['#edge-zone', '#opening-glow', '#run-anchor', '#stage'].forEach((sel) => {
    const node = document.querySelector(sel);
    if (node) node.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}
