/**
 * Safe reference to an entity that checks generation on each access.
 * Created once and stored on the entity.
 */
export class EntityHandle {
  /**
   * @param {import('./EntityID.js').EntityID} entityId
   * @param {function(import('./EntityID.js').EntityID): import('./Entity.js').Entity|null} getEntityFn
   */
  constructor(entityId, getEntityFn) {
    this._entityId = entityId;
    this._getEntity = getEntityFn;
  }

  /** @returns {import('./EntityID.js').EntityID} */
  get id() {
    return this._entityId;
  }

  /**
   * @returns {boolean} true if the entity still exists with the same generation.
   */
  isValid() {
    const entity = this._getEntity(this._entityId);
    return entity !== null && entity.generation === this._entityId.generation;
  }

  /**
   * @returns {import('./Entity.js').Entity|null} the entity or null if invalid.
   */
  get() {
    const entity = this._getEntity(this._entityId);
    return (entity && entity.generation === this._entityId.generation) ? entity : null;
  }
}