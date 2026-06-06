// ============================================================
// 6月Demo · 文字层 + 弧 + 历史面板（无登录 / 无上滑推进 / 无多 tab）
// 沿用 june-design-test.html 的 text 模式机制，整体始终运行在文字层循环中。
// ============================================================

// ---- 顶层状态（所有函数闭包共用，须先声明） ----
let state = 'text-playing', stateT = 0;
let pendingTimers = [];
let _textTimers = [];
let _pauseAfterCurrent = false;
let _pendingNextStep = null;
let _frozenState = null;
let down = null, longPressTimer = null, pressing = false;
let arcEnterAccel = false, arcEnterAccelStart = 0;
let rippleTimer = 0;
const ripples = [];
let lastT = 0;
let draftText = '';
let hasDraft = false;
let anchorEverClicked = false;
let typingFocusedAt = 0;
let _activeNarration = null;
let _charStack = [];
let charTurnIdx = 0;
let W, H, dpr;

// ============================================================
// DOM 引用
// ============================================================
const phone = document.getElementById('phone');
const cMain = document.getElementById('c');
const cGlow = document.getElementById('c-glow');
const ctxM = cMain.getContext('2d');
const ctxG = cGlow.getContext('2d');
const sceneBg = document.querySelector('.scene-bg');
const characterEl = document.querySelector('.character');
const narrationZone = document.getElementById('narration-zone');
const bubbleZone = document.getElementById('bubble-zone');
const historyPanel = document.getElementById('history-panel');
const historyDim = document.getElementById('history-dim');
const historyHint = document.getElementById('history-hint');
const historyScroll = document.getElementById('history-scroll');
const historyAnchor = document.getElementById('history-anchor');
const typingLayer = document.getElementById('typing-layer');
const typingInput = document.getElementById('typing-input');
const typingSend = document.getElementById('typing-send');
const stageEl = document.getElementById('stage');

// ============================================================
// 控制菜单（左侧 nav-panel）—— 留出占位结构，后续控制项往这里塞
// 改菜单：动这个数组。type 取值：l1 / l2 / hint / divider / action / toggle。
// ============================================================
const NAV_ITEMS = [
  { type: 'l1', label: '6月 Demo' },
  { type: 'hint', label: '文字层 · 弧 · 历史' },
  { type: 'divider' },
  { type: 'l1', label: '控制菜单' },
  { type: 'hint', label: '（控制项待加入）' },
  { type: 'divider' },
  { type: 'action', action: 'reset', label: '重置' },
];

function renderNav(container) {
  container.innerHTML = NAV_ITEMS.map(it => {
    if (it.type === 'l1')      return `<div class="nav-l1">${it.label}</div>`;
    if (it.type === 'l2')      return `<div class="nav-l2">${it.label}</div>`;
    if (it.type === 'hint')    return `<div class="nav-hint">${it.label}</div>`;
    if (it.type === 'divider') return `<div class="nav-divider"></div>`;
    if (it.type === 'action')  return `<div class="nav-action" data-action="${it.action}">${it.label}</div>`;
    if (it.type === 'toggle') {
      const onCls = it.on ? ' on' : '';
      return `<div class="nav-toggle${onCls}" data-toggle="${it.key}"><span>${it.label}</span><span class="toggle-dot"></span></div>`;
    }
    return '';
  }).join('');
}
renderNav(document.getElementById('drawer-nav'));
renderNav(document.getElementById('desktop-nav'));

// ============================================================
// 历史剧情渲染
// ============================================================
function renderHistory(container) {
  container.innerHTML = HISTORY_SCRIPT.map(e => {
    if (e.type === 'narration') {
      const isAction = e.text.trim().startsWith('（');
      const cls = 'history-entry h-narration' + (isAction ? ' h-narration-action' : '');
      return `<div class="${cls}">${e.text}</div>`;
    }
    const speakerCls = e.speaker === 'you' ? 'h-speaker-you' : 'h-speaker-him';
    const speakerLabel = e.speaker === 'you' ? '你' : '他';
    return `<div class="history-entry h-dialogue ${speakerCls}"><div class="h-speaker">${speakerLabel}：</div><div class="h-dialogue-text">${e.text}</div></div>`;
  }).join('');
}
renderHistory(historyScroll);

// ============================================================
// 抽屉菜单（移动端）
// ============================================================
const menuToggle = document.getElementById('menu-toggle');
const drawer = document.getElementById('drawer');
const backdrop = document.getElementById('drawer-backdrop');
function openDrawer() { drawer.classList.add('open'); backdrop.classList.add('visible'); menuToggle.classList.add('open'); }
function closeDrawer() { drawer.classList.remove('open'); backdrop.classList.remove('visible'); menuToggle.classList.remove('open'); }
menuToggle.addEventListener('click', () => { drawer.classList.contains('open') ? closeDrawer() : openDrawer(); });
backdrop.addEventListener('click', closeDrawer);

// ============================================================
// 参数 & 视口缩放
// ============================================================
const P = {
  radiusVW: 120,
  arcPeekVH: 16, strokeWidth: 3, arcBreathAmp: 2.75, arcBreathPeriod: 4.2,
  glowBlur: 14,
};

