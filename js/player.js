// Player main loop. Drives the SCRIPT array, dispatching each beat to the
// right module. Manages scene boundaries — at the end of each scene, waits
// for one more swipe (the "scene swipe") and triggers the heavy transition.
//
// Beat dispatching matrix:
//   t: 'scene' / 'scene-back'  → 场景·后景（角色之下；'scene' 兼容旧脚本，默认走后景）
//   t: 'scene-front'           → 场景·前景（角色之上，预留扩展）
//   t: 'env'                   → 氛围层 env（染场景前景+后景）
//   t: 'emotion'               → 氛围层 emotion（染整张画面）
//   t: 'fx-dominant'           → 主导特效（前/后二选一，单元素），beat.position: 'back'|'front'
//   t: 'burst'                 → 伴随行为（屏震/闪/瞬时，挂 fx-burst-layer）
//   t: 'fx'                    → 旧版 fx（向后兼容，按 kind 路由）
//   t: 'cipher'                → 训狗诗字符浮起（设计规范 §6.3 特例）
// 文字与对话类 beat 仍由 paragraph.js 处理。

import { wait, SceneJumpError, cancelPendingWaits } from './util.js';
import { SCRIPT } from './script.js';
import {
  mountFirstScreen,
  transitionToScreen,
  setSceneElement,
  clearSceneElements,
  setSceneRevealMask,
  setSceneBg,
  getCurrentScreen,
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
import { waitForSwipe, setSceneJumpHandler } from './input.js';
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
  showFog,
  startDust,
  startMoonbeam,
  risingFog,
  showLanterns,
  showNailPeople,
  characterGlow,
  pupilShrink,
  cipherText,
} from './fx.js';
import {
  applyEnv,
  applyEmotion,
  clearEnv,
  clearEmotion,
} from './atmo.js';
import { runPetPlaceholder } from './pet.js';
import { runPortalVideo, clearPortal } from './portal.js';

// Track active per-scene fx subscriptions.
let _activeFXKills = []; // legacy multi-fx (per-scene init via init.fx[])
let _dominantKill = null; // single dominant fx (单元素原则)

// =============================================================
// FX kind → action mapping. dispatch() returns whether it's dominant.
// Dominant fx are particle/light overlays that occupy the slot.
// Burst fx are瞬时 actions; they don't occupy the slot.
// =============================================================

const DOMINANT_FX = new Set(['ghost-fire', 'dust', 'moonbeam']);
const BURST_FX    = new Set(['shake', 'flash', 'rising-fog', 'character-glow', 'pupil-shrink']);

// Toggle / set overlay fx (fog, lanterns, nail-people) — these are state-toggles
// rather than dominant or burst. Treat them as their own group.
const TOGGLE_FX   = new Set([
  'fog-on', 'fog-off',
  'lanterns-on', 'lanterns-off',
  'nail-people-on', 'nail-people-off',
]);

