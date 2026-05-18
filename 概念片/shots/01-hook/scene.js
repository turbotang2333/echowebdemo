// Beat 01 · 钩子
//
// 接续 00 尾帧 (水岸 cj3 + 小狐狸立绘 + 手机轮廓 + 外暗 0.95 — 全部已就位),
// 跑 2 轮 6 拍交互循环 (长按弧 → 长按 → 你气泡 → 他气泡 → 上滑色块 → 上滑切场景),
// 第 2 轮收尾"定格在 swipe-tip 刚浮起 + HOOK 字在屏"瞬间, Beat 02 接手做上滑分裂.
//
// 关键节奏决策:
// - 弧的命运绑你气泡: 你气泡 typed → 留 300ms 让人读完 → 你气泡 + 弧 同时淡出
//   (语义: 用户松手了 → 弧不应该继续活着). 他响应时弧已退场, 焦点纯在他.
// - 上滑色块拆三段: 浮起(0.5s) → 呼吸 1.0s ("让观众注意") → is-pulling(0.5s, scale 1.7)
//   → 顶点松手时同步触发 leaving + 场景 wipe + 涟漪带 sweep (1.2s). 三者一起释放
//   手势能量, 不是两个突兀的事件.
// - Loop B 的 invitation 短促 (0.4s 一闪), 因为第二次观众已熟悉这套节奏.
// - HOOK ("通向你想去的任何地方。") 不淡出, 留在最终帧, 与 swipe-tip 共存定格.
//
// 时序总览 (DURATION = 10000, 90s BGM 卡点 -5.5s, 改 1.5 轮):
//   LOOP A · 水岸 (完整 6 拍, 节奏压紧)
//     0      长按弧浮起 (1.0s 渐显 + 上移)
//     0.5    invitation 呼吸
//     1.3    recording + 你: "你要带我去哪里?"      (100ms/字 × 8 = 800ms)
//     2.4    你气泡 + 弧 同时淡出 (typed 后留 300ms)
//     2.8    他: "岛上别的地方。跟上。"             (130ms/字 × 10 = 1.3s, typed @ 4.1)
//     4.5    他气泡淡出 (typed 后留 400ms)
//     4.8    swipe-tip 浮起 (0.5s)
//     5.3    swipe-tip is-pulling (scale 1→1.7 over 0.5s)
//     5.8    swipe-tip leaving + 场景 wipe (cj3→宅院) + 涟漪带 sweep (1.2s 同步)
//     6.5    wipe 完成清理
//   "0.5 轮" · 宅院 (跳过 你气泡, 只保 HOOK + arc handoff)
//     6.9    长按弧 (2nd) 浮起 (脱 is-fading + 加 is-revealed)
//     7.4    HOOK: "通向你想去的任何地方。"           (130ms/字 × 11 = 1.43s, typed @ 8.83)
//     9.4    HOOK 淡出 + 长按弧第三次 reveal (同步触发, 为 02 接手) — 留 570ms 读
//    10.0    END (弧 600ms 浮起 ~60%, HOOK 完全淡掉; 02 接手已是"弧浮起在等"状态)
//
// 弧几何 — 沿用 00 的同一个圆 (cx=800, cy=3400, r≈2624.88).
//   ARC_NARROW 端点从 PHONE.w 推导, 让弧的两端正好贴在手机左右直边
//   (x = cx ± w/2 = 600 / 1000) 而不是浮在手机内部.
//   端点 y ≈ 782.73 (落在手机底部 1/10 处), 峰顶 (800, 775), 峰起 ~7.6px.
//   守"全片所有弧来自同一圆"硬约束 (§5.4) — 视觉上弧仍偏平, 但贴边读得出
//   这是"从大圆截下的一小段", 与未来 wide/narrow 切换共曲率.
(function () {
  const DURATION = 10000;

  // ── 几何 (沿用 00 的圆 + 手机, 弧端点从 PHONE.w 推导) ──
  const PHONE = EchoConstants.PHONE;
  const CIRCLE = EchoConstants.CIRCLE;
  // cos(a) = ±(w/2) / r → 左端 acos(-), 右端 acos(+); 峰顶在 a=π/2.
  const ARC_NARROW = {
    aStart: Math.acos(-(PHONE.w / 2) / CIRCLE.r),
    aEnd:   Math.acos( (PHONE.w / 2) / CIRCLE.r),
  };

  // ── DOM ────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const phoneOutline = $('#phone-outline');
  const phoneInterior = $('#phone-interior');
  const signatureArc = $('#signature-arc');
  const sceneOld = $('#scene-old');
  const rippleBand = $('#rippleBand');
  const swipeTip = $('#swipeTip');
  const portrait = $('#portrait');
  const b1 = $('#b1'), b2 = $('#b2'), b3 = $('#b3'), b4 = $('#b4');
  const arcRevealWrap = $('#arc-reveal-wrap');
  const arcHost = $('#arc-host');
  const ripple1 = $('#ripple1'), ripple2 = $('#ripple2'), ripple3 = $('#ripple3');

  // ── 打字机 (沿用 00) ────────────────────────────────────
  const bubbleText = new Map();
  [b1, b2, b3, b4].forEach((el) => {
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

  // ── 路径 ───────────────────────────────────────────────
  const phonePath = EchoCurves.phoneOutline(PHONE.cx, PHONE.cy, PHONE.w, PHONE.h, PHONE.r);
  phoneOutline.setAttribute('d', phonePath);
  phoneInterior.setAttribute('d', phonePath);

  const arcPath = EchoCurves.arcPath(CIRCLE.cx, CIRCLE.cy, CIRCLE.r, ARC_NARROW.aStart, ARC_NARROW.aEnd);
  signatureArc.setAttribute('d', arcPath);
  [ripple1, ripple2, ripple3].forEach((el) => el.setAttribute('d', arcPath));

  // ── snap-reset: 切换状态时禁掉一次 transition, 避免 replay 时元素从终态滑回起态
  // 漏到屏幕上 (典型: 涟漪带 1.2s top transition, 旧场景 1.2s clip-path transition).
  function snapReset(el, mutator) {
    const prev = el.style.transition;
    el.style.transition = 'none';
    mutator();
    // force reflow so the transition:none takes effect before we restore.
    void el.offsetWidth;
    el.style.transition = prev;
  }

  // ── reset (回到 00 尾帧的"已就位"状态) ────────────────
  function reset() {
    clearTypewriters();
    [b1, b2, b3, b4].forEach((el) => {
      el.classList.remove('visible');
      el.textContent = '';
    });
    arcRevealWrap.classList.remove('is-revealed', 'is-fading');
    arcHost.classList.remove('is-invitation', 'is-recording');
    swipeTip.classList.remove('visible', 'is-pulling', 'leaving');
    portrait.classList.remove('is-leaning-in');
    snapReset(sceneOld, () => sceneOld.classList.remove('is-wiping'));
    snapReset(rippleBand, () => rippleBand.classList.remove('is-sweeping', 'is-leaving'));
    // phone outline / outside-darken: 由 HTML inline 给定 (opacity:1 / 0.95), Beat 01 不动它们.
  }

  // ── 时序 ───────────────────────────────────────────────
  function steps() {
    return [
      // ═══ LOOP A · 水岸 (完整 6 拍, 0-6.5s) ═══════════════
      // 长按弧浮起 + invitation 呼吸
      { at:    0, run: () => arcRevealWrap.classList.add('is-revealed') },
      { at:  500, run: () => arcHost.classList.add('is-invitation') },

      // 长按 → 你: "你要带我去哪里?" (8 chars × 100ms = 800ms; 留 300ms 读完)
      { at: 1300, run: () => {
        arcHost.classList.remove('is-invitation');
        arcHost.classList.add('is-recording');
        b1.classList.add('visible');
        typewriter(b1, EchoConstants.TYPE_SPEED.fast);
      }},
      { at: 2400, run: () => {
        arcRevealWrap.classList.add('is-fading');
        arcHost.classList.remove('is-recording', 'is-invitation');
      }},
      // 你气泡再多 hold 1000ms 让人读完 (与 arc fade 解耦)
      { at: 3400, run: () => b1.classList.remove('visible') },

      // 他: "岛上别的地方。跟上。" (10 chars × 130ms = 1.3s, typed @ 4.1)
      { at: 2800, run: () => { b2.classList.add('visible'); typewriter(b2, EchoConstants.TYPE_SPEED.normal); }},
      // "跟上" 落地后角色顺势近身: scale 1.18 + translateY 6%, 借 shared 的 1.4s transform 过渡.
      { at: 4200, run: () => portrait.classList.add('is-leaning-in') },
      { at: 5500, run: () => b2.classList.remove('visible') },

      // 上滑色块: 浮起 (0.5s) → is-pulling (0.5s) → leaving + wipe + ripples (1.2s)
      { at: 4800, run: () => swipeTip.classList.add('visible') },
      { at: 5300, run: () => swipeTip.classList.add('is-pulling') },
      { at: 5800, run: () => {
        swipeTip.classList.remove('visible', 'is-pulling');
        swipeTip.classList.add('leaving');
        sceneOld.classList.add('is-wiping');
        rippleBand.classList.add('is-sweeping');
      }},
      // wipe 完成清理 (1.2s 后)
      { at: 7000, run: () => {
        swipeTip.classList.remove('leaving');
        rippleBand.classList.add('is-leaving');
      }},

      // ═══ "0.5 轮" · 宅院 (跳 你气泡, 只 HOOK + arc handoff) ═══
      // 长按弧第二次浮起
      { at: 6900, run: () => {
        arcRevealWrap.classList.remove('is-fading');
        arcRevealWrap.classList.add('is-revealed');
      }},

      // 他 HOOK: "通向你想去的任何地方。" (11 chars × 130ms = 1.43s, typed @ 8.33)
      // visible 提前 500ms 到 6900 (与弧第二次浮起同拍), 让 HOOK hold 拉到 ~1570ms
      { at: 6900, run: () => { b4.classList.add('visible'); typewriter(b4, EchoConstants.TYPE_SPEED.normal); }},

      // ─── ENDING: 弧第三次 reveal (为 02 接手) + HOOK 淡出 (+1000ms hold from original) ───
      // 弧 reveal 仍按原节奏在 9400 触发, HOOK typed @ 8.33 + 1570ms 让人读完
      { at: 9400, run: () => {
        arcRevealWrap.classList.remove('is-fading');
        arcRevealWrap.classList.add('is-revealed');
      }},
      { at: 9900, run: () => b4.classList.remove('visible') },
    ];
  }

  EchoStage.mount({
    stage: $('#stage'),
    title: '01 · 钩子',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();