// 等比缩放基准：iPhone 14 标准设计稿高度。所有 CSS/JS 里的 px 都按 (H/BASE_H) 缩放。
const BASE_H = 844;
function resize() {
  dpr = window.devicePixelRatio || 1;
  W = phone.clientWidth; H = phone.clientHeight;
  for (const cv of [cMain, cGlow]) {
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  // 桌面 95vh ≈ 1026px → u ≈ 1.215；iPhone 14 真机 844px → u = 1。
  phone.style.setProperty('--u', (H / BASE_H) + 'px');
}
window.addEventListener('resize', resize); resize();
function vw(n) { return n * W / 100; }
function vh(n) { return n * H / 100; }
function u(n)  { return n * H / BASE_H; }

// ---- 真实系统键盘适配：visualViewport 抢走的高度写到 --kb-inset，输入框 bottom 自动抬起 ----
function updateKbInset() {
  const vv = window.visualViewport;
  let inset = 0;
  if (vv) inset = Math.max(0, window.innerHeight - vv.height);
  document.documentElement.style.setProperty('--kb-inset', inset + 'px');
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateKbInset);
  window.visualViewport.addEventListener('scroll', updateKbInset);
}
window.addEventListener('resize', updateKbInset);
updateKbInset();

// ============================================================
// 统一 timer 管理
// ============================================================
function scheduleGo(s, delay) {
  const id = setTimeout(() => {
    pendingTimers = pendingTimers.filter(t => t !== id);
    go(s);
  }, delay);
  pendingTimers.push(id);
}
function clearAllTimers() {
  pendingTimers.forEach(id => clearTimeout(id));
  pendingTimers = [];
}

// ---- 手势状态清理 ----
function resetGesture() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  pressing = false; down = null; arcEnterAccel = false;
}

// ============================================================
// 历史面板
// ============================================================
// 圆形剪裁：用 clip-path 而非 mask，几何切，圆外点击穿透到 dim/stage 触发关闭。
function setMask(el, r, cx, cy /*, fade */) {
  const clip = r <= 0 ? 'circle(0)' : `circle(${r}px at ${cx}px ${cy}px)`;
  el.style.clipPath = clip;
  el.style.webkitClipPath = clip;
}
function clearMask(el) {
  el.style.clipPath = '';
  el.style.webkitClipPath = '';
}

function showHistoryPanel() {
  historyDim.style.display = 'block';
  void historyDim.offsetWidth;
  historyDim.style.opacity = '1';
  historyPanel.style.display = 'block';
  historyPanel.style.opacity = '1';
  historyPanel.style.pointerEvents = 'none';
  setMask(historyPanel, 0, 0, 0, 0);
  historyScroll.scrollTop = historyScroll.scrollHeight;
  historyAnchor.classList.add('panel-open');
  historyHint.classList.add('visible');
}
function hideHistoryPanel() {
  historyPanel.style.opacity = '0';
  historyPanel.style.pointerEvents = 'none';
  clearMask(historyPanel);
  historyPanel.style.display = 'none';
  historyDim.style.opacity = '0';
  historyDim.style.display = 'none';
  historyHint.classList.remove('visible');
  historyAnchor.classList.remove('panel-open');
  thawMainStage();
}

// 历史面板打开时：不打断当前正在播的内容，但藏掉视觉层；同时暂存"下一步"
function maybeRunOrPause(fn) {
  if (_pauseAfterCurrent) { _pendingNextStep = fn; }
  else { fn(); }
}

function freezeMainStage() {
  if (!state.startsWith('history')) _frozenState = { s: state, t: stateT };
  // 杀状态机的待办；但**不杀**文字层 tSet 计时器——让当前正在打字/淡入的动画自然播完
  clearAllTimers();
  resetGesture();
  if (state === 'arc-record') restoreDimmedText();
  _pauseAfterCurrent = true;
  stageEl.classList.add('main-stage-frozen');
}

function thawMainStage() {
  stageEl.classList.remove('main-stage-frozen');
  _pauseAfterCurrent = false;
  if (_frozenState) {
    state = _frozenState.s; stateT = _frozenState.t; _frozenState = null;
  }
  if (_pendingNextStep) {
    const fn = _pendingNextStep; _pendingNextStep = null;
    fn();
  } else {
    if (state === 'arc-enter') scheduleGo('arc-invite', 1000);
  }
}

// 锚点：在主屏上叠加覆盖层
function openOverlay() {
  freezeMainStage();
  showHistoryPanel();
  go('history-enter');
  scheduleGo('history-idle', 550);
}

// 统一关闭路径
function closeHistoryWithAnim() {
  clearAllTimers();
  resetGesture();
  historyPanel.style.pointerEvents = 'none';
  historyAnchor.classList.remove('panel-open');
  historyHint.classList.remove('visible');
  historyDim.style.opacity = '0';
  // 视觉解冻提前到点关闭瞬间：text/bubble 的 0.25s 淡入跟弧形收回(400ms)平行跑
  stageEl.classList.remove('main-stage-frozen');
  go('history-exit');
  scheduleGo('_exit-done', 400);
}

function _onExitDone() {
  hideHistoryPanel();
}

// ---- 动画打断：从当前进度平滑反转 ----
function getHistoryVisualProgress() {
  const elapsed = (performance.now() - stateT) / 1000;
  if (state === 'history-enter') return 1 - Math.pow(1 - Math.min(1, elapsed / 0.5), 2.5);
  if (state === 'history-exit')  return Math.pow(1 - Math.min(1, elapsed / 0.35), 2);
  return state === 'history-idle' ? 1 : 0;
}

