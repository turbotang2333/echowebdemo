# v2 八场景 × 视觉层级映射

> 关联：[visual-layers.md](visual-layers.md)、[demo-script.md](demo-script.md)、[art-assets.md](art-assets.md)
> 把 12 张已落地资产 + 现有特效，按视觉层级架构（场景 / 氛围 env / 氛围 emotion / 特效主导 / 特效伴随）映射到八个场景的逐段视觉声明。
> 立绘层不在五字段内，单独列在每段最右一列。

## 字段速查

- **scene**：场景层元素。`null` = 留白；`PNG切图.webp` = 单体；`整图.webp@遮罩描述` = 整图局部
- **env**：[visual-layers.md 4.3](visual-layers.md) 中预设名，挂角色之下，只染场景
- **emotion**：同表预设名，挂角色之上，染整张画面（含角色）
- **fx**：主导特效（粒子 / 光柱 / 训狗字符浮起），任意时刻只 1 种
- **burst**：伴随行为（屏震 / 闪 / 推拉 / 平移），不占槽位
- **覆盖率**：场景层在画面中占的面积估值（视觉直观目标）
- **立绘**：角色层资产路径或 pose 名

---

## 场景 1 · 黑暗水中（0:00 - 0:50）

**重写后的 init**

| 字段 | 值 |
|---|---|
| scene | null |
| env | `dark-water` |
| emotion | null |
| fx | null |
| char | `pos: far, visible: true`（远处立绘 + 金瞳） |

**段-by-段**

| 段 | 触发 | scene | 覆盖率 | env | emotion | fx | burst | 立绘 |
|---|---|---|---|---|---|---|---|---|
| 1 旁白 | para "你睁眼，是黑色…" | null | 0% | `dark-water` | – | – | – | far / brightness 0.4 |
| 1 视觉转 | pos `far-lit` | null | 0% | `dark-water`（亮度 0.3→0.4） | – | – | – | far-lit / brightness 0.5 |
| 1 对话 | 3 段 dialogue + 2 圆弧 | null | 0% | `dark-water` | – | – | – | tilt（末段） |
| 2 旁白（鱼尾） | pose tilt + para "水面慢慢映出微光…一条鱼尾" | **`鱼尾.webp`** 下方 1/4 居中 | ~25% | `dark-water` | – | – | – | tilt |
| → 切场 | swipe-up | – | – | – | – | – | flash 0.2 + shake | – |

**资产**

- ✅ `鱼尾.webp`
- ⏳ 缺 env `dark-water` 预设（属氛围层基础建设，非美术）

---

## 场景 2 · 怪鱼与狐狸（0:50 - 1:50）

**重写后的 init**

| 字段 | 值 |
|---|---|
| scene | null（角色立绘+台词主导，不需要场景元素） |
| env | `dark-water` |
| emotion | null |
| fx | null |
| char | `pos: mid, pose: attack`（救人姿态） |

**段-by-段**

| 段 | 触发 | scene | 覆盖率 | env | emotion | fx | burst | 立绘 |
|---|---|---|---|---|---|---|---|---|
| 入场（爆开瞬间） | para "水面突然炸开…" | null | 0% | `dark-water`（亮度短跳 0.3→0.9→0.3） | `red-alert` 0.3s | – | flash + shake + 水花粒子 | mid / attack |
| 1 旁白 | 同上 para 末 | null | 0% | `dark-water` | – | – | – | attack |
| 1 ring | "求救/道谢" | null | 0% | `dark-water` | – | – | – | attack |
| 1 对话 | 2 段 dialogue + 1 ring | null | 0% | `dark-water` | – | – | – | attack → lean-in |
| 2 旁白（鱼饵+撕碎） | pose lean-in + para "他用法术…撕碎" + shake | null | 0% | `dark-water` | `red-alert` 0.4s（撕碎瞬间） | – | shake + 血粒子（瞬时） | lean-in |
| → 切场 | swipe-up | – | – | – | – | – | flash + shake | – |

**资产**

