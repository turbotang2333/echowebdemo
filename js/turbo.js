// Turbo / fast-forward mode for desktop preview.
// Activated by holding Space (see input.js). When on:
//   - util.wait() resolves immediately (existing pending waits flushed)
//   - paragraph typer/reveal skip to end
//   - waitForSwipe auto-resolves
//   - ring + pet long-press waiters auto-commit
// All other code stays unchanged — turbo is a global multiplier.

let _on = false;
const _listeners = new Set();

export function isTurbo() { return _on; }

export function setTurbo(v) {
  v = !!v;
  if (v === _on) return;
  _on = v;
  for (const cb of _listeners) {
    try { cb(v); } catch (err) { console.error('turbo listener', err); }
  }
}

export function onTurboChange(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}