function interruptToClose() {
  const vp = getHistoryVisualProgress();
  clearAllTimers();
  resetGesture();
  historyPanel.style.pointerEvents = 'none';
  historyAnchor.classList.remove('panel-open');
  historyHint.classList.remove('visible');
  historyDim.style.opacity = '0';
  stageEl.classList.remove('main-stage-frozen');

  const exitDur = 0.35;
  const t_exit = 1 - Math.sqrt(Math.max(0.001, vp));
  state = 'history-exit';
  stateT = performance.now() - t_exit * exitDur * 1000;
  rippleTimer = 0;
  scheduleGo('_exit-done', Math.max(50, (1 - t_exit) * exitDur * 1000 + 50));
}

function interruptToOpen() {
  const vp = getHistoryVisualProgress();
  clearAllTimers();
  resetGesture();
  showHistoryPanel();

  const enterDur = 0.5;
  const t_enter = 1 - Math.pow(Math.max(0.001, 1 - vp), 0.4);
  state = 'history-enter';
  stateT = performance.now() - t_enter * enterDur * 1000;
  rippleTimer = 0;
  scheduleGo('history-idle', Math.max(50, (1 - t_enter) * enterDur * 1000 + 50));
}

// ---- 控制菜单：重置 ----
function resetDemo() {
  draftText = ''; hasDraft = false;
  anchorEverClicked = false;
  if (typingLayer.classList.contains('entered')) hideTypingUI();
}
document.querySelectorAll('[data-action="reset"]').forEach(el => {
  el.addEventListener('click', resetDemo);
});

// ---- 文字层锚点提示：交互后弹一下，首次点过锚点后不再触发 ----
function pulseHistoryAnchor() {
  if (anchorEverClicked) return;
  historyAnchor.classList.remove('hint-pulse');
  void historyAnchor.offsetWidth;
  historyAnchor.classList.add('hint-pulse');
}
historyAnchor.addEventListener('animationend', (e) => {
  if (e.animationName === 'anchorHintPulse') historyAnchor.classList.remove('hint-pulse');
});

// 左上角锚点：切换历史面板
historyAnchor.addEventListener('click', (e) => {
  e.stopPropagation();
  anchorEverClicked = true;
  historyAnchor.classList.remove('hint-pulse');
  if (state === 'history-enter') { interruptToClose(); return; }
  if (state === 'history-exit')  { interruptToOpen(); return; }
  const panelVisible = state === 'history-idle';
  if (panelVisible) closeHistoryWithAnim();
  else openOverlay();
});

// 点击面板外区域收起
stageEl.addEventListener('click', (e) => {
  // Android Chrome 兜底：短按弧底后 pointerup 阶段 focus() 没弹起键盘的情况下，
  // click 事件比 pointerup 在 Android 上更"重"，再补一次 focus() 通常能把键盘叫出来。
  if ((state === 'arc-typing-enter' || state === 'arc-typing')
      && !e.target.closest('.typing-input') && !e.target.closest('.typing-send')) {
    if (document.activeElement !== typingInput) {
      try { typingInput.focus(); } catch (_) {}
    }
    return;
  }
  if (e.target.closest('.history-anchor')) return;
  if (state === 'history-enter') {
    if (e.target.closest('.history-panel')) return;
    interruptToClose(); return;
  }
  if (state === 'history-exit') return;
  if (state !== 'history-idle') return;
  if (e.target.closest('.history-panel')) return;
  closeHistoryWithAnim();
});

// ============================================================
// 文字层 ⑨ — 旁白 / 角色动作 / 角色气泡 / 用户气泡
// 机制移植自根目录 js/paragraph.js（暖白语言 + 去控件化）
// ============================================================
const TYPING_DIALOGUE = 55;     // 气泡逐字 ms/字
const TOKEN_CHUNK_GAP = 240;    // 旁白相邻 chunk 启动间隔
const TOKEN_CHUNK_JITTER = 0.2;
const TOKEN_LINE_PAUSE = 180;
const TOKEN_FADE_MS = 700;

const TRAILING_PUNCT = new Set(["。","，","、","；","：","？","！","…","“","”","‘","’",")","）","」","』","】","—","—",".",",","?","!",";",":"]);

function tSet(fn, delay) { const id = setTimeout(() => { _textTimers = _textTimers.filter(t => t !== id); fn(); }, delay); _textTimers.push(id); return id; }
function clearTextTimers() { _textTimers.forEach(id => clearTimeout(id)); _textTimers = []; }
function rafP() { return new Promise(r => requestAnimationFrame(() => r())); }
function waitP(ms) { return new Promise(r => tSet(r, ms)); }

// 气泡逐字打字机
function startTyper(node, text, perChar) {
  return new Promise((resolve) => {
    const chars = Array.from(text); let i = 0;
    const step = () => {
      if (i < chars.length) { node.textContent = chars.slice(0, i + 1).join(''); i++; tSet(step, perChar); }
      else resolve();
    };
    tSet(step, 30);
  });
}

// 旁白：2-3 字逐块浮现
function sliceForReveal(text) {
  const chars = Array.from(text); const total = chars.length; const slices = []; let i = 0;
  while (i < total) {
    const want = Math.random() < 0.45 ? 2 : 3;
    let end = Math.min(total, i + want);
    while (end < total && TRAILING_PUNCT.has(chars[end])) end++;
    slices.push(chars.slice(i, end).join('')); i = end;
  }
  return slices;
}

