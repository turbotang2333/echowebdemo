// Beat 02 · 千人千面 · 三屏
//
// 继承 01 末帧 (单屏宅院 + 立绘 + 长按弧已浮起 + 第三轮 invitation 已起). 02 t=0
// 重建该状态 (3 套元素重合于中央大手机内), 1.5s rAF tween 裂为三屏, 然后中段所有
// 拍点按 A → B → C 350ms 错峰展开 (从左到右涟漪), 末尾 3 他气泡同步收拢 (ABA
// 结构: 起手齐 → 中段散 → 收尾齐), 留 ~400ms 定格供 03 "穿入" 接手.
//
// 关键决策:
// - 弧/手机外形/立绘/场景 pane 起手三者重合于中央, 视觉上读作"单屏"; tween 期内
//   3 套同步分离 + 缩小 (cx 800→{300,800,1300}, w 400→240, h 820→480). mask path
//   每帧重算 = 3 phone 形状的并集, 与 outline 帧帧对齐.
// - 三 phone 共用同一个 CIRCLE (cx=800 cy=3400 r=2624.88, 与 01 一致); 但每帧 arc
//   的圆心横坐标随该 phone 的 cx 平移, 保证弧端点贴各 phone 左右边. 守"同一条曲线"
//   硬约束 — 各弧仍是同一半径的同形态切片.
// - 错峰节奏 (STAGGER = 350ms): 裂开之后所有事件按 [A=0, B=+350, C=+700] 触发,
//   "弧切 recording → 你气泡 → 弧淡出 → 你气泡淡出 → 他气泡 → 场景生长" 5 拍各自
//   错峰. 每屏内部"弧 recording → 你气泡" 仍紧贴 100ms (保留小节拍).
// - 他气泡三句长度不齐 (A 19字 / B 9字 / C 15字): 错峰起, 自然完成, 末尾 9400ms
//   3 屏同步淡出 (收尾合拢, "千人千面同一个 vision"的合声感, 不刻意校齐 typed 时间).
// - 场景 pane 起点从 6800 → 6500 提前 300ms: 错峰后 C 屏场景 @ 7200, settled @ 9000,
//   留 400ms 定格给 03 接手 (若不提前, C 仅剩 100ms 定格).
//
// 时序总览 (DURATION = 9400, STAGGER = 350ms):
//   0      setup: 3 phones 重合 + 3 arc-wrap is-revealed (齐)
//   200    3 arc-host is-invitation 呼吸 (齐)
//   300    启动裂开 rAF tween (1500ms, easeOutSoft) (齐, "一变三"必须齐)
//   1800   裂开完成
//   ── 以下错峰 350ms (A=0 / B=+350 / C=+700) ──
//   2200   弧切 is-recording (A:2200 / B:2550 / C:2900)
//   2300   你气泡 visible + typewriter 100ms/字 (A:2300/typed 3500 / B:2650/4150 / C:3000/4200)
//   4100   弧淡出 (A:4100 / B:4450 / C:4800)
//   5100   你气泡淡出 (A:5100 / B:5450 / C:5800)
//   5400   他气泡 visible + typewriter 130ms/字 (A:5400/typed 7870 / B:5750/6920 / C:6100/8050)
//   6500   场景 pane visible — grow 1.8s, 长在他气泡背后 (A:6500/settled 8300 / B:6850/8650 / C:7200/9000)
//   ── 收尾合拢 (齐) ──
//   9400   3 他气泡 同步淡出 (与开头呼应); 定格 ~400ms 由 03 "穿入" 接手
(function () {
  const DURATION = 9400;

  // ── 几何 ─────────────────────────────────────────────────
  const PHONE_START = EchoConstants.PHONE;  // 01 末帧的单屏
  // 三屏与 01 单屏 同尺寸 (用户决定: "保持一致, 只是分散在左中右"),
  // 三屏除 cx 不同, 其余 (cy/w/h/r) 全部继承 PHONE_START.
  // cx=300/800/1300 + w=400 → 三屏在 1600 viewBox 内各占 25%, 间隙 ≈6.25%, 两侧留边 ≈6.25%.
  const PHONES_END = [
    { id: 'A', ...PHONE_START, cx: 300  },
    { id: 'B', ...PHONE_START, cx: 800  },
    { id: 'C', ...PHONE_START, cx: 1300 },
  ];
  const CIRCLE = EchoConstants.CIRCLE;  // 沿用 01 同圆

  // 弧端点 — chord = phone w, 端点 x = cx ± w/2, 角度由半径推
  function arcAngles(w) {
    return {
      aStart: Math.acos(-(w / 2) / CIRCLE.r),
      aEnd:   Math.acos( (w / 2) / CIRCLE.r),
    };
  }

  // ── DOM ──────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const ids = ['A', 'B', 'C'];
  const phoneOutlines  = ids.map(id => $('#phone-outline-'  + id));
  const phoneInteriors = ids.map(id => $('#phone-interior-' + id));
  const arcWraps       = ids.map(id => $('#arc-reveal-wrap-' + id));
  const arcHosts       = ids.map(id => $('#arc-host-'       + id));
  const sigArcs        = ids.map(id => $('#signature-arc-'  + id));
  const ripples        = ids.map(id => [1, 2, 3].map(n => $('#ripple' + n + '-' + id)));
  const portraits      = ids.map(id => $('#portrait-'       + id));
  const scenePanes     = ids.map(id => $('#scene-pane-'     + id));
  const youBubbles     = ids.map(id => $('#you-'            + id));
  const himBubbles     = ids.map(id => $('#him-'            + id));

  // ── 打字机 (沿用 00/01) ──────────────────────────────────
  const bubbleText = new Map();
  [...youBubbles, ...himBubbles].forEach(el => {
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
    const tid = setInterval(() => {
      i++;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(tid);
        typewriterIntervals.delete(tid);
      }
    }, perCharMs);
    typewriterIntervals.add(tid);
  }
  function clearTypewriters() {
    typewriterIntervals.forEach(id => clearInterval(id));
    typewriterIntervals.clear();
  }

  // ── 裂开 tween ───────────────────────────────────────────
  const lerp = (a, b, t) => a + (b - a) * t;
  // approx cubic-bezier(0.16, 1, 0.3, 1) — 与 shared 的 --ease-out-soft 同形
  const easeOutSoft = (t) => 1 - Math.pow(1 - t, 4);

  // progress ∈ [0,1]; 0 = 单屏大手机 (3 重合), 1 = 三屏小手机 (各就位).
  function setSplitState(progress) {
    const e = easeOutSoft(progress);
    PHONES_END.forEach((end, i) => {
      const cx = lerp(PHONE_START.cx, end.cx, e);
      const cy = end.cy;
      const w  = lerp(PHONE_START.w, end.w, e);
      const h  = lerp(PHONE_START.h, end.h, e);
      const r  = lerp(PHONE_START.r, end.r, e);

      // 手机外形 + mask 子洞 (同一条 path)
      const phonePath = EchoCurves.phoneOutline(cx, cy, w, h, r);
      phoneOutlines[i].setAttribute('d', phonePath);
      phoneInteriors[i].setAttribute('d', phonePath);

      // 弧 — 同 CIRCLE r, 圆心横坐标随 phone cx 平移, 端点贴该 phone 左右边
      const a = arcAngles(w);
      const arcPath = EchoCurves.arcPath(cx, CIRCLE.cy, CIRCLE.r, a.aStart, a.aEnd);
      sigArcs[i].setAttribute('d', arcPath);
      ripples[i].forEach(el => el.setAttribute('d', arcPath));

      // 立绘 — 底锚 phone 底沿, 横锚 phone cx, scale 按 phone 高比 × 近身倍率 + translateY 下沉.
      // 取景目标: 与 01 末帧 (is-leaning-in) 一致 — 头偏上、身体下沉、长发越过手机底进入暗区.
      // 1.7 / 40% 看起来比 01 的 1.32 / 32% 大, 是因为 1/2/3_alpha.webm 角色在 2562×1440 源
      // 画布里居中且四周留白多, 实际像素占比比 小狐狸待机_alpha 小; 不补这一档就读作"远一档".
      const portraitBottomPct = (900 - (cy + h / 2)) / 9;  // % 从 stage 底
      const portraitLeftPct   = cx / 16;                    // % 从 stage 左
      const scale             = (h / PHONE_START.h) * 1.7;
      portraits[i].style.bottom    = portraitBottomPct.toFixed(2) + '%';
      portraits[i].style.left      = portraitLeftPct.toFixed(2)   + '%';
      portraits[i].style.transform = 'translateX(-50%) scale(' + scale.toFixed(3) + ') translateY(40%)';

      // 场景 pane — 占据 phone 内全部矩形 (left/top/w/h 全是 phone bounds)
      scenePanes[i].style.left   = (cx / 16).toFixed(2)       + '%';
      scenePanes[i].style.top    = ((cy - h / 2) / 9).toFixed(2) + '%';
      scenePanes[i].style.width  = (w / 16).toFixed(2)        + '%';
      scenePanes[i].style.height = (h / 9).toFixed(2)         + '%';
    });
  }

  // 起手 render — t=0 (3 重合)
  setSplitState(0);

  const splitTween = { rafId: null };
  function startSplit(durationMs) {
    // tween 期内关掉立绘/场景 pane 的 transition, 由 rAF 每帧主导
    portraits.forEach(p => p.style.transition = 'none');
    scenePanes.forEach(p => p.style.transition = 'none');
    const startedAt = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - startedAt) / durationMs);
      setSplitState(t);
      if (t < 1) {
        splitTween.rafId = requestAnimationFrame(tick);
      } else {
        splitTween.rafId = null;
        // 强制一次 reflow 后, 恢复 transition (供 .visible 后续生长用)
        void scenePanes[0].offsetWidth;
        portraits.forEach(p => p.style.transition = '');
        scenePanes.forEach(p => p.style.transition = '');
      }
    }
    splitTween.rafId = requestAnimationFrame(tick);
  }

  // ── reset ────────────────────────────────────────────────
  function reset() {
    clearTypewriters();
    [...youBubbles, ...himBubbles].forEach(el => {
      el.classList.remove('visible');
      el.textContent = '';
    });
    scenePanes.forEach(p => p.classList.remove('visible'));
    arcWraps.forEach(w => w.classList.remove('is-revealed', 'is-fading'));
    arcHosts.forEach(h => h.classList.remove('is-invitation', 'is-recording'));
    if (splitTween.rafId) {
      cancelAnimationFrame(splitTween.rafId);
      splitTween.rafId = null;
    }
    portraits.forEach(p => p.style.transition = '');
    scenePanes.forEach(p => p.style.transition = '');
    setSplitState(0);
    portraits.forEach(p => p.style.opacity = '1');
  }

  // ── 错峰 ─────────────────────────────────────────────────
  // 屏间错峰间隔 ms. 中段所有事件 (裂开后) 按 [A=0, B=+STAGGER, C=+2×STAGGER] 触发,
  // 形成从左到右的涟漪. 改这一个常数即可整体调节涟漪密度.
  const STAGGER = 350;
  const OFFSETS = [0, STAGGER, 2 * STAGGER];

  // ── 时序 ─────────────────────────────────────────────────
  function steps() {
    const list = [
      // ── 起手 (齐, 接 01 末帧) ──
      // t=0: 3 弧 reveal 已落 (起手即在态)
      { at: 0,   run: () => arcWraps.forEach(w => w.classList.add('is-revealed')) },
      // t=200: 进入 invitation 呼吸
      { at: 200, run: () => arcHosts.forEach(h => h.classList.add('is-invitation')) },
      // t=300: 启动裂开 ("一变三" 必须齐)
      { at: 300, run: () => startSplit(1500) },

      // ── 收尾合拢 (齐, 与开头呼应) ──
      // t=9400: 3 他气泡 同步淡出, 定格 ~400ms 由 03 接手
      { at: 9400, run: () => himBubbles.forEach(b => b.classList.remove('visible')) },
    ];

    // ── 中段错峰: A → B → C 涟漪 (STAGGER = 350ms) ──
    ids.forEach((_, i) => {
      const off = OFFSETS[i];

      // 弧切 recording @ 2200 + 你气泡打字 @ 2300 (屏内紧贴 100ms)
      list.push({ at: 2200 + off, run: () => {
        arcHosts[i].classList.remove('is-invitation');
        arcHosts[i].classList.add('is-recording');
      }});
      list.push({ at: 2300 + off, run: () => {
        youBubbles[i].classList.add('visible');
        typewriter(youBubbles[i], EchoConstants.TYPE_SPEED.fast);
      }});

      // 弧淡出 @ 4100
      list.push({ at: 4100 + off, run: () => {
        arcWraps[i].classList.add('is-fading');
        arcHosts[i].classList.remove('is-recording', 'is-invitation');
      }});

      // 你气泡淡出 @ 5100
      list.push({ at: 5100 + off, run: () => youBubbles[i].classList.remove('visible') });

      // 他气泡打字 @ 5400 (130ms/字, 长度不齐自然完成)
      list.push({ at: 5400 + off, run: () => {
        himBubbles[i].classList.add('visible');
        typewriter(himBubbles[i], EchoConstants.TYPE_SPEED.normal);
      }});

      // 场景 pane 生长 @ 6500 (起点比原 6800 提前 300ms, 让 C settled @ 9000 留 400ms 定格)
      list.push({ at: 6500 + off, run: () => scenePanes[i].classList.add('visible') });
    });

    return list;
  }

  EchoStage.mount({
    stage: $('#stage'),
    title: '02 · 千人千面',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();
