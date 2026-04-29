// scene.js — masked scene-image fragments behind character, below all UI.
// API mirrors art-set / art-add / art-remove. Each "spot" is a full-bleed div
// of the current scene image, masked to a single shape (band/spot/wedge/full).
// Multiple spots can coexist; each can be added, updated, or removed live.

const SPOT_FADE_IN_MS = 1100;
const SPOT_FADE_OUT_MS = 800;

let currentImg = null;
const spots = new Map(); // id -> { node, kind, params }

function $(sel) { return document.querySelector(sel); }

function imgUrl(img) {
  if (!img) return '';
  if (img.startsWith('url(') || img.startsWith('http') || img.startsWith('/') || img.startsWith('../')) return img;
  return `url(../src/images/${img})`;
}

function applyParams(node, kind, params = {}) {
  const setVar = (k, v) => { if (v != null) node.style.setProperty(k, v); };
  setVar('--amount', params.amount);
  setVar('--feather', params.feather);
  setVar('--x', params.x);
  setVar('--y', params.y);
  setVar('--r', params.r);
  setVar('--thickness', params.thickness);
  setVar('--angle', params.angle != null ? `${params.angle}deg` : null);
  if (params.opacity != null) setVar('--spot-opacity', params.opacity);
  // wipe inapplicable kinds and apply
  node.classList.remove('kind-band-bottom','kind-band-top','kind-band-left','kind-band-right',
    'kind-spot','kind-wedge','kind-full','kind-stripe-h','kind-stripe-v');
  switch (kind) {
    case 'band':
      node.classList.add(`kind-band-${params.side || 'bottom'}`);
      break;
    case 'spot':
      node.classList.add('kind-spot');
      break;
    case 'wedge':
      node.classList.add('kind-wedge');
      break;
    case 'full':
      node.classList.add('kind-full');
      break;
    case 'stripe':
      node.classList.add(`kind-stripe-${params.dir || 'h'}`);
      break;
  }
}

function makeSpot(spec) {
  const node = document.createElement('div');
  node.className = 'scene-spot entering';
  node.style.setProperty('--scene-img', imgUrl(spec.img || currentImg));
  applyParams(node, spec.kind || 'full', spec);
  return node;
}

function fadeOutSpot(record) {
  const { node } = record;
  node.classList.remove('shown');
  node.classList.add('leaving');
  setTimeout(() => { if (node.parentNode) node.parentNode.removeChild(node); }, SPOT_FADE_OUT_MS + 80);
}

// Set the active scene image and (optionally) replace all spots.
// opts: { img, spots: [{ id, kind, ...params }] }
export function setScene(opts = {}) {
  const layer = $('#scene-bg');
  if (!layer) return;

  if (opts.img) currentImg = opts.img;

  // fade out all existing spots
  spots.forEach((rec) => fadeOutSpot(rec));
  spots.clear();

  const list = Array.isArray(opts.spots) ? opts.spots : [];
  list.forEach((spec, i) => {
    const id = spec.id || `spot_${i}`;
    addSpot({ ...spec, id });
  });
}

// Append a new spot to current scene. spec: { id, kind, ...params, img? }
export function addSpot(spec = {}) {
  const layer = $('#scene-bg');
  if (!layer) return null;

  const id = spec.id || `spot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (spots.has(id)) removeSpot(id);

  const node = makeSpot(spec);
  layer.appendChild(node);

  // force reflow then trigger entrance
  void node.offsetWidth;
  node.classList.remove('entering');
  node.classList.add('shown');

  spots.set(id, { node, kind: spec.kind, params: { ...spec } });
  return id;
}

// Update an existing spot's params in place (animates via CSS transitions).
export function updateSpot(id, patch = {}) {
  const rec = spots.get(id);
  if (!rec) return;
  const merged = { ...rec.params, ...patch };
  applyParams(rec.node, patch.kind || rec.kind, merged);
  rec.params = merged;
  if (patch.kind) rec.kind = patch.kind;
}

export function removeSpot(id) {
  const rec = spots.get(id);
  if (!rec) return;
  fadeOutSpot(rec);
  spots.delete(id);
}

export function clearScene() {
  spots.forEach((rec) => fadeOutSpot(rec));
  spots.clear();
}

// Drop a transient spot that auto-fades after `duration` ms (visible window).
// Fire-and-forget — does not block the script. Returns the temporary id.
export function pulseSpot(spec = {}, duration = 2400) {
  const id = `pulse_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  addSpot({ ...spec, id });
  setTimeout(() => removeSpot(id), duration);
  return id;
}

export function getSceneImg() { return currentImg; }