async function startDominantFX(kind, position = 'back') {
  // Kill any existing dominant fx first (单元素原则：前/后二选一不同时).
  if (_dominantKill) {
    try { _dominantKill(); } catch {}
    _dominantKill = null;
  }
  switch (kind) {
    case 'ghost-fire': _dominantKill = startGhostFire(position); break;
    case 'dust':       _dominantKill = startDust(position);      break;
    case 'moonbeam':   _dominantKill = startMoonbeam(position);  break;
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
    case 'rising-fog':  await risingFog(b.duration || 1500); break;
    case 'character-glow': await characterGlow(b.duration || 1200); break;
    case 'pupil-shrink':   await pupilShrink(b.duration || 300); break;
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

// scene beat 共用处理：position 决定前/后景槽位
async function handleSceneBeat(beat, position) {
  if (beat.clear) {
    clearSceneElements(position);
    if (position === 'back') setSceneRevealMask(null, 'back');
  } else {
    if (position === 'back' && (beat.bg !== undefined || beat.bgColor !== undefined)) {
      setSceneBg({ bg: beat.bg, bgColor: beat.bgColor });
    }
    if (beat.reveal !== undefined) setSceneRevealMask(beat.reveal, position);
    if (beat.el !== undefined) setSceneElement(beat.el, position);
  }
  if (beat.wait) await wait(beat.wait);
}

// Legacy fx routing for backward compat with old `t: 'fx'` beats.
async function runLegacyFX(fx) {
  if (DOMINANT_FX.has(fx.kind)) {
    await startDominantFX(fx.kind, fx.position || 'back');
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
  // 注：pos / pose 在 visible:false 时也先写入 dataset，留作之后 char-show 的目标状态；
  // setCharPos 会顺带 add('visible')，所以在它之后再调 setCharVisible(false) 把可见拿掉。
  if (init.char) {
    if (init.char.pos) await setCharPos(init.char.pos);
    if (init.char.pose) await setCharPose(init.char.pose);
    await setCharVisible(init.char.visible !== false);
  }

  // 氛围 env
  if (init.env) applyEnv(init.env);
  else if (init.env === null) clearEnv();

  // 氛围 emotion
  if (init.emotion) applyEmotion(init.emotion);
  else if (init.emotion === null) clearEmotion();

  // 主导特效（新 API）— 支持字符串简写或 { kind, position } 对象
  if (init.fxDominant) {
    if (typeof init.fxDominant === 'string') {
      await startDominantFX(init.fxDominant);
    } else {
      await startDominantFX(init.fxDominant.kind, init.fxDominant.position || 'back');
    }
  } else if (init.fxDominant === null) {
    clearDominantFX();
  }

  // 场景·后景单体（init.sceneEl 兼容字段，默认后景）
  if (init.sceneEl) setSceneElement(init.sceneEl, 'back');
  if (init.sceneElFront) setSceneElement(init.sceneElFront, 'front');

  // 旧版 init.fx（数组多 fx）保持兼容
  if (init.fx) {
    for (const fx of init.fx) {
      if (DOMINANT_FX.has(fx.kind)) {
        await startDominantFX(fx.kind, fx.position || 'back');
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

    // ---- 新 beat 类型 ----
    case 'scene':       // 兼容：旧脚本的 t:'scene' 默认走后景
    case 'scene-back':
      await handleSceneBeat(beat, 'back');
      break;
    case 'scene-front':
      await handleSceneBeat(beat, 'front');
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
      else await startDominantFX(beat.kind, beat.position || 'back');
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

    case 'portal-video':
      await runPortalVideo({ src: beat.src });
      break;

    case 'clear-narration':
      // 主动把当前 narration/inner/aside 漂走（不依赖 await-swipe）
      await advanceCurrent();
      break;

    case 'cipher':
      // 训狗诗字符浮起（设计规范 §6.3 特例，挂 fx-burst-layer）
      await cipherText(beat.text, { hold: beat.hold, perChar: beat.perChar, lineGap: beat.lineGap });
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

// =============================================================
// Scene jump (ArrowLeft / ArrowRight)
// =============================================================
//
// The handler converts a key press into a target index and cancels every
// pending wait/swipe-waiter/ring-waiter so the current beat throws
// SceneJumpError. The main loop catches it, hard-cleans everything, and
// re-enters runScene at the new index. Subsequent presses *during cleanup*
// keep accumulating onto the same target.

let _currentSceneIdx = 0;
let _nextSceneIdx = -1; // -1 = no override

function clampIdx(i) {
  return Math.max(0, Math.min(SCRIPT.length - 1, i));
}

function requestSceneJump(delta) {
  const base = _nextSceneIdx >= 0 ? _nextSceneIdx : _currentSceneIdx;
  const target = clampIdx(base + delta);
  // No-op if we're already pinned to the boundary (e.g. ← on scene 0).
  if (_nextSceneIdx < 0 && target === _currentSceneIdx) return;
  _nextSceneIdx = target;
  cancelPendingWaits();
}

// Hard-reset every visual layer so a jumped-into scene starts from a clean
// slate. Each step is wrapped to swallow rapid re-jumps that arrive mid-clean.
async function hardCleanup() {
  try { if (_dominantKill) { _dominantKill(); _dominantKill = null; } } catch {}
  for (const kill of _activeFXKills) { try { kill(); } catch {} }
  _activeFXKills = [];
  try { clearEmotion(); } catch {}
  try { clearEnv(); } catch {}
  try { showFog(false); showLanterns(false); showNailPeople(false); } catch {}
  try { clearPortal(); } catch {}
  try { clearSceneElements('back'); clearSceneElements('front'); } catch {}
  try { setSceneRevealMask(null, 'back'); } catch {}
  try { await clearAllText(); } catch {}
}

export async function runPlayer() {
  setSceneJumpHandler(requestSceneJump);

  let i = 0;
  while (i < SCRIPT.length) {
    _currentSceneIdx = i;
    _nextSceneIdx = -1;
    const scene = SCRIPT[i];
    // "first screen" = there is no mounted screen yet. Jumping back to scene 0
    // mid-game must NOT use mountFirstScreen — that path leaks the previous
    // _current. Use transitionToScreen whenever a screen is already mounted.
    const isFirst = !getCurrentScreen();
    const isLast = i === SCRIPT.length - 1;

    try {
      await runScene(scene, isFirst);
      if (!isLast) {
        await waitForSwipe();
        await clearAllText();
      }
      i = _nextSceneIdx >= 0 ? _nextSceneIdx : i + 1;
    } catch (e) {
      if (e instanceof SceneJumpError) {
        await hardCleanup();
        // _nextSceneIdx was set by requestSceneJump; if not (defensive), step forward.
        i = _nextSceneIdx >= 0 ? _nextSceneIdx : i + 1;
      } else {
        throw e;
      }
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