- ❌ 缺：水花爆开粒子（程序粒子，复用 ghost-fire 写法）
- ❌ 缺：血粒子（程序粒子）

---

## 场景 3 · 岸边（1:50 - 3:00）

**重写后的 init**

| 字段 | 值 |
|---|---|
| scene | null |
| env | `dawn-warm`（暖色岸边） |
| emotion | null |
| fx | null |
| char | `pos: mid, pose: lean-in` |

**段-by-段**

| 段 | 触发 | scene | 覆盖率 | env | emotion | fx | burst | 立绘 |
|---|---|---|---|---|---|---|---|---|
| 1 旁白 | para "你瘫在岸上喘气…" | null | 0% | `dawn-warm` | – | – | – | lean-in |
| 1 对话 | dialogue + ring "我会做菜" + dialogue | null | 0% | `dawn-warm` | – | – | – | lean-in |
| 2 旁白（做菜） | pose tilt + para "你强作镇定…大快朵颐" | null | 0% | `dawn-warm` | – | **食物白烟（粒子）** | – | tilt |
| 3 旁白（逃跑） | para "你冲进密林…以为脱身了" + pos hidden | null | 0% | `dawn-warm` → `cold-blue`（角色淡出后转冷，500ms） | – | 食物白烟退场 | 镜头微推 | hidden |
| → 切场 | swipe-up | – | – | – | – | – | flash + shake | – |

**资产**

- ❌ 缺：食物白烟粒子（程序粒子）

---

## 场景 4 · 火林（3:00 - 4:00）

**重写后的 init**

| 字段 | 值 |
|---|---|
| scene | null |
| env | `cold-blue` |
| emotion | null |
| fx | `ghost-fire`（鬼火粒子，色相调冷蓝 hue 200°） |
| char | `pos: hidden, visible: false`（让"火林"环境占主角，至段 3 救场才入场） |

**段-by-段**

| 段 | 触发 | scene | 覆盖率 | env | emotion | fx | burst | 立绘 |
|---|---|---|---|---|---|---|---|---|
| 1a 鬼火围 | para 前半 "前方林间…浮起鬼火" | null | 0% | `cold-blue` | – | `ghost-fire` | – | hidden |
| 1b 藤蔓缠脚 | para 后半 "藤蔓忽然活了" | **`藤蔓.webp`** 屏底横铺 | ~25% | `cold-blue` | – | `ghost-fire`（继续） | 镜头微推 | hidden |
| 2 食人花顶压 | para "食人花张着血盆大口" + shake | **`食人花.webp`** 顶部下压（rotate 180°，线性遮罩上半区，~40%）；藤蔓淡出 | ~40% | `cold-blue`（再加深） | `red-alert` 0.4s | `ghost-fire` 退场（被威胁取代） | shake | hidden |
| 3 烈焰救场 | flame-burst + wait 600ms + pos mid + pose cold + para "烈焰中走出" | null（爆开后清空） | 0% | `cold-blue` → `flame-warm` 0.5s 一闪 → 回到 `cold-blue` | – | null | bigFlameBurst（伴随）+ flash | mid / cold（用 attack + 冷蓝滤镜代用） |
| 3 对话 | dialogue "你抢了我的猎物" | null | 0% | `cold-blue` | `cold-shock` 0.4s | – | – | cold |
| 4 绑藤蔓走 | para "他从你身边走过…绑住手腕" | null | 0% | `cold-blue` | – | – | – | cold（绳索由旁白文字交代，**不在身上画 SVG**） |
| → 切场 | swipe-up | – | – | – | – | – | flash + shake | – |

**资产**

- ✅ `藤蔓.webp` / `食人花.webp` / `ghost-fire`（已有，需调 hue 至 200°）/ `bigFlameBurst`
- ❌ 缺：`cold` pose（用现有 attack + CSS 冷蓝滤镜代用）

---

## 场景 5 · 焦土路上（4:00 - 5:00）

**重写后的 init**

