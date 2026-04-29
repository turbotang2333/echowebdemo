import { $, el, wait } from './util.js';
import { addJournalEntry } from './journal.js';
import { syncSubtitleAnchor, getHeadAnchor } from './character.js';
import { getSpeed } from './signal.js';

const NARRATION_LIFE = 3500;
const HEAVY_LIFE = 4500;
const DIALOGUE_TYPING = 55;
const DIALOGUE_HOLD = 1500;
const DRIFT_DUR = 1000;
const HEAVY_DRIFT_DUR = 1400;

async function driftAway(node, dur = DRIFT_DUR) {
  node.classList.add('drifting');
  await wait(Math.round(dur / getSpeed()));
  node.remove();
}

export async function showNarration(text, opts = {}) {
  addJournalEntry({ kind: 'narration', text });

  const zone = $('#narration-zone');
  const node = el('div', { cls: 'narration', text });
  zone.appendChild(node);
  await new Promise(requestAnimationFrame);
  node.classList.add('visible');
  await wait(Math.round((opts.life || NARRATION_LIFE) / getSpeed()));
  await driftAway(node);
}

export async function showInner(text, opts = {}) {
  addJournalEntry({ kind: 'inner', text });

  const zone = $('#inner-zone');
  const node = el('div', { cls: 'inner', text: `（${text}）` });
  zone.appendChild(node);
  await new Promise(requestAnimationFrame);
  node.classList.add('visible');
  await wait(Math.round((opts.life || NARRATION_LIFE) / getSpeed()));
  await driftAway(node);
}

// ----------------- 对话气泡 -----------------
// 角色("他"等):气泡跟头走 — 默认放在头上方(竖屏构图里头顶以上才是真的"空"
//                              的区域);只有头被顶到屏幕最上面时才回退到下方。
//                            x 跟随头部 x 位置,bubble 中心被 clamp 在屏内,
//                            啾啾沿气泡边沿滑动以对准头。
// 你:固定底部,啾啾向下指向呼吸弧。

let _lastCharSide = 'bottom'; // 'top' = bubble below head, 'bottom' = bubble above head

// 翻转阈值带磁滞:气泡默认在头上;头若靠近屏顶到放不下,才翻到头下。
// FLIP_TO_BELOW_AT < FLIP_TO_ABOVE_AT 形成 2vh 磁滞带,避免边界来回抖动。
const FLIP_TO_BELOW_AT = 18; // head.yPct < 18 → 气泡放头下方(top)
const FLIP_TO_ABOVE_AT = 22; // head.yPct >= 22 → 回到头上方(bottom)

function pickCharSide(headYPct) {
  if (_lastCharSide === 'top') {
    if (headYPct >= FLIP_TO_ABOVE_AT) _lastCharSide = 'bottom';
  } else {
    if (headYPct < FLIP_TO_BELOW_AT) _lastCharSide = 'top';
  }
  return _lastCharSide;
}

// 头部解剖偏移(基于 xiaohuli.png 立绘比例) — 按头中心(eye level)向上下扩展。
// 气泡边到头部边再加一点 GAP, 啾啾尖正好落在头顶/下巴外。
const HEAD_CROWN_OFFSET_VH = 13; // head center → top of crown
const HEAD_CHIN_OFFSET_VH  = 12; // head center → chin
const BUBBLE_EDGE_GAP_VH   = 1.5;
const BUBBLE_X_MARGIN_VW   = 4;  // min margin to viewport edges

