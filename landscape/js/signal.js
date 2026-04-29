// Shared fast-forward signal. When set, text / transition / pause functions
// short-circuit so the player races to the next user-interactive event.

let _ff = false;

export function setFastForward(v) { _ff = !!v; }
export function isFastForward() { return _ff; }

// signalWait: like wait(ms) but resolves immediately if fast-forward is active.
export function signalWait(ms) {
  if (_ff) return Promise.resolve();
  return new Promise((r) => setTimeout(r, ms));
}
