import { initRing } from './ring.js';
import { initInput } from './input.js';
import { initJournalGestures } from './journal.js';
import { runPlayer } from './player.js';
import { showCharacter } from './character.js';

window.addEventListener('DOMContentLoaded', async () => {
  initRing();
  initInput();
  initJournalGestures();
  showCharacter(false);

  // Tiny delay so first frame paints black before opening kicks in.
  await new Promise((r) => setTimeout(r, 200));

  try {
    await runPlayer();
  } catch (err) {
    console.error('player error', err);
  }
});
