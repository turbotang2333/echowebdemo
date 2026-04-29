// v3 dialogue-driven script — 18 user inputs, ~88% dialogue ratio.
// Scene reveal pacing: ~50% black, ~40% minor pulses (small spot/line/block,
// auto-fading after 2-3s), ~10% major reveals (full or near-full, ~5-7s).
// See ../../story_integration_v3.md for narrative spec.

export const SCRIPT = [
  // ===================== Prologue — 回响 =====================
  { t: 'bg', color: '#070811' },
  { t: 'echo-prologue' },

  // ===================== Scene 1 — 一睁眼就被他问 =====================
  { t: 'bg', color: '#0a0e14' },
  { t: 'art-set', spec: [] },
  { t: 'scene', img: 'cj1.jpg', spots: [] }, // preload only, no reveal
  { t: 'pause', ms: 600 },
  { t: 'char-enter' },
  { t: 'pose', pose: 'lean-in' },

  { t: 'dialogue', who: '他', text: '……你是谁?' },

  { t: 'user-input', text: '我……' },
  { t: 'narration', text: '刚化形,水还在身上滴' },

  { t: 'pose', pose: 'neutral' },
  { t: 'dialogue', who: '他', text: '新来的水妖?化形倒挺好看。' },
  { t: 'dialogue', who: '他', text: '不是我捞你上来,你早就被那东西吞了。' },

  { t: 'user-input', text: '那东西是什么?' },

  // first pulse — only after second exchange. small dark hint at pond bottom.
  { t: 'scene-pulse', duration: 2400,
    spec: { kind: 'spot', x: 0.5, y: 0.92, r: 0.05, feather: 0.09, opacity: 0.65 } },
  { t: 'dialogue', who: '他', text: '蚀骨鱼龙。这水里最饿、也最丑的家伙。' },
  { t: 'dialogue', who: '他', text: '该说谢谢的时候,你说"你是谁"?' },

  { t: 'user-input', text: '……谢谢。你叫什么?' },

  { t: 'dialogue', who: '他', text: '叫什么不重要。' },
  { t: 'dialogue', who: '他', text: '这里没人会再记得我的名字。' },
  // small distant-tree silhouette
  { t: 'scene-pulse', duration: 2800,
    spec: { kind: 'spot', x: 0.16, y: 0.3, r: 0.06, feather: 0.1, opacity: 0.75 } },
  { t: 'narration', text: '他说这句的时候,目光淡了一下' },

  { t: 'user-input', text: '你被关在这里多久了?' },

  { t: 'dialogue', who: '他', text: '……记不清了。' },
  { t: 'dialogue', who: '他', text: '换我问你——你怎么进来的?' },

  { t: 'user-input', text: '我用法阵进来的。' },

  { t: 'dialogue', who: '他', text: '哦?会布阵的水妖?' },
  { t: 'pose', pose: 'tilt' },
  // small glowing lotus
  { t: 'scene-pulse', duration: 2600,
    spec: { kind: 'spot', x: 0.7, y: 0.78, r: 0.05, feather: 0.08, opacity: 0.85 } },
  { t: 'dialogue', who: '他', text: '你不是普通水里来的东西。' },

  // ===================== Scene 2 — 闪回 · 是他 =====================
  { t: 'user-input', text: '你……以前是不是住在皇城?' },

  { t: 'pose', pose: 'step-back' },
  { t: 'dialogue', who: '他', text: '……你怎么知道?' },
  { t: 'pause', ms: 300 },
  { t: 'shake' },
  // MAJOR: water resonates with his shock — large band reveal of cj1
  { t: 'scene-pulse', duration: 4800,
    spec: { kind: 'band', side: 'bottom', amount: 0.78, feather: 0.32, opacity: 1 } },

  { t: 'pose', pose: 'lean-in' },
  { t: 'dialogue', who: '他', text: '看你那副表情。' },
  { t: 'dialogue', who: '他', text: '你是不是……知道点什么?' },

  { t: 'user-input', text: '……我什么都不知道。' },

  { t: 'dialogue', who: '他', text: '你撒谎也不挑场合。' },

  // ===================== Scene 3 — 危机 · 鱼饵 =====================
  { t: 'pause', ms: 400 },
  { t: 'shake' },
  // switch image to cj2 (red/danger pond) — preload, no visual yet
  { t: 'scene', img: 'cj2.jpg', spots: [] },
  // MAJOR: beast bursts — full near-screen reveal during narration
  { t: 'scene-pulse', duration: 6500,
    spec: { kind: 'full', feather: 0.18, opacity: 1 } },
  { t: 'narration', text: '水面忽然炸开一道阴影' },
  { t: 'pose', pose: 'attack' },
  { t: 'dialogue', who: '他', text: '它来了。' },
  { t: 'dialogue', who: '他', text: '我饿了。' },
  { t: 'dialogue', who: '他', text: '……不如把你吃了。' },

  { t: 'user-input', text: '等等等等!水里有更大的——比我好吃一百倍!' },

  { t: 'pose', pose: 'tilt' },
  { t: 'dialogue', who: '他', text: '哦?' },
  // minor pulse: lingering threat at center
  { t: 'scene-pulse', duration: 2400,
    spec: { kind: 'spot', x: 0.5, y: 0.55, r: 0.07, feather: 0.11, opacity: 0.8 } },
  { t: 'dialogue', who: '他', text: '你刚来,怎么就知道?' },

  { t: 'user-input', text: '我刚游过,亲眼见过。' },

  { t: 'pose', pose: 'neutral' },
  { t: 'dialogue', who: '他', text: '那你证明给我看。' },

  { t: 'user-input', text: '怎么证明?' },

  { t: 'dialogue', who: '他', text: '很简单。' },
  { t: 'art-add', spec: { id: 'gold-rope', kind: 'thread', x: 0.34, y: 0.55, opacity: 0.95 } },
  // minor pulse: gold rope dropping into water — vertical sliver
  { t: 'scene-pulse', duration: 2600,
    spec: { kind: 'stripe', dir: 'v', x: 0.36, thickness: 0.025, feather: 0.06, opacity: 0.85 } },
  { t: 'dialogue', who: '他', text: '你去当饵,我抓它。' },

  { t: 'user-input', text: '……你竟然拿我当鱼饵?' },

  { t: 'dialogue', who: '他', text: '嗯。' },
  { t: 'dialogue', who: '他', text: '运气好你不会死。' },
  { t: 'pause', ms: 400 },
  { t: 'blink' },

  // ===================== Scene 4 — 鱼饵之后 =====================
  { t: 'bg', color: '#1a1108' },
  { t: 'art-set', spec: [] },
  { t: 'scene', img: 'cj3.jpg', spots: [] }, // preload only
  { t: 'char-show', visible: true },
  { t: 'pose', pose: 'eat' },
  { t: 'dialogue', who: '他', text: '……腥臭。' },
  { t: 'dialogue', who: '他', text: '杂质太多。' },
  // MAJOR: pond resolves — cj3 full reveal at the punchline
  { t: 'scene-pulse', duration: 5500,
    spec: { kind: 'full', feather: 0.22, opacity: 0.95 } },
  { t: 'dialogue', who: '他', text: '……才三分饱。' },
  { t: 'pose', pose: 'lean-in' },
  { t: 'dialogue', who: '他', text: '原来你化形之后,是这副皮相啊。' },

  { t: 'user-input', text: '等等,你别——' },

  { t: 'dialogue', who: '他', text: '听话。' },
  { t: 'dialogue', who: '他', text: '你这种小妖,牙不沾。' },
  { t: 'pause', ms: 300 },
  // minor pulse: edge sliver as you flee
  { t: 'scene-pulse', duration: 2200,
    spec: { kind: 'stripe', dir: 'v', x: 0.92, thickness: 0.02, feather: 0.06, opacity: 0.7 } },
  { t: 'narration', text: '你转身,一头扎进密林' },
  { t: 'char-show', visible: false },

  // run sequence
  { t: 'bg', color: '#0a0d09' },
  { t: 'art-set', spec: [] },
  { t: 'scene', img: 'cj5.jpg', spots: [] }, // preload, no reveal
  // running: streaks of forest pass by — vertical slivers as motion lines
  { t: 'scene-pulse', duration: 2200,
    spec: { kind: 'stripe', dir: 'v', x: 0.25, thickness: 0.02, feather: 0.06, opacity: 0.7 } },
  { t: 'art-add', spec: { id: 'flame1', kind: 'flame', x: 0.5,  y: 0.45, opacity: 0.95 } },
  { t: 'scene-pulse', duration: 2400,
    spec: { kind: 'stripe', dir: 'v', x: 0.7, thickness: 0.02, feather: 0.07, opacity: 0.7 } },
  { t: 'art-add', spec: { id: 'flame2', kind: 'flame', x: 0.3,  y: 0.55, opacity: 0.9 } },
  { t: 'art-add', spec: { id: 'flame3', kind: 'flame', x: 0.7,  y: 0.5,  opacity: 0.9 } },
  { t: 'show', target: 'run-anchor' },
  { t: 'await-tap', target: 'run-anchor' },
  { t: 'pause', ms: 400 },
  { t: 'blink' },

  // ===================== Scene 5 — 树下被捕 =====================
  { t: 'bg', color: '#1a0e10' },
  { t: 'art-set', spec: [] },
  // cj5 still loaded — keep it as currentImg
  { t: 'char-show', visible: true },
  { t: 'pose', pose: 'neutral' },
  { t: 'art-add', spec: { id: 'hand-flame', kind: 'flame', x: 0.32, y: 0.5, opacity: 0.9, scale: 0.7 } },
  // minor pulse: ember beside the hand-flame
  { t: 'scene-pulse', duration: 2400,
    spec: { kind: 'spot', x: 0.34, y: 0.52, r: 0.04, feather: 0.07, opacity: 0.7 } },
  { t: 'dialogue', who: '他', text: '这么快就回来了?' },
  { t: 'pause', ms: 400 },
  { t: 'pose', pose: 'lean-in' },
  { t: 'art-remove', id: 'hand-flame' },
  { t: 'dialogue', who: '他', text: '啊,说错了。' },
  { t: 'dialogue', who: '他', text: '这次赶的,是条小鱼。' },
  // minor pulse: a branch silhouette overhead
  { t: 'scene-pulse', duration: 2600,
    spec: { kind: 'spot', x: 0.85, y: 0.28, r: 0.06, feather: 0.1, opacity: 0.78 } },
  { t: 'dialogue', who: '他', text: '游戏结束,有什么遗言?' },

  { t: 'user-input', text: '等一下……!' },

  { t: 'pose', pose: 'attack' },
  { t: 'dialogue', who: '他', text: '……又怎么了?' },

  { t: 'user-input', text: '我能带你离开这里。' },

  { t: 'dialogue', who: '他', text: '……带我?' },
  { t: 'pose', pose: 'lean-in' },
  { t: 'dialogue', who: '他', text: '你?' },

  { t: 'user-input', text: '我精通卜算。我就是凭法阵进来的——也找得到出路。' },

  { t: 'pose', pose: 'step-back' },
  { t: 'dialogue', who: '他', text: '那现在,带我出去。' },

  { t: 'user-input', text: '现在不行,我妖力耗尽了。' },

  { t: 'pose', pose: 'lean-in' },
  // minor pulse: petals stir
  { t: 'scene-pulse', duration: 2200,
    spec: { kind: 'spot', x: 0.5, y: 0.6, r: 0.05, feather: 0.08, opacity: 0.7 } },
  { t: 'dialogue', who: '他', text: '看吧,谎话。' },

  { t: 'user-input', text: '你这点耐心都没有?' },

  { t: 'user-input', text: '你杀了我,就永远困在这里。' },

  { t: 'narration', text: '他的金瞳审视着我,但金线丝毫没有松' },
  { t: 'pause', ms: 1800 },
  // MAJOR: he releases — the entire forest opens up
  { t: 'scene-pulse', duration: 6000,
    spec: { kind: 'full', feather: 0.2, opacity: 0.95 } },
  { t: 'narration', text: '他终于松开了手' },
  { t: 'thread' },
  { t: 'pose', pose: 'crouch-eye' },
  { t: 'dialogue', who: '他', text: '……可别想着逃啊。' },
  { t: 'dialogue', who: '他', text: '不然死得很惨。' },

  // ===================== Scene 6 — 司星使悬念 =====================
  { t: 'pose', pose: 'turn-back' },
  { t: 'pause', ms: 400 },
  { t: 'dialogue', who: '他', text: '对了——' },
  { t: 'dialogue', who: '他', text: '你既然会卜算……' },
  // minor pulse: wind shifts (still cj5)
  { t: 'scene-pulse', duration: 2400,
    spec: { kind: 'stripe', dir: 'h', y: 0.42, thickness: 0.025, feather: 0.06, opacity: 0.65 } },
  // switch image — preload cj4 abyss before name drop
  { t: 'scene', img: 'cj4.png', spots: [] },
  // MAJOR: the abyss opens at the name "司星使" — long hold through 2 lines + silence
  { t: 'scene-pulse', duration: 9000,
    spec: { kind: 'full', feather: 0.18, opacity: 1 } },
  { t: 'dialogue', who: '他', text: '那你认不认识什么"司星使"?' },
  { t: 'dialogue', who: '他', text: '听说我一生下来就被丢到这里,全是拜他所赐。' },
  { t: 'pause', ms: 500 },
  { t: 'narration', text: '林间的风、远处的鸦啼,所有声音戛然而止' },
  { t: 'bg', color: '#050409' },
  { t: 'pause', ms: 800 },
  { t: 'scene-clear' },
  { t: 'finale' },
];
