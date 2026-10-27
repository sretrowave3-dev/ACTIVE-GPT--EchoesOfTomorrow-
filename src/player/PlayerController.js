// src/player/PlayerController.js
import * as THREE from 'three';

export class PlayerController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement - Element used for pointer lock (e.g., document.body).
   * @param {THREE.Scene} scene
   * @param {import('../framework/services/InputService.js').InputService|null} [inputService=null]
   */
  constructor(camera, domElement, scene, inputService = null) {
    // ── Yaw / Pitch hierarchy (no gimbal lock) ──────────
    this.yawObject = new THREE.Object3D();
    this.pitchObject = new THREE.Object3D();
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(camera);

    // Eye height offset (camera relative to pitchObject)
    camera.position.set(0, 1.7, 0);

    scene.add(this.yawObject);

    // ── References ────────────────────────────────────────
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.inputService = inputService;

    // ── Mouse look settings ───────────────────────────────
    this.mouseSensitivity = 0.002;
    this.isLocked = false;

    // ── Movement physics ──────────────────────────────────
    this.velocity = new THREE.Vector3();
    this.moveSpeed = 10;        // max speed (units/s)
    this.acceleration = 50;     // acceleration (units/s²)
    this.friction = 8;          // damping coefficient
    this.keys = {};

    // ── Bind event handlers ───────────────────────────────
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    // ── Attach listeners if no external InputService ──────
    if (!this.inputService && typeof document !== 'undefined') {
      document.addEventListener('pointerlockchange', this._onPointerLockChange);
      if (domElement && domElement.addEventListener) {
        domElement.addEventListener('click', () => domElement.requestPointerLock());
      }
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('keyup', this._onKeyUp);
    }
  }

  /* -------- Pointer Lock & Mouse Look ---------- */
  _onPointerLockChange() {
    this.isLocked = (document.pointerLockElement === this.domElement);
    if (this.isLocked) {
      document.addEventListener('mousemove', this._onMouseMove);
    } else {
      document.removeEventListener('mousemove', this._onMouseMove);
    }
  }

  _onMouseMove(event) {
    if (!this.isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    this.applyRotation(movementX, movementY);
  }

  /**
   * Apply mouse/look deltas to yaw and pitch.
   * @param {number} movementX
   * @param {number} movementY
   */
  applyRotation(movementX, movementY) {
    this.yawObject.rotation.y -= movementX * this.mouseSensitivity;
    this.pitchObject.rotation.x -= movementY * this.mouseSensitivity;

    // Clamp vertical rotation to avoid flipping (-89 deg to +89 deg)
    const limit = (Math.PI / 2) - 0.01;
    this.pitchObject.rotation.x = Math.max(-limit, Math.min(limit, this.pitchObject.rotation.x));
  }

  /* -------- Movement Input ---------- */
  _onKeyDown(event) {
    this.keys[event.code] = true;
  }

  _onKeyUp(event) {
    this.keys[event.code] = false;
  }

  /**
   * Called every frame with the elapsed time in seconds.
   * @param {number} delta - Time since last frame (seconds).
   */
  update(delta) {
    const dt = Math.min(delta, 0.1);   // prevent physics explosions

    // If integrated with InputService, process mouse delta and action mappings
    if (this.inputService) {
      this.isLocked = this.inputService.isPointerLocked();
      const mouseDelta = this.inputService.consumeMouseDelta();
      if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
        this.applyRotation(mouseDelta.x, mouseDelta.y);
      }
    }

    // --- Build normalized input direction (WASD or Action Mappings) ---
    const input = new THREE.Vector3();

    if (this.inputService) {
      if (this.inputService.isActionActive('moveForward')) input.z -= 1;
      if (this.inputService.isActionActive('moveBackward')) input.z += 1;
      if (this.inputService.isActionActive('moveLeft')) input.x -= 1;
      if (this.inputService.isActionActive('moveRight')) input.x += 1;
    } else {
      if (this.keys['KeyW']) input.z -= 1;
      if (this.keys['KeyS']) input.z += 1;
      if (this.keys['KeyA']) input.x -= 1;
      if (this.keys['KeyD']) input.x += 1;
    }

    if (input.lengthSq() > 0) {
      input.normalize();

      // World‑space forward and right (ignore pitch for movement direction)
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.yawObject.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.yawObject.quaternion);

      // Support sprinting if action is active
      const currentSpeed = (this.inputService?.isActionActive('sprint')) ? this.moveSpeed * 1.6 : this.moveSpeed;
      const currentAccel = (this.inputService?.isActionActive('sprint')) ? this.acceleration * 1.5 : this.acceleration;

      const accelForce = currentAccel * dt;
      this.velocity.addScaledVector(forward, -input.z * accelForce);
      this.velocity.addScaledVector(right, input.x * accelForce);

      // Hard speed cap
      if (this.velocity.length() > currentSpeed) {
        this.velocity.normalize().multiplyScalar(currentSpeed);
      }
    }

    // --- Friction / damping (frame‑rate independent) ---
    const damping = Math.exp(-this.friction * dt);
    this.velocity.multiplyScalar(damping);

    // --- Apply movement to the yaw object ---
    this.yawObject.position.addScaledVector(this.velocity, dt);
  }

  /** Convenience getter for the player's world position. */
  get position() {
    return this.yawObject.position;
  }

  /** Dispose controller and remove any attached event listeners. */
  dispose() {
    if (!this.inputService && typeof document !== 'undefined') {
      document.removeEventListener('pointerlockchange', this._onPointerLockChange);
      document.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('keyup', this._onKeyUp);
    }
    if (this.yawObject && this.scene) {
      this.scene.remove(this.yawObject);
    }
  }
}