| 字段 | 值 |
|---|---|
| scene | `骸骨.webp@椭圆遮罩 30% 居右下骷髅头` |
| env | `scorched` |
| emotion | null |
| fx | `dust`（灰白尘飘） |
| char | `pos: walking-away, visible: true`（用 `狐狸蜷缩状态.webp` 背影代用） |

**段-by-段**

| 段 | 触发 | scene | 覆盖率 | env | emotion | fx | burst | 立绘 |
|---|---|---|---|---|---|---|---|---|
| 1 旁白 | para "他用绳子牵着你…焦黑的土地，散落的骸骨" | **`骸骨.webp`** 椭圆遮罩 cx:75% cy:65% rx:25% ry:20% | ~30% | `scorched` | – | `dust` | – | walking-away（蜷缩状态背影） |
| 1 对话 | "这是哪里" / "曾经是我的" | **`骸骨.webp`** 遮罩扩到 rx:45% ry:35%（含肋骨段） | ~50% | `scorched` | – | `dust` | – | walking-away |
| 2 远处低吼 | shake + npc "一声沉闷的低吼" + para "连地面都在震…加快脚步" | **`骸骨.webp`** 遮罩扩到 rx:90% ry:80%（接近全图） | ~85% | `scorched`（亮度短跳一下） | `red-alert` 0.4s（震屏同步） | `dust` | shake + 屏低频震 + 立绘下沉一帧再回弹 | walking-away → walking-fast（CSS scale 1.02 + 微震） |
| → 切场 | swipe-up | – | – | – | – | – | flash + shake | – |

**资产**

- ✅ `骸骨.webp` / `狐狸蜷缩状态.webp`（重指派）/ `dust` / `shake`
- ⏳ walking-fast = walking-away + CSS 微震，无新资产

---

## 场景 6 · 月夜洞穴（5:00 - 6:30）

**重写后的 init**

| 字段 | 值 |
|---|---|
| scene | `羊人吃尸体.webp@椭圆遮罩 40% 居中（洞内月光区）` |
| env | `cold-blue` |
| emotion | null |
| fx | `moonbeam`（月光柱） |
| char | `pos: curled, visible: true`（角落小立绘，用 close pose + scale 0.5 + opacity 0.7 代用） |

**段-by-段**

| 段 | 触发 | scene | 覆盖率 | env | emotion | fx | burst | 立绘 |
|---|---|---|---|---|---|---|---|---|
| 1 入夜睡 | para "入夜…月光从洞顶缝隙漏下来" | **`羊人吃尸体.webp`** 椭圆 cx:50% cy:50% rx:35% ry:30%（洞内月光） | ~40% | `cold-blue` | – | `moonbeam` | – | curled（小） |
| 2 偷看羊人 | para "外面…一只长着羊角的妖怪…啃食…缩了回来" | **`羊人吃尸体.webp`** 遮罩偏移到 cx:55% cy:45% rx:45% ry:35%（含羊人剪影位置） | ~55% | `cold-blue`（亮度短跳） | `red-alert` 0.3s | `moonbeam` | shake | curled |
| 3 缩回看墙 | para "你贴着洞壁坐下…碰到刻痕" | **`羊人吃尸体.webp`** 遮罩缩回中央偏左下 cx:35% cy:65% rx:25% ry:20%（看墙的视角） | ~25% | `cold-blue` | – | `moonbeam` | – | curled |
| 4 训狗诗 | heavy（改为特效层） + para "这是训狗口诀" | **`羊人吃尸体.webp`** 不变 | ~25% | `cold-blue`（亮度提一档） | – | **训狗字符浮起** （`moonbeam` 退场让位） | – | curled |
| 5 主控决意 | character-glow + para "硬跑跑不掉。那就——投其所好" | **`羊人吃尸体.webp`** 不变 | ~25% | `cold-blue` → 暖一档 | – | 训狗字符淡出 → null | character-glow | curled |
| → 切场 | swipe-up | – | – | – | – | – | flash + shake | – |

**资产**

