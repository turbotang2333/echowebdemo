// Tutorial hints — a single touch-circle indicator that demos either the
// swipe-up gesture or the long-press gesture. Each gesture has its own
// success counter; once the user has succeeded SUCCESS_THRESHOLD times,
// the corresponding hint never shows again (this session — no persistence,
// per design: refresh resets so reviewers see the teaching from scratch).
//
// The element is always in the DOM with opacity:0 by default. Adding the
// .demo-swipe / .demo-press class triggers the corresponding @keyframes
// which drives opacity + transform. Removing the class returns to opacity:0.

import { $ } from './util.js';

const SUCCESS_THRESHOLD = 2;

let _swipeSuccess = 0;
let _pressSuccess = 0;
let _node;

function getNode() {
  if (!_node) _node = $('#touch-hint');
  return _node;
}

function clearClasses(n) {
  n.classList.remove('demo-swipe');
  n.classList.remove('demo-press');
}

export function showSwipeHint() {
  if (_swipeSuccess >= SUCCESS_THRESHOLD) return;
  const n = getNode();
  if (!n) return;
  clearClasses(n);
  // Force reflow so the just-removed animation truly resets before we
  // re-add it — without this, re-showing within the same tick can leave
  // the animation paused at its previous end-frame.
  void n.offsetWidth;
  n.classList.add('demo-swipe');
}

export function hideSwipeHint() {
  const n = getNode();
  if (!n) return;
  n.classList.remove('demo-swipe');
}

export function showPressHint() {
  if (_pressSuccess >= SUCCESS_THRESHOLD) return;
  const n = getNode();
  if (!n) return;
  clearClasses(n);
  void n.offsetWidth;
  n.classList.add('demo-press');
}

export function hidePressHint() {
  const n = getNode();
  if (!n) return;
  n.classList.remove('demo-press');
}

export function recordSwipeSuccess() { _swipeSuccess++; }
export function recordPressSuccess() { _pressSuccess++; }

export function shouldShowArcHint() { return _pressSuccess < SUCCESS_THRESHOLD; }
