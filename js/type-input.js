// Typing input subsystem.
//
// 输入流的真理值是 typedText (JS 累加器), 隐藏 <input> 只是 IME 当前一段拼写
// 的暂存区 — 每次 compositionend / 非合成 input 把内容捞到 typedText 后立刻
// 清空 input.value. 这样绕开 Chrome IME 在合成提交瞬间把 selection 复位到
// 0,0 的 quirk(否则下一段拼写会被插到已有文字前面).
//
// 状态: INPUT (键盘弹出, 编辑中) ↔ SETTLED (键盘已收, 文字保留, 直线落回 12vh)
// 退出: sent (送出 preset) / cancelled (回 invitation) / longpress (转录音)
//
// keyboard offset 用 visualViewport 跟踪 + lastKeyboardOffset 缓存 +
// suppressShrinkUntil 600ms 抑制窗 — 重开键盘时预先把 type-area / arc-host
// 上推到上次的高度, 避开"键盘弹出过渡帧把 type-area 拉回 0 然后再爬上去"的
// 视觉抖动.

import { $, el } from './util.js';
import { setRingState, RING, getRingState, onRingStateChange } from './ring.js';
import { waitForRingLongPress, waitForRingTap, waitForRingRelease } from './input.js';
import { addJournalEntry } from './journal.js';

// Path morphing — INPUT/SETTLED 是直线, 其他都是弧. 主项目 SVG 里 path 写死
// 是弧线; 这里用 rAF 在两个 quadratic Bezier 之间插值, 让弧↔直线视觉转换
// 平滑. 数值跟主项目 index.html 里的 d="M 60 230 Q 500 30 940 230" 对齐.
const ARC_CURVE = 'M 60 230 Q 500 30 940 230';
// 直线 y≈200 落在 type-text 之下, 视觉上是"承接文字的底线".
// 关键: 控制点 y(195) 比端点 y(200) 故意偏 5 单位, 避免 bbox 高度退化为 0 —
// SVG <mask maskUnits="objectBoundingBox"> 拿不到非零高度时整个 mask 区域
// 变成 0 像素, 路径会被裁得完全透明(肉眼看不见). demo 里也是同样写法.
const ARC_LINE  = 'M 100 200 Q 500 195 900 200';
const PATH_MORPH_MS = 500;
let _pathAnimFrame = null;

function animatePath(targetD, duration) {
  const arcMain = document.querySelector('.edge-arc-main');
  if (!arcMain) return;
  if (_pathAnimFrame) cancelAnimationFrame(_pathAnimFrame);
  const startD = arcMain.getAttribute('d') || ARC_CURVE;
  const startVals = startD.match(/[\d.]+/g).map(Number);
  const endVals = targetD.match(/[\d.]+/g).map(Number);
  const ripples = document.querySelectorAll('.edge-ripple');
  const startTime = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const vals = startVals.map((s, i) => s + (endVals[i] - s) * e);
    const d = `M ${vals[0].toFixed(1)} ${vals[1].toFixed(1)} Q ${vals[2].toFixed(1)} ${vals[3].toFixed(1)} ${vals[4].toFixed(1)} ${vals[5].toFixed(1)}`;
    arcMain.setAttribute('d', d);
    ripples.forEach((r) => r.setAttribute('d', d));
    if (t < 1) _pathAnimFrame = requestAnimationFrame(tick);
    else _pathAnimFrame = null;
  }
  _pathAnimFrame = requestAnimationFrame(tick);
}

function isLineState(s) {
  return s === RING.INPUT || s === RING.SETTLED;
}

const FOCUS_DELAY_MS = 350;   // 等 state-input CSS 切到位再 focus, 减少抖动
const INPUT_GRACE_MS = 200;   // focus 后这一段忽略 IME 回填的脏字符
const BLUR_DEBOUNCE_MS = 300; // blur 后等这一段决定 settle / cancel
const KB_SUPPRESS_MS = 600;   // openTypeMode 后 600ms 内不允许键盘 offset 收缩

let _typeArea = null;
let _typeText = null;
let _sendBtn = null;
let _inputHost = null;
let _edgeZone = null;

let _typedText = '';
let _currentInput = null;
let _isComposing = false;
let _inputAccepting = false;
let _blurTimeout = null;

// keyboard offset
let _keyboardOffset = 0;
let _lastKeyboardOffset = 0;
let _suppressShrinkUntil = 0;

// Active session — set by enterTypingMode() while session is open
let _session = null;
// Active gesture race in waitForUserInput — exposed so forceCloseTypingSession
// can clean up _waiters when caller throws out mid-await (e.g., skip).
let _gestureAbort = null;

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function updateTypeText() {
  if (!_typeText) return;
  if (_typedText) {
    _typeText.innerHTML = escapeHtml(_typedText) + '<span class="caret"></span>';
  } else {
    _typeText.innerHTML = '<span class="caret"></span>';
  }
  if (_sendBtn) _sendBtn.disabled = !_typedText.trim();
}

