// 2D star map scene — OrthographicCamera looking down at a flat plane.

import * as THREE from 'three';
import { PERSONALITY_STARS, MEMORY_STARS, NEBULA, MAP_RADIUS } from './starmap-2d-data.js';

let scene, camera, renderer;
let _running = false;
let _rafId = null;
let _memoryMeshes = [];
let _personalityMeshes = [];
let _transformedStar = null;
let _transformedOrbits = [];
let _nebulaGroup = null;
let _nebulaRings = [];
let _nebulaAnimating = false;
let _nebulaOriginalPos = null;
let _worldGroup = null; // contains all star map objects — rotated in blackhole mode

// --- Texture generators ---

function createCoreTexture(size, color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  const c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.08, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.15, `rgba(${rgb}, 1)`);
  grad.addColorStop(0.35, `rgba(${rgb}, 0.6)`);
  grad.addColorStop(0.6, `rgba(${rgb}, 0.15)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createDimTexture(size, color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  const c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
  grad.addColorStop(0, `rgba(${rgb}, 0.4)`);
  grad.addColorStop(0.2, `rgba(${rgb}, 0.2)`);
  grad.addColorStop(0.5, `rgba(${rgb}, 0.06)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createNebulaBaseTexture(color) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0, `rgba(${rgb}, 0)`);
  grad.addColorStop(0.15, `rgba(${rgb}, 0)`);
  grad.addColorStop(0.3, `rgba(${rgb}, 0.25)`);
  grad.addColorStop(0.5, `rgba(${rgb}, 0.45)`);
  grad.addColorStop(0.7, `rgba(${rgb}, 0.2)`);
  grad.addColorStop(0.9, `rgba(${rgb}, 0.05)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function createNebulaRingTexture(color) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0, `rgba(${rgb}, 0)`);
  grad.addColorStop(0.55, `rgba(${rgb}, 0)`);
  grad.addColorStop(0.7, `rgba(${rgb}, 0.6)`);
  grad.addColorStop(0.82, `rgba(${rgb}, 0.7)`);
  grad.addColorStop(0.92, `rgba(${rgb}, 0.2)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// --- Boundary circle ---

function createBoundaryDisc(radius) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0, 'rgba(20, 30, 50, 0.06)');
  grad.addColorStop(0.7, 'rgba(20, 30, 50, 0.04)');
  grad.addColorStop(0.85, 'rgba(50, 80, 130, 0.08)');
  grad.addColorStop(0.93, 'rgba(70, 110, 170, 0.18)');
  grad.addColorStop(0.97, 'rgba(50, 80, 130, 0.08)');
  grad.addColorStop(1, 'rgba(20, 30, 50, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(radius * 2.2, radius * 2.2, 1);
  sprite.position.z = -3;
  return sprite;
}

// --- Background ambient stars ---

function createAmbientStars(count, radius) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Distribute within circle
    const angle = Math.random() * Math.PI * 2;
    const r = radius * Math.sqrt(Math.random());
    positions[i * 3]     = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.sin(angle) * r;
    positions[i * 3 + 2] = -1;
    const warmth = Math.random();
    colors[i * 3]     = 0.6 + warmth * 0.4;
    colors[i * 3 + 1] = 0.6 + warmth * 0.3;
    colors[i * 3 + 2] = 0.7 + (1 - warmth) * 0.3;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 1.5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.35,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
}

// --- Interactive stars ---

function createPersonalityStar(data) {
  const LIT_COLOR = 0xffb74d;
  const DIM_COLOR = 0x667788;
  const texture = data.lit
    ? createCoreTexture(256, LIT_COLOR)
    : createDimTexture(256, DIM_COLOR);
  const material = new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(data.x, data.y, 0);
  sprite.scale.set(14, 14, 1);
  sprite.userData = { type: 'personality', id: data.id, lit: data.lit, baseScale: 14 };
  return sprite;
}

