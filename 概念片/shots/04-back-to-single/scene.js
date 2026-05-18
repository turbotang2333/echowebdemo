// Beat 04 · 回单屏 · 无限上滑剪影
//
// 接续 03 尾帧 (手机轮廓 + 外暗 0.95 已就位, 内部回到抽象 wash 态).
// 上滑色块一次性"浮起→上提→沉走" → 触发 28 帧场景剪影在手机内部翻过, 节奏:
//   ACCEL (S3+A5=8 帧, 匀加速) → PEAK (P12, 常速极快) → DECEL1 (D1·4, 匀缓减)
//   → DECEL2 (D2·4, 匀急减拖尾) → 抽象残光定格
//
// 关键设计:
// - 04 不出长按弧 — 上滑色块独自承担"输入"语义. 色块只跑一次 lifecycle:
//   100ms visible 浮起 → 600ms is-pulling 上提 → 1100ms leaving 沉走+blur. 不持续呆在屏上.
// - "真正的匀速加/减速" — 每个加/减速区段内的 interval 是单条线性数列 (Δinterval=const),
//   而不是手填的"看起来钟形但相邻 Δ 抖". 见 FLOW_INTERVALS 的 linearRamp() 构造.
// - "强调流光" — S 只 3 帧 (短前奏), P 12 帧 (≈ 660ms 极速 plateau), D 拆两段:
//   D1 缓减 (每帧+55ms), D2 急减 (每帧+140ms = 2.5× D1) — 两段 Δ 不同, 观感差异分明.
// - 28 帧由 3 个 .scene-frame 层 round-robin: 切帧时改 backgroundImage + 加 .visible,
//   上一帧仍在淡出 (140ms transition), 自然产生 1-2 帧叠化. P 段切到 mix-blend-mode:screen
//   + blur 制造叠透 motion-blur.
// - 用 cj1-cj6 六张图共 28 次, 后段大量复用 — 呼应"无限流就是这些片段在不断重组".
// - 收尾: .is-settling 让所有 frame opacity→0, blur 加深, 紫色 wash 浮回 — 不定格在任何
//   具体场景, 给 05a 高光视频干净的容器.
(function () {
  const DURATION = 6000;

  // ── 几何 (沿用 00/01 的手机) ─────────────────────────
  const PHONE = EchoConstants.PHONE;

  // ── DOM ────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const underlay = $('#underlay');
  const phoneOutline = $('#phone-outline');
  const phoneInterior = $('#phone-interior');
  const swipeTip = $('#swipeTip');
  const frames = [$('#frame-a'), $('#frame-b'), $('#frame-c')];
  const voLeft  = $('#voLeft');
  const voRight = $('#voRight');

  // ── 路径 ───────────────────────────────────────────────
  const phonePath = EchoCurves.phoneOutline(PHONE.cx, PHONE.cy, PHONE.w, PHONE.h, PHONE.r);
  phoneOutline.setAttribute('d', phonePath);
  phoneInterior.setAttribute('d', phonePath);

  // ── 帧素材 (cj1-cj6 共 28 次, 后段大量复用) ────────────
  //  阶段标注: S=慢起 A=加速 P=流光 D1=慢减 D2=拖尾
  const FRAME_SEQ = [
    'cj1.jpg', 'cj2.jpg', 'cj3.jpg',                                                //  1- 3  S (短前奏, 3 张主视觉)
    'cj4.png', 'cj5.jpg', 'cj6.png', 'cj2.jpg', 'cj1.jpg',                          //  4- 8  A (剩下 3 张 + 2 张回响)
    'cj1.jpg', 'cj3.jpg', 'cj5.jpg', 'cj2.jpg', 'cj4.png', 'cj6.png',               //  9-14  P 第一轮 全 6 张快速过
    'cj1.jpg', 'cj3.jpg', 'cj5.jpg', 'cj2.jpg', 'cj4.png', 'cj6.png',               // 15-20  P 第二轮 同上 (重组感)
    'cj1.jpg', 'cj5.jpg', 'cj3.jpg', 'cj2.jpg',                                     // 21-24  D1 慢减
    'cj6.png', 'cj4.png', 'cj1.jpg', 'cj3.jpg',                                     // 25-28  D2 拖尾 (最后停在 cj3 水岸 — 与 00 起点呼应)
  ];

  // 切帧: 取 round-robin 下一层, 设 backgroundImage, 加 .visible (上一层自然淡出).
  let layerIdx = 0;
  function swapFrame(imgName) {
    const el = frames[layerIdx % frames.length];
    el.style.backgroundImage = `url('../../assets/images/${imgName}')`;
    el.classList.add('visible');
    // 隐两步之前的层 (round-robin 3 层, 当前 + 上一 + 上上一 = 全部活跃; 上上一可清)
    const prev2 = frames[(layerIdx + 1) % frames.length];
    prev2.classList.remove('visible');
    layerIdx++;
  }

  // ── reset (回到 03 尾帧 + 04 自身初态) ─────────────────
  function reset() {
    frames.forEach((el) => {
      el.classList.remove('visible');
      el.style.backgroundImage = '';
    });
    underlay.classList.remove('is-flowing', 'is-settling');
    swipeTip.classList.remove('visible', 'is-pulling', 'leaving');
    voLeft.classList.remove('visible');
    voRight.classList.remove('visible');
    layerIdx = 0;
  }

  // ── 时序 ───────────────────────────────────────────────
  // 钟形间隔表 — "真正的匀速加速 / 匀速减速" 由 4 段等差数列 (linearRamp) 构成,
  // 每段内 Δinterval = const, 即每相邻两帧之间提速/减速量恒定 (区别于此前手填值
  // 看起来"是钟形但相邻 Δ 抖").
  //   ACCEL  (S3 + A5 = 8 帧, 7 内部 + 1 边界 = 8 intervals): linear 420→75, Δ≈-49ms
  //   PEAK   (P 12 帧, 11 internal): 常数 55ms (Δ=0)  — 极速 plateau, 流光重头戏
  //   P→D1   边界 1 interval: 80ms (桥接 55→110, 略有 step-up 标记"减速开始")
  //   DECEL1 (D1 4 帧, 3 internal): linear 110→220, Δ=+55ms  — 慢减
  //   D1→D2  边界 1 interval: 280ms (明显 step-up 标记"二段减速开始")
  //   DECEL2 (D2 4 帧, 3 internal): linear 380→660, Δ=+140ms — 拖尾, 每帧多停 2.5×
  // 总流时 ≈ 4080ms; 加 1100ms 色块 lifecycle + 100ms 末帧停顿 + 720ms settle ≈ DURATION 6000
  function linearRamp(start, end, n) {
    if (n <= 1) return [Math.round(start)];
    const step = (end - start) / (n - 1);
    return Array.from({ length: n }, (_, i) => Math.round(start + i * step));
  }
  const FLOW_T0 = 1100;
  const FLOW_INTERVALS = [
    ...linearRamp(420, 75, 8),     // ACCEL (S→A→P 入口): 420, 371, 321, 272, 223, 174, 124, 75
    ...Array(11).fill(55),         // PEAK: 55 × 11
    80,                            // P→D1 boundary
    ...linearRamp(80, 170, 3),     // DECEL1 internal: 80, 125, 170 (压缩 -120ms)
    180,                           // D1→D2 boundary (压缩 -100ms)
    ...linearRamp(240, 400, 3),    // DECEL2 internal: 240, 320, 400 (拖尾压缩 -600ms)
  ];
  // sanity: FLOW_INTERVALS.length 应 = FRAME_SEQ.length - 1 = 27

  // 流光段帧号区间 (0-indexed): 帧 9 (索引 8) 进入 P, 帧 21 (索引 20) 离开 P
  const FLOW_PEAK_ENTER = 8;   // P 第一帧前入
  const FLOW_PEAK_EXIT = 20;   // D1 第一帧前出

  function steps() {
    const tl = [];

    // ── 上滑色块一次性 lifecycle (浮起 → 上提 → 沉走) ──
    // 100   add .visible (0.5s rise)
    // 600   add .is-pulling (scale 1→1.7, 0.5s)
    // 1100  remove .visible + .is-pulling, add .leaving (0.35s opacity + 0.3s blur)
    //       同瞬间触发 frame 1 — 视觉上"扳机扣下" 与 "内容流出" 同步发生
    tl.push({ at:  100, run: () => swipeTip.classList.add('visible') });
    tl.push({ at:  600, run: () => swipeTip.classList.add('is-pulling') });
    tl.push({ at: 1100, run: () => {
      swipeTip.classList.remove('visible', 'is-pulling');
      swipeTip.classList.add('leaving');
    }});

    // ── 28 帧 round-robin (钟形间隔) ──
    let t = FLOW_T0;
    FRAME_SEQ.forEach((img, i) => {
      tl.push({ at: t, run: () => swapFrame(img) });

      if (i === FLOW_PEAK_ENTER) {
        // 进流光段: 加 mix-blend + blur
        tl.push({ at: t - 20, run: () => underlay.classList.add('is-flowing') });
      }
      if (i === FLOW_PEAK_EXIT) {
        // 出流光段: 撤 mix-blend + blur, D1 起回到清晰
        tl.push({ at: t - 20, run: () => underlay.classList.remove('is-flowing') });
      }

      if (i < FRAME_SEQ.length - 1) t += FLOW_INTERVALS[i];
    });

    // 此时 t = 帧 28 的触发时间 (FLOW_T0 + 4080 ≈ 5180)
    // ── 末帧停顿 100ms → 收尾抽象残光 (settle 700ms 窗口完成于 6000ms) ──
    tl.push({ at: t + 100, run: () => underlay.classList.add('is-settling') });

    // ── OV: 「Agent 驱动 / 故事无限」─────────────────────────
    // 流光 PEAK ~1500-2200, DECEL 段 ~3500-5180. OV 在减速段浮起读出
    // "无限上滑"产品语义, 不抢 PEAK 视觉高潮. 6000 DURATION 自然带走.
    tl.push({ at: 3500, run: () => {
      voLeft.classList.add('visible');
      voRight.classList.add('visible');
    }});

    return tl;
  }

  EchoStage.mount({
    stage: $('#stage'),
    title: '04 · 回单屏 · 无限上滑',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();