async function startTokenReveal(node, text) {
  node.classList.add('line-banner');
  node.style.setProperty('--banner-h', '0px');
  node.textContent = '';
  const slices = sliceForReveal(text);
  if (!slices.length) return;
  return new Promise((resolve) => {
    let k = 0, prevTop = null;
    const step = () => {
      if (k >= slices.length) { tSet(resolve, TOKEN_FADE_MS); return; }
      const slice = slices[k++];
      const span = document.createElement('span');
      span.className = 'gen-chunk reveal';
      span.textContent = slice;
      node.appendChild(span);
      const top = span.offsetTop;
      let delay = TOKEN_CHUNK_GAP * (1 + (Math.random() * 2 - 1) * TOKEN_CHUNK_JITTER);
      if (prevTop !== null && Math.abs(top - prevTop) > 2) delay += TOKEN_LINE_PAUSE;
      prevTop = top;
      // banner 跟着当前内容高度同步
      node.style.setProperty('--banner-h', `${node.offsetHeight + u(40)}px`);
      tSet(step, delay);
    };
    step();
  });
}

function driftAway(node, dur = 1000) {
  return new Promise((resolve) => {
    if (dur !== 1000) node.style.animationDuration = dur + 'ms';
    node.classList.add('drifting');
    tSet(() => { if (node.parentNode) node.parentNode.removeChild(node); resolve(); }, dur);
  });
}

// 旁白：暖白；块位置由 narration-zone 居中锚住，打字机一段段浮现
async function showNarration(text, opts = {}) {
  if (_activeNarration && _activeNarration.parentNode) {
    const prev = _activeNarration; _activeNarration = null; driftAway(prev);
  }
  const node = document.createElement('div');
  node.className = 'narration' + (opts.cls ? ' ' + opts.cls : '');
  narrationZone.appendChild(node); _activeNarration = node;
  await rafP(); node.classList.add('visible');
  await startTokenReveal(node, text);
}

// 角色动作：月白色 + 全角括号包裹
async function showAction(text) {
  return showNarration('（' + text + '）', { cls: 'narration-action' });
}

// ② 一句一气泡：同区任意时刻最多一条用户气泡
const BUBBLE_HOLD = 1200;

// 用户气泡：从底部回响弧位置升起到驻留位
async function showUserBubble(text) {
  const node = document.createElement('div'); node.className = 'bubble bubble-user';
  node.style.left = '50%';
  node.style.bottom = '28%';
  node.style.transform = `translateX(-50%) translateY(${u(28)}px)`;
  bubbleZone.appendChild(node);
  await rafP();
  node.classList.add('visible');
  node.style.transform = 'translateX(-50%) translateY(0)';
  await startTyper(node, text, TYPING_DIALOGUE);
  return node;
}

// 角色气泡：压栈式累积，新条出现在锚点，旧条上移 + 透明度衰减一档；不再自动 drift
const CHAR_PAD_OVERLAP = 10;         // 新旧气泡 padding 区允许重叠的像素
const CHAR_OPACITY_STEP = 0.35;      // 每多一条新气泡，旧气泡透明度衰减一档
const CHAR_OPACITY_FLOOR = 0.2;      // 旧气泡透明度地板

async function showCharBubble(text, topPct) {
  const node = document.createElement('div'); node.className = 'bubble bubble-char';
  node.style.left = '50%';
  node.style.top = `${topPct}%`;
  node.style.zIndex = String(5 + _charStack.length);
  bubbleZone.appendChild(node);
  await rafP();

  // 位移基准：栈顶旧气泡的真实高度
  const recentOld = _charStack[_charStack.length - 1];
  const recentH = recentOld ? recentOld.offsetHeight : 0;
  const shift = recentH ? (recentH - u(CHAR_PAD_OVERLAP)) : 0;
  for (let i = 0; i < _charStack.length; i++) {
    const prev = _charStack[i];
    const cur = parseFloat(prev.dataset.stackShift || '0');
    prev.dataset.stackShift = String(cur - shift);
    prev.style.setProperty('--stack-shift', `${cur - shift}px`);
    const step = (_charStack.length - i);
    const newOp = Math.max(CHAR_OPACITY_FLOOR, 1 - step * CHAR_OPACITY_STEP);
    prev.style.opacity = String(newOp);
  }

  _charStack.push(node);
  node.classList.add('visible');
  // 下一帧再加 settled，触发 --enter-y 从 28px 过渡到 0
  await rafP();
  node.classList.add('settled');

  await startTyper(node, text, TYPING_DIALOGUE);
  // 不再 driftAway —— 留存到下一次交互（driftDimmedText / clearAllText）清场
}

function clearAllText() {
  clearTextTimers();
  _activeNarration = null;
  _charStack = [];
  [narrationZone, bubbleZone].forEach((z) => { if (z) z.innerHTML = ''; });
}

