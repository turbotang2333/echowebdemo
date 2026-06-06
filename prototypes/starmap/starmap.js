// Three.js star map scene — 360° panoramic star field viewed from center.
// Camera lives inside a pivot Group for orbit-style zoom.

import * as THREE from 'three';
import { PERSONALITY_STARS, MEMORY_STARS, NEBULA } from './starmap-data.js';
import { createPivot } from './starmap-controls.js';

let scene, camera, renderer, pivot;
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

// --- Helpers ---

function sphericalToCartesian(theta, phi, radius) {
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// --- Background ambient star field ---

function createAmbientStars(count, minRadius, maxRadius) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = minRadius + Math.random() * (maxRadius - minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const warmth = Math.random();
    colors[i * 3]     = 0.6 + warmth * 0.4;
    colors[i * 3 + 1] = 0.6 + warmth * 0.3;
    colors[i * 3 + 2] = 0.7 + (1 - warmth) * 0.3;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.4,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geo, material);
}

// --- Interactive stars ---

function createPersonalityStar(data) {
  const pos = sphericalToCartesian(data.theta, data.phi, data.radius);
  const LIT_COLOR = 0xffb74d; // orange-yellow for all lit personality stars
  const DIM_COLOR = 0x667788;
  const texture = data.lit
    ? createCoreTexture(256, LIT_COLOR)
    : createDimTexture(256, DIM_COLOR);
  const material = new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(pos);
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

function createNebulaBaseTexture(color) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
  // Donut shape: dark center, purple glow ring, fade at edges
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
  // Thin ring: transparent center, bright thin band, transparent outside
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

function createNebulaGroup(data) {
  const pos = sphericalToCartesian(data.theta, data.phi, data.radius);
  const group = new THREE.Group();
  group.position.copy(pos);

  // Base donut glow
  const baseTex = createNebulaBaseTexture(data.color);
  const baseMat = new THREE.SpriteMaterial({
    map: baseTex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, opacity: 0.7,
  });
  const baseSprite = new THREE.Sprite(baseMat);
  baseSprite.scale.set(data.baseScale, data.baseScale, 1);
  group.add(baseSprite);

  // Collapsing rings
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

// --- Animation ---

function updateMemoryPosition(mesh, data, parentPos, time) {
  const angle = data.orbitAngle + time * data.orbitSpeed;
  const r = data.orbitRadius;
  mesh.position.set(
    parentPos.x + r * Math.cos(angle),
    parentPos.y + r * Math.sin(angle) * 0.4,
    parentPos.z + r * Math.sin(angle) * 0.9
  );
}

function updatePulse(meshes, time) {
  for (const { mesh, data } of meshes) {
    if (!mesh.userData.lit) continue;
    const base = mesh.userData.baseScale;
    const phase = data.theta ?? data.orbitAngle ?? 0;
    const pulse = 1 + 0.05 * Math.sin(time * 0.002 + phase * 3);
    mesh.scale.set(base * pulse, base * pulse, 1);
  }
}

// --- Public API ---

export function initStarMap(canvas) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04080f);

  camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);

  // Pivot at origin; camera is child — distance drives orbit zoom
  pivot = createPivot(camera);
  scene.add(pivot);

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);

  // Background ambient stars
  scene.add(createAmbientStars(800, 150, 500));

  // Personality stars
  const parentPositions = {};
  _personalityMeshes = [];
  for (const ps of PERSONALITY_STARS) {
    const sprite = createPersonalityStar(ps);
    scene.add(sprite);
    parentPositions[ps.id] = sprite.position.clone();
    _personalityMeshes.push({ mesh: sprite, data: ps });
  }

  // Black hole nebula
  const nebula = createNebulaGroup(NEBULA);
  _nebulaGroup = nebula.group;
  _nebulaRings = nebula.rings;
  scene.add(_nebulaGroup);

  // Memory stars
  _memoryMeshes = [];
  for (const ms of MEMORY_STARS) {
    const parentPos = parentPositions[ms.personalityId];
    if (!parentPos) continue;
    const sprite = createMemoryStar(ms);
    scene.add(sprite);
    _memoryMeshes.push({ mesh: sprite, data: ms, parentPos });
  }

  const now = performance.now();
  for (const { mesh, data, parentPos } of _memoryMeshes) {
    updateMemoryPosition(mesh, data, parentPos, now);
  }

  window.addEventListener('resize', () => {
    const w2 = canvas.clientWidth;
    const h2 = canvas.clientHeight;
    camera.aspect = w2 / h2;
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
        to.center.y + r * Math.sin(angle) * 0.4,
        to.center.z + r * Math.sin(angle) * 0.9
      );
    }
    // Black hole nebula: rings collapse inward continuously (skip during flight animation)
    if (_nebulaGroup && !_nebulaAnimating) {
      _nebulaGroup.rotation.z = t * 0.0002;
      const baseScale = NEBULA.baseScale;
      const cycleDuration = 4000; // 4s full collapse cycle
      for (const ring of _nebulaRings) {
        // Each ring has a phase offset; progresses 1→0 (outer→inner)
        const progress = ((t / cycleDuration + ring.phase) % 1);
        const scale = baseScale * (0.2 + 0.8 * progress);
        ring.mesh.scale.set(scale, scale, 1);
        // Fade out as it approaches center (progress→0 = near center = invisible)
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

export function getCamera() { return camera; }

export function hitTestNebula(ndcX, ndcY) {
  if (!_nebulaGroup || !_nebulaGroup.visible) return false;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const hits = raycaster.intersectObjects(_nebulaGroup.children, false);
  return hits.length > 0;
}

export function animateNebulaEnter(onArcStart) {
  if (!_nebulaGroup || !camera) return;
  _nebulaAnimating = true;
  _nebulaOriginalPos = _nebulaGroup.position.clone();

  const startPos = _nebulaGroup.position.clone();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const down = new THREE.Vector3(0, -1, 0).applyQuaternion(q);

  const midPos = forward.clone().multiplyScalar(40).add(down.clone().multiplyScalar(48));
  const endPos = midPos.clone().add(down.clone().multiplyScalar(55));

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
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const q = new THREE.Quaternion();
  camera.getWorldQuaternion(q);
  const down = new THREE.Vector3(0, -1, 0).applyQuaternion(q);

  const startPos = forward.clone().multiplyScalar(40).add(down.clone().multiplyScalar(55));
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
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const meshes = _memoryMeshes
    .filter(m => m.mesh.userData.lit && m.mesh.visible)
    .map(m => m.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) return null;
  const hit = hits[0].object;
  return _memoryMeshes.find(m => m.mesh === hit);
}

export function getMemoryMeshes() { return _memoryMeshes; }
export function getScene() { return scene; }

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
  scene.add(sprite);
  _transformedStar = sprite;
  _personalityMeshes.push({ mesh: sprite, data: { theta: NEBULA.theta } });

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
      orbitSpeed: 0.00004,
    });
  }

  if (_nebulaGroup) _nebulaGroup.visible = false;
}
