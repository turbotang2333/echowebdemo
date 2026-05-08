// Water ripple — plays on every successful swipe-up to mark "narrative
// advancing forward". Independent of whether the screen actually changes.
//
// Visual: a snapshot of the current bg + character is overlaid on top of
// the stage with an SVG displacement filter. A horizontal wavefront band
// travels from below the screen to above it (mask-image gradient). Inside
// the band, content is refracted by smooth low-frequency turbulence;
// outside the band, content is invisible (mask transparent), so the live
// stage shows through. Four faint concentric rings expand from the
// bottom-center as a subtle wave-crest highlight.
//
// Total duration ~2000ms. Skipped while turbo is on. Concurrent calls
// (super-fast swipes) are dropped via a busy guard.

import { $, raf } from './util.js';
import { isTurbo } from './turbo.js';

const DURATION = 2000;

let _busy = false;
let _defsInjected = false;

const easeInOutSine = (t) => 0.5 - 0.5 * Math.cos(t * Math.PI);
const easeOut       = (t) => 1 - Math.pow(1 - t, 3);

function injectDefs() {
  if (_defsInjected) return;
  _defsInjected = true;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'wave-defs');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
  svg.innerHTML = `
    <defs>
      <filter id="wave-water-distort" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="1" seed="3"/>
        <feGaussianBlur stdDeviation="2.5" result="smoothNoise"/>
        <feDisplacementMap in="SourceGraphic" in2="smoothNoise" scale="0" id="wave-water-disp"/>
      </filter>
    </defs>`;
  document.body.appendChild(svg);
}

function tween(duration, onTick) {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      onTick(t);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function setBand(host, centerPct, halfWidth, fade) {
  const bot = centerPct - halfWidth;
  const top = centerPct + halfWidth;
  const fb  = bot - fade;
  const ft  = top + fade;
  const grad = `linear-gradient(to top,
    transparent ${fb}%,
    black ${bot}%,
    black ${top}%,
    transparent ${ft}%)`;
  host.style.maskImage = grad;
  host.style.webkitMaskImage = grad;
}

function buildSnapshot() {
  const snapshot = document.createElement('div');
  snapshot.className = 'wave-scene-distort';

  // Bg: clone the active screen's .screen-bg so the inline background-image
  // and the ::after vignette both come along.
  const screenBg = document.querySelector('.screen.active .screen-bg')
                || document.querySelector('.screen .screen-bg');
  if (screenBg) {
    const bgClone = screenBg.cloneNode(true);
    snapshot.appendChild(bgClone);
  }

  // Character layer: deep-clone (preserves inline styles → current pos/pose).
  // Strip ids on clone + descendants to keep the document id-unique.
  const charLayer = document.getElementById('character-layer');
  if (charLayer) {
    const layerClone = charLayer.cloneNode(true);
    layerClone.removeAttribute('id');
    layerClone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    snapshot.appendChild(layerClone);
  }

  return snapshot;
}

export async function playWaterRipple() {
  if (_busy) return;
  if (isTurbo()) return;

  injectDefs();
  _busy = true;

  const stage = $('#stage');
  const insertBefore = $('#narration-zone');

  const snapshot = buildSnapshot();
  const ringHost = document.createElement('div');
  ringHost.className = 'wave-rings';

  // Mask starts entirely off-screen so the snapshot is invisible at insertion.
  setBand(snapshot, -40, 16, 12);

  stage.insertBefore(snapshot, insertBefore);
  stage.insertBefore(ringHost, insertBefore);

  await raf();
  await raf();

  // 4 rings, delays scaled proportionally for 2000ms (originally tuned at 3000ms
  // with [0, 380, 760, 1140] → 38% of total before the last ring).
  const ringDelays = [0, 250, 500, 760];
  const rings = ringDelays.map(() => {
    const r = document.createElement('div');
    r.className = 'wave-ring';
    ringHost.appendChild(r);
    return r;
  });

  const waterDisp = document.getElementById('wave-water-disp');
  const ringMax   = Math.max(window.innerWidth, window.innerHeight) * 2.2;

  await tween(DURATION, (t) => {
    // Wavefront band travels from -25% (below screen) to 125% (above screen).
    const eased  = easeInOutSine(t);
    const center = -25 + 150 * eased;
    setBand(snapshot, center, 16, 14);

    // Refraction strength: bell curve, peaks mid-pass.
    const bell = Math.sin(t * Math.PI);
    const disp = 6 + bell * 18;     // 6 → 24 → 6
    if (waterDisp) waterDisp.setAttribute('scale', disp.toFixed(2));

    // Concentric rings ride the wave as faint crest highlights.
    rings.forEach((ring, i) => {
      const delay = ringDelays[i] / DURATION;
      const span  = 1 - delay;
      const lt    = Math.max(0, Math.min(1, (t - delay) / span));
      if (lt <= 0) { ring.style.opacity = '0'; return; }
      const e    = easeOut(lt);
      const size = e * ringMax;
      ring.style.width  = size + 'px';
      ring.style.height = size + 'px';
      let op;
      if (lt < 0.20)      op = (lt / 0.20) * 0.28;
      else if (lt < 0.65) op = 0.28;
      else                op = ((1 - lt) / 0.35) * 0.28;
      ring.style.opacity = Math.max(0, op).toFixed(3);
    });
  });

  snapshot.remove();
  ringHost.remove();
  _busy = false;
}