- ✅ `羊人吃尸体.webp` / `moonbeam` / `characterGlow`
- ❌ 缺：**训狗字符浮起特效**（特效层主导，文字逐字浮起 + 墨迹由淡到浓，需新写 fx 模块；这是 demo 里唯一允许的"画文字"特例）
- ⏳ curled 立绘：用 close pose + scale 0.5 + opacity 0.7 + 旋转 90° CSS 代用，**或改剧本台词**为"侧坐着背对你睡着"
- 注：剧本中的 `t: 'heavy'` 文字渲染需要从 paragraph 移到 fx 层

---

## 场景 7 · 晨光讨好 + 摸摸（6:30 - 9:00）

**重写后的 init**

| 字段 | 值 |
|---|---|
| scene | `cj3.jpg@椭圆遮罩 40% 居中（洞口暖光）` |
| env | `dawn-warm` |
| emotion | null |
| fx | `sunbeam`（晨光柱，复用 moonbeam 改 hue 至 35°） |
| char | `pos: curled`（接续场景 6 末态） |

**段-by-段**

| 段 | 触发 | scene | 覆盖率 | env | emotion | fx | burst | 立绘 |
|---|---|---|---|---|---|---|---|---|
| 1 摘果汁 | para "他还睡着…挤了一杯" | **`cj3.jpg`** 椭圆 ~40%（洞口光） | ~40% | `dawn-warm` | – | `sunbeam` | 镜头从洞内→洞口→洞内 | curled |
| 2 递杯子 | pos close + para "他迷迷糊糊地睁眼…喝了一口" | **`cj3.jpg`** 遮罩扩到 ~60% | ~60% | `dawn-warm` | – | `sunbeam` | – | close / waking-up（用现有 lean-in 代用）|
| 2 对话 | ring "好喝吗" + aside + ring "再做一杯" + dialogue + pose tilt | **`cj3.jpg`** ~60% | ~60% | `dawn-warm` | – | `sunbeam` | – | tilt |
| 3 摸摸前 | inner "训狗十八式·二式·顺毛" + para "他歪头看你…他没躲" + pos extreme + character-glow | **`cj3.jpg`** ~60% | ~60% | `dawn-warm`（亮度微提） | – | `sunbeam` | character-glow | tilt → extreme close |
| 4a 摸摸 0-25% | pet 进入 / tense | **`cj3.jpg`** ~60% | ~60% | `dawn-warm` | – | **摸摸轨迹光痕**（粒子，`sunbeam` 退场让位） | – | **`感觉有人在动的惊讶.webp`** |
| 4b 摸摸 25-50% | 25% 切阶 | – | – | `dawn-warm` | – | 摸摸轨迹光 | – | **`感觉被摸到的震惊.webp`** |
| 4c 摸摸 50-75% | 50% 切阶 | – | – | `dawn-warm` | `flush-rose`（emotion 入场，整张画面染粉） | 摸摸轨迹光 | – | **`一直被摸的脸红.webp`** |
| 4d 摸摸 75-100% | 75% 切阶 | – | – | `dawn-warm` | `flush-rose`（强化） | 摸摸轨迹光 | – | **`摸到最轻松的微笑.webp`** |
| 4 完成 | para "尾巴卷上来…低吟" | – | – | `dawn-warm` | null（emotion 退场，dawn-warm 暖意接管） | 摸摸轨迹光淡出 → null | character-glow（满足光晕） | `摸到最轻松的微笑.webp` |
| 5 提议出去 | ring "出去看看" + pose closed-eye + dialogue "好啊" | **`cj3.jpg`** ~60% | ~60% | `dawn-warm` | – | null | – | closed-eye（用 `摸到最轻松的微笑.webp` 直接代用） |
| → 切场 | swipe-up | – | – | – | – | – | flash + shake | – |

**资产**

- ✅ 摸摸 4 阶立绘全到位
- ✅ cj3.jpg / characterGlow
- ❌ 缺：`sunbeam`（moonbeam 改 hue，简单）
- ❌ 缺：**摸摸轨迹光痕粒子**（核心，需新写）
- ⏳ closed-eye：直接复用 `摸到最轻松的微笑.webp`（已是闭眼状态）

