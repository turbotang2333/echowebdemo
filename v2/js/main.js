import { initScreen } from './screen.js';
import { initInput, waitForBoot } from './input.js';
import { initRing } from './ring.js';
import { initCharacter } from './character.js';
import { initFX } from './fx.js';
import { initJournal } from './journal.js';
import { runPlayer } from './player.js';

window.addEventListener('DOMContentLoaded', async () => {
  initScreen();
  initInput();
  initRing();
  initCharacter();
  initFX();
  initJournal();

  // Wait for first user tap (releases autoplay restrictions, also primes mobile).
  await waitForBoot();

  try {
    await runPlayer();
  } catch (err) {
    console.error('player error', err);
  }
});
