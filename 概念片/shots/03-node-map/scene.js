// Beat 03 · AI 导演节点图
//
// Phase 3.1 (0-2.5s): three screens zoom in & fade out → reveal node map behind
// Phase 3.2 (1.5s+): streaming node map reveal (shifted +1500ms from original)
(function () {
  var DURATION = 8000;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var SHIFT = 1500;

  // ── Phone overlay geometry (matches Beat 02 end state) ──────────────────
  var PHONE = EchoConstants.PHONE;
  var PHONES = [
    { id: 'a', cx: 300,  cy: PHONE.cy, w: PHONE.w, h: PHONE.h, r: PHONE.r },
    { id: 'b', cx: PHONE.cx, cy: PHONE.cy, w: PHONE.w, h: PHONE.h, r: PHONE.r },
    { id: 'c', cx: 1300, cy: PHONE.cy, w: PHONE.w, h: PHONE.h, r: PHONE.r },
  ];

  // ── Node map stars ──────────────────────────────────────────────────────
  var STARS = [
    { x: 170,  y: 450 },
    { x: 560,  y: 440 },
    { x: 960,  y: 458 },
    { x: 1360, y: 445 },
    { x: 1500, y: 225 },
    { x: 1535, y: 360 },
    { x: 1555, y: 560 },
    { x: 1575, y: 685 },
    { x: 1810, y: 190 },
    { x: 1830, y: 320 },
    { x: 1820, y: 448 },
    { x: 1840, y: 580 },
    { x: 1825, y: 715 },
    { x: 1920, y: 255 },
    { x: 1945, y: 400 },
    { x: 1935, y: 610 },
    { x: 1915, y: 720 },
    { x: 2260, y: 195 },
    { x: 2280, y: 345 },
    { x: 2270, y: 555 },
    { x: 2290, y: 680 },
    { x: 2580, y: 145 },
    { x: 2600, y: 285 },
    { x: 2590, y: 515 },
    { x: 2610, y: 645 },
  ];

  var INIT_SEGS = [
    { s: 0, e: 1, lines: [
      { midY: 240,  sm: [0.35] },
      { midY: 310,  sm: [0.40, 0.72] },
      { midY: 370,  sm: [0.38] },
      { midY: 445,  sm: [0.50] },
      { midY: 520,  sm: [0.42] },
      { midY: 590,  sm: [0.38, 0.75] },
      { midY: 660,  sm: [0.35] },
    ]},
    { s: 1, e: 2, lines: [
      { midY: 195,  sm: [0.32] },
      { midY: 265,  sm: [0.38, 0.72] },
      { midY: 335,  sm: [0.45] },
      { midY: 400,  sm: [0.28] },
      { midY: 455,  sm: [0.52] },
      { midY: 510,  sm: [0.35] },
      { midY: 580,  sm: [0.42, 0.73] },
      { midY: 645,  sm: [0.38] },
      { midY: 715,  sm: [0.30, 0.68] },
    ]},
    { s: 2, e: 3, lines: [
      { midY: 280,  sm: [0.30, 0.62] },
      { midY: 340,  sm: [0.45] },
      { midY: 400,  sm: [0.38] },
      { midY: 455,  sm: [0.50] },
      { midY: 515,  sm: [0.42] },
      { midY: 575,  sm: [0.35] },
      { midY: 640,  sm: [0.40, 0.68] },
    ]},
  ];

  var GROWTH = [
    { parent: 2,  children: [4, 5, 6, 7] },
    { parent: 3,  children: [8, 9, 10, 11, 12] },
    { parent: 5,  children: [13, 14] },
    { parent: 6,  children: [15, 16] },
    { parent: 9,  children: [17, 18] },
    { parent: 11, children: [19, 20] },
    { parent: 17, children: [21, 22] },
    { parent: 19, children: [23, 24] },
  ];

  var WAVE_COLORS = [
    'rgba(255, 235, 200, 0.95)',
    'rgba(255, 215, 205, 0.95)',
    'rgba(240, 215, 235, 0.94)',
    'rgba(237, 212, 235, 0.93)',
    'rgba(225, 205, 240, 0.92)',
    'rgba(222, 202, 240, 0.91)',
    'rgba(210, 195, 238, 0.90)',
    'rgba(208, 192, 236, 0.89)',
  ];

  var GROWTH_SM = [
    [[0.45], [0.4, 0.75], [0.5], [0.45]],
    [[0.42], [0.38, 0.72], [0.5], [0.45], [0.42]],
    [[0.45], [0.5]],
    [[0.48], [0.45]],
    [[0.42], [0.48]],
    [[0.45], [0.5]],
    [],
    [],
  ];

  // ── Setup phone overlay ────────────────────────────────────────────────
  var $ = function (s) { return document.querySelector(s); };
  var phoneOverlay = $('#phone-overlay');

  PHONES.forEach(function (p) {
    var path = EchoCurves.phoneOutline(p.cx, p.cy, p.w, p.h, p.r);
    $('#phone-out-' + p.id).setAttribute('d', path);
    $('#phone-int-' + p.id).setAttribute('d', path);
  });

  // ── Node map helpers ───────────────────────────────────────────────────
  var mapGroup = $('#map-group');
  var connsG    = $('#connections');
  var dotsG     = $('#dots');

  function mk(tag, attrs, cls, parent) {
    var el = document.createElementNS(SVG_NS, tag);
    if (cls) el.setAttribute('class', cls);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    parent.appendChild(el);
    return el;
  }

  function drawDur(dy) {
    return Math.round(800 + Math.abs(dy) * 3.5);
  }

  function fanBezier(a, b, midY) {
    var dx = b.x - a.x;
    return 'M ' + a.x + ' ' + a.y +
           ' C ' + (a.x + dx * 0.38) + ' ' + midY +
           ' ' + (b.x - dx * 0.38) + ' ' + midY +
           ' ' + b.x + ' ' + b.y;
  }

  function growthBezier(parent, child) {
    var dx = child.x - parent.x;
    return 'M ' + parent.x + ' ' + parent.y +
           ' C ' + (parent.x + dx * 0.38) + ' ' + parent.y +
           ' ' + (child.x - dx * 0.38) + ' ' + child.y +
           ' ' + child.x + ' ' + child.y;
  }

  function bezierPt(t, p0, p1, p2, p3) {
    var u = 1 - t;
    return {
      x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
      y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
    };
  }

  // ── Create node map elements ───────────────────────────────────────────
  var largeDots = STARS.map(function (s) {
    return mk('circle', { cx: s.x, cy: s.y, r: 9 }, 'node-dot-lg', dotsG);
  });

  var smallDots = [];
  var allConns = [];

  INIT_SEGS.forEach(function (seg) {
    var a = STARS[seg.s];
    var b = STARS[seg.e];
    var centerY = (a.y + b.y) / 2;
    seg.lines.forEach(function (line) {
      var d = fanBezier(a, b, line.midY);
      var path = mk('path', { d: d }, 'conn-line', connsG);
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      var dur = drawDur(line.midY - centerY);
      path.style.transition = 'opacity 0.7s cubic-bezier(0.4,0,0.2,1), stroke-dashoffset ' + dur + 'ms cubic-bezier(0.16,1,0.3,1)';
      allConns.push({ el: path, len: len });

      var cp1 = { x: a.x + (b.x - a.x) * 0.38, y: line.midY };
      var cp2 = { x: b.x - (b.x - a.x) * 0.38, y: line.midY };
      line.sm.forEach(function (t) {
        var pt = bezierPt(t, a, cp1, cp2, b);
        mk('circle', { cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: 4 }, 'node-dot node-dot-sm', dotsG);
        smallDots.push(dotsG.lastElementChild);
      });
    });
  });

  var growthData = [];
  var growthSmallDots = [];

  GROWTH.forEach(function (g, gi) {
    var parent = STARS[g.parent];
    var color = WAVE_COLORS[gi];
    g.children.forEach(function (ci, j) {
      var child = STARS[ci];
      var d = growthBezier(parent, child);
      var path = mk('path', { d: d }, 'conn-growth', connsG);
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.stroke = color;
      var dur = drawDur(child.y - parent.y);
      path.style.transition = 'opacity 0.6s cubic-bezier(0.4,0,0.2,1), stroke-dashoffset ' + dur + 'ms cubic-bezier(0.16,1,0.3,1)';
      growthData.push({ el: path, len: len });

      var smList = GROWTH_SM[gi] && GROWTH_SM[gi][j] ? GROWTH_SM[gi][j] : [];
      smList.forEach(function (t) {
        var cp1 = { x: parent.x + (child.x - parent.x) * 0.38, y: parent.y };
        var cp2 = { x: child.x - (child.x - parent.x) * 0.38, y: child.y };
        var pt = bezierPt(t, parent, cp1, cp2, child);
        var dot = mk('circle', { cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: 3.5 }, 'node-dot node-dot-sm', dotsG);
        growthSmallDots.push(dot);
      });
    });
  });

  // ── Camera: single smooth path, focus → pull-back + pan right → push-in to terminal ──
  // (cx, cy) maps to screen center (800, 450). cx/cy ease InOut monotonically; scale
  // follows a parabolic dip so pull-back/push-in is one continuous motion, no segment seam.
  var zoomRaf = null;
  var ZOOM_DUR = 4400;
  var CAM_START = { s: 1.15, cx: 765,  cy: 445 };  // 紧贴 STAR[0..3] 主干一排
  var CAM_END   = { s: 0.95, cx: 2595, cy: 395 };  // 推入末端簇 STAR[21..24] 几何中心
  var CAM_DIP   = 0.25;                             // 中段拉远幅度,min scale ≈ 0.80
  var zoomStartTime = 0;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function sampleCam(t) {
    var ep = easeInOutCubic(t);
    return {
      s:  CAM_START.s + ep * (CAM_END.s - CAM_START.s) - CAM_DIP * 4 * ep * (1 - ep),
      cx: CAM_START.cx + ep * (CAM_END.cx - CAM_START.cx),
      cy: CAM_START.cy + ep * (CAM_END.cy - CAM_START.cy),
    };
  }

  function startZoom() {
    zoomStartTime = performance.now();
    (function tick() {
      var elapsed = performance.now() - zoomStartTime;
      var t = Math.min(elapsed / ZOOM_DUR, 1);
      var k = sampleCam(t);
      mapGroup.setAttribute('transform',
        'translate(800,450) scale(' + k.s.toFixed(4) + ') translate(' + (-k.cx).toFixed(1) + ',' + (-k.cy).toFixed(1) + ')'
      );
      if (t < 1) zoomRaf = requestAnimationFrame(tick);
    })();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  function drawConns(list) {
    list.forEach(function (c) { c.el.classList.add('drawn'); c.el.style.strokeDashoffset = '0'; });
  }
  function showDots(arr, indices) {
    indices.forEach(function (i) { arr[i].classList.add('visible'); });
  }
  function range(arr, from, to) {
    var out = [];
    for (var i = from; i < to && i < arr.length; i++) out.push(arr[i]);
    return out;
  }

  // ── Reset ──────────────────────────────────────────────────────────────
  function reset() {
    if (zoomRaf) { cancelAnimationFrame(zoomRaf); zoomRaf = null; }
    // Phone overlay
    phoneOverlay.classList.remove('zooming', 'hidden');
    phoneOverlay.style.display = '';
    // Node map
    mapGroup.removeAttribute('transform');
    mapGroup.classList.remove('emerging', 'focusing', 'breathing');
    largeDots.forEach(function (el) { el.classList.remove('visible'); });
    smallDots.forEach(function (el) { el.classList.remove('visible'); });
    growthSmallDots.forEach(function (el) { el.classList.remove('visible'); });
    allConns.forEach(function (c) {
      c.el.classList.remove('drawn');
      c.el.style.strokeDashoffset = c.len;
    });
    growthData.forEach(function (c) {
      c.el.classList.remove('drawn');
      c.el.style.strokeDashoffset = c.len;
    });
  }

  // ── Timeline ───────────────────────────────────────────────────────────
  function steps() {
    return [
      // ── Phase 3.1: phone overlay zoom & fade ──
      { at: 300,  run: function () { phoneOverlay.classList.add('zooming'); }},
      { at: 2800, run: function () { phoneOverlay.classList.add('hidden'); }},

      // ── Phase 3.2: node map (shifted +SHIFT from original timings) ──
      { at: 0 + SHIFT,    run: function () { mapGroup.classList.add('emerging'); }},
      { at: 250 + SHIFT,  run: function () { largeDots[0].classList.add('visible'); }},
      { at: 500 + SHIFT,  run: function () { drawConns(range(allConns, 0, 7)); }},
      { at: 1050 + SHIFT, run: function () {
        largeDots[1].classList.add('visible');
        drawConns(range(allConns, 7, 16));
      }},
      { at: 1100 + SHIFT, run: function () { range(smallDots, 0, 7).forEach(function (el) { el.classList.add('visible'); }); }},
      { at: 1600 + SHIFT, run: function () {
        largeDots[2].classList.add('visible');
        drawConns(range(allConns, 16, 23));
      }},
      { at: 1650 + SHIFT, run: function () { range(smallDots, 7, 16).forEach(function (el) { el.classList.add('visible'); }); }},

      // Wave 1 + zoom start
      { at: 1700 + SHIFT, run: function () {
        showDots(largeDots, [4, 5, 6, 7]);
        drawConns(range(growthData, 0, 4));
        startZoom();
      }},
      { at: 1750 + SHIFT, run: function () { range(smallDots, 16).forEach(function (el) { el.classList.add('visible'); }); }},

      { at: 2000 + SHIFT, run: function () { mapGroup.classList.add('focusing'); }},
      { at: 2200 + SHIFT, run: function () { largeDots[3].classList.add('visible'); }},
      { at: 2350 + SHIFT, run: function () {
        showDots(largeDots, [8, 9, 10, 11, 12]);
        drawConns(range(growthData, 4, 9));
      }},
      { at: 2450 + SHIFT, run: function () { range(growthSmallDots, 0, 6).forEach(function (el) { el.classList.add('visible'); }); }},
      { at: 3100 + SHIFT, run: function () {
        showDots(largeDots, [13, 14, 15, 16]);
        drawConns(range(growthData, 9, 13));
      }},
      { at: 3200 + SHIFT, run: function () { range(growthSmallDots, 6, 12).forEach(function (el) { el.classList.add('visible'); }); }},
      { at: 3700 + SHIFT, run: function () {
        showDots(largeDots, [17, 18, 19, 20]);
        drawConns(range(growthData, 13, 17));
      }},
      { at: 3900 + SHIFT, run: function () { range(growthSmallDots, 12, 18).forEach(function (el) { el.classList.add('visible'); }); }},
      { at: 4300 + SHIFT, run: function () {
        showDots(largeDots, [21, 22, 23, 24]);
        drawConns(range(growthData, 17, 21));
      }},
      { at: 4500 + SHIFT, run: function () { range(growthSmallDots, 18).forEach(function (el) { el.classList.add('visible'); }); }},
      { at: 5000 + SHIFT, run: function () { mapGroup.classList.add('breathing'); }},
    ];
  }

  EchoStage.mount({
    stage: $('#stage'),
    title: '03 · AI 导演节点图',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();