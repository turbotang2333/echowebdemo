// Narration / inner / dialogue / heavy / npc text rendering.
// Every "displayed and finished" piece of text drifts to the top-left anchor
// and is recorded into the journal. When fast-forward is active, the text
// commits to the journal immediately and the DOM node is removed without
// playing animations.

import { $, el, wait, driftToAnchor } from './util.js';
import { addJournalEntry } from './journal.js';
import { isFastForward, signalWait } from './signal.js';

const NARRATION_LIFE = 3500;
const HEAVY_LIFE = 4500;
const SUBTITLE_LIFE = 3200;

function maybeFastSkip(node) {
  if (isFastForward()) {
    if (node && node.parentNode) node.remove();
    return true;
  }
  return false;
}

// ---- Narration (旁白) ----
export async function showNarration(text, opts = {}) {
  addJournalEntry({ kind: 'narration', text });
  if (isFastForward()) return;

  const zone = $('#narration-zone');
  const node = el('div', { cls: 'narration', text });
  zone.appendChild(node);
  await new Promise(requestAnimationFrame);
  node.classList.add('visible');
  await signalWait(opts.life || NARRATION_LIFE);
  if (maybeFastSkip(node)) return;
  await driftToAnchor(node);
}

// ---- Inner monologue (originates from the user's side — bottom-right) ----
export async function showInner(text, opts = {}) {
  addJournalEntry({ kind: 'inner', text });
  if (isFastForward()) return;

  const zone = $('#inner-zone');
  const node = el('div', { cls: 'inner', text: `(${text})` });
  zone.appendChild(node);
  await new Promise(requestAnimationFrame);
  node.classList.add('visible');
  await signalWait(opts.life || NARRATION_LIFE);
  if (maybeFastSkip(node)) return;
  await driftToAnchor(node);
}

// ---- Dialogue ----
export async function showDialogue(speaker, text, opts = {}) {
  addJournalEntry({ kind: 'dialogue', speaker, text });
  if (isFastForward()) return;

  const zone = $('#subtitle-zone');
  const node = el('div', { cls: 'subtitle', text });
  zone.appendChild(node);
  await new Promise(requestAnimationFrame);
  node.classList.add('visible');
  const life = opts.life || Math.max(SUBTITLE_LIFE, text.length * 110);
  await signalWait(life);
  if (maybeFastSkip(node)) return;
  await driftToAnchor(node);
}

// ---- Heavy narration ----
export async function showHeavy(text, opts = {}) {
  addJournalEntry({ kind: 'heavy', text });
  if (isFastForward()) return;

  const zone = $('#heavy-zone');
  const node = el('div', { cls: 'heavy', text });
  zone.appendChild(node);
  await new Promise(requestAnimationFrame);
  node.classList.add('visible');
  await signalWait(opts.life || HEAVY_LIFE);
  if (maybeFastSkip(node)) return;
  await driftToAnchor(node, 1100);
}

// ---- NPC absent narration ----
export async function showNPCText(text, opts = {}) {
  const dir = opts.from || 'top';
  addJournalEntry({ kind: 'narration', text: `（${dir === 'top' ? '从上方' : '从一旁'}传来）${text}` });
  if (isFastForward()) return;

  const zone = $('#npc-zone');
  const node = el('div', { cls: `npc-text from-${dir}`, text });
  zone.appendChild(node);
  await signalWait(opts.life || 4500);
  node.remove();
}

// ---- Pause ----
export const pause = (ms) => signalWait(ms);