---

## 场景 8 · 钩子（9:00 - 10:00）

**重写后的 init**

| 字段 | 值 |
|---|---|
| scene | null（接续场景 7 末态） |
| env | `dawn-warm` |
| emotion | null |
| fx | null |
| char | `pos: extreme, pose: closed-eye` |

**段-by-段**

| 段 | 触发 | scene | 覆盖率 | env | emotion | fx | burst | 立绘 |
|---|---|---|---|---|---|---|---|---|
| 1 他睁眼冷漠 | pose cold + para "他睁眼。金瞳里…那我带你去转转" | null | 0% | `dawn-warm` | `cold-shock` 0.4s（瞳缩冲击） | – | flash | extreme / cold（用现有 close pose + 蓝色滤镜代用，金瞳局部高光） |
| 2 雾涌起 + 宅院浮 | rising-fog + para "浓雾骤然变浓…红灯高挂" + dialogue "这是你一直想找的地方" | **`宅院.webp`** 椭圆从 cx:50% cy:60% rx:30% ry:25% 渐扩到 rx:50% ry:45% | ~30% → ~60% | `dawn-warm` → `fog-mansion` 1.2s 过渡 | – | risingFog（伴随性涌起 1.5s） → null | flash | cold |
| 3 假笑（钩子点睛） | pose fake-smile + para "你抬头看他…不是人的弧度" | **`宅院.webp`** 不变 ~60% | ~60% | `fog-mansion` | `cold-shock` 0.5s + 全屏微震 | – | shake 微震 + 嘴角 SVG 描线（极弱 0.3s 红，几乎不可见，仅潜意识层） | **`假笑.webp`** |
| 4 镜头转向庭院 | nail-people-on + pos mid-back + para "庭院中央…粗糙的墨笔勾出来的" | **`宅院.webp`** 整图 100% 全揭示（去掉遮罩） | 100% | `fog-mansion` | – | nail-people（已有，纸扎人剪影叠在场景上）+ 红灯 lantern（已有）| 镜头平移 pan 1.5s | mid-back（背影，用 `狐狸蜷缩状态.webp` 代用） |
| 收尾 | 黑屏 + 衬线小字 "第一章·完" | null | 0% | `fog-mansion` → 全黑 | – | – | flash 转黑 1s + 文字淡入 | – |

**资产**

- ✅ `宅院.webp` / `假笑.webp` / `risingFog` / `showLanterns` / `showNailPeople`
- ❌ 缺：`cold` / `cold-eye` / `fake-smile` 之外的辅助（`fake-smile` 已有 = `假笑.webp`；瞳缩 SVG 描线属于"嘴角辅助"特例，需极克制）
- ⏳ mid-back 立绘：复用 `狐狸蜷缩状态.webp` 背影

---

## 全局资产缺口汇总

### 已落地 ✅

| 资产 | 用途 |
|---|---|
| `鱼尾.webp` | 场景 1 |
| `藤蔓.webp` / `食人花.webp` | 场景 4 |
| `骸骨.webp` | 场景 5 整图 |
| `狐狸蜷缩状态.webp` | 场景 5 walking-away + 场景 8 mid-back（重指派） |
| `羊人吃尸体.webp` | 场景 6 整图 |
| `cj3.jpg` | 场景 7 整图 |
| 摸摸 4 阶立绘 × 4 | 场景 7 |
| `假笑.webp` | 场景 8 钩子点睛 |
| `宅院.webp` | 场景 8 整图 |
| 已有 fx：`shake` / `flash` / `ghost-fire` / `bigFlameBurst` / `dust` / `moonbeam` / `risingFog` / `showLanterns` / `showNailPeople` / `characterGlow` | 各场景 |

### 待补 ❌

