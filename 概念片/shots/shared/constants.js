// Shared scalar constants for the concept film.
//
// Anything that appears in 2+ beats as the SAME literal lives here, so that
// "globally bump phone size / shift circle / dim outside-darken" is a one-file
// edit instead of a 9-file find-and-replace.
//
// Loaded as a window global (same pattern as curves.js / stage.js). Include
// this script in every beat's index.html BEFORE curves.js + scene.js.
window.EchoConstants = (function () {
  // 手机轮廓 — 16:9 viewBox (1600×900) 内的尺寸/位置.
  // 用于: 00/01/02 起态/04/05/5a/5b/5c/07 的 phoneOutline 路径 + 03 三屏基底.
  const PHONE = { cx: 800, cy: 450, w: 400, h: 820, r: 28 };

  // 远心圆 — 全片所有 弧/圆 共享的同一个圆 (投资人方案 §5.4 硬约束).
  // 圆心远在视口下方, 顶在 y≈775. 不同 beat 用 arcPath() 取不同角度的弧段.
  const CIRCLE = { cx: 800, cy: 3400, r: 2624.88 };

  // 外暗 — 手机外区域的暗化强度 (mask 出手机内部, 其余涂黑).
  // 起态 0, 末态 OUTSIDE_DARKEN. 各 beat 末态/起态视情况引用.
  // 同时写入 --echo-outside-darken CSS var, 让 HTML 里 inline
  // <rect style="opacity: var(--echo-outside-darken)" /> 也跟着 JS 常量联动.
  const OUTSIDE_DARKEN = 0.95;
  document.documentElement.style.setProperty('--echo-outside-darken', String(OUTSIDE_DARKEN));

  // 打字机字速档位 — 每字停顿毫秒, 越大越慢.
  // 改任意一档 → 全片所有用该档的气泡同步变化.
  // 想"全片对白整体慢一档" → 把全部数值 +20 (各档保持相对差).
  const TYPE_SPEED = {
    fast:   100,  // 急 — 你气泡抢话/活泼 (01 b1/b3, 02 youBubbles)
    brisk:  110,  // 轻盈 — 默认对白 (00 b2/b3, 07 b1)
    normal: 130,  // 沉稳 — 试探/低沉 (01 b2/b4, 02 himBubbles)
    slow:   140,  // 凝重 — 开场首句 (00 b1)
    heavy:  150,  // 最重 — 收尾凝重 (07 b2)
  };

  return { PHONE, CIRCLE, OUTSIDE_DARKEN, TYPE_SPEED };
})();
