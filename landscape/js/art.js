import { $, el, rand, wait } from './util.js';

const ART_SVG = {
  leaf: `<svg viewBox="0 0 32 32"><path d="M16 2 C24 8, 28 16, 16 30 C4 16, 8 8, 16 2 Z"
          fill="rgba(170,210,160,0.45)" stroke="rgba(170,210,160,0.7)" stroke-width="0.6"/>
          <path d="M16 4 L16 28" stroke="rgba(170,210,160,0.5)" stroke-width="0.5"/></svg>`,
  lightpoint: `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="rgba(220,200,255,0.85)"/>
          <circle cx="8" cy="8" r="6" fill="rgba(220,200,255,0.25)"/>
          <circle cx="8" cy="8" r="8" fill="rgba(220,200,255,0.08)"/></svg>`,
  flame: `<svg viewBox="0 0 24 32"><path d="M12 30 C4 26, 4 18, 10 12 C8 8, 12 4, 14 0
          C12 6, 18 8, 18 16 C20 22, 18 28, 12 30 Z"
          fill="rgba(255,170,90,0.7)" stroke="rgba(255,210,140,0.6)" stroke-width="0.5"/></svg>`,
  water: `<svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="2.5" fill="rgba(170,210,235,0.6)"/>
          <circle cx="9" cy="9" r="5" fill="rgba(170,210,235,0.2)"/></svg>`,
  thread: `<svg viewBox="0 0 60 6"><path d="M0 3 Q15 0 30 3 T60 3" stroke="rgba(255,220,140,0.85)"
          stroke-width="1.2" fill="none"/></svg>`,
  flower: `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="2" fill="rgba(255,235,225,0.95)"/>
          <circle cx="8" cy="8" r="5" fill="rgba(255,225,235,0.25)"/></svg>`,
  branch: `<svg viewBox="0 0 70 70"><path d="M5 60 Q25 50 30 30 Q34 18 50 10"
          stroke="rgba(120,90,80,0.55)" stroke-width="1.2" fill="none"/>
          <path d="M30 30 Q40 28 48 22" stroke="rgba(120,90,80,0.45)" stroke-width="0.8" fill="none"/>
          <path d="M22 44 Q30 42 36 38" stroke="rgba(120,90,80,0.45)" stroke-width="0.8" fill="none"/></svg>`,
};

const tracked = new Map(); // id -> element

export function clearArt() {
  const layer = $('#art-layer');
  if (!layer) return;
  layer.innerHTML = '';
  tracked.clear();
}

// Add an art element. opts: { id, kind, x (0..1), y (0..1), opacity, drift, scale }
export function addArt(opts) {
  const layer = $('#art-layer');
  if (!layer) return null;

  const kind = opts.kind || 'lightpoint';
  const node = el('div', { cls: `art-element ${kind}`, html: ART_SVG[kind] || ART_SVG.lightpoint });
  const x = opts.x != null ? opts.x : rand(0.45, 0.85);
  const y = opts.y != null ? opts.y : rand(0.2, 0.6);
  node.style.left = `${x * 100}%`;
  node.style.top = `${y * 100}%`;
  node.style.setProperty('--art-opacity', opts.opacity != null ? opts.opacity : 0.7);
  node.style.animationDuration = `${opts.fadeIn || 1.6}s, ${opts.drift || rand(6, 9)}s`;
  node.style.animationDelay = `0s, ${opts.delay || rand(0, 4)}s`;
  if (opts.scale) node.style.transform = `scale(${opts.scale})`;

  layer.appendChild(node);

  if (opts.id) tracked.set(opts.id, node);
  return node;
}

export function removeArt(id) {
  const node = tracked.get(id);
  if (!node) return;
  node.classList.add('removing');
  tracked.delete(id);
  setTimeout(() => node.remove(), 1500);
}

export function getArt(id) { return tracked.get(id); }

// Convenience: drop a small set of ambient elements.
export function setAmbient(spec = []) {
  clearArt();
  spec.forEach((s, i) => addArt({ ...s, id: s.id || `amb_${i}` }));
}

// Replace ambient with a fade — old elements fade out as new fade in.
export async function fadeAmbient(spec = []) {
  // fade out current
  tracked.forEach((node) => node.classList.add('removing'));
  await wait(900);
  clearArt();
  setAmbient(spec);
}

// Animate gold thread wrapping around the character
export function gilded(target = 'char-wrist') {
  const layer = $('#art-layer');
  if (!layer) return;
  const node = el('div', { cls: 'art-element thread', html: ART_SVG.thread });
  // Position near character's mid-height
  node.style.left = '24%';
  node.style.top = '58%';
  node.style.setProperty('--art-opacity', 0.95);
  node.style.animation = 'artFadeIn 1s var(--ease-drift) forwards, artFloat 6s ease-in-out infinite';
  layer.appendChild(node);
  return node;
}
