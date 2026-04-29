import { $, wait } from './util.js';

const POSE_CLASSES = [
  'pose-tilt', 'pose-step-back', 'pose-lean-in',
  'pose-crouch', 'pose-crouch-eye', 'pose-turn-back',
  'pose-attack', 'pose-eat',
];

let _current = { x: 'calc(50vw - 50vh)', y: '5vh', w: '100vh', scale: 1, brightness: 1, opacity: 1 };

export function showCharacter(visible = true) {
  const c = $('.character');
  if (!c) return;
  if (visible) c.classList.add('visible');
  else {
    c.classList.remove('visible');
    setPose('neutral');
  }
}

export async function characterEntrance() {
  const c = $('.character');
  if (!c) return;
  // Start invisible and tiny, then fade in...
  setCharPosition({ scale: 0.1, y: '10vh', brightness: 0.2, opacity: 0 });
  c.classList.add('visible');
  await wait(100);
  // Fade in at tiny size
  setCharPosition({ opacity: 0.6 });
  await wait(800);
  // Grow to far-shot size
  setCharPosition({ scale: 0.3, brightness: 0.4, opacity: 0.7 });
  await wait(1200);
  syncSubtitleAnchor();
}

export function setPose(pose) {
  const layer = $('#character-layer');
  if (!layer) return;
  POSE_CLASSES.forEach((p) => layer.classList.remove(p));
  if (pose && pose !== 'neutral') {
    const cls = `pose-${pose}`;
    if (POSE_CLASSES.includes(cls)) {
      layer.classList.add(cls);
    }
  }
  setTimeout(syncSubtitleAnchor, 1500);
}

export function setPetable(on = true) {
  const c = $('.character');
  if (!c) return;
  if (on) c.classList.add('petable');
  else c.classList.remove('petable');
}

export function triggerPetFlash() {
  const c = $('.character');
  if (!c) return;
  c.classList.remove('char-flash');
  void c.offsetWidth;
  c.classList.add('char-flash');
}

// Free-positioning API. opts: { x, y, w, scale, brightness, opacity } — any subset.
// x/y/w accept CSS values ('22%', '40vh', '0', '8%')
// scale is a number multiplier (1.0 default, 0.45 far, 0.85 mid, 1.55 extreme).
// brightness: number 0-1+ (0.4 far-dark, 1.0 normal)
// opacity: number 0-1 (0.7 far-faint, 1.0 normal)
export function setCharPosition(opts = {}) {
  const c = $('.character');
  if (!c) return;
  if (opts.x != null)          { c.style.setProperty('--char-x', opts.x); _current.x = opts.x; }
  if (opts.y != null)          { c.style.setProperty('--char-y', opts.y); _current.y = opts.y; }
  if (opts.w != null)          { c.style.setProperty('--char-w', opts.w); _current.w = opts.w; }
  if (opts.scale != null)      { c.style.setProperty('--char-scale', String(opts.scale)); _current.scale = opts.scale; }
  if (opts.brightness != null) { c.style.setProperty('--char-brightness', String(opts.brightness)); _current.brightness = opts.brightness; }
  if (opts.opacity != null)    { c.style.setProperty('--char-opacity', String(opts.opacity)); _current.opacity = opts.opacity; }
  syncSubtitleAnchor();
}

export function getCharPosition() { return { ..._current }; }

export { syncSubtitleAnchor };

function syncSubtitleAnchor() {
  const c = $('.character');
  if (!c) return;
  const rect = c.getBoundingClientRect();
  if (!rect.width) return;
  const subtitleX = rect.left + rect.width * 0.45;
  const subtitleY = rect.top + rect.height * 0.35;
  const xPct = (subtitleX / window.innerWidth) * 100;
  const yPct = (subtitleY / window.innerHeight) * 100;
  document.documentElement.style.setProperty('--subtitle-x', `${xPct.toFixed(1)}%`);
  document.documentElement.style.setProperty('--subtitle-y', `${yPct.toFixed(1)}%`);
}

const HEAD_RATIO = 0.18;
export function getHeadAnchor() {
  const c = $('.character');
  if (!c) return { xPct: 50, yPct: 35 };
  const rect = c.getBoundingClientRect();
  if (!rect.width) return { xPct: 50, yPct: 35 };
  const headX = rect.left + rect.width * 0.5;
  const headY = rect.top + rect.height * HEAD_RATIO;
  return {
    xPct: (headX / window.innerWidth) * 100,
    yPct: (headY / window.innerHeight) * 100,
  };
}

export function flashCharacter() {
  const c = $('.character');
  if (!c) return;
  c.classList.remove('char-flash');
  void c.offsetWidth;
  c.classList.add('char-flash');
}

window.addEventListener('resize', () => {
  setTimeout(syncSubtitleAnchor, 50);
});

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(syncSubtitleAnchor, 100);
});