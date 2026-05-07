// Ring dialogue — drives the v1 state machine on #edge-zone:
//   idle → invitation (open, breathing arc + prompt + arc-hint until press is learned)
//   invitation → recording (≥250ms long-press, ripples + arc enlarges)
//   recording → delivering (release: bubble-user shows preset line; arc fades)
//   delivering → idle (bubble drifts; ring hides)
//
// Tap (short press) does nothing — only long-press commits.
// Keyboard: hold Space = long-press (input.js suppresses its own Space when
// _ringActive=true so we get the keydown without conflict).

import { $, defer, raf, wait } from './util.js';
import { setRingActive } from './input.js';
import { showDialogue } from './paragraph.js';
import { showPressHint, hidePressHint, recordPressSuccess, shouldShowArcHint } from './tutorial.js';
import { isTurbo, onTurboChange } from './turbo.js';

const LONG_PRESS_MS = 250;
const POST_DELIVER_HOLD = 200;

const RING = {
  IDLE: 'state-idle',
  INVITATION: 'state-invitation',
  RECORDING: 'state-recording',
  DELIVERING: 'state-delivering',
};

let _zone, _prompt;
let _state = RING.IDLE;
let _waiter = null;
let _longPressTimer = null;
let _isPressing = false;
let _committed = false;

function setState(next) {
  if (!_zone) return;
  Object.values(RING).forEach((c) => _zone.classList.remove(c));
  _zone.classList.add(next);
  _state = next;
}

function showArcHint(on) {
  if (!_zone) return;
  if (on) _zone.classList.add('arc-hint-active');
  else _zone.classList.remove('arc-hint-active');
}

function startPress() {
  if (!_waiter || _state === RING.DELIVERING) return;
  if (_isPressing) return;
  _isPressing = true;
  _committed = false;
  _longPressTimer = setTimeout(() => {
    if (_isPressing) {
      _committed = true;
      setState(RING.RECORDING);
      showArcHint(false);
      hidePressHint();
    }
  }, LONG_PRESS_MS);
}

function endPress() {
  if (!_isPressing) return;
  if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
  _isPressing = false;

  if (_committed) {
    _committed = false;
    setState(RING.DELIVERING);
    const w = _waiter;
    _waiter = null;
    if (w) w.resolve();
  } else {
    // Short tap — return to invitation, the user is still expected to long-press.
    if (_state === RING.RECORDING) setState(RING.INVITATION);
  }
}

export function initRing() {
  _zone = $('#edge-zone');
  _prompt = $('#edge-prompt');
  setState(RING.IDLE);

  const onDown = (e) => {
    if (!_waiter) return;
    e.preventDefault();
    startPress();
  };
  const onUp = () => {
    if (!_waiter && !_isPressing) return;
    endPress();
  };

  _zone.addEventListener('pointerdown', onDown);
  _zone.addEventListener('pointerup', onUp);
  _zone.addEventListener('pointercancel', onUp);
  _zone.addEventListener('pointerleave', onUp);
  _zone.addEventListener('touchstart', onDown, { passive: false });
  _zone.addEventListener('touchend', onUp);
  _zone.addEventListener('touchcancel', onUp);

  // Keyboard: Hold Space = long-press the ring (only when ring is open).
  let spaceHeld = false;
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (!_waiter) return;
    if (e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      if (!spaceHeld) {
        spaceHeld = true;
        startPress();
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && spaceHeld) {
      spaceHeld = false;
      endPress();
    }
  });
}

// Open the ring with a prompt (引导文字) and the user's preset line.
// Resolves when the line has been delivered as a bubble.
export async function ringDialogue({ prompt = '', text = '' } = {}) {
  if (_prompt) _prompt.textContent = prompt ? `（${prompt}）` : '';
  _zone.hidden = false;
  setRingActive(true);

  // Reveal in a frame so transitions catch.
  await raf();
  setState(RING.INVITATION);
  if (shouldShowArcHint()) showArcHint(true);
  showPressHint();

  _waiter = defer();

  // Turbo: auto-commit (skip the long-press) so the player walks itself.
  const autoCommit = () => {
    if (!_waiter) return;
    setState(RING.DELIVERING);
    const w = _waiter;
    _waiter = null;
    w.resolve();
  };
  if (isTurbo()) Promise.resolve().then(autoCommit);
  const offTurbo = onTurboChange((on) => { if (on) autoCommit(); });

  await _waiter.promise;
  offTurbo();

  // Deliver the line as a user bubble (typewriter + drift via paragraph.js).
  await showDialogue('你', text, { hold: 1200 });
  recordPressSuccess();

  await wait(POST_DELIVER_HOLD);
  setState(RING.IDLE);
  showArcHint(false);
  hidePressHint();
  _zone.hidden = true;
  if (_prompt) _prompt.textContent = '';
  setRingActive(false);
}
