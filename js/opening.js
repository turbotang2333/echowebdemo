// Scene 0 — opening ritual.
// Black background, lines of text fade in one after another, then a glow appears
// and waits for a long-press (or tap), which triggers a white flash transitioning
// to Scene 1. A "跳过开场" button shortcuts straight to the wake-up moment.

import { $, el, wait as rawWait } from './util.js';
import { waitForLongPress, waitForTap } from './input.js';
import { addJournalEntry } from './journal.js';
import { whiteFlash } from './transitions.js';

const LINES = [
  ['很久以前', '你是这个世界最受敬仰的司星使', '能用卦镜窥见命运'],
  ['直到你做出那个预言──', '新生的狐族小皇子,日后将屠灭苍生'],
  ['王朝顺应你的话语', '将婴儿丢进了无人能出的禁地'],
  ['可那之后', '真正的天罚反而降临了'],
  ['你才意识到自己错了', '便用最后一道法阵', '向苍天祈求重来'],
  ['现在,睁开眼', '看看你被命运送到了什么地方'],
];

let _skip = false;

// Skippable wait: resolves early if skip is requested.
async function wait(ms) {
  const tick = 60;
  let elapsed = 0;
  while (elapsed < ms) {
    if (_skip) return;
    const slice = Math.min(tick, ms - elapsed);
    await rawWait(slice);
    elapsed += slice;
  }
}

async function fadeStanza(stanza) {
  if (_skip) return;
  const wrap = $('#opening-text');
  wrap.innerHTML = '';
  const nodes = stanza.map((t) => {
    const span = el('span', { cls: 'opening-line', text: t });
    wrap.appendChild(span);
    return span;
  });
  for (const n of nodes) {
    if (_skip) return;
    await new Promise(requestAnimationFrame);
    n.classList.add('visible');
    await wait(1300);
  }
  if (_skip) return;
  await wait(700);
  nodes.forEach((n) => n.classList.add('fading'));
  await wait(1000);
}

export async function runOpening() {
  _skip = false;
  const skipBtn = $('#opening-skip');
  const onSkip = () => { _skip = true; };
  if (skipBtn) {
    skipBtn.addEventListener('click', onSkip);
    skipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); onSkip(); }, { passive: false });
  }

  const zone = $('#opening-zone');
  zone.hidden = false;

  await wait(900);

  for (const stanza of LINES) {
    if (_skip) break;
    await fadeStanza(stanza);
    await wait(300);
  }

  // If skip was hit, clear any half-faded text immediately.
  if (_skip) {
    $('#opening-text').innerHTML = '';
  }

  addJournalEntry({
    kind: 'heavy',
    text: '很久以前,你是司星使。一句预言断送了狐族小皇子,你以最后一道法阵祈求重来——而今,你被送到了这里。',
  });

  // Show glow + wait for press
  const glow = $('#opening-glow');
  glow.hidden = false;
  glow.classList.remove('holding');
  await new Promise(requestAnimationFrame);

  // hide skip button now that the wake-up moment is here
  if (skipBtn) skipBtn.style.display = 'none';

  // Accept either long-press or tap — first interaction should be lenient
  await Promise.race([
    waitForLongPress('opening-glow'),
    waitForTap('opening-glow'),
  ]);

  glow.classList.add('holding');
  await rawWait(900);

  await whiteFlash(async () => {
    zone.hidden = true;
    glow.hidden = true;
  }, { in: 700, out: 900 });

  if (skipBtn) {
    skipBtn.removeEventListener('click', onSkip);
    skipBtn.style.display = '';
  }
}
