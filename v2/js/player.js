// Player main loop. Drives the SCRIPT array, dispatching each beat to the
// right module. Manages scene boundaries — at the end of each scene, waits
// for one more swipe (the "scene swipe") and triggers the heavy transition.

import { wait, raf } from './util.js';
import { SCRIPT } from './script.js';
import {
  mountFirstScreen,
  transitionToScreen,
} from './screen.js';
import {
  showNarration,
  showInner,
  showAside,
  showDialogue,
  showHeavy,
  showNPCText,
  advanceCurrent,
  clearAllText,
} from './paragraph.js';
import { waitForSwipe } from './input.js';
import { ringDialogue } from './ring.js';
import {
  setCharVisible,
  setCharPos,
  setCharPose,
} from './character.js';
import {
  shake,
  flash,
  startGhostFire,
  bigFlameBurst,
  showFog,
  startDust,
  startMoonbeam,
  risingFog,
  showLanterns,
  showNailPeople,
  characterGlow,
} from './fx.js';
import { runPetPlaceholder } from './pet.js';

let _activeFXKills = []; // functions to kill running per-scene fx

async function applyInit(init) {
  if (!init) return;
  if (init.char) {
    if (init.char.visible === false) {
      await setCharVisible(false);
    } else {
      if (init.char.pos) await setCharPos(init.char.pos);
      if (init.char.pose) await setCharPose(init.char.pose);
      await setCharVisible(true);
    }
  }
  if (init.fx) for (const fx of init.fx) await runFX(fx);
}

async function runFX(fx) {
  switch (fx.kind) {
    case 'shake':           await shake(); break;
    case 'flash':           await flash(); break;
    case 'ghost-fire':      _activeFXKills.push(startGhostFire()); break;
    case 'flame-burst':     await bigFlameBurst(); break;
    case 'fog-on':          showFog(true); break;
    case 'fog-off':         showFog(false); break;
    case 'dust':            _activeFXKills.push(startDust()); break;
    case 'moonbeam':        _activeFXKills.push(startMoonbeam()); break;
    case 'rising-fog':      await risingFog(1500); break;
    case 'lanterns-on':     showLanterns(true); break;
    case 'lanterns-off':    showLanterns(false); break;
    case 'nail-people-on':  showNailPeople(true); break;
    case 'nail-people-off': showNailPeople(false); break;
    case 'character-glow':  await characterGlow(1500); break;
    case 'endmark':         await showEndmark(); break;
    default: console.warn('unknown fx', fx);
  }
}

async function showEndmark() {
  const end = document.getElementById('endmark');
  if (!end) return;
  end.hidden = false;
  await raf();
  end.classList.add('visible');
  await new Promise(() => {});
}

async function runBeat(beat) {
  switch (beat.t) {
    case 'para':
      await showNarration(beat.text, { hold: beat.hold });
      break;
    case 'inner':
      await showInner(beat.text, { hold: beat.hold });
      break;
    case 'aside':
      await showAside(beat.text, { hold: beat.hold });
      break;
    case 'heavy':
      await showHeavy(beat.text, { hold: beat.hold });
      break;
    case 'npc':
      await showNPCText(beat.text, { from: beat.from || 'top', life: beat.life });
      break;
    case 'dialogue':
      await showDialogue(beat.who, beat.text, { hold: beat.hold });
      break;
    case 'ring':
      await ringDialogue({ prompt: beat.prompt, text: beat.text });
      break;
    case 'pos':
      await setCharPos(beat.pos);
      await wait(beat.wait != null ? beat.wait : 600);
      break;
    case 'pose':
      await setCharPose(beat.pose);
      await wait(beat.wait != null ? beat.wait : 400);
      break;
    case 'char-show':
      await setCharVisible(beat.on !== false);
      await wait(400);
      break;
    case 'fx':
      await runFX(beat);
      break;
    case 'wait':
      await wait(beat.ms);
      break;
    case 'await-swipe':
      await waitForSwipe();
      await advanceCurrent();
      break;
    case 'pet':
      await runPetPlaceholder();
      break;
    default:
      console.warn('unknown beat', beat);
  }
}

async function runScene(scene, isFirst) {
  for (const kill of _activeFXKills) try { kill(); } catch {}
  _activeFXKills = [];

  if (isFirst) {
    await mountFirstScreen({ bg: scene.init.bg, bgColor: scene.init.bgColor });
  } else {
    await transitionToScreen({ bg: scene.init.bg, bgColor: scene.init.bgColor });
  }

  await applyInit(scene.init);

  for (const beat of scene.beats) {
    await runBeat(beat);
  }
}

export async function runPlayer() {
  for (let i = 0; i < SCRIPT.length; i++) {
    const scene = SCRIPT[i];
    const isFirst = i === 0;
    const isLast = i === SCRIPT.length - 1;

    await runScene(scene, isFirst);

    if (!isLast) {
      await waitForSwipe();
      await clearAllText();
    }
  }
}
