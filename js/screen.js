// Screen stack: each scene mounts a paired set of .screen elements — one
// in #screen-host (back, below character) and one in #screen-host-front
// (front, above character). They animate in sync so swipe transitions
// move both halves together.
//
// 后景 .screen 包含：
//   - .screen-bg     整图背景（受 reveal mask 控制可见区域）
//   - .scene-el-layer.scene-el-layer-back  后景单体 PNG 切图槽位
//   - .para-zone     段落槽（仍归后景，跟随转场）
//
// 前景 .screen 包含：
//   - .scene-el-layer.scene-el-layer-front 前景单体 PNG 切图槽位
//   （整图前景待素材落地时再补 .screen-bg.front 节点）
//
// 单元素原则：场景·后景与场景·前景各 0-1 个元素。同槽位内单元素仍是单元素。

import { $, el, raf, wait } from './util.js';

// Bump when scene assets in src/images/ are re-exported. Appended as ?v=… to
// every image URL so browsers don't keep serving a stale cached webp/jpg after
// the artist updates the source file.
const ASSET_V = 3;
const imgURL = (src) => `src/images/${src}?v=${ASSET_V}`;

let _hostBack;
let _hostFront;
let _current = null; // { back: { node, bg, paraZone, elLayer }, front: { node, elLayer } }

export function initScreen() {
  _hostBack = $('#screen-host');
  _hostFront = $('#screen-host-front');
}

function buildScreens({ bg, bgColor, reveal }) {
  // ---- 后景 .screen ----
  const back = el('div', { cls: 'screen entering' });
  const bgBack = el('div', { cls: 'screen-bg' });
  if (bgColor) bgBack.style.backgroundColor = bgColor;
  if (bg) bgBack.style.backgroundImage = `url("${imgURL(bg)}")`;
  if (reveal) applyRevealMask(bgBack, reveal);
  back.appendChild(bgBack);

  const elLayerBack = el('div', { cls: 'scene-el-layer scene-el-layer-back' });
  back.appendChild(elLayerBack);

  const paraZone = el('div', { cls: 'para-zone' });
  back.appendChild(paraZone);

  // ---- 前景 .screen ----
  const front = el('div', { cls: 'screen entering' });
  const elLayerFront = el('div', { cls: 'scene-el-layer scene-el-layer-front' });
  front.appendChild(elLayerFront);

  return {
    back:  { node: back,  bg: bgBack, paraZone, elLayer: elLayerBack },
    front: { node: front, elLayer: elLayerFront },
  };
}

// Mount the very first screen with a gentle rise (no old screen to push out).
export async function mountFirstScreen(spec) {
  if (!_hostBack) initScreen();
  const next = buildScreens(spec);
  next.spec = spec;
  _hostBack.appendChild(next.back.node);
  _hostFront.appendChild(next.front.node);
  await raf();
  await raf();
  next.back.node.classList.remove('entering');
  next.back.node.classList.add('active');
  next.front.node.classList.remove('entering');
  next.front.node.classList.add('active');
  // finally so a scene-jump cancel still claims this as _current and the
  // next transitionToScreen will be able to remove it as `old`.
  try {
    await wait(700);
  } finally {
    _current = next;
  }
  return next;
}

