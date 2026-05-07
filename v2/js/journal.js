// 剧情历史（journal）— 竖版交互：
//   - 左上角 anchor 点击开
//   - 抽屉从顶部下展（clip-path 从左上角扇形展开），纸面内可滚动
//   - 点击空白处（纸面之外）收回
//
// 文字模块（paragraph.js）在每段文字发生时调用 addJournalEntry，
// 打开时按时间顺序渲染列表。

import { $, el, raf, wait } from './util.js';

const _entries = [];

export function addJournalEntry(entry) {
  if (!entry || !entry.text) return;
  _entries.push(entry);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

function renderEntries() {
  const scroll = $('#journal-scroll');
  if (!scroll) return;
  scroll.innerHTML = '';

  if (_entries.length === 0) {
    scroll.appendChild(el('div', { cls: 'j-empty', text: '尚未发生任何事' }));
    return;
  }

  for (const e of _entries) {
    if (e.kind === 'heavy') {
      scroll.appendChild(el('div', { cls: 'j-entry j-heavy', text: e.text }));
    } else if (e.kind === 'narration' || e.kind === 'aside') {
      scroll.appendChild(el('div', { cls: 'j-entry j-narration', text: e.text }));
    } else if (e.kind === 'inner') {
      scroll.appendChild(el('div', { cls: 'j-entry j-inner', text: `（${e.text}）` }));
    } else if (e.kind === 'npc') {
      scroll.appendChild(el('div', { cls: 'j-entry j-npc', text: e.text }));
    } else if (e.kind === 'dialogue') {
      const tagCls = e.speaker === '你' ? 'j-you' : 'j-him';
      const wrap = el('div', { cls: 'j-entry' });
      wrap.innerHTML =
        `<span class="j-tag ${tagCls}">${escapeHtml(e.speaker || '他')}</span>` +
        escapeHtml(e.text);
      scroll.appendChild(wrap);
    }
  }
}

let _open = false;
let _opening = false;

export async function openJournal() {
  if (_open || _opening) return;
  _opening = true;
  renderEntries();
  const j = $('#journal');
  if (!j) { _opening = false; return; }
  j.hidden = false;
  await raf(); await raf();
  j.classList.add('visible');
  _open = true;
  _opening = false;
  // 打开时滚到底部，最近发生的在视野中
  const scroll = $('#journal-scroll');
  if (scroll) scroll.scrollTop = scroll.scrollHeight;
}

export async function closeJournal() {
  if (!_open) return;
  const j = $('#journal');
  if (!j) return;
  j.classList.remove('visible');
  await wait(600);
  j.hidden = true;
  _open = false;
}

export function isJournalOpen() { return _open; }

export function initJournal() {
  const anchor = $('#journal-anchor');
  if (anchor) {
    // 阻止冒泡，避免被 input.js 当作 tap-fast-forward 或 swipe 候选吞掉。
    const stop = (e) => e.stopPropagation();
    anchor.addEventListener('pointerdown', stop);
    anchor.addEventListener('pointerup', stop);
    anchor.addEventListener('touchstart', stop, { passive: true });
    anchor.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!_open) openJournal();
    });
  }

  const j = $('#journal');
  if (j) {
    // 在抽屉打开期间吃掉所有指针/触摸事件，避免触发 stage 的滑动手势识别。
    const eat = (e) => { if (_open) e.stopPropagation(); };
    j.addEventListener('pointerdown', eat);
    j.addEventListener('pointermove', eat);
    j.addEventListener('pointerup', eat);
    j.addEventListener('touchstart', eat, { passive: true });
    j.addEventListener('touchmove', eat, { passive: true });
    j.addEventListener('touchend', eat, { passive: true });

    // 点击空白（纸面之外）收回；点击纸面内不关闭，可正常滚动。
    j.addEventListener('click', (e) => {
      if (!_open) return;
      if (!e.target.closest('.journal-paper')) {
        closeJournal();
      }
    });
  }

  const closeBtn = $('#journal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeJournal();
    });
  }
}
