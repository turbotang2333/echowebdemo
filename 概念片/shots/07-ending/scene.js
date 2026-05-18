// Beat 07 · 收尾
//
// v5 (2026-05-14, slogan 与 self-pulse 同步 → 后续 -2.2s):
//   slogan 不再等圆消失才浮现, 与 PHASE D 圆本体 self-pulse 发起同步 (16.4s),
//   "圆散出去的那一刻字就来了" — 字与最后一拍重叠呼吸.
//   后续 (slogan 淡出 / logo / 收片) 全部跟随提前 2.2s, DURATION 22.8 → 20.6s.
//
// v4: 06→07 衔接 + 视频底; 起态承接 06 末帧; 0~600ms 白曝光⇄视频交叉; PHASE B 去掉 fade up.
//
// 时序 (≈ 20.6s):
//   0.0    起态: 手机+外暗 0.95+白曝光 1.0 (内白外暗, 承接 06 末帧)
//   0.0    bg-video & white-wash 同步交叉淡入淡出 (各 600ms)
//   0.6    白曝光淡净 + 视频清晰呈现 (花草+狐狸)
//   0.6    7.1 你 b1
//   2.3    b1 淡出
//   2.7    7.2 他 b2
//   4.4    b2 淡出
//   4.8    7.3 弧浮起 + invitation 呼吸
//   6.2    PHASE A: 手机+外暗淡出 + 弧 chord 400→1600 同步扩展 (2.5s)
//   9.1    PHASE B 起: 弧 d→fullCircle + viewBox 拉远 (3.5s) (视频 hold)
//  11.1    bg-video fade out 1→0 (1.5s, 跟圆闭合同步)
//  12.6    PHASE B 完: viewBox done, bg gone, 完整圆现身
//  13.0    弧 invitation 退
//  13.4    PHASE C: 2 ripples single-pass
//  16.4    PHASE D: 圆本体 self-pulse 第 3 脉冲 (2.2s) + slogan 同步浮现 (1.2s 渐入)
//  17.6    slogan 完全清晰 (圆此时仍在散最后一段, 字与末拍重叠)
//  18.7    slogan 淡出 (停留 2.3s)
//  19.6    logo 浮现
//  20.6    收片
//
// 母题落地 — 圆几何 (与 00-opening 同一只远心圆):
//   cx=800 cy=3400 r=2624.88; 原 viewBox 1600×900 只见底切线段;
//   末 viewBox ≈10577×5949 整圆现身
(function () {
  const DURATION = 20600;

  // ── 几何 ────────────────────────────────────────────────────────────────
  const PHONE = EchoConstants.PHONE;
  const CIRCLE = EchoConstants.CIRCLE;

  // 弧 chord (窄态) = phone.w, 端点顶手机两侧
  const ARC_HALF = PHONE.w / 2;
  const ARC_NARROW = {
    aStart: Math.acos(-ARC_HALF / CIRCLE.r),
    aEnd:   Math.acos( ARC_HALF / CIRCLE.r),
  };
  // 弧 chord (宽态) = 1600, 端点贴 viewport (0,900) / (1600,900)
  const ARC_WIDE = { aStart: 1.8801, aEnd: 1.2615 };

  // viewBox 拉远末态: 装下整只圆 + 350 px margin
  const VB_START = [0, 0, 1600, 900];
  const VB_END_H = 2 * (CIRCLE.r + 350);
  const VB_END_W = VB_END_H * (16 / 9);
  const VB_END = [
    CIRCLE.cx - VB_END_W / 2,
    CIRCLE.cy - VB_END_H / 2,
    VB_END_W,
    VB_END_H,
  ];

  // ── DOM ─────────────────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const svg = $('#svg');
  const phoneOutline = $('#phone-outline');
  const phoneInterior = $('#phone-interior');
  const outsideDarken = $('#outside-darken');
  const signatureArc = $('#signature-arc');
  const arcRevealWrap = $('#arc-reveal-wrap');
  const arcHost = $('#arc-host');
  const pulseHost = $('#pulse-host');
  const pulses = [$('#pulse1'), $('#pulse2')];
  const bgVideo = $('#bg-video');
  const whiteWash = $('#white-wash');
  const phoneInteriorClip = $('#phone-interior-clip-path-07');
  const b1 = $('#b1');
  const b2 = $('#b2');
  const slogan = $('#slogan');
  const logo = $('#logo');

  // ── 打字机 ──────────────────────────────────────────────────────────────
  const bubbleText = new Map();
  [b1, b2].forEach((el) => {
    bubbleText.set(el, el.textContent);
    el.textContent = '';
  });
  const typewriterIntervals = new Set();
  function typewriter(el, perCharMs) {
    const text = bubbleText.get(el) || '';
    if (!text) return;
    el.textContent = text.slice(0, 1);
    let i = 1;
    if (i >= text.length) return;
    const id = setInterval(() => {
      i++;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(id);
        typewriterIntervals.delete(id);
      }
    }, perCharMs);
    typewriterIntervals.add(id);
  }
  function clearTypewriters() {
    typewriterIntervals.forEach((id) => clearInterval(id));
    typewriterIntervals.clear();
  }

  // ── 路径 ────────────────────────────────────────────────────────────────
  const phonePath = EchoCurves.phoneOutline(PHONE.cx, PHONE.cy, PHONE.w, PHONE.h, PHONE.r);
  phoneOutline.setAttribute('d', phonePath);
  phoneInterior.setAttribute('d', phonePath);
  phoneInteriorClip.setAttribute('d', phonePath);

  const narrowArcPath = EchoCurves.arcPath(
    CIRCLE.cx, CIRCLE.cy, CIRCLE.r,
    ARC_NARROW.aStart, ARC_NARROW.aEnd
  );
  const fullCirclePath = EchoCurves.fullCircle(CIRCLE.cx, CIRCLE.cy, CIRCLE.r);
  signatureArc.setAttribute('d', narrowArcPath);

  pulses.forEach((c) => {
    c.setAttribute('cx', CIRCLE.cx);
    c.setAttribute('cy', CIRCLE.cy);
    c.setAttribute('r', CIRCLE.r);
  });

  // ── 初始状态 ────────────────────────────────────────────────────────────
  phoneOutline.style.opacity = '1';
  phoneOutline.style.transition = 'opacity 2.5s var(--ease-drift)';
  outsideDarken.style.opacity = String(EchoConstants.OUTSIDE_DARKEN);
  outsideDarken.style.transition = 'opacity 2.5s var(--ease-drift)';

  // ── rAF tween 工具 ──────────────────────────────────────────────────────
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  let vbRafId = null;
  function cancelVbTween() {
    if (vbRafId) { cancelAnimationFrame(vbRafId); vbRafId = null; }
  }
  function tweenViewBox(fromVB, toVB, duration) {
    cancelVbTween();
    const t0 = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      const e = easeOutCubic(p);
      const v = fromVB.map((a, i) => a + (toVB[i] - a) * e);
      svg.setAttribute('viewBox', v.map((n) => n.toFixed(2)).join(' '));
      if (p < 1) vbRafId = requestAnimationFrame(frame);
      else vbRafId = null;
    }
    vbRafId = requestAnimationFrame(frame);
  }

  let arcRafId = null;
  function cancelArcTween() {
    if (arcRafId) { cancelAnimationFrame(arcRafId); arcRafId = null; }
  }
  function tweenArc(fromA, toA, duration) {
    cancelArcTween();
    const t0 = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - t0) / duration);
      const e = easeOutCubic(p);
      const aStart = fromA.aStart + (toA.aStart - fromA.aStart) * e;
      const aEnd   = fromA.aEnd   + (toA.aEnd   - fromA.aEnd  ) * e;
      signatureArc.setAttribute(
        'd',
        EchoCurves.arcPath(CIRCLE.cx, CIRCLE.cy, CIRCLE.r, aStart, aEnd)
      );
      if (p < 1) arcRafId = requestAnimationFrame(frame);
      else arcRafId = null;
    }
    arcRafId = requestAnimationFrame(frame);
  }

  // ── reset ───────────────────────────────────────────────────────────────
  function reset() {
    clearTypewriters();
    cancelVbTween();
    cancelArcTween();
    svg.setAttribute('viewBox', VB_START.join(' '));

    [b1, b2].forEach((el) => {
      el.classList.remove('visible');
      el.textContent = '';
    });

    // bg-video + white-wash: snap 回起态 (avoid replay 时跑 transition 动画).
    // 参照 06 的做法: 先关 transition + 强 set opacity, force reflow, 再清 inline.
    bgVideo.classList.remove('is-revealed', 'is-fading');
    whiteWash.classList.remove('is-fading');
    [bgVideo, whiteWash].forEach((el) => {
      el.style.transition = 'none';
    });
    bgVideo.style.opacity = '0';
    whiteWash.style.opacity = '1';
    void bgVideo.offsetWidth;
    [bgVideo, whiteWash].forEach((el) => {
      el.style.transition = '';
      el.style.opacity = '';
    });
    try { bgVideo.currentTime = 0; bgVideo.play(); } catch (e) { /* autoplay 受限场景静默 */ }
    arcRevealWrap.classList.remove('is-revealed', 'is-fading');
    arcHost.classList.remove('is-invitation', 'is-recording', 'is-self-pulsing');
    signatureArc.setAttribute('d', narrowArcPath);
    pulseHost.classList.remove('is-pulsing');
    slogan.classList.remove('visible');
    logo.classList.remove('visible');
    phoneOutline.style.opacity = '1';
    outsideDarken.style.opacity = String(EchoConstants.OUTSIDE_DARKEN);
  }

  // ── 时序 ────────────────────────────────────────────────────────────────
  function steps() {
    return [
      // 0.0 起态承接 06 末帧: 白曝光 1 + 外暗 0.95 + 手机轮廓 1 + bg-video 0.
      //     0~600ms 交叉淡入淡出: white-wash 1→0, bg-video 0→1.
      { at:     0, run: () => {
        bgVideo.classList.add('is-revealed');
        whiteWash.classList.add('is-fading');
      } },

      // 7.1 你: "我可以……再来找你吗?"
      { at:   600, run: () => { b1.classList.add('visible'); typewriter(b1, EchoConstants.TYPE_SPEED.brisk); } },
      { at:  3300, run: () => b1.classList.remove('visible') },

      // 7.2 他: "……不用问。"
      { at:  2700, run: () => { b2.classList.add('visible'); typewriter(b2, EchoConstants.TYPE_SPEED.heavy); } },
      { at:  5400, run: () => b2.classList.remove('visible') },

      // 7.3 弧浮起 + invitation 呼吸
      { at:  4800, run: () => arcRevealWrap.classList.add('is-revealed') },
      { at:  5700, run: () => arcHost.classList.add('is-invitation') },

      // PHASE A: 手机+外暗 同时淡出 + 弧 chord 400→1600 同步扩展 (2.5s)
      { at:  6200, run: () => {
        phoneOutline.style.opacity = '0';
        outsideDarken.style.opacity = '0';
        tweenArc(ARC_NARROW, ARC_WIDE, 2500);
      } },

      // PHASE B 起: 弧 d→fullCircle + viewBox 3.5s 拉远 (视频 hold 在 1.0)
      { at:  9100, run: () => {
        signatureArc.setAttribute('d', fullCirclePath);
        tweenViewBox(VB_START, VB_END, 3500);
      } },

      // PHASE B 中段: bg-video 跟圆闭合同步淡出 (1.5s)
      // 11.1 起淡出至 12.6 ≈ viewBox done
      { at: 11100, run: () => {
        bgVideo.classList.add('is-fading');
      } },

      // 弧 invitation 呼吸退场 (圆稳定亮起)
      { at: 13000, run: () => arcHost.classList.remove('is-invitation') },

      // PHASE C: ripples 2 个 single-pass
      { at: 13400, run: () => pulseHost.classList.add('is-pulsing') },

      // PHASE D: 圆自身作第 3 脉冲 (scale 1→1.8 + opacity 1→0, 2.2s)
      //          + slogan 同步浮现 (1.2s 渐入) — 字与圆最后一拍重叠呼吸,
      //          不等"圆消失瞬间"才出字, 去掉感官停顿
      { at: 16400, run: () => {
        arcHost.classList.add('is-self-pulsing');
        slogan.classList.add('visible');
      } },

      // slogan 淡出 (停留 2.3s)
      { at: 18700, run: () => slogan.classList.remove('visible') },

      // logo 浮现 (末态定格 1.0s)
      { at: 19600, run: () => logo.classList.add('visible') },
    ];
  }

  EchoStage.mount({
    stage: $('#stage'),
    title: '07 · 收尾',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();
