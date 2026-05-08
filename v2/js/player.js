// Player main loop. Drives the SCRIPT array, dispatching each beat to the
// right module. Manages scene boundaries — at the end of each scene, waits
// for one more swipe (the "scene swipe") and triggers the heavy transition.
//
// Beat dispatching matrix (新 5-字段架构 + 旧 beat 类型并存):
//   t: 'scene'        → 场景层（单体 PNG / 整图遮罩）
//   t: 'env'          → 氛围层 env（角色之下，染场景）
//   t: 'emotion'      → 氛围层 emotion（角色之上，染整张画面）
//   t: 'fx-dominant'  → 主导特效（粒子常驻，单元素）
//   t: 'burst'        → 伴随行为（屏震/闪/瞬时）
//   t: 'fx'           → 旧版 fx（向后兼容，按 kind 路由）
// 文字与对话类 beat 仍由 paragraph.js 处理。

import { wait } from './util.js';
import { SCRIPT } from './script.js';
import {
  mountFirstScreen,
  transitionToScreen,
  setSceneElement,
  clearSceneElements,
  setSceneRevealMask,
  setSceneBg,
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
  startSunbeam,
  risingFog,
  showLanterns,
  showNailPeople,
  characterGlow,
} from './fx.js';
import {
  applyEnv,
  applyEmotion,
  clearEnv,
  clearEmotion,
} from './atmo.js';
import { runPetPlaceholder } from './pet.js';

// Track active per-scene fx subscriptions.
let _activeFXKills = []; // legacy multi-fx (per-scene init via init.fx[])
let _dominantKill = null; // single dominant fx (单元素原则)

// =============================================================
// FX kind → action mapping. dispatch() returns whether it's dominant.
// Dominant fx are particle/light overlays that occupy the slot.
// Burst fx are瞬时 actions; they don't occupy the slot.
// =============================================================

const DOMINANT_FX = new Set(['ghost-fire', 'dust', 'moonbeam', 'sunbeam']);
const BURST_FX    = new Set(['shake', 'flash', 'flame-burst', 'rising-fog', 'character-glow']);

// Toggle / set overlay fx (fog, lanterns, nail-people) — these are state-toggles
// rather than dominant or burst. Treat them as their own group.
const TOGGLE_FX   = new Set([
  'fog-on', 'fog-off',
  'lanterns-on', 'lanterns-off',
  'nail-people-on', 'nail-people-off',
]);

async function startDominantFX(kind) {
  // Kill any existing dominant fx first (单元素原则).
  if (_dominantKill) {
    try { _dominantKill(); } catch {}
    _dominantKill = null;
  }
  switch (kind) {
    case 'ghost-fire': _dominantKill = startGhostFire(); break;
    case 'dust':       _dominantKill = startDust();      break;
    case 'moonbeam':   _dominantKill = startMoonbeam();  break;
    case 'sunbeam':    _dominantKill = startSunbeam();   break;
    default:
      console.warn('[player] unknown dominant fx', kind);
  }
}

function clearDominantFX() {
  if (_dominantKill) {
    try { _dominantKill(); } catch {}
    _dominantKill = null;
  }
}

async function runBurst(b) {
  switch (b.kind) {
    case 'shake':       await shake(b.duration);       break;
    case 'flash':       await flash(b.intensity, b.duration); break;
    case 'flame-burst': await bigFlameBurst();         break;
    case 'rising-fog':  await risingFog(b.duration || 1500); break;
    case 'character-glow': await characterGlow(b.duration || 1200); break;
    default:
      console.warn('[player] unknown burst', b);
  }
}

async function runToggle(kind) {
  switch (kind) {
    case 'fog-on':          showFog(true);  break;
    case 'fog-off':         showFog(false); break;
    case 'lanterns-on':     showLanterns(true);  break;
    case 'lanterns-off':    showLanterns(false); break;
    case 'nail-people-on':  showNailPeople(true);  break;
    case 'nail-people-off': showNailPeople(false); break;
  }
}

// Legacy fx routing for backward compat with old `t: 'fx'` beats.
async function runLegacyFX(fx) {
  if (DOMINANT_FX.has(fx.kind)) {
    await startDominantFX(fx.kind);
  } else if (BURST_FX.has(fx.kind)) {
    await runBurst(fx);
  } else if (TOGGLE_FX.has(fx.kind)) {
    await runToggle(fx.kind);
  } else {
    console.warn('[player] unknown legacy fx', fx);
  }
}