// ---------------------------------------------------------------- hidden input
// 每次进入 typing 都创建新 input, 退出销毁 — 避免老 input 残留 IME 状态.

function createInput() {
  if (_currentInput) { _currentInput.blur(); _currentInput.remove(); }
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'hidden-input';
  inp.autocomplete = 'off';
  inp.autocapitalize = 'off';
  inp.setAttribute('autocorrect', 'off');
  inp.setAttribute('autocomplete', 'off');
  inp.setAttribute('spellcheck', 'false');
  _inputHost.appendChild(inp);
  inp.addEventListener('input', onInput);
  inp.addEventListener('keydown', onKeyDown);
  inp.addEventListener('blur', onBlur);
  inp.addEventListener('compositionstart', () => { _isComposing = true; });
  inp.addEventListener('compositionend', onCompositionEnd);
  _currentInput = inp;
  return inp;
}

function destroyInput() {
  if (_currentInput) {
    _currentInput.removeEventListener('input', onInput);
    _currentInput.removeEventListener('keydown', onKeyDown);
    _currentInput.removeEventListener('blur', onBlur);
    _currentInput.removeEventListener('compositionend', onCompositionEnd);
    // compositionstart 是匿名 lambda 没保 ref, 但下面 .remove() 会把元素整个
    // 从 DOM 移除, 所有监听都跟着挂.
    _currentInput.blur();
    _currentInput.remove();
    _currentInput = null;
  }
  _isComposing = false;
  _inputAccepting = false;
}

function onInput(e) {
  if (!_inputAccepting || _isComposing) return;
  if (_currentInput.value) {
    _typedText += _currentInput.value;
    _currentInput.value = '';
    updateTypeText();
  }
}

function onCompositionEnd(e) {
  _isComposing = false;
  if (!_inputAccepting) return;
  if (_currentInput.value) {
    _typedText += _currentInput.value;
    _currentInput.value = '';
  }
  updateTypeText();
}

function onKeyDown(e) {
  if (e.key === 'Enter' && !_isComposing) {
    e.preventDefault();
    if (_typedText.trim()) commitSend();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    commitCancel();
    return;
  }
  // input.value 永远是空, 所以 Backspace 必须从 typedText 里弹.
  if (e.key === 'Backspace' && !_isComposing && _currentInput.value === '' && _typedText.length > 0) {
    e.preventDefault();
    _typedText = _typedText.slice(0, -1);
    updateTypeText();
  }
}

function onBlur() {
  if (getRingState() !== RING.INPUT) return;
  // 不重置已挂的 timer — 多次 blur(键盘过渡 / focus jitter)会反复推后导致
  // timer 永不触发.
  if (_blurTimeout) return;
  _blurTimeout = setTimeout(() => {
    _blurTimeout = null;
    if (getRingState() !== RING.INPUT) return;
    if (!_typedText.trim()) commitCancel();
    else settleType();
  }, BLUR_DEBOUNCE_MS);
}

// ---------------------------------------------------------------- keyboard offset

// state-input 下 arc-host 的 CSS bottom = 26vh. 我们想让它的底边正好坐到
// 键盘顶部 (= keyboardOffset px 离视口底). 所以 transform 抬升量是
// keyboardOffset - 26vh, 不是 keyboardOffset 本身. 否则会把 arc-host 抬到
// keyboardOffset + 26vh 的高度, 反而离键盘顶部还有 26vh 的空白(type-area
// 也会跟着浮在屏幕高处, 不在键盘正上方).
const ARC_HOST_BASE_VH = 0.26;

function shiftForKeyboard() {
  return Math.max(0, _keyboardOffset - ARC_HOST_BASE_VH * window.innerHeight);
}

function applyKeyboardShift() {
  const shift = shiftForKeyboard();
  _typeArea.style.transform = `translateY(-${shift}px)`;
  const arcHost = $('#edge-arc-host');
  if (arcHost) arcHost.style.transform = `translateY(-${shift}px)`;
}

function adjustForKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  const newOffset = Math.max(0, window.innerHeight - vv.height);
  // 重开 typing 时 600ms 内忽略键盘弹出过渡的中间小值, 避免它们把预设的
  // transform 拉低再爬上去 — 视觉上是 type-area 跳一下.
  if (Date.now() < _suppressShrinkUntil && newOffset > 0 && newOffset < _keyboardOffset) {
    return;
  }
  const wasUp = _keyboardOffset > 0;
  _keyboardOffset = newOffset;
  if (_keyboardOffset > 0) _lastKeyboardOffset = _keyboardOffset;
  if (getRingState() === RING.INPUT) {
    applyKeyboardShift();
  }
  // 兜底: 某些平台收键盘不会 blur input, 主动触发 onBlur 流程.
  if (wasUp && newOffset === 0 && getRingState() === RING.INPUT) {
    onBlur();
  }
}

