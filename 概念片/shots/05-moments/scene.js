// Beat 05 · 三个关系瞬间 (合并版)
//
// 把 5a (高光视频) / 5b (符纸配对) / 5c (角色陪伴) 合并到同一根时间轴.
// 两次"上滑色块 → 上滑 → 切场景"承担段落切换 — swipe-tip 的视觉语义
// 直接照搬 Beat 01: 浮起 (0.5s) → is-pulling (0.5s, scale 1→1.7) → leaving
// (0.35s 沉回+blur). leaving 同步触发上一段 .is-active 移除 + 下一段加入,
// 0.55s 交叉淡入淡出. 母题"上滑推动世界"在段间被显形.
//
// 接续 04 末态: phone-outline opacity:1 + outside-darken 0.95, 全程不变.
// 三段元素在 reset 时全部归零, 各段开始才显形.
//
// 时间轴 (DURATION 14600 ≈ 14.6s, 90s BGM 卡点再压 5s):
//   T_5A       =     0    seg-5a 入场, portal entry 浮起 → opening → closing (5s 锁定, 不再压)
//   T_SWIPE_A  =  5000    上滑色块 A: 浮起 → pulling → leaving (1.3s)
//   T_5B       =  6300    seg-5b 3.5s: drift-in (80ms 错峰) → 三对配对 (跳 flipCycle)
//   T_SWIPE_B  =  9800    上滑色块 B (1.3s)
//   T_5C       = 11100    seg-5c 3.5s: scene/立绘/提示 瞬态入场 + 4 阶 pose (每拍 0.8s)
//   END        = 14600
//
// 压缩策略 (90s BGM 卡点 v2):
//   5a: 锁定 5s (用户决定不再压)
//   5b: 6s → 3.5s — drift-in 80ms 错峰, 错配 fizzle 后直接撤 selected (跳 flipCycle, 省 870ms)
//   5c: 6s → 3.5s — 起态铺垫 1.8s → 0.3s 瞬态入场, 4 阶 pose 1.0s → 0.8s
//   上滑色块切换全程不动 (用户已确认"感觉对"), 2×1.3 = 2.6s 保留.
// 单段调试请回 05a-highlight-video / 05b-mini-game / 05c-companion 原页面.

