// 2D camera controls: pan + orthographic zoom.
// Blackhole mode: swipe rotates the world group around the black hole pivot.

import { isPinchActive, isInCooldown } from './pinch.js';

// --- Pan ---
const PAN_LERP = 0.12;
const INERTIA_DECAY = 0.92;
const INERTIA_STOP = 0.05;

// --- Zoom ---
const ZOOM_DEFAULT = 1.0;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_LERP = 0.10;
const ZOOM_SPEED = 0.004;
const OVERVIEW_ZOOM = 0.45;
const OVERVIEW_EXTRA_PX = 50;
const OVERVIEW_TRANSITION_MS = 350;

// --- Blackhole ---
const BLACKHOLE_TRANSITION_MS = 1200;
const BLACKHOLE_ZOOM = 1.8;
const ROTATE_SENSITIVITY = 0.004; // rad per screen px
const ROTATE_INERTIA_DECAY = 0.94;
const ROTATE_INERTIA_STOP = 0.00005;

let _camera = null;
let _el = null;
let _enabled = false;
let _baseViewH = 400;
let _worldGroup = null;

let _level = 'sphere';
let _onLevelChange = null;

// Pan state
let _panX = 0, _panY = 0;
let _targetPanX = 0, _targetPanY = 0;
let _vx = 0, _vy = 0;

// Zoom state
let _zoom = ZOOM_DEFAULT;
let _targetZoom = ZOOM_DEFAULT;
let _zoomAtPinchStart = ZOOM_DEFAULT;

// Blackhole rotation state
let _bhAngle = 0;
let _targetBhAngle = 0;
let _bhVelocity = 0;
let _bhPivotX = 0, _bhPivotY = 0;

// Drag
let _down = null;
let _lastX = 0, _lastY = 0, _lastT = 0;

let _needsUpdate = false;
let _updateRaf = null;

// Saved state for blackhole
let _savedPanX = 0, _savedPanY = 0, _savedZoom = ZOOM_DEFAULT;

export function onLevelChange(cb) { _onLevelChange = cb; }
export function getLevel() { return _level; }

export function initControls(el, camera, worldGroup) {
  _el = el;
  _camera = camera;
  _worldGroup = worldGroup;
  _baseViewH = camera.top - camera.bottom;
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  el.addEventListener('wheel', onWheel, { passive: false });
}

export function setControlsEnabled(on) {
  _enabled = !!on;
  if (!on) {
    _down = null;
    _vx = 0;
    _vy = 0;
    _bhVelocity = 0;
    _needsUpdate = false;
    if (_updateRaf) { cancelAnimationFrame(_updateRaf); _updateRaf = null; }
  }
}

// --- Zoom API ---

export function onPinchStart() {
  _zoomAtPinchStart = _targetZoom;
}

export function applyZoom(totalDelta, frameDelta) {
  if (_level === 'sphere') {
    const rawZoom = _zoomAtPinchStart + totalDelta * ZOOM_SPEED;
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, rawZoom));
    _targetZoom = clamped;

    if (rawZoom < ZOOM_MIN) {
      const overflowPx = (ZOOM_MIN - rawZoom) / ZOOM_SPEED;
      if (overflowPx >= OVERVIEW_EXTRA_PX) {
        enterOverview();
      }
    }
    ensureUpdating();
  } else if (_level === 'overview') {
    if (frameDelta > 5) {
      exitOverview();
    }
  } else if (_level === 'blackhole') {
    if (frameDelta < -5) {
      exitBlackhole();
    }
  }
}

export function onPinchEnd() {
  _zoomAtPinchStart = _targetZoom;
}

function onWheel(e) {
  if (!_enabled) return;
  e.preventDefault();
  const delta = -e.deltaY * 0.15;
  _zoomAtPinchStart = _targetZoom;
  applyZoom(delta, delta);
}

// --- Level transitions ---

function enterOverview() {
  if (_level !== 'sphere') return;
  _level = 'transitioning';

  const startZoom = _zoom;
  const startT = performance.now();

  function animate() {
    const elapsed = performance.now() - startT;
    const t = Math.min(1, elapsed / OVERVIEW_TRANSITION_MS);
    const ease = t * (2 - t);

    setZoomImmediate(startZoom + (OVERVIEW_ZOOM - startZoom) * ease);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      _level = 'overview';
      setZoomImmediate(OVERVIEW_ZOOM);
      _targetZoom = OVERVIEW_ZOOM;
      _zoom = OVERVIEW_ZOOM;
      if (_onLevelChange) _onLevelChange('overview');
    }
  }
  requestAnimationFrame(animate);
  if (_onLevelChange) _onLevelChange('transitioning');
}

