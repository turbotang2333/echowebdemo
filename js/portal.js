// 时空门 · 回响视频（场 6 段 4 后插入）
//
// 三阶段：
//   A · 入场：fx-burst-layer 上半屏挂"时空门"——同心圆环 + 暖色光晕 + 涟漪
//             + "点击进入" 呼吸提示。挂 setRingActive(true) 屏蔽常规手势。
//   B · 点击 → 视频展开：clip-path circle 从入口位置径向扩张到全屏；同时
//             圆环/涟漪/提示淡出。点击在用户手势链内调 video.play()，iOS 也能带音播。
//   C · 视频 ended → 缩回 → 消失：clip-path 缩回入口圆心，圆环短暂回浮做"门关上"，
//             整组淡出 → resolve。
//
// 中途不允许关闭（按用户要求）；turbo 模式（长按 Space）整段跳过。
// 跳场景：registerCancellable 接住 SceneJumpError，finally 清理 DOM + setRingActive(false)。

import { $, defer, raf, wait, registerCancellable } from './util.js';
import { setRingActive } from './input.js';
import { isTurbo, onTurboChange } from './turbo.js';

export async function runPortalVideo({ src }) {
  const burst = $('#fx-burst-layer');
  if (!burst) return;

  setRingActive(true);

  const host = document.createElement('div');
  host.className = 'portal-host';
  host.innerHTML = `
    <div class="portal-entry">
      <div class="portal-glow portal-glow-far"></div>
      <div class="portal-glow portal-glow-mid"></div>
      <div class="portal-glow portal-glow-core"></div>
      <div class="portal-ripples">
        <span class="portal-ripple"></span>
        <span class="portal-ripple"></span>
        <span class="portal-ripple"></span>
      </div>
    </div>
    <video class="portal-video" preload="auto" playsinline></video>
  `;
  burst.appendChild(host);

  const videoEl = host.querySelector('.portal-video');
  videoEl.src = src;
  // 提前触发网络请求，用户看到圆环 → 反应 → 点击的窗口里完成首段缓冲
  try { videoEl.load(); } catch {}

  const w = defer();
  let phase = 'idle'; // idle | playing | closing | done
  let resolved = false;

  // ---- turbo: 整段跳过 ----
  const finishNow = () => {
    if (resolved) return;
    resolved = true;
    phase = 'done';
    try { videoEl.pause(); } catch {}
    w.resolve();
  };
  if (isTurbo()) Promise.resolve().then(finishNow);
  const offTurbo = onTurboChange((on) => { if (on) finishNow(); });

  // ---- 跳场景中断 ----
  const offCancel = registerCancellable((err) => {
    if (resolved) return;
    resolved = true;
    phase = 'done';
    try { videoEl.pause(); } catch {}
    w.reject(err);
  });

  // ---- 入场：下一帧添加 visible，触发 CSS 入场过渡 ----
  await raf();
  await raf();
  host.classList.add('visible');

  // ---- 点击：用户手势链内直接 play()，含声 ----
  const onTap = async (e) => {
    if (phase !== 'idle' || resolved) return;
    e.preventDefault();
    e.stopPropagation();
    phase = 'playing';
    host.classList.add('opening');
    try {
      videoEl.muted = false;
      videoEl.volume = 1;
      await videoEl.play();
    } catch (err) {
      // iOS 可能因为各种原因拒绝带声播放 —— 退回静音播放，体验降级但流程不卡
      console.warn('[portal] play with audio failed, fallback to muted', err);
      try { videoEl.muted = true; await videoEl.play(); } catch (e2) {
        console.error('[portal] muted fallback also failed', e2);
      }
    }
  };
  host.querySelector('.portal-entry').addEventListener('pointerdown', onTap);

  // ---- 视频结束 → 关门 ----
  videoEl.addEventListener('ended', async () => {
    if (resolved || phase !== 'playing') return;
    phase = 'closing';
    host.classList.remove('opening');
    host.classList.add('closing');
    // 等 clip-path 缩回（700ms）+ 圆环回浮（300ms）+ 整体淡出（400ms）
    await wait(700);
    if (resolved) return;
    host.classList.add('gone');
    await wait(450);
    if (resolved) return;
    resolved = true;
    phase = 'done';
    w.resolve();
  });

  try {
    await w.promise;
  } finally {
    offTurbo();
    offCancel();
    setRingActive(false);
    host.remove();
  }
}

// 跳场景时的兜底清理：从外部强制移除残留 DOM。
export function clearPortal() {
  const host = document.querySelector('#fx-burst-layer .portal-host');
  if (host) host.remove();
}
