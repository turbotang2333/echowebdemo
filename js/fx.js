// Procedural effects across three layers:
//   #fx-dominant-back   - 主导特效·后（角色之后的常驻粒子/光柱）
//   #fx-dominant-front  - 主导特效·前（角色之前的常驻粒子）
//   #fx-burst-layer     - 特效·伴随（屏震/闪/雾/灯笼/纸扎人等瞬时或开关）
//
// 单元素原则：主导特效任意时刻只 1 种在屏，前后二选一（player.js 强制）。
// 伴随类不占槽位，可任意叠加，覆盖至文字之上、交互 UI 之下。

import { $, el, wait, raf } from './util.js';
import { isTurbo } from './turbo.js';

let _layerBack;
let _layerFront;
let _layerBurst;

// Canvases per layer, lazily created. Each canvas hosts particle systems
// targeting that layer. The main tick loop clears each canvas and renders
// every effect against its own ctx.
const _canvasByLayer = new Map(); // 'back' | 'front' | 'burst' -> { canvas, ctx, parent }

let _rafHandle = null;
let _effects = []; // { ctx, canvas, update(t,dt), draw(ctx, w, h), alive }
let _lastT = 0;

export function initFX() {
  _layerBack  = $('#fx-dominant-back');
  _layerFront = $('#fx-dominant-front');
  _layerBurst = $('#fx-burst-layer');
  window.addEventListener('resize', resizeAllCanvases);
  startLoop();
}

function layerFor(position) {
  if (position === 'front') return _layerFront;
  if (position === 'burst') return _layerBurst;
  return _layerBack;
}

function ensureCanvas(position) {
  if (_canvasByLayer.has(position)) return _canvasByLayer.get(position);
  const parent = layerFor(position);
  const canvas = el('canvas', { cls: 'fx-canvas' });
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const entry = { canvas, ctx, parent };
  _canvasByLayer.set(position, entry);
  resizeCanvas(entry);
  return entry;
}

function resizeCanvas({ canvas, ctx, parent }) {
  const dpr = window.devicePixelRatio || 1;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resizeAllCanvases() {
  for (const entry of _canvasByLayer.values()) resizeCanvas(entry);
}

function startLoop() {
  if (_rafHandle) return;
  _lastT = performance.now();
  const tick = (now) => {
    const dt = Math.min(50, now - _lastT);
    _lastT = now;
    // Clear every active canvas.
    for (const { canvas, ctx } of _canvasByLayer.values()) {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }
    // Update + draw every live effect against its own ctx.
    for (let i = _effects.length - 1; i >= 0; i--) {
      const e = _effects[i];
      e.update(now, dt);
      e.draw(e.ctx, e.canvas.clientWidth, e.canvas.clientHeight);
      if (!e.alive) _effects.splice(i, 1);
    }
    _rafHandle = requestAnimationFrame(tick);
  };
  _rafHandle = requestAnimationFrame(tick);
}

// =============================================================
// 伴随：屏震（stage transform，本质不占层）
// =============================================================
export async function shake(duration = 400) {
  const stage = $('#stage');
  stage.classList.add('shaking');
  await wait(duration);
  stage.classList.remove('shaking');
}

// =============================================================
// 伴随：边缘亮边（语音派送之后的余韵，挂 stage）
// =============================================================
export async function edgeFlash() {
  if (isTurbo()) return;
  const veil = el('div', { cls: 'edge-flash-veil' });
  $('#stage').appendChild(veil);
  await raf();
  veil.classList.add('on');
  await wait(1600);
  veil.remove();
}

// =============================================================
// 伴随：白闪（覆盖至文字之上、UI 之下 → 挂 fx-burst-layer）
// =============================================================
export async function flash(intensity = 0.9, duration = 220) {
  const veil = el('div', { cls: 'flash-veil' });
  veil.style.background = `rgba(255,255,255,${intensity})`;
  _layerBurst.appendChild(veil);
  await raf();
  veil.classList.add('on');
  await wait(80);
  veil.classList.remove('on');
  await wait(duration);
  veil.remove();
}

// =============================================================
// 主导：鬼火（场 4 · 冷蓝调）
// =============================================================
export function startGhostFire(position = 'back') {
  const { canvas, ctx } = ensureCanvas(position);
  const sys = createParticleSystem({
    canvas, ctx,
    spawnRate: 1.4,
    spawn: (w, h) => ({
      x: Math.random() * w,
      y: h - Math.random() * h * 0.6,
      vx: (Math.random() - 0.5) * 12,
      vy: -(8 + Math.random() * 18),
      life: 0,
      maxLife: 1500 + Math.random() * 1500,
      r: 8 + Math.random() * 14,
    }),
    update: (p, dt) => {
      p.life += dt;
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      p.vy *= 0.997;
      p.vx += Math.sin(p.life / 240) * 0.5;
    },
    draw: (ctx, p) => {
      const t = p.life / p.maxLife;
      const a = (1 - t) * 0.7;
      ctx.beginPath();
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `hsla(200, 90%, 70%, ${a})`);
      grad.addColorStop(0.5, `hsla(215, 80%, 55%, ${a * 0.6})`);
      grad.addColorStop(1, `hsla(230, 90%, 30%, 0)`);
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    },
    isDead: (p) => p.life >= p.maxLife,
  });
  _effects.push(sys);
  return () => sys.kill();
}

