// src/framework/services/RenderService.js
import { Service } from './Service.js';
import * as THREE from 'three';
import {
  createPBRRenderer,
  createLighting,
  applyAtmosphere,
  PBRMaterialFactory
} from '../../rendering/EnvironmentSetup.js';

/**
 * RenderService is a downstream visualization consumer of the World System and ECS.
 * Conforms to EDD Chapter 6 and Chapter 11:
 * Rendering never owns authoritative simulation data; it reads TransformComponent
 * and MeshComponent to synchronize Three.js visual objects.
 */
export class RenderService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('render', framework);
    /** @type {THREE.WebGLRenderer|null} */
    this.renderer = null;
    /** @type {THREE.Scene|null} */
    this.scene = null;
    /** @type {THREE.PerspectiveCamera|null} */
    this.camera = null;
    /** @type {PBRMaterialFactory|null} @private */
    this._materialFactory = null;
    /** @type {Map<number, THREE.Mesh>} @private */
    this._entityMeshes = new Map();
    /** @type {Function|null} @private */
    this._resizeHandler = null;
  }

  /** @override */
  async initialize() {
    if (typeof window === 'undefined') return;

    const container = document.getElementById('gameCanvas')?.parentElement || document.body;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer = createPBRRenderer(container, width, height);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 500);
    this.camera.position.set(0, 1.7, 5);

    applyAtmosphere(this.scene);
    createLighting(this.scene);

    this._materialFactory = new PBRMaterialFactory();

    // ── Build Grey-Box Test Level Geometry ──────────
    this._buildGreyBoxEnvironment();

    // ── Window Resize Listener ──────────────────────
    this._resizeHandler = this.onWindowResize.bind(this);
    window.addEventListener('resize', this._resizeHandler);
  }

  /** @private */
  _buildGreyBoxEnvironment() {
    if (!this._materialFactory || !this.scene) return;

    // Procedural concrete floor (40m x 40m)
    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    const floorMaterial = this._materialFactory.getMaterial('concrete', { roughness: 0.85, metalness: 0.05 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Boundary walls (Corridor / Arena perimeter)
    const wallMaterial = this._materialFactory.getMaterial('corridorMetal', { roughness: 0.4, metalness: 0.85 });

    const createWall = (w, h, d, x, y, z) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, wallMaterial);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };

    // North, South, East, West boundary walls
    createWall(40, 6, 1, 0, 3, -20);
    createWall(40, 6, 1, 0, 3, 20);
    createWall(1, 6, 40, -20, 3, 0);
    createWall(1, 6, 40, 20, 3, 0);

    // Architectural Pillars for depth perception
    for (let x = -10; x <= 10; x += 10) {
      for (let z = -10; z <= 10; z += 10) {
        if (x === 0 && z === 0) continue; // Leave center clear for spawn
        const pillarGeo = new THREE.CylinderGeometry(0.6, 0.6, 6, 16);
        const pillar = new THREE.Mesh(pillarGeo, wallMaterial);
        pillar.position.set(x, 3, z);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        this.scene.add(pillar);
      }
    }
  }

  /**
   * Synchronize visual meshes with ECS entities possessing MeshComponent and TransformComponent.
   * @private
   */
  _syncEcsEntities() {
    const ecsService = this.framework.serviceRegistry.get('ecs');
    if (!ecsService || !ecsService.ecsManager || !this.scene) return;

    const ecs = ecsService.ecsManager;
    let transformStore, meshStore;
    try {
      transformStore = ecs.getStore('Transform');
      meshStore = ecs.getStore('Mesh');
    } catch {
      return;
    }

    if (!transformStore || !meshStore) return;

    // Check entities that have MeshComponent
    ecs._entities.forEach((entity, numericId) => {
      const transform = transformStore.get(numericId);
      const meshComp = meshStore.get(numericId);

      if (transform && meshComp) {
        let visualMesh = this._entityMeshes.get(numericId);
        if (!visualMesh) {
          // Instantiate a visual mesh for this simulation entity
          const size = meshComp.size || { x: 1, y: 1, z: 1 };
          const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
          const mat = this._materialFactory?.getMaterial('corridorMetal', { roughness: 0.3, metalness: 0.9 }) ||
            new THREE.MeshStandardMaterial({ color: 0x00aaff, roughness: 0.4, metalness: 0.8 });
          visualMesh = new THREE.Mesh(geo, mat);
          visualMesh.castShadow = true;
          visualMesh.receiveShadow = true;
          this.scene.add(visualMesh);
          this._entityMeshes.set(numericId, visualMesh);
        }

        // Downstream copy of authoritative simulation transform
        visualMesh.position.set(transform.position.x, transform.position.y, transform.position.z);
        if (transform.rotation) {
          visualMesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
        }
        if (transform.scale) {
          visualMesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
        }
      }
    });

    // Cleanup meshes of destroyed entities
    for (const [id, mesh] of this._entityMeshes.entries()) {
      if (!ecs._entities.has(id)) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        this._entityMeshes.delete(id);
      }
    }
  }

  /**
   * Handles window resizing events to keep camera aspect ratio and viewport synced.
   */
  onWindowResize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  /** @override */
  async start() {
    console.log('[RenderService] Started with PBR renderer, lighting, and grey-box level.');
  }

  /**
   * Per-frame render execution.
   * @param {number} delta
   */
  update(delta) {
    if (this.renderer && this.scene && this.camera) {
      this._syncEcsEntities();
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** @override */
  async shutdown() {
    if (this._resizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', this._resizeHandler);
    }
    for (const [, mesh] of this._entityMeshes.entries()) {
      if (this.scene) this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
    }
    this._entityMeshes.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
