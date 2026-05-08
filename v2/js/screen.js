// Screen stack: each scene is a single .screen element. We mount the
// next screen behind the host before swiping, then animate the old one
// out (translateY -100%) and the new one in (translateY 0). Heavy
// transition is the default; "soft" inside-screen paragraph swaps live
// inside paragraph.js, not here.
//
// Each screen contains:
//   - .screen-bg     整图背景（受 reveal mask 控制可见区域）
//   - .scene-el-layer 单体 PNG 切图槽位（多个 .scene-el 子节点）
// 单元素原则：同一时刻 .screen-bg 与 .scene-el 不混搭。脚本声明哪种由作者负责。

import { $, el, raf, wait } from './util.js';

let _host;
let _current = null; // { node, bg, paraZone, elLayer }

export function initScreen() {
  _host = $('#screen-host');
}

function buildScreen({ bg, bgColor, reveal }) {
  const node = el('div', { cls: 'screen entering' });

  const bgNode = el('div', { cls: 'screen-bg' });
  if (bgColor) bgNode.style.backgroundColor = bgColor;
  if (bg) bgNode.style.backgroundImage = `url("../src/images/${bg}")`;
  if (reveal) applyRevealMask(bgNode, reveal);
  node.appendChild(bgNode);

  const elLayer = el('div', { cls: 'scene-el-layer' });
  node.appendChild(elLayer);

  const paraZone = el('div', { cls: 'para-zone' });
  node.appendChild(paraZone);

  return { node, bg: bgNode, paraZone, elLayer };
}

// Mount the very first screen with a gentle rise (no old screen to push out).
export async function mountFirstScreen(spec) {
  if (!_host) initScreen();
  const next = buildScreen(spec);
  _host.appendChild(next.node);
  await raf();
  await raf();
  next.node.classList.remove('entering');
  next.node.classList.add('active');
  await wait(700);
  _current = next;
  return next;
}

// Heavy transition: old slides up, new slides up from below.
export async function transitionToScreen(spec, { duration = 700 } = {}) {
  if (!_host) initScreen();
  const old = _current;
  const next = buildScreen(spec);

  _host.appendChild(next.node);
  await raf();
  await raf();

  if (old) {
    old.node.classList.remove('active');
    old.node.classList.add('leaving');
  }
  next.node.classList.remove('entering');
  next.node.classList.add('active');

  await wait(duration);

  if (old) old.node.remove();
  _current = next;
  return next;
}

export function getCurrentScreen() { return _current; }
export function getCurrentParaZone() { return _current ? _current.paraZone : null; }
export function getCurrentBg() { return _current ? _current.bg : null; }
export function getCurrentElLayer() { return _current ? _current.elLayer : null; }

// =============================================================
// Reveal mask (整图局部露出)
// =============================================================
//
// reveal spec:
//   { shape: 'ellipse', cx, cy, rx, ry, soft? }   // 椭圆，单位百分比
//   { shape: 'top-half', soft? }                  // 线性，露出上半区
//   { shape: 'bottom-half', soft? }               // 线性，露出下半区
//   { shape: 'left-half', soft? }                 // 线性，露出左半区
//   { shape: 'right-half', soft? }                // 线性，露出右半区
//
// 白色不透明 = 显示，透明 = 隐藏（CSS mask alpha 语义，跨浏览器更稳）。
// 内圈 70% 半径完全可见，外圈 30% 软边过渡——比小光斑更接近"局部露出"语感。
function buildMaskGradient(reveal) {
  const soft = reveal.soft != null ? reveal.soft : 20; // 线性遮罩边缘渐变宽度（%）
  switch (reveal.shape) {
    case 'ellipse': {
      const cx = reveal.cx ?? 50;
      const cy = reveal.cy ?? 50;
      const rx = reveal.rx ?? 30;
      const ry = reveal.ry ?? 30;
      const plateau = reveal.plateau ?? 70; // 完全可见的内圈占比（%）
      return `radial-gradient(ellipse ${rx}% ${ry}% at ${cx}% ${cy}%, ` +
             `rgba(255,255,255,1) ${plateau}%, rgba(255,255,255,0) 100%)`;
    }
    case 'top-half':
      return `linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,1) ${50 - soft / 2}%, rgba(255,255,255,0) ${50 + soft / 2}%)`;
    case 'bottom-half':
      return `linear-gradient(to bottom, rgba(255,255,255,0) ${50 - soft / 2}%, rgba(255,255,255,1) ${50 + soft / 2}%, rgba(255,255,255,1) 100%)`;
    case 'left-half':
      return `linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,1) ${50 - soft / 2}%, rgba(255,255,255,0) ${50 + soft / 2}%)`;
    case 'right-half':
      return `linear-gradient(to right, rgba(255,255,255,0) ${50 - soft / 2}%, rgba(255,255,255,1) ${50 + soft / 2}%, rgba(255,255,255,1) 100%)`;
    default:
      console.warn('[screen] unknown reveal shape', reveal.shape);
      return null;
  }
}

