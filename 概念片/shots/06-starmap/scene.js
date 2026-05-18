// Beat 06 · 记忆人格星图 (v2 — 5→6 衔接版)
//
// 起态: 全黑 (atmo + 星云 + 星 + 线 全 0; 手机轮廓 + 外暗 + 白曝光层 也全 0).
// 三颗果实星 (从 05 末段三个隔断飞出的延续) 从画外飞入到 A/B/C 三主星云的主星位置,
// 异步点亮 → 各星云内部 (其他星 + 连接线 + nebula 雾) 异步生长 → 残缺 D/E 浮起 →
// 背景星点 + atmo 弱底铺起 → 整片向白曝光涨起 + 外暗 + 手机轮廓同步浮现 → 手机内
// 白曝光态 hold → 由连播 600ms 缓冲淡接 07.
//
// 时间轴 (DURATION 8500ms):
//   200/450/700   fly-A/B/C 飞入 (1000ms 飞行, stagger 250ms)
//   1200/1450/1700 落位 (.landed flash) + SVG 主星点亮 (cross-fade)
//   1400/1650/1900 fly-star dissolve (将光交给 SVG 主星)
//   1500/1750/2000 各主星云内部生长 (nebula→glow→star→line 内部 stagger 200ms)
//   2400          残缺 D + E 浮起 (一起)
//   2700          背景 220 颗星点 (内部 stagger 3ms ≈ 660ms 铺完)
//   3000          atmo 暖深底色淡入 (1.6s)
//   3500          白曝光涨起 (3500ms) + 外暗涨到 0.95 (2800ms) + 手机轮廓浮现 (2200ms)
//   7000          末态: 内白外暗 + 手机轮廓
//   8500          DURATION 结束 → 连播交给 07

