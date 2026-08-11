import { EntityID } from '../world/EntityID.js';

/**
 * Registry for entities. Stores them, tracks generations.
 * Does NOT construct entities.
 */
export class EntityRegistry {
  constructor() {
    /** @type {Map<number, import('../Entity.js').Entity>} */
    this._entities = new Map();
    /** @type {Map<number, number>} */
    this._generations = new Map();
  }

  /**
   * Register an entity. It must already have an EntityID.
   * @param {import('../Entity.js').Entity} entity
   */
  register(entity) {
    const id = entity.id.id;
    this._entities.set(id, entity);
    this._generations.set(id, entity.generation);
  }

  /**
   * Look up entity by EntityID. Returns null if generation mismatch.
   * @param {EntityID} entityId
   * @returns {import('../Entity.js').Entity|null}
   */
  get(entityId) {
    const entity = this._entities.get(entityId.id);
    if (!entity || entity.generation !== entityId.generation) return null;
    return entity;
  }

  /**
   * Remove entity from registry and increment its generation so handles become invalid.
   * @param {EntityID} entityId
   */
  unregister(entityId) {
    if (!this._entities.has(entityId.id)) return;
    this._entities.delete(entityId.id);
    const currentGen = this._generations.get(entityId.id) || 0;
    this._generations.set(entityId.id, currentGen + 1);
  }

  /** @param {EntityID} entityId @returns {boolean} */
  exists(entityId) {
    return this.get(entityId) !== null;
  }

  /**
   * Iterate over all currently valid entities.
   * @param {(entity: import('../Entity.js').Entity) => void} callback
   */
  forEach(callback) {
    this._entities.forEach(callback);
  }

  /** @returns {number} */
  count() {
    return this._entities.size;
  }
}
