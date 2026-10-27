import { EntityID } from '../world/EntityID.js';
import { Entity } from '../world/Entity.js';
import { EntityHandle } from '../world/EntityHandle.js';

/**
 * Manages entity lifecycle: creation, destruction, state changes.
 */
export class EntityManager {
  /**
   * @param {import('../registries/EntityRegistry.js').EntityRegistry} entityReg
   */
  constructor(entityReg) {
    this.entityRegistry = entityReg;
    this._nextId = 1;
  }

  /**
   * Create a new entity with a persistent handle.
   * @param {import('../CellID.js').CellID|null} [cellId] – optional initial cell
   * @returns {EntityHandle}
   */
  create(cellId = null) {
    const idNum = this._nextId++;
    const generation = 0;
    const entityId = new EntityID(idNum, generation);
    const cellIdValue = cellId ? cellId.value : null;
    const entity = new Entity(entityId, cellIdValue);

    // Create a persistent handle that will stay valid as long as the entity exists.
    const handle = new EntityHandle(entityId, (eid) => this.entityRegistry.get(eid));
    entity.handle = handle;

    this.entityRegistry.register(entity);
    return handle;
  }

  /**
   * Destroy an entity, invalidating its handle.
   * @param {EntityID} entityId
   */
  destroy(entityId) {
    // EntityRegistry.unregister increments generation, so any handle becomes invalid.
    this.entityRegistry.unregister(entityId);
  }

  /**
   * Move entity to a different cell.
   * @param {EntityID} entityId
   * @param {import('../CellID.js').CellID|null} newCellId
   */
  move(entityId, newCellId) {
    const entity = this.entityRegistry.get(entityId);
    if (entity) {
      entity.cellId = newCellId ? newCellId.value : null;
    }
  }

  /**
   * Change entity state.
   * @param {EntityID} entityId
   * @param {'created'|'active'|'sleeping'|'hidden'|'destroyed'} state
   */
  setState(entityId, state) {
    const entity = this.entityRegistry.get(entityId);
    if (entity) entity.setState(state);
  }

  /**
   * Return the persistent handle for an entity (if it exists).
   * @param {EntityID} entityId
   * @returns {EntityHandle|null}
   */
  getHandle(entityId) {
    const entity = this.entityRegistry.get(entityId);
    return entity ? entity.handle : null;
  }
}