// src/main.js
import * as THREE from 'three';
import {
  createPBRRenderer,
  createLighting,
  applyAtmosphere,
  PBRMaterialFactory
} from './EnvironmentSetup.js';

// ── Renderer, Scene, Camera ────────────────────────────
const renderer = createPBRRenderer(document.body, window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 2, 5);

// ── Atmospheric depth (fog) ────────────────────────────
applyAtmosphere(scene);

// ── Lighting (shadow‑cast enabled) ─────────────────────
createLighting(scene);

// ── PBR Material Factory ───────────────────────────────
const materialFactory = new PBRMaterialFactory();

// ── Procedural concrete floor (receives shadows) ──────
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = materialFactory.getMaterial('concrete', {
  roughness: 0.85,
  metalness: 0
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ── Procedural corridor metal wall (casts shadows) ────
const wallGeometry = new THREE.BoxGeometry(10, 4, 0.3);
const wallMaterial = materialFactory.getMaterial('corridorMetal', {
  roughness: 0.4,
  metalness: 0.9,
  clearcoat: 0.15
});
const wall = new THREE.Mesh(wallGeometry, wallMaterial);
wall.position.set(0, 2, -3);
wall.castShadow = true;
wall.receiveShadow = true;
scene.add(wall);

// ── Game loop (delta time + resize) ────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();   // seconds since last frame
  // (Game logic would go here in the future)

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();