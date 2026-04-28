import { initRing } from './ring.js';
import { initInput } from './input.js';
import { initJournalGestures } from './journal.js';
import { runPlayer } from './player.js';
import { showCharacter } from './character.js';
import { initOrientation, expectOrientation, waitForOrientation, PORTRAIT } from './orientation.js';
import { initFullscreenOnFirstTouch } from './fullscreen.js';

window.addEventListener('DOMContentLoaded', async () => {
  initRing();
  initInput();
  initJournalGestures();
  initFullscreenOnFirstTouch();
  showCharacter(false);

  initOrientation();
  expectOrientation(PORTRAIT, '请将设备竖置 — 准备好了再开始');
  await waitForOrientation(PORTRAIT);

  await new Promise((r) => setTimeout(r, 200));

  try {
    await runPlayer();
  } catch (err) {
    console.error('player error', err);
  }
});
