// Text system — five flavors, ported from v1 with v2-friendly hooks:
//
//   showNarration   旁白：narration-zone, banner 暗带, drift after hold
//   showInner       内心OS：inner-zone, 加括号, 同 banner
//   showHeavy       重旁白：heavy-zone, 横线装饰, stage.heavy-active 压暗
//   showNPCText     缺席旁白：npc-zone, 从方向入场（top/right）
//   showDialogue    对话气泡：bubble-zone, 跟随头部 (他) / 固定底部 (你)
//
// 所有"会逐字打出"的接口都支持 tap-fast-forward — 通过 consumeFastForward()
// 把当前活动 typer 一次性喷完。
//
// 上滑 advance：advanceCurrent() 强制把当前正在停留的 narration / inner 漂走，
// 用于 await-swipe 节拍。clearAllText() 在场景切换前抹掉一切。

import { $, el, raf, wait, defer } from './util.js';
import { getHeadAnchor } from './character.js';
import { onTurboChange } from './turbo.js';
import { addJournalEntry } from './journal.js';

const TYPING_NARRATION = 38;
const TYPING_DIALOGUE = 55;
const HOLD_NARRATION = 1500;

// 旁白 / 内心 / aside 的 token 流式浮现节奏（实时生成感）
const TOKEN_CHUNK_GAP = 240;        // 相邻 chunk 启动间隔（基础值，ms）
const TOKEN_CHUNK_JITTER = 0.20;    // 间隔抖动 ±20%
const TOKEN_LINE_PAUSE = 180;       // 行末→行首额外停顿（ms）
const TOKEN_FADE_MS = 700;          // 单个 chunk 浮现时长（ms）
const HOLD_DIALOGUE = 1500;
const HOLD_HEAVY = 4500;
const DRIFT_DUR = 1000;
const HEAVY_DRIFT_DUR = 1400;

let _activeTyper = null;          // current running typer { skip(), donePromise }
let _activeReveal = null;         // current running token reveal { skip() }
let _activeNarration = null;      // narration/inner/aside node currently visible
let _bubbleSide = 'bottom';       // hysteresis for char bubble flip

onTurboChange((on) => {
  if (!on) return;
  if (_activeTyper) try { _activeTyper.skip(); } catch {}
  if (_activeReveal) try { _activeReveal.skip(); } catch {}
});

// Trailing punctuation: when a token chunk would split right before one of
// these, we pull the punctuation into the previous chunk so it never leads
// a new reveal. Includes Chinese/English end marks plus closing quotes.
const TRAILING_PUNCT = new Set([
  '。', '，', '、', '；', '：', '？', '！', '…',
  '"', '"', '’', '”', ')', '）', '」', '』', '】', '——', '—',
  '.', ',', '?', '!', ';', ':',
]);

// Char-mode typewriter — 1 char per tick. Used by dialogue + heavy.
// Registered as _activeTyper so tap fast-forward can collapse remaining chars.
function startTyper(node, text, perChar) {
  const settled = defer();
  const chars = Array.from(text);
  let i = 0;
  let skipped = false;
  let done = false;

  const finalize = () => {
    if (done) return;
    done = true;
    node.textContent = text;
    if (_activeTyper && _activeTyper.node === node) _activeTyper = null;
    settled.resolve();
  };

  const advance = () => {
    if (done) return;
    if (skipped) { finalize(); return; }
    if (i < chars.length) {
      node.textContent = chars.slice(0, i + 1).join('');
      i++;
      setTimeout(advance, perChar);
    } else {
      finalize();
    }
  };

  _activeTyper = {
    node,
    skip() { skipped = true; finalize(); },
    donePromise: settled.promise,
  };
  setTimeout(advance, 30);
  return settled.promise;
}

// Token-mode reveal — pre-lays out all 2-3 char chunks invisibly so the
// box has its final size from frame 0 (no center-expand artifact), then
// sequentially fades each chunk in with a small upward rise + blur clear.
// Each chunk carries its own per-chunk dark band (::before) so the banner
// materializes alongside the text rather than being pre-allocated.
//
// Pacing: TOKEN_CHUNK_GAP between chunks (±TOKEN_CHUNK_JITTER), plus
// TOKEN_LINE_PAUSE extra at line breaks (detected by getBoundingClientRect).
//
// Multi-phase: pass an array of strings to lay out a "段 + <br> + 段 ..."
// block whose box size is locked at frame 0. revealPhase(0) is run inline,
// later phases are exposed via the returned controller's revealRest().
//
// Not registered as _activeTyper — narration can't be fast-forwarded so the
// user controls pace by waiting for the reveal to finish.
function sliceForReveal(text) {
  const chars = Array.from(text);
  const total = chars.length;
  const slices = [];
  let i = 0;
  while (i < total) {
    const want = Math.random() < 0.45 ? 2 : 3;
    let end = Math.min(total, i + want);
    while (end < total && TRAILING_PUNCT.has(chars[end])) end++;
    slices.push(chars.slice(i, end).join(''));
    i = end;
  }
  return slices;
}

