import { $, el, wait } from './util.js';
import { addJournalEntry } from './journal.js';
import { syncSubtitleAnchor } from './character.js';

const NARRATION_LIFE = 3500;
const HEAVY_LIFE = 4500;
const DIALOGUE_TYPING = 55;
const DIALOGUE_HOLD = 1500;
const DRIFT_DUR = 1000;
const HEAVY_DRIFT_DUR = 1400;

async function driftAway(node, dur = DRIFT_DUR) {
  node.classList.add('drifting');
  await wait(dur);
  node.remove();
}

export async function showNarration(text, opts = {}) {
  addJournalEntry({ kind: 'narration', text });

  const zone = $('#narration-zone');
  const node = el('div', { cls: 'narration', text });
  zone.appendChild(node);
  await new Promise(requestAnimationFrame);
  node.classList.add('visible');
  await wait(opts.life || NARRATION_LIFE);
  await driftAway(node);
}

export async function showInner(text, opts = {}) {
  addJournalEntry({ kind: 'inner', text });

  const zone = $('#inner-zone');
  const node = el('div', { cls: 'inner', text: `(${text})` });
  zone.appendChild(node);
  await new Promise(requestAnimationFrame);
  node.classList.add('visible');
  await wait(opts.life || NARRATION_LIFE);
  await driftAway(node);
}

export async function showDialogue(speaker, text, opts = {}) {
  addJournalEntry({ kind: 'dialogue', speaker, text });

  syncSubtitleAnchor();

  const zone = $('#subtitle-zone');
  const node = el('div', { cls: 'subtitle' });
  zone.appendChild(node);

  const speed = opts.typingSpeed || DIALOGUE_TYPING;
  for (let i = 0; i < text.length; i++) {
    node.textContent += text[i];
    await wait(speed);
  }

  await wait(opts.holdDuration || DIALOGUE_HOLD);
  await driftAway(node);
}

export async function showHeavy(text, opts = {}) {
  addJournalEntry({ kind: 'heavy', text });

  const stage = $('#stage');
  if (stage) stage.classList.add('heavy-active');

  const zone = $('#heavy-zone');
  const node = el('div', { cls: 'heavy', text });
  zone.appendChild(node);
  await new Promise(requestAnimationFrame);
  node.classList.add('visible');
  await wait(opts.life || HEAVY_LIFE);
  if (stage) stage.classList.remove('heavy-active');
  await driftAway(node, HEAVY_DRIFT_DUR);
}

export async function showNPCText(text, opts = {}) {
  const dir = opts.from || 'top';
  addJournalEntry({ kind: 'narration', text: `（${dir === 'top' ? '从上方' : '从一旁'}传来）${text}` });

  const zone = $('#npc-zone');
  const node = el('div', { cls: `npc-text from-${dir}`, text });
  zone.appendChild(node);
  await wait(opts.life || 4500);
  node.remove();
}

export const pause = (ms) => wait(ms);
