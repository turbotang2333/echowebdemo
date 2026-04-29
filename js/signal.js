// Fast-forward signal. Supports two modes:
//   _ff=true  → skip all waits (instant advance, for debug)
//   _speed=2  → 2× speed: text types at 2×, all waits halved
//
// Hold Shift on desktop to toggle 2× speed. User-input points always play at 1×.

let _ff = false;
let _speed = 1;

export function setFastForward(v) { _ff = !!v; }
export function isFastForward() { return _ff; }

export function setSpeed(s) { _speed = s; }
export function getSpeed() { return _speed; }

// signalWait: skip entirely if fast-forward, otherwise wait with speed factor.
export function signalWait(ms) {
  if (_ff) return Promise.resolve();
  const actual = Math.round(ms / _speed);
  return new Promise((r) => setTimeout(r, actual));
}