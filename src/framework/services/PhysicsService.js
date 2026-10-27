// src/framework/services/PhysicsService.js
import { Service } from './Service.js';
import { CollisionWorld } from '../../physics/CollisionWorld.js';
import { PhysicsSystem } from '../../systems/PhysicsSystem.js';
import { ColliderComponent } from '../../components/ColliderComponent.js';
import { RigidBodyComponent } from '../../components/RigidBodyComponent.js';

/**
 * PhysicsService coordinates physical simulation, static geometry colliders,
 * and ECS physics integration across the engine.
 * Conforms to EDD Chapter 15 (Physics System & Collision Architecture).
 */
export class PhysicsService extends Service {
  /**
   * @param {import('../core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super('physics', framework);
    /** @type {CollisionWorld} */
    this.collisionWorld = new CollisionWorld();
    /** @type {PhysicsSystem} */
    this.physicsSystem = new PhysicsSystem(this.collisionWorld);
  }

  /** @override */
  async initialize() {
    // 1. Register physics components in ECS
    const ecsService = this.framework.serviceRegistry.get('ecs');
    if (ecsService && ecsService.ecsManager) {
      if (!ecsService.ecsManager.getTypeId('Collider')) {
        ecsService.ecsManager.registerComponent('Collider', ColliderComponent);
      }
      if (!ecsService.ecsManager.getTypeId('RigidBody')) {
        ecsService.ecsManager.registerComponent('RigidBody', RigidBodyComponent);
      }
      if (ecsService.scheduler) {
        ecsService.scheduler.registerSystem(this.physicsSystem);
      }
    }

    // 2. Register static environment colliders for the Milestone A/B arena
    this._setupArenaColliders();
  }

  /**
   * Populate boundary walls, floor, and obstacles into CollisionWorld.
   * @private
   */
  _setupArenaColliders() {
    // Floor (40m x 40m, 1m thick beneath Y=0)
    this.collisionWorld.addStaticBox('floor', { x: 0, y: -0.5, z: 0 }, { x: 42, y: 1.0, z: 42 });

    // North, South, East, West Boundary Walls
    this.collisionWorld.addStaticBox('wall_north', { x: 0, y: 3, z: -20 }, { x: 42, y: 6, z: 1 });
    this.collisionWorld.addStaticBox('wall_south', { x: 0, y: 3, z: 20 }, { x: 42, y: 6, z: 1 });
    this.collisionWorld.addStaticBox('wall_west', { x: -20, y: 3, z: 0 }, { x: 1, y: 6, z: 42 });
    this.collisionWorld.addStaticBox('wall_east', { x: 20, y: 3, z: 0 }, { x: 1, y: 6, z: 42 });

    // Pillars (Square bounding representation for cylinders)
    for (let x = -10; x <= 10; x += 10) {
      for (let z = -10; z <= 10; z += 10) {
        if (x === 0 && z === 0) continue;
        this.collisionWorld.addStaticBox(`pillar_${x}_${z}`, { x, y: 3, z }, { x: 1.2, y: 6, z: 1.2 });
      }
    }
  }

  /**
   * Cast a ray against static geometry.
   * @param {{ x: number, y: number, z: number }} origin
   * @param {{ x: number, y: number, z: number }} dir
   * @param {number} maxDist
   */
  raycast(origin, dir, maxDist = 100) {
    return this.collisionWorld.raycast(origin, dir, maxDist);
  }

  /**
   * Resolve an AABB penetration against static environment colliders.
   * @param {import('../../physics/AABB.js').AABB} aabb
   * @param {{ x: number, y: number, z: number }} out
   * @param {any} [ignoreId]
   */
  resolveStaticCollision(aabb, out, ignoreId = null) {
    return this.collisionWorld.resolveStaticCollision(aabb, out, ignoreId);
  }

  /** @override */
  async start() {
    console.log('[PhysicsService] Started with active collision world and static boundary colliders.');
  }

  /** @override */
  update(delta) {
    // The physics system is ticked by ECSService's SystemScheduler
  }

  /** @override */
  async shutdown() {
    this.collisionWorld.clear();
  }
}