// ---------------------------------------------------------------- session control

function openKeyboard(keepText) {
  setRingState(RING.INPUT);
  if (!keepText) {
    _typedText = '';
  }
  updateTypeText();
  _typeArea.classList.add('visible');
  // 预设 transform — 第二次以后开 typing 时, type-area + arc-host 跟键盘同
  // 步上升, 不再"先到 32vh 再被键盘事件拉上去"的两段式抖动.
  if (_lastKeyboardOffset > 0) {
    _keyboardOffset = _lastKeyboardOffset;
    applyKeyboardShift();
    _suppressShrinkUntil = Date.now() + KB_SUPPRESS_MS;
  }
  _inputAccepting = false;
  _isComposing = false;
  createInput();
  setTimeout(() => {
    if (_currentInput) {
      _currentInput.value = '';
      _currentInput.focus();
    }
    setTimeout(() => {
      if (_currentInput) {
        _currentInput.value = '';
        _inputAccepting = true;
      }
      adjustForKeyboard();
    }, INPUT_GRACE_MS);
  }, FOCUS_DELAY_MS);
}

function closeKeyboardOnly() {
  // 只清键盘 / input, 不动 type-area visibility — 给 settle 用.
  if (_blurTimeout) { clearTimeout(_blurTimeout); _blurTimeout = null; }
  destroyInput();
  _typeArea.style.transform = '';
  const arcHost = $('#edge-arc-host');
  if (arcHost) arcHost.style.transform = '';
}

function fullClose() {
  // 整体收尾 — type-area 隐藏 + input 销毁 + transform 清.
  _typeArea.classList.remove('visible');
  if (_sendBtn) _sendBtn.disabled = true;
  closeKeyboardOnly();
  _typedText = '';
}

function settleType() {
  closeKeyboardOnly();
  setRingState(RING.SETTLED);
  // 进 settled 后, 用户可能 tap(回 typing) / longpress(转录音) / send → 由
  // _session 的 settled-watch loop 处理(见 enterTypingMode).
  if (_session) _session.onSettled();
}

function commitSend() {
  if (!_session) return;
  fullClose();
  _session.resolve({ kind: 'sent' });
  _session = null;
}

function commitCancel() {
  if (!_session) return;
  fullClose();
  _session.resolve({ kind: 'cancelled' });
  _session = null;
}

function commitLongpress(releasePromise) {
  if (!_session) return;
  fullClose();
  _session.resolve({ kind: 'longpress', releasePromise });
  _session = null;
}

// 在 settled 态等用户的下一动作: tap(回 typing) / longpress(转录音).
// send 按钮点击是同步的, 不在这条 race 里.
async function watchSettledActions() {
  while (_session) {
    if (getRingState() !== RING.SETTLED) return;
    const ctrl = new AbortController();
    _session.settledAbort = ctrl;
    // .then((), () => null) catches the loser's abort rejection so it doesn't
    // bubble as an unhandled rejection. result === null means race was aborted
    // before either gesture fired (external close).
    const tapPromise = waitForRingTap({ signal: ctrl.signal }).then(() => 'tap', () => null);
    const lpPromise = waitForRingLongPress({ signal: ctrl.signal }).then(() => 'longpress', () => null);
    const result = await Promise.race([tapPromise, lpPromise]);
    ctrl.abort(); // cancel the loser
    if (!_session) return;
    _session.settledAbort = null;
    if (result === 'tap') {
      // Reopen typing with kept text. Stay in same session — when it settles
      // again, onSettled will re-invoke watchSettledActions.
      openKeyboard(true);
      return;
    }
    if (result === 'longpress') {
      // Switch to recording. Capture release promise for THIS press.
      const releasePromise = waitForRingRelease();
      commitLongpress(releasePromise);
      return;
    }
    // result === null: external abort. while-check at top will exit.
  }
}

// ---------------------------------------------------------------- public API

// Start a typing session. The caller is responsible for having called
// setRingState(RING.INVITATION) before this; we'll switch to RING.INPUT.
// Resolves with one of:
//   { kind: 'sent' }                     — user clicked send / Enter, send preset
//   { kind: 'cancelled' }                — user dismissed without typing, loop back to invitation
//   { kind: 'longpress', releasePromise } — user long-pressed in settled, switch to recording
export function enterTypingMode() {
  return new Promise((resolve) => {
    _session = {
      resolve,
      onSettled: () => { watchSettledActions(); },
      settledAbort: null,
    };
    openKeyboard(false);
  });
}