function applyRevealMask(bgNode, reveal) {
  const grad = buildMaskGradient(reveal);
  if (!grad) return;
  bgNode.classList.add('revealed');
  bgNode.style.setProperty('--reveal-mask', grad);
  // 双保险：某些浏览器对 mask-image: var(...) 解析有 bug，
  // 直接内联设置 mask-image 兜底。两者效果等同。
  bgNode.style.maskImage = grad;
  bgNode.style.webkitMaskImage = grad;
}

function clearRevealMask(bgNode) {
  bgNode.classList.remove('revealed');
  bgNode.style.removeProperty('--reveal-mask');
  bgNode.style.maskImage = '';
  bgNode.style.webkitMaskImage = '';
}

// 动态切换/移动当前屏的 reveal mask（随剧情扩大或位移露出区域）。
export function setSceneRevealMask(reveal) {
  if (!_current) return;
  if (!reveal) {
    clearRevealMask(_current.bg);
    return;
  }
  applyRevealMask(_current.bg, reveal);
}

// =============================================================
// Scene element slot (单体 PNG)
// =============================================================
//
// 单体声明：
//   { id, src, x, y, w, h, opacity? }
//   x/y 是元素中心点（百分比），w/h 是显示尺寸（百分比 of 屏幅）。
//
// 单元素原则在脚本层强制：调用前应该清空旧单体，或同 id 替换。
export function setSceneElement(spec) {
  if (!_current) return null;
  const layer = _current.elLayer;
  if (!layer) return null;

  // 清空层（单元素原则：场景层任意时刻只 1 个）
  for (const child of [...layer.children]) {
    child.classList.remove('shown');
    setTimeout(() => child.remove(), 800);
  }

  if (!spec) return null;

  const node = el('div', { cls: 'scene-el', attrs: { 'data-id': spec.id || '' } });
  const w = spec.w ?? 30;
  const h = spec.h ?? 30;
  const x = spec.x ?? 50;
  const y = spec.y ?? 50;
  node.style.left = `${x - w / 2}%`;
  node.style.top = `${y - h / 2}%`;
  node.style.width = `${w}%`;
  node.style.height = `${h}%`;
  node.style.backgroundImage = `url("../src/images/${spec.src}")`;
  if (spec.rotate) node.style.transform = `rotate(${spec.rotate}deg)`;

  layer.appendChild(node);
  // Trigger transition.
  requestAnimationFrame(() => node.classList.add('shown'));
  if (spec.opacity != null) {
    setTimeout(() => { node.style.opacity = String(spec.opacity); }, 50);
  }
  return node;
}

export function clearSceneElements() {
  if (!_current || !_current.elLayer) return;
  for (const child of [...(_current.elLayer.children)]) {
    child.classList.remove('shown');
    setTimeout(() => child.remove(), 800);
  }
}

// 切换当前屏的 bg 来源（用于场景内同源切换 = 不切场景但换底图）。
export function setSceneBg({ bg, bgColor }) {
  if (!_current) return;
  if (bgColor) _current.bg.style.backgroundColor = bgColor;
  if (bg) _current.bg.style.backgroundImage = `url("../src/images/${bg}")`;
}
