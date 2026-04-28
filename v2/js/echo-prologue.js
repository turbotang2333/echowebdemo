import { $, el, wait } from '../../js/util.js';
import { setRingState, RING } from './ring.js';
import { waitForRingLongPress, waitForRingRelease } from './input.js';
import { showInkLine } from './ink.js';
import { addJournalEntry } from './journal.js';
import { expectOrientation, waitForOrientation, LANDSCAPE } from './orientation.js';

const TYPING_SPEED = 60;
const LINE_HOLD = 700;
const LINE_GAP = 350;

const Q1 = {
  lines: ['来让我看看你。', '你今天,是什么温度的?'],
  hints: ['凉的', '温的', '烫的', '说不清'],
  preset: '温的',
};
const Q2 = {
  lines: ['你身上有一个地方,', '现在感觉最强烈。', '你猜,是哪里?'],
  hints: ['肩膀', '胃', '喉咙', '眼睛后面'],
  preset: '喉咙',
};
const Q3 = {
  lines: ['嗯……我看见了。', '你身上有一样东西——', '它自己以为自己是脆的,', '其实是——'],
  hints: ['软的', '韧的', '锋利的', '沉的'],
  preset: '韧的',
};
const CAPTURE_LINES = ['好了,别动。', '我要看看你的颜色。'];
const REVEAL_LINES = ['你的灵魂带有一种淡淡的青色,', '像那种清晨还没散掉的雾。'];
const Q4 = {
  lines: ['那边有一个人——', '他们也有颜色,', '但他们还没认出自己是什么颜色。', '他们在等一个看得见的人。', '要不要过去?'],
  hints: ['过去', '先远远看一眼'],
  preset: '过去',
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
  await pressOrSkip(waitForRingRelease());
  stopHints();
  hideEchoText();

  setRingState(RING.DELIVERING);
  await showInkLine(presetText, { typingSpeed: 60, holdDuration: 1200 });
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
  await pwait(1400); // Halo materializes

  await haloSpeak(Q1.lines);
  await collectAnswer(Q1.hints, Q1.preset);

  await haloSpeak(Q2.lines);
  await collectAnswer(Q2.hints, Q2.preset);

  await haloSpeak(Q3.lines);
  await collectAnswer(Q3.hints, Q3.preset);

  // Camera moment
  await haloSpeak(CAPTURE_LINES);
  await pwait(400);
  await hideEchoText();
  await cameraFlash();
  await haloSpeak(REVEAL_LINES, { keepLast: false });

  await haloSpeak(Q4.lines);
  await collectAnswer(Q4.hints, Q4.preset);
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
  const inkZone = $('#ink-zone');
  const inkText = $('#ink-text');
  if (inkZone) {
    inkZone.classList.remove('visible');
    inkZone.hidden = true;
  }
  if (inkText) {
    inkText.classList.remove('drifting');
    inkText.textContent = '';
  }
}

export async function runEchoPrologue() {
  const stage = $('#echo-stage');
  const skipBtn = $('#echo-skip');
  if (!stage) return;
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

  // Hand off to landscape: ask user to rotate, gate appears with thematic message.
  expectOrientation(LANDSCAPE, '把屏幕横过来 — 他在那边等你');
  await waitForOrientation(LANDSCAPE);
  // Gate fades out (0.55s); give it a beat before character entrance.
  await wait(800);
}
