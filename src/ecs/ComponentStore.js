import { SparseSet } from './SparseSet.js';

/**
 * Typed component store using a SparseSet.
 * @template T
 */
export class ComponentStore {
  /**
   * @param {new () => T} componentClass – constructor for the component type
   */
  constructor(componentClass) {
    this.componentClass = componentClass;
    this.sparseSet = new SparseSet();
  }

  /**
   * Add or update component for an entity.
   * @param {number} entityId
   * @param {T} [component] – if omitted, a default instance is created
   * @returns {T} the stored component
   */
  add(entityId, component) {
    if (!component) {
      component = new this.componentClass();
    }
    this.sparseSet.add(entityId, component);
    return component;
  }

  /**
   * Remove component from entity.
   * @param {number} entityId
   */
  remove(entityId) {
    const comp = this.sparseSet.get(entityId);
    if (comp && comp.reset) {
      comp.reset();
    }
    this.sparseSet.remove(entityId);
  }

  /**
   * Get component for entity.
   * @param {number} entityId
   * @returns {T|undefined}
   */
  get(entityId) {
    return this.sparseSet.get(entityId);
  }

  /**
   * Check if entity has this component.
   * @param {number} entityId
   * @returns {boolean}
   */
  has(entityId) {
    return this.sparseSet.has(entityId);
  }

  /** Remove all components. */
  clear() {
    this.sparseSet.clear();
  }

  /** @returns {number} */
  count() {
    return this.sparseSet.size;
  }

  /**
   * Iterate over all (entityId, component) pairs.
   * @param {(entityId: number, component: T) => void} callback
   */
  forEach(callback) {
    this.sparseSet.forEach(callback);
  }
}