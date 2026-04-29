import { $, el, wait } from './util.js';
import { addJournalEntry } from './journal.js';
import { getSpeed } from './signal.js';

// Start the user-bubble typewriter immediately and hand back a controller so
// the caller can sync the hold+drift to other events (e.g. wait until the
// user releases the long-press before sending the bubble away).
//
//   const ink = startInkLine(text, { typingSpeed: 55 });
//   await Promise.all([ink.typingDone, waitForRingRelease()]);
//   await ink.finish(1400);  // hold then drift away
export function startInkLine(text, opts = {}) {
  const zone = $('#bubble-zone');
  const node = el('div', { cls: 'bubble bubble-user tail-bottom' });
  zone.appendChild(node);

  const typingDone = (async () => {
    await new Promise(requestAnimationFrame);
    node.classList.add('visible');
    const speed = opts.typingSpeed || 50;
    const actualSpeed = Math.round(speed / getSpeed());
    for (let i = 0; i < text.length; i++) {
      node.textContent += text[i];
      await wait(actualSpeed);
    }
  })();

  async function finish(holdDuration = 1500, onDriftStart) {
    await typingDone;
    await wait(Math.round(holdDuration / getSpeed()));
    addJournalEntry({ kind: 'dialogue', speaker: '你', text });
    node.classList.add('drifting');
    if (onDriftStart) onDriftStart();
    await wait(1000);
    node.remove();
  }

  return { typingDone, finish };
}

export function startActionLine(text, opts = {}) {
  const zone = $('#bubble-zone');
  const node = el('div', { cls: 'bubble bubble-action' });
  const display = `（${text}）`;
  zone.appendChild(node);

  const typingDone = (async () => {
    await new Promise(requestAnimationFrame);
    node.classList.add('visible');
    const speed = opts.typingSpeed || 50;
    const actualSpeed = Math.round(speed / getSpeed());
    for (let i = 0; i < display.length; i++) {
      node.textContent += display[i];
      await wait(actualSpeed);
    }
  })();

  async function finish(holdDuration = 1500, onDriftStart) {
    await typingDone;
    await wait(Math.round(holdDuration / getSpeed()));
    addJournalEntry({ kind: 'action', text });
    node.classList.add('drifting');
    if (onDriftStart) onDriftStart();
    await wait(1000);
    node.remove();
  }

  return { typingDone, finish };
}

// Thin wrapper for callers that don't need to sync to external events.
export async function showInkLine(text, opts = {}) {
  const ink = startInkLine(text, opts);
  await ink.finish(opts.holdDuration);
}
