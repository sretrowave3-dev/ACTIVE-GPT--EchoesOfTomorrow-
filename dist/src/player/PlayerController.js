// src/player/PlayerController.js
import * as THREE from 'three';
import { AABB } from '../physics/AABB.js';

export class PlayerController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement - Element used for pointer lock (e.g., document.body).
   * @param {THREE.Scene} scene
   * @param {import('../framework/services/InputService.js').InputService|null} [inputService=null]
   * @param {import('../physics/CollisionWorld.js').CollisionWorld|null} [collisionWorld=null]
   */
  constructor(camera, domElement, scene, inputService = null, collisionWorld = null) {
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
    this.collisionWorld = collisionWorld;

    // Player bounding box for physical collision (0.6m x 1.8m x 0.6m)
    this._playerAABB = new AABB();
    this._playerSize = { x: 0.6, y: 1.8, z: 0.6 };
    this._scratchDisp = { x: 0, y: 0, z: 0 };

    // ── Mouse look settings ───────────────────────────────
    this.mouseSensitivity = 0.002;
    this.isLocked = false;

    // ── Movement physics ──────────────────────────────────
    this.velocity = new THREE.Vector3();
    this.moveSpeed = 10;        // max speed (units/s)
    this.acceleration = 50;     // acceleration (units/s²)
    this.friction = 8;          // damping coefficient
    this.keys = {};
    this.canSprint = true;
    this.isSprinting = false;

    // ── Vertical & Kinematic Jump Attributes ──────────────
    this.verticalVelocity = 0;
    this.gravity = -24.0;
    this.jumpSpeed = 8.5;
    this.isGrounded = true;
    this.coyoteTimer = 0.15;
    this.jumpBufferTimer = 0;
    this.airControl = 0.4;

    // ── Crouch & Slide Kinematics ─────────────────────────
    this.standingHeight = 1.8;
    this.crouchHeight = 1.0;
    this.standingEyeHeight = 1.7;
    this.crouchEyeHeight = 0.95;
    this.currentEyeHeight = 1.7;
    this.targetEyeHeight = 1.7;
    this.isCrouched = false;
    this.isSliding = false;
    this.slideTimer = 0;

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

    // ── Crouch & Slide Handling ──
    const wantsCrouch = Boolean(this.inputService?.isActionActive('crouch')) || Boolean(this.keys['KeyC'] || this.keys['ControlLeft']);
    const isMoving = Math.hypot(this.velocity.x, this.velocity.z) > 1.0;

    if (wantsCrouch) {
      if (!this.isCrouched && this.isSprinting && isMoving) {
        // Trigger sprint-to-slide
        this.isSliding = true;
        this.slideTimer = 0.8;
        this.velocity.multiplyScalar(1.35); // Slide impulse
      }
      this.isCrouched = true;
      this._playerSize.y = this.crouchHeight;
      this.targetEyeHeight = this.crouchEyeHeight;
    } else {
      this.isCrouched = false;
      this.isSliding = false;
      this._playerSize.y = this.standingHeight;
      this.targetEyeHeight = this.standingEyeHeight;
    }

    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // Smooth camera eye height interpolation
    this.currentEyeHeight += (this.targetEyeHeight - this.currentEyeHeight) * Math.min(1.0, 15.0 * dt);
    this.camera.position.y = this.currentEyeHeight;

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

      // Support sprinting if action is active and stamina permits
      const wantsSprint = Boolean(this.inputService?.isActionActive('sprint')) || Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
      this.isSprinting = wantsSprint && this.canSprint && !this.isCrouched;

      let currentSpeed = this.moveSpeed;
      if (this.isSprinting) currentSpeed *= 1.6;
      else if (this.isCrouched) currentSpeed *= 0.55;

      let currentAccel = this.acceleration;
      if (this.isSprinting) currentAccel *= 1.5;
      if (!this.isGrounded) currentAccel *= this.airControl;

      const accelForce = currentAccel * dt;
      this.velocity.addScaledVector(forward, -input.z * accelForce);
      this.velocity.addScaledVector(right, input.x * accelForce);

      const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      if (horizSpeed > currentSpeed) {
        const factor = currentSpeed / horizSpeed;
        this.velocity.x *= factor;
        this.velocity.z *= factor;
      }
    }

    // --- Horizontal Friction / Damping ---
    const horizDamping = Math.exp(-(this.isSliding ? 2.5 : this.friction) * dt);
    this.velocity.x *= horizDamping;
    this.velocity.z *= horizDamping;

    // Apply horizontal translation
    this.yawObject.position.x += this.velocity.x * dt;
    this.yawObject.position.z += this.velocity.z * dt;

    // ── Vertical Kinematics & Jump ──
    if (this.isGrounded) {
      this.coyoteTimer = 0.15;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    const wantsJump = Boolean(this.inputService?.isActionActive('jump')) || Boolean(this.keys['Space']);
    if (wantsJump) {
      this.jumpBufferTimer = 0.12;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    // Trigger jump if buffered input and coyote window permit
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0 && !this.isCrouched) {
      this.verticalVelocity = this.jumpSpeed;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
    }

    // Apply gravity
    this.verticalVelocity += this.gravity * dt;
    this.yawObject.position.y += this.verticalVelocity * dt;

    // Floor contact check
    if (this.yawObject.position.y <= 0) {
      this.yawObject.position.y = 0;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // --- Collision Detection & Resolution against CollisionWorld ---
    if (this.collisionWorld) {
      const center = {
        x: this.yawObject.position.x,
        y: this.yawObject.position.y + (this._playerSize.y * 0.5),
        z: this.yawObject.position.z
      };
      this._playerAABB.fromCenterAndSize(center, this._playerSize);

      if (this.collisionWorld.resolveStaticCollision(this._playerAABB, this._scratchDisp, 'player')) {
        this.yawObject.position.x += this._scratchDisp.x;
        this.yawObject.position.y += this._scratchDisp.y;
        this.yawObject.position.z += this._scratchDisp.z;

        if (Math.abs(this._scratchDisp.x) > 1e-4) this.velocity.x = 0;
        if (Math.abs(this._scratchDisp.z) > 1e-4) this.velocity.z = 0;
        if (this._scratchDisp.y > 1e-4) {
          this.verticalVelocity = 0;
          this.isGrounded = true;
        }
      }
    }
  }

  /** Convenience getter for the player's world position. */
  get position() {
    return this.yawObject.position;
  }

  /**
   * Get player orientation (yaw & pitch in radians).
   * @returns {{ yaw: number, pitch: number }}
   */
  getOrientation() {
    return {
      yaw: this.yawObject.rotation.y,
      pitch: this.pitchObject.rotation.x
    };
  }

  /**
   * Set player orientation.
   * @param {number} yaw
   * @param {number} pitch
   */
  setOrientation(yaw, pitch) {
    this.yawObject.rotation.y = yaw;
    const limit = (Math.PI / 2) - 0.01;
    this.pitchObject.rotation.x = Math.max(-limit, Math.min(limit, pitch));
  }

  /**
   * Set the player's world position and zero out velocity.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setPosition(x, y, z) {
    this.yawObject.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
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
