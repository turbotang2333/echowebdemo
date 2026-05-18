// Beat 05a · 高光视频 · "他记得"
//
// 移植主线 demo 时空门 (js/portal.js + style.css §portal-host) 三阶段效果. 关键差异:
// - 不可点击 — 时间轴驱动 (主线靠用户点击, 这里光晕浮起停留 ~2s 自动开门)
// - 视频强制 muted (浏览器 autoplay 策略 + 5a/5b/5c 共用同一只占位视频, 不带声)
// - 不等 video 'ended' — 时间轴到 6400ms 强制 closing, 截 ~3.5s 视频可见窗
// - 全程在手机轮廓内 — portal-host 在 underlay, 套在手机内部矩形, 外面被 outside-darken 遮住
//
// 接续 04 末态: phone-outline + outside-darken 0.95 沿用不变, 内部黑底 (用户选 A 方案).
//
// 时间轴 (DURATION 9000):
//    200  add .visible   → 光晕入场 (transform 900ms / opacity 800ms) + 呼吸 5.2s 循环
//   2200  add .opening   → clip-path 0 → 150% 扩张 700ms + video.play() (muted)
//   6400  swap → .closing → clip-path 缩回入口 700ms + 光晕回浮 (视频可见窗 ~3.5s)
//                          (entry 200ms 延迟后 360ms 淡回 opacity:0.9, 约 6960 完全回浮)
//   8500  add .gone      → 光晕回浮后停 ~1.5s, 整组 480ms 淡出
//   9000  END
(function () {
  const DURATION = 9000;

  // 沿用 04 的手机几何.
  const PHONE = EchoConstants.PHONE;

  const $ = (sel) => document.querySelector(sel);
  const phoneOutline = $('#phone-outline');
  const phoneInterior = $('#phone-interior');
  const host = $('#portal-host');
  const video = $('#portal-video');

  // 手机路径 — 同时设 outline (stroke) 和 mask 的 interior (fill 抠出内部).
  const phonePath = EchoCurves.phoneOutline(PHONE.cx, PHONE.cy, PHONE.w, PHONE.h, PHONE.r);
  phoneOutline.setAttribute('d', phonePath);
  phoneInterior.setAttribute('d', phonePath);

  function reset() {
    host.classList.remove('visible', 'opening', 'closing', 'gone');
    try {
      video.pause();
      video.currentTime = 0;
    } catch {}
  }

  function steps() {
    return [
      { at:  200, run: () => host.classList.add('visible') },
      { at: 2200, run: () => {
          host.classList.add('opening');
          video.muted = true;
          video.play().catch((err) => {
            console.warn('[05a] video.play() failed', err);
          });
        }
      },
      { at: 6400, run: () => {
          host.classList.remove('opening');
          host.classList.add('closing');
          try { video.pause(); } catch {}
        }
      },
      { at: 8500, run: () => host.classList.add('gone') },
    ];
  }

  EchoStage.mount({
    stage: $('#stage'),
    title: '05a · 高光视频',
    duration: DURATION,
    steps: steps,
    reset: reset,
  });

  if (new URLSearchParams(location.search).get('clean') === '1') {
    document.body.classList.add('echo-clean');
  }
})();