#### 美术 / 立绘
| # | 资产 | 用途 | 应急方案 |
|---|---|---|---|
| 1 | `cold` / `cold-eye` 立绘 | 场景 4 / 8 冷漠出场 | 现有 `attack` + 冷蓝 CSS 滤镜（短期可用） |
| 2 | `curled` 立绘（蜷缩睡） | 场景 6 | 现有 close + scale 0.5 + opacity 0.7 + 旋转 90°（勉强）；或改剧本"侧坐着背对你睡着"（推荐） |
| 3 | `walking-fast` 立绘 | 场景 5 加速 | walking-away + CSS scale 1.02 + 微震 |

#### 程序特效（粒子 / 主导）
| # | 特效 | 用途 | 工作量 |
|---|---|---|---|
| 1 | **摸摸轨迹光痕** | 场景 7 摸摸（**核心**） | 中（参考 ghost-fire 写法） |
| 2 | **训狗字符浮起** | 场景 6 段 4（特效层唯一画文字特例） | 中（字符逐个浮起 + 墨迹渐浓） |
| 3 | 水花爆开粒子 | 场景 2 入场 | 小 |
| 4 | 血粒子 | 场景 2 撕碎 | 小 |
| 5 | 食物白烟粒子 | 场景 3 做菜 | 小 |
| 6 | `sunbeam`（晨光柱） | 场景 7 | 极小（moonbeam 改 hue 35°） |
| 7 | `ghost-fire` 调冷蓝 | 场景 4 | 极小（hue 改 200°） |

#### 氛围层基础建设（非美术）
| # | 项 | 工作量 |
|---|---|---|
| 1 | `.atmo-env` / `.atmo-emotion` 双容器（角色之下/之上）+ 渐变过渡 | 中 |
| 2 | 9 个氛围预设（`dark-water` / `cold-blue` / `flame-warm` / `scorched` / `dawn-warm` / `fog-mansion` / `flush-rose` / `cold-shock` / `red-alert`） | 小（参数定义） |
| 3 | 整图遮罩支持椭圆 + 线性（上半/下半） | 小（CSS mask-image） |

---

## 实现优先级建议

### Phase 1 · 骨架立起来（1-2 天）
1. screen.js 新增"单体槽 + 整图遮罩"渲染
2. atmo.js 新建：双容器 + 9 预设
3. fx.js 调 hue 改 ghost-fire 冷蓝、复制 sunbeam
4. script.js 重写为新 5 字段 beat 格式（先做场景 5、6、8 这三个整图驱动的场景，验证骨架）

### Phase 2 · 摸摸核心（2-3 天，**最大风险**）
1. 摸摸轨迹光痕粒子
2. 摸摸 4 阶立绘切换 + emotion 切换 `flush-rose` 时序
3. 真机测试触感与节奏
4. 验证爽点 3 是否撑得起

### Phase 3 · 钩子完整（1 天）
1. 训狗字符浮起特效
2. 假笑段的微特效（shake + 嘴角 SVG 描线极弱版）
3. 场景 8 整图遮罩从 30% → 100% 渐扩

### Phase 4 · 周边特效与立绘代用（1-2 天）
1. 水花 / 血粒子 / 食物白烟粒子
2. 现有 pose 配 CSS 滤镜代用 cold / curled / walking-fast
3. 整体打磨 + BGM

---

## 待确认

1. 场景 4 的 `cold` pose 用现有 attack + 冷蓝滤镜代用，是否接受？
2. 场景 6 的 curled 立绘是改剧本"侧坐着背对你睡着"还是凑现有立绘？
3. 场景 8 段 3 假笑的"嘴角 SVG 描线"是否真的需要？还是只靠 shake + cold-shock 氛围 + 立绘？我倾向**先不画 SVG**，跑一遍看是否够用，不够再补。
4. 训狗字符浮起的实现细节（特效层主导）：用 SVG 路径绘字 vs 用 DOM div 配 CSS 动画？我倾向 DOM + CSS（简单且可调）。
5. 现有 `script.js` 的 beat 类型（`heavy` / `npc` / `aside` 等）在新架构下是保留还是合并？我倾向场景 6 的 `heavy` 改为 `fx: { kind: 'cipher-text', ... }`（特效层），其他 `npc` / `aside` 仍属文字层。