function createMemoryStar(data) {
  const color = data.lit ? 0xe8e8ff : 0x556677;
  const texture = data.lit
    ? createCoreTexture(128, color)
    : createDimTexture(128, color);
  const material = new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(6, 6, 1);
  sprite.userData = { type: 'memory', id: data.id, lit: data.lit, baseScale: 6 };
  return sprite;
}

function createNebulaGroup(data) {
  const group = new THREE.Group();
  group.position.set(data.x, data.y, 0);

  const baseTex = createNebulaBaseTexture(data.color);
  const baseMat = new THREE.SpriteMaterial({
    map: baseTex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.7,
  });
  const baseSprite = new THREE.Sprite(baseMat);
  baseSprite.scale.set(data.baseScale, data.baseScale, 1);
  group.add(baseSprite);

  const ringTex = createNebulaRingTexture(data.color);
  const rings = [];
  for (let i = 0; i < data.ringCount; i++) {
    const mat = new THREE.SpriteMaterial({
      map: ringTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.5,
    });
    const ring = new THREE.Sprite(mat);
    ring.scale.set(data.baseScale, data.baseScale, 1);
    group.add(ring);
    rings.push({ mesh: ring, phase: i / data.ringCount });
  }

  group.userData = { type: 'nebula', id: data.id };
  return { group, baseSprite, rings };
}

// --- Animation helpers ---

function updateMemoryPosition(mesh, data, parentPos, time) {
  const angle = data.orbitAngle + time * data.orbitSpeed;
  const r = data.orbitRadius;
  mesh.position.set(
    parentPos.x + r * Math.cos(angle),
    parentPos.y + r * Math.sin(angle),
    0
  );
}

function updatePulse(meshes, time) {
  for (const { mesh, data } of meshes) {
    if (!mesh.userData.lit) continue;
    const base = mesh.userData.baseScale;
    const phase = data.x ?? data.orbitAngle ?? 0;
    const pulse = 1 + 0.05 * Math.sin(time * 0.002 + phase * 0.05);
    mesh.scale.set(base * pulse, base * pulse, 1);
  }
}

// --- Public API ---

export function getCamera() { return camera; }

export function initStarMap(canvas) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const aspect = w / h;
  const viewH = 400;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04080f);

  camera = new THREE.OrthographicCamera(
    -viewH * aspect / 2, viewH * aspect / 2,
    viewH / 2, -viewH / 2,
    0.1, 100
  );
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);

  _worldGroup = new THREE.Group();
  scene.add(_worldGroup);

  _worldGroup.add(createBoundaryDisc(MAP_RADIUS));
  _worldGroup.add(createAmbientStars(600, MAP_RADIUS));

  const parentPositions = {};
  _personalityMeshes = [];
  for (const ps of PERSONALITY_STARS) {
    const sprite = createPersonalityStar(ps);
    _worldGroup.add(sprite);
    parentPositions[ps.id] = sprite.position.clone();
    _personalityMeshes.push({ mesh: sprite, data: ps });
  }

  const nebula = createNebulaGroup(NEBULA);
  _nebulaGroup = nebula.group;
  _nebulaRings = nebula.rings;
  _worldGroup.add(_nebulaGroup);

  _memoryMeshes = [];
  for (const ms of MEMORY_STARS) {
    const parentPos = parentPositions[ms.personalityId];
    if (!parentPos) continue;
    const sprite = createMemoryStar(ms);
    _worldGroup.add(sprite);
    _memoryMeshes.push({ mesh: sprite, data: ms, parentPos });
  }

  const now = performance.now();
  for (const { mesh, data, parentPos } of _memoryMeshes) {
    updateMemoryPosition(mesh, data, parentPos, now);
  }

  window.addEventListener('resize', () => {
    const w2 = canvas.clientWidth;
    const h2 = canvas.clientHeight;
    const a2 = w2 / h2;
    const vh = (camera.top - camera.bottom);
    camera.left = -vh * a2 / 2;
    camera.right = vh * a2 / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(w2, h2);
  });

  return { scene, camera, renderer };
}

