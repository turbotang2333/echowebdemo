// Atmosphere layers (env / emotion).
// env mounts BELOW the character layer — only colors the scene.
// emotion mounts ABOVE the character layer — colors everything (including char).
// Both at any time hold at most 1 active preset; switching = transition.
//
// Presets are defined as { tint, blend, vignette, mode? }:
//   tint:     CSS color string (rgba) — applied as background-color
//   blend:    mix-blend-mode for the layer
//   vignette: 0-1, edge darkening strength
//   mode:     suggested mount: 'env' | 'emotion' (used only as default; beat may override)

import { $ } from './util.js';

const PRESETS = {
  // env presets (建议挂 env)
  'dark-water': {
    tint: 'rgba(20, 35, 70, 0.85)',
    blend: 'multiply',
    vignette: 0.55,
    mode: 'env',
  },
  'cold-blue': {
    // 用 overlay 替代 multiply：在中明度场景图上保留细节，同时染冷蓝
    tint: 'rgba(70, 110, 180, 0.75)',
    blend: 'overlay',
    vignette: 0.4,
    mode: 'env',
  },
  'flame-warm': {
    tint: 'rgba(255, 140, 60, 0.5)',
    blend: 'overlay',
    vignette: 0.15,
    mode: 'env',
  },
  'scorched': {
    // 灰红色调焦土：用 overlay 保留地面纹理，提升染色浓度
    tint: 'rgba(180, 95, 60, 0.7)',
    blend: 'overlay',
    vignette: 0.4,
    mode: 'env',
  },
  'dawn-warm': {
    tint: 'rgba(255, 195, 135, 0.55)',
    blend: 'overlay',
    vignette: 0,
    mode: 'env',
  },
  'fog-mansion': {
    tint: 'rgba(170, 165, 180, 0.7)',
    blend: 'multiply',
    vignette: 0.45,
    mode: 'env',
  },

  // emotion presets (建议挂 emotion)
  'flush-rose-soft': {
    // 摸摸阶段 2 浅染：比 flush-rose 弱一半，做 4 阶递进的中间过渡
    tint: 'rgba(255, 175, 175, 0.18)',
    blend: 'screen',
    vignette: 0,
    mode: 'emotion',
  },
  'flush-rose': {
    tint: 'rgba(255, 150, 150, 0.35)',
    blend: 'screen',
    vignette: 0,
    mode: 'emotion',
  },
  'cold-shock': {
    tint: 'rgba(255, 70, 70, 0.5)',
    blend: 'multiply',
    vignette: 0.3,
    mode: 'emotion',
  },
  'red-alert': {
    tint: 'rgba(180, 30, 30, 0.55)',
    blend: 'multiply',
    vignette: 0.5,
    mode: 'emotion',
  },
};

let _envNode = null;
let _emoNode = null;

export function initAtmo() {
  _envNode = $('#atmo-env');
  _emoNode = $('#atmo-emotion');
}

function nodeFor(mode) {
  return mode === 'emotion' ? _emoNode : _envNode;
}

function applyTo(node, params) {
  if (!node) return;
  node.style.backgroundColor = params.tint || 'transparent';
  node.style.mixBlendMode = params.blend || 'multiply';
  node.style.setProperty('--vignette-strength', String(params.vignette || 0));
  // Activate visibility on next frame so transitions apply.
  requestAnimationFrame(() => node.classList.add('active'));
}

function clearNode(node) {
  if (!node) return;
  node.classList.remove('active');
  // After fade-out, reset color to avoid bleed.
  setTimeout(() => {
    if (!node.classList.contains('active')) {
      node.style.backgroundColor = 'transparent';
      node.style.setProperty('--vignette-strength', '0');
    }
  }, 1100);
}

// Resolve preset name or inline params; allow caller-supplied mode override.
function resolve(spec) {
  if (!spec) return null;
  if (typeof spec === 'string') {
    const p = PRESETS[spec];
    if (!p) {
      console.warn('[atmo] unknown preset', spec);
      return null;
    }
    return p;
  }
  return spec;
}

// Apply to env mount (below character).
export function applyEnv(spec) {
  const p = resolve(spec);
  if (!p) {
    clearNode(_envNode);
    return;
  }
  applyTo(_envNode, p);
}

// Apply to emotion mount (above character).
export function applyEmotion(spec) {
  const p = resolve(spec);
  if (!p) {
    clearNode(_emoNode);
    return;
  }
  applyTo(_emoNode, p);
}

export function clearEnv()     { clearNode(_envNode); }
export function clearEmotion() { clearNode(_emoNode); }

export function clearAllAtmo() {
  clearNode(_envNode);
  clearNode(_emoNode);
}

// For debug / inspection.
export function listPresets() { return Object.keys(PRESETS); }
