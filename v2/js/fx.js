// Procedural effects layer: fire (ghost-fire particles), fog (overlay),
// red lanterns + nail-people silhouettes, screen shake, white flash.
// Most effects live in #fx-layer as DOM/canvas children.

import { $, el, wait, raf } from './util.js';
import { isTurbo } from './turbo.js';

let _layer;
let _canvas, _ctx;
let _rafHandle = null;
let _effects = []; // { update(t, dt), draw(ctx), alive }
let _lastT = 0;
let _activeEffects = new Set(); // string ids of currently mounted DOM overlays

export function initFX() {
  _layer = $('#fx-layer');

  // Canvas for particle systems.
  _canvas = el('canvas', { cls: 'fx-canvas' });
  _layer.appendChild(_canvas);
  _ctx = _canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  startLoop();
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = _layer.clientWidth;
  const h = _layer.clientHeight;
  _canvas.width = w * dpr;
  _canvas.height = h * dpr;
  _canvas.style.width = w + 'px';
  _canvas.style.height = h + 'px';
  _ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function startLoop() {
  if (_rafHandle) return;
  _lastT = performance.now();
  const tick = (now) => {
    const dt = Math.min(50, now - _lastT);
    _lastT = now;
    const w = _canvas.clientWidth;
    const h = _canvas.clientHeight;
    _ctx.clearRect(0, 0, w, h);
    for (let i = _effects.length - 1; i >= 0; i--) {
      const e = _effects[i];
      e.update(now, dt);
      e.draw(_ctx, w, h);
      if (!e.alive) _effects.splice(i, 1);
    }
    _rafHandle = requestAnimationFrame(tick);
  };
  _rafHandle = requestAnimationFrame(tick);
}

// ---------------- screen shake ----------------
export async function shake(duration = 400) {
  const stage = $('#stage');
  stage.classList.add('shaking');
  await wait(duration);
  stage.classList.remove('shaking');
}

// ---------------- edge flash (语音发送后的"传送出去"余韵) ----------------
// 在 user bubble 谢幕之后由 ring.js fire-and-forget 调用。Turbo 时跳过。
export async function edgeFlash() {
  if (isTurbo()) return;
  const veil = el('div', { cls: 'edge-flash-veil' });
  $('#stage').appendChild(veil);
  await raf();
  veil.classList.add('on');
  await wait(1600);
  veil.remove();
}

// ---------------- white flash ----------------
export async function flash(intensity = 0.9, duration = 220) {
  const veil = el('div', { cls: 'flash-veil' });
  veil.style.background = `rgba(255,255,255,${intensity})`;
  $('#stage').appendChild(veil);
  await raf();
  veil.classList.add('on');
  await wait(80);
  veil.classList.remove('on');
  await wait(duration);
  veil.remove();
}

// ---------------- ghost-fire particles (场景 4 · 冷蓝调) ----------------
// 色调由暖橙红改为冷蓝，呼应食人花.webp 的冷蓝美术，并与狐狸立绘紫蓝色调一致。
// 烈焰救场 (bigFlameBurst) 仍保持暖橙，形成冷蓝包围 vs 暖橙救场的反差。
export function startGhostFire() {
  const sys = createParticleSystem({
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

// ---------------- big flame burst (场景 4 救场) ----------------
export async function bigFlameBurst() {
  const burst = createParticleSystem({
    spawnRate: 0,
    seed: (w, h) => Array.from({ length: 80 }, () => ({
      x: w * 0.5 + (Math.random() - 0.5) * w * 0.4,
      y: h * 0.55 + (Math.random() - 0.5) * h * 0.15,
      vx: (Math.random() - 0.5) * 360,
      vy: -120 - Math.random() * 240,
      life: 0,
      maxLife: 600 + Math.random() * 500,
      r: 14 + Math.random() * 30,
    })),
    update: (p, dt) => {
      p.life += dt;
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      p.vy += 380 * dt / 1000;
      p.vx *= 0.98;
    },
    draw: (ctx, p) => {
      const t = p.life / p.maxLife;
      const a = (1 - t) * 0.85;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `hsla(40, 100%, 80%, ${a})`);
      grad.addColorStop(0.4, `hsla(15, 100%, 55%, ${a * 0.8})`);
      grad.addColorStop(1, `hsla(0, 90%, 25%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    },
    isDead: (p) => p.life >= p.maxLife,
  });
  _effects.push(burst);
  await wait(900);
}

// ---------------- mist / dust / fog overlay ----------------
export function showFog(on) {
  let overlay = _layer.querySelector('.fog-overlay');
  if (!overlay) {
    overlay = el('div', { cls: 'fog-overlay' });
    _layer.appendChild(overlay);
  }
  if (on) {
    requestAnimationFrame(() => overlay.classList.add('on'));
  } else {
    overlay.classList.remove('on');
    setTimeout(() => overlay.remove(), 1600);
  }
}

// ---------------- floating dust (场景 5) ----------------
export function startDust() {
  const sys = createParticleSystem({
    spawnRate: 1.0,
    spawn: (w, h) => ({
      x: Math.random() * w,
      y: h - 20,
      vx: (Math.random() - 0.5) * 6,
      vy: -(2 + Math.random() * 5),
      life: 0,
      maxLife: 4000 + Math.random() * 3000,
      r: 0.8 + Math.random() * 1.6,
    }),
    update: (p, dt) => {
      p.life += dt;
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      p.vx += Math.sin(p.life / 800) * 0.05;
    },
    draw: (ctx, p) => {
      const t = p.life / p.maxLife;
      const a = (1 - Math.abs(t - 0.5) * 2) * 0.55;
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

// ---------------- moonbeam (场景 6) ----------------
export function startMoonbeam() {
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
  // Inject keyframes once
  if (!document.getElementById('moonbeam-anim')) {
    const style = el('style', { attrs: { id: 'moonbeam-anim' } });
    style.textContent = `@keyframes moonbeam-sway {
      0%,100% { transform: translateX(-50%) rotate(-8deg); }
      50%     { transform: translateX(-48%) rotate(-6deg); }
    }`;
    document.head.appendChild(style);
  }
  _layer.appendChild(beam);
  return () => beam.remove();
}

// ---------------- sunbeam (场景 7 · 暖金光柱) ----------------
// 复用 moonbeam 的几何，hue 转暖金（~35°）。
export function startSunbeam() {
  const beam = el('div', { cls: 'sunbeam' });
  beam.style.cssText = `
    position: absolute;
    top: -10vh; left: 50%;
    width: 28vw; height: 130vh;
    background: linear-gradient(to bottom, rgba(255,210,150,0.22) 0%, rgba(255,210,150,0) 75%);
    transform: translateX(-50%) rotate(-8deg);
    transform-origin: top center;
    z-index: 0;
    pointer-events: none;
    animation: moonbeam-sway 22s ease-in-out infinite;
  `;
  if (!document.getElementById('moonbeam-anim')) {
    const style = el('style', { attrs: { id: 'moonbeam-anim' } });
    style.textContent = `@keyframes moonbeam-sway {
      0%,100% { transform: translateX(-50%) rotate(-8deg); }
      50%     { transform: translateX(-48%) rotate(-6deg); }
    }`;
    document.head.appendChild(style);
  }
  _layer.appendChild(beam);
  return () => beam.remove();
}

// ---------------- rising fog (场景 8) ----------------
export async function risingFog(duration = 1500) {
  showFog(true);
  // Spawn a thick fog particle plume
  const sys = createParticleSystem({
    spawnRate: 4.5,
    spawn: (w, h) => ({
      x: Math.random() * w,
      y: h + 20,
      vx: (Math.random() - 0.5) * 16,
      vy: -(10 + Math.random() * 20),
      life: 0,
      maxLife: 3000 + Math.random() * 2000,
      r: 60 + Math.random() * 80,
    }),
    update: (p, dt) => {
      p.life += dt;
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
    },
    draw: (ctx, p) => {
      const t = p.life / p.maxLife;
      const a = Math.sin(t * Math.PI) * 0.4;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(200,195,190,${a})`);
      grad.addColorStop(1, `rgba(200,195,190,0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    },
    isDead: (p) => p.life >= p.maxLife,
  });
  _effects.push(sys);
  await wait(duration);
}

// ---------------- red lanterns (场景 8) ----------------
export function showLanterns(on) {
  let overlay = _layer.querySelector('.lantern-overlay');
  if (!overlay) {
    overlay = el('div', { cls: 'lantern-overlay' });
    _layer.appendChild(overlay);
  }
  if (on) requestAnimationFrame(() => overlay.classList.add('on'));
  else { overlay.classList.remove('on'); setTimeout(() => overlay.remove(), 1300); }
}

// ---------------- nail-people silhouettes (场景 8) ----------------
export function showNailPeople(on) {
  let host = _layer.querySelector('.nail-people');
  if (!host) {
    host = el('div', { cls: 'nail-people' });
    // 5 figures across the floor
    for (let i = 0; i < 5; i++) {
      const fig = el('div', { cls: 'figure' });
      fig.style.left = `${10 + i * 18}%`;
      fig.style.animationDelay = `${(i * 0.4) % 2.4}s`;
      fig.style.height = `${18 + (i % 3) * 3}vh`;
      host.appendChild(fig);
    }
    _layer.appendChild(host);
  }
  if (on) requestAnimationFrame(() => host.classList.add('on'));
  else { host.classList.remove('on'); setTimeout(() => host.remove(), 1100); }
}

// ---------------- character浮起小光晕 (场景 6 内心OS / 场景 7 摸摸前) ----------------
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
// Generic particle system helper
// =============================================================
function createParticleSystem({ spawnRate = 1, spawn, seed, update, draw, isDead, color }) {
  const particles = [];
  let alive = true;
  let killed = false;
  let spawnAcc = 0;
  let seeded = false;
  return {
    get alive() { return alive; },
    kill() { killed = true; },
    update(now, dt) {
      const w = _canvas.clientWidth;
      const h = _canvas.clientHeight;

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

// ---------------- character glow on petable (placeholder visual) ----------------
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

// ---------------- clear all overlays (called at scene transition) ----------------
export function clearAllFX() {
  // kill all canvas particle systems
  for (const e of _effects) if (e.kill) e.kill();
  // remove overlays
  _layer.querySelectorAll('.fog-overlay, .lantern-overlay, .nail-people, .moonbeam, .sunbeam').forEach((n) => n.remove());
}
