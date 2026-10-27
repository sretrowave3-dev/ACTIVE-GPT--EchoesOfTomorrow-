// src/rendering/vfx/ParticleEmitter.js
import * as THREE from 'three';

/**
 * ParticleEmitter provides high-performance GPU instanced particle simulation
 * for sparks, cyber embers, steam, and explosive bursts.
 * Conforms to EDD Volume IV (Rendering & Particle Systems).
 */
export class ParticleEmitter {
  /**
   * @param {THREE.Scene} scene
   * @param {number} [maxParticles=1000]
   */
  constructor(scene, maxParticles = 1000) {
    this.scene = scene;
    this.maxParticles = maxParticles;

    // Allocate particle attribute arrays (SoA layout for cache friendliness)
    this.positions = new Float32Array(maxParticles * 3);
    this.velocities = new Float32Array(maxParticles * 3);
    this.lifetimes = new Float32Array(maxParticles);
    this.maxLifetimes = new Float32Array(maxParticles);
    this.scales = new Float32Array(maxParticles);
    this.activeFlags = new Uint8Array(maxParticles);

    this.activeCount = 0;
    this.gravity = -4.0;
    this.drag = 0.96;

    this._scratchObj = new THREE.Object3D();
    this.instancedMesh = null;

    if (this.scene) {
      this._initMesh();
    }
  }

  /**
   * Initializes the InstancedMesh.
   * @private
   */
  _initMesh() {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      wireframe: false
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Initialize all transforms offscreen
    this._scratchObj.position.set(0, -9999, 0);
    this._scratchObj.scale.set(0, 0, 0);
    this._scratchObj.updateMatrix();

    for (let i = 0; i < this.maxParticles; i++) {
      this.instancedMesh.setMatrixAt(i, this._scratchObj.matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedMesh);
  }

  /**
   * Spawns an instant burst of particles from an origin.
   * @param {number} count
   * @param {{ x: number, y: number, z: number }} origin
   * @param {number} [speed=6.0]
   */
  burst(count, origin, speed = 6.0) {
    let spawned = 0;
    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      if (this.activeFlags[i] === 0) {
        const idx3 = i * 3;
        this.positions[idx3] = origin.x;
        this.positions[idx3 + 1] = origin.y;
        this.positions[idx3 + 2] = origin.z;

        // Random spherical unit vector
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const spd = (0.4 + Math.random() * 0.6) * speed;

        this.velocities[idx3] = Math.sin(phi) * Math.cos(theta) * spd;
        this.velocities[idx3 + 1] = Math.abs(Math.cos(phi)) * spd; // Bias upward
        this.velocities[idx3 + 2] = Math.sin(phi) * Math.sin(theta) * spd;

        this.lifetimes[i] = 0;
        this.maxLifetimes[i] = 0.8 + Math.random() * 1.2;
        this.scales[i] = 1.0;
        this.activeFlags[i] = 1;

        spawned++;
        this.activeCount++;
      }
    }
  }

  /**
   * Updates particle positions, lifetimes, and scales.
   * @param {number} delta - Frame delta in seconds
   */
  update(delta) {
    if (!this.instancedMesh || this.activeCount === 0) return;

    let hasUpdates = false;

    for (let i = 0; i < this.maxParticles; i++) {
      if (this.activeFlags[i] === 1) {
        this.lifetimes[i] += delta;

        if (this.lifetimes[i] >= this.maxLifetimes[i]) {
          // Deactivate particle
          this.activeFlags[i] = 0;
          this.activeCount--;

          this._scratchObj.position.set(0, -9999, 0);
          this._scratchObj.scale.set(0, 0, 0);
          this._scratchObj.updateMatrix();
          this.instancedMesh.setMatrixAt(i, this._scratchObj.matrix);
          hasUpdates = true;
          continue;
        }

        const idx3 = i * 3;

        // Apply physics
        this.velocities[idx3 + 1] += this.gravity * delta;
        this.velocities[idx3] *= this.drag;
        this.velocities[idx3 + 1] *= this.drag;
        this.velocities[idx3 + 2] *= this.drag;

        this.positions[idx3] += this.velocities[idx3] * delta;
        this.positions[idx3 + 1] += this.velocities[idx3 + 1] * delta;
        this.positions[idx3 + 2] += this.velocities[idx3 + 2] * delta;

        // Life ratio decay (fade / shrink)
        const progress = this.lifetimes[i] / this.maxLifetimes[i];
        const currentScale = Math.max(0.01, (1.0 - progress) * this.scales[i]);

        this._scratchObj.position.set(
          this.positions[idx3],
          this.positions[idx3 + 1],
          this.positions[idx3 + 2]
        );
        this._scratchObj.scale.set(currentScale, currentScale, currentScale);
        this._scratchObj.updateMatrix();

        this.instancedMesh.setMatrixAt(i, this._scratchObj.matrix);
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Cleans up instanced mesh and GPU buffers.
   */
  dispose() {
    if (this.instancedMesh && this.scene) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      this.instancedMesh.material.dispose();
      this.instancedMesh = null;
    }
  }
}
