// Mode state machine: content ↔ starmap (with two sub-levels: sphere / overview).
// Entry: tap button.  Exit: tap close button.
// Pinch drives FOV zoom in sphere mode, triggers overview transition at limit.

import { initStarMap, startRendering, stopRendering, hitTestNebula, animateNebulaEnter, animateNebulaExit } from './starmap.js';
import { initControls, setControlsEnabled, applyZoom, onPinchStart, onPinchEnd, onLevelChange, getLevel, toggleOverview, enterBlackhole, exitBlackhole } from './starmap-controls.js';
import { initPinch, setPinchEnabled } from './pinch.js';
import { initPuzzle, enterPuzzleMode, exitPuzzleMode, revealAnswers } from './starmap-puzzle.js';

const TRANSITION_MS = 600;

let _mode = 'content';
let _stage = null;
let _arcEl = null;
let _tapStart = null;
let _enteringBlackhole = false;
let _prevLevel = 'sphere';
let _puzzleSolved = false;

export function getMode() { return _mode; }
export { getLevel };

export function init(stage, canvas) {
  _stage = stage;

  initStarMap(canvas);
  initControls(canvas);
  setControlsEnabled(false);

  initPinch(canvas, {
    onZoom: (totalDelta, frameDelta) => {
      if (_mode === 'starmap') applyZoom(totalDelta, frameDelta);
    },
    onZoomEnd: () => {
      if (_mode === 'starmap') onPinchEnd();
    },
  });

  // Detect pinch start via touchstart on canvas
  canvas.addEventListener('touchstart', (e) => {
    if (_mode === 'starmap' && e.touches.length === 2) {
      onPinchStart();
    }
  }, { passive: true });

  setPinchEnabled(false);

  _arcEl = document.getElementById('blackhole-arc');

  const slotsEl = document.getElementById('puzzle-slots');
  const ghostEl = document.getElementById('drag-ghost');
  initPuzzle(canvas, slotsEl, ghostEl, {
    onSolved: () => { _puzzleSolved = true; },
  });

  // Tap detection for nebula click (distinguish from drag)
  canvas.addEventListener('pointerdown', (e) => {
    if (_mode !== 'starmap') return;
    _tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (_mode !== 'starmap' || !_tapStart) return;
    const dx = e.clientX - _tapStart.x;
    const dy = e.clientY - _tapStart.y;
    const dt = performance.now() - _tapStart.t;
    _tapStart = null;
    if (Math.hypot(dx, dy) > 10 || dt > 300) return; // not a tap

    const level = getLevel();
    if (level === 'sphere') {
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (hitTestNebula(ndcX, ndcY)) {
        goToBlackhole();
      }
    }
  });

  onLevelChange((level) => {
    if (level === 'blackhole') {
      _enteringBlackhole = false;
      enterPuzzleMode();
      if (hintBtn) hintBtn.classList.add('visible');
    }
    if (level === 'transitioning' && _prevLevel === 'blackhole') {
      exitPuzzleMode();
      if (_arcEl) _arcEl.classList.remove('visible');
      if (hintBtn) hintBtn.classList.remove('visible');
      if (!_puzzleSolved) {
        setTimeout(() => animateNebulaExit(), 400);
      }
    }
    if (level === 'sphere') {
      if (_arcEl) _arcEl.classList.remove('visible');
      if (hintBtn) hintBtn.classList.remove('visible');
    }
    _prevLevel = level;
  });

  const enterBtn = document.getElementById('enter-starmap');
  const exitBtn = document.getElementById('exit-starmap');
  const hintBtn = document.getElementById('hint-btn');
  if (enterBtn) enterBtn.addEventListener('click', () => enterStarMap());
  if (exitBtn) exitBtn.addEventListener('click', () => exitStarMap());
  if (hintBtn) hintBtn.addEventListener('click', () => revealAnswers());
}

function goToBlackhole() {
  _enteringBlackhole = true;
  enterBlackhole();
  animateNebulaEnter(() => {
    // Nebula starts sinking — begin arc entrance
    if (_arcEl) {
      _arcEl.classList.add('entering');
      _arcEl.classList.add('visible');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        _arcEl.classList.remove('entering');
      }));
    }
  });
}

function leaveBlackhole() {
  exitBlackhole();
}

function enterStarMap() {
  if (_mode !== 'content') return;
  _mode = 'transitioning';

  startRendering();
  _stage.classList.add('starmap-active');

  setTimeout(() => {
    _mode = 'starmap';
    setControlsEnabled(true);
    setPinchEnabled(true);
  }, TRANSITION_MS);
}

function exitStarMap() {
  if (_mode !== 'starmap') return;
  _mode = 'transitioning';
  exitPuzzleMode();
  setControlsEnabled(false);
  setPinchEnabled(false);

  if (_arcEl) _arcEl.classList.remove('visible');
  _stage.classList.remove('starmap-active');

  setTimeout(() => {
    stopRendering();
    _mode = 'content';
  }, TRANSITION_MS);
}

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyS') {
    if (_mode === 'content') enterStarMap();
    else if (_mode === 'starmap') exitStarMap();
  }
  if (e.code === 'KeyO' && _mode === 'starmap') {
    toggleOverview();
  }
  if (e.code === 'KeyB' && _mode === 'starmap') {
    const level = getLevel();
    if (level === 'sphere') goToBlackhole();
    else if (level === 'blackhole') leaveBlackhole();
  }
});
