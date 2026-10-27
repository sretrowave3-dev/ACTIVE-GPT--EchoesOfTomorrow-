// src/systems/PhysicsSystem.js
import { System } from '../ecs/System.js';
import { EntitySignature } from '../ecs/EntitySignature.js';
import { AABB } from '../physics/AABB.js';
import { CollisionWorld } from '../physics/CollisionWorld.js';

/**
 * PhysicsSystem integrates rigid-body dynamics, applies gravity,
 * and resolves collisions against the CollisionWorld and between dynamic entities.
 * Conforms to EDD Chapter 15 (Physics System & Collision Architecture).
 */
export class PhysicsSystem extends System {
  /**
   * @param {CollisionWorld} [collisionWorld]
   */
  constructor(collisionWorld = null) {
    super();
    this.priority = 90; // Runs immediately before Movement/Gameplay
    this._requiredSig = new EntitySignature();
    this.collisionWorld = collisionWorld || new CollisionWorld();

    /** @type {number} */
    this.gravity = -9.81;

    // Component Type IDs
    this._transformId = -1;
    this._colliderId = -1;
    this._velocityId = -1;
    this._rigidBodyId = -1;

    // Reusable scratch objects
    this._scratchAABB = new AABB();
    this._otherAABB = new AABB();
    this._scratchDisp = { x: 0, y: 0, z: 0 };
    this._scratchPen = { x: 0, y: 0, z: 0 };
  }

  /**
   * @param {import('../ecs/ECSManager.js').ECSManager} ecs
   */
  initialize(ecs) {
    this._transformId = ecs.getTypeId('Transform');
    this._colliderId = ecs.getTypeId('Collider');
    this._velocityId = ecs.getTypeId('Velocity');
    this._rigidBodyId = ecs.getTypeId('RigidBody');

    // Required components: Transform and Collider
    if (this._transformId !== undefined) this._requiredSig.add(this._transformId);
    if (this._colliderId !== undefined) this._requiredSig.add(this._colliderId);
  }

  requiredSignature() {
    return this._requiredSig;
  }

  /**
   * @param {number} delta
   * @param {number[]} entityIds
   * @param {import('../ecs/ECSManager.js').ECSManager} ecs
   */
  update(delta, entityIds, ecs) {
    const dt = Math.min(delta, 0.05); // Fixed time clamping to avoid tunneling
    const transformStore = ecs.getStore('Transform');
    const colliderStore = ecs.getStore('Collider');
    const velocityStore = this._velocityId !== undefined ? ecs.getStore('Velocity') : null;
    const rigidBodyStore = this._rigidBodyId !== undefined ? ecs.getStore('RigidBody') : null;

    // 1. Dynamics Integration (Gravity, damping, velocity step)
    for (let i = 0; i < entityIds.length; i++) {
      const eid = entityIds[i];
      const transform = transformStore.get(eid);
      const collider = colliderStore.get(eid);
      const velocity = velocityStore?.get(eid);
      const rigidBody = rigidBodyStore?.get(eid);

      if (!transform || !collider) continue;

      if (rigidBody && !rigidBody.isKinematic && velocity) {
        // Apply gravity if enabled and not grounded
        if (rigidBody.useGravity && !rigidBody.isGrounded) {
          velocity.y += this.gravity * dt;
        }

        // Apply linear damping
        const damping = Math.max(0, 1 - rigidBody.linearDamping * dt);
        velocity.x *= damping;
        velocity.z *= damping;

        // Position integration
        transform.position.x += velocity.x * dt;
        transform.position.y += velocity.y * dt;
        transform.position.z += velocity.z * dt;
      }

      // 2. Static Collision Resolution (Walls, floor, obstacles)
      const center = {
        x: transform.position.x + collider.center.x,
        y: transform.position.y + collider.center.y,
        z: transform.position.z + collider.center.z
      };
      this._scratchAABB.fromCenterAndSize(center, collider.size);

      if (this.collisionWorld.resolveStaticCollision(this._scratchAABB, this._scratchDisp, eid)) {
        transform.position.x += this._scratchDisp.x;
        transform.position.y += this._scratchDisp.y;
        transform.position.z += this._scratchDisp.z;

        if (velocity) {
          // If vertical correction was upward, object is grounded
          if (this._scratchDisp.y > 0) {
            if (rigidBody) rigidBody.isGrounded = true;
            if (velocity.y < 0) velocity.y = 0;
          } else if (this._scratchDisp.y < 0 && velocity.y > 0) {
            velocity.y = 0;
          }
          if (Math.abs(this._scratchDisp.x) > 1e-4) velocity.x = 0;
          if (Math.abs(this._scratchDisp.z) > 1e-4) velocity.z = 0;
        }
      } else {
        if (rigidBody && transform.position.y > 0.05) {
          rigidBody.isGrounded = false;
        }
      }
    }

    // 3. Dynamic-to-Dynamic Inter-Entity Collision Resolution
    for (let i = 0; i < entityIds.length; i++) {
      const eidA = entityIds[i];
      const transA = transformStore.get(eidA);
      const colA = colliderStore.get(eidA);
      if (!transA || !colA || colA.isTrigger) continue;

      this._scratchAABB.fromCenterAndSize(
        { x: transA.position.x + colA.center.x, y: transA.position.y + colA.center.y, z: transA.position.z + colA.center.z },
        colA.size
      );

      for (let j = i + 1; j < entityIds.length; j++) {
        const eidB = entityIds[j];
        const transB = transformStore.get(eidB);
        const colB = colliderStore.get(eidB);
        if (!transB || !colB || colB.isTrigger) continue;

        this._otherAABB.fromCenterAndSize(
          { x: transB.position.x + colB.center.x, y: transB.position.y + colB.center.y, z: transB.position.z + colB.center.z },
          colB.size
        );

        if (this._scratchAABB.computePenetration(this._otherAABB, this._scratchPen)) {
          // Distribute separation equally
          transA.position.x += this._scratchPen.x * 0.5;
          transA.position.y += this._scratchPen.y * 0.5;
          transA.position.z += this._scratchPen.z * 0.5;

          transB.position.x -= this._scratchPen.x * 0.5;
          transB.position.y -= this._scratchPen.y * 0.5;
          transB.position.z -= this._scratchPen.z * 0.5;
        }
      }
    }
  }

  shutdown() {
    this.collisionWorld.clear();
  }
}
