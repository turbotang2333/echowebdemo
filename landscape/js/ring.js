import { $ } from './util.js';

export const RING = {
  IDLE: 'idle',
  RECORDING: 'recording',
  DELIVERING: 'delivering',
  THINKING: 'thinking',
  RESPONDING: 'responding',
  INPUT: 'input',
  INVITATION: 'invitation',
};

const STATE_CLASS = {
  [RING.IDLE]: 'state-idle',
  [RING.RECORDING]: 'state-recording',
  [RING.DELIVERING]: 'state-delivering',
  [RING.THINKING]: 'state-thinking',
  [RING.RESPONDING]: 'state-responding',
  [RING.INPUT]: 'state-input',
  [RING.INVITATION]: 'state-invitation',
};

let _state = RING.IDLE;
let _lastTouchY = null;

export function getRingState() { return _state; }

export function setRingState(next) {
  const zone = $('#edge-zone');
  if (!zone) return;
  Object.values(STATE_CLASS).forEach((c) => zone.classList.remove(c));
  zone.classList.add(STATE_CLASS[next]);
  _state = next;
}

export function recordTouchY(y) {
  _lastTouchY = y;
  const ratio = Math.max(0.18, Math.min(0.82, y / window.innerHeight));
  document.documentElement.style.setProperty('--ink-y', `${(ratio * 100).toFixed(1)}vh`);
}

export function getLastTouchY() { return _lastTouchY; }

export function initRing() {
  setRingState(RING.IDLE);
  document.documentElement.style.setProperty('--ink-y', '55vh');
}
