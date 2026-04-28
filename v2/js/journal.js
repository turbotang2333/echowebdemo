import { $, el, wait } from '../../js/util.js';

const _entries = [];

export function addJournalEntry(entry) { _entries.push(entry); }
export function clearJournal() { _entries.length = 0; }

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
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  j.classList.add('visible');
  _open = true;
  _opening = false;
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

export function initJournalGestures() {
  const anchor = $('#journal-anchor');
  if (anchor) {
    anchor.addEventListener('click', () => { if (!_open) openJournal(); });
  }
  const closeBtn = $('#journal-close');
  if (closeBtn) {
    const closeNow = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } closeJournal(); };
    closeBtn.addEventListener('click', closeNow);
    closeBtn.addEventListener('touchstart', closeNow, { passive: false });
  }

  // Open gesture (corner swipe) — window level, only when journal is closed.
  let oStartX = 0, oStartY = 0, oTracking = false;
  const onOpenDown = (x, y) => {
    if (_open) return;
    if (x < 80 && y < 80) { oStartX = x; oStartY = y; oTracking = true; }
  };
  const onOpenMove = (x, y) => {
    if (!oTracking || _open) return;
    const dx = x - oStartX, dy = y - oStartY;
    if (dx > 60 && dy > 30 && Math.hypot(dx, dy) > 80) {
      oTracking = false;
      openJournal();
    }
  };
  const onOpenUp = () => { oTracking = false; };
  window.addEventListener('pointerdown', (e) => onOpenDown(e.clientX, e.clientY));
  window.addEventListener('pointermove', (e) => onOpenMove(e.clientX, e.clientY));
  window.addEventListener('pointerup', onOpenUp);
  window.addEventListener('pointercancel', onOpenUp);

  // Close gesture (left swipe) — bound on journal directly so pointer capture
  // keeps tracking even when fingers move over scroll content with pan-y.
  const journalEl = $('#journal');
  if (journalEl) {
    let cStartX = 0, cStartY = 0, cTracking = false, cPid = -1;
    journalEl.addEventListener('pointerdown', (e) => {
      if (!_open) return;
      cStartX = e.clientX;
      cStartY = e.clientY;
      cTracking = true;
      cPid = e.pointerId;
      try { journalEl.setPointerCapture(e.pointerId); } catch {}
    });
    journalEl.addEventListener('pointermove', (e) => {
      if (!cTracking || !_open || e.pointerId !== cPid) return;
      const dx = e.clientX - cStartX;
      const dy = e.clientY - cStartY;
      if (dx < -50 && Math.abs(dx) > Math.abs(dy)) {
        cTracking = false;
        try { journalEl.releasePointerCapture(cPid); } catch {}
        closeJournal();
      }
    });
    const cEnd = (e) => {
      if (e && e.pointerId !== cPid) return;
      cTracking = false;
      try { journalEl.releasePointerCapture(cPid); } catch {}
    };
    journalEl.addEventListener('pointerup', cEnd);
    journalEl.addEventListener('pointercancel', cEnd);
  }
}
