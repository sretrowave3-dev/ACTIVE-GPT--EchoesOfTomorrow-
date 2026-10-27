import { System } from '../ecs/System.js';
import { EntitySignature } from '../ecs/EntitySignature.js';

export class MovementSystem extends System {
  constructor() {
    super();
    this.priority = 100;
    this._requiredSig = new EntitySignature();
    /** @private */
    this._transformId = -1;
    this._velocityId = -1;
  }

  /**
   * @param {import('../ECSManager.js').ECSManager} ecs
   */
  initialize(ecs) {
    this._transformId = ecs.getTypeId('Transform');
    this._velocityId = ecs.getTypeId('Velocity');
    this._requiredSig.add(this._transformId);
    this._requiredSig.add(this._velocityId);
  }

  requiredSignature() {
    return this._requiredSig;
  }

  /**
   * @param {number} delta
   * @param {number[]} entityIds
   * @param {import('../ECSManager.js').ECSManager} ecs
   */
  update(delta, entityIds, ecs) {
    const transformStore = ecs.getStore('Transform');
    const velocityStore = ecs.getStore('Velocity');
    for (const eid of entityIds) {
      const transform = transformStore.get(eid);
      const velocity = velocityStore.get(eid);
      if (transform && velocity) {
        transform.position.x += velocity.x * delta;
        transform.position.y += velocity.y * delta;
        transform.position.z += velocity.z * delta;
      }
    }
  }
}