// Two-level camera system:
// Level 1 (sphere): camera at origin, FOV zoom (68°–82°), drag to rotate gaze
// Level 2 (overview): camera at distance 300, orbits around origin
//
// Transition: pinch-out past FOV limit → overview. Any pinch-in in overview → back to sphere.

import * as THREE from 'three';
import { isPinchActive, isInCooldown } from './pinch.js';

// --- Rotation ---
const SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI * 0.4;
const ROT_LERP = 0.12;
const INERTIA_DECAY = 0.92;
const INERTIA_STOP = 0.00005;

// --- FOV zoom (sphere mode) ---
const FOV_DEFAULT = 75;
const FOV_MIN = 68;
const FOV_MAX = 82;
const FOV_LERP = 0.10;
const FOV_SPEED = 0.035; // degrees per px of total pinch delta

// --- Overview mode ---
const OVERVIEW_DISTANCE = 300;
const OVERVIEW_TRANSITION_MS = 350;
const OVERVIEW_EXTRA_PX = 50; // extra px past FOV_MAX limit to trigger overview

// --- Blackhole mode ---
const BLACKHOLE_TRANSITION_MS = 900;
const BLACKHOLE_PITCH_MIN = -Math.PI * 0.1;

let _pivot = null;
let _camera = null;
let _el = null;
let _enabled = false;

let _level = 'sphere'; // 'sphere' | 'transitioning' | 'overview'
let _onLevelChange = null;

// Rotation — initial view points toward the 'fear' star cluster
const INIT_YAW = -1.97;
const INIT_PITCH = 0.47;
let _targetYaw = INIT_YAW;
let _targetPitch = INIT_PITCH;
let _yaw = INIT_YAW;
let _pitch = INIT_PITCH;

// FOV — snapshot-based: pinch start captures _fovAtPinchStart,
// totalDelta drives target relative to that snapshot.
let _targetFov = FOV_DEFAULT;
let _fov = FOV_DEFAULT;
let _fovAtPinchStart = FOV_DEFAULT;

// Drag
let _down = null;
let _vx = 0;
let _vy = 0;
let _lastX = 0;
let _lastY = 0;
let _lastT = 0;

let _needsUpdate = false;
let _updateRaf = null;

// --- Pivot ---

export function createPivot(camera) {
  _camera = camera;
  _pivot = new THREE.Group();
  _pivot.add(camera);
  camera.position.set(0, 0, 0);
  _pivot.rotation.order = 'YXZ';
  _pivot.rotation.y = _yaw;
  _pivot.rotation.x = _pitch;
  return _pivot;
}

export function onLevelChange(cb) { _onLevelChange = cb; }
export function getLevel() { return _level; }

// --- Zoom ---

export function onPinchStart() {
  _fovAtPinchStart = _targetFov;
}

export function applyZoom(totalDelta, frameDelta) {
  if (_level === 'sphere') {
    // totalDelta > 0 = spread = zoom in = lower FOV
    const rawFov = _fovAtPinchStart - totalDelta * FOV_SPEED;
    const clampedFov = Math.max(FOV_MIN, Math.min(FOV_MAX, rawFov));
    _targetFov = clampedFov;

    // If trying to zoom out past FOV_MAX, check overflow for overview trigger
    if (rawFov > FOV_MAX) {
      const overflowPx = (rawFov - FOV_MAX) / FOV_SPEED;
      if (overflowPx >= OVERVIEW_EXTRA_PX) {
        enterOverview();
      }
    }
    ensureUpdating();
  } else if (_level === 'overview') {
    // Any spread in overview → return to sphere
    if (frameDelta > 5) {
      exitOverview();
    }
  } else if (_level === 'blackhole') {
    // Pinch-in → return to sphere
    if (frameDelta < -5) {
      exitBlackhole();
    }
  }
}

export function onPinchEnd() {
  // Snapshot current for next pinch
  _fovAtPinchStart = _targetFov;
}

