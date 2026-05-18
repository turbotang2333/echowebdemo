// Executable script for v2 demo.
//
// Each scene has:
//   - id, title (debug)
//   - init: { bg, bgColor, char: { pos, pose, visible }, fx?: [...] }
//   - beats: ordered events. The scene auto-waits for a "scene swipe" at the end.
//
// Beat types:
//   { t: 'para', text, hold? }                     // 旁白 narration
//   { t: 'para', text, hold?, interrupt:{kind:'dialogue',who,text,hold?},
//     continueText, continueHold? }                 // 旁白·中段被对白打断·续写
//   { t: 'dialogue', who, text, hold? }            // 角色对话气泡（他/你）
//   { t: 'inner', text, hold? }                    // 内心 OS（带括号）
//   { t: 'aside', text, hold? }                    // 镜头/动作描写（小字斜体）
//   { t: 'heavy', text, hold? }                    // 重旁白（屏中央 + 横线）
//   { t: 'npc', text, from?, life? }               // 缺席旁白（top/right 入场）
//   { t: 'ring', prompt, text }                    // 圆弧对话
//   { t: 'pos', pos, wait? }                       // 立绘位置
//   { t: 'pose', pose, wait? }                     // 立绘姿态
//   { t: 'char-show', on }                         // 立绘显隐
//   { t: 'fx', kind, ... }                         // 特效
//   { t: 'wait', ms }                              // 等待
//   { t: 'await-swipe' }                           // 段尾，等待用户上滑（轻）
//   { t: 'clear-narration' }                       // 主动漂走当前 narration/inner/aside
//   { t: 'pet' }                                   // 摸摸（占位）