// 进打字态 / 长按语音：把旁白 + 角色气泡压暗一档
function dimTextForRecording() {
  if (_activeNarration) _activeNarration.classList.add('dimmed-for-recording');
  _charStack.forEach((c) => c.classList.add('dimmed-for-recording'));
}
// 取消：摘掉 dimmed 类，filter 经 base transition 自然回到 none
function restoreDimmedText() {
  if (_activeNarration) _activeNarration.classList.remove('dimmed-for-recording');
  _charStack.forEach((c) => c.classList.remove('dimmed-for-recording'));
}
// 发送（语音松手 / 打字提交）：旁白 + 角色气泡涟漪上飘（加速版 500ms），同时清引用
function driftDimmedText(dur = 500) {
  if (_activeNarration) {
    driftAway(_activeNarration, dur);
    _activeNarration = null;
  }
  _charStack.forEach((c) => driftAway(c, dur));
  _charStack = [];
}

// ============================================================
// 文字层两轮循环
// ============================================================
// 角色发起：动作 + N 条气泡，按 charTurnIdx 取脚本；播完落到 arc-invite 让用户长按回复
async function runCharTurn() {
  go('text-playing');  // 屏蔽 arc 手势，避免角色独白期间被打断
  const turn = TEXT_SCRIPT.charTurns[charTurnIdx];
  if (!turn) return;
  await showAction(turn.action);
  await waitP(800);
  for (let i = 0; i < turn.replies.length; i++) {
    if (i > 0) await waitP(BUBBLE_HOLD);
    await showCharBubble(turn.replies[i], 26);
  }
  await waitP(400);
  maybeRunOrPause(() => { go('arc-enter'); scheduleGo('arc-invite', 1000); });
}

// 用户气泡发完之后推进下一轮：模运算 wrap，两轮无限循环
function advanceToNextRound() {
  charTurnIdx = (charTurnIdx + 1) % TEXT_SCRIPT.charTurns.length;
  maybeRunOrPause(() => runCharTurn());
}

// 用户长按松手回路：旧旁白+角色气泡涟漪上飘 → 半程交叠时用户气泡升起 → 用户气泡 drift 收尾 → 下一轮
async function runTextDialogue() {
  const userReply = TEXT_SCRIPT.userReplies[charTurnIdx] || '……';
  driftDimmedText(500);
  await waitP(250);
  const userNode = await showUserBubble(userReply);
  tSet(() => driftAway(userNode, 700), 600);
  await waitP(1200);
  advanceToNextRound();
}

// ============================================================
// 状态机
// ============================================================
function go(s) {
  if (s === '_exit-done') { _onExitDone(); return; }

  state = s; stateT = performance.now(); rippleTimer = 0;

  if (s === 'arc-record') dimTextForRecording();

  if (s === 'history-idle') {
    const _r = vw(P.radiusVW);
    setMask(historyPanel, _r - u(7), W / 2, (H * 2 / 3 - _r + u(120)), 10);
    historyPanel.style.pointerEvents = 'auto';
  }
}

// ============================================================
// 打字层（短按弧→输入条→发送→气泡；外侧点击退出留草稿光点）
// ============================================================
function updateSendActive() {
  if (typingInput.value.trim().length > 0) typingSend.classList.add('active');
  else typingSend.classList.remove('active');
}
typingInput.addEventListener('input', updateSendActive);

// Android Chrome 兜底：键盘开着时点 input 区域外，系统会"吃掉"这次点击关键盘，
// pointerdown 不会冒到 stage handler。用 focusout 作为"用户想退出打字态"的等价信号。
typingInput.addEventListener('focusout', (e) => {
  if (performance.now() - typingFocusedAt < 350) return;
  if (e.relatedTarget && typingLayer.contains(e.relatedTarget)) return;
  if (typingLayer.classList.contains('entered') &&
      (state === 'arc-typing' || state === 'arc-typing-enter')) {
    exitTypingToDraft();
  }
});

function showTypingUI() {
  // input 不能用 display:none 切显隐——iOS Safari 在刚 unhide 的 input 上 focus() 不弹键盘。
  // 始终在 layout 里，靠 .entered 控显隐 + 同步 focus()。
  typingInput.value = draftText || '';
  updateSendActive();
  // 关键顺序：先放开 pointer-events:none 再 focus()，否则 Android Chrome 认为 input 不可交互、跳过弹键盘
  typingLayer.classList.add('entered');
  typingFocusedAt = performance.now();
  try { typingInput.focus(); } catch (_) {}
  const len = typingInput.value.length;
  try { typingInput.setSelectionRange(len, len); } catch (_) {}
}

function hideTypingUI() {
  typingLayer.classList.remove('entered');
  try { typingInput.blur(); } catch (_) {}
}

function enterTypingMode() {
  clearAllTimers();
  resetGesture();
  // 进打字态把旁白 + 角色气泡压暗一档（保留可见，跟长按语音同款 dim）
  dimTextForRecording();
  showTypingUI();
  go('arc-typing-enter');
  scheduleGo('arc-typing', 280);
}

function exitTypingToDraft() {
  draftText = typingInput.value;
  hasDraft = draftText.trim().length > 0;
  hideTypingUI();
  // 中途取消回到回响弧：旁白 + 角色气泡复原到正常亮度
  restoreDimmedText();
  go('arc-typing-exit');
  scheduleGo('arc-invite', 450);
}

