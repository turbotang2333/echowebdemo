import { $, wait } from './util.js';
import { SCRIPT } from './script.js';
import { showNarration, showInner, showDialogue, showHeavy, showNPCText, pause } from './text.js';
import { setPose, characterEntrance, showCharacter, setCharPosition, setPetable, triggerPetFlash } from './character.js';
import { setAmbient, addArt, removeArt, gilded } from './art.js';
import { setScene, addSpot, updateSpot, removeSpot, clearScene, pulseSpot } from './scene.js';
import { setBackground, blinkTransition, shake } from './transitions.js';
import { setRingState, setActionMode, tryConsumeGuide, RING } from './ring.js';
import { startInkLine, startActionLine } from './ink.js';
import { waitForTap, waitForPet } from './input.js';
import { waitForUserInput } from './type-input.js';
import { runOpening } from './opening.js';
import { runEchoPrologue } from './echo-prologue.js';
import { signalWait, getSpeed, setSpeed } from './signal.js';

// Run a user-input point: wait for the user to commit (typed or recorded),
// then play the preset bubble (preset always wins — typed text is just a
// "演" performance and never becomes the bubble). startLine is the bubble
// factory: startInkLine for dialogue, startActionLine for actions.
async function runUserCommit(text, startLine) {
  const speed = getSpeed();
  const showGuide = tryConsumeGuide();
  if (showGuide) $('#edge-zone').classList.add('arc-guide-active');

  if (speed > 1) {
    // Fast-forward: skip the wait entirely, auto-press, send preset.
    setRingState(RING.INVITATION);
    await signalWait(100);
    setRingState(RING.RECORDING);

    const ink = startLine(text, { typingSpeed: 55 });
    await ink.typingDone;

    setRingState(RING.DELIVERING);
    await ink.finish(Math.round(600 / speed), () => setRingState(RING.THINKING));

    await signalWait(300);
    setRingState(RING.RESPONDING);
    await signalWait(100);
    setRingState(RING.IDLE);
    return;
  }

  // Normal speed — let the user commit via short-tap (typing) or long-press (recording).
  // waitForUserInput sets RING.INVITATION internally and returns when the user
  // has actually committed an input gesture.
  const result = await waitForUserInput();
  setRingState(RING.RECORDING);

  const ink = startLine(text, { typingSpeed: 55 });
  if (result.kind === 'recorded') {
    // Long-press path: keep ink visible until BOTH typing finishes AND user
    // releases the press (mirrors the original voice-recording feel).
    await Promise.all([ink.typingDone, result.releasePromise]);
  } else {
    // Typed path: user already committed (clicked send / hit Enter). No
    // release to wait for — just let the bubble finish typing the preset.
    await ink.typingDone;
  }

  setRingState(RING.DELIVERING);
  await ink.finish(1400, () => setRingState(RING.THINKING));

  await signalWait(700);
  setRingState(RING.RESPONDING);
  await signalWait(200);
  setRingState(RING.IDLE);
}

async function runUserInputPoint(text) {
  await runUserCommit(text, startInkLine);
}

async function runUserActionPoint(text) {
  setActionMode(true);
  try {
    await runUserCommit(text, startActionLine);
  } finally {
    setActionMode(false);
  }
}

async function runFinale() {
  const end = $('#endmark');
  end.hidden = false;
  await new Promise(requestAnimationFrame);
  end.classList.add('visible');

  await new Promise((resolve) => {
    const check = () => {
      const j = $('#journal');
      if (j && !j.hidden && j.classList.contains('visible')) resolve();
      else setTimeout(check, 250);
    };
    check();
  });

  await new Promise((resolve) => {
    const check = () => {
      const j = $('#journal');
      if (j && j.hidden) resolve();
      else setTimeout(check, 250);
    };
    check();
  });

  end.classList.remove('visible');
  await signalWait(1200);
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

export async function runPlayer() {
  for (const ev of SCRIPT) {
    switch (ev.t) {
      case 'opening': await runOpening(); break;
      case 'echo-prologue': await runEchoPrologue(); break;
      case 'narration': await showNarration(ev.text); break;
      case 'inner': await showInner(ev.text); break;
      case 'heavy': await showHeavy(ev.text); break;
      case 'dialogue': await showDialogue(ev.who, ev.text); break;
      case 'npc': await showNPCText(ev.text, { from: ev.from || 'top' }); break;
      case 'pause': await pause(ev.ms); break;
      case 'pose': setPose(ev.pose); await signalWait(300); break;
      case 'flash': await signalWait(200); break;
      case 'char-enter': await characterEntrance(); break;
      case 'char-show': showCharacter(ev.visible); await signalWait(400); break;
      case 'char-pos': setCharPosition(ev.spec || {}); await signalWait(700); break;
      case 'petable': setPetable(ev.on !== false); await signalWait(300); break;
      case 'pet-flash': triggerPetFlash(); await signalWait(500); break;
      case 'art-set': setAmbient(ev.spec); await signalWait(200); break;
      case 'art-add': addArt(ev.spec); await signalWait(900); break;
      case 'art-remove': removeArt(ev.id); await signalWait(400); break;
      case 'scene': setScene(ev); await signalWait(ev.wait != null ? ev.wait : 600); break;
      case 'scene-add': addSpot(ev.spec || {}); await signalWait(ev.wait != null ? ev.wait : 700); break;
      case 'scene-update': updateSpot(ev.id, ev.to || {}); await signalWait(ev.wait != null ? ev.wait : 500); break;
      case 'scene-remove': removeSpot(ev.id); await signalWait(ev.wait != null ? ev.wait : 500); break;
      case 'scene-clear': clearScene(); await signalWait(ev.wait != null ? ev.wait : 700); break;
      case 'scene-pulse': pulseSpot(ev.spec || {}, ev.duration || 2400); await signalWait(ev.wait != null ? ev.wait : 200); break;
      case 'thread': gilded(); await signalWait(800); break;
      case 'bg': setBackground(ev.color); await signalWait(800); break;
      case 'shake': shake(); await signalWait(500); break;
      case 'blink': await blinkTransition(); break;
      case 'show': showTarget(ev.target, true); break;
      case 'hide': showTarget(ev.target, false); break;
      case 'await-tap':
        showTarget(ev.target, true);
        await waitForTap(ev.target);
        showTarget(ev.target, false);
        break;
      case 'await-pet':
        setPetable(true);
        await waitForPet();
        setPetable(false);
        break;
      case 'user-input': await runUserInputPoint(ev.text); break;
      case 'user-action': await runUserActionPoint(ev.text); break;
      case 'finale': await runFinale(); break;
      default:
        console.warn('unknown event', ev);
    }
  }
}