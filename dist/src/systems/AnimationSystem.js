// src/systems/AnimationSystem.js
import { System } from '../ecs/System.js';
import { EntitySignature } from '../ecs/EntitySignature.js';

/**
 * AnimationSystem updates skeletal pose hierarchies, animation controllers,
 * and procedural bob/sway cycles for entities possessing AnimationComponent.
 * Conforms to EDD Chapter 12 (Animation System).
 */
export class AnimationSystem extends System {
  constructor() {
    super();
    this.priority = 300;
    this._requiredSig = new EntitySignature();
    this._animId = -1;
    this._transformId = -1;
  }

  /**
   * @param {import('../ecs/ECSManager.js').ECSManager} ecs
   */
  initialize(ecs) {
    this._animId = ecs.getTypeId('Animation');
    this._transformId = ecs.getTypeId('Transform');

    if (this._animId !== undefined) {
      this._requiredSig.add(this._animId);
    }
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
    const animStore = ecs.getStore('Animation');
    const transformStore = this._transformId !== undefined ? ecs.getStore('Transform') : null;

    for (let i = 0; i < entityIds.length; i++) {
      const eid = entityIds[i];
      const anim = animStore.get(eid);
      if (!anim || !anim.playing) continue;

      // 1. Update active animation controller if present
      if (anim.controller) {
        anim.controller.update(delta);
      } else {
        // Direct clip time advancement
        anim.time += delta * anim.speed;
      }

      // 2. Procedural hover/breathing animation on transform if present
      const transform = transformStore?.get(eid);
      if (transform && anim.currentClip === 'hover') {
        const hoverOffset = Math.sin(anim.time * 2.5) * 0.005;
        transform.position.y += hoverOffset;
      }
    }
  }
}
