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
//   { t: 'pet' }                                   // 摸摸（占位）

export const SCRIPT = [
  // ============================================================
  // 场景 1 · 黑暗水中 (0:00 - 0:50)
  // ============================================================
  {
    id: 'scene-1',
    title: '黑暗水中',
    init: {
      bgColor: '#000000',
      char: { pos: 'far', visible: true },
    },
    beats: [
      // 旁白 1
      { t: 'para', text: '你睁眼，是黑色。耳边只有水声，和皮肤上的冷气。远处的水面亮起一双金色的眼睛。', hold: 1500 },
      { t: 'pos', pos: 'far-lit' },
      { t: 'await-swipe' },

      // 对话 1：他："……谁?" → 圆弧 → 他："……水妖?" → 圆弧 → 他："叫什么不重要..."
      { t: 'dialogue', who: '他', text: '……谁?', hold: 800 },
      { t: 'ring', prompt: '试探回应', text: '……是谁在那?' },
      { t: 'dialogue', who: '他', text: '……水妖? 刚化形?', hold: 800 },
      { t: 'ring', prompt: '问他是谁', text: '你是谁?' },
      { t: 'dialogue', who: '他', text: '叫什么不重要。这里没人会再记得我的名字。', hold: 1800 },
      { t: 'pose', pose: 'tilt' },

      // 旁白 2
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
      char: { pos: 'mid', pose: 'attack', visible: true },
      fx: [{ kind: 'shake' }],
    },
    beats: [
      // 旁白 1：水面炸开 → 救
      { t: 'para', text: '水面突然炸开。你来不及反应——一只爪子从水里把你捞起来。逆光中，黑色的狐耳贴着湿发，一双金瞳近在眼前。是他。', hold: 1500 },
      { t: 'ring', prompt: '求救 / 道谢', text: '救……救命……' },
      { t: 'await-swipe' },

      // 对话 1
      { t: 'dialogue', who: '他', text: '好有活力的鱼。尝尝——', hold: 1200 },
      { t: 'ring', prompt: '别吃我！告诉他水里有更大的鱼', text: '别吃我！水里有更大的鱼！' },
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
      { t: 'fx', kind: 'shake' },
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
      char: { pos: 'mid', pose: 'lean-in', visible: true },
    },
    beats: [
      { t: 'para', text: '你瘫在岸上喘气，浑身湿透。他蹲在你面前，慢慢舔掉嘴角的血。', hold: 1500 },
      { t: 'await-swipe' },

      { t: 'dialogue', who: '他', text: '反悔了。或者——你有什么办法让我换换口味?', hold: 1500 },
      { t: 'ring', prompt: '主动开条件（比如说会做菜）', text: '我会做菜。' },
      { t: 'dialogue', who: '他', text: '那你做。做不好——', hold: 1200 },

      // 旁白 2
      { t: 'pose', pose: 'tilt' },
      { t: 'para', text: '你强作镇定，找出岛上的果子和不知名的小兽，凭着记忆里的几道菜给他做了一顿。他大快朵颐，眼里第一次有了新奇。', hold: 2200 },
      { t: 'await-swipe' },

      // 旁白 3：逃
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
      bgColor: '#0a0810',
      char: { pos: 'hidden', visible: false },
      fx: [{ kind: 'ghost-fire' }],
    },
    beats: [
      { t: 'para', text: '跑了多久不知道。前方的林间，无声无息地浮起一团团鬼火，从四面八方把你围住。藤蔓忽然活了，缠住你的脚踝。', hold: 2200 },
      { t: 'await-swipe' },

      { t: 'para', text: '头顶传来一声黏腻的开合。你抬头——一朵巨大的食人花张着血盆大口，朝你罩了下来。', hold: 1800 },
      { t: 'fx', kind: 'shake' },
      { t: 'await-swipe' },

      { t: 'fx', kind: 'flame-burst' },
      { t: 'wait', ms: 600 },
      { t: 'pos', pos: 'mid' },
      { t: 'pose', pose: 'cold' },
      { t: 'para', text: '"嗤——" 一道橙红色的火焰擦着你的脸炸开，烧穿了花的喉咙。烈焰中，他慢慢走出来，眼神冰冷。', hold: 1800 },
      { t: 'dialogue', who: '他', text: '你抢了我的猎物。', hold: 1500 },
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

      // 段 1 末：扩大露出区域到含肋骨段 ~55%
      { t: 'scene', reveal: { shape: 'ellipse', cx: 55, cy: 60, rx: 55, ry: 45 }, wait: 600 },
      { t: 'dialogue', who: '你', text: '这是哪里?', hold: 1200 },
      { t: 'dialogue', who: '他', text: '这里曾经是我的。', hold: 1800 },

      // 段 2 远处低吼：揭到全图 + emotion red-alert 一闪
      { t: 'scene', reveal: { shape: 'ellipse', cx: 50, cy: 50, rx: 100, ry: 100 } },
      { t: 'emotion', preset: 'red-alert' },
      { t: 'burst', kind: 'shake' },
      { t: 'npc', text: '——一声沉闷的低吼。', from: 'top', life: 3500 },
      { t: 'wait', ms: 800 },
      { t: 'emotion', clear: true },
      { t: 'para', text: '连地面都在震。狐狸的身体几不可察地僵了一下，加快了脚步。你看着他的背影——这只把你当玩具的妖，原来也怕什么。', hold: 2600 },
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
      bg: '羊人吃尸体.webp',
      // 段 1 入场：露出洞内中央月光区 ~45%
      reveal: { shape: 'ellipse', cx: 50, cy: 50, rx: 45, ry: 38 },
      env: 'cold-blue',
      fxDominant: 'moonbeam',
      char: { pos: 'curled', visible: true },
    },
    beats: [
      { t: 'para', text: '入夜。他把你拽进洞穴，自己蜷到角落，很快睡着。月光从洞顶的缝隙漏下来。你想趁他睡着溜走，悄悄摸到洞口——', hold: 2200 },
      { t: 'await-swipe' },

      // 段 2 偷看羊人：偏移到含羊人剪影位置 ~60% + emotion red-alert 一闪
      { t: 'scene', reveal: { shape: 'ellipse', cx: 55, cy: 50, rx: 60, ry: 50 } },
      { t: 'emotion', preset: 'red-alert' },
      { t: 'burst', kind: 'shake' },
      { t: 'wait', ms: 400 },
      { t: 'emotion', clear: true },
      { t: 'para', text: '外面，一只长着羊角的妖怪，正趴在地上啃食一具人形的尸体。它抬起头，鼻孔喷出血腥的雾。你浑身一冷，缩了回来。', hold: 2400 },
      { t: 'await-swipe' },

      // 段 3 缩回看墙：缩回左下小区域 ~30%
      { t: 'scene', reveal: { shape: 'ellipse', cx: 35, cy: 65, rx: 35, ry: 28 } },
      { t: 'para', text: '你贴着洞壁坐下，膝盖颤个不停。手指无意中碰到墙上一处粗糙的刻痕——你低头，月光下，石壁上歪歪扭扭刻着一行简体字。', hold: 2400 },
      { t: 'await-swipe' },

      // 段 4 训狗诗：暂用 heavy 文字（特效层 cipher-text 待 Phase 3 实现）
      { t: 'heavy', text: '一式投食记心房\n二式顺毛莫逆\n三式坐令显威光', hold: 2200 },
      { t: 'para', text: '这是——人类留下的训狗口诀。', hold: 2000 },
      { t: 'await-swipe' },

      // 段 5 主控决意
      { t: 'burst', kind: 'character-glow' },
      { t: 'para', text: '你抬头看角落里蜷着的他——耳朵随呼吸轻轻颤动，比白天小了一圈。心里一紧，又一动：硬跑跑不掉。那就——投其所好。', hold: 2800 },
    ],
  },

  // ============================================================
  // 场景 7 · 晨光讨好 + 摸摸 (6:30 - 9:00)
  // ============================================================
  {
    id: 'scene-7',
    title: '晨光讨好',
    init: {
      bg: 'cj3.jpg',
      bgColor: '#3a2a1c',
      char: { pos: 'curled', visible: true },
    },
    beats: [
      { t: 'para', text: '他还睡着，蜷成一团，比夜里小了一圈。你出洞口摘了几个果子和几片叶子，捣了半天，挤了一杯。果汁有点酸涩，但闻起来还行。', hold: 2400 },
      { t: 'await-swipe' },

      { t: 'pos', pos: 'close' },
      { t: 'para', text: '你走回去，蹲在他面前。他迷迷糊糊地睁眼，嗅了嗅你递过去的杯子。慢慢喝了一口。', hold: 1800 },

      // 对话节拍
      { t: 'ring', prompt: '问好不好喝', text: '好喝吗?' },
      { t: 'aside', text: '他没回答。但耳朵微微动了一下。' },
      { t: 'wait', ms: 1500 },
      { t: 'ring', prompt: '说我能再做一杯', text: '我能再做一杯。' },
      { t: 'dialogue', who: '他', text: '你比我以前的猎物有意思。', hold: 1800 },
      { t: 'pose', pose: 'tilt' },
      { t: 'await-swipe' },

      // 内心 OS · 摸摸前
      { t: 'inner', text: '训狗十八式 · 二式 · 顺毛莫逆。' },
      { t: 'wait', ms: 1500 },
      { t: 'para', text: '他歪头看你，露出难得的平静。你慢慢伸出手——他没躲。', hold: 1800 },
      { t: 'pos', pos: 'extreme' },
      { t: 'fx', kind: 'character-glow' },
      { t: 'await-swipe' },

      // 摸摸（占位）
      { t: 'pet' },
      { t: 'para', text: '你的指尖一直没停。他的尾巴慢慢卷上来，蹭过你的手背。喉咙里发出一声很轻的低吟。', hold: 2200 },
      { t: 'await-swipe' },

      // 提议出去
      { t: 'ring', prompt: '提议出去看看', text: '要不……我们出去看看?' },
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
      // 露出扩大
      { t: 'scene', reveal: { shape: 'ellipse', cx: 50, cy: 55, rx: 65, ry: 55 } },
      { t: 'dialogue', who: '他', text: '这是你一直想找的地方啊。', hold: 1800 },
      { t: 'await-swipe' },

      // 段 3 假笑钩子点睛
      { t: 'pose', pose: 'fake-smile' },
      { t: 'emotion', preset: 'cold-shock' },
      { t: 'burst', kind: 'shake' },
      { t: 'para', text: '你抬头看他。他嘴角的弧度被硬拉上去——不是人的弧度。', hold: 2400 },
      { t: 'emotion', clear: true },
      { t: 'await-swipe' },

      // 段 4 镜头转向庭院：reveal 全揭示 + 纸扎人
      { t: 'scene', reveal: { shape: 'ellipse', cx: 50, cy: 50, rx: 100, ry: 100 } },
      { t: 'fx', kind: 'nail-people-on' },
      { t: 'pos', pos: 'mid-back' },
      { t: 'para', text: '庭院中央，一群"人"正在僵硬地扭动。你看清他们的脸——是粗糙的墨笔勾出来的。', hold: 3000 },
    ],
  },
];