export function startRendering() {
  if (_running) return;
  _running = true;
  function loop() {
    if (!_running) return;
    const t = performance.now();
    for (const { mesh, data, parentPos } of _memoryMeshes) {
      if (!mesh.visible) continue;
      updateMemoryPosition(mesh, data, parentPos, t);
    }
    updatePulse(_personalityMeshes, t);
    updatePulse(_memoryMeshes.filter(m => m.mesh.visible).map(m => ({ mesh: m.mesh, data: m.data })), t);
    for (const to of _transformedOrbits) {
      const angle = to.orbitAngle + t * to.orbitSpeed;
      const r = to.orbitRadius;
      to.mesh.position.set(
        to.center.x + r * Math.cos(angle),
        to.center.y + r * Math.sin(angle),
        0
      );
    }
    if (_nebulaGroup && !_nebulaAnimating) {
      _nebulaGroup.rotation.z = t * 0.0002;
      const baseScale = NEBULA.baseScale;
      const cycleDuration = 4000;
      for (const ring of _nebulaRings) {
        const progress = ((t / cycleDuration + ring.phase) % 1);
        const scale = baseScale * (0.2 + 0.8 * progress);
        ring.mesh.scale.set(scale, scale, 1);
        const opacity = progress < 0.15
          ? progress / 0.15 * 0.5
          : progress > 0.85
            ? (1 - progress) / 0.15 * 0.5
            : 0.5;
        ring.mesh.material.opacity = opacity;
      }
    }
    renderer.render(scene, camera);
    _rafId = requestAnimationFrame(loop);
  }
  _rafId = requestAnimationFrame(loop);
}

export function stopRendering() {
  _running = false;
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
}

export function hitTestNebula(ndcX, ndcY) {
  if (!_nebulaGroup || !_nebulaGroup.visible) return false;
  const worldPos = new THREE.Vector3();
  _nebulaGroup.getWorldPosition(worldPos);
  const nebulaScreen = worldPos.project(camera);
  const dx = ndcX - nebulaScreen.x;
  const dy = ndcY - nebulaScreen.y;
  const aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
  const dist = Math.sqrt(dx * dx * aspect * aspect + dy * dy);
  const viewH = camera.top - camera.bottom;
  const nebulaScreenRadius = (NEBULA.baseScale / viewH) * 2;
  return dist < nebulaScreenRadius;
}

export function animateNebulaEnter(onArcStart) {
  if (!_nebulaGroup || !camera) return;
  _nebulaAnimating = true;
  _nebulaOriginalPos = _nebulaGroup.position.clone();

  const startPos = _nebulaGroup.position.clone();
  // In 2D: nebula moves toward camera center, then slides down
  const camCenter = new THREE.Vector3(
    (camera.left + camera.right) / 2 + camera.position.x,
    (camera.top + camera.bottom) / 2 + camera.position.y,
    0
  );
  const viewH = camera.top - camera.bottom;
  const midPos = new THREE.Vector3(camCenter.x, camCenter.y - viewH * 0.1, 0);
  const endPos = new THREE.Vector3(camCenter.x, camCenter.y - viewH * 0.6, 0);

  const origOpacities = _nebulaGroup.children.map(c => c.material.opacity);
  const totalMs = 1400;
  const startT = performance.now();
  let arcStarted = false;

  function animate() {
    const elapsed = performance.now() - startT;
    const t = Math.min(1, elapsed / totalMs);

    if (t < 0.5) {
      const p = t / 0.5;
      const ease = p * (2 - p);
      _nebulaGroup.position.lerpVectors(startPos, midPos, ease);
      _nebulaGroup.scale.setScalar(1 + ease * 1.8);
    } else {
      const p = (t - 0.5) / 0.5;
      const ease = p * (2 - p);
      _nebulaGroup.position.lerpVectors(midPos, endPos, ease);
      _nebulaGroup.scale.setScalar(2.8 + ease * 1.2);
      _nebulaGroup.children.forEach((c, i) => {
        c.material.opacity = origOpacities[i] * (1 - ease);
      });
    }

    if (t >= 0.55 && !arcStarted) {
      arcStarted = true;
      if (onArcStart) onArcStart();
    }

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      _nebulaGroup.visible = false;
      _nebulaGroup.position.copy(_nebulaOriginalPos);
      _nebulaGroup.scale.setScalar(1);
      _nebulaGroup.children.forEach((c, i) => {
        c.material.opacity = origOpacities[i];
      });
      _nebulaAnimating = false;
    }
  }
  requestAnimationFrame(animate);
}

