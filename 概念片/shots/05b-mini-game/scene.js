// Beat 05b · 互动小游戏 · 符纸配对 (纯视频示意, 不做真交互).
//
// 接续 05a 末态: phone-outline opacity:1 + outside-darken 0.95 + 内部黑底. 全程不动.
// 时间轴 (DURATION 7500):
//    200–950   6 张符纸 drift-in (上排 -120px → 0; 下排 +120px → 0; 150ms 错峰)
//   1700       错配 highlight: mem-1 + tok-B
//   1900       描入 line-err-1B (480ms 对角)
//   2400       fizzle err 线 + 两卡 shake
//   2700       两卡翻回背面 (inline rotateY 0→180, 320ms)
//   3220       翻回面 (inline rotateY 180→360, 320ms)
//   3570       清 inline transform (无视觉跳, 因 360≡0)
//   3650       正确 highlight: mem-1 + tok-A
//   3800       描入 cor1A (360ms 竖直)
//   4180       tok-A 内符号脱卡 + 飞行信物 A: tok-A → mem-1 (480ms)
//   4680       mem-1 receive 脉冲 (520ms) + flying dissolving (240ms)
//   4920       mem-1/tok-A gone + cor1A fizzle
//   5200       正确 highlight: mem-2 + tok-B (节奏更快)
//   5350       描入 cor2B (300ms)
//   5670       tok-B 脱卡 + 飞行信物 B: tok-B → mem-2 (480ms)
//   6170       mem-2 receive + dissolving
//   6410       mem-2/tok-B gone + cor2B fizzle
//   6600       第 3 对 highlight: mem-3 + tok-C
//   6700       描入 partial tail3C (700ms 走到 35% — 余下 65% 永不到, 因为 6900 outro)
//   6900       画面被切走: 剩余卡 outro (向上 + 淡) + tail3C fizzle
//   7500       END (phone + darken 仍在, 5c 可接)
(function () {
  const DURATION = 7500;
  const PHONE = EchoConstants.PHONE;

  const $ = (sel) => document.querySelector(sel);

  // 手机轮廓 + mask interior (沿用 05a setup).
  const phoneOutline = $('#phone-outline');
  const phoneInterior = $('#phone-interior');
  const phonePath = EchoCurves.phoneOutline(PHONE.cx, PHONE.cy, PHONE.w, PHONE.h, PHONE.r);
  phoneOutline.setAttribute('d', phonePath);
  phoneInterior.setAttribute('d', phonePath);

  // 卡 / 墨线 / 飞行信物.
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

  // 卡中心 (stage %) — 飞行信物落点用. 同 HTML 内 inline style:
  // mem 排 top:30%, tok 排 top:64% (比初版各靠中线 8%); tok 横向重排为 B/C/A (下1/下2/下3)
  // 让正确对儿全部对角 (①+A / ②+B / ③+C).
  const cardPos = {
    'mem-1': { left: '41%', top: '30%' },
    'mem-2': { left: '50%', top: '30%' },
    'mem-3': { left: '59%', top: '30%' },
    'tok-A': { left: '59%', top: '64%' },  // 下-3 (右)
    'tok-B': { left: '41%', top: '64%' },  // 下-1 (左)
    'tok-C': { left: '50%', top: '64%' },  // 下-2 (中)
  };

  // 信物 svg 模板 (从 tok 卡 front svg 抓取, 飞行实例视觉一致).
  const tokenSvgHtml = {
    A: cards['tok-A'].querySelector('.charm-card-front').innerHTML,
    B: cards['tok-B'].querySelector('.charm-card-front').innerHTML,
    C: cards['tok-C'].querySelector('.charm-card-front').innerHTML,
  };

  // 墨线初始态: 同步设 dasharray = totalLength 并把 offset 推到 length (隐藏).
  // (5 条契约 §2 — SVG 初始态铁律: 同步设, 不挂 transition.)
  function initLines() {
    Object.values(lines).forEach((ln) => {
      const len = ln.getTotalLength();
      ln.style.transition = 'none';
      ln.style.strokeDasharray = len;
      ln.style.strokeDashoffset = len;
    });
  }
  initLines();

  function reset() {
    Object.values(cards).forEach((c) => {
      c.classList.remove(
        'visible', 'selected', 'receive', 'shake', 'gone', 'outro', 'tok-detach'
      );
      const inner = c.querySelector('.charm-card-inner');
      inner.style.transition = '';
      inner.style.transform = '';
    });
    Object.values(lines).forEach((ln) => {
      ln.classList.remove('drawing', 'fizzle');
    });
    initLines();
    flying.classList.remove('armed', 'dissolving');
    flying.innerHTML = '';
    flying.style.transition = 'none';
    flying.style.left = '';
    flying.style.top = '';
  }

  // 描入墨线: 同步 reset dashoffset = len, rAF 后挂 transition 把 offset 推到 0.
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
  // 描到 frac 比例后就停 (第 3 对悬念尾用).
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

  // 翻面: 一次性 inline 控 rotateY (0→180 翻到背, hold, 180→360 转回正面, 清).
  // 用 inline 是为了避免 .selected 等其他 class 改 transform 时的冲突.
  function flipCycle(card) {
    const inner = card.querySelector('.charm-card-inner');
    inner.style.transition = 'transform 320ms cubic-bezier(.6, .2, .4, 1)';
    inner.style.transform = 'rotateY(180deg)';
    setTimeout(() => { inner.style.transform = 'rotateY(360deg)'; }, 520);
    setTimeout(() => {
      inner.style.transition = 'none';
      inner.style.transform = '';
      // 还原 transition 给后续 .selected/.receive 的 box-shadow/transform 用.
      requestAnimationFrame(() => { inner.style.transition = ''; });
    }, 870);
  }

  // 飞行信物: 从 fromCardId 中心过渡到 toCardId 中心.
  function flyToken(tokenKey, fromCardId, toCardId) {
    flying.innerHTML = `<svg viewBox="0 0 40 50" aria-hidden="true">${tokenSvgHtml[tokenKey]}</svg>`;
    flying.classList.remove('armed', 'dissolving');
    flying.style.transition = 'none';
    flying.style.left = cardPos[fromCardId].left;
    flying.style.top  = cardPos[fromCardId].top;
    void flying.offsetWidth;  // 强制 layout sync, 让下一步的 left/top 变化触发 transition.
    flying.style.transition = '';
    flying.classList.add('armed');
    requestAnimationFrame(() => {
      flying.style.left = cardPos[toCardId].left;
      flying.style.top  = cardPos[toCardId].top;
    });
  }

  function steps() {
    return [
      // — drift-in (6 张错峰 150ms) —
      { at:  200, run: () => cards['mem-1'].classList.add('visible') },
      { at:  350, run: () => cards['mem-2'].classList.add('visible') },
      { at:  500, run: () => cards['mem-3'].classList.add('visible') },
      { at:  650, run: () => cards['tok-A'].classList.add('visible') },
      { at:  800, run: () => cards['tok-B'].classList.add('visible') },
      { at:  950, run: () => cards['tok-C'].classList.add('visible') },

      // — 错配演示: ① + B —
      { at: 1700, run: () => {
          cards['mem-1'].classList.add('selected');
          cards['tok-B'].classList.add('selected');
        }
      },
      { at: 1900, run: () => drawLine(lines.err1B, 480) },
      { at: 2400, run: () => {
          fizzleLine(lines.err1B);
          cards['mem-1'].classList.add('shake');
          cards['tok-B'].classList.add('shake');
        }
      },
      { at: 2700, run: () => {
          cards['mem-1'].classList.remove('shake', 'selected');
          cards['tok-B'].classList.remove('shake', 'selected');
          flipCycle(cards['mem-1']);
          flipCycle(cards['tok-B']);
        }
      },

      // — 第一对正确: ① + A (flipCycle 在 3570 清完 inline transform, 这里安全 select) —
      { at: 3650, run: () => {
          cards['mem-1'].classList.add('selected');
          cards['tok-A'].classList.add('selected');
        }
      },
      { at: 3800, run: () => drawLine(lines.cor1A, 360) },
      { at: 4180, run: () => {
          cards['tok-A'].classList.add('tok-detach');
          flyToken('A', 'tok-A', 'mem-1');
        }
      },
      { at: 4680, run: () => {
          cards['mem-1'].classList.add('receive');
          flying.classList.add('dissolving');
        }
      },
      { at: 4920, run: () => {
          cards['mem-1'].classList.add('gone');
          cards['tok-A'].classList.add('gone');
          fizzleLine(lines.cor1A);
        }
      },

      // — 第二对正确: ② + B (节奏更快) —
      { at: 5200, run: () => {
          cards['mem-2'].classList.add('selected');
          cards['tok-B'].classList.add('selected');
        }
      },
      { at: 5350, run: () => drawLine(lines.cor2B, 300) },
      { at: 5670, run: () => {
          cards['tok-B'].classList.add('tok-detach');
          flyToken('B', 'tok-B', 'mem-2');
        }
      },
      { at: 6170, run: () => {
          cards['mem-2'].classList.add('receive');
          flying.classList.add('dissolving');
        }
      },
      { at: 6410, run: () => {
          cards['mem-2'].classList.add('gone');
          cards['tok-B'].classList.add('gone');
          fizzleLine(lines.cor2B);
        }
      },

      // — 第 3 对悬念尾: ③ + C 刚被点按、墨线刚起头, 画面被切走 —
      { at: 6600, run: () => {
          cards['mem-3'].classList.add('selected');
          cards['tok-C'].classList.add('selected');
        }
      },
      { at: 6700, run: () => drawLinePartial(lines.tail3C, 700, 0.35) },
      { at: 6900, run: () => {
          cards['mem-3'].classList.add('outro');
          cards['tok-C'].classList.add('outro');
          lines.tail3C.classList.add('fizzle');
        }
      },
      // 末态 (7500): 卡都 gone/outro, 线都 fizzle, phone + darken 仍在. 5c 可接.
    ];
  }

  EchoStage.mount({
    stage: $('#stage'),
    title: '05b · 互动小游戏',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();
