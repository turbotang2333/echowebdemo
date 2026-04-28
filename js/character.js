import { $, wait } from './util.js';

const POSE_CLASSES = [
  'pose-tilt', 'pose-step-back', 'pose-lean-in',
  'pose-crouch', 'pose-crouch-eye', 'pose-turn-back',
  'pose-attack', 'pose-eat',
];

export function showCharacter(visible = true) {
  const c = $('.character');
  if (!c) return;
  if (visible) c.classList.add('visible');
  else {
    c.classList.remove('visible');
    setPose('neutral'); // clear any pose so re-show starts clean
  }
}

export async function characterEntrance() {
  const c = $('.character');
  if (!c) return;
  c.style.transition = 'none';
  c.style.opacity = '0';
  c.style.transform = 'translateX(80px) scale(0.94)';
  void c.offsetWidth;
  c.style.transition = '';
  c.classList.add('visible');
  c.style.transform = '';
  await wait(1400);
}

export function setPose(pose) {
  const layer = $('#character-layer');
  if (!layer) return;
  POSE_CLASSES.forEach((p) => layer.classList.remove(p));
  if (!pose || pose === 'neutral') return;
  const cls = `pose-${pose}`;
  if (POSE_CLASSES.includes(cls)) {
    layer.classList.add(cls);
  }
}

export function flashCharacter() {
  const c = $('.character');
  if (!c) return;
  c.classList.remove('char-flash');
  void c.offsetWidth;
  c.classList.add('char-flash');
}
