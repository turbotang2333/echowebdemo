// Journal (事记) — accumulates every displayed text entry, then can be
// pulled open from the top-left anchor with a swipe-from-top-left gesture.

import { $, el, wait } from './util.js';

const _entries = [];

export function addJournalEntry(entry) {
  _entries.push(entry);
}

export function clearJournal() {
  _entries.length = 0;
}

function renderEntries() {
  const scroll = $('#journal-scroll');
  scroll.innerHTML = '';
  _entries.forEach((e) => {
    if (e.kind === 'heavy') {
      scroll.appendChild(el('div', { cls: 'j-entry j-heavy', text: e.text }));
    } else if (e.kind === 'narration') {
      scroll.appendChild(el('div', { cls: 'j-entry j-narration', text: e.text }));
    } else if (e.kind === 'inner') {
      scroll.appendChild(el('div', { cls: 'j-entry j-inner', text: `（${e.text}）` }));
    } else if (e.kind === 'dialogue') {
      const tagCls = e.speaker === '你' ? 'j-you' : 'j-him';
      const wrap = el('div', { cls: 'j-entry' });
      wrap.innerHTML = `<span class="j-tag ${tagCls}">${e.speaker || '他'}</span>${e.text}`;
      scroll.appendChild(wrap);
    }
  });
}

let _open = false;
let _opening = false;

export async function openJournal() {
  if (_open || _opening) return;
  _opening = true;
  renderEntries();
  const j = $('#journal');
  j.hidden = false;
  // double rAF for transition
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  j.classList.add('visible');
  _open = true;
  _opening = false;
  // scroll to top
  $('#journal-scroll').scrollTop = 0;
}

export async function closeJournal() {
  if (!_open) return;
  const j = $('#journal');
  j.classList.remove('visible');
  await wait(550);
  j.hidden = true;
  _open = false;
}

export function isJournalOpen() { return _open; }

// Wire the gesture: swipe from top-left into screen opens it,
// swipe back (toward top-left) closes it. Also click on anchor opens,
// and an explicit "收回" button closes.
export function initJournalGestures() {
  const anchor = $('#journal-anchor');
  if (anchor) {
    anchor.addEventListener('click', () => {
      if (!_open) openJournal();
    });
  }

  const closeBtn = $('#journal-close');
  if (closeBtn) {
    const closeNow = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      closeJournal();
    };
    closeBtn.addEventListener('click', closeNow);
    closeBtn.addEventListener('touchstart', closeNow, { passive: false });
  }

  let startX = 0, startY = 0, tracking = false;
  const onDown = (x, y) => {
    if (!_open) {
      // open gesture: must start in the top-left corner zone
      if (x < 80 && y < 80) {
        startX = x; startY = y; tracking = true;
      }
    } else {
      // close gesture: track from anywhere — direction analysis below
      // disambiguates from vertical scroll
      startX = x; startY = y; tracking = true;
    }
  };
  const onMove = (x, y) => {
    if (!tracking) return;
    const dx = x - startX;
    const dy = y - startY;
    const dist = Math.hypot(dx, dy);
    if (!_open) {
      if (dx > 60 && dy > 30 && dist > 80) {
        tracking = false;
        openJournal();
      }
    } else {
      // close: require both axes meaningfully negative AND horizontal motion
      // to dominate (so a pure upward scroll doesn't accidentally close).
      if (dx < -60 && dy < -30 && Math.abs(dx) > Math.abs(dy) * 0.6) {
        tracking = false;
        closeJournal();
      }
    }
  };
  const onUp = () => { tracking = false; };

  window.addEventListener('pointerdown', (e) => onDown(e.clientX, e.clientY));
  window.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  // Touch fallback in case pointer events are partially eaten by browser
  // gesture handling on mobile.
  window.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; if (t) onDown(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchend', onUp);
  window.addEventListener('touchcancel', onUp);
}