function onWheel(e) {
  if (!_enabled) return;
  e.preventDefault();
  // Simulate a pinch: treat scroll as totalDelta directly
  const delta = -e.deltaY * 0.15;
  _fovAtPinchStart = _targetFov;
  applyZoom(delta, delta);
}

// --- Level transitions ---

function enterOverview() {
  if (_level !== 'sphere') return;
  _level = 'transitioning';

  const startPos = _camera.position.z;
  const startFov = _fov;
  const startT = performance.now();

  function animate() {
    const elapsed = performance.now() - startT;
    const t = Math.min(1, elapsed / OVERVIEW_TRANSITION_MS);
    const ease = t * (2 - t);

    _camera.position.set(0, 0, startPos + (OVERVIEW_DISTANCE - startPos) * ease);
    _camera.fov = startFov + (FOV_DEFAULT - startFov) * ease;
    _camera.updateProjectionMatrix();

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      _level = 'overview';
      _camera.position.set(0, 0, OVERVIEW_DISTANCE);
      _camera.fov = FOV_DEFAULT;
      _camera.updateProjectionMatrix();
      if (_onLevelChange) _onLevelChange('overview');
    }
  }
  requestAnimationFrame(animate);
  if (_onLevelChange) _onLevelChange('transitioning');
}

function exitOverview() {
  if (_level !== 'overview') return;
  _level = 'transitioning';

  const startT = performance.now();

  function animate() {
    const elapsed = performance.now() - startT;
    const t = Math.min(1, elapsed / OVERVIEW_TRANSITION_MS);
    const ease = t * (2 - t);

    _camera.position.set(0, 0, OVERVIEW_DISTANCE * (1 - ease));
    _camera.fov = FOV_DEFAULT + (FOV_MAX - FOV_DEFAULT) * ease;
    _camera.updateProjectionMatrix();

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      _level = 'sphere';
      _camera.position.set(0, 0, 0);
      _targetFov = FOV_MAX;
      _fov = FOV_MAX;
      _fovAtPinchStart = FOV_MAX;
      _camera.fov = FOV_MAX;
      _camera.updateProjectionMatrix();
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

// --- Blackhole transitions ---

let _savedSphereYaw = 0;
let _savedSpherePitch = 0;

export function enterBlackhole() {
  if (_level !== 'sphere') return;
  _level = 'transitioning';

  _savedSphereYaw = _targetYaw;
  _savedSpherePitch = _targetPitch;

  const startPitch = _pitch;
  const endPitch = Math.max(BLACKHOLE_PITCH_MIN, startPitch - 0.12);
  const startFov = _fov;
  const dipFov = 65;
  const totalMs = 2000;
  const startT = performance.now();

  function animate() {
    const elapsed = performance.now() - startT;
    const t = Math.min(1, elapsed / totalMs);

    // FOV: dip in first 40%, return in remaining 60%
    if (t < 0.4) {
      const p = t / 0.4;
      const ease = p * (2 - p);
      _fov = startFov + (dipFov - startFov) * ease;
    } else {
      const p = (t - 0.4) / 0.6;
      const ease = p * (2 - p);
      _fov = dipFov + (FOV_DEFAULT - dipFov) * ease;
    }
    _camera.fov = _fov;
    _camera.updateProjectionMatrix();

    // Pitch: gentle upward drift starting at 25%
    if (t > 0.25) {
      const p = (t - 0.25) / 0.75;
      const ease = p * (2 - p);
      _pitch = startPitch + (endPitch - startPitch) * ease;
      _pivot.rotation.x = _pitch;
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      _level = 'blackhole';
      _targetYaw = _savedSphereYaw;
      _targetPitch = endPitch;
      _yaw = _savedSphereYaw;
      _pitch = endPitch;
      _targetFov = FOV_DEFAULT;
      _fov = FOV_DEFAULT;
      _camera.fov = FOV_DEFAULT;
      _camera.updateProjectionMatrix();
      if (_onLevelChange) _onLevelChange('blackhole');
    }
  }
  requestAnimationFrame(animate);
  if (_onLevelChange) _onLevelChange('transitioning');
}

export function exitBlackhole() {
  if (_level !== 'blackhole') return;
  _level = 'transitioning';

  const startYaw = _yaw;
  const startPitch = _pitch;
  const startT = performance.now();

  function animate() {
    const elapsed = performance.now() - startT;
    const t = Math.min(1, elapsed / BLACKHOLE_TRANSITION_MS);
    const ease = t * (2 - t);

    _yaw = startYaw + (_savedSphereYaw - startYaw) * ease;
    _pitch = startPitch + (_savedSpherePitch - startPitch) * ease;
    _pivot.rotation.y = _yaw;
    _pivot.rotation.x = _pitch;

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      _level = 'sphere';
      _targetYaw = _savedSphereYaw;
      _targetPitch = _savedSpherePitch;
      _yaw = _savedSphereYaw;
      _pitch = _savedSpherePitch;
      if (_onLevelChange) _onLevelChange('sphere');
    }
  }
  requestAnimationFrame(animate);
  if (_onLevelChange) _onLevelChange('transitioning');
}

// --- Drag rotation ---

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
  _el.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!_enabled || !_down) return;
  if (isPinchActive() || isInCooldown()) { _down = null; return; }
  const now = performance.now();
  const dt = Math.max(1, now - _lastT);
  const dx = e.clientX - _lastX;
  const dy = e.clientY - _lastY;

  // Overview mode: reverse rotation direction (you're rotating the object, not your gaze)
  const sign = _level === 'overview' ? -1 : 1;

  _targetYaw += dx * SENSITIVITY * sign;
  _targetPitch += dy * SENSITIVITY * sign;
  const pitchMin = _level === 'blackhole' ? BLACKHOLE_PITCH_MIN : -PITCH_LIMIT;
  _targetPitch = Math.max(pitchMin, Math.min(PITCH_LIMIT, _targetPitch));

  _vx = dx / dt * sign;
  _vy = dy / dt * sign;
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