async function sendTyping() {
  const text = typingInput.value.trim();
  if (!text) return;
  draftText = '';
  hasDraft = false;
  typingInput.value = '';
  updateSendActive();
  hideTypingUI();
  go('arc-typing-exit');
  scheduleGo('arc-invite', 450);
  pulseHistoryAnchor();
  // 跟长按语音同节奏：旧旁白+角色气泡 500ms 涟漪上飘 → 半程交叠用户气泡升起 → hold + drift 收尾
  driftDimmedText(500);
  await waitP(250);
  const node = await showUserBubble(text);
  await waitP(BUBBLE_HOLD);
  await driftAway(node);
  advanceToNextRound();
}

typingSend.addEventListener('click', (e) => { e.stopPropagation(); sendTyping(); });
typingInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); sendTyping(); }
  else if (e.key === 'Escape') { e.preventDefault(); exitTypingToDraft(); }
});

// ============================================================
// 手势
// ============================================================
document.addEventListener('contextmenu', e => e.preventDefault());
function getLocalY(e) { return e.clientY - phone.getBoundingClientRect().top; }
function getLocalX(e) { return e.clientX - phone.getBoundingClientRect().left; }

// 录音最短时长：进 arc-record 后至少保持这么久，否则视为"没录上内容"回到 arc-invite
const ARC_RECORD_MIN_MS = 700;
function abortRecording() {
  restoreDimmedText();
  go('arc-invite');
}

stageEl.addEventListener('pointerdown', (e) => {
  if (state.startsWith('history')) return;
  if (e.target.closest('.history-anchor')) return;
  // 打字态下：点输入框/发送按钮交由其自处理；点其它任何区域 → 退到草稿态
  if (state === 'arc-typing' || state === 'arc-typing-enter') {
    if (e.target.closest('.typing-input') || e.target.closest('.typing-send')) return;
    exitTypingToDraft();
    return;
  }
  if (e.target.closest('.typing-input') || e.target.closest('.typing-send')) return;
  const ly = getLocalY(e), lx = getLocalX(e);
  down = { x: lx, y: ly, t: performance.now() };
  if (state === 'arc-invite' || state === 'arc-enter') {
    if (ly < H * 2 / 3) return;
    pressing = true;
    if (state === 'arc-enter') {
      clearAllTimers();
      arcEnterAccel = true;
      arcEnterAccelStart = Math.min(1, (performance.now() - stateT) / 1000);
    }
    longPressTimer = setTimeout(() => { if (pressing) { arcEnterAccel = false; go('arc-record'); rippleTimer = 400; } }, 250);
  }
});

stageEl.addEventListener('pointerup', (e) => {
  if (!down || state.startsWith('history')) { down = null; pressing = false; return; }
  const ly = getLocalY(e), dy = ly - down.y, dt = performance.now() - down.t;
  if (state === 'arc-record') {
    const recordDur = performance.now() - stateT;
    if (recordDur < ARC_RECORD_MIN_MS) {
      // 录音时长不足：视为没录上内容，回 arc-invite 并恢复描述+角色气泡
      abortRecording();
    } else {
      go('arc-close');
      runTextDialogue();
      pulseHistoryAnchor();
    }
  } else if ((state === 'arc-invite' || state === 'arc-enter') && pressing) {
    // 短按（250ms 内松手，位移很小）→ 进打字态
    const movedSq = (getLocalX(e) - down.x) ** 2 + (ly - down.y) ** 2;
    if (dt < 250 && movedSq < 64) {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      pressing = false; down = null;
      enterTypingMode();
      return;
    }
  }
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  pressing = false; down = null;
});
stageEl.addEventListener('pointercancel', () => {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  pressing = false; down = null;
  // 录音中途被打断（如系统手势接管）→ 回 arc-invite 并恢复描述+角色气泡
  if (state === 'arc-record') abortRecording();
});

// ============================================================
// 绘制
// ============================================================

// 弧顶角度（回响弧用）
function arcAngles(cx, cy, r) {
  const m = vw(20);
  const a0 = Math.asin(Math.max(-1, Math.min(1, (cx-(W+m))/r)));
  const a1 = Math.asin(Math.max(-1, Math.min(1, (cx-(-m))/r)));
  return { s: -Math.PI/2+a0, e: -Math.PI/2+a1 };
}

// 弧底角度（历史面板用：向下凸的弧）
function arcAnglesDown(cx, cy, r) {
  const m = vw(20);
  const cosR = Math.max(-1, Math.min(1, (W + m - cx) / r));
  const cosL = Math.max(-1, Math.min(1, (-m - cx) / r));
  return { s: Math.acos(cosR), e: Math.acos(cosL) };
}

function drawStroke(cx, cy, r, sw, alpha, glowAlpha) {
  const { s, e } = arcAngles(cx, cy, r);
  if (alpha > 0.005) {
    ctxM.save(); ctxM.scale(dpr, dpr);
    ctxM.beginPath(); ctxM.arc(cx, cy, r, s, e);
    ctxM.strokeStyle = `rgba(255,235,210,${alpha})`; ctxM.lineWidth = u(sw); ctxM.lineCap = 'round'; ctxM.stroke();
    ctxM.restore();
  }
  if (glowAlpha > 0.005) {
    ctxG.save(); ctxG.scale(dpr, dpr);
    ctxG.beginPath(); ctxG.arc(cx, cy, r, s, e);
    ctxG.strokeStyle = `rgba(255,235,210,${glowAlpha})`; ctxG.lineWidth = u(sw + 6); ctxG.lineCap = 'round'; ctxG.stroke();
    ctxG.restore();
  }
}

