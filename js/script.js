// Scene script for the v1 demo, transcribed from story_integration_v2.md §4.
// All event types are handled by player.js. Order matters.
//
// Event grammar:
//   { t: 'narration' | 'inner' | 'heavy', text }
//   { t: 'dialogue', who: '他' | '你', text }
//   { t: 'npc',  text, from: 'top' | 'right' }
//   { t: 'pause', ms }
//   { t: 'pose', pose }                        // pose name from character.js
//   { t: 'flash' }                             // brief flash on character
//   { t: 'char-enter' }                        // character entrance animation
//   { t: 'char-show', visible }
//   { t: 'art-set', spec }                     // replace ambient art
//   { t: 'art-add', spec }                     // add a single art element
//   { t: 'art-remove', id }
//   { t: 'thread' }                            // gold thread art
//   { t: 'bg', color }                         // background color
//   { t: 'shake' }
//   { t: 'blink', color? }                     // blink transition
//   { t: 'opening' }                           // run opening sequence (Scene 0)
//   { t: 'await-tap', target }                 // wait for tap on target id
//   { t: 'user-input', text }                  // user input point — long-press ring
//   { t: 'finale' }                            // demo end

export const SCRIPT = [
  // =================== Scene 0 — opening ritual ===================
  // Pre-set Scene 1 bg under the opening's black overlay so the white-flash
  // resolves into the marsh color, not the default dark purple.
  { t: 'bg', color: '#0d1a18' },
  { t: 'art-set', spec: [
    { kind: 'branch', x: 0.12, y: 0.18, opacity: 0.55, drift: 8 },
    { kind: 'branch', x: 0.78, y: 0.22, opacity: 0.45, drift: 9, scale: 0.8 },
    { kind: 'lightpoint', x: 0.62, y: 0.36, opacity: 0.6, drift: 7 },
  ]},
  { t: 'opening' }, // self-contained: runs the black-screen poetry + glow + long-press

  // =================== Scene 1 — sloshmarsh wake ===================
  { t: 'pause', ms: 700 },
  { t: 'narration', text: '意识被撕开一道裂口,百年间的记忆如洪流倒灌' },
  { t: 'narration', text: '四周树枝歪歪扭扭,像巨人的指骨,天幕覆着令人不安的流光' },
  { t: 'inner', text: '我的法阵成功了……可这是什么地方?' },
  { t: 'narration', text: '远处传来婴儿的啼哭,细弱、无助,像在等着谁去安抚' },
  { t: 'narration', text: '我循着哭声走过去——' },
  { t: 'pause', ms: 2000 },

  // =================== Scene 2 — 哀婴兰 ===================
  { t: 'art-add', spec: { kind: 'flower', x: 0.55, y: 0.5, opacity: 0.9 } },
  { t: 'narration', text: '粉嫩的皮肤,微张的小嘴,正发出令人心碎的啼哭' },
  { t: 'inner', text: '哀婴兰?这种妖植只会生在怨气不散之地……' },
  { t: 'pause', ms: 600 },
  { t: 'shake' },
  { t: 'heavy', text: '突然,一个巨大的黑影猛地从我头顶罩了下来' },
  { t: 'npc', text: '乖儿……娘的心肝……', from: 'top' },
  { t: 'pause', ms: 800 },
  { t: 'shake' },
  { t: 'heavy', text: '她的身体轰然炸开,腥臭的碎羽和烂肉从天砸下' },
  { t: 'inner', text: '这种地方……是书中记载的狗牙岛?' },
  { t: 'inner', text: '我不属于这里,得离开。' },
  { t: 'narration', text: '我不顾一切跃入水流' },
  { t: 'pause', ms: 400 },
  { t: 'blink' },

  // =================== Scene 3 — 水下变形 ===================
  { t: 'bg', color: '#040818' },
  { t: 'art-set', spec: [
    { kind: 'water', x: 0.3, y: 0.4, opacity: 0.55, drift: 9 },
    { kind: 'water', x: 0.55, y: 0.62, opacity: 0.45, drift: 8 },
    { kind: 'water', x: 0.72, y: 0.3, opacity: 0.5, drift: 9 },
    { kind: 'water', x: 0.4, y: 0.7, opacity: 0.4, drift: 8 },
  ]},
  { t: 'narration', text: '冰冷的河水瞬间包裹全身' },
  { t: 'narration', text: '骨骼在水流中重塑,淡金色鳞片瞬间覆盖全身' },
  { t: 'inner', text: '只要去到更深、更安全的水域……' },
  { t: 'narration', text: '然而,一股恐怖吸力猛地自身后袭来' },
  { t: 'inner', text: '糟了……' },
  { t: 'pause', ms: 600 },

  // =================== Scene 4 — 水下捕获(核心 1) ===================
  { t: 'heavy', text: '浑浊的漩涡中,怪鱼的獠牙巨口已近在咫尺──' },
  { t: 'pause', ms: 300 },
  { t: 'char-enter' },
  { t: 'narration', text: '天旋地转,刺目的光灼得我睁不开眼' },
  { t: 'inner', text: '得救了……是个狐妖?' },
  { t: 'inner', text: '……但这位狐妖,我好像在哪儿见过' },
  { t: 'pause', ms: 200 },
  { t: 'shake' },
  { t: 'heavy', text: '血染镜面,黑气化作他的轮廓——是预言中那个暴君' },
  { t: 'inner', text: '他竟然还活着!' },
  { t: 'pose', pose: 'attack' },
  { t: 'dialogue', who: '他', text: '饿……' },
  { t: 'heavy', text: '森白的尖牙带着杀意扑面袭来' },
  { t: 'inner', text: '他要吃我啊……!' },
  { t: 'pause', ms: 400 },

  // 用户输入点 1
  { t: 'user-input', text: '别别别别吃我!水里有一条更大的鱼!比我好吃一百倍!' },

  { t: 'pose', pose: 'tilt' },
  { t: 'dialogue', who: '他', text: '哦?可你是新来的吧。我住在这里这么久,怎么不知道还有又大又好吃的鱼?' },

  // 用户输入点 2
  { t: 'user-input', text: '真的,我亲眼所见。' },

  { t: 'pose', pose: 'step-back' },
  { t: 'dialogue', who: '他', text: '好啊,证明给我看。' },

  // 用户输入点 3
  { t: 'user-input', text: '……要怎么证明?' },

  { t: 'pose', pose: 'neutral' },
  { t: 'narration', text: '流体般的金色光芒倏然在他指尖缠绕' },
  { t: 'art-add', spec: { id: 'gold-rope', kind: 'thread', x: 0.34, y: 0.55, opacity: 0.95 } },
  { t: 'narration', text: '那光芒化作绳索将我紧紧捆缚' },
  { t: 'dialogue', who: '他', text: '去──把它钓上来。' },
  { t: 'dialogue', who: '你', text: '……你竟然拿我当鱼饵──!' },
  { t: 'pause', ms: 400 },
  { t: 'blink' },

  // =================== Scene 5 — 鱼饵 + 怪鱼之死 ===================
  { t: 'bg', color: '#1a1108' },
  { t: 'art-set', spec: [
    { kind: 'lightpoint', x: 0.7, y: 0.25, opacity: 0.5 },
    { kind: 'leaf', x: 0.85, y: 0.55, opacity: 0.45 },
  ]},
  { t: 'char-show', visible: true },
  { t: 'pose', pose: 'neutral' },
  { t: 'narration', text: '捆绑我的金线猛地一抽,将我甩上了岸' },
  { t: 'narration', text: '怪鱼跟着我跃出水面,庞大身躯被他掼在岸上' },
  { t: 'shake' },
  { t: 'narration', text: '头颅塌陷,鱼鳃发出濒死的骨响' },
  { t: 'inner', text: '蚀骨鱼龙……记载中能屠戮一村的凶物,竟然被他一下就……' },
  { t: 'pose', pose: 'eat' },
  { t: 'narration', text: '利爪轻松剖开了鱼龙坚硬的鳞甲' },
  { t: 'dialogue', who: '他', text: '腥臭……杂质太多了。' },
  { t: 'narration', text: '他像丢垃圾一样扔掉内脏,对着最肥美的鱼肉狼吞虎咽' },
  { t: 'narration', text: '鲜血染红了他白皙的下颌与脖颈' },
  { t: 'inner', text: '血统高贵的九尾狐小皇子,现在却活得像茹毛饮血的山野大妖' },
  { t: 'inner', text: '这都是因为我那一道预言……' },
  { t: 'pose', pose: 'turn-back' },
  { t: 'dialogue', who: '他', text: '……三分饱。' },
  { t: 'narration', text: '他向我靠近,笑容灿烂而危险' },
  { t: 'pose', pose: 'lean-in' },
  { t: 'dialogue', who: '他', text: '原来,你化形后是这副皮相啊。' },
  { t: 'pause', ms: 600 },

  // =================== Scene 6 — 跑! ===================
  { t: 'char-show', visible: false },
  { t: 'show', target: 'run-anchor' },
  { t: 'heavy', text: '跑!' },
  { t: 'await-tap', target: 'run-anchor' },
  { t: 'bg', color: '#0a0d09' },
  { t: 'art-set', spec: [
    { kind: 'branch', x: 0.1, y: 0.2, opacity: 0.45, scale: 0.9 },
    { kind: 'branch', x: 0.85, y: 0.18, opacity: 0.4 },
  ]},
  { t: 'narration', text: '我一头扎进密林' },
  { t: 'inner', text: '他是陆生妖,我是水生妖,只要找到水域……' },
  { t: 'art-add', spec: { id: 'flame1', kind: 'flame', x: 0.5, y: 0.45, opacity: 0.95 } },
  { t: 'inner', text: '……是巧合吗?' },
  { t: 'art-add', spec: { id: 'flame2', kind: 'flame', x: 0.3, y: 0.55, opacity: 0.9 } },
  { t: 'art-add', spec: { id: 'flame3', kind: 'flame', x: 0.7, y: 0.5, opacity: 0.9 } },
  { t: 'art-add', spec: { id: 'flame4', kind: 'flame', x: 0.22, y: 0.32, opacity: 0.85 } },
  { t: 'art-add', spec: { id: 'flame5', kind: 'flame', x: 0.78, y: 0.34, opacity: 0.85 } },
  { t: 'narration', text: '每次,新的火焰总会在我选择的路径上燃起' },
  { t: 'pause', ms: 800 },
  { t: 'blink' },

  // =================== Scene 7 — 树下交涉(核心 2) ===================
  { t: 'bg', color: '#1a0e10' },
  { t: 'art-set', spec: [
    { kind: 'leaf', x: 0.85, y: 0.25, opacity: 0.5 },
    { kind: 'lightpoint', x: 0.7, y: 0.6, opacity: 0.4 },
  ]},
  { t: 'char-show', visible: true },
  { t: 'pose', pose: 'neutral' },
  { t: 'narration', text: '他的指尖悠闲地把玩着一小簇跳跃的火苗' },
  { t: 'art-add', spec: { id: 'hand-flame', kind: 'flame', x: 0.32, y: 0.5, opacity: 0.9, scale: 0.7 } },
  { t: 'dialogue', who: '他', text: '这么快就回来了?' },
  { t: 'pause', ms: 400 },
  { t: 'pose', pose: 'lean-in' },
  { t: 'art-remove', id: 'hand-flame' },
  { t: 'narration', text: '身体被他圈禁在身后的树干,无法挣脱' },
  { t: 'dialogue', who: '他', text: '啊,说错了。这次赶的,是条小鱼。' },
  { t: 'dialogue', who: '他', text: '游戏结束,有什么遗言吗?' },
  { t: 'dialogue', who: '他', text: '那就……再见啦。' },
  { t: 'heavy', text: '灼热的吐息已然贴上血管,犬牙陷进我的皮肤' },

  // 用户输入点 4
  { t: 'user-input', text: '等一下……!' },

  { t: 'pose', pose: 'attack' },
  { t: 'dialogue', who: '他', text: '……又怎么了?' },

  // 用户输入点 5
  { t: 'user-input', text: '我能带你离开。我精通卜算布阵——我就是凭阵法找来这里的,自然也有办法找到出路。' },

  { t: 'pose', pose: 'step-back' },
  { t: 'narration', text: '他凑近,嗓音诱哄而危险' },
  { t: 'pose', pose: 'lean-in' },
  { t: 'dialogue', who: '他', text: '那你现在带我出去啊。' },

  // 用户输入点 6
  { t: 'user-input', text: '……现在不行,进来这里耗尽了我的妖力,我总得需要时间恢复。' },

  { t: 'dialogue', who: '他', text: '看吧,果然是谎话。' },

  // 用户输入点 7
  { t: 'user-input', text: '你不会这点耐心都没有吧?如果你宁可杀鸡取卵,那就只能永远被困在这里了。' },

  { t: 'narration', text: '他的金瞳审视着我,但控制的力量丝毫没有减弱' },
  { t: 'pause', ms: 2000 },
  { t: 'narration', text: '他终于松开了手,我跌坐在地,大口喘息' },
  { t: 'thread' },
  { t: 'pose', pose: 'crouch-eye' },
  { t: 'narration', text: '他蹲下身,声音轻得仿佛情人低语' },
  { t: 'dialogue', who: '他', text: '可别想着逃啊,不然会死得很惨的。' },
  { t: 'pose', pose: 'neutral' },

  // =================== Scene 8 — 司星使悬念 + 事记回看 ===================
  { t: 'pose', pose: 'turn-back' },
  { t: 'pause', ms: 400 },
  { t: 'dialogue', who: '他', text: '对了,你既然会卜算,那你……认不认识什么"司星使"?' },
  { t: 'dialogue', who: '他', text: '听说我一生下来就被丢到这里,全是拜她所赐。' },
  { t: 'pause', ms: 400 },
  { t: 'heavy', text: '林间的风,远处的鸦啼,所有声音在这一刻戛然而止' },
  { t: 'heavy', text: '世界里只剩下他顽劣的笑,和我胸腔里因恐惧而加快的心跳' },
  { t: 'bg', color: '#050409' },
  { t: 'pause', ms: 800 },
  { t: 'finale' },
];
