# 测试版 · 实现锚:DOM 与 CSS

> 通用规范([表现设计.md](../01-通用设计规范/表现设计.md))的「图层栈」在 测试版 的 DOM / CSS 落地映射。
>
> ⚠️ 测试版 当前实现与通用规范有 gap,详见 §三 重构待办。

---

## 一、Z-order 实现锚定(测试版 目标态)

按通用规范图层栈定义,测试版用以下 DOM 容器:

| 顺序 | 层 | DOM 容器 | 染色 / 混合模式 |
|---|---|---|---|
| ① | 极暗底 | `.screen-bg` (bgColor) | normal |
| ② | 场景后景 - 整图 + 遮罩 | `.screen-bg.revealed` + mask-image | normal |
| ② | 场景后景 - 单体 | `.scene-el-layer.back .scene-el` | normal |
| ③ | 后景主特效 | `#fx-dominant-back` | normal / screen |
| ④ | 环境氛围 | `#atmo-env` | multiply / overlay |
| ⑤ | 角色 | `#character-layer` | normal |
| ⑥ | 场景前景 - 整图 + 遮罩 | `.scene-el-layer.front` + mask-image | normal |
| ⑥ | 场景前景 - 单体 | `.scene-el-layer.front .scene-el` | normal |
| ⑦ | 前景主特效 | `#fx-dominant-front` | normal / screen |
| ⑧ | 心境氛围 | `#atmo-emotion` | multiply / screen |
| ⑨ | 文字 | `#narration-zone` | normal |
| ⑩ | 交互特效 | `#fx-burst-layer` | normal / screen |
| ⑪ | 交互 UI / 圆弧 | `#ring-layer` | normal |

---

## 二、染色方式映射

通用规范的"压暗 / 提亮 / 覆盖"三类对应 CSS `mix-blend-mode`:

| 通用规范术语 | CSS 实现 |
|---|---|
| 压暗类 | `mix-blend-mode: multiply` |
| 提亮类 | `mix-blend-mode: screen` |
| 覆盖类 | `mix-blend-mode: overlay` |
| 暗角 | `box-shadow: inset` 或 `radial-gradient` |

---

## 三、重构待办

测试版 当前代码与上表的 gap:

- **特效层未拆主导 / 交互**:当前只有 `#fx-layer` 单容器统管主导特效与交互特效。需拆为 `#fx-dominant-front` / `#fx-dominant-back` / `#fx-burst-layer` 三容器。
- **场景层未拆前后**:当前所有场景素材都挂 `.scene-el-layer.back`,前景容器 `.scene-el-layer.front` 待引入。
- **环境氛围 z 顺序需上移**:当前 `#atmo-env` 在 z=③(后景主特效之下),按新规范应升到 z=④(后景主特效之上,作为后景组氛围统帅)。
- **心境氛围保持原位**:`#atmo-emotion` 在 z=⑧ 不变,继续作为前景组氛围统帅染整画。
