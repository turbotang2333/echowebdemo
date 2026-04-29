import { $, el, wait } from './util.js';
import { setRingState, RING } from './ring.js';
import { waitForRingLongPress, waitForRingRelease } from './input.js';
import { showInkLine, startInkLine } from './ink.js';
import { addJournalEntry } from './journal.js';

const TYPING_SPEED = 60;
const LINE_HOLD = 700;
const LINE_GAP = 350;

const Q1 = {
  lines: ['来。', '让我看看你。', '你身上带着一种气息——', '凭直觉,你觉得那是什么?'],
  hints: ['一阵风', '一捧水', '一簇火', '说不清'],
  preset: '一捧水',
};
const CAPTURE_LINES = ['嗯……我感受到了。', '别动,让我看看你灵魂的颜色。'];
const REVEAL_LINES = ['你的灵魂是淡青色的,像清晨还没散掉的雾。', '那边有一个人,他还没认出自己的颜色。', '他在等你,要过去吗?'];
const APPROACH = {
  hints: ['过去', '先在这里看看'],
  preset: '先在这里看看',
};

class SkipPrologue extends Error { constructor() { super('skip'); this.name = 'SkipPrologue'; } }

let _skipped = false;
let _skipResolvers = [];

function armSkip() {
  _skipped = false;
  _skipResolvers = [];
}
function fireSkip() {
  if (_skipped) return;
  _skipped = true;
  const list = _skipResolvers;
  _skipResolvers = [];
  list.forEach((r) => r());
}
function whenSkipped() {
  if (_skipped) return Promise.resolve();
  return new Promise((r) => _skipResolvers.push(r));
}

// Sleep that throws SkipPrologue if the prologue was skipped during/after the wait.
async function pwait(ms) {
  if (_skipped) throw new SkipPrologue();
  await Promise.race([wait(ms), whenSkipped()]);
  if (_skipped) throw new SkipPrologue();
}
// Wrap a press-waiter promise so it resolves on skip.
async function pressOrSkip(promise) {
  if (_skipped) throw new SkipPrologue();
  await Promise.race([promise, whenSkipped()]);
  if (_skipped) throw new SkipPrologue();
}

async function haloSpeak(lines, opts = {}) {
  const node = $('#echo-text');
  if (!node) return;
  const keepLast = opts.keepLast !== false;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const isLast = li === lines.length - 1;

    node.classList.remove('drifting', 'visible');
    node.textContent = '';
    void node.offsetWidth;
    node.classList.add('visible');

    addJournalEntry({ kind: 'dialogue', speaker: '回响', text: line });
    for (let i = 0; i < line.length; i++) {
      if (_skipped) throw new SkipPrologue();
      node.textContent += line[i];
      await pwait(TYPING_SPEED);
    }
    if (isLast && keepLast) {
      // Stay on screen — caller will drift it away after user responds.
      return;
    }
    await pwait(LINE_HOLD);
    node.classList.add('drifting');
    await pwait(1000);
    node.classList.remove('drifting', 'visible');
    await pwait(LINE_GAP);
  }
}

async function hideEchoText() {
  const node = $('#echo-text');
  if (!node) return;
  if (!node.classList.contains('visible')) return;
  node.classList.add('drifting');
  await pwait(1000);
  node.classList.remove('drifting', 'visible');
  node.textContent = '';
}

let _hintTimer = null;
let _hintsActive = false;

const HINT_LIFE = 5000;
const HINT_FADE_OUT = 1500;

function spawnHint(text, lane, numLanes) {
  const zone = $('#echo-hints');
  if (!zone) return;
  const node = el('div', { cls: 'echo-hint', text });
  const isPortrait = document.body.classList.contains('portrait-mode');
  if (isPortrait) {
    const xPct = 14 + lane * (72 / Math.max(1, numLanes));
    node.style.left = `${xPct.toFixed(1)}%`;
  } else {
    const topVh = 30 + lane * (40 / Math.max(1, numLanes));
    node.style.top = `${topVh.toFixed(1)}vh`;
  }
  zone.appendChild(node);
  void node.offsetWidth;
  node.classList.add('live');
  setTimeout(() => {
    if (node.isConnected) node.remove();
  }, HINT_LIFE);
}

function startHints(hints) {
  _hintsActive = true;
  const numLanes = hints.length;
  const interval = HINT_LIFE / numLanes;
  let i = 0;
  const tick = () => {
    if (!_hintsActive) return;
    const idx = i % hints.length;
    spawnHint(hints[idx], idx, numLanes);
    i++;
    _hintTimer = setTimeout(tick, interval);
  };
  spawnHint(hints[0], 0, numLanes);
  i = 1;
  _hintTimer = setTimeout(tick, interval);
}