async function startTokenReveal(node, phasesInput) {
  const phases = Array.isArray(phasesInput) ? phasesInput : [phasesInput];

  // 暗带交给 line-banner 模式：顶固定 -22，高度由 --banner-h 控制，
  // 初始 0（暗带不显示），随每行推进逐步增大到"该行底 + 44"。
  node.classList.add('line-banner');
  node.style.setProperty('--banner-h', '0px');
  node.textContent = '';

  // Mount all phases' chunks pending — occupies layout, invisible.
  // Phases beyond the first are separated by <br> so they start on a new line;
  // the box's final size is locked from frame 0 → no upward shift when later
  // phases reveal.
  const phaseChunks = [];
  for (let p = 0; p < phases.length; p++) {
    if (p > 0) node.appendChild(document.createElement('br'));
    const slices = sliceForReveal(phases[p]);
    const chunks = slices.map((slice) => {
      const span = document.createElement('span');
      span.className = 'gen-chunk pending';
      span.textContent = slice;
      node.appendChild(span);
      return span;
    });
    phaseChunks.push(chunks);
  }

  // Layout settle, then measure each chunk's line top + bottom-relative-to-node
  // so we can pause at line breaks AND grow the banner per line.
  await raf();
  const parentTop = node.getBoundingClientRect().top;
  const phaseMs = phaseChunks.map((chunks) =>
    chunks.map((el) => ({
      top: el.getBoundingClientRect().top,
      bottom: el.getBoundingClientRect().bottom - parentTop,
    })));

  // Banner height + last-line tracking is shared across phases so phase N
  // continues growing the banner past phase N-1's last line.
  let lastBannerBottom = -1;
  let prevTop = phaseMs[0] && phaseMs[0][0] ? phaseMs[0][0].top : 0;

  const revealPhase = async (pi) => {
    const chunks = phaseChunks[pi];
    const ms = phaseMs[pi];
    if (!chunks || chunks.length === 0) return;

    const pendingTimers = [];
    let cumDelay = 0;

    for (let k = 0; k < chunks.length; k++) {
      const m = ms[k];
      if (k > 0) {
        const j = 1 + (Math.random() * 2 - 1) * TOKEN_CHUNK_JITTER;
        cumDelay += TOKEN_CHUNK_GAP * j;
        if (Math.abs(m.top - prevTop) > 2) {
          cumDelay += TOKEN_LINE_PAUSE;
          prevTop = m.top;
        }
      } else {
        // Phase boundary: still a real line change but no extra pause —
        // the dialogue interrupt already gave the reader a break.
        prevTop = m.top;
      }

      // 该 chunk 落在比暗带当前底沿更下的一行 —— 把暗带拉长到这行底。
      if (m.bottom > lastBannerBottom + 1) {
        const targetH = m.bottom + 44; // 顶 -22 + 行底下方 22
        pendingTimers.push(setTimeout(() => {
          node.style.setProperty('--banner-h', `${targetH}px`);
        }, cumDelay));
        lastBannerBottom = m.bottom;
      }

      const elRef = chunks[k];
      pendingTimers.push(setTimeout(() => {
        elRef.classList.remove('pending');
        elRef.classList.add('reveal');
      }, cumDelay));
    }

    const handle = {
      skip() {
        pendingTimers.forEach((t) => clearTimeout(t));
        pendingTimers.length = 0;
        // Banner 推到末行覆盖（最后一个 chunk 的底 + 44），否则 turbo 跳过时
        // 字全显出来但 banner 还停在最后一次 setProperty 的高度。
        const last = ms[ms.length - 1];
        if (last) node.style.setProperty('--banner-h', `${last.bottom + 44}px`);
        chunks.forEach((el) => {
          el.classList.remove('pending');
          el.classList.add('reveal');
        });
      },
    };
    _activeReveal = handle;

    await wait(cumDelay + TOKEN_FADE_MS);
    if (_activeReveal === handle) _activeReveal = null;
  };

  await revealPhase(0);

  if (phases.length === 1) return undefined;

  return {
    revealRest: async () => {
      for (let p = 1; p < phases.length; p++) await revealPhase(p);
    },
  };
}

