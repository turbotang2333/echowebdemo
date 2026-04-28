// Walks SCRIPT and dispatches each event to the correct subsystem.

import { $, wait } from './util.js';
import { SCRIPT } from './script.js';
import { showNarration, showInner, showDialogue, showHeavy, showNPCText, pause } from './text.js';
import { setPose, characterEntrance, showCharacter } from './character.js';
import { setAmbient, fadeAmbient, addArt, removeArt, gilded } from './art.js';
import { setBackground, blinkTransition, shake } from './transitions.js';
import { setRingState, RING, deliverLightToCharacter } from './ring.js';
import { showInkLine } from './ink.js';
import { waitForRingLongPress, waitForRingRelease, waitForTap } from './input.js';
import { runOpening } from './opening.js';
import { openJournal } from './journal.js';
import { setFastForward, isFastForward, signalWait } from './signal.js';

// Each user-input-point fires its own invite pulse, so we don't run a global
// idle timer (would otherwise risk clobbering an active recording state).

async function runUserInputPoint(text) {
  // Fast-forward stops here — user must actually long-press the ring.
  setFastForward(false);
  setSkipBusy(false);

  setRingState(RING.INVITATION);
  await waitForRingLongPress();
  setRingState(RING.RECORDING);
  await waitForRingRelease();

  setRingState(RING.DELIVERING);
  await showInkLine(text, { typingSpeed: 55, holdDuration: 1400 });

  await deliverLightToCharacter();

  setRingState(RING.THINKING);
  await wait(900);
  setRingState(RING.RESPONDING);
  await wait(200);
  setRingState(RING.IDLE);
}

async function runFinale() {
  // dim, show end mark
  const end = $('#endmark');
  end.hidden = false;
  await new Promise(requestAnimationFrame);
  end.classList.add('visible');

  // wait for journal swipe-open (or anchor click) — handled by journal.js gestures.
  // We poll for journal-open state.
  await new Promise((resolve) => {
    const check = () => {
      const j = $('#journal');
      if (j && !j.hidden && j.classList.contains('visible')) {
        resolve();
      } else {
        setTimeout(check, 250);
      }
    };
    check();
  });

  // Also force opening journal if user clicks anchor — already handled.
  // After they read, they will swipe back to close. Wait for close.
  await new Promise((resolve) => {
    const check = () => {
      const j = $('#journal');
      if (j && j.hidden) resolve();
      else setTimeout(check, 250);
    };
    check();
  });

  // fade endmark, then show finale
  end.classList.remove('visible');
  await wait(1200);
  end.hidden = true;
  const finale = $('#finale');
  finale.hidden = false;
  await new Promise(requestAnimationFrame);
  finale.classList.add('visible');
}

function showTarget(id, visible = true) {
  const node = document.getElementById(id);
  if (!node) return;
  if (visible) node.hidden = false;
  else node.hidden = true;
}

function showSkipButton(visible) {
  const btn = $('#play-skip');
  if (!btn) return;
  btn.hidden = !visible;
  if (visible) btn.classList.remove('busy');
}
function setSkipBusy(busy) {
  const btn = $('#play-skip');
  if (!btn) return;
  if (busy) btn.classList.add('busy');
  else btn.classList.remove('busy');
}

// Visual / audio events run instantly when fast-forward is on so the timeline
// races forward without losing state changes.
function ffWait(ms) { return isFastForward() ? signalWait(0) : wait(ms); }

function initSkipButton() {
  const btn = $('#play-skip');
  if (!btn) return;
  const handler = (e) => {
    if (e) { e.preventDefault?.(); e.stopPropagation?.(); }
    setFastForward(true);
    setSkipBusy(true);
  };
  btn.addEventListener('click', handler);
  btn.addEventListener('touchstart', handler, { passive: false });
}

export async function runPlayer() {
  initSkipButton();
  for (const ev of SCRIPT) {
    // Reveal the gameplay skip button as soon as opening is over.
    if (ev.t !== 'opening') showSkipButton(true);

    switch (ev.t) {
      case 'opening': await runOpening(); break;
      case 'narration': await showNarration(ev.text); break;
      case 'inner': await showInner(ev.text); break;
      case 'heavy': await showHeavy(ev.text); break;
      case 'dialogue': await showDialogue(ev.who, ev.text); break;
      case 'npc': await showNPCText(ev.text, { from: ev.from || 'top' }); break;
      case 'pause': await pause(ev.ms); break;
      case 'pose': setPose(ev.pose); await ffWait(300); break;
      case 'flash': await ffWait(200); break;
      case 'char-enter':
        if (isFastForward()) { showCharacter(true); }
        else { await characterEntrance(); }
        break;
      case 'char-show': showCharacter(ev.visible); await ffWait(400); break;
      case 'art-set': setAmbient(ev.spec); await ffWait(200); break;
      case 'art-add': addArt(ev.spec); await ffWait(900); break;
      case 'art-remove': removeArt(ev.id); await ffWait(400); break;
      case 'thread': gilded(); await ffWait(800); break;
      case 'bg': setBackground(ev.color); await ffWait(800); break;
      case 'shake': shake(); await ffWait(500); break;
      case 'blink': await blinkTransition(); break;
      case 'show': showTarget(ev.target, true); break;
      case 'hide': showTarget(ev.target, false); break;
      case 'await-tap':
        // Fast-forward stops here — user must perform the gesture.
        setFastForward(false);
        setSkipBusy(false);
        showTarget(ev.target, true);
        await waitForTap(ev.target);
        showTarget(ev.target, false);
        break;
      case 'user-input': await runUserInputPoint(ev.text); break;
      case 'finale':
        // Hide the skip button — finale needs the user gesture to read & close journal.
        setFastForward(false);
        showSkipButton(false);
        await runFinale();
        break;
      default:
        console.warn('unknown event', ev);
    }
  }
}
