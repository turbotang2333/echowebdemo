import { $, wait } from './util.js';

// Ring states from spec §4
export const RING = {
  IDLE: 'idle',
  RECORDING: 'recording',
  DELIVERING: 'delivering',
  THINKING: 'thinking',
  RESPONDING: 'responding',
  INPUT: 'input',
  INVITATION: 'invitation',
};

const STATE_CLASS = {
  [RING.IDLE]: 'state-idle',
  [RING.RECORDING]: 'state-recording',
  [RING.DELIVERING]: 'state-delivering',
  [RING.THINKING]: 'state-thinking',
  [RING.RESPONDING]: 'state-responding',
  [RING.INPUT]: 'state-input',
  [RING.INVITATION]: 'state-invitation',
};

let _state = RING.IDLE;

export function getRingState() { return _state; }

export function setRingState(next) {
  const zone = $('#ring-zone');
  Object.values(STATE_CLASS).forEach((c) => zone.classList.remove(c));
  zone.classList.add(STATE_CLASS[next]);
  _state = next;
}

// Animate a small light point flying from the arc apex toward the character.
export async function deliverLightToCharacter() {
  const ringZone = $('#ring-zone');
  const character = $('.character');
  if (!ringZone || !character) return;

  const ringRect = ringZone.getBoundingClientRect();
  const charRect = character.getBoundingClientRect();

  // Origin: the画内 apex of the quarter-arc — at ~45° inward from the
  // corner, distance ≈ radius × cos(45°) ≈ 92px on a r=130 arc.
  const cx = ringRect.left + ringRect.width / 2;
  const cy = ringRect.top + ringRect.height / 2;
  const startX = cx - 92;
  const startY = cy - 92;
  const endX = charRect.left + charRect.width / 2;
  const endY = charRect.top + charRect.height * 0.35;

  const dot = document.createElement('div');
  dot.style.cssText = `
    position: absolute;
    left: 0; top: 0;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,240,210,1) 0%, rgba(255,225,200,0.4) 60%, rgba(255,225,200,0) 80%);
    box-shadow: 0 0 24px rgba(255,225,200,0.85);
    transform: translate(${startX}px, ${startY}px);
    z-index: 12;
    pointer-events: none;
    transition: transform 1.2s cubic-bezier(0.4,0,0.2,1), opacity 1.2s ease-out;
  `;
  document.getElementById('stage').appendChild(dot);

  // force layout
  // eslint-disable-next-line no-unused-expressions
  dot.offsetWidth;
  dot.style.transform = `translate(${endX}px, ${endY}px) scale(0.6)`;
  dot.style.opacity = '0';

  await wait(1200);
  dot.remove();

  const charEl = $('.character');
  if (charEl) {
    charEl.classList.remove('char-flash');
    void charEl.offsetWidth;
    charEl.classList.add('char-flash');
  }
}

export function initRing() {
  setRingState(RING.IDLE);
}