// =============================================================
// Init application (per-scene)
// =============================================================

async function applyInit(init) {
  if (!init) return;

  // 角色
  if (init.char) {
    if (init.char.visible === false) {
      await setCharVisible(false);
    } else {
      if (init.char.pos) await setCharPos(init.char.pos);
      if (init.char.pose) await setCharPose(init.char.pose);
      await setCharVisible(true);
    }
  }

  // 氛围 env
  if (init.env) applyEnv(init.env);
  else if (init.env === null) clearEnv();

  // 氛围 emotion
  if (init.emotion) applyEmotion(init.emotion);
  else if (init.emotion === null) clearEmotion();

  // 主导特效（新 API）
  if (init.fxDominant) await startDominantFX(init.fxDominant);
  else if (init.fxDominant === null) clearDominantFX();

  // 场景层：单体 PNG（init.sceneEl）
  if (init.sceneEl) setSceneElement(init.sceneEl);

  // 旧版 init.fx（数组多 fx）保持兼容
  if (init.fx) {
    for (const fx of init.fx) {
      if (DOMINANT_FX.has(fx.kind)) {
        await startDominantFX(fx.kind);
      } else {
        await runLegacyFX(fx);
      }
    }
  }
}

// =============================================================
// Beat dispatching
// =============================================================

async function runBeat(beat) {
  switch (beat.t) {
    case 'para':
      if (beat.interrupt && beat.continueText) {
        await showNarration(beat.text, {
          hold: beat.hold,
          continueText: beat.continueText,
          continueHold: beat.continueHold,
          interrupt: async () => {
            const i = beat.interrupt;
            if (i.kind === 'dialogue') {
              await showDialogue(i.who, i.text, { hold: i.hold });
            } else {
              console.warn('unknown interrupt kind', i);
            }
          },
        });
      } else {
        await showNarration(beat.text, { hold: beat.hold });
      }
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

    // ---- 新 5 字段 beat ----
    case 'scene':
      // beat.clear 清空场景层；beat.bg 切底图；beat.reveal 调遮罩；beat.el 设单体
      if (beat.clear) {
        clearSceneElements();
        setSceneRevealMask(null);
      } else {
        if (beat.bg !== undefined || beat.bgColor !== undefined) {
          setSceneBg({ bg: beat.bg, bgColor: beat.bgColor });
        }
        if (beat.reveal !== undefined) setSceneRevealMask(beat.reveal);
        if (beat.el !== undefined) setSceneElement(beat.el);
      }
      if (beat.wait) await wait(beat.wait);
      break;

    case 'env':
      if (beat.clear || beat.preset === null) clearEnv();
      else applyEnv(beat.preset || beat);
      if (beat.wait) await wait(beat.wait);
      break;

    case 'emotion':
      if (beat.clear || beat.preset === null) clearEmotion();
      else applyEmotion(beat.preset || beat);
      if (beat.wait) await wait(beat.wait);
      break;

    case 'fx-dominant':
      if (beat.clear || beat.kind === null) clearDominantFX();
      else await startDominantFX(beat.kind);
      break;

    case 'burst':
      await runBurst(beat);
      break;

    // ---- 兼容旧 beat 类型 ----
    case 'fx':
      await runLegacyFX(beat);
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
  // 切场景：默认清空旧主导特效与所有氛围。init.env / init.emotion 在 applyInit 里
  // 会立刻接管，所以不会留视觉空档。这避免上一场氛围"漏"到没声明的下一场。
  for (const kill of _activeFXKills) try { kill(); } catch {}
  _activeFXKills = [];
  clearDominantFX();
  clearEmotion();
  clearEnv();

  if (isFirst) {
    await mountFirstScreen({
      bg: scene.init.bg,
      bgColor: scene.init.bgColor,
      reveal: scene.init.reveal,
    });
  } else {
    await transitionToScreen({
      bg: scene.init.bg,
      bgColor: scene.init.bgColor,
      reveal: scene.init.reveal,
    });
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

  await showRestartVeil();
}

async function showRestartVeil() {
  const veil = document.getElementById('boot-veil');
  if (!veil) return;
  await wait(1200);
  const tap = veil.querySelector('.boot-tap');
  if (tap) tap.textContent = '重新开始';
  veil.hidden = false;
  veil.classList.remove('gone');
  veil.addEventListener('pointerdown', () => {
    location.reload();
  }, { once: true });
}