// --- Per-frame smooth update ---

function ensureUpdating() {
  if (_needsUpdate) return;
  _needsUpdate = true;
  _updateRaf = requestAnimationFrame(tick);
}

function tick() {
  if (!_needsUpdate) return;

  // Inertia
  if (!_down) {
    if (Math.abs(_vx) > INERTIA_STOP || Math.abs(_vy) > INERTIA_STOP) {
      _targetYaw += _vx * 16 * SENSITIVITY;
      _targetPitch += _vy * 16 * SENSITIVITY;
      const pitchLo = _level === 'blackhole' ? BLACKHOLE_PITCH_MIN : -PITCH_LIMIT;
      _targetPitch = Math.max(pitchLo, Math.min(PITCH_LIMIT, _targetPitch));
      _vx *= INERTIA_DECAY;
      _vy *= INERTIA_DECAY;
    } else {
      _vx = 0;
      _vy = 0;
    }
  }

  // Lerp rotation
  _yaw += (_targetYaw - _yaw) * ROT_LERP;
  _pitch += (_targetPitch - _pitch) * ROT_LERP;

  // Lerp FOV (sphere mode)
  if (_level === 'sphere') {
    _fov += (_targetFov - _fov) * FOV_LERP;
    _camera.fov = _fov;
    _camera.updateProjectionMatrix();
  }

  _pivot.rotation.y = _yaw;
  _pivot.rotation.x = _pitch;

  const yawDiff = Math.abs(_targetYaw - _yaw);
  const pitchDiff = Math.abs(_targetPitch - _pitch);
  const fovDiff = Math.abs(_targetFov - _fov);
  const hasInertia = Math.abs(_vx) > INERTIA_STOP || Math.abs(_vy) > INERTIA_STOP;

  if (yawDiff > 0.0001 || pitchDiff > 0.0001 || fovDiff > 0.01 || hasInertia || _down) {
    _updateRaf = requestAnimationFrame(tick);
  } else {
    _needsUpdate = false;
  }
}

// --- Lifecycle ---

export function initControls(el) {
  _el = el;
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
    _needsUpdate = false;
    if (_updateRaf) { cancelAnimationFrame(_updateRaf); _updateRaf = null; }
  }
}