// ---- 历史面板：向下凸弧，圆心在弧线上方 ----
function drawHistoryPanelFill(cx, cy, r, alpha) {
  if (alpha < 0.005) return;
  const { s, e } = arcAnglesDown(cx, cy, r);

  // 遮罩：压暗整个舞台
  ctxM.save(); ctxM.scale(dpr, dpr);
  ctxM.fillStyle = `rgba(7,8,17,${alpha * 0.55})`;
  ctxM.fillRect(0, 0, W, H);
  ctxM.restore();

  // 面板填充：弧以上区域
  ctxM.save(); ctxM.scale(dpr, dpr);
  ctxM.beginPath();
  ctxM.moveTo(-40, -40);
  ctxM.lineTo(W + 40, -40);
  ctxM.lineTo(cx + r * Math.cos(s), cy + r * Math.sin(s));
  ctxM.arc(cx, cy, r, s, e);
  ctxM.closePath();
  ctxM.fillStyle = `rgba(22, 20, 16, ${alpha})`;
  ctxM.fill();
  ctxM.restore();

  // 弧底边描边
  ctxM.save(); ctxM.scale(dpr, dpr);
  ctxM.beginPath(); ctxM.arc(cx, cy, r, s, e);
  ctxM.strokeStyle = `rgba(255,235,210,${alpha * 0.2})`; ctxM.lineWidth = 1; ctxM.stroke();
  ctxM.restore();

  // 弧光晕
  if (alpha > 0.1) {
    ctxG.save(); ctxG.scale(dpr, dpr);
    ctxG.beginPath(); ctxG.arc(cx, cy, r, s, e);
    ctxG.strokeStyle = `rgba(255,235,210,${alpha * 0.08})`; ctxG.lineWidth = u(8); ctxG.stroke();
    ctxG.restore();
  }
}

function spawnRipple(cx, cy, r) { ripples.push({ cx, cy, r, t: 0 }); }
function tickRipples(dt) {
  if (!ripples.length) return;
  ctxM.save(); ctxM.scale(dpr, dpr);
  for (let i = ripples.length-1; i >= 0; i--) {
    const rp = ripples[i]; rp.t += dt;
    if (rp.t > 1800) { ripples.splice(i,1); continue; }
    const p = rp.t/1800, a = (1-p)*0.55;
    ctxM.beginPath(); ctxM.arc(rp.cx, rp.cy - p*vh(22), rp.r + p*vh(4),
      ...Object.values(arcAngles(rp.cx, rp.cy - p*vh(22), rp.r + p*vh(4))));
    ctxM.strokeStyle = `rgba(255,235,210,${a})`; ctxM.lineWidth = u(1.5); ctxM.stroke();
  }
  ctxM.restore();
}

