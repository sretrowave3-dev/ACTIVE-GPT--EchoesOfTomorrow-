// EnvironmentSetup.js
import * as THREE from 'three';
import { PBRTextureGenerator } from './PBRTextureGenerator.js';

/**
 * Configures the WebGL renderer, lighting, fog, and enforces PBR-only materials.
 */
export function createPBRRenderer(domElement, width, height) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // soft, realistic penumbra

  // HDR‑ish tone mapping (ACES, as used in modern Battlefield engines)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;   // adjust to taste, keep highlights crisp

  domElement.appendChild(renderer.domElement);
  return renderer;
}

/**
 * Creates the primary key light (directional) and fill light.
 */
export function createLighting(scene) {
  // Main sun / overhead searchlight
  const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
  sun.position.set(15, 20, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 50;
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 15;
  sun.shadow.camera.bottom = -15;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Soft fill from below (simulating bounced light)
  const fill = new THREE.DirectionalLight(0x445566, 0.6);
  fill.position.set(-5, 0, 10);
  scene.add(fill);

  // Ambient to prevent totally black shadows
  scene.add(new THREE.AmbientLight(0x1a1a2e, 0.4));
}

/**
 * Applies exponential fog – thick, moody atmospheric depth.
 */
export function applyAtmosphere(scene) {
  scene.fog = new THREE.FogExp2(0x0a0a14, 0.015);
  scene.background = new THREE.Color(0x0a0a14);   // matches fog colour
}

/**
 * Factory that creates a `MeshStandardMaterial` with the generated PBR textures.
 * All meshes in the environment **must** use this factory – no flat colours, no unlit shaders.
 */
export class PBRMaterialFactory {
  constructor() {
    this.generator = new PBRTextureGenerator(1024);
    this.cache = new Map();
  }

  /**
   * Returns a full `MeshStandardMaterial` (or `MeshPhysicalMaterial` if `clearcoat` is set).
   * @param {string} type - 'concrete', 'corridorMetal', ...
   * @param {object} overrides - optional roughness/metalness/clearcoat overrides
   */
  getMaterial(type, overrides = {}) {
    const key = `${type}_${JSON.stringify(overrides)}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const textures = this.generator.getTextureSet(type);

    // Apply repeating and filtering
    Object.values(textures).forEach(tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);   // scale to world units
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
    });

    const materialParams = {
      map: textures.map,
      roughnessMap: textures.roughnessMap,
      metalnessMap: textures.metalnessMap,
      normalMap: textures.normalMap,
      roughness: overrides.roughness ?? 1.0,
      metalness: overrides.metalness ?? 0.0,
      normalScale: new THREE.Vector2(1.5, 1.5),
      color: new THREE.Color(1, 1, 1)   // multiply with map
    };

    // For wet surfaces or polished metal, use physical material with clearcoat
    let material;
    if (overrides.clearcoat) {
      material = new THREE.MeshPhysicalMaterial(materialParams);
      material.clearcoat = overrides.clearcoat;
      material.clearcoatRoughness = overrides.clearcoatRoughness ?? 0.1;
    } else {
      material = new THREE.MeshStandardMaterial(materialParams);
    }

    this.cache.set(key, material);
    return material;
  }
}
