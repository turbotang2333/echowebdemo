import { $, wait } from '../../js/util.js';
import { SCRIPT } from './script.js';
import { showNarration, showInner, showDialogue, showHeavy, showNPCText, pause } from './text.js';
import { setPose, characterEntrance, showCharacter, setCharPosition } from './character.js';
import { setAmbient, addArt, removeArt, gilded } from '../../js/art.js';
import { setScene, addSpot, updateSpot, removeSpot, clearScene, pulseSpot } from './scene.js';
import { setBackground, blinkTransition, shake } from '../../js/transitions.js';
import { setRingState, RING } from './ring.js';
import { showInkLine } from './ink.js';
import { waitForRingLongPress, waitForRingRelease, waitForTap } from './input.js';
import { runOpening } from './opening.js';
import { runEchoPrologue } from './echo-prologue.js';

async function runUserInputPoint(text) {
  setRingState(RING.INVITATION);
  await waitForRingLongPress();
  setRingState(RING.RECORDING);
  await waitForRingRelease();

  setRingState(RING.DELIVERING);
  await showInkLine(text, { typingSpeed: 55, holdDuration: 1400 });

  setRingState(RING.THINKING);
  await wait(700);
  setRingState(RING.RESPONDING);
  await wait(200);
  setRingState(RING.IDLE);
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
      case 'pose': setPose(ev.pose); await wait(300); break;
      case 'flash': await wait(200); break;
      case 'char-enter': await characterEntrance(); break;
      case 'char-show': showCharacter(ev.visible); await wait(400); break;
      case 'char-pos': setCharPosition(ev.spec || {}); await wait(700); break;
      case 'art-set': setAmbient(ev.spec); await wait(200); break;
      case 'art-add': addArt(ev.spec); await wait(900); break;
      case 'art-remove': removeArt(ev.id); await wait(400); break;
      case 'scene': setScene(ev); await wait(ev.wait != null ? ev.wait : 600); break;
      case 'scene-add': addSpot(ev.spec || {}); await wait(ev.wait != null ? ev.wait : 700); break;
      case 'scene-update': updateSpot(ev.id, ev.to || {}); await wait(ev.wait != null ? ev.wait : 500); break;
      case 'scene-remove': removeSpot(ev.id); await wait(ev.wait != null ? ev.wait : 500); break;
      case 'scene-clear': clearScene(); await wait(ev.wait != null ? ev.wait : 700); break;
      case 'scene-pulse': pulseSpot(ev.spec || {}, ev.duration || 2400); await wait(ev.wait != null ? ev.wait : 200); break;
      case 'thread': gilded(); await wait(800); break;
      case 'bg': setBackground(ev.color); await wait(800); break;
      case 'shake': shake(); await wait(500); break;
      case 'blink': await blinkTransition(); break;
      case 'show': showTarget(ev.target, true); break;
      case 'hide': showTarget(ev.target, false); break;
      case 'await-tap':
        showTarget(ev.target, true);
        await waitForTap(ev.target);
        showTarget(ev.target, false);
        break;
      case 'user-input': await runUserInputPoint(ev.text); break;
      case 'finale': await runFinale(); break;
      default:
        console.warn('unknown event', ev);
    }
  }
}
