// Pet placeholder. Real "持续移动 + 敏感区" 玩法 will replace this later.
// For now, long-press anywhere on the stage ≥ 1s to advance.
//
// 事件挂在 #stage 上而不是 #character —— character / character-layer / char-img
// 的 pointer-events 链很容易把事件吃掉，stage 是 pointer-events: auto 默认值，
// 且任何位置的 pointerdown 都会冒泡到这里，最稳。
// setRingActive(true) 已经让 input.js 跳过 stage 的 pointer 事件，与 pet 不冲突。

import { $, defer } from './util.js';
import { setRingActive } from './input.js';
import { setPetableGlow } from './fx.js';
import { isTurbo, onTurboChange } from './turbo.js';

const HOLD_MS = 1000;

export async function runPetPlaceholder() {
  const charEl = $('#character');
  const stage = $('#stage');
  if (!charEl || !stage) return;

  console.log('[pet] runPetPlaceholder started');

  setPetableGlow(true);
  setRingActive(true); // Block swipe-up/tap during pet
  charEl.classList.add('pettable'); // 让立绘视觉上"可摸"，事件监听挂 stage 不挂这里

  const promptNode = document.createElement('div');
  promptNode.style.cssText = `
    position: absolute;
    bottom: 14vh;
    left: 0; right: 0;
    text-align: center;
    font-family: var(--sans);
    font-size: 13px;
    letter-spacing: 0.24em;
    color: rgba(255,235,210,0.65);
    pointer-events: none;
    z-index: 9;
    animation: boot-breath 2.4s ease-in-out infinite;
  `;
  promptNode.textContent = '长按立绘 · 抚摸';
  stage.appendChild(promptNode);

  const w = defer();
  let timer = null;
  let pressing = false;

  const onDown = (e) => {
    console.log('[pet] onDown', e.type, 'target=', e.target?.id || e.target?.className);
    if (pressing) return;
    e.preventDefault();
    pressing = true;
    timer = setTimeout(() => {
      console.log('[pet] hold completed → resolve');
      pressing = false;
      cleanup();
      w.resolve();
    }, HOLD_MS);
  };

  const onUp = (e) => {
    console.log('[pet] onUp', e?.type, 'pressing=', pressing, 'timer=', timer != null);
    if (timer) clearTimeout(timer);
    timer = null;
    pressing = false;
  };

  // capture 阶段最早期拦下浏览器原生右键菜单 / 长按菜单，
  // 任何元素（含 char-img）的 contextmenu 都进不到默认行为。
  const onContext = (e) => {
    console.log('[pet] contextmenu blocked on', e.target?.tagName);
    e.preventDefault();
  };

  function cleanup() {
    stage.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    stage.removeEventListener('touchstart', onDown);
    window.removeEventListener('touchend', onUp);
    window.removeEventListener('touchcancel', onUp);
    document.removeEventListener('contextmenu', onContext, true);
  }

  stage.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  stage.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('touchend', onUp);
  window.addEventListener('touchcancel', onUp);
  document.addEventListener('contextmenu', onContext, true);

  // Turbo: auto-pet so the player walks itself.
  let _resolved = false;
  const autoFinish = () => {
    if (_resolved) return;
    _resolved = true;
    if (timer) { clearTimeout(timer); timer = null; }
    cleanup();
    w.resolve();
  };
  if (isTurbo()) Promise.resolve().then(autoFinish);
  const offTurbo = onTurboChange((on) => { if (on) autoFinish(); });

  await w.promise;
  offTurbo();

  promptNode.remove();
  setPetableGlow(false);
  setRingActive(false);
  charEl.classList.remove('pettable');
  console.log('[pet] runPetPlaceholder finished');
}