function stopHints() {
  _hintsActive = false;
  if (_hintTimer) { clearTimeout(_hintTimer); _hintTimer = null; }
  const zone = $('#echo-hints');
  if (!zone) return;
  zone.querySelectorAll('.echo-hint').forEach((n) => {
    n.style.transition = 'opacity 0.6s var(--ease-drift)';
    n.style.animation = 'none';
    n.style.opacity = '0';
    setTimeout(() => n.remove(), 700);
  });
}

async function collectAnswer(hints, presetText) {
  startHints(hints);
  setRingState(RING.INVITATION);
  await pressOrSkip(waitForRingLongPress());
  setRingState(RING.RECORDING);

  // Clear halo + hints right away so the bubble has the stage during press.
  stopHints();
  hideEchoText();

  // Bubble starts typing the moment long-press fires. Hold + drift only run
  // once typing finished AND user released, so a quick release waits on
  // typing and a long press waits on the user.
  const ink = startInkLine(presetText, { typingSpeed: 60 });
  await pressOrSkip(Promise.all([ink.typingDone, waitForRingRelease()]));

  setRingState(RING.DELIVERING);
  await ink.finish(1200);
  if (_skipped) throw new SkipPrologue();

  setRingState(RING.THINKING);
  await pwait(600);
  setRingState(RING.RESPONDING);
  await pwait(200);
  setRingState(RING.IDLE);
}

async function cameraFlash() {
  const veil = $('#white-veil');
  if (!veil) return;
  veil.classList.add('echo-flash');
  await pwait(140);
  veil.classList.remove('echo-flash');
  await pwait(500);
}

function bindSkipButton() {
  const btn = $('#echo-skip');
  if (!btn) return;
  const handler = (e) => { e.preventDefault?.(); e.stopPropagation?.(); fireSkip(); };
  btn._echoSkipHandler = handler;
  btn.addEventListener('click', handler);
  btn.addEventListener('touchstart', handler, { passive: false });
}
function unbindSkipButton() {
  const btn = $('#echo-skip');
  if (!btn || !btn._echoSkipHandler) return;
  btn.removeEventListener('click', btn._echoSkipHandler);
  btn.removeEventListener('touchstart', btn._echoSkipHandler);
  btn._echoSkipHandler = null;
}

async function runFlow() {
  await pwait(1400);

  await haloSpeak(Q1.lines);
  await collectAnswer(Q1.hints, Q1.preset);

  await haloSpeak(CAPTURE_LINES);
  await pwait(400);
  await hideEchoText();
  await cameraFlash();
  await haloSpeak(REVEAL_LINES, { keepLast: true });

  await collectAnswer(APPROACH.hints, APPROACH.preset);
}

function cleanupAfterSkip() {
  stopHints();
  setRingState(RING.IDLE);
  const veil = $('#white-veil');
  if (veil) veil.classList.remove('echo-flash');
  const node = $('#echo-text');
  if (node) {
    node.classList.remove('drifting', 'visible');
    node.textContent = '';
  }
  const bubbleZone = $('#bubble-zone');
  if (bubbleZone) {
    bubbleZone.querySelectorAll('.bubble-user').forEach((n) => n.remove());
  }
}

export async function runEchoPrologue() {
  const stage = $('#echo-stage');
  const skipBtn = $('#echo-skip');
  const anchor = $('#journal-anchor');
  if (!stage) return;
  if (anchor) anchor.style.display = 'none';
  stage.hidden = false;
  if (skipBtn) skipBtn.hidden = false;
  await new Promise(requestAnimationFrame);
  stage.classList.add('visible');

  armSkip();
  bindSkipButton();

  let wasSkipped = false;
  try {
    await runFlow();
  } catch (e) {
    if (e instanceof SkipPrologue) wasSkipped = true;
    else throw e;
  } finally {
    unbindSkipButton();
    if (skipBtn) skipBtn.hidden = true;
  }

  if (wasSkipped) cleanupAfterSkip();

  // Halo dissolves
  if (wasSkipped) stage.style.transitionDuration = '0.6s';
  stage.classList.remove('visible');
  stage.classList.add('dissolving');
  await wait(wasSkipped ? 600 : 1400);
  stage.hidden = true;
  stage.classList.remove('dissolving');
  stage.style.transitionDuration = '';

  // Settle a beat before the story begins.
  if (anchor) anchor.style.display = '';
  await wait(800);
}
