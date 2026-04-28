// Ink line + typewriter visualization for "user spoke" moments.
// Per story_integration_v2 §2: when user releases long-press,
// the ink line fades in, preset text types out, lingers, then dissolves
// into a light point that flies to the character.

import { $, wait } from './util.js';
import { addJournalEntry } from './journal.js';

export async function showInkLine(text, opts = {}) {
  const zone = $('#ink-zone');
  const txt = $('#ink-text');
  zone.hidden = false;
  zone.classList.remove('dissolving');
  txt.textContent = '';
  // tiny rAF so transition catches the line fade-in
  await new Promise(requestAnimationFrame);
  zone.classList.add('visible');

  // typewriter
  const speed = opts.typingSpeed || 50;
  for (let i = 0; i < text.length; i++) {
    txt.textContent += text[i];
    await wait(speed);
  }

  // linger
  await wait(opts.holdDuration || 1500);

  // record into journal as "你" said
  addJournalEntry({ kind: 'dialogue', speaker: '你', text });

  // dissolve text
  zone.classList.add('dissolving');
  await wait(800);

  // hide
  zone.classList.remove('visible');
  zone.classList.remove('dissolving');
  txt.textContent = '';
  zone.hidden = true;
}
