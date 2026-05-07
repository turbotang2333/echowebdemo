# 全程响应式横屏支持

## Context

当前根目录的"竖屏版"是主推版本(typing-input、arc-guide labels、persistent bg spots 都是这一版的新特性),但启动时硬性要求设备竖置 ([js/main.js:19](../../js/main.js#L19))。用户希望在不分叉为第二个项目的前提下,让同一份代码同时支持竖屏和横屏,且**剧情进行中可任意转屏**,体验保持一致 — 同一台手机从竖到横,只是 UI 位置变,呼吸弧从底部移到右侧、历史卷轴从左上向下展开变成向右展开。

底层调研结论(已完成):
- 立绘 `100vh × 100vh` + scale 动画在两个方向天然适用(scale 是无量纲的,vh 在两边都收敛)
- scene-bg(vmin / 0..1 ratio)、art-layer(%) 已经方向无关
- character.js / echo-prologue.js / input.js 等 JS 缓存均为 viewport-relative,转屏自动重算
- 真正需要 invalidate 的:type-input.js 的 `_lastKeyboardOffset` + 弧 SVG 的两套坐标系 + text.js bubble 锁死的 getBoundingClientRect 像素宽高

## 设计要点

**弧的右↔下转换(关键决策点)**:不做单 SVG 跨视框 morph(coordinate system 旋转 90° 几乎不可能平滑插值)。改用**双 arc-host 交叉淡入**,完全照搬老 [landscape/index.html:43-110](../../landscape/index.html#L43) 的 DOM 结构:
- `#edge-arc-host-portrait`(viewBox 1000×220,底部水平弧)— 沿用现有 SVG
- `#edge-arc-host-landscape`(viewBox 220×1000,右侧垂直弧)— 新增,SVG 内容直接复制老版
- CSS 按 `body.{portrait,landscape}-mode` × `.state-{xxx}` 矩阵切换 opacity
- 横屏 INPUT/SETTLED 态:landscape host 淡出,portrait host 淡入(并继续走 type-input.js 已有的 path morph 把曲线变直线),视觉上是"弧从右侧滑到底部并展平"
- 路径 morph 始终只作用在 portrait host(landscape host 是静态弧)

**全程响应式**:订阅 orientation flip,触发:
1. force-close 当前 typing session(移动键盘转屏必关,与平台行为一致)
2. 重置 keyboard offset 缓存(`_keyboardOffset`/`_lastKeyboardOffset`/`_suppressShrinkUntil`)
3. 清除当前所有 visible bubble 上锁死的 inline `width/height`,让 CSS 自然回流
4. 若 journal 已开,临时关掉 clip-path transition,瞬切到新方向的 clip-path,再恢复 transition(否则椭圆从竖向→横向会扭曲一段)

**立绘一致感**:维持 `width/height: 100vh` + `transform-origin: 50% 20%`(肩部锚)。横屏下默认 `--char-x: calc(50vw - 50vh - 8vw)` 左移 8vw 让出右侧 33vw 给弧 + 暗罩 — 这样转屏后角色头部位置接近原竖屏的画面中心,所有 scale 动画(0.1/0.3/1.15)沿用现有数值。

**arc-guide 标签**:横屏 v1 隐藏。后续若用户反馈再补垂直布局。

## Phase 1 — HTML 改造

[index.html:44-76](../../index.html#L44):
- 把当前 `<div class="edge-arc-host" id="edge-arc-host">` 重命名为 `id="edge-arc-host-portrait"`,class 加上 `edge-arc-host-portrait`
- 在它后面平级追加 `<div class="edge-arc-host edge-arc-host-landscape" id="edge-arc-host-landscape">`,内含 viewBox 220×1000 的 SVG(直接 copy [landscape/index.html:44-76](../../landscape/index.html#L44))
- 三个 `arc-guide-*` 留在原位(`#edge-zone` 的直接子节点,不嵌入任一 host)

## Phase 2 — CSS 增量(style.css 末尾追加,不动 portrait 现有规则)

```
/* 双 host 默认 cross-fade 容器 */
.edge-arc-host { transition: opacity 0.32s var(--ease-drift); }
body.portrait-mode  .edge-arc-host-landscape { opacity: 0; pointer-events: none; }
body.landscape-mode .edge-arc-host-portrait  { opacity: 0; pointer-events: none; }

/* 横屏 INPUT/SETTLED 切回底部 host 让 type-input 的 path morph 接管 */
body.landscape-mode .edge-zone.state-input  .edge-arc-host-portrait,
body.landscape-mode .edge-zone.state-settled .edge-arc-host-portrait { opacity: 1; }
body.landscape-mode .edge-zone.state-input  .edge-arc-host-landscape,
body.landscape-mode .edge-zone.state-settled .edge-arc-host-landscape { opacity: 0; }
```

横屏覆盖块(`body.landscape-mode .xxx`),每条都对应当前 portrait 规则的镜像:

| 选择器 | 改动 | 对照原规则 |
|---|---|---|
| `.edge-zone` | `inset: 0 0 0 auto; right:0; width: 33vw; height: 100%; min-width: 200px` | [style.css:414-423](../../style.css#L414) |
| `.edge-arc-host-landscape` | `right: 12vw; width: 14vw; top:0; bottom:0; height:100%; transform-origin: right center` | 复用老版 [landscape/style.css:384-389] |
| `.edge-veil` | `linear-gradient(to left, rgba(0,0,0,0.95) 0%, transparent 70%)`,但 `.state-input` 下还原为 `to top` 渐变(键盘从底部弹) | [style.css:458-471](../../style.css#L458) |
| `.arc-guide` | `display: none`(横屏 v1 隐藏) | [style.css:597-674](../../style.css#L597) |
| `.character` | 仅覆盖 `--char-x` 默认值为 `calc(50vw - 50vh - 8vw)`;width/height/origin/scale 不动 | [style.css:269-291](../../style.css#L269) |
| `.subtitle-zone` | `left: var(--subtitle-x, 50%); top: var(--subtitle-y, 50%); max-width: 36vw; text-align: left` | 借鉴 [landscape/style.css:530-543] |
| `.bubble-user`, `.bubble-action` | `left: 33vw; bottom: 30vh`(避开右弧热区) | [style.css:960-991](../../style.css#L960) |
| `.narration-zone`, `.inner-zone` | `top: 76%; max-width: 50vw` | [style.css:1583-1589](../../style.css#L1583) |
| `.heavy-zone` | `max-width: 56vw; left: calc(50vw - 16vw)` | [style.css:1592-1594](../../style.css#L1592) |
| `.echo-halo`, `.echo-text`, `.echo-hints` | 借鉴 [landscape/style.css:1106-1138] 的横屏布局数值 | [style.css:1443-1516](../../style.css#L1443) |
| `.journal.visible .journal-paper` | `clip-path: ellipse(85vw 130vh at -15vw 50%)` | [style.css:1308-1310](../../style.css#L1308) |
| `.journal-scroll` | `padding: 9vh 38vw 9vh 6vw` | [style.css:1346](../../style.css#L1346) |
| `.journal-hint` | `padding: 14px 38vw 14px 6vw` | [style.css:1399](../../style.css#L1399) |
| `.endmark-hint` 文案 | 不改文案,直接保留(转屏后语义模糊但可读) | [index.html:136](../../index.html#L136) |

横屏专用 keyframe(`edgeRipple` translateY(-22vh) 在横屏方向错):

```
@keyframes edgeRippleLandscape {
  0%   { opacity: 0.7; transform: translateX(0); }
  80%  { opacity: 0.05; }
  100% { opacity: 0; transform: translateX(-22vw); }
}
body.landscape-mode .edge-zone.state-recording .edge-arc-host-landscape .edge-ripple {
  animation-name: edgeRippleLandscape;
}
```

## Phase 3 — JS 改动

**[js/orientation.js](../../js/orientation.js)**:
- L6 `_expected = LANDSCAPE` 改成 `_expected = null`(默认双向接受);`updateGate` 在 null 时永远不显示 gate
- 新增 module-level `_prevOrient = null`,在 `applyState` L14-20 里只在 `cur !== _prevOrient` 时才调用 listeners,并 debounce 100ms(iOS Safari 转屏后 visualViewport 抖动 ~200ms)
- 新增 export `onOrientationChange(fn)`(同 `_changeListeners` 注册,但只在真实 flip 触发)

**[js/main.js:18-20](../../js/main.js#L18)**:
- 删除 `expectOrientation(PORTRAIT, ...)` 和 `await waitForOrientation(PORTRAIT)`
- 保留 `initOrientation()`
- 在 `initOrientation()` 后注册一个统一协调器:

```js
import { onOrientationChange } from './orientation.js';
import { forceCloseTypingSession } from './type-input.js';
import { remeasureBubbles } from './text.js';
import { snapJournalClip } from './journal.js';

onOrientationChange(() => {
  forceCloseTypingSession();
  remeasureBubbles();
  snapJournalClip();
});
```

**[js/type-input.js](../../js/type-input.js)**:
- L210, L274 的 `$('#edge-arc-host')` 改成 `$('#edge-arc-host-portrait')`(只有底部 host 跟键盘升起)
- L33-53 `animatePath` 选择器收紧为 `.edge-arc-host-portrait .edge-arc-main`(右弧 host 的弧永远不变形)
- 扩展 `forceCloseTypingSession` (L373):在原有逻辑后加重置 `_keyboardOffset = 0; _lastKeyboardOffset = 0; _suppressShrinkUntil = 0;`
- 不需要订阅 orientation 自己 — 由 main.js 统一调度

**[js/text.js](../../js/text.js)**(bubble 系统,L102-103 锁死 width/height):
- 新增 export `remeasureBubbles()`:`document.querySelectorAll('#bubble-zone .bubble.visible')` 上每个清掉 `style.width`/`style.height`(尾巴位置 `--tail-pos` 暂不重算,bubble 寿命 ~2s,可接受微对不齐)

**[js/journal.js](../../js/journal.js)**:
- 80×80 角部手势(L74-75)用 client px,跨方向都对 — 不动
- 新增 export `snapJournalClip()`:`if (!_open) return; const paper = $('.journal-paper'); paper.classList.add('no-transition'); requestAnimationFrame(() => { paper.classList.remove('no-transition'); });`(让 CSS 在新方向下立刻应用 clip-path,不带 0.55s transition 扭曲过渡)
- CSS 配套:`.journal-paper.no-transition { transition: none !important; }`

**index.html 不需要再改文案**(endmark hint "试着从左上角拉开" 在两个方向都说得通)

## 关键文件

- [index.html](../../index.html) — 双 arc-host DOM 结构
- [style.css](../../style.css) — 末尾追加 landscape 覆盖块 + edgeRippleLandscape keyframe
- [js/orientation.js](../../js/orientation.js) — 放开方向限制 + onOrientationChange API + flip debounce
- [js/main.js](../../js/main.js) — 删 expectOrientation,装 flip 协调器
- [js/type-input.js](../../js/type-input.js) — 选择器换 portrait host + 强制关闭重置缓存
- [js/text.js](../../js/text.js) — `remeasureBubbles` export
- [js/journal.js](../../js/journal.js) — `snapJournalClip` export

## 实施顺序

1. **Phase 1+2 静态层先做完** — DOM + CSS,无 JS 依赖。DevTools 手动加 `body.landscape-mode` 验证:右弧出现位置、journal 横向纸卷、立绘左移、bubble 在左 2/3 屏不被压
2. **Phase 3 orientation.js + main.js** — 放开双向 + 装 flip 协调器(此时还没接 type-input/text/journal,只是 listener 空跑)
3. **type-input.js 改造** — 选择器 + force-close 扩展。手机上转屏验证打字态被干净取消、键盘缓存清空
4. **text.js + journal.js polish** — bubble remeasure + journal snap

## 验证

启动:`python3 -m http.server 8000`(已验证命令)。

测试矩阵(同款手机两个方向都要走一遍):
- [ ] 启动时即横屏 — 不再卡 gate,直接进剧情
- [ ] 启动时即竖屏 — 行为不变
- [ ] INVITATION 态下转屏 — 弧位置切换,无残影/抖动
- [ ] 输入态(键盘已弹)下转屏 — 键盘自动收 + 输入 session 取消 + 弧回 INVITATION 形态
- [ ] RECORDING 态下转屏 — 涟漪方向正确(竖屏向上 / 横屏向左)
- [ ] journal 已开下转屏 — 卷轴瞬切到新方向 clip-path,文字回流
- [ ] 立绘 close-up(scale 1.15)状态下转屏 — 头部位置不跳(transform-origin 50% 20% 跨方向一致)
- [ ] 各幕跑一遍验证 bg spot 与 art 元素位置无错乱(理论上 vmin / % 已经免疫)
- [ ] 桌面浏览器拖窄成横向窗口 — 也走 landscape 分支(matchMedia 基于宽高比,不依赖移动端 API)

## 风险

- iOS Safari `visualViewport` 在转屏过渡 ~200ms 内会报抖动尺寸 → 100ms debounce 兜底
- 横屏下右弧的 `state-recording` scale 1.7 origin 是 right center,左侧扩散范围会进 67vw 主舞台 — 与"向左扩散"诉求一致
- 老 [landscape/](../../landscape/) 不动,继续作为参考素材,等本次验证稳定后可标 deprecated