// ============================================================
// 动画主循环
// ============================================================
function tick(now) {
  const dt = lastT ? Math.min(50, now-lastT) : 16; lastT = now;
  ctxM.clearRect(0, 0, cMain.width, cMain.height);
  ctxG.clearRect(0, 0, cGlow.width, cGlow.height);
  cGlow.style.filter = `blur(${u(P.glowBlur)}px)`;

  const r = vw(P.radiusVW), cx = W/2;
  const elapsed = (now - stateT) / 1000;

  // ---- 文字层独白期间（text-playing）：canvas 不画弧，留干净屏面给旁白/气泡 ----
  if (state === 'text-playing') {
    // 不画任何东西
  }

  // ---- 回响弧 ----
  else if (state === 'arc-enter') {
    const toCy = H + r - vh(P.arcPeekVH), fromCy = toCy + vh(5);
    let t;
    if (arcEnterAccel) { const ae = elapsed - arcEnterAccelStart; t = Math.min(1, arcEnterAccelStart + (1-arcEnterAccelStart)*Math.min(1, ae/0.15)); }
    else t = Math.min(1, elapsed / 1.0);
    const e = 1 - Math.pow(1-t, 2.5), cy = fromCy + (toCy-fromCy)*e;
    drawStroke(cx, cy, r, P.strokeWidth, 0.7 * e, 0.15 * e);
  }
  else if (state === 'arc-invite') {
    const baseCy = H + r - vh(P.arcPeekVH), b = Math.sin(elapsed / P.arcBreathPeriod * Math.PI*2);
    drawStroke(cx, baseCy - vh(P.arcBreathAmp)*b*0.5, r, P.strokeWidth, 0.7 + 0.2*b, 0.15+0.1*b);
  }
  else if (state === 'arc-record') {
    const baseCy = H + r - vh(P.arcPeekVH), t = Math.min(1, elapsed / 0.4), e = 1 - Math.pow(1-t, 3);
    drawStroke(cx, baseCy - vh(6)*e, r, P.strokeWidth*1.4, 0.95, 0.15+0.85*e);
    rippleTimer += dt;
    if (rippleTimer > 600) { rippleTimer = 0; spawnRipple(cx, baseCy - vh(6)*e, r); }
  }
  else if (state === 'arc-close') {
    const raisedCy = H + r - vh(P.arcPeekVH) - vh(6), restCy = H + r - vh(P.arcPeekVH);
    const t = Math.min(1, elapsed / 0.45), e = 1 - Math.pow(1-t, 2), cy = raisedCy + (restCy-raisedCy)*e;
    let ga = 0; if (elapsed < 0.35) ga = 0.6 * Math.sin(elapsed/0.35*Math.PI);
    drawStroke(cx, cy, r, P.strokeWidth, 0.8*(1-e), ga);
  }

  // ---- 打字态：底部回响弧淡出/淡入 ----
  else if (state === 'arc-typing-enter') {
    const baseCy = H + r - vh(P.arcPeekVH);
    const t = Math.min(1, elapsed / 0.28), e = 1 - Math.pow(1 - t, 3);
    drawStroke(cx, baseCy, r, P.strokeWidth, 0.85 * (1 - e), 0.15 * (1 - e));
  }
  else if (state === 'arc-typing') {
    // 稳态：弧已隐去，画面只剩 DOM 元素（输入框 / 发送按钮）
  }
  else if (state === 'arc-typing-exit') {
    const baseCy = H + r - vh(P.arcPeekVH);
    const t = Math.min(1, elapsed / 0.45), e = 1 - Math.pow(1 - t, 3);
    drawStroke(cx, baseCy, r, P.strokeWidth, 0.85 * e, 0.15 * e);
  }

  // ---- 历史面板（圆心在弧线上方，弧向下凸） ----
  else if (state === 'history-enter') {
    const dur = 0.5, t = Math.min(1, elapsed / dur), ease = 1 - Math.pow(1-t, 2.5);

    const endCx = W / 2;
    const endCy = (H * 2 / 3 - r + u(120));
    const startCx = W * 0.15;
    const startCy = -(r * 1.1);

    const aCx = startCx + (endCx - startCx) * ease;
    const aCy = startCy + (endCy - startCy) * ease;

    drawHistoryPanelFill(aCx, aCy, r, ease * 0.97);

    const { s: ds, e: de } = arcAnglesDown(aCx, aCy, r);
    ctxM.save(); ctxM.scale(dpr, dpr);
    ctxM.beginPath(); ctxM.arc(aCx, aCy, r, ds, de);
    ctxM.strokeStyle = `rgba(255,235,210,${ease * 0.55})`;
    ctxM.lineWidth = u(2); ctxM.stroke();
    ctxM.restore();
    ctxG.save(); ctxG.scale(dpr, dpr);
    ctxG.beginPath(); ctxG.arc(aCx, aCy, r, ds, de);
    ctxG.strokeStyle = `rgba(255,235,210,${ease * 0.25})`;
    ctxG.lineWidth = u(12); ctxG.stroke();
    ctxG.restore();

    // 文字跟随弧线落位
    setMask(historyPanel, r - u(7), aCx, aCy, 10);
  }
  else if (state === 'history-idle') {
    const endCy = (H * 2 / 3 - r + u(120));
    const b = Math.sin(elapsed / 6 * Math.PI * 2);
    drawHistoryPanelFill(W / 2, endCy, r, 0.97);

    const settle = Math.min(1, elapsed / 0.4);
    const sw = 2 - settle * 1;
    const sa = 0.55 - settle * (0.55 - 0.15) + 0.04 * b * settle;
    const ga = 0.25 * (1 - settle);

    const { s, e } = arcAnglesDown(W/2, endCy, r);
    ctxM.save(); ctxM.scale(dpr, dpr);
    ctxM.beginPath(); ctxM.arc(W/2, endCy, r, s, e);
    ctxM.strokeStyle = `rgba(255,235,210,${sa})`; ctxM.lineWidth = u(sw); ctxM.stroke();
    ctxM.restore();
    if (ga > 0.005) {
      ctxG.save(); ctxG.scale(dpr, dpr);
      ctxG.beginPath(); ctxG.arc(W/2, endCy, r, s, e);
      ctxG.strokeStyle = `rgba(255,235,210,${ga})`; ctxG.lineWidth = u(12); ctxG.stroke();
      ctxG.restore();
    }
  }
  else if (state === 'history-exit') {
    const dur = 0.35, t = Math.min(1, elapsed / dur), ease = 1 - Math.pow(1-t, 2);
    const progress = 1 - ease;

    const endCx = W / 2;
    const endCy = (H * 2 / 3 - r + u(120));
    const exitCx = W * 0.15;
    const exitCy = -(r * 1.1);

    const aCx = endCx + (exitCx - endCx) * ease;
    const aCy = endCy + (exitCy - endCy) * ease;

    drawHistoryPanelFill(aCx, aCy, r, progress * 0.97);

    const { s: ds, e: de } = arcAnglesDown(aCx, aCy, r);
    ctxM.save(); ctxM.scale(dpr, dpr);
    ctxM.beginPath(); ctxM.arc(aCx, aCy, r, ds, de);
    ctxM.strokeStyle = `rgba(255,235,210,${progress * 0.4})`;
    ctxM.lineWidth = u(2); ctxM.stroke();

    setMask(historyPanel, r - u(7), aCx, aCy, 10);
    ctxM.restore();
    ctxG.save(); ctxG.scale(dpr, dpr);
    ctxG.beginPath(); ctxG.arc(aCx, aCy, r, ds, de);
    ctxG.strokeStyle = `rgba(255,235,210,${progress * 0.15})`;
    ctxG.lineWidth = u(10); ctxG.stroke();
    ctxG.restore();
  }

  tickRipples(dt);
  requestAnimationFrame(tick);
}

// ============================================================
// 启动
// ============================================================
sceneBg.classList.add('visible');
characterEl.classList.add('visible');
requestAnimationFrame(tick);
runCharTurn();
