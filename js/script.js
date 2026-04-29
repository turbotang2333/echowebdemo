// v4 shot-driven script — 10 user inputs + 1 pet gesture, shot-based pacing.
// Camera (景别) progression: far → far-lit → mid → mid → mid (w/ flinch) → mid → close → extreme → extreme → pet
// Character brightness/opacity controlled via char-pos { brightness, opacity }.
// Positioning uses top + transform-origin 50% 20% (shoulder anchor).
//   far:      top 10vh,  scale 0.3   → small distant figure at upper area
//   mid:      top 5vh,   scale 0.65  → medium figure centered
//   mid-back: top 10vh,  scale 0.5   → flinch pull-back
//   close:    top 35vh,  scale 1.05  → head/shoulders at middle-bottom
//   extreme:  top 40vh,  scale 1.15  → face close-up at lower area
//
// Background reveal pattern:
//   - Every round has some background visible
//   - At each distance transition (far→mid, mid→close): background goes FULL
//   - 1-2 rounds after full: shrinks back to small
//   - Then gradually grows larger each round until next transition → FULL again
//
// Persistent bg spot id: 'bg'
// Additional overlay spots: 'flash' etc.

export const SCRIPT = [
  // ===================== Prologue — 回响 =====================
  { t: 'bg', color: '#070811' },
  { t: 'echo-prologue' },

  // ===================== 第一幕 · 黑中见影 (far) =====================
  { t: 'bg', color: '#000000' },
  { t: 'art-set', spec: [] },
  // Round 1: tiny flicker — background visible from the start
  { t: 'scene', img: 'cj1.jpg', spots: [{ id: 'bg', kind: 'spot', x: 0.5, y: 0.92, r: 0.04, feather: 0.08, opacity: 0.2 }] },
  { t: 'pause', ms: 600 },
  { t: 'char-enter' },

  { t: 'dialogue', who: '他', text: '……谁?' },

  { t: 'user-input', text: '……我听到你了。' },
  { t: 'narration', text: '黑暗深处,有东西在看你' },
  // bg grows slightly after round 1 narration
  { t: 'scene-update', id: 'bg', to: { x: 0.5, y: 0.9, r: 0.06, feather: 0.1, opacity: 0.3 } },

  // far-lit: slightly brighter
  { t: 'user-action', text: '不自觉地走近了一步' },
  { t: 'char-pos', spec: { scale: 0.35, brightness: 0.6, opacity: 0.85 } },
  // Round 2 start: bg glimmer grows
  { t: 'scene-update', id: 'bg', to: { x: 0.5, y: 0.88, r: 0.1, feather: 0.14, opacity: 0.45 } },
  { t: 'dialogue', who: '他', text: '……水妖?刚化形?' },

  { t: 'user-input', text: '你是谁?' },
  { t: 'dialogue', who: '他', text: '叫什么不重要。' },
  { t: 'dialogue', who: '他', text: '这里没人会再记得我的名字。' },
  { t: 'narration', text: '远处的影子微动了一下——他说这句话的时候,声音淡了' },

  // ===================== 第二幕 · 走近 (far → mid) =====================
  // TRANSITION: full reveal of cj1
  { t: 'char-pos', spec: { scale: 0.65, y: '5vh', brightness: 1, opacity: 1 } },
  { t: 'scene-update', id: 'bg', to: { kind: 'full', feather: 0.22, opacity: 0.92 } },

  { t: 'dialogue', who: '他', text: '……你走近了。' },
  { t: 'dialogue', who: '他', text: '新来的水妖,化形倒挺好看。' },
  { t: 'dialogue', who: '他', text: '不是我捞你上来,你早被那东西吞了。' },

  // Round 3: still full (1st round after transition)
  { t: 'user-action', text: '下意识回头张望' },
  { t: 'pose', pose: 'tilt' },
  { t: 'dialogue', who: '他', text: '蚀骨鱼龙。这水里最饿、也最丑的家伙。' },
  { t: 'dialogue', who: '他', text: '该说谢谢的时候,你问"你是谁"?' },

  // Round 4: 2nd round after transition, shrink back from full
  { t: 'user-input', text: '……谢谢。你被关在这里多久了?' },
  { t: 'pose', pose: 'step-back' },
  // bg shrinks from full to small spot
  { t: 'scene-update', id: 'bg', to: { kind: 'spot', x: 0.5, y: 0.7, r: 0.15, feather: 0.12, opacity: 0.55 } },
  { t: 'dialogue', who: '他', text: '……记不清了。' },
  { t: 'dialogue', who: '他', text: '换我问你——你怎么进来的?' },

  // ===================== 第三幕 · 对峙 (mid) =====================
  // Round 5: small bg, starts growing
  { t: 'user-input', text: '我用法阵进来的。' },
  { t: 'pose', pose: 'lean-in' },
  // bg grows: small → medium
  { t: 'scene-update', id: 'bg', to: { kind: 'spot', x: 0.5, y: 0.6, r: 0.22, feather: 0.16, opacity: 0.68 } },
  { t: 'dialogue', who: '他', text: '哦?会布阵的水妖?' },
  { t: 'dialogue', who: '他', text: '你不是普通水里来的东西。' },

  // Round 6: bg continues growing
  { t: 'user-input', text: '你……以前是不是住在皇城?' },
  // shock flinch: pull back + dim
  { t: 'char-pos', spec: { scale: 0.5, y: '10vh', brightness: 0.85 } },
  { t: 'pose', pose: 'step-back' },
  { t: 'shake' },
  // bg flashes larger during shock
  { t: 'scene-update', id: 'bg', to: { kind: 'spot', x: 0.5, y: 0.55, r: 0.28, feather: 0.18, opacity: 0.75 } },
  { t: 'dialogue', who: '他', text: '……你怎么知道?' },
  { t: 'pause', ms: 300 },
  { t: 'narration', text: '血染镜面,黑气化作他的轮廓——是预言里那个被流放的孩子' },
  // recover to mid, bg grows further
  { t: 'char-pos', spec: { scale: 0.65, y: '5vh', brightness: 1 } },
  { t: 'pose', pose: 'lean-in' },
  // bg near-full, building toward next transition
  { t: 'scene-update', id: 'bg', to: { kind: 'full', feather: 0.2, opacity: 0.85 } },
  { t: 'dialogue', who: '他', text: '看你那副表情。' },
  { t: 'dialogue', who: '他', text: '你是不是……知道点什么?' },

  // Round 7: bg near-full
  { t: 'user-action', text: '别开视线，心跳加快' },
  { t: 'dialogue', who: '他', text: '你撒谎也不挑场合。' },

  // ===================== 第四幕 · 逼近 (mid → close) =====================
  // TRANSITION: full reveal, new scene cj2
  { t: 'pause', ms: 400 },
  { t: 'shake' },
  { t: 'scene', img: 'cj2.jpg', spots: [{ id: 'bg', kind: 'full', feather: 0.15, opacity: 1 }] },
  { t: 'char-pos', spec: { scale: 1.05, y: '35vh' } },
  { t: 'pose', pose: 'attack' },
  { t: 'narration', text: '水面忽然炸开一道阴影' },
  { t: 'dialogue', who: '他', text: '它来了。' },
  { t: 'dialogue', who: '他', text: '我饿了。' },
  { t: 'dialogue', who: '他', text: '……不如把你吃了。' },

  // Round 8: 1st round after transition, full, then start shrinking
  { t: 'user-action', text: '一把拉住他的手往后拽' },
  { t: 'pose', pose: 'tilt' },
  // bg shrinks from full
  { t: 'scene-update', id: 'bg', to: { kind: 'spot', x: 0.5, y: 0.55, r: 0.3, feather: 0.18, opacity: 0.82 } },
  // dramatic threat flash overlay
  { t: 'scene-add', spec: { id: 'flash', kind: 'spot', x: 0.5, y: 0.55, r: 0.12, feather: 0.1, opacity: 0.8 } },
  { t: 'dialogue', who: '他', text: '哦?' },
  { t: 'art-add', spec: { id: 'gold-rope', kind: 'thread', x: 0.34, y: 0.55, opacity: 0.95 } },
  { t: 'dialogue', who: '他', text: '你刚来,怎么就知道?' },
  { t: 'scene-remove', id: 'flash' },

  // Round 9: bg growing back toward full
  { t: 'user-action', text: '伸手握住他的手腕' },
  // bg grows toward full
  { t: 'scene-update', id: 'bg', to: { kind: 'full', feather: 0.18, opacity: 0.92 } },
  // push to extreme: face close-up at lower area
  { t: 'char-pos', spec: { scale: 1.15, y: '40vh' } },
  { t: 'pose', pose: 'lean-in' },
  { t: 'dialogue', who: '他', text: '……带我?' },
  { t: 'pose', pose: 'crouch-eye' },
  { t: 'dialogue', who: '他', text: '你?' },

  // ===================== 第五幕 · 摸摸 (extreme + pet) =====================
  // TRANSITION: full reveal, warm scene cj3
  { t: 'bg', color: '#1a1108' },
  { t: 'art-set', spec: [] },
  { t: 'scene', img: 'cj3.jpg', spots: [{ id: 'bg', kind: 'full', feather: 0.2, opacity: 0.9 }] },
  { t: 'char-pos', spec: { scale: 1.15, y: '40vh', brightness: 1 } },
  { t: 'pose', pose: 'crouch-eye' },
  { t: 'dialogue', who: '他', text: '……好吧。' },
  { t: 'dialogue', who: '他', text: '不过你既然说要带我走——' },
  { t: 'scene-update', id: 'bg', to: { kind: 'full', feather: 0.15, opacity: 0.95 } },
  { t: 'dialogue', who: '他', text: '先碰我一下。' },
  { t: 'dialogue', who: '他', text: '证明你真的在这。' },
  { t: 'pause', ms: 500 },
  // activate pet interaction
  { t: 'petable', on: true },
  { t: 'await-pet' },
  { t: 'pet-flash' },
  { t: 'petable', on: false },
  { t: 'narration', text: '指尖触到他的瞬间——温热的、真实的、不属于这片水域的温度' },
  { t: 'pause', ms: 800 },
  { t: 'thread' },
  { t: 'art-remove', id: 'gold-rope' },
  { t: 'dialogue', who: '他', text: '……可别想着逃啊。' },

  { t: 'pose', pose: 'turn-back' },
  { t: 'pause', ms: 400 },
  { t: 'dialogue', who: '他', text: '对了——你既然会卜算……' },
  { t: 'dialogue', who: '他', text: '那你认不认识什么"司星使"?' },
  { t: 'scene', img: 'cj4.png', spots: [{ id: 'bg', kind: 'full', feather: 0.18, opacity: 1 }] },
  { t: 'dialogue', who: '他', text: '听说我一生下来就被丢到这里,全是拜他所赐。' },
  { t: 'pause', ms: 500 },
  { t: 'narration', text: '林间的风、远处的鸦啼,所有声音戛然而止' },
  { t: 'narration', text: '世界里只剩下他顽劣的笑,和我胸腔里因恐惧而加快的心跳' },
  { t: 'bg', color: '#050409' },
  { t: 'pause', ms: 800 },
  { t: 'scene-clear' },
  { t: 'finale' },
];