async function showCharBubble(speaker, text, opts = {}) {
  syncSubtitleAnchor();
  const head = getHeadAnchor();
  const side = pickCharSide(head.yPct);

  const zone = $('#bubble-zone');
  const node = el('div', { cls: `bubble bubble-char tail-${side}` });

  // Position bubble center horizontally at head x; vertical depends on side.
  // side='top'    → bubble below head, top edge below the chin
  // side='bottom' → bubble above head, bottom edge above the crown
  node.style.left = `${head.xPct}%`;
  if (side === 'top') {
    node.style.top = `${head.yPct + HEAD_CHIN_OFFSET_VH + BUBBLE_EDGE_GAP_VH}%`;
    node.style.bottom = '';
  } else {
    node.style.bottom = `${100 - head.yPct + HEAD_CROWN_OFFSET_VH + BUBBLE_EDGE_GAP_VH}%`;
    node.style.top = '';
  }

  // Pre-render full text to measure final bubble width, then clear for typewriter.
  // Locking width avoids the tail "sliding along" while text fills in.
  node.textContent = text;
  zone.appendChild(node);
  await new Promise(requestAnimationFrame);

  let rect = node.getBoundingClientRect();
  // Lock width AND height so typewriter doesn't grow the bubble (and the tail)
  // char-by-char — height lock prevents the empty→full vertical flash.
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;

  // Clamp bubble inside the viewport — if head sits too close to an edge for
  // the bubble to fit centered on it, shift the bubble in. The tail (computed
  // below) then slides along the bubble's edge to still point at head.x.
  const margin = window.innerWidth * (BUBBLE_X_MARGIN_VW / 100);
  let shiftPx = 0;
  if (rect.left < margin) shiftPx = margin - rect.left;
  else if (rect.right > window.innerWidth - margin) shiftPx = (window.innerWidth - margin) - rect.right;
  if (shiftPx !== 0) {
    const headPxXOrig = (head.xPct / 100) * window.innerWidth;
    const newCenterPct = ((headPxXOrig + shiftPx) / window.innerWidth) * 100;
    node.style.left = `${newCenterPct}%`;
    rect = node.getBoundingClientRect();
  }

  // Tail x relative to bubble's left edge — points at the head's actual viewport x.
  const headPxX = (head.xPct / 100) * window.innerWidth;
  const tailLeftPx = Math.max(14, Math.min(rect.width - 14, headPxX - rect.left));
  node.style.setProperty('--tail-pos', `${tailLeftPx}px`);

  node.textContent = '';
  await new Promise(requestAnimationFrame);
  node.classList.add('visible');

  const speed = opts.typingSpeed || DIALOGUE_TYPING;
  const actualSpeed = Math.round(speed / getSpeed());
  for (let i = 0; i < text.length; i++) {
    node.textContent += text[i];
    await wait(actualSpeed);
  }

  await wait(opts.holdDuration || Math.round(DIALOGUE_HOLD / getSpeed()));
  await driftAway(node);
}

async function showUserBubble(text, opts = {}) {
  const zone = $('#bubble-zone');
  const node = el('div', { cls: 'bubble bubble-user tail-bottom' });
  zone.appendChild(node);

  await new Promise(requestAnimationFrame);
  node.classList.add('visible');

  const speed = opts.typingSpeed || DIALOGUE_TYPING;
  const actualSpeed = Math.round(speed / getSpeed());
  for (let i = 0; i < text.length; i++) {
    node.textContent += text[i];
    await wait(actualSpeed);
  }

  await wait(opts.holdDuration || Math.round(DIALOGUE_HOLD / getSpeed()));
  await driftAway(node);
}

export async function showDialogue(speaker, text, opts = {}) {
  addJournalEntry({ kind: 'dialogue', speaker, text });

  if (speaker === '你') {
    return showUserBubble(text, opts);
  }
  return showCharBubble(speaker, text, opts);
}

export async function showHeavy(text, opts = {}) {
  addJournalEntry({ kind: 'heavy', text });

  const stage = $('#stage');
  if (stage) stage.classList.add('heavy-active');

  const zone = $('#heavy-zone');
  const wrap = el('div', { cls: 'heavy-wrap' });
  const node = el('div', { cls: 'heavy', text });
  wrap.appendChild(node);
  zone.appendChild(wrap);
  await new Promise(requestAnimationFrame);
  wrap.classList.add('visible');
  await wait(Math.round((opts.life || HEAVY_LIFE) / getSpeed()));
  if (stage) stage.classList.remove('heavy-active');
  await driftAway(wrap, HEAVY_DRIFT_DUR);
}

export async function showNPCText(text, opts = {}) {
  const dir = opts.from || 'top';
  addJournalEntry({ kind: 'narration', text: `（${dir === 'top' ? '从上方' : '从一旁'}传来）${text}` });

  const zone = $('#npc-zone');
  const node = el('div', { cls: `npc-text from-${dir}`, text });
  zone.appendChild(node);
  await wait(Math.round((opts.life || 4500) / getSpeed()));
  node.remove();
}

export const pause = (ms) => wait(Math.round(ms / getSpeed()));
