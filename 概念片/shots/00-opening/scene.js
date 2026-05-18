// Beat 00 · 开场
//
// 时序 (与执行脚本 0.1–0.9 对齐, 但金瞳/爪子按用户意见略去):
//   0    黑场
//   0.2  他: "……谁?"
//   0.3  圆弧从下向上浮起 (translateY+opacity), 进入呼吸态 (is-invitation)
//   0.5  长按蓄波 (is-recording + 涟漪向上扩散), 你: "是你在叫我?"
//   0.6  气泡 + 弧同时淡出
//   0.7  立绘成形
//   0.8  他: "水里新化的妖。出来。"
//   0.85 他气泡淡出
//   0.9a 水岸场景从中央生长铺满
//   0.9b 手机轮廓淡入 (opacity, 不是 stroke-dashoffset)
//   0.9c 外部变暗到黑
//   0.9d VO 左右分置, 浮现于手机两侧
//
// 弧几何 — 同一个圆 (option B, 用户已确认保留同圆约束):
//   圆: cx=800, cy=3400, R≈2624.88 (圆心远在视口下方, 圆顶在 y≈775)
//   宽态端点 (0, 900) / (1600, 900) — 贴 16:9 视口左右下角
//   窄态端点 (640, 780) / (960, 780) — 在手机轮廓内, 与放大后的 phone 配合
//   顶点恒定 (800, 775) — 弧度处处一致, 手机窗口截到的任意段都和 demo 弧同曲率
(function () {
  const DURATION = 9000;

  // ── 几何 ────────────────────────────────────────────────────────────────
  const PHONE = EchoConstants.PHONE;

  const CIRCLE = EchoConstants.CIRCLE;
  // 角度 (math 约定): 0=右, π/2=上.
  const ARC_NARROW = { aStart: 1.6319, aEnd: 1.5097 }; // 手机内 (chord ≈ 320px)
  const ARC_WIDE   = { aStart: 1.8801, aEnd: 1.2615 }; // 全屏底边 (chord = 1600px)

  // ── DOM ─────────────────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const phoneOutline = $('#phone-outline');
  const phoneInterior = $('#phone-interior');
  const signatureArc = $('#signature-arc');
  const outsideDarken = $('#outside-darken');
  const scene = $('#scene');
  const portrait = $('#portrait');
  const b1 = $('#b1'), b2 = $('#b2'), b3 = $('#b3');
  const arcRevealWrap = $('#arc-reveal-wrap');
  const arcHost = $('#arc-host');
  const ripple1 = $('#ripple1');
  const ripple2 = $('#ripple2');
  const ripple3 = $('#ripple3');
  const voLeft = $('#voLeft');
  const voRight = $('#voRight');

  // ── 打字机 ──────────────────────────────────────────────────────────────
  // 每个气泡的目标文本在初始化时缓存, 后续 reset/replay 仍可恢复.
  const bubbleText = new Map();
  [b1, b2, b3].forEach((el) => {
    bubbleText.set(el, el.textContent);
    el.textContent = '';
  });
  const typewriterIntervals = new Set();
  function typewriter(el, perCharMs) {
    const text = bubbleText.get(el) || '';
    if (!text) return;
    el.textContent = text.slice(0, 1); // 首字立即出, 与 visible 渐显同步
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

  function arcPathAt(aStart, aEnd) {
    return EchoCurves.arcPath(CIRCLE.cx, CIRCLE.cy, CIRCLE.r, aStart, aEnd);
  }
  const widePath = arcPathAt(ARC_WIDE.aStart, ARC_WIDE.aEnd);
  signatureArc.setAttribute('d', widePath);
  // 涟漪与主弧同形, 由 CSS keyframes 控制其向上 translateY 扩散
  [ripple1, ripple2, ripple3].forEach((el) => el.setAttribute('d', widePath));

  // ── 初始状态 ────────────────────────────────────────────────────────────
  // 手机轮廓 / 外暗用 opacity 控制 (不再依赖 stroke-dashoffset 描边)
  phoneOutline.style.opacity = '0';
  phoneOutline.style.transition = 'opacity 1.2s var(--ease-drift)';
  outsideDarken.style.opacity = '0';
  outsideDarken.style.transition = 'opacity 1.4s var(--ease-drift)';

  // ── reset ───────────────────────────────────────────────────────────────
  function reset() {
    clearTypewriters();
    [b1, b2, b3].forEach((el) => {
      el.classList.remove('visible');
      el.textContent = '';
    });
    portrait.classList.remove('visible');
    portrait.style.transform = '';
    scene.classList.remove('visible');
    arcRevealWrap.classList.remove('is-revealed', 'is-fading');
    arcHost.classList.remove('is-invitation', 'is-recording');
    signatureArc.setAttribute('d', widePath);
    [ripple1, ripple2, ripple3].forEach((el) => el.setAttribute('d', widePath));
    phoneOutline.style.opacity = '0';
    outsideDarken.style.opacity = '0';
    voLeft.classList.remove('visible');
    voRight.classList.remove('visible');
  }

  // ── 时序 (压缩自 14s 版本, 各拍间隙缩紧, 气泡/VO 读时间保留) ────────────
  function steps() {
    return [
      // 0.2 他: "……谁?"
      { at:  400, run: () => { b1.classList.add('visible'); typewriter(b1, EchoConstants.TYPE_SPEED.slow); }},

      // 0.3 弧从下到上浮起 + 进入呼吸态
      { at: 1200, run: () => arcRevealWrap.classList.add('is-revealed') },
      { at: 1900, run: () => arcHost.classList.add('is-invitation') },
      { at: 3100, run: () => b1.classList.remove('visible') },

      // 0.5 长按蓄波 + 你的气泡
      { at: 2500, run: () => {
        arcHost.classList.remove('is-invitation');
        arcHost.classList.add('is-recording');
        b2.classList.add('visible');
        typewriter(b2, EchoConstants.TYPE_SPEED.brisk);
      }},
      // 0.6 弧淡出 (3500) + 0.65 你气泡淡出 (4500, +1000ms 让人读完)
      { at: 3500, run: () => arcRevealWrap.classList.add('is-fading') },
      { at: 4500, run: () => b2.classList.remove('visible') },
      { at: 4100, run: () => arcHost.classList.remove('is-recording', 'is-invitation') },

      // 0.7 立绘成形
      { at: 4200, run: () => portrait.classList.add('visible') },

      // 0.8 他: "水里新化的妖。出来。" (10 字 brisk ~800ms, 留 500ms 读)
      { at: 5000, run: () => { b3.classList.add('visible'); typewriter(b3, EchoConstants.TYPE_SPEED.brisk); }},
      { at: 7300, run: () => b3.classList.remove('visible') },

      // 0.9a 水岸场景生长铺满
      { at: 6500, run: () => scene.classList.add('visible') },

      // 0.9b 手机轮廓淡入
      { at: 7500, run: () => { phoneOutline.style.opacity = '1'; }},

      // 0.9c 外部变暗到黑
      { at: 8000, run: () => { outsideDarken.style.opacity = String(EchoConstants.OUTSIDE_DARKEN); }},

      // 0.9d OV1: 「他的世界 / 由你"划"开」— 整片首句, 母题 + "划"动作钩子.
      // 7800ms 起浮 (与外暗 8000 几乎同步, 略提前 200 让字"早一拍"出),
      // 9000ms beat 结束 + 600ms 连播 buffer ≈ 1.8s 可见时间, 1.2s transition 够浮起.
      { at: 7800, run: () => { voLeft.classList.add('visible'); voRight.classList.add('visible'); }},
    ];
  }

  EchoStage.mount({
    stage: $('#stage'),
    title: '00 · 开场',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();
