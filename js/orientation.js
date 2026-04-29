import { $ } from './util.js';

export const PORTRAIT = 'portrait';
export const LANDSCAPE = 'landscape';

let _expected = LANDSCAPE;
let _expectedMessage = '请将设备横置以体验';
let _changeListeners = [];

function getCurrent() {
  return window.matchMedia('(orientation: portrait)').matches ? PORTRAIT : LANDSCAPE;
}

function applyState() {
  const cur = getCurrent();
  document.body.classList.toggle('portrait-mode', cur === PORTRAIT);
  document.body.classList.toggle('landscape-mode', cur === LANDSCAPE);
  updateGate();
  _changeListeners.forEach((fn) => fn(cur));
}

function updateGate() {
  const gate = $('#orientation-gate');
  if (!gate) return;
  const cur = getCurrent();
  const matches = cur === _expected;
  const p = gate.querySelector('p');
  if (p) p.textContent = _expectedMessage;
  if (matches) gate.classList.remove('visible');
  else gate.classList.add('visible');
}

export function getOrientation() { return getCurrent(); }

export function expectOrientation(orient, message) {
  _expected = orient;
  if (message) {
    _expectedMessage = message;
  } else {
    _expectedMessage = orient === PORTRAIT
      ? '请将设备竖置以体验'
      : '请将设备横置以体验';
  }
  applyState();
}

export function waitForOrientation(orient) {
  if (getCurrent() === orient) return Promise.resolve();
  return new Promise((resolve) => {
    const handler = () => {
      if (getCurrent() === orient) {
        _changeListeners = _changeListeners.filter((f) => f !== handler);
        resolve();
      }
    };
    _changeListeners.push(handler);
  });
}

export function initOrientation() {
  applyState();
  window.addEventListener('resize', applyState);
  window.addEventListener('orientationchange', applyState);
}
