import { System } from '../System.js';
import { EntitySignature } from '../EntitySignature.js';

export class HealthSystem extends System {
  constructor() {
    super();
    this.priority = 200;
    this._requiredSig = new EntitySignature();
    this._healthId = -1;
  }

  initialize(ecs) {
    this._healthId = ecs.getTypeId('Health');
    this._requiredSig.add(this._healthId);
  }

  requiredSignature() {
    return this._requiredSig;
  }

  update(delta, entityIds, ecs) {
    const healthStore = ecs.getStore('Health');
    for (const eid of entityIds) {
      const health = healthStore.get(eid);
      if (health && health.current <= 0) {
        // TODO: trigger death sequence
      }
    }
  }
}