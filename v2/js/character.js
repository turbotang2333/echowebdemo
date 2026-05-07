// Character module: control xiaohuli立绘 — position, pose, visibility.
// Position is one of: hidden, far, far-lit, mid, mid-back, close, extreme,
// curled, walking-away. Pose is a small modifier (tilt/lean-in/...).

import { $, wait, raf } from './util.js';

let _node;

export function initCharacter() {
  _node = $('#character');
}

export async function setCharVisible(on) {
  if (!_node) initCharacter();
  if (on) _node.classList.add('visible');
  else _node.classList.remove('visible');
  await wait(50);
}

export async function setCharPos(pos) {
  if (!_node) initCharacter();
  _node.dataset.pos = pos;
  if (pos === 'hidden') _node.classList.remove('visible');
  else _node.classList.add('visible');
  await wait(50);
}

export async function setCharPose(pose) {
  if (!_node) initCharacter();
  if (pose) _node.dataset.pose = pose;
  else delete _node.dataset.pose;
  await wait(50);
}

// Reset on scene change.
export function resetCharacter() {
  if (!_node) initCharacter();
  _node.dataset.pos = 'hidden';
  delete _node.dataset.pose;
  _node.classList.remove('visible');
}

// Head anchor for bubble positioning. Returns { xPct, yPct } in viewport %.
// HEAD_RATIO = 0.18 means head center sits at 18% from top of character bounds
// — calibrated against xiaohuli.png立绘比例 (head dominates upper portion).
const HEAD_RATIO = 0.18;
export function getHeadAnchor() {
  if (!_node) initCharacter();
  if (!_node) return { xPct: 50, yPct: 35 };
  const rect = _node.getBoundingClientRect();
  if (!rect.width) return { xPct: 50, yPct: 35 };
  const headX = rect.left + rect.width * 0.5;
  const headY = rect.top + rect.height * HEAD_RATIO;
  return {
    xPct: (headX / window.innerWidth) * 100,
    yPct: (headY / window.innerHeight) * 100,
  };
}
