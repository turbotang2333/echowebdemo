import { $, wait } from './util.js';

const POSE_CLASSES = [
  'pose-tilt', 'pose-step-back', 'pose-lean-in',
  'pose-crouch', 'pose-crouch-eye', 'pose-turn-back',
  'pose-attack', 'pose-eat',
];

let _current = { x: '22%', y: '0', w: '30vh', scale: 1 };

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
  c.classList.remove('visible');
  c.style.transition = 'none';
  c.style.transform = 'translateX(80px) scale(0.94)';
  void c.offsetWidth;
  c.style.transition = '';
  c.classList.add('visible');
  c.style.transform = '';
  await wait(1400);
  syncSubtitleAnchor();
}

export { syncSubtitleAnchor };

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
  // Pose changes the character's transform with a 1.4s transition. Re-sync
  // subtitle anchor after the transition settles so dialogue lands next to her.
  setTimeout(syncSubtitleAnchor, 1500);
}

// Free-positioning API. opts: { x, y, w, scale } — any subset.
// x/y/w accept CSS values ('22%', '40vh', '0', '8%')
// scale is a number multiplier (1.0 default, 0.6 far, 1.6 close-up).
export function setCharPosition(opts = {}) {
  const c = $('.character');
  if (!c) return;
  if (opts.x != null)     { c.style.setProperty('--char-x', opts.x); _current.x = opts.x; }
  if (opts.y != null)     { c.style.setProperty('--char-y', opts.y); _current.y = opts.y; }
  if (opts.w != null)     { c.style.setProperty('--char-w', opts.w); _current.w = opts.w; }
  if (opts.scale != null) { c.style.setProperty('--char-scale', String(opts.scale)); _current.scale = opts.scale; }
  syncSubtitleAnchor();
}

export function getCharPosition() { return { ..._current }; }

// Anchor the subtitle zone next to the character: just to the right of立绘.
// We approximate from her CSS `left` and her width — this stays lightweight
// and avoids reading getBoundingClientRect on every change.
function syncSubtitleAnchor() {
  const c = $('.character');
  if (!c) return;
  const rect = c.getBoundingClientRect();
  if (!rect.width) return;
  const subtitleX = rect.right - rect.width * 0.22;
  const subtitleY = rect.top + rect.height * 0.18;
  const xPct = (subtitleX / window.innerWidth) * 100;
  const yPct = (subtitleY / window.innerHeight) * 100;
  document.documentElement.style.setProperty('--subtitle-x', `${xPct.toFixed(1)}%`);
  document.documentElement.style.setProperty('--subtitle-y', `${yPct.toFixed(1)}%`);
}

export function flashCharacter() {
  const c = $('.character');
  if (!c) return;
  c.classList.remove('char-flash');
  void c.offsetWidth;
  c.classList.add('char-flash');
}

// Re-sync subtitle anchor on resize so the位置 stays valid.
window.addEventListener('resize', () => {
  setTimeout(syncSubtitleAnchor, 50);
});

// Initial sync after first paint.
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(syncSubtitleAnchor, 100);
});
