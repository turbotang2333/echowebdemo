export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

export function el(tag, opts = {}) {
  const node = document.createElement(tag);
  if (opts.cls) node.className = opts.cls;
  if (opts.text != null) node.textContent = opts.text;
  if (opts.html != null) node.innerHTML = opts.html;
  if (opts.style) Object.assign(node.style, opts.style);
  if (opts.attrs) for (const k in opts.attrs) node.setAttribute(k, opts.attrs[k]);
  return node;
}

export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Drift any text node a short distance toward the upper-left and fade out.
// (We no longer travel all the way to the journal anchor — the keyframe uses
//  fixed small offsets so motion is felt, not chased.)
export function driftToAnchor(node, dur = 900) {
  node.classList.add('drifting');
  return wait(dur).then(() => node.remove());
}
