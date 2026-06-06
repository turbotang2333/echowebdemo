// Puzzle drag-and-drop for 2D star map — same logic as 3D version.

import { NEBULA } from './starmap-2d-data.js';
import { hitTestMemoryStar, getNebulaOriginalPos, spawnPurpleStar, getMemoryMeshes } from './starmap-2d.js';
import { exitBlackhole } from './starmap-2d-controls.js';

let _active = false;
let _canvas = null;
let _slotsEl = null;
let _ghostEl = null;
let _slots = [null, null, null];
let _dragging = null;
let _pointerStart = null;
let _judging = false;
let _onSolved = null;

const DRAG_THRESHOLD = 8;
const SLOT_SNAP_DIST = 60;

export function initPuzzle(canvas, slotsEl, ghostEl, { onSolved } = {}) {
  _canvas = canvas;
  _slotsEl = slotsEl;
  _ghostEl = ghostEl;
  _onSolved = onSolved || null;

  canvas.addEventListener('pointerdown', onPointerDownCapture, true);
  canvas.addEventListener('pointermove', onPointerMoveCapture, true);
  canvas.addEventListener('pointerup', onPointerUpCapture, true);
  canvas.addEventListener('pointercancel', onPointerUpCapture, true);
}

export function enterPuzzleMode() {
  _active = true;
  _judging = false;
  _slots = [null, null, null];
  _dragging = null;
  _pointerStart = null;
  clearSlotClasses();
  if (_slotsEl) _slotsEl.classList.add('visible');
}

export function exitPuzzleMode() {
  _active = false;
  _judging = false;
  if (_dragging) cancelDrag();
  restoreAllSlottedStars();
  _slots = [null, null, null];
  clearSlotClasses();
  if (_slotsEl) _slotsEl.classList.remove('visible');
}

function onPointerDownCapture(e) {
  if (!_active || _judging) return;

  const rect = _canvas.getBoundingClientRect();
  const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  const hit = hitTestMemoryStar(ndcX, ndcY);
  if (!hit) return;

  if (_slots.some(s => s && s.memoryId === hit.data.id)) return;

  _pointerStart = {
    x: e.clientX, y: e.clientY,
    memEntry: hit,
    committed: false,
  };
}

function onPointerMoveCapture(e) {
  if (!_pointerStart) return;

  if (!_pointerStart.committed) {
    const dist = Math.hypot(e.clientX - _pointerStart.x, e.clientY - _pointerStart.y);
    if (dist > DRAG_THRESHOLD) {
      _pointerStart.committed = true;
      startDrag(_pointerStart.memEntry, e.clientX, e.clientY);
    } else {
      return;
    }
  }

  e.stopPropagation();
  e.preventDefault();
  updateDragPosition(e.clientX, e.clientY);
}

function onPointerUpCapture(e) {
  if (!_pointerStart) return;

  if (_dragging) {
    e.stopPropagation();
    endDrag(e.clientX, e.clientY);
  }
  _pointerStart = null;
}

function startDrag(memEntry, x, y) {
  memEntry.mesh.visible = false;
  _dragging = { memEntry };
  _ghostEl.style.left = x + 'px';
  _ghostEl.style.top = y + 'px';
  _ghostEl.classList.add('active');
}

function updateDragPosition(x, y) {
  _ghostEl.style.left = x + 'px';
  _ghostEl.style.top = y + 'px';

  const slotEls = _slotsEl.querySelectorAll('.puzzle-slot');
  const nearest = findNearestSlot(x, y);
  slotEls.forEach((el, i) => {
    el.classList.toggle('near', nearest === i && !_slots[i]);
  });
}

function endDrag(x, y) {
  _ghostEl.classList.remove('active');
  const slotEls = _slotsEl.querySelectorAll('.puzzle-slot');
  slotEls.forEach(el => el.classList.remove('near'));

  const slotIdx = findNearestSlot(x, y);
  if (slotIdx !== -1 && !_slots[slotIdx]) {
    placeInSlot(slotIdx, _dragging.memEntry);
  } else {
    _dragging.memEntry.mesh.visible = true;
  }
  _dragging = null;

  const filledCount = _slots.filter(Boolean).length;
  if (filledCount === 3) {
    judgeAnswer();
  }
}

function cancelDrag() {
  if (!_dragging) return;
  _ghostEl.classList.remove('active');
  _dragging.memEntry.mesh.visible = true;
  _dragging = null;
  const slotEls = _slotsEl.querySelectorAll('.puzzle-slot');
  slotEls.forEach(el => el.classList.remove('near'));
}

function findNearestSlot(x, y) {
  const slotEls = _slotsEl.querySelectorAll('.puzzle-slot');
  let best = -1;
  let bestDist = Infinity;
  slotEls.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const d = Math.hypot(x - cx, y - cy);
    if (d < SLOT_SNAP_DIST && d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

function placeInSlot(slotIdx, memEntry) {
  _slots[slotIdx] = { memoryId: memEntry.data.id, memEntry };
  const slotEls = _slotsEl.querySelectorAll('.puzzle-slot');
  slotEls[slotIdx].classList.add('filled');
}

function clearSlotClasses() {
  if (!_slotsEl) return;
  const slotEls = _slotsEl.querySelectorAll('.puzzle-slot');
  slotEls.forEach(el => {
    el.classList.remove('filled', 'near', 'flash-wrong', 'flash-correct');
  });
}

function restoreAllSlottedStars() {
  for (const s of _slots) {
    if (s && s.memEntry) s.memEntry.mesh.visible = true;
  }
}

function judgeAnswer() {
  _judging = true;
  const placed = _slots.map(s => s.memoryId);
  const correct = new Set(NEBULA.answerIds);
  const isCorrect = placed.every(id => correct.has(id));

  if (isCorrect) {
    flashSlots('flash-correct', () => onCorrectAnswer());
  } else {
    flashSlots('flash-wrong', () => onWrongAnswer());
  }
}

function flashSlots(cssClass, callback) {
  const slotEls = _slotsEl.querySelectorAll('.puzzle-slot');
  slotEls.forEach(el => el.classList.add(cssClass));
  setTimeout(() => {
    slotEls.forEach(el => el.classList.remove(cssClass));
    callback();
  }, 800);
}

function onWrongAnswer() {
  restoreAllSlottedStars();
  _slots = [null, null, null];
  clearSlotClasses();
  _judging = false;
}

export function revealAnswers() {
  const all = getMemoryMeshes();
  const targets = all.filter(m => NEBULA.answerIds.includes(m.data.id));
  for (const { mesh } of targets) {
    if (!mesh.visible) continue;
    const base = mesh.userData.baseScale;
    mesh.scale.set(base * 2.5, base * 2.5, 1);
    mesh.material.color.setHex(0xffd700);
    setTimeout(() => {
      mesh.scale.set(base, base, 1);
      mesh.material.color.setHex(0xffffff);
    }, 1500);
  }
}

function onCorrectAnswer() {
  const pos = getNebulaOriginalPos();
  if (!pos) return;

  const ids = _slots.map(s => s.memoryId);
  _slots.forEach(s => { if (s && s.memEntry) s.memEntry.mesh.visible = true; });

  if (_slotsEl) _slotsEl.classList.remove('visible');

  setTimeout(() => {
    spawnPurpleStar(pos, ids);
    _active = false;
    _judging = false;
    if (_onSolved) _onSolved();
    setTimeout(() => exitBlackhole(), 500);
  }, 300);
}
