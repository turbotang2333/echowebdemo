import { $, wait } from '../../js/util.js';
import { addJournalEntry } from './journal.js';

// User's spoken text — appears at touch height on the right side
// (anchored to wherever they pressed the edge arc), then gently drifts up.
export async function showInkLine(text, opts = {}) {
  const zone = $('#ink-zone');
  const txt = $('#ink-text');
  zone.hidden = false;
  txt.classList.remove('drifting');
  txt.textContent = '';
  await new Promise(requestAnimationFrame);
  zone.classList.add('visible');

  const speed = opts.typingSpeed || 50;
  for (let i = 0; i < text.length; i++) {
    txt.textContent += text[i];
    await wait(speed);
  }

  await wait(opts.holdDuration || 1500);

  addJournalEntry({ kind: 'dialogue', speaker: '你', text });

  txt.classList.add('drifting');
  await wait(1000);

  zone.classList.remove('visible');
  txt.classList.remove('drifting');
  txt.textContent = '';
  zone.hidden = true;
}