(function () {
  // ─ Phase markers ─────────────────────────────────────────
  const T_5A      =     0;
  const T_SWIPE_A =  5000;
  const T_5B      =  6300;   // = T_SWIPE_A + 1300 (与 swipeA leaving 同步入场)
  const T_SWIPE_B =  9800;   // = T_5B + 3500 (5b 再压至 3.5s)
  const T_5C      = 11100;   // = T_SWIPE_B + 1300
  const DURATION  = 14600;   // = T_5C + 3500 (5c 再压至 3.5s)

  // 沿用 04/05a/05b/05c 一致的手机几何.
  const PHONE = EchoConstants.PHONE;

  const $ = (sel) => document.querySelector(sel);

  // ─ 共用 DOM ─────────────────────────────────────────────
  const stage         = $('#stage');
  const phoneOutline  = $('#phone-outline');
  const phoneInterior = $('#phone-interior');

  // 5a
  const seg5a       = $('#seg-5a');
  const portalHost  = $('#portal-host');
  const portalVideo = $('#portal-video');

  // 5b
  const seg5b = $('#seg-5b');
  const cards = {
    'mem-1': $('.mem-1'), 'mem-2': $('.mem-2'), 'mem-3': $('.mem-3'),
    'tok-A': $('.tok-A'), 'tok-B': $('.tok-B'), 'tok-C': $('.tok-C'),
  };
  const lines = {
    err1B:  $('#line-err-1B'),
    cor1A:  $('#line-cor-1A'),
    cor2B:  $('#line-cor-2B'),
    tail3C: $('#line-tail-3C'),
  };
  const flying = $('#flying-token');
  const cardPos = {
    'mem-1': { left: '41%', top: '30%' },
    'mem-2': { left: '50%', top: '30%' },
    'mem-3': { left: '59%', top: '30%' },
    'tok-A': { left: '59%', top: '64%' },
    'tok-B': { left: '41%', top: '64%' },
    'tok-C': { left: '50%', top: '64%' },
  };
  const tokenSvgHtml = {
    A: cards['tok-A'].querySelector('.charm-card-front').innerHTML,
    B: cards['tok-B'].querySelector('.charm-card-front').innerHTML,
    C: cards['tok-C'].querySelector('.charm-card-front').innerHTML,
  };

  // 5c
  const seg5cUnder = $('#seg-5c-under');
  const seg5cOver  = $('#seg-5c-over');
  const scene      = $('#scene');
  const charFrame  = $('#char-frame');
  const charGlow   = $('#char-glow');
  const emotion    = $('#emotion');
  const touch      = $('#touch');
  const satBar     = $('#sat-bar');
  const satFill    = $('#sat-fill');
  const hint       = $('#hint');
  const hearts     = [$('#heart-1'), $('#heart-2'), $('#heart-3')];

  // 上滑色块 (两份 — 段间各一次)
  const swipeA = $('#swipeA');
  const swipeB = $('#swipeB');

  // Fruit stars — 每段末凝成 + 飞向画外, 衔接到 06 三星云主星位置.
  //   起点 (form): 凝成在该段视觉焦点
  //     A = portal 中心 ≈ stage (50%, 35.5%)
  //     B = mem-3 / tok-C 中点 ≈ stage (54.5%, 47%)
  //     C = 立绘"心位" ≈ stage (50%, 55%)
  //   终点 (fly): 飞向画外, 方向与 06 三星云相对位置对齐
  //     A → 左上 (06 A 主星 380,320 在画面左上)
  //     B → 右上 (06 B 主星 1180,340 在画面右上)
  //     C → 下方 (06 C 主星 560,700 在画面偏下)
  const fruitA = $('#fruit-A');
  const fruitB = $('#fruit-B');
  const fruitC = $('#fruit-C');

  // OV4 vo elements — voLeft/voRight 顺次切「深度/剧情」「互动/游戏」「亲密/陪伴」三拍.
  const voLeft  = $('#voLeft');
  const voRight = $('#voRight');
  function setVO(textL, textR) {
    voLeft.textContent  = textL;
    voRight.textContent = textR;
    voLeft.classList.add('visible');
    voRight.classList.add('visible');
  }
  function hideVO() {
    voLeft.classList.remove('visible');
    voRight.classList.remove('visible');
  }
  const fruitForm = {
    A: { left: '50%',   top: '35.5%' },
    B: { left: '54.5%', top: '47%'   },
    C: { left: '50%',   top: '55%'   },
  };
  const fruitFly = {
    A: { left: '-15%',  top: '-15%'  },
    B: { left: '115%',  top: '-15%'  },
    C: { left: '50%',   top: '115%'  },
  };

  // ─ 手机路径 (一次性设, 全程不变) ────────────────────────
  const phonePath = EchoCurves.phoneOutline(PHONE.cx, PHONE.cy, PHONE.w, PHONE.h, PHONE.r);
  phoneOutline.setAttribute('d', phonePath);
  phoneInterior.setAttribute('d', phonePath);

  // ─ 5c helpers ───────────────────────────────────────────
  function setPose(name) {
    if (name) charFrame.setAttribute('data-pose', name);
    else charFrame.removeAttribute('data-pose');
  }
  function retriggerHearts() {
    hearts.forEach((el) => {
      el.classList.remove('is-float');
      void el.offsetWidth;
      el.classList.add('is-float');
    });
  }

  // ─ 5b ink-line helpers (照搬单段版) ─────────────────────
  function initLines() {
    Object.values(lines).forEach((ln) => {
      const len = ln.getTotalLength();
      ln.style.transition = 'none';
      ln.style.strokeDasharray = len;
      ln.style.strokeDashoffset = len;
    });
  }
  function drawLine(ln, durMs) {
    const len = ln.getTotalLength();
    ln.style.transition = 'none';
    ln.style.strokeDashoffset = len;
    ln.classList.add('drawing');
    requestAnimationFrame(() => {
      ln.style.transition = `stroke-dashoffset ${durMs}ms cubic-bezier(.5,.1,.2,1), opacity 200ms ease-out`;
      ln.style.strokeDashoffset = '0';
    });
  }
  function drawLinePartial(ln, durMs, frac) {
    const len = ln.getTotalLength();
    ln.style.transition = 'none';
    ln.style.strokeDashoffset = len;
    ln.classList.add('drawing');
    requestAnimationFrame(() => {
      ln.style.transition = `stroke-dashoffset ${durMs}ms cubic-bezier(.5,.1,.2,1), opacity 200ms ease-out`;
      ln.style.strokeDashoffset = String(len * (1 - frac));
    });
  }
  function fizzleLine(ln) {
    ln.classList.remove('drawing');
    ln.classList.add('fizzle');
  }
  function flipCycle(card) {
    const inner = card.querySelector('.charm-card-inner');
    inner.style.transition = 'transform 320ms cubic-bezier(.6, .2, .4, 1)';
    inner.style.transform = 'rotateY(180deg)';
    setTimeout(() => { inner.style.transform = 'rotateY(360deg)'; }, 520);
    setTimeout(() => {
      inner.style.transition = 'none';
      inner.style.transform = '';
      requestAnimationFrame(() => { inner.style.transition = ''; });
    }, 870);
  }
  function flyToken(tokenKey, fromCardId, toCardId) {
    flying.innerHTML = `<svg viewBox="0 0 40 50" aria-hidden="true">${tokenSvgHtml[tokenKey]}</svg>`;
    flying.classList.remove('armed', 'dissolving');
    flying.style.transition = 'none';
    flying.style.left = cardPos[fromCardId].left;
    flying.style.top  = cardPos[fromCardId].top;
    void flying.offsetWidth;
    flying.style.transition = '';
    flying.classList.add('armed');
    requestAnimationFrame(() => {
      flying.style.left = cardPos[toCardId].left;
      flying.style.top  = cardPos[toCardId].top;
    });
  }

  // ─ 段切换: 上滑色块 leaving + 段交叉淡入淡出 ────────────
  function handoff(swipeTip, fromSeg, toSegs) {
    swipeTip.classList.remove('visible', 'is-pulling');
    swipeTip.classList.add('leaving');
    fromSeg.classList.remove('is-active');
    toSegs.forEach((s) => s.classList.add('is-active'));
  }

  // ─ Fruit star helpers ───────────────────────────────────
  // form: 在 fruitForm[key] 处凝成 (burst → settled)
  // fly:  改 left/top 到 fruitFly[key] 同时 .flying (淡出 + 缩小)
  function formFruit(starEl, key) {
    const pos = fruitForm[key];
    // 先无 transition 置到起点 + 起态, 再 rAF 上 transition 进入 forming
    starEl.style.transition = 'none';
    starEl.style.left = pos.left;
    starEl.style.top = pos.top;
    starEl.classList.remove('forming', 'settled', 'flying');
    void starEl.offsetWidth;  // flush
    starEl.style.transition = '';
    requestAnimationFrame(() => {
      starEl.classList.add('forming');
      // 200ms 后 settle (从 1.35 scale 缩回 1.0)
      setTimeout(() => {
        starEl.classList.remove('forming');
        starEl.classList.add('settled');
      }, 200);
    });
  }
  function flyFruit(starEl, key) {
    const pos = fruitFly[key];
    starEl.classList.remove('forming', 'settled');
    starEl.classList.add('flying');
    starEl.style.left = pos.left;
    starEl.style.top = pos.top;
  }

  // ─ Reset (清理所有三段元素回到起态) ─────────────────────
  function reset() {
    // 段容器
    seg5a.classList.remove('is-active');
    seg5b.classList.remove('is-active');
    seg5cUnder.classList.remove('is-active');
    seg5cOver.classList.remove('is-active');

    // 5a
    portalHost.classList.remove('visible', 'opening', 'closing');
    try {
      portalVideo.pause();
      portalVideo.currentTime = 0;
    } catch {}

    // 5b
    Object.values(cards).forEach((c) => {
      c.classList.remove('visible', 'selected', 'receive', 'shake', 'gone', 'outro', 'tok-detach');
      const inner = c.querySelector('.charm-card-inner');
      inner.style.transition = '';
      inner.style.transform = '';
    });
    Object.values(lines).forEach((ln) => { ln.classList.remove('drawing', 'fizzle'); });
    initLines();
    flying.classList.remove('armed', 'dissolving');
    flying.innerHTML = '';
    flying.style.transition = 'none';
    flying.style.left = '';
    flying.style.top = '';

    // 5c
    scene.classList.remove('visible');
    charFrame.classList.remove('visible', 'is-swaying');
    setPose(null);
    hint.classList.remove('visible');
    satBar.classList.remove('visible', 'is-full');
    satFill.style.width = '0%';
    touch.classList.remove('visible');
    emotion.style.opacity = '0';
    charGlow.classList.remove('visible', 'is-burst');
    hearts.forEach((el) => el.classList.remove('is-float'));

    // 上滑色块
    swipeA.classList.remove('visible', 'is-pulling', 'leaving');
    swipeB.classList.remove('visible', 'is-pulling', 'leaving');

    // Fruit stars + 手机/外暗淡出
    [fruitA, fruitB, fruitC].forEach((s) => {
      s.classList.remove('forming', 'settled', 'flying');
      s.style.transition = 'none';
      s.style.left = '';
      s.style.top = '';
      s.style.opacity = '';
      s.style.transform = '';
    });
    stage.classList.remove('is-phone-fading');

    // OV4
    [voLeft, voRight].forEach((el) => {
      el.classList.remove('visible');
      el.textContent = '';
    });
  }

  // ─ 时间轴 ───────────────────────────────────────────────
  function steps() {
    return [
      // ═══ 5a (T_5A = 0, 段长 5.0s) ══════════════════════
      { at: T_5A,        run: () => seg5a.classList.add('is-active') },
      { at: T_5A +  200, run: () => portalHost.classList.add('visible') },
      { at: T_5A + 1500, run: () => {                                              // 原 2200 → 1500
          portalHost.classList.add('opening');
          portalVideo.muted = true;
          portalVideo.play().catch((err) => {
            console.warn('[05-moments] video.play() failed', err);
          });
      }},
      { at: T_5A + 4500, run: () => {                                              // 原 6400 → 4500 (视频窗 3.0s)
          portalHost.classList.remove('opening');
          portalHost.classList.add('closing');
          try { portalVideo.pause(); } catch {}
      }},
      // 5a 末果实星 — 凝成在视频中心 (closing clip 收回的同时), 飞向左上画外
      { at: T_5A + 4700, run: () => formFruit(fruitA, 'A') },
      { at: T_5A + 5200, run: () => flyFruit(fruitA, 'A') },

      // ═══ 上滑色块 A: 5a → 5b ═══════════════════════════
      { at: T_SWIPE_A,        run: () => swipeA.classList.add('visible') },
      { at: T_SWIPE_A +  800, run: () => swipeA.classList.add('is-pulling') },
      { at: T_SWIPE_A + 1300, run: () => handoff(swipeA, seg5a, [seg5b]) },

      // ═══ 5b (T_5B = 6300, 段长 3.5s, drift-in 80ms 错峰 + 跳 flipCycle) ═════
      { at: T_5B +    0, run: () => cards['mem-1'].classList.add('visible') },
      { at: T_5B +   80, run: () => cards['mem-2'].classList.add('visible') },
      { at: T_5B +  160, run: () => cards['mem-3'].classList.add('visible') },
      { at: T_5B +  240, run: () => cards['tok-A'].classList.add('visible') },
      { at: T_5B +  320, run: () => cards['tok-B'].classList.add('visible') },
      { at: T_5B +  400, run: () => cards['tok-C'].classList.add('visible') },
      // Pair 1 错配 ①+B (跳 flipCycle: 撤 shake/selected 后直接进入正配)
      { at: T_5B +  500, run: () => {
          cards['mem-1'].classList.add('selected');
          cards['tok-B'].classList.add('selected');
      }},
      { at: T_5B +  580, run: () => drawLine(lines.err1B, 280) },
      { at: T_5B +  860, run: () => {
          fizzleLine(lines.err1B);
          cards['mem-1'].classList.add('shake');
          cards['tok-B'].classList.add('shake');
      }},
      { at: T_5B + 1080, run: () => {
          cards['mem-1'].classList.remove('shake', 'selected');
          cards['tok-B'].classList.remove('shake', 'selected');
      }},
      // Pair 1 正配 ①+A
      { at: T_5B + 1200, run: () => {
          cards['mem-1'].classList.add('selected');
          cards['tok-A'].classList.add('selected');
      }},
      { at: T_5B + 1280, run: () => drawLine(lines.cor1A, 220) },
      { at: T_5B + 1500, run: () => {
          cards['tok-A'].classList.add('tok-detach');
          flyToken('A', 'tok-A', 'mem-1');
      }},
      { at: T_5B + 1700, run: () => {
          cards['mem-1'].classList.add('receive');
          flying.classList.add('dissolving');
      }},
      { at: T_5B + 1800, run: () => {
          cards['mem-1'].classList.add('gone');
          cards['tok-A'].classList.add('gone');
          fizzleLine(lines.cor1A);
      }},
      // Pair 2 正配 ②+B
      { at: T_5B + 1900, run: () => {
          cards['mem-2'].classList.add('selected');
          cards['tok-B'].classList.add('selected');
      }},
      { at: T_5B + 1980, run: () => drawLine(lines.cor2B, 180) },
      { at: T_5B + 2160, run: () => {
          cards['tok-B'].classList.add('tok-detach');
          flyToken('B', 'tok-B', 'mem-2');
      }},
      { at: T_5B + 2320, run: () => {
          cards['mem-2'].classList.add('receive');
          flying.classList.add('dissolving');
      }},
      { at: T_5B + 2400, run: () => {
          cards['mem-2'].classList.add('gone');
          cards['tok-B'].classList.add('gone');
          fizzleLine(lines.cor2B);
      }},
      // Pair 3 悬念尾 ③+C (partial 35%)
      { at: T_5B + 2500, run: () => {
          cards['mem-3'].classList.add('selected');
          cards['tok-C'].classList.add('selected');
      }},
      { at: T_5B + 2580, run: () => drawLinePartial(lines.tail3C, 500, 0.35) },
      { at: T_5B + 3200, run: () => {
          cards['mem-3'].classList.add('outro');
          cards['tok-C'].classList.add('outro');
          lines.tail3C.classList.add('fizzle');
      }},
      // 5b 末果实星 — 凝成在 mem-3/tok-C 中点 (符纸退场同期), 飞向右上画外
      { at: T_5B + 3300, run: () => formFruit(fruitB, 'B') },
      { at: T_5B + 3500, run: () => flyFruit(fruitB, 'B') },

      // ═══ 上滑色块 B: 5b → 5c ═══════════════════════════
      { at: T_SWIPE_B,        run: () => swipeB.classList.add('visible') },
      { at: T_SWIPE_B +  800, run: () => swipeB.classList.add('is-pulling') },
      { at: T_SWIPE_B + 1300, run: () => handoff(swipeB, seg5b, [seg5cUnder, seg5cOver]) },

      // ═══ 5c (T_5C = 11100, 段长 3.5s, 瞬态入场 + pose 0.8s/拍) ══════════════════
      { at: T_5C +    0, run: () => scene.classList.add('visible') },
      { at: T_5C +   50, run: () => charFrame.classList.add('visible') },
      { at: T_5C +  100, run: () => hint.classList.add('visible') },
      { at: T_5C +  200, run: () => satBar.classList.add('visible') },
      { at: T_5C +  300, run: () => {
          hint.classList.remove('visible');
          touch.classList.add('visible');
      }},
      { at: T_5C +  400, run: () => {
          setPose('soft');
          charFrame.classList.add('is-swaying');
          satFill.style.width = '25%';
          emotion.style.opacity = '0.15';
      }},
      { at: T_5C + 1200, run: () => {
          setPose('relax');
          satFill.style.width = '50%';
          emotion.style.opacity = '0.32';
      }},
      { at: T_5C + 2000, run: () => {
          setPose('squint');
          satFill.style.width = '75%';
          emotion.style.opacity = '0.50';
      }},
      { at: T_5C + 2800, run: () => {
          setPose('bliss');
          charFrame.classList.remove('is-swaying');
          satFill.style.width = '100%';
          emotion.style.opacity = '0';
          charGlow.classList.add('visible', 'is-burst');
      }},
      { at: T_5C + 3000, run: () => {
          satBar.classList.add('is-full');
          retriggerHearts();
          // 5c 末果实星 — 凝成在立绘"心位" (与心形涨满 + 飘心同拍同高潮)
          formFruit(fruitC, 'C');
      }},
      { at: T_5C + 3200, run: () => {
          touch.classList.remove('visible');
          // 手机轮廓 + 外暗淡出 — 给 06 起态留干净黑底
          stage.classList.add('is-phone-fading');
      }},
      { at: T_5C + 3300, run: () => flyFruit(fruitC, 'C') },
      { at: T_5C + 3500, run: () => {
          seg5cUnder.classList.remove('is-active');
          seg5cOver.classList.remove('is-active');
      }},

      // ═══ OV4: 「深度剧情、互动游戏、亲密陪伴」拆 3 拍 ════════════════
      // 5a 中段「深度/剧情」(2000 进, 4500 淡出 — 与 portal closing 同步)
      { at: T_5A + 2000, run: () => setVO('深度', '剧情') },
      { at: T_5A + 4500, run: () => hideVO() },
      // 5b 中段「互动/游戏」(T_5B+700 = 7000 进, T_5B+3000 = 9300 淡出 — 符纸 outro 前)
      { at: T_5B +  700, run: () => setVO('互动', '游戏') },
      { at: T_5B + 3000, run: () => hideVO() },
      // 5c 中段「亲密/陪伴」(T_5C+800 = 11900 进, 14600 DURATION 结束自然带走)
      { at: T_5C +  800, run: () => setVO('亲密', '陪伴') },
    ];
  }

  EchoStage.mount({
    stage: stage,
    title: '05 · 三个关系瞬间 (合并)',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();