(function () {
  var DURATION = 8500;
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (sel) { return document.querySelector(sel); };
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // ── EchoCurves family ─────────────────────────────────────
  var PHONE = EchoConstants.PHONE;
  var CX = EchoConstants.CIRCLE.cx, CY = EchoConstants.CIRCLE.cy, CR = EchoConstants.CIRCLE.r;

  // 手机轮廓 + mask interior + clipPath interior — 同一条 path 写到三处
  var phonePath = EchoCurves.phoneOutline(PHONE.cx, PHONE.cy, PHONE.w, PHONE.h, PHONE.r);
  $('#phone-interior-06').setAttribute('d', phonePath);
  $('#phone-interior-clip-path-06').setAttribute('d', phonePath);
  $('#phone-outline').setAttribute('d', phonePath);

  // Tapered curve as filled polygon: 沿二次贝塞尔采样 + 垂直偏移得到
  // 一根宽度从 w1 → w2 渐变的"主梁"。所有线统一弧度(~6% sagitta,明显可见),
  // 控制点沿远心方向外推。
  function taperedCurvePath(x1, y1, x2, y2, w1, w2) {
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    var rx = mx - CX, ry = my - CY;
    var rLen = Math.sqrt(rx * rx + ry * ry) || 1;
    rx /= rLen; ry /= rLen;
    var chordLen = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    var sag = chordLen * 0.06;
    var cpx = mx + rx * sag * 2;
    var cpy = my + ry * sag * 2;

    var samples = 18;
    var leftPts = [], rightPts = [];
    for (var i = 0; i <= samples; i++) {
      var t = i / samples;
      var omt = 1 - t;
      var px = omt * omt * x1 + 2 * omt * t * cpx + t * t * x2;
      var py = omt * omt * y1 + 2 * omt * t * cpy + t * t * y2;
      var tx = 2 * omt * (cpx - x1) + 2 * t * (x2 - cpx);
      var ty = 2 * omt * (cpy - y1) + 2 * t * (y2 - cpy);
      var tlen = Math.sqrt(tx * tx + ty * ty) || 1;
      tx /= tlen; ty /= tlen;
      var nx = -ty, ny = tx;
      var w = w1 + (w2 - w1) * Math.pow(t, 0.85);
      var half = w / 2;
      leftPts.push({ x: px + nx * half, y: py + ny * half });
      rightPts.push({ x: px - nx * half, y: py - ny * half });
    }

    var d = 'M ' + leftPts[0].x.toFixed(2) + ' ' + leftPts[0].y.toFixed(2);
    for (var j = 1; j < leftPts.length; j++) {
      d += ' L ' + leftPts[j].x.toFixed(2) + ' ' + leftPts[j].y.toFixed(2);
    }
    for (var k = rightPts.length - 1; k >= 0; k--) {
      d += ' L ' + rightPts[k].x.toFixed(2) + ' ' + rightPts[k].y.toFixed(2);
    }
    d += ' Z';
    return d;
  }

  function lineWidthAtStar(s, isComp) {
    var k = isComp ? 0.7 : 1;
    if (s.type === 'core') return 3.0 * k;
    if (s.lit === true)    return 1.8 * k;
    return 0.2 * k;
  }

  function isLit(s) { return s.type === 'core' || s.lit === true; }
  function rng(seed) { var x = Math.sin(seed) * 10000; return x - Math.floor(x); }

  function generateFillers(nebula, count, baseLitRatio, seedBase) {
    var out = [];
    var rot = (nebula.rotate || 0) * Math.PI / 180;
    var cs = Math.cos(rot), sn = Math.sin(rot);
    for (var i = 0; i < count; i++) {
      var u = rng(seedBase + i * 7) * 2 * Math.PI;
      var rho = Math.pow(rng(seedBase + i * 11 + 3), 0.62) * 1.08;
      var lx = Math.cos(u) * rho * nebula.rx;
      var ly = Math.sin(u) * rho * nebula.ry;
      var x = lx * cs - ly * sn + nebula.cx;
      var y = lx * sn + ly * cs + nebula.cy;
      var litChance = baseLitRatio * (1 - rho * 0.55);
      var lit = rng(seedBase + i * 13 + 5) < litChance;
      out.push({
        x: Math.round(x),
        y: Math.round(y),
        r: 1.4 + rng(seedBase + i * 17 + 1) * 1.7,
        lit: lit,
        isFiller: true,
      });
    }
    return out;
  }

  // 220 颗暗星散布整张画布 (cosmic 底密度)
  var BG_DOTS = (function () {
    var out = [];
    for (var i = 0; i < 220; i++) {
      out.push({
        x: rng(i * 7 + 1) * 1600,
        y: rng(i * 11 + 3) * 900,
        r: 0.3 + Math.pow(rng(i * 13 + 5), 2.2) * 1.5,
        opacity: 0.05 + rng(i * 17 + 7) * 0.18,
      });
    }
    return out;
  })();

  // ── 星座数据 (与 v1 完全相同) ─────────────────────────────
  var CONSTELLATIONS = [
    // ── A · 5a 高光视频 · 暖金 ───────────────────────────
    {
      id: 'A',
      coreColor: '#f4d4a0', litColor: '#e0b070', lineColor: '#d8a060',
      isCompanion: false,
      nebula: { cx: 510, cy: 410, rx: 290, ry: 235, rotate: 0, grad: 'A' },
      anchors: [
        { x: 380, y: 320, r: 7,   type: 'core' },
        { x: 427, y: 352, r: 4,   lit: true },
        { x: 473, y: 383, r: 3.7, lit: false },
        { x: 520, y: 415, r: 4.2, lit: true },
        { x: 567, y: 447, r: 4,   lit: true },
        { x: 613, y: 478, r: 3.6, lit: false },
        { x: 660, y: 510, r: 6.5, type: 'core' },
        { x: 315, y: 265, r: 3.6, lit: true },
        { x: 300, y: 380, r: 3.3, lit: false },
        { x: 680, y: 555, r: 3.5, lit: false },
        { x: 720, y: 480, r: 3.5, lit: true },
        { x: 435, y: 470, r: 3.2, lit: false },
      ],
      fillerCfg: { count: 44, litRatio: 0.18, seed: 100 },
      lines: [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
        [0, 7], [0, 8],
        [6, 9], [6, 10],
        [2, 11], [4, 11],
      ],
    },

    // ── B · 环 · 5b 符纸配对 · 紫 ─────────────────────────
    {
      id: 'B',
      coreColor: '#d8bce8', litColor: '#b090d0', lineColor: '#a888c8',
      isCompanion: false,
      nebula: { cx: 1180, cy: 340, rx: 290, ry: 290, rotate: 0, grad: 'B' },
      anchors: (function () {
        var a = [];
        a.push({ x: 1180, y: 340, r: 7, type: 'core' });
        var jitAng = [-32, 30, 92, 158, 220, 287];
        var jitR   = [95,  88, 100, 85, 92,  90];
        var ringLit= [true, true, false, true, false, true];
        jitAng.forEach(function (deg, i) {
          var rad = deg * Math.PI / 180;
          a.push({
            x: Math.round(1180 + Math.cos(rad) * jitR[i]),
            y: Math.round(340 + Math.sin(rad) * jitR[i]),
            r: 3.6 + (i % 2) * 0.4,
            lit: ringLit[i],
          });
        });
        return a;
      })(),
      fillerCfg: { count: 48, litRatio: 0.16, seed: 200 },
      lines: [
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
        [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1],
      ],
    },

    // ── C · 密团 · 5c 陪伴 · 暖玫 ─────────────────────────
    {
      id: 'C',
      coreColor: '#f0b8a8', litColor: '#d88878', lineColor: '#c87868',
      isCompanion: false,
      nebula: { cx: 590, cy: 720, rx: 330, ry: 235, rotate: 0, grad: 'C' },
      anchors: [
        { x: 560, y: 700, r: 6.5, type: 'core' },
        { x: 625, y: 722, r: 6,   type: 'core' },
        { x: 587, y: 645, r: 3.7, lit: true },
        { x: 690, y: 705, r: 3.5, lit: true },
        { x: 612, y: 780, r: 3.6, lit: true },
        { x: 505, y: 720, r: 3.4, lit: false },
        { x: 700, y: 760, r: 3.2, lit: false },
        { x: 555, y: 800, r: 3.0, lit: false },
        { x: 475, y: 665, r: 3.1, lit: false },
      ],
      fillerCfg: { count: 44, litRatio: 0.20, seed: 300 },
      lines: [
        [0, 1],
        [0, 2], [0, 5],
        [1, 3], [1, 4],
        [2, 3], [4, 5],
        [3, 6], [4, 7], [5, 8],
      ],
    },

    // ── D · 残缺 · 灰紫 ───
    {
      id: 'D',
      coreColor: '#a0a8c0', litColor: '#80889c', lineColor: '#707888',
      isCompanion: true,
      nebula: { cx: 1300, cy: 630, rx: 200, ry: 175, rotate: 0, grad: 'D' },
      anchors: [
        { x: 1290, y: 625, r: 4.5, type: 'core' },
        { x: 1245, y: 650, r: 3.0, lit: true },
        { x: 1340, y: 655, r: 2.8, lit: false },
        { x: 1265, y: 570, r: 2.7, lit: false },
        { x: 1350, y: 580, r: 2.6, lit: false },
      ],
      fillerCfg: { count: 18, litRatio: 0.10, seed: 400 },
      lines: [
        [0, 1], [0, 2], [1, 3], [2, 4],
      ],
    },

    // ── E · 残缺 · 灰金 ───
    {
      id: 'E',
      coreColor: '#b8a888', litColor: '#90805c', lineColor: '#807050',
      isCompanion: true,
      nebula: { cx: 1020, cy: 200, rx: 195, ry: 165, rotate: 0, grad: 'E' },
      anchors: [
        { x: 1020, y: 200, r: 4.5, type: 'core' },
        { x: 975, y: 235, r: 3.0, lit: true },
        { x: 1070, y: 170, r: 2.8, lit: false },
        { x: 995, y: 145, r: 2.7, lit: false },
        { x: 1095, y: 205, r: 2.6, lit: false },
      ],
      fillerCfg: { count: 18, litRatio: 0.10, seed: 500 },
      lines: [
        [0, 1], [0, 2], [1, 3], [2, 4],
      ],
    },
  ];

  CONSTELLATIONS.forEach(function (con) {
    var f = con.fillerCfg;
    con.fillers = f ? generateFillers(con.nebula, f.count, f.litRatio, f.seed) : [];
  });

  // ── DOM build ─────────────────────────────────────────────
  var bgDotsEl = $('#bg-dots');
  var nebulaeEl = $('#nebulae');
  var linesEl = $('#lines');
  var starsEl = $('#stars');

  var allEls = {
    atmoRect: $('#atmo-rect'),
    bgDots: [],
    whiteWash: $('#white-wash'),
    outsideDarken: $('#outside-darken'),
    phoneOutline: $('#phone-outline'),
    flyStars: { A: $('#fly-A'), B: $('#fly-B'), C: $('#fly-C') },
    byCon: {},   // id → { nebula, coreEls, restGlows, restStars, restLines }
  };

  // OV5 vo elements
  var voLeft  = $('#voLeft');
  var voRight = $('#voRight');

  if (allEls.atmoRect) {
    allEls.atmoRect.style.opacity = '0';
    allEls.atmoRect.style.transition = 'opacity 1.6s cubic-bezier(0.4,0,0.2,1)';
  }

  // Background field
  BG_DOTS.forEach(function (d) {
    var c = el('circle', {
      cx: d.x.toFixed(1), cy: d.y.toFixed(1),
      r: d.r.toFixed(2), fill: '#e8d4b8',
    });
    c.classList.add('bg-dot');
    c.dataset.finalOpacity = d.opacity.toFixed(3);
    bgDotsEl.appendChild(c);
    allEls.bgDots.push(c);
  });

  CONSTELLATIONS.forEach(function (con) {
    // Nebula
    var nebAttrs = {
      cx: con.nebula.cx, cy: con.nebula.cy,
      rx: con.nebula.rx, ry: con.nebula.ry,
      fill: 'url(#nebula-grad-' + con.nebula.grad + ')',
    };
    if (con.nebula.rotate) {
      nebAttrs.transform = 'rotate(' + con.nebula.rotate + ' ' + con.nebula.cx + ' ' + con.nebula.cy + ')';
    }
    var nebEl = el('ellipse', nebAttrs);
    nebEl.classList.add('c-nebula');
    nebulaeEl.appendChild(nebEl);

    var conEntry = {
      nebula: nebEl,
      coreEls: [],       // 主星 (anchor[0]) 的 halo/glow/dot — fly-in 落位时点亮
      restGlows: [],     // 其他星的 halo/glow + lit 填充星的 glow
      restStars: [],     // 其他星的 dot/ring + 所有填充星
      restLines: [],     // 所有连接线
    };
    allEls.byCon[con.id] = conEntry;

    // Anchors
    con.anchors.forEach(function (s, idx) {
      var isPrimaryCore = (idx === 0 && s.type === 'core');
      var lit = isLit(s);
      var glowBucket = isPrimaryCore ? conEntry.coreEls : conEntry.restGlows;
      var starBucket = isPrimaryCore ? conEntry.coreEls : conEntry.restStars;

      if (s.type === 'core') {
        if (!con.isCompanion) {
          var halo = el('circle', {
            cx: s.x, cy: s.y, r: s.r * 4.5,
            fill: con.coreColor, filter: 'url(#star-halo)',
          });
          halo.classList.add('c-star-halo');
          halo.dataset.finalOpacity = '0.22';
          starsEl.appendChild(halo);
          glowBucket.push(halo);
        }
        var glow = el('circle', {
          cx: s.x, cy: s.y, r: s.r * 2.4,
          fill: con.coreColor, filter: 'url(#star-glow)',
        });
        glow.classList.add('c-star-glow');
        glow.dataset.finalOpacity = (con.isCompanion ? 0.22 : 0.38).toFixed(3);
        starsEl.appendChild(glow);
        glowBucket.push(glow);

        var dot = el('circle', {
          cx: s.x, cy: s.y, r: s.r,
          fill: con.isCompanion ? con.coreColor : '#fff8e8',
        });
        dot.classList.add('c-star');
        dot.dataset.finalOpacity = (con.isCompanion ? 0.7 : 1).toFixed(3);
        starsEl.appendChild(dot);
        starBucket.push(dot);
      } else if (lit) {
        var glow2 = el('circle', {
          cx: s.x, cy: s.y, r: s.r * 1.8,
          fill: con.litColor, filter: 'url(#star-soft)',
        });
        glow2.classList.add('c-star-glow');
        glow2.dataset.finalOpacity = (con.isCompanion ? 0.18 : 0.25).toFixed(3);
        starsEl.appendChild(glow2);
        glowBucket.push(glow2);

        var dot2 = el('circle', { cx: s.x, cy: s.y, r: s.r, fill: con.litColor });
        dot2.classList.add('c-star');
        dot2.dataset.finalOpacity = (con.isCompanion ? 0.65 : 0.85).toFixed(3);
        starsEl.appendChild(dot2);
        starBucket.push(dot2);
      } else {
        var ring = el('circle', {
          cx: s.x, cy: s.y, r: s.r,
          fill: 'none', stroke: con.lineColor, 'stroke-width': 1.1,
        });
        ring.classList.add('c-star');
        ring.dataset.finalOpacity = (con.isCompanion ? 0.32 : 0.5).toFixed(3);
        starsEl.appendChild(ring);
        starBucket.push(ring);
      }
    });

    // Fillers (全部入 restGlows / restStars)
    con.fillers.forEach(function (s) {
      var lit = s.lit === true;
      if (lit) {
        var glow2 = el('circle', {
          cx: s.x, cy: s.y, r: s.r * 1.4,
          fill: con.litColor, filter: 'url(#star-soft)',
        });
        glow2.classList.add('c-star-glow');
        glow2.dataset.finalOpacity = (con.isCompanion ? 0.12 : 0.16).toFixed(3);
        starsEl.appendChild(glow2);
        conEntry.restGlows.push(glow2);

        var dot2 = el('circle', { cx: s.x, cy: s.y, r: s.r, fill: con.litColor });
        dot2.classList.add('c-star');
        dot2.dataset.finalOpacity = (con.isCompanion ? 0.5 : 0.65).toFixed(3);
        starsEl.appendChild(dot2);
        conEntry.restStars.push(dot2);
      } else {
        var ring = el('circle', {
          cx: s.x, cy: s.y, r: s.r,
          fill: 'none', stroke: con.lineColor, 'stroke-width': 0.9,
        });
        ring.classList.add('c-star');
        ring.dataset.finalOpacity = (con.isCompanion ? 0.22 : 0.36).toFixed(3);
        starsEl.appendChild(ring);
        conEntry.restStars.push(ring);
      }
    });

    // Lines (全部入 restLines)
    con.lines.forEach(function (ln) {
      var s1 = con.anchors[ln[0]];
      var s2 = con.anchors[ln[1]];
      var isComp = con.isCompanion;
      var w1 = lineWidthAtStar(s1, isComp);
      var w2 = lineWidthAtStar(s2, isComp);
      var d = taperedCurvePath(s1.x, s1.y, s2.x, s2.y, w1, w2);

      var path = el('path', { d: d, fill: con.lineColor, stroke: 'none' });
      if (!isComp) path.setAttribute('filter', 'url(#line-glow)');
      path.classList.add('c-line');
      var bothDim = !isLit(s1) && !isLit(s2);
      path.dataset.finalOpacity = (isComp
        ? (bothDim ? 0.35 : 0.55)
        : (bothDim ? 0.45 : 0.75)).toFixed(3);
      linesEl.appendChild(path);
      conEntry.restLines.push(path);
    });
  });

  // ── Fly-star positions (off-screen 起点 + 主星 stage % 终点) ──
  // A 主星 (380, 320) viewBox → stage (23.75%, 35.56%)
  // B 主星 (1180, 340)      → stage (73.75%, 37.78%)
  // C 主星 (560, 700)       → stage (35.00%, 77.78%)
  var FLY_START = {
    A: { left: '-12%', top: '-15%' },
    B: { left: '112%', top: '-15%' },
    C: { left: '50%',  top: '115%' },
  };
  var FLY_TARGET = {
    A: { left: '23.75%', top: '35.56%' },
    B: { left: '73.75%', top: '37.78%' },
    C: { left: '35.00%', top: '77.78%' },
  };

  function startFly(id) {
    var s = allEls.flyStars[id];
    s.classList.add('flying');
    s.style.left = FLY_TARGET[id].left;
    s.style.top = FLY_TARGET[id].top;
  }
  function landFly(id) {
    var s = allEls.flyStars[id];
    s.classList.remove('flying');
    s.classList.add('landed');
  }
  function dissolveFly(id) {
    var s = allEls.flyStars[id];
    s.classList.remove('landed');
    s.classList.add('dissolving');
  }

  // ── Show/hide ─────────────────────────────────────────────
  function showEl(node) {
    node.style.opacity = node.dataset.finalOpacity || '1';
    node.classList.add('visible');
  }
  function hideEl(node) {
    node.style.opacity = '0';
    node.classList.remove('visible', 'dim-alive');
  }

  function igniteCore(id) {
    allEls.byCon[id].coreEls.forEach(showEl);
  }

  // Stagger 守卫: reset() 时递增, 队列中的 setTimeout 对比 token 决定是否生效.
  var resetTok = 0;

  function growConstellation(id) {
    var c = allEls.byCon[id];
    var myTok = resetTok;
    // t+0: nebula 雾
    showEl(c.nebula);
    // t+200: glows (halo + glow)
    setTimeout(function () {
      if (myTok !== resetTok) return;
      c.restGlows.forEach(showEl);
    }, 200);
    // t+400: stars (dot + ring)
    setTimeout(function () {
      if (myTok !== resetTok) return;
      c.restStars.forEach(showEl);
    }, 400);
    // t+600: lines (连接)
    setTimeout(function () {
      if (myTok !== resetTok) return;
      c.restLines.forEach(showEl);
    }, 600);
  }

  function revealBgDots() {
    var myTok = resetTok;
    allEls.bgDots.forEach(function (d, i) {
      setTimeout(function () {
        if (myTok !== resetTok) return;
        showEl(d);
      }, i * 3);
    });
  }

  function revealAtmo() {
    if (allEls.atmoRect) allEls.atmoRect.style.opacity = '1';
  }

  // ── Timeline ──────────────────────────────────────────────
  function steps() {
    return [
      // ─ 三颗果实星飞入 (1000ms 飞行, stagger 250ms) ─
      { at: 200, run: function () { startFly('A'); } },
      { at: 450, run: function () { startFly('B'); } },
      { at: 700, run: function () { startFly('C'); } },

      // ─ 落位 (.landed flash) + SVG 主星点亮 ─
      { at: 1200, run: function () { landFly('A'); igniteCore('A'); } },
      { at: 1450, run: function () { landFly('B'); igniteCore('B'); } },
      { at: 1700, run: function () { landFly('C'); igniteCore('C'); } },

      // ─ fly-star dissolve (主星接管, fly-star 自然淡掉) ─
      { at: 1400, run: function () { dissolveFly('A'); } },
      { at: 1650, run: function () { dissolveFly('B'); } },
      { at: 1900, run: function () { dissolveFly('C'); } },

      // ─ 三主星云内部生长 (nebula→glow→star→line, 200ms 一档) ─
      { at: 1500, run: function () { growConstellation('A'); } },
      { at: 1750, run: function () { growConstellation('B'); } },
      { at: 2000, run: function () { growConstellation('C'); } },

      // ─ 残缺 D + E (companion) 一起浮起 ─
      { at: 2400, run: function () {
        growConstellation('D');
        growConstellation('E');
      } },

      // ─ 220 颗背景星点 (内部 stagger 3ms ≈ 660ms 铺完) ─
      { at: 2700, run: revealBgDots },

      // ─ atmo 暖深底色 (在白曝光接管前给个垫底) ─
      { at: 3000, run: revealAtmo },

      // ─ 三件事错峰: 手机轮廓 → 外暗 → 白曝光 ─
      //   T=2800: phone-outline 1800ms (done 4600) — 轮廓先浮起, 框先到位
      //   T=3500: outside-darken 2800ms (done 6300) — 框外开始压暗
      //   T=5000: white-wash 3000ms (done 8000) — 内白最后, 给读"框 + 暗外"的时间
      { at: 2800, run: function () { allEls.phoneOutline.classList.add('rising'); } },
      { at: 3500, run: function () { allEls.outsideDarken.classList.add('rising'); } },
      { at: 5000, run: function () { allEls.whiteWash.classList.add('rising'); } },

      // OV5: 「你与他的 / 专属记忆」— 与外暗 (3500) + 手机轮廓 (2800) 同步成型后浮起.
      // 4500 进 / 8500 DURATION 自然带走 (07 接管).
      { at: 4500, run: function () {
          voLeft.classList.add('visible');
          voRight.classList.add('visible');
      }},
    ];
  }

  function reset() {
    resetTok++;

    if (allEls.atmoRect) allEls.atmoRect.style.opacity = '0';
    allEls.bgDots.forEach(hideEl);
    Object.keys(allEls.byCon).forEach(function (id) {
      var c = allEls.byCon[id];
      hideEl(c.nebula);
      c.coreEls.forEach(hideEl);
      c.restGlows.forEach(hideEl);
      c.restStars.forEach(hideEl);
      c.restLines.forEach(hideEl);
    });

    // White-out trio — 取消 transition + 强制 opacity 0 完成 "snap reset",
    // 然后清回 inline 空串, 让后续 .rising 的 CSS opacity:1 能生效 (inline 不压
    // class). 关键: 必须把 inline opacity 也清回 '', 否则 inline 0 会一直压住
    // .rising 的 1, 白爆/外暗/手机轮廓都涨不上来.
    [allEls.whiteWash, allEls.outsideDarken, allEls.phoneOutline].forEach(function (e) {
      e.classList.remove('rising');
      e.style.transition = 'none';
      e.style.opacity = '0';
    });
    void allEls.whiteWash.offsetWidth;
    [allEls.whiteWash, allEls.outsideDarken, allEls.phoneOutline].forEach(function (e) {
      e.style.transition = '';
      e.style.opacity = '';
    });

    // Fly-stars: 回画外起点, 无 transition
    Object.keys(allEls.flyStars).forEach(function (id) {
      var s = allEls.flyStars[id];
      s.classList.remove('flying', 'landed', 'dissolving');
      s.style.transition = 'none';
      s.style.left = FLY_START[id].left;
      s.style.top = FLY_START[id].top;
      s.style.opacity = '';
      s.style.transform = '';
    });
    void allEls.flyStars.A.offsetWidth;
    Object.keys(allEls.flyStars).forEach(function (id) {
      allEls.flyStars[id].style.transition = '';
    });

    // OV5
    voLeft.classList.remove('visible');
    voRight.classList.remove('visible');
  }

  EchoStage.mount({
    stage: $('#stage'),
    title: '06 · 记忆人格星图',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();