// Transition rules:
//   - 同图（spec.bg 与当前一致）：不换 .screen，原地更新 reveal/bgColor，
//     清掉旧 scene-el，让"显示区域变化"自己跑 CSS transition。
//   - 异图：旧屏原地渐隐（leaving-fade，不再上滑），新屏 clip-path 从
//     inset(100% 0 0 0) 收到 inset(0)（从下向上揭示，自身不位移）。
//   两条路径都被上滑涟漪 ~2s 的视觉覆盖，无需额外掩饰。
export async function transitionToScreen(spec, { duration = 700 } = {}) {
  if (!_hostBack) initScreen();
  const old = _current;

  const oldBg = (old && old.spec) ? (old.spec.bg ?? null) : null;
  const newBg = spec.bg ?? null;
  const sameBg = !!old && oldBg === newBg && newBg !== null;

  if (sameBg) {
    // 原地更新。bgColor / reveal 的 transition 由 .screen-bg 自带的 800–900ms
    // 缓动负责；这里只切样式 + 清单体槽位，最后等动画结束。
    if (spec.bgColor !== undefined) {
      old.back.bg.style.backgroundColor = spec.bgColor || '';
    }
    if (spec.reveal) applyRevealMask(old.back.bg, spec.reveal);
    else clearRevealMask(old.back.bg);
    // 旧屏在异图路径里随 DOM 删除而清空单体；同图路径下要显式清。
    for (const slot of [old.back, old.front]) {
      if (!slot || !slot.elLayer) continue;
      for (const child of [...slot.elLayer.children]) {
        child.classList.remove('shown');
        child.style.opacity = '0';
        setTimeout(() => child.remove(), 800);
      }
    }
    old.spec = { ...old.spec, ...spec };
    await wait(duration);
    return old;
  }

  // 异图：起手把新屏放进 entering-wipe（clip 起点：整屏顶部全裁掉，下沿是 100%）
  const next = buildScreens(spec);
  next.spec = spec;
  next.back.node.classList.remove('entering');
  next.back.node.classList.add('entering-wipe');
  next.front.node.classList.remove('entering');
  next.front.node.classList.add('entering-wipe');

  _hostBack.appendChild(next.back.node);
  _hostFront.appendChild(next.front.node);
  await raf();
  await raf();

  if (old) {
    old.back.node.classList.remove('active');
    old.back.node.classList.add('leaving-fade');
    old.front.node.classList.remove('active');
    old.front.node.classList.add('leaving-fade');
  }
  next.back.node.classList.remove('entering-wipe');
  next.back.node.classList.add('active');
  next.front.node.classList.remove('entering-wipe');
  next.front.node.classList.add('active');

  // finally so a scene-jump cancel mid-transition still removes the old
  // screen and promotes `next` to _current — otherwise leaked DOM piles up.
  try {
    await wait(duration);
  } finally {
    if (old) {
      old.back.node.remove();
      old.front.node.remove();
    }
    _current = next;
  }
  return next;
}