// Tap fast-forward: skip remaining typing on the active typer.
// Returns true if it consumed the gesture, false otherwise.
export function consumeFastForward() {
  if (_activeTyper) {
    _activeTyper.skip();
    return true;
  }
  return false;
}

export function isTypingActive() { return !!_activeTyper; }

async function driftAway(node, dur = DRIFT_DUR) {
  node.classList.add('drifting');
  await wait(dur);
  if (node.parentNode) node.parentNode.removeChild(node);
}

// =========================================================
// 旁白 / 内心 / aside（统称 narration class 文字, 入 narration-zone）
// 落在屏中下偏上一点；新一段会先把上一段漂走。
// 不自动漂散 — 需要 advanceCurrent() 触发，或被下一段替换，或被 clearAllText 抹掉。
// =========================================================

function getNarrationZone(kind) {
  if (kind === 'inner') return $('#inner-zone');
  return $('#narration-zone');
}

async function showNarrationLike(text, opts = {}) {
  const kind = opts.kind || 'narration';
  const zone = getNarrationZone(kind);
  if (!zone) return;
  addJournalEntry({ kind, text });

  // Drift previous active narration out (fire-and-forget so they overlap nicely).
  if (_activeNarration && _activeNarration.parentNode) {
    const prev = _activeNarration;
    _activeNarration = null;
    driftAway(prev);
  }

  const wrap = (t) => kind === 'inner' ? `（${t}）` : t;
  const display = wrap(text);
  const display2 = opts.continueText ? wrap(opts.continueText) : null;
  const cls = kind === 'inner' ? 'inner' : (kind === 'aside' ? 'narration aside' : 'narration');
  const node = el('div', { cls });
  zone.appendChild(node);
  _activeNarration = node;

  await raf();
  node.classList.add('visible');

  // Multi-phase: pre-lay out 段1 + <br> + 段2 so box size is locked from
  // frame 0 → no upward shift when phase 2 reveals after the interrupt.
  const phases = display2 ? [display, display2] : [display];
  const ctrl = await startTokenReveal(node, phases);
  await wait(opts.hold != null ? opts.hold : HOLD_NARRATION);

  if (display2 && ctrl) {
    if (opts.interrupt) await opts.interrupt();
    addJournalEntry({ kind, text: opts.continueText });
    await ctrl.revealRest();
    await wait(opts.continueHold != null ? opts.continueHold : HOLD_NARRATION);
  }
}

export function showNarration(text, opts) { return showNarrationLike(text, { ...opts, kind: 'narration' }); }
export function showInner(text, opts)     { return showNarrationLike(text, { ...opts, kind: 'inner' }); }
export function showAside(text, opts)     { return showNarrationLike(text, { ...opts, kind: 'aside' }); }

// Light-swipe advance: drift the current narration/inner out (if any).
export async function advanceCurrent() {
  if (_activeTyper) _activeTyper.skip();
  if (_activeNarration && _activeNarration.parentNode) {
    const node = _activeNarration;
    _activeNarration = null;
    await driftAway(node);
  }
}

// Hard clear (used at scene transition): kill typer, drift everything out.
export async function clearAllText() {
  if (_activeTyper) _activeTyper.skip();
  _activeNarration = null;
  const zones = ['#narration-zone', '#inner-zone', '#heavy-zone', '#npc-zone', '#bubble-zone'];
  const nodes = [];
  zones.forEach((sel) => {
    const z = $(sel);
    if (!z) return;
    Array.from(z.children).forEach((c) => {
      if (!c.classList.contains('drifting')) c.classList.add('drifting');
      nodes.push(c);
    });
  });
  await wait(DRIFT_DUR);
  nodes.forEach((n) => { if (n.parentNode) n.parentNode.removeChild(n); });
}

// =========================================================
// 重旁白：屏正中，横线包裹，整体压暗其它层
// =========================================================

