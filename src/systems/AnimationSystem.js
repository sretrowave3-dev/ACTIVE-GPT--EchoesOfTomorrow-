import { System } from '../ecs/System.js';
import { EntitySignature } from '../ecs/EntitySignature.js';

export class AnimationSystem extends System {
  constructor() {
    super();
    this.priority = 300;
    this._requiredSig = new EntitySignature();
    this._meshId = -1;
  }

  initialize(ecs) {
    this._meshId = ecs.getTypeId('Mesh');
    this._requiredSig.add(this._meshId);
  }

  requiredSignature() {
    return this._requiredSig;
  }

  update(delta, entityIds, ecs) {
    const meshStore = ecs.getStore('Mesh');
    for (const eid of entityIds) {
      const mesh = meshStore.get(eid);
      if (mesh) {
        // TODO: Update animation state based on movement, combat, etc.
      }
    }
  }
}