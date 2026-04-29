import { $ } from './util.js';

export const RING = {
  IDLE: 'idle',
  RECORDING: 'recording',
  DELIVERING: 'delivering',
  THINKING: 'thinking',
  RESPONDING: 'responding',
  INPUT: 'input',         // 打字态(短按弹键盘 + type-area 可见)
  SETTLED: 'settled',     // 落回态(键盘已收, 文字保留, 直线在 12vh)
  INVITATION: 'invitation',
};

const STATE_CLASS = {
  [RING.IDLE]: 'state-idle',
  [RING.RECORDING]: 'state-recording',
  [RING.DELIVERING]: 'state-delivering',
  [RING.THINKING]: 'state-thinking',
  [RING.RESPONDING]: 'state-responding',
  [RING.INPUT]: 'state-input',
  [RING.SETTLED]: 'state-settled',
  [RING.INVITATION]: 'state-invitation',
};

let _state = RING.IDLE;
let _actionMode = false;
let _guideBudget = 4;
const _stateChangeListeners = new Set();

export function getRingState() { return _state; }

export function setActionMode(on) {
  _actionMode = !!on;
  const zone = $('#edge-zone');
  if (!zone) return;
  if (_actionMode) zone.classList.add('mode-action');
  else zone.classList.remove('mode-action');
}

export function setRingState(next) {
  const zone = $('#edge-zone');
  if (!zone) return;
  Object.values(STATE_CLASS).forEach((c) => zone.classList.remove(c));
  zone.classList.add(STATE_CLASS[next]);
  const prev = _state;
  _state = next;
  if (prev !== next) _stateChangeListeners.forEach((fn) => fn(next, prev));
}

// 订阅 ring 状态变化 — type-input 子系统、echo-hints 生命周期都需要根据
// 状态变化做事(比如进 invitation 重启 hints, 进 input 关 hints).
export function onRingStateChange(fn) {
  _stateChangeListeners.add(fn);
  return () => _stateChangeListeners.delete(fn);
}

export function initRing() {
  setRingState(RING.IDLE);
  onRingStateChange((next) => {
    if (next !== RING.INVITATION && next !== RING.INPUT && next !== RING.SETTLED) {
      const zone = $('#edge-zone');
      if (zone) zone.classList.remove('arc-guide-active');
    }
  });
}

export function tryConsumeGuide() {
  if (_guideBudget <= 0) return false;
  _guideBudget--;
  return true;
}