function exitOverview() {
  if (_level !== 'overview') return;
  _level = 'transitioning';

  const startZoom = _zoom;
  const startT = performance.now();

  function animate() {
    const elapsed = performance.now() - startT;
    const t = Math.min(1, elapsed / OVERVIEW_TRANSITION_MS);
    const ease = t * (2 - t);

    setZoomImmediate(startZoom + (ZOOM_MIN - startZoom) * ease);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      _level = 'sphere';
      _targetZoom = ZOOM_MIN;
      _zoom = ZOOM_MIN;
      _zoomAtPinchStart = ZOOM_MIN;
      setZoomImmediate(ZOOM_MIN);
      if (_onLevelChange) _onLevelChange('sphere');
    }
  }
  requestAnimationFrame(animate);
  if (_onLevelChange) _onLevelChange('transitioning');
}

export function toggleOverview() {
  if (_level === 'sphere') enterOverview();
  else if (_level === 'overview') exitOverview();
}

// --- Blackhole ---

export function enterBlackhole(nebulaX, nebulaY) {
  if (_level !== 'sphere') return;
  _level = 'transitioning';

  _savedPanX = _targetPanX;
  _savedPanY = _targetPanY;
  _savedZoom = _targetZoom;

  // The black hole pivot: nebula position, but camera looks a bit above it
  // so the arc sits at the bottom of screen
  _bhPivotX = nebulaX;
  _bhPivotY = nebulaY;

  const viewH = _baseViewH / BLACKHOLE_ZOOM;
  const targetPanX = nebulaX;
  const targetPanY = nebulaY + viewH * 0.3; // offset up so nebula is in lower part

  const startPanX = _panX, startPanY = _panY;
  const startZoom = _zoom;
  const totalMs = BLACKHOLE_TRANSITION_MS;
  const startT = performance.now();

  _bhAngle = 0;
  _targetBhAngle = 0;
  _bhVelocity = 0;
  if (_worldGroup) {
    _worldGroup.rotation.z = 0;
    _worldGroup.position.set(0, 0, 0);
  }

  function animate() {
    const elapsed = performance.now() - startT;
    const t = Math.min(1, elapsed / totalMs);
    const ease = t * (2 - t);

    _panX = startPanX + (targetPanX - startPanX) * ease;
    _panY = startPanY + (targetPanY - startPanY) * ease;
    applyCameraPan();

    const z = startZoom + (BLACKHOLE_ZOOM - startZoom) * ease;
    setZoomImmediate(z);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      _level = 'blackhole';
      _targetPanX = targetPanX;
      _targetPanY = targetPanY;
      _panX = targetPanX;
      _panY = targetPanY;
      _targetZoom = BLACKHOLE_ZOOM;
      _zoom = BLACKHOLE_ZOOM;
      applyCameraPan();
      setZoomImmediate(BLACKHOLE_ZOOM);
      if (_onLevelChange) _onLevelChange('blackhole');
    }
  }
  requestAnimationFrame(animate);
  if (_onLevelChange) _onLevelChange('transitioning');
}

export function exitBlackhole() {
  if (_level !== 'blackhole') return;
  _level = 'transitioning';

  const startPanX = _panX, startPanY = _panY;
  const startZoom = _zoom;
  const startAngle = _bhAngle;
  const startT = performance.now();

  function animate() {
    const elapsed = performance.now() - startT;
    const t = Math.min(1, elapsed / BLACKHOLE_TRANSITION_MS);
    const ease = t * (2 - t);

    _panX = startPanX + (_savedPanX - startPanX) * ease;
    _panY = startPanY + (_savedPanY - startPanY) * ease;
    applyCameraPan();

    const z = startZoom + (_savedZoom - startZoom) * ease;
    setZoomImmediate(z);

    // Smoothly rotate back to 0
    const angle = startAngle * (1 - ease);
    applyWorldRotation(angle);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      _level = 'sphere';
      _targetPanX = _savedPanX;
      _targetPanY = _savedPanY;
      _panX = _savedPanX;
      _panY = _savedPanY;
      _targetZoom = _savedZoom;
      _zoom = _savedZoom;
      _zoomAtPinchStart = _savedZoom;
      applyCameraPan();
      setZoomImmediate(_savedZoom);
      applyWorldRotation(0);
      _bhAngle = 0;
      _targetBhAngle = 0;
      _bhVelocity = 0;
      if (_onLevelChange) _onLevelChange('sphere');
    }
  }
  requestAnimationFrame(animate);
  if (_onLevelChange) _onLevelChange('transitioning');
}

// --- Drag: pan (sphere) or rotate (blackhole) ---