export async function showHeavy(text, opts = {}) {
  const stage = $('#stage');
  const zone = $('#heavy-zone');
  if (!zone) return;
  addJournalEntry({ kind: 'heavy', text });
  if (stage) stage.classList.add('heavy-active');

  const wrap = el('div', { cls: 'heavy-wrap' });
  const node = el('div', { cls: 'heavy' });
  wrap.appendChild(node);
  zone.appendChild(wrap);
  await raf();
  wrap.classList.add('visible');

  await startTyper(node, text, opts.typingSpeed || TYPING_NARRATION);
  await wait(opts.hold != null ? opts.hold : HOLD_HEAVY);

  if (stage) stage.classList.remove('heavy-active');
  wrap.classList.add('drifting');
  await wait(HEAVY_DRIFT_DUR);
  if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
}

// =========================================================
// NPC 缺席旁白：方位入场（top / right）
// 用 CSS 动画自包含；无打字效果（完整文字一次出现，由动画 fade in/out）
// =========================================================

export async function showNPCText(text, opts = {}) {
  const dir = opts.from || 'top';
  const zone = $('#npc-zone');
  if (!zone) return;
  addJournalEntry({ kind: 'npc', text });
  const node = el('div', { cls: `npc-text from-${dir}`, text });
  zone.appendChild(node);
  await wait(opts.life != null ? opts.life : 4500);
  if (node.parentNode) node.parentNode.removeChild(node);
}

// =========================================================
// 对话气泡 (角色 ↔ 你)
// =========================================================

const FLIP_TO_BELOW_AT = 18;
const FLIP_TO_ABOVE_AT = 22;
const HEAD_CROWN_OFFSET_VH = 13;
const HEAD_CHIN_OFFSET_VH  = 12;
const BUBBLE_EDGE_GAP_VH   = 1.5;
const BUBBLE_X_MARGIN_VW   = 4;

function pickCharSide(headYPct) {
  if (_bubbleSide === 'top') {
    if (headYPct >= FLIP_TO_ABOVE_AT) _bubbleSide = 'bottom';
  } else {
    if (headYPct < FLIP_TO_BELOW_AT) _bubbleSide = 'top';
  }
  return _bubbleSide;
}

async function showCharBubble(text, opts = {}) {
  const zone = $('#bubble-zone');
  if (!zone) return;
  const head = getHeadAnchor();
  const side = pickCharSide(head.yPct);

  const node = el('div', { cls: `bubble bubble-char tail-${side}` });

  node.style.left = `${head.xPct}%`;
  if (side === 'top') {
    node.style.top = `${head.yPct + HEAD_CHIN_OFFSET_VH + BUBBLE_EDGE_GAP_VH}%`;
    node.style.bottom = '';
  } else {
    node.style.bottom = `${100 - head.yPct + HEAD_CROWN_OFFSET_VH + BUBBLE_EDGE_GAP_VH}%`;
    node.style.top = '';
  }

  // Pre-render full text to measure final size, then clear for typewriter.
  // Locking width AND height avoids tail "sliding" + empty→full flash.
  node.textContent = text;
  zone.appendChild(node);
  await raf();

  let rect = node.getBoundingClientRect();
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;

  // Clamp inside viewport — if head is too close to an edge, shift bubble in
  // and let the tail slide along the bubble's edge to still point at head.x.
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

  const headPxX = (head.xPct / 100) * window.innerWidth;
  const tailLeftPx = Math.max(14, Math.min(rect.width - 14, headPxX - rect.left));
  node.style.setProperty('--tail-pos', `${tailLeftPx}px`);

  node.textContent = '';
  await raf();
  node.classList.add('visible');

  await startTyper(node, text, opts.typingSpeed || TYPING_DIALOGUE);
  await wait(opts.hold != null ? opts.hold : HOLD_DIALOGUE);
  await driftAway(node);
}

async function showUserBubble(text, opts = {}) {
  const zone = $('#bubble-zone');
  if (!zone) return;
  const node = el('div', { cls: 'bubble bubble-user tail-bottom' });
  zone.appendChild(node);

  await raf();
  node.classList.add('visible');

  await startTyper(node, text, opts.typingSpeed || TYPING_DIALOGUE);
  await wait(opts.hold != null ? opts.hold : HOLD_DIALOGUE);
  await driftAway(node);
}

export async function showDialogue(speaker, text, opts = {}) {
  addJournalEntry({ kind: 'dialogue', speaker: speaker || '他', text });
  if (speaker === '你') return showUserBubble(text, opts);
  return showCharBubble(text, opts);
}
