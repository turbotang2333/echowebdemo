// Continuous pinch-zoom gesture detector (shared with 3D version).

const COOLDOWN_MS = 150;

let _onZoom = null;
let _onZoomEnd = null;
let _enabled = true;
let _active = false;
let _startDist = 0;
let _lastDist = 0;
let _cooldownUntil = 0;

function fingerDist(t1, t2) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

function onTouchStart(e) {
  if (!_enabled) return;
  if (e.touches.length === 2) {
    _active = true;
    _startDist = fingerDist(e.touches[0], e.touches[1]);
    _lastDist = _startDist;
    e.preventDefault();
  }
}

function onTouchMove(e) {
  if (!_active || e.touches.length < 2) return;
  e.preventDefault();
  const d = fingerDist(e.touches[0], e.touches[1]);
  const totalDelta = d - _startDist;
  const frameDelta = d - _lastDist;
  _lastDist = d;
  if (_onZoom) _onZoom(totalDelta, frameDelta);
}

function onTouchEnd() {
  if (_active) {
    _active = false;
    _cooldownUntil = performance.now() + COOLDOWN_MS;
    if (_onZoomEnd) _onZoomEnd();
  }
}

export function initPinch(el, { onZoom, onZoomEnd }) {
  _onZoom = onZoom;
  _onZoomEnd = onZoomEnd || null;
  el.addEventListener('touchstart', onTouchStart, { passive: false });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd);
  el.addEventListener('touchcancel', onTouchEnd);
}

export function setPinchEnabled(on) { _enabled = !!on; }
export function isPinchActive() { return _active; }
export function isInCooldown() { return performance.now() < _cooldownUntil; }