// =============================================================
// 伴随/切换：雾叠加（fx-burst-layer · 开关型）
// =============================================================
export function showFog(on) {
  let overlay = _layerBurst.querySelector('.fog-overlay');
  if (!overlay) {
    overlay = el('div', { cls: 'fog-overlay' });
    _layerBurst.appendChild(overlay);
  }
  if (on) {
    requestAnimationFrame(() => overlay.classList.add('on'));
  } else {
    overlay.classList.remove('on');
    setTimeout(() => overlay.remove(), 1600);
  }
}

// =============================================================
// 主导：尘飘（场 5）—— 焦土地面悬浮颗粒
// 克制版：spawn 限定下半屏，单一"斜向漂浮 + sin 波动"轨迹，密度低看得见单颗。
// =============================================================
export function startDust(position = 'back') {
  const { canvas, ctx } = ensureCanvas(position);
  const sys = createParticleSystem({
    canvas, ctx,
    spawnRate: 0.5,
    spawn: (w, h) => {
      const dir = Math.random() < 0.5 ? -1 : 1;
      return {
        x: Math.random() * w,
        // 下半屏（50%~95%）随机出生，不再贴底
        y: h * (0.5 + Math.random() * 0.45),
        // 斜向漂浮：以横向为主，纵向缓升
        vx: dir * (4 + Math.random() * 6),
        vy: -(1 + Math.random() * 1.5),
        phase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: 5000 + Math.random() * 3000,
        r: 1.0 + Math.random() * 1.4,
      };
    },
    update: (p, dt) => {
      p.life += dt;
      // sin 波动：横速被慢周期调制 → 视觉上是飘忽的"S"形漂浮
      const wob = Math.sin(p.life / 900 + p.phase);
      p.x += (p.vx + wob * 4) * dt / 1000;
      p.y += (p.vy + Math.cos(p.life / 1100 + p.phase) * 0.6) * dt / 1000;
    },
    draw: (ctx, p) => {
      const t = p.life / p.maxLife;
      // 渐入渐出：两端淡、中间亮
      const a = Math.sin(Math.PI * t) * 0.5;
      ctx.beginPath();
      ctx.fillStyle = `rgba(220,210,195,${a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    },
    isDead: (p) => p.life >= p.maxLife,
  });
  _effects.push(sys);
  return () => sys.kill();
}

// =============================================================
// 主导：月光柱（场 6）
// =============================================================
export function startMoonbeam(position = 'back') {
  const parent = layerFor(position);
  const beam = el('div', { cls: 'moonbeam' });
  beam.style.cssText = `
    position: absolute;
    top: -10vh; left: 50%;
    width: 25vw; height: 130vh;
    background: linear-gradient(to bottom, rgba(220,225,240,0.18) 0%, rgba(220,225,240,0) 70%);
    transform: translateX(-50%) rotate(-8deg);
    transform-origin: top center;
    z-index: 0;
    pointer-events: none;
    animation: moonbeam-sway 18s ease-in-out infinite;
  `;
  ensureBeamKeyframes();
  parent.appendChild(beam);
  return () => beam.remove();
}

function ensureBeamKeyframes() {
  if (document.getElementById('moonbeam-anim')) return;
  const style = el('style', { attrs: { id: 'moonbeam-anim' } });
  style.textContent = `@keyframes moonbeam-sway {
    0%,100% { transform: translateX(-50%) rotate(-8deg); }
    50%     { transform: translateX(-48%) rotate(-6deg); }
  }`;
  document.head.appendChild(style);
}

// =============================================================
// 伴随：升雾（场 8 · 浓雾涌起，挂 fx-burst-layer）
// 实现：CSS 半透白板从底升起 + opacity ramp，避免粒子云模拟具象雾团（§6.1）
// 长驻雾叠加交给 showFog(true)，本函数只演"涌起"瞬间。
// =============================================================
export async function risingFog(duration = 1500) {
  showFog(true);

  const veil = el('div', { cls: 'rising-fog-veil' });
  // 渐变带：底浓顶淡，screen 混合让雾在暗景上柔白发亮
  veil.style.cssText = `
    position: absolute;
    inset: 0;
    background: linear-gradient(to top,
      rgba(220,215,200,0.7) 0%,
      rgba(220,215,200,0.4) 45%,
      rgba(220,215,200,0) 95%);
    mix-blend-mode: screen;
    opacity: 0;
    transform: translateY(25%);
    transition: opacity ${Math.round(duration * 0.5)}ms ease-out,
                transform ${duration}ms cubic-bezier(.3,.7,.3,1);
    pointer-events: none;
  `;
  _layerBurst.appendChild(veil);
  await raf();
  await raf();
  veil.style.opacity = '1';
  veil.style.transform = 'translateY(0)';
  await wait(duration);
  // 涌起完成后淡出本 veil，长驻雾交给 showFog 的 .fog-overlay
  veil.style.transition = 'opacity 1.5s ease-out';
  veil.style.opacity = '0';
  setTimeout(() => veil.remove(), 1600);
}

// =============================================================
// 切换：红灯笼（场 8）
// =============================================================
export function showLanterns(on) {
  let overlay = _layerBurst.querySelector('.lantern-overlay');
  if (!overlay) {
    overlay = el('div', { cls: 'lantern-overlay' });
    _layerBurst.appendChild(overlay);
  }
  if (on) requestAnimationFrame(() => overlay.classList.add('on'));
  else { overlay.classList.remove('on'); setTimeout(() => overlay.remove(), 1300); }
}

// =============================================================
// 切换：纸扎人（场 8）
// =============================================================
export function showNailPeople(on) {
  let host = _layerBurst.querySelector('.nail-people');
  if (!host) {
    host = el('div', { cls: 'nail-people' });
    for (let i = 0; i < 5; i++) {
      const fig = el('div', { cls: 'figure' });
      fig.style.left = `${10 + i * 18}%`;
      fig.style.animationDelay = `${(i * 0.4) % 2.4}s`;
      fig.style.height = `${18 + (i % 3) * 3}vh`;
      host.appendChild(fig);
    }
    _layerBurst.appendChild(host);
  }
  if (on) requestAnimationFrame(() => host.classList.add('on'));
  else { host.classList.remove('on'); setTimeout(() => host.remove(), 1100); }
}

// =============================================================
// 伴随：立绘小光晕（character-glow，挂 character 节点本身）
// =============================================================
export async function characterGlow(duration = 1200) {
  const character = $('#character');
  if (!character) return;
  const halo = el('div');
  halo.style.cssText = `
    position: absolute;
    top: 12%; left: 50%;
    width: 40%; height: 40%;
    background: radial-gradient(circle, rgba(255,200,130,0.4) 0%, rgba(255,200,130,0) 70%);
    transform: translateX(-50%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 600ms ease-out;
    z-index: 1;
  `;
  character.appendChild(halo);
  await raf();
  halo.style.opacity = '1';
  await wait(duration);
  halo.style.opacity = '0';
  await wait(700);
  halo.remove();
}

// =============================================================
// 特例：训狗诗整体浮现（场 6 段 4 · 设计规范 §6.3）
// 3 行一次性整体浮起在画面上 1/3 中央，冷月青色，与旁白暖白明显区分。
// 挂 fx-burst-layer。
// =============================================================
export async function cipherText(text, { hold = 2200 } = {}) {
  const container = el('div', { cls: 'cipher-text' });
  container.style.cssText = `
    position: absolute;
    top: 18%;
    left: 8%;
    right: 8%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 0.6em;
    pointer-events: none;
    font-family: "STKaiti", "KaiTi", "FangSong", "STSong", serif;
    font-size: 28px;
    line-height: 1.6;
    letter-spacing: 0.22em;
    color: #9ecfd9;
    text-shadow: 0 0 10px rgba(158,207,217,0.55), 0 0 22px rgba(120,180,200,0.3);
    opacity: 0;
    transform: translateY(8px);
    filter: blur(4px);
    transition: opacity 900ms ease-out, transform 900ms ease-out, filter 900ms ease-out;
  `;
  for (const line of text.split('\n')) {
    const lineEl = el('div');
    lineEl.textContent = line;
    lineEl.style.cssText = 'white-space: nowrap;';
    container.appendChild(lineEl);
  }
  _layerBurst.appendChild(container);

  await raf();
  await raf();
  container.style.opacity = '1';
  container.style.transform = 'translateY(0)';
  container.style.filter = 'blur(0)';

  await wait(900 + hold);
  container.style.transition = 'opacity 800ms ease-out';
  container.style.opacity = '0';
  await wait(900);
  container.remove();
}

// =============================================================
// 伴随：惊缩（场 8 假笑钩子点睛 · 立绘瞬间收缩 + 突亮，模拟瞳孔急缩反应）
// 不画 SVG（§6.1 禁止"在角色身体上画 SVG"）。靠立绘整体的 100ms 缩放 + 亮度脉冲。
// =============================================================
export async function pupilShrink(duration = 300) {
  const character = $('#character');
  if (!character) return;
  const fig = character.querySelector('.char-fig');
  if (!fig) return;
  const oldTransition = fig.style.transition;
  // 第 1 帧：突亮 + 微缩（惊吓反应）
  fig.style.transition = 'filter 100ms ease-out, transform 100ms ease-out';
  fig.style.filter = 'brightness(1.45) saturate(1.3)';
  // 在 pose 已有 transform 之上叠加 scale 微缩
  const baseT = getComputedStyle(fig).transform;
  fig.style.transform = (baseT && baseT !== 'none' ? baseT + ' ' : '') + 'scale(0.96)';
  await wait(Math.max(80, Math.round(duration * 0.4)));
  // 第 2 帧：回归 CSS pose 滤镜
  fig.style.transition = 'filter 200ms ease-in, transform 200ms ease-in';
  fig.style.filter = '';
  fig.style.transform = '';
  await wait(Math.max(160, Math.round(duration * 0.6)));
  fig.style.transition = oldTransition || '';
}

// =============================================================
// 立绘可摸光晕（filter drop-shadow 作占位）
// =============================================================
export async function setPetableGlow(on) {
  const character = $('#character');
  if (!character) return;
  if (on) {
    character.style.filter = (character.style.filter || '') + ' drop-shadow(0 0 24px rgba(255,200,130,0.55))';
    character.classList.add('petable');
  } else {
    character.style.filter = '';
    character.classList.remove('petable');
  }
}

// =============================================================
// Generic particle system helper
// =============================================================
function createParticleSystem({ canvas, ctx, spawnRate = 1, spawn, seed, update, draw, isDead }) {
  const particles = [];
  let alive = true;
  let killed = false;
  let spawnAcc = 0;
  let seeded = false;
  return {
    canvas, ctx,
    get alive() { return alive; },
    kill() { killed = true; },
    update(now, dt) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (!seeded && seed) {
        const initial = seed(w, h);
        for (const p of initial) particles.push(p);
        seeded = true;
      }

      if (!killed && spawnRate > 0 && spawn) {
        spawnAcc += dt * spawnRate / 16.7;
        while (spawnAcc >= 1) {
          spawnAcc -= 1;
          particles.push(spawn(w, h));
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        update(p, dt);
        if (isDead(p)) particles.splice(i, 1);
      }

      if (killed && particles.length === 0) alive = false;
    },
    draw(ctx) {
      for (const p of particles) draw(ctx, p);
    },
  };
}

// =============================================================
// 切场景统一清理：杀掉所有 canvas 粒子 + 移除 burst 容器内的覆盖物
// =============================================================
export function clearAllFX() {
  for (const e of _effects) if (e.kill) e.kill();
  // 移除 back/front/burst 中 DOM 型覆盖（光柱、雾、灯笼、纸扎人）
  for (const layer of [_layerBack, _layerFront, _layerBurst]) {
    if (!layer) continue;
    layer.querySelectorAll('.moonbeam, .fog-overlay, .lantern-overlay, .nail-people, .rising-fog-veil, .cipher-text')
      .forEach((n) => n.remove());
  }
}
