// Bottom swipe tip — shown whenever the user can advance via swipe-up.
// Same arc primitive as the long-press ring (visual family), but rendered
// as PURE FILL (no stroke) so the visual language is cleanly opposed to
// the long-press ring's "line": ring = 线/邀请, swipe-tip = 面/等待揭开.
//
// Behaviour:
//   - Slow opacity breathing while idle/visible.
//   - During a swipe gesture, setSwipeProgress(p ∈ [0..1.5]) drives a
//     pure scale (transform-origin: center bottom) so the wash grows
//     from the bottom edge, plus fill alpha climbs from FILL_ALPHA_BASE
//     up to ~+gain. No threshold/armed feedback — gradient only.
//   - On release without commit: settleSwipeProgress() ease-outs back to 0.
//   - On release with commit: hideSwipeTip() blurs+fades+drifts -28vh
//     (CSS .leaving), dissolving without a flying line.
//
// Differs from the swipe touch-circle tutorial (tutorial.js):
//   - tutorial: first-time gesture teaching, fades after 2 successes
//   - swipe-tip: always-on readiness indicator for every swipe-ready beat

import { $ } from './util.js';

// Cleanup window: must outlast the longest leaving transition (translate 380ms).
// Set to 450ms to give a 70ms cushion before applyProgress(0) resets scale.
const LEAVE_RESET_MS = 450;

// Same animation language as the long-press arc: pure scale from
// transform-origin: center bottom. The path's d attribute is FROZEN —
// no morphing — so corners and control stay at their original positions
// in the SVG. Only the rendered scale grows with progress, which makes
// the peak rise and the arc spread wider while the bottom edge stays
// anchored. Long-press goes 1.0 → 1.7 (state-recording); we go 1.0 →
// SCALE_AT_FULL because the swipe-tip starts visually smaller (only the
// peak peeks above the screen at scale 1).
const SCALE_AT_FULL = 1.7;
const SCALE_BASE = 1.0;

const SETTLE_DURATION_MS = 250;

// Visual modulation as progress climbs: fill alpha DROPS so the wash
// dissolves toward transparent at full pull, instead of darkening into
// a solid color slab. Top-edge softening is handled separately by the
// SVG mask-image gradient on .swipe-tip-svg.
const FILL_ALPHA_BASE = 0.28;
const FILL_ALPHA_DROP = 0.15;       // 0.28 → ~0.10 at p=1.2
const FILL_ALPHA_FLOOR = 0.10;

let _node = null;
let _fill = null;
let _resetTimer = null;
let _rafScheduled = false;
let _pendingProgress = null;
let _settleRaf = null;
let _currentProgress = 0;

function ensureNodes() {
  if (_node) return;
  _node = $('#swipe-tip');
  if (!_node) return;
  _fill = _node.querySelector('.swipe-tip-fill');
}

function applyProgress(p) {
  ensureNodes();
  if (!_node) return;
  const cl = Math.max(0, Math.min(1.2, p));
  _currentProgress = cl;

  // Pure scale, center-bottom anchored — path d is never touched.
  const scale = SCALE_BASE + cl * (SCALE_AT_FULL - SCALE_BASE);
  _node.style.scale = scale.toFixed(3);

  // Fill alpha falls with progress: pulled higher = closer to dissolving.
  if (_fill) {
    const a = Math.max(FILL_ALPHA_FLOOR, FILL_ALPHA_BASE - cl * FILL_ALPHA_DROP);
    _fill.style.fill = `rgba(255, 235, 210, ${a})`;
  }
}

export function showSwipeTip() {
  ensureNodes();
  if (!_node) return;
  if (_resetTimer) { clearTimeout(_resetTimer); _resetTimer = null; }
  if (_settleRaf) { cancelAnimationFrame(_settleRaf); _settleRaf = null; }
  applyProgress(0);
  _node.classList.remove('leaving');
  _node.classList.add('visible');
}

// Called on a successful swipe — dissolves in place with light upward
// drift (CSS .leaving handles the visual choreography).
export function hideSwipeTip() {
  ensureNodes();
  if (!_node) return;
  if (_settleRaf) { cancelAnimationFrame(_settleRaf); _settleRaf = null; }
  _node.classList.add('leaving');
  _node.classList.remove('visible');
  // Critical: clear the inline scale so .leaving's CSS scale:1 wins.
  // Inline style has higher specificity than class rules; without this
  // clear, leaving would stay frozen at the gesture's last scale.
  _node.style.scale = '';
  if (_resetTimer) clearTimeout(_resetTimer);
  _resetTimer = setTimeout(() => {
    _node.classList.remove('leaving');
    applyProgress(0);
    _resetTimer = null;
  }, LEAVE_RESET_MS);
}

// Force-hide without slide (long-press ring takeover defense).
export function hideSwipeTipImmediate() {
  ensureNodes();
  if (!_node) return;
  if (_resetTimer) { clearTimeout(_resetTimer); _resetTimer = null; }
  if (_settleRaf) { cancelAnimationFrame(_settleRaf); _settleRaf = null; }
  _node.classList.remove('visible');
  _node.classList.remove('leaving');
  applyProgress(0);
}

// Called continuously during the swipe gesture. Throttled to 1 RAF so we
// don't fight the browser on devices that fire pointermove faster than 60Hz.
export function setSwipeProgress(p) {
  if (_settleRaf) { cancelAnimationFrame(_settleRaf); _settleRaf = null; }
  _pendingProgress = p;
  if (_rafScheduled) return;
  _rafScheduled = true;
  requestAnimationFrame(() => {
    _rafScheduled = false;
    if (_pendingProgress !== null) {
      applyProgress(_pendingProgress);
      _pendingProgress = null;
    }
  });
}

// Smooth-settle progress back to 0 (release without commit, or gesture
// absorbed by typing fast-forward). 250ms ease-out cubic.
export function settleSwipeProgress() {
  if (_currentProgress <= 0.001) return;
  _pendingProgress = null;
  if (_settleRaf) cancelAnimationFrame(_settleRaf);

  const initial = _currentProgress;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / SETTLE_DURATION_MS);
    const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
    applyProgress(initial * (1 - e));
    if (t < 1) {
      _settleRaf = requestAnimationFrame(tick);
    } else {
      _settleRaf = null;
    }
  };
  _settleRaf = requestAnimationFrame(tick);
}