export function animateNebulaExit() {
  if (!_nebulaGroup || !camera || !_nebulaOriginalPos) return;
  _nebulaAnimating = true;
  _nebulaGroup.visible = true;

  const targetPos = _nebulaOriginalPos.clone();
  const camCenter = new THREE.Vector3(
    (camera.left + camera.right) / 2 + camera.position.x,
    (camera.top + camera.bottom) / 2 + camera.position.y,
    0
  );
  const viewH = camera.top - camera.bottom;
  const startPos = new THREE.Vector3(camCenter.x, camCenter.y - viewH * 0.6, 0);
  _nebulaGroup.position.copy(startPos);
  _nebulaGroup.scale.setScalar(4);

  const origOpacities = _nebulaGroup.children.map(c => c.material.opacity);
  _nebulaGroup.children.forEach(c => { c.material.opacity = 0; });

  const totalMs = 1200;
  const startT = performance.now();

  function animate() {
    const elapsed = performance.now() - startT;
    const t = Math.min(1, elapsed / totalMs);
    const ease = t * (2 - t);

    _nebulaGroup.position.lerpVectors(startPos, targetPos, ease);
    _nebulaGroup.scale.setScalar(4 + (1 - 4) * ease);
    _nebulaGroup.children.forEach((c, i) => {
      c.material.opacity = origOpacities[i] * ease;
    });

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      _nebulaGroup.position.copy(targetPos);
      _nebulaGroup.scale.setScalar(1);
      _nebulaGroup.children.forEach((c, i) => {
        c.material.opacity = origOpacities[i];
      });
      _nebulaAnimating = false;
    }
  }
  requestAnimationFrame(animate);
}

export function hitTestMemoryStar(ndcX, ndcY) {
  const viewH = camera.top - camera.bottom;
  const aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
  let best = null;
  let bestDist = Infinity;
  const wp = new THREE.Vector3();
  for (const entry of _memoryMeshes) {
    if (!entry.mesh.userData.lit || !entry.mesh.visible) continue;
    entry.mesh.getWorldPosition(wp);
    const sp = wp.clone().project(camera);
    const dx = (ndcX - sp.x) * aspect;
    const dy = ndcY - sp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitRadius = (entry.mesh.userData.baseScale / viewH) * 2.5;
    if (dist < hitRadius && dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }
  return best;
}

export function getMemoryMeshes() { return _memoryMeshes; }
export function getScene() { return scene; }
export function getWorldGroup() { return _worldGroup; }

export function getNebulaOriginalPos() {
  return _nebulaOriginalPos ? _nebulaOriginalPos.clone() : null;
}

export function spawnPurpleStar(position, orbitMemIds) {
  const texture = createCoreTexture(256, 0xb388ff);
  const material = new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(20, 20, 1);
  sprite.userData = { type: 'personality', id: 'nebula-awakened', lit: true, baseScale: 20 };
  _worldGroup.add(sprite);
  _transformedStar = sprite;
  _personalityMeshes.push({ mesh: sprite, data: { x: NEBULA.x } });

  for (let i = 0; i < orbitMemIds.length; i++) {
    const entry = _memoryMeshes.find(m => m.data.id === orbitMemIds[i]);
    if (!entry) continue;
    entry.mesh.visible = true;
    const idx = _memoryMeshes.indexOf(entry);
    if (idx !== -1) _memoryMeshes.splice(idx, 1);
    _transformedOrbits.push({
      mesh: entry.mesh,
      center: position.clone(),
      orbitRadius: 28 + i * 5,
      orbitAngle: i * (Math.PI * 2 / 3),
      orbitSpeed: 0.0006,
    });
  }

  if (_nebulaGroup) _nebulaGroup.visible = false;
}