export function getCurrentScreen() { return _current; }
export function getCurrentParaZone() { return _current ? _current.back.paraZone : null; }
export function getCurrentBg() { return _current ? _current.back.bg : null; }
export function getCurrentElLayer() { return _current ? _current.back.elLayer : null; }

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
function buildMaskGradient(reveal) {
  const soft = reveal.soft != null ? reveal.soft : 20;
  switch (reveal.shape) {
    case 'ellipse': {
      const cx = reveal.cx ?? 50;
      const cy = reveal.cy ?? 50;
      const rx = reveal.rx ?? 30;
      const ry = reveal.ry ?? 30;
      const plateau = reveal.plateau ?? 70;
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
  bgNode.style.maskImage = grad;
  bgNode.style.webkitMaskImage = grad;
}

function clearRevealMask(bgNode) {
  bgNode.classList.remove('revealed');
  bgNode.style.removeProperty('--reveal-mask');
  bgNode.style.maskImage = '';
  bgNode.style.webkitMaskImage = '';
}

// 切换/移动当前屏的 reveal mask（仅作用于后景；前景整图露出待素材到位后再补）。
export function setSceneRevealMask(reveal, position = 'back') {
  if (!_current) return;
  if (position !== 'back') {
    console.warn('[screen] front-side reveal mask not yet supported');
    return;
  }
  if (!reveal) {
    clearRevealMask(_current.back.bg);
    return;
  }
  applyRevealMask(_current.back.bg, reveal);
}

// =============================================================
// Scene element slot (单体 PNG)
// =============================================================
//
// 单体声明：
//   { id, src, x, y, w, h, opacity?, brightness?, feather?, blur?, rotate? }
//   x/y 是元素中心点（百分比），w/h 是显示尺寸（百分比 of 屏幅）。
//   - opacity:  0-1，最终透明度。
//   - brightness: CSS filter brightness 系数（<1 调暗，让单体融入暗场景）。
//   - feather:  true 或数字 0-50。羽化矩形外缘 = radial-gradient mask 让边缘淡出。
//               数字代表"实心圆"占比 0-100（默认 55），越小越多羽化。
//   - blur:     CSS filter blur（px），软化锐利轮廓。
//
// position: 'back' | 'front'。后景单体在角色之下，前景单体在角色之上。
// 单元素原则在脚本层强制：调用前会清空同槽位的旧单体。
export function setSceneElement(spec, position = 'back') {
  if (!_current) return null;
  const slot = position === 'front' ? _current.front : _current.back;
  const layer = slot && slot.elLayer;
  if (!layer) return null;

  // 清空槽位（单元素原则：同槽位任意时刻只 1 个）
  // 显式把 opacity 归零：show 路径可能写过 inline opacity (如鱼尾 0.55)，
  // 仅 remove('shown') 无法盖过 inline 值，会跳过淡出直接到 800ms 后被 remove。
  for (const child of [...layer.children]) {
    child.classList.remove('shown');
    child.style.opacity = '0';
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
  node.style.backgroundImage = `url("${imgURL(spec.src)}")`;

  // 融入场景：brightness（调暗）+ blur（软化轮廓）
  const filters = [];
  if (spec.brightness != null) filters.push(`brightness(${spec.brightness})`);
  if (spec.blur != null) filters.push(`blur(${spec.blur}px)`);
  if (filters.length) node.style.filter = filters.join(' ');

  // 羽化边缘：径向 mask，让矩形外缘淡出。
  if (spec.feather) {
    const core = typeof spec.feather === 'number' ? spec.feather : 55;
    const mask = `radial-gradient(ellipse ${100}% ${100}% at 50% 50%, black ${core}%, transparent 100%)`;
    node.style.maskImage = mask;
    node.style.webkitMaskImage = mask;
  }

  if (spec.rotate) node.style.transform = `rotate(${spec.rotate}deg)`;

  layer.appendChild(node);
  // 双 rAF：第一帧让浏览器把初始 opacity:0 提交渲染，第二帧再写目标态，
  // 这样 700ms 淡入 transition 才会真正触发（单 rAF 常被合帧成直接跳变）。
  requestAnimationFrame(() => requestAnimationFrame(() => {
    node.classList.add('shown');
    // 自定义 opacity 直接以 inline 写入目标值，与 .shown 同帧生效，由 CSS transition 平滑过渡。
    if (spec.opacity != null) node.style.opacity = String(spec.opacity);
  }));
  return node;
}

export function clearSceneElements(position = 'back') {
  if (!_current) return;
  const slots = position === 'both'
    ? [_current.back, _current.front]
    : [position === 'front' ? _current.front : _current.back];
  for (const slot of slots) {
    if (!slot || !slot.elLayer) continue;
    for (const child of [...slot.elLayer.children]) {
      child.classList.remove('shown');
      // 同 setSceneElement 的清空逻辑：盖掉可能存在的 inline opacity，保证 700ms 淡出。
      child.style.opacity = '0';
      setTimeout(() => child.remove(), 800);
    }
  }
}

// 切换当前屏的 bg 来源（场景内同源切换 = 不切场景但换底图）。仅作用于后景。
// bg === null 或 '' → 清掉背景图，仅保留 bgColor；bgColor 同理。
export function setSceneBg({ bg, bgColor }) {
  if (!_current) return;
  const bgNode = _current.back.bg;
  if (bgColor !== undefined) {
    bgNode.style.backgroundColor = bgColor || '';
  }
  if (bg !== undefined) {
    bgNode.style.backgroundImage = bg ? `url("${imgURL(bg)}")` : 'none';
  }
}