export const SCRIPT = [
  // ============================================================
  // 场景 1 · 黑暗水中 (0:00 - 0:50)
  // ============================================================
  {
    id: 'scene-1',
    title: '黑暗水中',
    init: {
      // 前 30s 真黑屏（dark-water 在黑底上 multiply 仍是黑），渲染孤独 / 视觉留白
      bgColor: '#000000',
      env: 'dark-water',
      // 开场只有金瞳暗示，立绘要到第一句对话时再远远出现
      char: { pos: 'far-lit', visible: false },
    },
    beats: [
      // 旁白 1：纯黑+水声，金瞳一闪——立绘仍隐
      { t: 'para', text: '你睁眼，是黑色。耳边只有水声，和皮肤上的冷气。远处的水面亮起一双金色的眼睛。', hold: 1500 },
      { t: 'burst', kind: 'flash', intensity: 0.3, duration: 200 },
      { t: 'await-swipe' },

      // 第一句对话时立绘"远远的"出现：far-lit（scale 0.36 + brightness 0.65）
      { t: 'char-show', on: true },
      // 对话 1
      { t: 'dialogue', who: '他', text: '……谁?', hold: 800 },
      { t: 'ring', prompt: ['反问他', '报上名字', '轻声回应'], text: '是谁在那?' },
      { t: 'dialogue', who: '他', text: '……水妖? 刚化形?', hold: 800 },
      { t: 'ring', prompt: ['问问自己', '否认', '问他是谁'], text: '你是谁?' },
      { t: 'dialogue', who: '他', text: '叫什么不重要。这里没人会再记得我的名字。', hold: 1800 },
      { t: 'pose', pose: 'tilt' },

      // 旁白 2 —— 挂 cj1 + 椭圆 28×26 + 鱼尾（=用户自己，居中半透叠加在角色之上、UI 之下）
      {
        t: 'scene',
        bg: 'cj1.jpg',
        reveal: { shape: 'ellipse', cx: 50, cy: 55, rx: 28, ry: 26 },
      },
      // 鱼尾走 scene-front，z-index 3 落在角色之上、文字/UI 之下
      // 放大允许超出屏幕，调暗 + 羽化边缘融入暗水
      { t: 'scene-front', el: {
          id: 'fishtail', src: '鱼尾.webp',
          x: 50, y: 72, w: 110, h: 90,
          opacity: 0.55, brightness: 0.55, feather: 50, blur: 0.6,
      } },
      { t: 'para', text: '水面慢慢映出一点微光。你低头看自己——一条鱼尾。你才化形不久，连法术也不熟。水底，一道更大的影子游了过来。', hold: 1500 },
    ],
  },

  // ============================================================
  // 场景 2 · 怪鱼与狐狸 (0:50 - 1:50)
  // ============================================================
  {
    id: 'scene-2',
    title: '怪鱼与狐狸',
    init: {
      bg: 'cj1.jpg',
      // 屏底一长条水面（cy:78 + rx:42 ry:18）——立绘居中抓鱼时不再完全遮挡 reveal
      reveal: { shape: 'ellipse', cx: 50, cy: 78, rx: 42, ry: 18 },
      env: 'dark-water',
      char: { pos: 'mid', pose: 'attack', visible: true },
    },
    beats: [
      // 旁白 1：水面炸开 → 救（shake 入场）
      { t: 'burst', kind: 'shake' },
      { t: 'para', text: '水面突然炸开。你来不及反应——一只爪子从水里把你捞起来。逆光中，黑色的狐耳贴着湿发，一双金瞳近在眼前。是他。', hold: 1500 },
      { t: 'ring', prompt: ['道谢', '问他是谁', '呼救'], text: '救救我' },

      // 对话 1
      { t: 'dialogue', who: '他', text: '好有活力的鱼。尝尝——', hold: 1200 },
      { t: 'ring', prompt: ['跟他谈条件', '求饶', '指水里更大的'], text: '别吃我，水里有更大的鱼' },
      { t: 'dialogue', who: '他', text: '哦? 如果真有，我就不吃你。', hold: 1500 },
      { t: 'pose', pose: 'lean-in' },

      // 旁白 2：丢进水里当饵 → "那就拿你当鱼饵。"（气泡）→ 怪鱼出现 → 撕碎
      { t: 'para',
        text: '他用法术凝出绳索把你绑住，丢进水里。',
        hold: 1000,
        interrupt: { kind: 'dialogue', who: '他', text: '那就拿你当鱼饵。', hold: 1200 },
        continueText: '下一秒怪鱼出现，他扑下去，一爪把它撕碎，溅起一片血。',
        continueHold: 1800,
      },
      // 撕碎瞬间：cj2 红死潭整图闪现 0.3s + emotion red-alert + shake（替代粒子血/水花）
      { t: 'emotion', preset: 'red-alert' },
      { t: 'scene', bg: 'cj2.jpg', wait: 300 },
      { t: 'burst', kind: 'shake' },
      { t: 'scene', bg: 'cj1.jpg' },
      { t: 'emotion', clear: true },
    ],
  },

  // ============================================================
  // 场景 3 · 岸边 (1:50 - 3:00)
  // ============================================================
  {
    id: 'scene-3',
    title: '岸边',
    init: {
      bg: 'cj1.jpg',
      // 椭圆下移 cy:75 + 横向扁平 50×22 (~35%)——露下方一长条水/岸，视觉=岸边视角
      reveal: { shape: 'ellipse', cx: 50, cy: 75, rx: 50, ry: 22 },
      env: 'dark-water',
      char: { pos: 'mid', pose: 'lean-in', visible: true },
    },
    beats: [
      { t: 'para', text: '你瘫在岸上喘气，浑身湿透。他蹲在你面前，慢慢舔掉嘴角的血。', hold: 1500 },
      { t: 'await-swipe' },

      { t: 'dialogue', who: '他', text: '反悔了。或者——你有什么办法让我换换口味?', hold: 1500 },
      { t: 'ring', prompt: ['问想吃什么', '求他放过', '说会做菜'], text: '我会做菜。' },
      { t: 'dialogue', who: '他', text: '那你做。做不好——', hold: 1200 },

      // 旁白 2
      { t: 'pose', pose: 'tilt' },
      { t: 'para', text: '你强作镇定，找出岛上的果子和不知名的小兽，凭着记忆里的几道菜给他做了一顿。他大快朵颐，眼里第一次有了新奇——慢慢眯起，专注地啃着骨头里的残味。', hold: 2400 },
      { t: 'await-swipe' },

      // 旁白 3：逃 —— env 由 dark-water 渐入 cold-blue（离开水底安全区）
      { t: 'env', preset: 'cold-blue' },
      { t: 'para', text: '你看准时机，悄悄起身。他没回头。你冲进密林，跑得飞快——听不见他的声音了。你以为，自己脱身了。', hold: 2200 },
      { t: 'pos', pos: 'hidden' },
    ],
  },

  // ============================================================
  // 场景 4 · 火林 (3:00 - 4:00)
  // ============================================================
  {
    id: 'scene-4',
    title: '火林',
    init: {
      // 极暗 bg 全程 0% 场景层——靠 ghost-fire 主导特效 + 单体叠加 + 立绘演出
      bgColor: '#0a0810',
      char: { pos: 'hidden', visible: false },
      fxDominant: { kind: 'ghost-fire', position: 'back' },
    },
    beats: [
      // 段 1：藤蔓单体入场（130×55，允许超出屏幕；调暗 + 重羽化融入鬼火林）
      { t: 'scene-back', el: {
          id: 'vine', src: '藤蔓.webp',
          x: 50, y: 80, w: 130, h: 55,
          brightness: 0.45, feather: 38, blur: 1.2,
      } },
      { t: 'para', text: '跑了多久不知道。这岛似乎不让你真正离开。前方的林间，无声无息地浮起一团团鬼火，从四面八方把你围住。藤蔓忽然活了，缠住你的脚踝。', hold: 2200 },
      { t: 'await-swipe' },

      // 段 2：食人花前景下压（缩小一圈 88×72，偏右上避免太居中；重压暗 + 重羽化让血盆大口压感更阴森）
      // 同时清掉藤蔓，避免下压瞬间脚边还残留缠绕物，注意力让给头顶血盆大口
      { t: 'scene-back', clear: true },
      { t: 'scene-front', el: {
          id: 'flower', src: '食人花.webp',
          x: 62, y: 22, w: 88, h: 72,
          brightness: 0.45, feather: 38, blur: 1.2,
      } },
      { t: 'para', text: '头顶传来一声黏腻的开合。你抬头——一朵巨大的食人花张着血盆大口，朝你罩了下来。', hold: 1800 },
      { t: 'burst', kind: 'shake' },
      { t: 'await-swipe' },

      // 烈焰救场：emotion red-alert + flash + shake 替代粒子模拟火焰；清单体回到 0%
      { t: 'emotion', preset: 'red-alert' },
      { t: 'burst', kind: 'flash', intensity: 0.8, duration: 350 },
      { t: 'burst', kind: 'shake' },
      { t: 'scene-back', clear: true },
      { t: 'scene-front', clear: true },
      { t: 'wait', ms: 600 },
      { t: 'emotion', clear: true },
      { t: 'pos', pos: 'mid' },
      { t: 'pose', pose: 'cold' },
      { t: 'para', text: '"嗤——" 一道橙红色的火焰擦着你的脸炸开，烧穿了花的喉咙。烈焰中，他慢慢走出来，眼神冰冷。', hold: 1800 },
      { t: 'dialogue', who: '他', text: '我的猎物——只能我吃。', hold: 1500 },
      { t: 'await-swipe' },

      { t: 'para', text: '他从你身边走过，捡起一根烧焦的藤蔓，把你的手腕死死绑住。', hold: 1500 },
      { t: 'dialogue', who: '他', text: '跑了一次。不能再有第二次。', hold: 1500 },
    ],
  },

  // ============================================================
  // 场景 5 · 焦土路上 (4:00 - 5:00) [v2 新架构]
  // 整图：骸骨.webp · env: scorched · fxDominant: dust
  // 覆盖率推进：30% → 50% → ~85%（远处低吼时几乎全揭）
  // ============================================================
  {
    id: 'scene-5',
    title: '焦土路上',
    init: {
      bg: '骸骨.webp',
      // 段 1 入场：露出右下骨头一角 ~30% 覆盖（半径放宽到 35×30 + 70% plateau）
      reveal: { shape: 'ellipse', cx: 70, cy: 65, rx: 35, ry: 30 },
      env: 'scorched',
      fxDominant: 'dust',
      char: { pos: 'walking-away', visible: true },
    },
    beats: [
      { t: 'para', text: '他用绳子牵着你往林子深处走。你跟在后面，第一次看清这岛真正的样子——焦黑的土地，散落的骸骨，空气里飘着灰白的尘。', hold: 2400 },
      { t: 'await-swipe' },

      // 段 1 末：扩大露出区域到含肋骨段 ~60%（贴愿景中段曲线）
      { t: 'scene', reveal: { shape: 'ellipse', cx: 55, cy: 60, rx: 46, ry: 42 }, wait: 600 },
      { t: 'dialogue', who: '你', text: '这是哪里?', hold: 1200 },
      { t: 'dialogue', who: '他', text: '这里曾经是我的。', hold: 1800 },

      // 段 2 远处低吼：揭到全图 + emotion red-alert 一闪
      { t: 'scene', reveal: { shape: 'ellipse', cx: 50, cy: 50, rx: 100, ry: 100 } },
      { t: 'emotion', preset: 'red-alert' },
      { t: 'burst', kind: 'shake' },
      { t: 'npc', text: '——一声沉闷的低吼。', from: 'top', life: 3500 },
      { t: 'wait', ms: 800 },
      { t: 'emotion', clear: true },
      { t: 'para', text: '连地面都在震。狐狸的身体几不可察地僵了一下，加快了脚步。你看着他的背影——这只把你当玩具的妖，原来也有怕的东西。', hold: 2600 },
    ],
  },

  // ============================================================
  // 场景 6 · 月夜洞穴 (5:00 - 6:30) [v2 新架构]
  // 整图：羊人吃尸体.webp · env: cold-blue · fxDominant: moonbeam
  // 覆盖率推进：洞内中央 40% → 偏移含羊人剪影 55% → 缩回看墙 25% → 训狗诗
  // ============================================================
  {
    id: 'scene-6',
    title: '月夜洞穴',
    init: {
      // 入场是洞内：纯暗 bgColor + 月光柱主导特效。羊人 bg 与角色立绘均不出现，
      // 等到对应剧情节拍再切入。
      bgColor: '#0a0810',
      env: 'cold-blue',
      fxDominant: 'moonbeam',
      char: { pos: 'curled', visible: false },
    },
    beats: [
      { t: 'para', text: '入夜。他把你拽进洞穴，自己蜷到角落，很快睡着。月光从洞顶的缝隙漏下来。你想趁他睡着溜走，悄悄摸到洞口——', hold: 2200 },
      { t: 'await-swipe' },

      // 段 2 偷看羊人：bg 切到 羊人吃尸体.webp + reveal 偏向羊人剪影
      { t: 'scene', bg: '羊人吃尸体.webp', reveal: { shape: 'ellipse', cx: 55, cy: 50, rx: 58, ry: 49 } },
      { t: 'emotion', preset: 'red-alert' },
      { t: 'burst', kind: 'shake' },
      { t: 'wait', ms: 400 },
      { t: 'emotion', clear: true },
      { t: 'para', text: '外面，一只长着羊角的妖怪，正趴在地上啃食一具人形的尸体。它抬起头，鼻孔喷出血腥的雾。你浑身一冷，缩了回来。', hold: 2400 },
      { t: 'await-swipe' },

      // 段 3 缩回贴洞壁：bg 撤回纯暗，reveal 清掉
      { t: 'scene', bg: null, bgColor: '#0a0810', reveal: null },
      { t: 'para', text: '你贴着洞壁坐下，膝盖颤个不停。手指无意中碰到墙上一处粗糙的刻痕——你低头，月光下，石壁上歪歪扭扭刻着一行简体字。', hold: 2400 },
      { t: 'await-swipe' },

      // 段 4 训狗诗：3 行整体浮现在画面上 1/3 中央，冷月青色（cipher 已重构）
      { t: 'cipher', text: '一式投食记心房\n二式顺毛莫逆\n三式坐令立威', hold: 2200 },
      { t: 'para', text: '这是——人类留下的训狗三式。', hold: 2000 },
      // 时空门 · 回响视频：用户点击隧道入口 → 视频从入口扩张全屏 → 播完缩回消失
      { t: 'portal-video', src: 'src/videos/回响视频.mp4' },
      { t: 'await-swipe' },

      // 段 5 主控决意：此刻才让蜷缩的他出现（curled + character-glow）
      { t: 'char-show', on: true },
      { t: 'burst', kind: 'character-glow' },
      { t: 'para', text: '你抬头看角落里蜷着的他——耳朵随呼吸轻轻颤动，比白天小了一圈。心里一紧，又一动。', hold: 2800 },
    ],
  },

  // ============================================================
  // 场景 7 · 晨光讨好 + 摸摸 (6:30 - 9:00)
  // ============================================================
  {
    id: 'scene-7',
    title: '晨光讨好',
    init: {
      // cj5 黄昏花田（蓝花+黄花+黄色天光+扭曲枯树），氛围天然适配晨光讨好
      bg: 'cj5.jpg',
      bgColor: '#3a2a1c',
      // 起手椭圆 30% 露出花田中心（"刚出洞口看到晨光"），后续推进到 51%/60%（亲密点不全揭，给焦距感）
      reveal: { shape: 'ellipse', cx: 50, cy: 55, rx: 33, ry: 29 },
      env: 'dawn-warm',
      char: { pos: 'curled', visible: true },
    },
    beats: [
      { t: 'para', text: '他还睡着，蜷成一团，比夜里小了一圈。你出洞口摘了几个果子和几片叶子，捣了半天，挤了一杯。果汁有点酸涩，但闻起来还行。', hold: 2400 },
      { t: 'await-swipe' },

      { t: 'pos', pos: 'close' },
      { t: 'para', text: '你走回去，蹲在他面前。他迷迷糊糊地睁眼，嗅了嗅你递过去的杯子。慢慢喝了一口。', hold: 1800 },

      // 对话节拍
      { t: 'ring', prompt: ['想他夸一句', '问还要不要', '问好不好喝'], text: '好喝吗?' },
      { t: 'aside', text: '他没回答。但耳朵微微动了一下。' },
      { t: 'wait', ms: 1500 },
      { t: 'ring', prompt: ['夸自己手艺', '说再做一杯', '问他想喝什么'], text: '我能再做一杯。' },
      // 他要开口前，把上一条 aside "他没回答..." 主动漂走（自相矛盾）
      { t: 'clear-narration' },
      { t: 'dialogue', who: '他', text: '你比我以前的猎物有意思。', hold: 1800 },
      { t: 'pose', pose: 'tilt' },
      { t: 'await-swipe' },

      // 内心 OS · 摸摸前 —— reveal 扩到 ~51%（晨光更亮但仍是焦距）+ character-glow
      { t: 'scene', reveal: { shape: 'ellipse', cx: 50, cy: 55, rx: 43, ry: 38 }, wait: 600 },
      { t: 'inner', text: '训狗三式 · 二式 · 顺毛莫逆。' },
      { t: 'wait', ms: 1500 },
      { t: 'para', text: '他歪头看你，露出难得的平静。你慢慢伸出手——他没躲。', hold: 1800 },
      { t: 'pos', pos: 'extreme' },
      { t: 'fx', kind: 'character-glow' },
      { t: 'await-swipe' },

      // 亲密点 reveal 60%（焦距感，不全揭）
      { t: 'scene', reveal: { shape: 'ellipse', cx: 50, cy: 50, rx: 46, ry: 42 } },
      // pet 占位：长按 1s 触发摸摸
      { t: 'pet' },

      // 摸摸 4 阶 —— 立绘差分肉眼难辨，靠 pose 滤镜 + emotion 渐变 + 节奏停顿撑递进
      // 阶段 1（紧绷 0-25%）
      { t: 'pose', pose: 'tense' },
      { t: 'aside', text: '他没动。耳朵僵了一下。' },
      { t: 'wait', ms: 1800 },

      // 阶段 2（接受 25-50%）—— pose relaxing + emotion 浅染
      { t: 'pose', pose: 'relaxing' },
      { t: 'emotion', preset: 'flush-rose-soft' },
      { t: 'aside', text: '耳朵慢慢放下来，尾巴梢轻轻一颤。' },
      { t: 'wait', ms: 1800 },

      // 阶段 3（脸红 50-75%）—— pose squint + emotion 满染
      { t: 'pose', pose: 'squint' },
      { t: 'emotion', preset: 'flush-rose' },
      { t: 'aside', text: '他喉咙里发出一声很轻的低吟。' },
      { t: 'wait', ms: 1800 },

      // 阶段 4（最轻松 75-100%）—— pose tail-curl + emotion 退（dawn-warm 接管）+ character-glow
      { t: 'pose', pose: 'tail-curl' },
      { t: 'emotion', clear: true },
      { t: 'burst', kind: 'character-glow' },
      { t: 'para', text: '尾巴慢慢卷上来，蹭过你的手背。又是一声低吟，比刚才更软。', hold: 2200 },
      { t: 'await-swipe' },

      // 提议出去 —— emotion 保持（接续段 8 由暖转冷的反差铺垫）
      { t: 'ring', prompt: ['拉他一起走', '提议出去', '问他想去哪'], text: '要不我们出去看看?' },
      { t: 'pose', pose: 'closed-eye' },
      { t: 'dialogue', who: '他', text: '好啊——', hold: 1500 },
    ],
  },

  // ============================================================
  // 场景 8 · 钩子 (9:00 - 10:00) [v2 新架构]
  // 整图：宅院.webp · env: dawn-warm → fog-mansion · 覆盖率：0% → 60% → 100%
  // 假笑 emotion cold-shock 是钩子点睛
  // ============================================================
  {
    id: 'scene-8',
    title: '钩子',
    init: {
      bgColor: '#0c0a0e',
      env: 'dawn-warm',
      char: { pos: 'extreme', pose: 'closed-eye', visible: true },
    },
    beats: [
      // 段 1 他睁眼冷漠：emotion cold-shock 一闪
      { t: 'pose', pose: 'cold' },
      { t: 'emotion', preset: 'cold-shock' },
      { t: 'burst', kind: 'flash' },
      { t: 'wait', ms: 400 },
      { t: 'emotion', clear: true },
      { t: 'para', text: '他睁眼。金瞳里刚才的松弛全没了。', hold: 1500 },
      { t: 'dialogue', who: '他', text: '那我带你去转转。', hold: 1500 },
      { t: 'await-swipe' },

      // 段 2 雾涌起 + 宅院浮：env 转 fog-mansion，宅院.webp 从中心椭圆渐扩
      { t: 'env', preset: 'fog-mansion' },
      { t: 'scene', bg: '宅院.webp', reveal: { shape: 'ellipse', cx: 50, cy: 60, rx: 40, ry: 35 } },
      { t: 'burst', kind: 'rising-fog', duration: 1500 },
      { t: 'fx', kind: 'lanterns-on' },
      { t: 'para', text: '浓雾骤然变浓，遮天蔽日。你回头——密林不见了。雾里浮起一座宅院，红灯高挂。', hold: 2600 },
      // 露出扩大到 ~78%（贴愿景中段曲线，留 22% 给雾气/留白）
      { t: 'scene', reveal: { shape: 'ellipse', cx: 50, cy: 55, rx: 55, ry: 45 } },
      { t: 'dialogue', who: '他', text: '——这是这岛上唯一像样的地方。', hold: 1800 },
      { t: 'await-swipe' },

      // 段 3 假笑钩子点睛 —— pupil-shrink 惊缩 + cold-shock 二闪 + shake 多重叠加
      { t: 'pose', pose: 'fake-smile' },
      { t: 'emotion', preset: 'cold-shock' },
      // 立绘惊缩（瞳孔急缩反应）+ 屏震并发，0.3s 内同时发生
      { t: 'burst', kind: 'pupil-shrink', duration: 320 },
      { t: 'burst', kind: 'shake' },
      { t: 'para', text: '你抬头看他。他嘴角的弧度被硬拉上去——不是人的弧度。', hold: 2400 },
      { t: 'emotion', clear: true },
      { t: 'await-swipe' },

      // 段 4 镜头转向庭院：reveal 全揭示，立绘退场、纸扎人不绘——只留庭院 + 旁白
      { t: 'scene', reveal: { shape: 'ellipse', cx: 50, cy: 50, rx: 100, ry: 100 } },
      { t: 'char-show', on: false },
      { t: 'para', text: '庭院中央，一群"人"正在僵硬地扭动。你看清他们的脸——是粗糙的墨笔勾出来的。', hold: 3000 },
    ],
  },
];
