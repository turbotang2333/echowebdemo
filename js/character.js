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

// Head anchor for bubble positioning. Returns { xPct, crownYPct, chinYPct } in viewport %.
// Ratios are relative to .char-fig rect, so they自动随 transform scale 走，
// 且包含 .char-fig 上的 pose translateY。比例按 xiaohuli 立绘目测，调整时只动这两个常量。
const HEAD_CROWN_RATIO = 0.06;  // 头顶 y 在 char-fig rect 中的比例
const HEAD_CHIN_RATIO  = 0.28;  // 下巴 y 在 char-fig rect 中的比例
export function getHeadAnchor() {
  if (!_node) initCharacter();
  const fig = _node ? _node.querySelector('.char-fig') : null;
  const target = fig || _node;
  if (!target) return { xPct: 50, crownYPct: 25, chinYPct: 38 };
  const rect = target.getBoundingClientRect();
  if (!rect.width) return { xPct: 50, crownYPct: 25, chinYPct: 38 };
  const cx = rect.left + rect.width * 0.5;
  const crownY = rect.top + rect.height * HEAD_CROWN_RATIO;
  const chinY  = rect.top + rect.height * HEAD_CHIN_RATIO;
  return {
    xPct: (cx / window.innerWidth) * 100,
    crownYPct: (crownY / window.innerHeight) * 100,
    chinYPct:  (chinY  / window.innerHeight) * 100,
  };
}
