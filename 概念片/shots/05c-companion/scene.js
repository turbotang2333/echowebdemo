// Beat 05c · 角色陪伴互动 · "长按抚摸 → 满足条"
//
// 展示一个最简单直接的交互机制. 不接事件, 时间轴自动演:
//   提示文字 → 满足条入场 → 手指光点演示 → 立绘 4 阶 pose 递进 + 满足条同步涨满
//   → 涨满后心形图标点亮 + 飘心散出 → 整段淡出.
//
// 立绘 = src/images/xiaohuli.png. pose 通过 .echo-char-frame[data-pose] 触发
// brightness/saturate/hue-rotate + scale + translateY 差分 (数值直接对齐主线
// style.css §.character[data-pose]). 后续给真表情差分 PNG 时, 加 4 个 img 用
// data-pose 切换 src 即可, emotion / 满足条 / 飘心 与 pose 解耦.
//
// 时间轴 (DURATION 10000):
//    200  scene wash 浮起 (紫调暗)
//    800  立绘 (neutral)
//   1500  提示 "长按抚摸" 淡入
//   2000  满足条 frame 浮起 (空条 + 心形 dim)
//   2900  提示淡出 + 手指光点 + 涟漪开始 (圆环错相位)
//   3000  阶 1: pose=soft,   sat 0→25%,   emotion 0.15
//   4300  阶 2: pose=relax,  sat 25→50%,  emotion 0.32
//   5600  阶 3: pose=squint, sat 50→75%,  emotion 0.50
//   6900  阶 4: pose=bliss,  sat 75→100%, emotion 0 (退场), 立绘外圈柔光 burst
//   7700  心形图标点亮 (is-full) + 飘心散出
//   8800  手指光点淡出
//   9400  整段 .gone 淡出
//  10000  END
(function () {
  const DURATION = 10000;

  // 沿用 04/05a 的手机几何.
  const PHONE = EchoConstants.PHONE;

  const $ = (sel) => document.querySelector(sel);
  const stage     = $('#stage');
  const scene     = $('#scene');
  const charFrame = $('#char-frame');
  const charGlow  = $('#char-glow');
  const emotion   = $('#emotion');
  const touch     = $('#touch');
  const satBar    = $('#sat-bar');
  const satFill   = $('#sat-fill');
  const hint      = $('#hint');
  const hearts    = [$('#heart-1'), $('#heart-2'), $('#heart-3')];

  // 手机路径 — 与 04/05a 同步.
  const phonePath = EchoCurves.phoneOutline(PHONE.cx, PHONE.cy, PHONE.w, PHONE.h, PHONE.r);
  $('#phone-outline').setAttribute('d', phonePath);
  $('#phone-interior').setAttribute('d', phonePath);

  function setPose(name) {
    if (name) charFrame.setAttribute('data-pose', name);
    else charFrame.removeAttribute('data-pose');
  }

  function retriggerHearts() {
    hearts.forEach((el) => {
      el.classList.remove('is-float');
      // 强制回流, 再加类才能重新跑 animation
      // eslint-disable-next-line no-unused-expressions
      void el.offsetWidth;
      el.classList.add('is-float');
    });
  }

  function reset() {
    stage.classList.remove('gone');
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
  }

  function steps() {
    return [
      // 0.2s 紫调 wash 浮起
      { at:  200, run: () => scene.classList.add('visible') },
      // 0.8s 立绘 (neutral)
      { at:  800, run: () => charFrame.classList.add('visible') },
      // 1.5s 提示文字
      { at: 1500, run: () => hint.classList.add('visible') },
      // 2.0s 满足条 frame
      { at: 2000, run: () => satBar.classList.add('visible') },
      // 2.9s 提示淡出 + 手指上来
      { at: 2900, run: () => {
          hint.classList.remove('visible');
          touch.classList.add('visible');
        }
      },
      // 3.0s 阶 1: soft + 25% + 开始 sway (轻微位移/转动)
      { at: 3000, run: () => {
          setPose('soft');
          charFrame.classList.add('is-swaying');
          satFill.style.width = '25%';
          emotion.style.opacity = '0.15';
        }
      },
      // 4.3s 阶 2: relax + 50%
      { at: 4300, run: () => {
          setPose('relax');
          satFill.style.width = '50%';
          emotion.style.opacity = '0.32';
        }
      },
      // 5.6s 阶 3: squint + 75%
      { at: 5600, run: () => {
          setPose('squint');
          satFill.style.width = '75%';
          emotion.style.opacity = '0.50';
        }
      },
      // 6.9s 阶 4: bliss + 100% + 外圈柔光 burst, emotion 退, sway 停 (定格在 bliss)
      { at: 6900, run: () => {
          setPose('bliss');
          charFrame.classList.remove('is-swaying');
          satFill.style.width = '100%';
          emotion.style.opacity = '0';
          charGlow.classList.add('visible', 'is-burst');
        }
      },
      // 7.7s 满 — 心形点亮 + 飘心散出
      { at: 7700, run: () => {
          satBar.classList.add('is-full');
          retriggerHearts();
        }
      },
      // 8.8s 手指淡出 (留 bliss 立绘 + 满条停留)
      { at: 8800, run: () => touch.classList.remove('visible') },
      // 9.4s 整段淡出
      { at: 9400, run: () => stage.classList.add('gone') },
    ];
  }

  EchoStage.mount({
    stage: stage,
    title: '05c · 角色陪伴互动',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();
