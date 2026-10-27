// src/systems/AISystem.js
import { System } from '../ecs/System.js';
import { EntitySignature } from '../ecs/EntitySignature.js';

/**
 * AISystem executes perception checks, behavioral state transitions,
 * and waypoint navigation for entities possessing AIComponent.
 * Conforms to EDD Chapter 16 (AI & Navigation).
 */
export class AISystem extends System {
  /**
   * @param {import('../framework/core/Framework.js').Framework} framework
   */
  constructor(framework) {
    super();
    this.framework = framework;
    this.priority = 200; // Runs during the 'ai' phase
    this._requiredSig = new EntitySignature();

    this._aiId = -1;
    this._transformId = -1;
    this._navId = -1;
    this._velocityId = -1;
    this._animId = -1;
  }

  /**
   * @param {import('../ecs/ECSManager.js').ECSManager} ecs
   */
  initialize(ecs) {
    this._aiId = ecs.getTypeId('AI');
    this._transformId = ecs.getTypeId('Transform');
    this._navId = ecs.getTypeId('Navigation');
    this._velocityId = ecs.getTypeId('Velocity');
    this._animId = ecs.getTypeId('Animation');

    if (this._aiId !== undefined) this._requiredSig.add(this._aiId);
    if (this._transformId !== undefined) this._requiredSig.add(this._transformId);
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
    const aiStore = ecs.getStore('AI');
    const transformStore = ecs.getStore('Transform');
    const navStore = this._navId !== undefined ? ecs.getStore('Navigation') : null;
    const velocityStore = this._velocityId !== undefined ? ecs.getStore('Velocity') : null;
    const animStore = this._animId !== undefined ? ecs.getStore('Animation') : null;

    // Acquire player coordinates from PlayerService or ECS entity 1000
    const playerService = this.framework.serviceRegistry.get('player');
    const playerPos = playerService ? playerService.getPlayerPosition() : null;

    for (let i = 0; i < entityIds.length; i++) {
      const eid = entityIds[i];
      const ai = aiStore.get(eid);
      const transform = transformStore.get(eid);
      const nav = navStore?.get(eid);
      const velocity = velocityStore?.get(eid);
      const anim = animStore?.get(eid);

      if (!ai || !transform) continue;

      let targetX = transform.position.x;
      let targetZ = transform.position.z;
      let isMoving = false;

      // 1. Perception Check against Player
      if (playerPos) {
        const dx = playerPos.x - transform.position.x;
        const dz = playerPos.z - transform.position.z;
        const distSq = dx * dx + dz * dz;
        const sightSq = ai.sightRadius * ai.sightRadius;
        const attackSq = ai.attackRadius * ai.attackRadius;

        if (distSq <= sightSq) {
          ai.state = 'chase';
          ai.searchTimer = 3.0; // 3 seconds memory
          if (distSq > attackSq) {
            targetX = playerPos.x;
            targetZ = playerPos.z;
            isMoving = true;
          }
        } else if (ai.state === 'chase') {
          ai.searchTimer -= delta;
          if (ai.searchTimer <= 0) {
            ai.state = 'patrol';
          }
        }
      }

      // 2. Waypoint Patrol when not actively chasing
      if (ai.state === 'patrol' && nav && nav.waypoints.length > 0) {
        const wp = nav.waypoints[nav.currentWaypointIndex];
        const wdx = wp.x - transform.position.x;
        const wdz = wp.z - transform.position.z;
        const wDist = Math.hypot(wdx, wdz);

        if (wDist <= nav.stoppingDistance) {
          nav.currentWaypointIndex = (nav.currentWaypointIndex + 1) % nav.waypoints.length;
        } else {
          targetX = wp.x;
          targetZ = wp.z;
          isMoving = true;
        }
      }

      // 3. Apply Directional Motion & Facing Rotation
      if (isMoving) {
        const dirX = targetX - transform.position.x;
        const dirZ = targetZ - transform.position.z;
        const len = Math.hypot(dirX, dirZ) || 1.0;
        const normX = dirX / len;
        const normZ = dirZ / len;

        const currentSpeed = (ai.state === 'chase') ? ai.speed * 1.3 : ai.speed;

        if (velocity) {
          velocity.x = normX * currentSpeed;
          velocity.z = normZ * currentSpeed;
        } else {
          transform.position.x += normX * currentSpeed * delta;
          transform.position.z += normZ * currentSpeed * delta;
        }

        // Face movement direction
        if (transform.rotation) {
          transform.rotation.y = Math.atan2(normX, normZ);
        }

        if (anim) {
          anim.currentClip = (ai.state === 'chase') ? 'run' : 'walk';
          anim.speed = (ai.state === 'chase') ? 1.4 : 1.0;
        }
      } else {
        if (velocity) {
          velocity.x = 0;
          velocity.z = 0;
        }
        if (anim) {
          anim.currentClip = 'idle';
          anim.speed = 1.0;
        }
      }
    }
  }
}