function onPointerDown(e) {
  if (!_enabled) return;
  if (e.pointerType === 'touch' && e.isPrimary === false) return;
  if (isPinchActive() || isInCooldown()) return;
  _down = true;
  _lastX = e.clientX;
  _lastY = e.clientY;
  _lastT = performance.now();
  _vx = 0;
  _vy = 0;
  _bhVelocity = 0;
  _el.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!_enabled || !_down) return;
  if (isPinchActive() || isInCooldown()) { _down = null; return; }
  const now = performance.now();
  const dt = Math.max(1, now - _lastT);
  const dx = e.clientX - _lastX;
  const dy = e.clientY - _lastY;

  if (_level === 'blackhole') {
    // Horizontal swipe → rotate world group around pivot
    _targetBhAngle += dx * ROTATE_SENSITIVITY;
    _bhVelocity = dx / dt * ROTATE_SENSITIVITY;
  } else {
    // Normal pan
    const screenToWorld = _baseViewH / (_zoom * _el.clientHeight);
    _targetPanX -= dx * screenToWorld;
    _targetPanY += dy * screenToWorld;
    _vx = -dx / dt * screenToWorld;
    _vy = dy / dt * screenToWorld;
  }

  _lastX = e.clientX;
  _lastY = e.clientY;
  _lastT = now;
  ensureUpdating();
}

function onPointerUp(e) {
  if (!_down) return;
  _down = null;
  _el.releasePointerCapture(e.pointerId);
  ensureUpdating();
}

// --- Camera / world helpers ---

function applyCameraPan() {
  if (!_camera) return;
  _camera.position.x = _panX;
  _camera.position.y = _panY;
}

function setZoomImmediate(z) {
  if (!_camera) return;
  const aspect = _el.clientWidth / _el.clientHeight;
  const halfH = _baseViewH / (2 * z);
  _camera.left = -halfH * aspect;
  _camera.right = halfH * aspect;
  _camera.top = halfH;
  _camera.bottom = -halfH;
  _camera.updateProjectionMatrix();
}

function applyWorldRotation(angle) {
  if (!_worldGroup) return;
  // Rotate around the black hole pivot point
  // Move pivot to origin → rotate → move back
  _worldGroup.position.x = _bhPivotX - _bhPivotX * Math.cos(angle) + _bhPivotY * Math.sin(angle);
  _worldGroup.position.y = _bhPivotY - _bhPivotX * Math.sin(angle) - _bhPivotY * Math.cos(angle);
  _worldGroup.rotation.z = angle;
}

// --- Per-frame update ---

function ensureUpdating() {
  if (_needsUpdate) return;
  _needsUpdate = true;
  _updateRaf = requestAnimationFrame(tick);
}

function tick() {
  if (!_needsUpdate) return;

  if (_level === 'blackhole') {
    // Blackhole: rotation inertia
    if (!_down) {
      if (Math.abs(_bhVelocity) > ROTATE_INERTIA_STOP) {
        _targetBhAngle += _bhVelocity * 16;
        _bhVelocity *= ROTATE_INERTIA_DECAY;
      } else {
        _bhVelocity = 0;
      }
    }

    _bhAngle += (_targetBhAngle - _bhAngle) * PAN_LERP;
    applyWorldRotation(_bhAngle);

    const angleDiff = Math.abs(_targetBhAngle - _bhAngle);
    const hasInertia = Math.abs(_bhVelocity) > ROTATE_INERTIA_STOP;

    if (angleDiff > 0.0001 || hasInertia || _down) {
      _updateRaf = requestAnimationFrame(tick);
    } else {
      _needsUpdate = false;
    }
  } else {
    // Normal sphere/overview: pan inertia
    if (!_down) {
      if (Math.abs(_vx) > INERTIA_STOP || Math.abs(_vy) > INERTIA_STOP) {
        _targetPanX += _vx * 16;
        _targetPanY += _vy * 16;
        _vx *= INERTIA_DECAY;
        _vy *= INERTIA_DECAY;
      } else {
        _vx = 0;
        _vy = 0;
      }
    }

    _panX += (_targetPanX - _panX) * PAN_LERP;
    _panY += (_targetPanY - _panY) * PAN_LERP;
    applyCameraPan();

    if (_level === 'sphere') {
      _zoom += (_targetZoom - _zoom) * ZOOM_LERP;
      setZoomImmediate(_zoom);
    }

    const panDiff = Math.abs(_targetPanX - _panX) + Math.abs(_targetPanY - _panY);
    const zoomDiff = Math.abs(_targetZoom - _zoom);
    const hasInertia = Math.abs(_vx) > INERTIA_STOP || Math.abs(_vy) > INERTIA_STOP;

    if (panDiff > 0.1 || zoomDiff > 0.001 || hasInertia || _down) {
      _updateRaf = requestAnimationFrame(tick);
    } else {
      _needsUpdate = false;
    }
  }
}