export function getTypedText() { return _typedText; }

// Force-close any active typing session — used by skip flows that abort the
// caller mid-await. Tears down the keyboard / input / type-area without
// resolving the session promise (the caller is throwing out of the await
// anyway, so the orphaned promise is harmless). Also aborts any pending
// gesture race waiters so they don't sit in input.js's _waiters queue and
// eat the next user gesture.
export function forceCloseTypingSession() {
  if (_gestureAbort) {
    try { _gestureAbort.abort(); } catch (_e) { /* ignore */ }
    _gestureAbort = null;
  }
  if (_session && _session.settledAbort) {
    try { _session.settledAbort.abort(); } catch (_e) { /* ignore */ }
  }
  _session = null;
  if (_typeArea) fullClose();
}

// High-level orchestrator for "wait until user has committed an input gesture".
// Caller doesn't need to know about typing vs recording — this returns either:
//   { kind: 'typed' }                     — user typed and sent (preset bubble next)
//   { kind: 'recorded', releasePromise }  — user is mid-long-press (preset bubble next, sync release)
// Caller should call setRingState(RING.RECORDING) (or equivalent) before
// starting the ink, then await the release if present.
export async function waitForUserInput() {
  while (true) {
    setRingState(RING.INVITATION);
    const ctrl = new AbortController();
    _gestureAbort = ctrl;
    // .catch on each so the loser's abort rejection doesn't bubble up as an
    // unhandled rejection (race already resolved with the winner by then).
    const tapPromise = waitForRingTap({ signal: ctrl.signal })
      .then(() => 'tap', () => null);
    const lpPromise = waitForRingLongPress({ signal: ctrl.signal })
      .then(() => 'longpress', () => null);
    const gesture = await Promise.race([tapPromise, lpPromise]);
    ctrl.abort();
    if (_gestureAbort === ctrl) _gestureAbort = null;
    // External abort (skip / forceCloseTypingSession) — bail out. The caller
    // is throwing out of the await anyway; we just don't want this orphan
    // to fall through into typing.
    if (gesture === null) throw new DOMException('Aborted', 'AbortError');
    if (gesture === 'longpress') {
      // Same press is ongoing — release waiter resolves on this press's release.
      const releasePromise = waitForRingRelease();
      return { kind: 'recorded', releasePromise };
    }
    // gesture === 'tap' — open typing flow.
    const result = await enterTypingMode();
    if (result.kind === 'sent') return { kind: 'typed' };
    if (result.kind === 'longpress') return { kind: 'recorded', releasePromise: result.releasePromise };
    // 'cancelled' — loop back to INVITATION, wait again.
  }
}

export function initTypeInput() {
  _typeArea = $('#type-area');
  _typeText = $('#type-text');
  _sendBtn = $('#send-btn');
  _inputHost = $('#hidden-input-host');
  _edgeZone = $('#edge-zone');
  if (!_typeArea || !_typeText || !_sendBtn || !_inputHost || !_edgeZone) {
    console.warn('[type-input] required DOM nodes missing');
    return;
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', adjustForKeyboard);
    window.visualViewport.addEventListener('scroll', adjustForKeyboard);
  }

  // typing 态下用户点 edge-zone — 拦截 mousedown 阻止默认失焦行为, 让键盘和
  // 直线都不被点掉.
  _edgeZone.addEventListener('mousedown', (e) => {
    if (getRingState() === RING.INPUT) e.preventDefault();
  });
  // typing 态下点 type-area 也别让 input 失焦 — 但 send 按钮要例外, 不然就
  // 没法送出了.
  function isSendBtnTarget(e) {
    return e.target && e.target.closest && e.target.closest('#send-btn');
  }
  _typeArea.addEventListener('mousedown', (e) => {
    if (getRingState() !== RING.INPUT) return;
    if (isSendBtnTarget(e)) return;
    e.preventDefault();
  });
  _typeArea.addEventListener('pointerdown', (e) => {
    if (getRingState() !== RING.INPUT) return;
    if (isSendBtnTarget(e)) return;
    e.preventDefault();
  });

  _sendBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (_typedText.trim()) commitSend();
  });

  // 路径形变跟着 state 走: 进 INPUT/SETTLED 弧→直, 离开二者直→弧.
  onRingStateChange((next, prev) => {
    const want = isLineState(next);
    const was = isLineState(prev);
    if (want && !was) animatePath(ARC_LINE, PATH_MORPH_MS);
    else if (!want && was) animatePath(ARC_CURVE, PATH_MORPH_MS);
  });

  updateTypeText();
}
