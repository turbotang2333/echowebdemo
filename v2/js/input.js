// Unified swipe + tap-fast-forward input layer.
// - Swipe up (vertical drag, downward dy < threshold OR fast flick) → resolve waitForSwipe
// - Tap (no drag, no long-press, no in-progress gesture) → if typing, fast-forward; else
//   also satisfy waitForSwipe (so users on desktop can click-through too)
// Listens on the whole stage. Disabled when ring is active.

import { $, defer } from './util.js';
import { consumeFastForward, isTypingActive } from './paragraph.js';
import { showSwipeHint, hideSwipeHint, recordSwipeSuccess } from './tutorial.js';
import { showSwipeTip, hideSwipeTip, hideSwipeTipImmediate,
         setSwipeProgress, settleSwipeProgress } from './swipeTip.js';
import { isTurbo, setTurbo, onTurboChange } from './turbo.js';

const SWIPE_DY_THRESHOLD = -40; // pixels; up is negative
const SWIPE_VY_THRESHOLD = -0.25; // px/ms upward
const TAP_MAX_MOVE = 10;
const TAP_MAX_TIME = 250;
const TURBO_HOLD_MS = 350; // hold Space this long → fast-forward everything

let _stage;
let _enabled = false;
let _ringActive = false;
let _swipeWaiter = null; // defer
let _firstSwipeShown = false;

let _down = null; // { x, y, t, type }

function onDown(e) {
  if (!_enabled || _ringActive) return;
  if (e.target.closest('.edge-zone')) return; // ring owns its area
  const pt = e.touches ? e.touches[0] : e;
  const type = e.pointerType || (e.touches ? 'touch' : 'mouse');
  _down = { x: pt.clientX, y: pt.clientY, t: performance.now(), type };
}

function onMove(e) {
  if (!_enabled || _ringActive || !_down) return;
  if (!_swipeWaiter) return;
  const pt = e.touches && e.touches[0] ? e.touches[0] : e;
  const dy = pt.clientY - _down.y;
  // progress=1 at threshold (40px upward); allow 1.5 for overshoot rubber-band.
  const progress = Math.max(0, Math.min(1.5, -dy / Math.abs(SWIPE_DY_THRESHOLD)));
  setSwipeProgress(progress);
}

function onUp(e) {
  if (!_enabled || _ringActive) { _down = null; settleSwipeProgress(); return; }
  if (!_down) return;
  const pt = e.changedTouches ? e.changedTouches[0] : e;
  const dx = pt.clientX - _down.x;
  const dy = pt.clientY - _down.y;
  const dt = performance.now() - _down.t;
  const vy = dy / Math.max(1, dt);
  const type = _down.type;
  _down = null;

  const dist = Math.hypot(dx, dy);

  let dismissed = false;

  // Tap = small movement + short time
  if (dist <= TAP_MAX_MOVE && dt <= TAP_MAX_TIME) {
    dismissed = handleTap(type);
  }
  // Vertical swipe up?
  else if ((dy <= SWIPE_DY_THRESHOLD || vy <= SWIPE_VY_THRESHOLD)
           && Math.abs(dy) > Math.abs(dx) * 0.6) {
    dismissed = handleSwipeUp();
  }

  // Gesture didn't dismiss the tip (canceled, sideways, or absorbed by typing
  // fast-forward) — settle the bulged path back to flat.
  if (!dismissed) settleSwipeProgress();
}

function resolveSwipe() {
  if (!_swipeWaiter) return;
  const w = _swipeWaiter;
  _swipeWaiter = null;
  recordSwipeSuccess();
  w.resolve();
}

// handleTap / handleSwipeUp return true iff the gesture committed and the
// tip will be dismissed (slide-off via hideSwipeTip in waitForSwipe.then()).
// Returning false means the bulged path should be settled back to flat by
// the caller.
function handleTap(type) {
  // Touch tap = ONLY fast-forward typing (per design: tap does not advance).
  // Mouse click on PC = also acts as advance (development convenience —
  // PC users have no real swipe gesture). Pen = treated as touch.
  if (isTypingActive()) {
    consumeFastForward();
    return false;
  }
  if (type === 'mouse') {
    resolveSwipe();
    return true;
  }
  return false;
}

function handleSwipeUp() {
  // If typing, skip the typewriter first; the swipe gesture itself does NOT advance.
  if (isTypingActive()) {
    consumeFastForward();
    return false;
  }
  resolveSwipe();
  return true;
}

export function initInput() {
  _stage = $('#stage');
  _stage.addEventListener('pointerdown', onDown);
  _stage.addEventListener('pointermove', onMove);
  _stage.addEventListener('pointerup', onUp);
  _stage.addEventListener('pointercancel', () => { _down = null; settleSwipeProgress(); });

  _stage.addEventListener('touchstart', onDown, { passive: true });
  _stage.addEventListener('touchmove', onMove, { passive: true });
  _stage.addEventListener('touchend', onUp, { passive: true });
  _stage.addEventListener('touchcancel', () => { _down = null; settleSwipeProgress(); });

  // Keyboard shortcut: Space / Enter / ArrowUp = swipe-up advance.
  // Hold Space ≥ TURBO_HOLD_MS = enter turbo (auto-runs all gestures + speeds
  // animations). Release Space → exit turbo. Works regardless of ring state.
  let _turboTimer = null;
  let _spaceHeld = false;

  window.addEventListener('keydown', (e) => {
    if (!_enabled) return;
    if (e.repeat) return;
    if (e.code === 'Space' && !_spaceHeld) {
      _spaceHeld = true;
      _turboTimer = setTimeout(() => { _turboTimer = null; setTurbo(true); }, TURBO_HOLD_MS);
    }
    if (_ringActive) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp') {
      e.preventDefault();
      handleSwipeUp();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      _spaceHeld = false;
      if (_turboTimer) { clearTimeout(_turboTimer); _turboTimer = null; }
      setTurbo(false);
    }
  });

  // While turbo is on, eat every newly opened swipe waiter so the player
  // walks itself through the script.
  onTurboChange((on) => {
    if (on && _swipeWaiter) resolveSwipe();
  });

  _enabled = true;
}

export function setRingActive(on) {
  _ringActive = !!on;
  // Defensive: long-press ring should never coexist with swipe-tip.
  // In normal flow they don't (different player states), but if a race
  // sneaks in, kill the tip immediately so the bottom of the screen is
  // owned by the ring alone.
  if (on) hideSwipeTipImmediate();
}

export function waitForSwipe() {
  // Replace any prior waiter (shouldn't happen, but safe)
  if (_swipeWaiter) _swipeWaiter.resolve();
  _swipeWaiter = defer();
  showSwipeTip();
  showSwipeHint();
  // Turbo already on → resolve next tick so the player keeps walking itself.
  if (isTurbo()) Promise.resolve().then(resolveSwipe);
  return _swipeWaiter.promise.then(() => {
    hideSwipeTip();
    hideSwipeHint();
  });
}

// Boot — wait for the user's first tap to enter (covers autoplay/audio rules later).
export function waitForBoot() {
  const veil = $('#boot-veil');
  return new Promise((resolve) => {
    const onTap = () => {
      veil.removeEventListener('pointerdown', onTap);
      veil.classList.add('gone');
      setTimeout(() => { veil.hidden = true; }, 800);
      resolve();
    };
    veil.addEventListener('pointerdown', onTap);
  });
}
